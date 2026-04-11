import asyncio
import random
import math
import time
import base64
import base58
import json
import httpx
import logging
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import transfer, TransferParams
from solders.transaction import Transaction, VersionedTransaction
from solders.message import Message
from solders.hash import Hash
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SOL_MINT = "So11111111111111111111111111111111111111112"
JUPITER_QUOTE_URL = "https://api.jup.ag/swap/v1/quote"
JUPITER_SWAP_URL = "https://api.jup.ag/swap/v1/swap"
SOLANA_RPC = "https://solana.publicnode.com"
LAMPORTS_PER_SOL = 1_000_000_000


def gauss_amount(min_val, max_val):
    """Gaussian random amount - more natural than uniform"""
    mid = (min_val + max_val) / 2
    std = (max_val - min_val) / 4
    val = random.gauss(mid, std)
    return max(min_val, min(max_val, val))


class VolumeBot:
    def __init__(self, db):
        self.db = db
        self.running = False
        self.task = None
        self.config = {
            "token_mint": "9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray",
            "target_volume_sol": 10,
            "target_makers": 20,
            "trade_interval_min": 5,       # seconds
            "trade_interval_max": 30,      # seconds
            "min_sol_per_trade": 0.003,
            "max_sol_per_trade": 0.03,
            "slippage_bps": 100,
            "auto_refund": True,
            "min_wallet_balance": 0.003,   # below this -> gets refunded
        }
        self.stats = {
            "total_trades": 0,
            "total_volume_sol": 0.0,
            "daily_volume_sol": 0.0,
            "daily_makers": 0,
            "daily_trades": 0,
            "daily_transfers": 0,
            "cycles": 0,
            "errors": 0,
            "last_trade_time": None,
            "started_at": None,
            "day_start": None,
        }
        self.daily_wallets_used = set()
        self.transaction_log = []
        self._balance_cache = {}
        self._balance_cache_time = 0
        # Track which wallets hold tokens (pubkey -> token_amount)
        self._token_holders = {}
        # Cooldown: prevent same wallet from trading twice in a row
        self._last_trade_wallet = None
        self._last_action = None
        # Accumulation: how many buys before selling is allowed
        self._buys_since_sell = 0

    async def load_config(self):
        saved = await self.db.bot_config.find_one({"_id": "main"}, {"_id": 0})
        if saved:
            for k, v in saved.items():
                if k in self.config:
                    self.config[k] = v

    async def save_config(self):
        await self.db.bot_config.update_one(
            {"_id": "main"}, {"$set": self.config}, upsert=True
        )

    async def start(self):
        if self.running:
            return False
        await self.load_config()
        self.running = True
        now = time.time()
        self.stats = {
            "total_trades": 0, "total_volume_sol": 0.0,
            "daily_volume_sol": 0.0, "daily_makers": 0,
            "daily_trades": 0, "daily_transfers": 0,
            "cycles": 0, "errors": 0,
            "last_trade_time": None, "started_at": now, "day_start": now,
        }
        self.daily_wallets_used = set()
        self.transaction_log = []
        self._balance_cache = {}
        self._balance_cache_time = 0
        self._token_holders = {}
        self._last_trade_wallet = None
        self._last_action = None
        self._buys_since_sell = 0
        self.task = asyncio.create_task(self._run_loop())
        logger.info("Volume bot started (organic mode)")
        return True

    async def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        self.task = None
        logger.info("Volume bot stopped")
        return True

    def get_status(self):
        return {
            "running": self.running,
            "config": self.config,
            "stats": self.stats,
            "daily_wallets_used": len(self.daily_wallets_used),
            "token_holders": len(self._token_holders),
            "buys_since_sell": self._buys_since_sell,
            "last_action": self._last_action,
            "recent_transactions": self.transaction_log[-50:],
        }

    def update_config(self, new_config):
        for key in self.config:
            if key in new_config and new_config[key] is not None:
                self.config[key] = new_config[key]
        return self.config

    def estimate_costs(self):
        cfg = self.config
        vol = cfg["target_volume_sol"]
        avg_trade = (cfg["min_sol_per_trade"] + cfg["max_sol_per_trade"]) / 2
        avg_interval = (cfg["trade_interval_min"] + cfg["trade_interval_max"]) / 2
        trades_from_interval = int((24 * 3600) / avg_interval) if avg_interval > 0 else 0
        trades_from_volume = int(vol / avg_trade) if avg_trade > 0 else 0
        actual_trades = min(trades_from_volume, trades_from_interval)

        gas_per_tx = 0.000005
        priority_per_tx = 0.000005
        total_txs = actual_trades * 2
        gas_cost = total_txs * (gas_per_tx + priority_per_tx)

        slippage_pct = cfg["slippage_bps"] / 10000
        slippage_cost = vol * slippage_pct

        total_daily_cost = gas_cost + slippage_cost
        sol_needed = avg_trade * min(cfg["target_makers"], 20) + gas_cost

        return {
            "trades_per_day": actual_trades,
            "total_transactions": total_txs,
            "gas_cost_sol": round(gas_cost, 6),
            "slippage_cost_sol": round(slippage_cost, 4),
            "total_daily_cost_sol": round(total_daily_cost, 4),
            "sol_needed_minimum": round(sol_needed, 4),
            "avg_trade_size": round(avg_trade, 4),
            "cost_per_1sol_volume": round(total_daily_cost / vol, 6) if vol > 0 else 0,
        }

    def _reset_daily_if_needed(self):
        now = time.time()
        if self.stats["day_start"] and (now - self.stats["day_start"]) > 86400:
            self.stats["daily_volume_sol"] = 0.0
            self.stats["daily_makers"] = 0
            self.stats["daily_trades"] = 0
            self.stats["daily_transfers"] = 0
            self.stats["day_start"] = now
            self.daily_wallets_used = set()

    # ==================== ORGANIC BOT LOOP ====================

    async def _run_loop(self):
        while self.running:
            try:
                self._reset_daily_if_needed()

                if self.stats["daily_volume_sol"] >= self.config["target_volume_sol"]:
                    logger.info("Daily volume target reached")
                    await asyncio.sleep(60)
                    continue

                wallets = await self._get_wallets()
                sub_wallets = [w for w in wallets if not w.get("is_main")]
                if not sub_wallets:
                    await asyncio.sleep(5)
                    continue

                # Refresh balance cache periodically
                await self._refresh_balances(sub_wallets)

                # Decide action based on state
                action = self._pick_action(sub_wallets)
                logger.info(f"Organic action: {action}")

                if action == "BUY":
                    await self._do_buy(sub_wallets)
                elif action == "SELL":
                    await self._do_sell(sub_wallets)
                elif action == "TRANSFER_SOL":
                    await self._do_sol_transfer(sub_wallets)
                elif action == "REFUND":
                    await self._do_auto_refund(wallets)

                self.stats["cycles"] += 1
                self.stats["last_trade_time"] = time.time()

                # Random organic delay (in seconds)
                delay = gauss_amount(
                    self.config["trade_interval_min"],
                    self.config["trade_interval_max"]
                )
                await asyncio.sleep(delay)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.stats["errors"] += 1
                self._log_tx("ERROR", 0, {"error": str(e)}, "system")
                logger.error(f"Bot loop error: {e}")
                await asyncio.sleep(5)

    def _pick_action(self, sub_wallets):
        """Pick organic action - accumulate buys before selling, vary sequences"""
        min_bal = int(self.config["min_sol_per_trade"] * LAMPORTS_PER_SOL) + 6_000_000
        funded = [w for w in sub_wallets if self._balance_cache.get(w["public_key"], 0) >= min_bal]
        holders = [w for w in sub_wallets if w["public_key"] in self._token_holders]
        low_bal = [w for w in sub_wallets
                   if 0 < self._balance_cache.get(w["public_key"], 0) < min_bal
                   and w["public_key"] not in self._token_holders]

        # Auto refund if many wallets are low
        if self.config.get("auto_refund") and len(low_bal) > len(sub_wallets) * 0.3:
            return "REFUND"

        # Must buy first - need at least 2-4 holders before any selling
        min_holders_before_sell = random.randint(2, min(4, max(2, len(sub_wallets) // 3)))
        if len(holders) < min_holders_before_sell:
            if funded:
                return "BUY"
            return "REFUND"

        # Accumulate buys before allowing sells (random 2-5 buys between sells)
        buys_needed = random.randint(2, 5)
        sell_allowed = self._buys_since_sell >= buys_needed and len(holders) >= 2

        # Build weighted random choices - organic sequences
        weights = []
        actions = []

        if funded:
            # More buys if few holders, less if many
            buy_weight = 50 if len(holders) < 4 else 35
            # If last action was also BUY, slightly reduce (but don't block)
            if self._last_action == "BUY":
                buy_weight = max(20, buy_weight - 10)
            actions.append("BUY")
            weights.append(buy_weight)

        if sell_allowed:
            # Only sell from wallets that are NOT the last buyer
            eligible_sellers = [h for h in holders
                                if h["public_key"] != self._last_trade_wallet]
            if eligible_sellers:
                sell_weight = 30 if len(holders) < 5 else 45
                # If last action was SELL, reduce consecutive sells
                if self._last_action == "SELL":
                    sell_weight = max(10, sell_weight - 15)
                actions.append("SELL")
                weights.append(sell_weight)

        if len(funded) > 1:
            actions.append("TRANSFER_SOL")
            weights.append(10)

        if self.config.get("auto_refund") and low_bal:
            actions.append("REFUND")
            weights.append(5)

        if not actions:
            return "BUY"

        return random.choices(actions, weights=weights, k=1)[0]

    async def _do_buy(self, sub_wallets):
        """Organic BUY - different wallet than last trade, gaussian amount"""
        min_bal = int(self.config["min_sol_per_trade"] * LAMPORTS_PER_SOL) + 6_000_000
        funded = [w for w in sub_wallets if self._balance_cache.get(w["public_key"], 0) >= min_bal]
        if not funded:
            return

        # Avoid same wallet as last trade (organic pattern)
        candidates = [w for w in funded if w["public_key"] != self._last_trade_wallet]
        if not candidates:
            candidates = funded  # fallback if only 1 wallet

        # Prefer unused wallets (new makers)
        unused = [w for w in candidates if w["public_key"] not in self.daily_wallets_used]
        wallet = random.choice(unused) if unused else random.choice(candidates)

        keypair = self._load_keypair(wallet["private_key"])
        if not keypair:
            return

        # Gaussian random amount - each buy is unique
        sol_amount = gauss_amount(self.config["min_sol_per_trade"], self.config["max_sol_per_trade"])
        wallet_sol = (self._balance_cache.get(wallet["public_key"], 0) / LAMPORTS_PER_SOL) - 0.005
        sol_amount = min(sol_amount, max(0, wallet_sol))
        remaining = self.config["target_volume_sol"] - self.stats["daily_volume_sol"]
        sol_amount = min(sol_amount, remaining)
        sol_amount = round(sol_amount, 6)
        if sol_amount < 0.0005:
            return

        lamports = int(sol_amount * LAMPORTS_PER_SOL)
        token_mint = self.config["token_mint"]

        logger.info(f"BUY {sol_amount:.6f} SOL -> token via {wallet.get('label')}")
        result = await self._execute_swap(keypair, SOL_MINT, token_mint, lamports)

        if result and not result.get("error"):
            self.stats["total_trades"] += 1
            self.stats["daily_trades"] += 1
            self.stats["total_volume_sol"] += sol_amount
            self.stats["daily_volume_sol"] += sol_amount
            self.daily_wallets_used.add(wallet["public_key"])
            self.stats["daily_makers"] = len(self.daily_wallets_used)
            # Track token holding - accumulate if already holding
            existing = self._token_holders.get(wallet["public_key"], {})
            prev_amount = existing.get("amount", 0)
            prev_sol = existing.get("sol_value", 0)
            self._token_holders[wallet["public_key"]] = {
                "amount": prev_amount + int(result.get("out_amount", 0)),
                "sol_value": prev_sol + sol_amount,
                "wallet": wallet,
            }
            # Update balance cache & tracking
            self._balance_cache[wallet["public_key"]] = max(0,
                self._balance_cache.get(wallet["public_key"], 0) - lamports - 10000)
            self._last_trade_wallet = wallet["public_key"]
            self._last_action = "BUY"
            self._buys_since_sell += 1
            self._log_tx("BUY", sol_amount, result, wallet.get("label", ""))
        else:
            self.stats["errors"] += 1
            self._log_tx("ERROR", sol_amount, result or {"error": "No result"}, wallet.get("label", ""))

    async def _do_sell(self, sub_wallets):
        """Organic SELL - DIFFERENT wallet than last buyer, partial amount"""
        if not self._token_holders:
            return

        # Pick a holder that is NOT the last trade wallet (organic!)
        eligible = [pub for pub in self._token_holders.keys()
                    if pub != self._last_trade_wallet]
        if not eligible:
            # If only 1 holder, allow it but this is rare
            eligible = list(self._token_holders.keys())
        if not eligible:
            return

        pub = random.choice(eligible)
        holding = self._token_holders[pub]
        wallet = holding["wallet"]

        keypair = self._load_keypair(wallet["private_key"])
        if not keypair:
            del self._token_holders[pub]
            return

        token_mint = self.config["token_mint"]
        token_amount = holding["amount"]
        sol_value = holding["sol_value"]

        if token_amount <= 0:
            del self._token_holders[pub]
            return

        # Partial sell: sell 30-80% of holdings (organic, not always 100%)
        sell_pct = random.uniform(0.3, 0.8)
        sell_tokens = int(token_amount * sell_pct)
        sell_sol_value = round(sol_value * sell_pct, 6)

        if sell_tokens <= 0:
            del self._token_holders[pub]
            return

        logger.info(f"SELL {sell_pct*100:.0f}% ({sell_tokens} tokens) -> SOL via {wallet.get('label')}")
        result = await self._execute_swap(keypair, token_mint, SOL_MINT, sell_tokens)

        if result and not result.get("error"):
            self.stats["total_trades"] += 1
            self.stats["daily_trades"] += 1
            self.stats["total_volume_sol"] += sell_sol_value
            self.stats["daily_volume_sol"] += sell_sol_value
            self.daily_wallets_used.add(pub)
            self.stats["daily_makers"] = len(self.daily_wallets_used)

            # Update holdings - keep remainder or remove if sold most
            remaining_tokens = token_amount - sell_tokens
            remaining_sol = sol_value - sell_sol_value
            if remaining_tokens > 0 and sell_pct < 0.9:
                self._token_holders[pub] = {
                    "amount": remaining_tokens,
                    "sol_value": remaining_sol,
                    "wallet": wallet,
                }
            else:
                del self._token_holders[pub]

            sol_received = int(result.get("out_amount", 0))
            self._balance_cache[pub] = self._balance_cache.get(pub, 0) + sol_received
            self._last_trade_wallet = pub
            self._last_action = "SELL"
            self._buys_since_sell = 0
            self._log_tx("SELL", sell_sol_value, result, wallet.get("label", ""))
        else:
            self.stats["errors"] += 1
            self._log_tx("ERROR", sell_sol_value, result or {"error": "No result"}, wallet.get("label", ""))

    async def _do_sol_transfer(self, sub_wallets):
        """Transfer SOL between wallets - keeps funds circulating"""
        min_bal = int(self.config["min_sol_per_trade"] * LAMPORTS_PER_SOL) + 8_000_000
        rich = [w for w in sub_wallets
                if self._balance_cache.get(w["public_key"], 0) >= min_bal * 2
                and w["public_key"] not in self._token_holders]
        poor = [w for w in sub_wallets
                if self._balance_cache.get(w["public_key"], 0) < min_bal
                and w["public_key"] not in self._token_holders]

        if not rich or not poor:
            return

        sender = random.choice(rich)
        receiver = random.choice(poor)

        sender_kp = self._load_keypair(sender["private_key"])
        if not sender_kp:
            return

        # Transfer a random portion of excess SOL
        sender_bal = self._balance_cache.get(sender["public_key"], 0)
        keep = int(self.config["min_sol_per_trade"] * LAMPORTS_PER_SOL) + 6_000_000
        available = sender_bal - keep
        if available <= 10000:
            return

        transfer_amount = random.randint(available // 3, available * 2 // 3)
        transfer_sol = transfer_amount / LAMPORTS_PER_SOL

        logger.info(f"TRANSFER {transfer_sol:.6f} SOL: {sender.get('label')} -> {receiver.get('label')}")
        result = await self._sol_transfer_tx(sender_kp, receiver["public_key"], transfer_amount)

        if result and result.get("success"):
            self._balance_cache[sender["public_key"]] = sender_bal - transfer_amount - 5000
            self._balance_cache[receiver["public_key"]] = self._balance_cache.get(receiver["public_key"], 0) + transfer_amount
            self.stats["daily_transfers"] += 1
            self._log_tx("TRANSFER", transfer_sol, result, f"{sender.get('label','')} -> {receiver.get('label','')}")
        else:
            self._log_tx("ERROR", transfer_sol, result or {"error": "Transfer failed"}, sender.get("label", ""))

    async def _do_auto_refund(self, wallets):
        """Auto-refund: redistribute SOL from main or rich wallets to poor ones"""
        main = next((w for w in wallets if w.get("is_main")), None)
        sub = [w for w in wallets if not w.get("is_main")]

        min_bal = int(self.config["min_wallet_balance"] * LAMPORTS_PER_SOL)
        poor = [w for w in sub if self._balance_cache.get(w["public_key"], 0) < min_bal
                and w["public_key"] not in self._token_holders]

        if not poor:
            return

        # Find richest wallet (non-holder) to redistribute from
        rich = sorted(
            [w for w in sub if w["public_key"] not in self._token_holders],
            key=lambda w: self._balance_cache.get(w["public_key"], 0),
            reverse=True
        )

        # Use main wallet or richest sub-wallet
        source = None
        if main:
            main_bal = self._balance_cache.get(main["public_key"], 0)
            if main_bal > min_bal * 3:
                source = main
        if not source and rich:
            rich_bal = self._balance_cache.get(rich[0]["public_key"], 0)
            if rich_bal > min_bal * 3:
                source = rich[0]

        if not source:
            return

        source_kp = self._load_keypair(source["private_key"])
        if not source_kp:
            return

        refund_amount = int(self.config["min_sol_per_trade"] * LAMPORTS_PER_SOL) + 5_000_000
        target = random.choice(poor[:5])

        logger.info(f"REFUND {refund_amount/LAMPORTS_PER_SOL:.6f} SOL: {source.get('label')} -> {target.get('label')}")
        result = await self._sol_transfer_tx(source_kp, target["public_key"], refund_amount)

        if result and result.get("success"):
            self._balance_cache[source["public_key"]] = max(0,
                self._balance_cache.get(source["public_key"], 0) - refund_amount - 5000)
            self._balance_cache[target["public_key"]] = self._balance_cache.get(target["public_key"], 0) + refund_amount
            self.stats["daily_transfers"] += 1
            self._log_tx("REFUND", refund_amount / LAMPORTS_PER_SOL, result,
                         f"{source.get('label','')} -> {target.get('label','')}")

    # ==================== HELPERS ====================

    async def _refresh_balances(self, wallets):
        now = time.time()
        if now - self._balance_cache_time < 30:
            return
        async with httpx.AsyncClient() as client:
            for w in wallets:
                try:
                    resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getBalance", "params": [w["public_key"]],
                    }, timeout=5.0)
                    bal = resp.json().get("result", {}).get("value", 0)
                    self._balance_cache[w["public_key"]] = bal
                except Exception:
                    pass
        self._balance_cache_time = now
        funded = sum(1 for b in self._balance_cache.values() if b > 5_000_000)
        logger.info(f"Balances refreshed: {funded} funded wallets, {len(self._token_holders)} token holders")

    async def _execute_swap(self, keypair, input_mint, output_mint, amount):
        try:
            async with httpx.AsyncClient() as client:
                quote_resp = await client.get(JUPITER_QUOTE_URL, params={
                    "inputMint": input_mint,
                    "outputMint": output_mint,
                    "amount": str(amount),
                    "slippageBps": str(self.config["slippage_bps"]),
                }, timeout=15.0)

                if quote_resp.status_code != 200:
                    return {"error": f"Quote API: {quote_resp.status_code}"}

                quote = quote_resp.json()
                if "error" in quote:
                    return {"error": f"Quote: {quote['error']}"}

                swap_resp = await client.post(JUPITER_SWAP_URL, json={
                    "quoteResponse": quote,
                    "userPublicKey": str(keypair.pubkey()),
                    "dynamicComputeUnitLimit": True,
                    "prioritizationFeeLamports": 5000,
                }, timeout=15.0)

                if swap_resp.status_code != 200:
                    return {"error": f"Swap API: {swap_resp.status_code}"}

                swap_data = swap_resp.json()
                swap_tx_b64 = swap_data.get("swapTransaction")
                if not swap_tx_b64:
                    return {"error": "No swapTransaction"}

                tx_bytes = base64.b64decode(swap_tx_b64)
                tx = VersionedTransaction.from_bytes(tx_bytes)
                signed_tx = VersionedTransaction(tx.message, [keypair])

                encoded_tx = base64.b64encode(bytes(signed_tx)).decode("utf-8")
                rpc_resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1,
                    "method": "sendTransaction",
                    "params": [encoded_tx, {"encoding": "base64", "skipPreflight": True}],
                }, timeout=30.0)

                rpc_data = rpc_resp.json()
                if "error" in rpc_data:
                    return {"error": f"RPC: {rpc_data['error']}"}

                return {
                    "signature": rpc_data.get("result", ""),
                    "out_amount": quote.get("outAmount"),
                    "price_impact": quote.get("priceImpactPct"),
                    "in_amount": str(amount),
                }
        except Exception as e:
            return {"error": str(e)}

    async def _sol_transfer_tx(self, sender_kp, receiver_pub_str, lamports):
        try:
            receiver = Pubkey.from_string(receiver_pub_str)
            ix = transfer(TransferParams(
                from_pubkey=sender_kp.pubkey(),
                to_pubkey=receiver,
                lamports=lamports,
            ))
            async with httpx.AsyncClient() as client:
                bh_resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1,
                    "method": "getLatestBlockhash",
                    "params": [{"commitment": "finalized"}],
                }, timeout=10.0)
                bh_data = bh_resp.json()
                blockhash = Hash.from_string(bh_data["result"]["value"]["blockhash"])

                msg = Message.new_with_blockhash([ix], sender_kp.pubkey(), blockhash)
                tx = Transaction.new_unsigned(msg)
                tx.sign([sender_kp], blockhash)

                encoded = base64.b64encode(bytes(tx)).decode("utf-8")
                send_resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1,
                    "method": "sendTransaction",
                    "params": [encoded, {"encoding": "base64", "skipPreflight": True}],
                }, timeout=30.0)
                send_data = send_resp.json()
                if "error" in send_data and send_data.get("error"):
                    return {"error": str(send_data["error"])}
                return {"signature": send_data.get("result", ""), "success": True}
        except Exception as e:
            return {"error": str(e)}

    def _load_keypair(self, private_key_str):
        try:
            key_bytes = base58.b58decode(private_key_str)
            return Keypair.from_bytes(key_bytes)
        except Exception:
            pass
        try:
            key_list = json.loads(private_key_str)
            return Keypair.from_bytes(bytes(key_list))
        except Exception:
            pass
        return None

    async def _get_wallets(self):
        return await self.db.bot_wallets.find({}, {"_id": 0}).to_list(200)

    def _log_tx(self, tx_type, sol_amount, result, wallet_label):
        entry = {
            "type": tx_type,
            "sol_amount": round(sol_amount, 6),
            "signature": result.get("signature", ""),
            "error": result.get("error", ""),
            "out_amount": result.get("out_amount", ""),
            "price_impact": result.get("price_impact", ""),
            "wallet": wallet_label,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self.transaction_log.append(entry)
        if len(self.transaction_log) > 500:
            self.transaction_log = self.transaction_log[-500:]

    # ==================== WALLET MANAGEMENT ====================

    async def add_wallet(self, label, private_key):
        keypair = self._load_keypair(private_key)
        if not keypair:
            return {"success": False, "error": "Invalid private key format"}
        pub = str(keypair.pubkey())
        existing = await self.db.bot_wallets.find_one({"public_key": pub}, {"_id": 0})
        if existing:
            return {"success": False, "error": "Wallet already exists"}
        await self.db.bot_wallets.insert_one({
            "label": label, "public_key": pub,
            "private_key": private_key, "is_main": False,
            "added_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"success": True, "public_key": pub}

    async def remove_wallet(self, public_key):
        r = await self.db.bot_wallets.delete_one({"public_key": public_key})
        return {"success": r.deleted_count > 0}

    async def set_main_wallet(self, public_key):
        await self.db.bot_wallets.update_many({}, {"$set": {"is_main": False}})
        await self.db.bot_wallets.update_one(
            {"public_key": public_key}, {"$set": {"is_main": True}}
        )
        return {"success": True}

    async def generate_wallets(self, count, prefix="Bot"):
        generated = []
        existing_count = await self.db.bot_wallets.count_documents({})
        for i in range(min(count, 50)):
            kp = Keypair()
            pub = str(kp.pubkey())
            priv = base58.b58encode(bytes(kp)).decode("utf-8")
            label = f"{prefix} #{existing_count + i + 1}"
            await self.db.bot_wallets.insert_one({
                "label": label, "public_key": pub,
                "private_key": priv, "is_main": False,
                "added_at": datetime.now(timezone.utc).isoformat(),
            })
            generated.append({"label": label, "public_key": pub})
        return {"success": True, "count": len(generated), "wallets": generated}

    async def distribute_sol(self, sol_per_wallet):
        main = await self.db.bot_wallets.find_one({"is_main": True}, {"_id": 0})
        if not main:
            return {"error": "No main wallet set"}
        main_kp = self._load_keypair(main["private_key"])
        if not main_kp:
            return {"error": "Invalid main wallet keypair"}

        wallets = await self._get_wallets()
        sub_wallets = [w for w in wallets if not w.get("is_main")]
        if not sub_wallets:
            return {"error": "No sub-wallets"}

        lamports = int(sol_per_wallet * LAMPORTS_PER_SOL)
        BATCH_SIZE = 20
        total_sent = 0

        async with httpx.AsyncClient() as client:
            for i in range(0, len(sub_wallets), BATCH_SIZE):
                batch = sub_wallets[i:i + BATCH_SIZE]
                try:
                    bh_resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getLatestBlockhash",
                        "params": [{"commitment": "finalized"}],
                    }, timeout=10.0)
                    blockhash = Hash.from_string(bh_resp.json()["result"]["value"]["blockhash"])

                    instructions = []
                    for w in batch:
                        ix = transfer(TransferParams(
                            from_pubkey=main_kp.pubkey(),
                            to_pubkey=Pubkey.from_string(w["public_key"]),
                            lamports=lamports,
                        ))
                        instructions.append(ix)

                    msg = Message.new_with_blockhash(instructions, main_kp.pubkey(), blockhash)
                    tx = Transaction.new_unsigned(msg)
                    tx.sign([main_kp], blockhash)

                    encoded = base64.b64encode(bytes(tx)).decode("utf-8")
                    send_resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "sendTransaction",
                        "params": [encoded, {"encoding": "base64", "skipPreflight": True}],
                    }, timeout=30.0)
                    send_data = send_resp.json()

                    if "error" in send_data and send_data.get("error"):
                        logger.error(f"Distribute batch error: {send_data['error']}")
                    else:
                        total_sent += len(batch)
                        logger.info(f"Distribute batch {i//BATCH_SIZE+1}: {len(batch)} wallets OK")

                    await asyncio.sleep(0.5)
                except Exception as e:
                    logger.error(f"Distribute exception: {e}")

        return {
            "success": True, "total": len(sub_wallets),
            "sent": total_sent, "failed": len(sub_wallets) - total_sent,
            "sol_per_wallet": sol_per_wallet,
            "total_sol_sent": round(sol_per_wallet * total_sent, 4),
            "batches": (len(sub_wallets) + BATCH_SIZE - 1) // BATCH_SIZE,
        }

    async def collect_sol(self):
        main = await self.db.bot_wallets.find_one({"is_main": True}, {"_id": 0})
        if not main:
            return {"error": "No main wallet set"}
        main_pub = main["public_key"]
        wallets = await self._get_wallets()
        sub_wallets = [w for w in wallets if not w.get("is_main")]

        total_collected = 0
        processed = 0
        async with httpx.AsyncClient() as client:
            for w in sub_wallets:
                kp = self._load_keypair(w["private_key"])
                if not kp:
                    continue
                try:
                    resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getBalance", "params": [w["public_key"]],
                    }, timeout=10.0)
                    bal = resp.json()["result"]["value"]
                except Exception:
                    continue

                send_amount = bal - 5000 - 1_000_000
                if send_amount <= 0:
                    continue

                r = await self._sol_transfer_tx(kp, main_pub, send_amount)
                if r.get("success"):
                    total_collected += send_amount / LAMPORTS_PER_SOL
                processed += 1

        return {
            "success": True,
            "total_collected_sol": round(total_collected, 6),
            "wallets_processed": processed,
        }

    async def get_wallets_info(self):
        wallets = await self.db.bot_wallets.find({}, {"_id": 0, "private_key": 0}).to_list(200)
        async with httpx.AsyncClient() as client:
            for w in wallets:
                try:
                    resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getBalance", "params": [w["public_key"]],
                    }, timeout=10.0)
                    data = resp.json()
                    w["balance_sol"] = data["result"]["value"] / LAMPORTS_PER_SOL if "result" in data else 0
                except Exception:
                    w["balance_sol"] = 0
        return wallets
