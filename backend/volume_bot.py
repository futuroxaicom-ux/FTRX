import asyncio
import random
import math
import time
import base64
import base58
import json
import httpx
import logging
import os
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import transfer, TransferParams
from solders.transaction import Transaction, VersionedTransaction
from solders.message import Message
from solders.hash import Hash
from solders.instruction import Instruction, AccountMeta
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

SOL_MINT = "So11111111111111111111111111111111111111112"
JUPITER_QUOTE_URL = "https://api.jup.ag/swap/v1/quote"
JUPITER_SWAP_URL = "https://api.jup.ag/swap/v1/swap"
SOLANA_RPC = os.environ.get("SOLANA_RPC_URL", "https://solana.publicnode.com")
LAMPORTS_PER_SOL = 1_000_000_000
TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
SYSTEM_PROGRAM_ID = Pubkey.from_string("11111111111111111111111111111111")


def get_ata(wallet_pubkey: Pubkey, mint_pubkey: Pubkey) -> Pubkey:
    """Derive Associated Token Account address"""
    ata, _bump = Pubkey.find_program_address(
        [bytes(wallet_pubkey), bytes(TOKEN_PROGRAM_ID), bytes(mint_pubkey)],
        ASSOCIATED_TOKEN_PROGRAM_ID,
    )
    return ata


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
            "slippage_bps": 1500,
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
            "sol_spent_buy": 0.0,
            "sol_recovered_sell": 0.0,
            "net_cost": 0.0,
            "successful_trades": 0,
            "failed_trades": 0,
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
        # Track wallets that already have ATA (saves 0.002 SOL rent)
        self._has_ata = set()

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
            "sol_spent_buy": 0.0, "sol_recovered_sell": 0.0,
            "net_cost": 0.0, "successful_trades": 0, "failed_trades": 0,
        }
        self.daily_wallets_used = set()
        self.transaction_log = []
        self._balance_cache = {}
        self._balance_cache_time = 0
        self._token_holders = {}
        self._last_trade_wallet = None
        self._last_action = None
        self._buys_since_sell = 0
        self._has_ata = set()
        self.task = asyncio.create_task(self._run_loop())
        logger.info("Volume bot started (organic mode)")
        # Pre-scan ATAs before first trade to avoid unnecessary errors
        asyncio.create_task(self._prescan_atas())
        return True

    async def _prescan_atas(self):
        """Force ATA detection on startup - prevents errors from unknown ATA state"""
        try:
            wallets = await self._get_wallets()
            sub_wallets = [w for w in wallets if not w.get("is_main")]
            if sub_wallets:
                await self._refresh_balances(sub_wallets)
                await self._detect_existing_atas(sub_wallets)
                logger.info(f"Pre-scan complete: {len(self._has_ata)} wallets with ATA detected")
        except Exception as e:
            logger.error(f"Pre-scan ATA error: {e}")

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
        s = self.stats
        success_rate = (s["successful_trades"] / max(1, s["successful_trades"] + s["failed_trades"])) * 100
        cost_per_trade = s["net_cost"] / max(1, s["successful_trades"])
        cost_per_maker = s["net_cost"] / max(1, s["daily_makers"])
        return {
            "running": self.running,
            "config": self.config,
            "stats": self.stats,
            "daily_wallets_used": len(self.daily_wallets_used),
            "token_holders": len(self._token_holders),
            "buys_since_sell": self._buys_since_sell,
            "last_action": self._last_action,
            "efficiency": {
                "success_rate": round(success_rate, 1),
                "net_cost_sol": round(s["net_cost"], 6),
                "cost_per_trade": round(cost_per_trade, 6),
                "cost_per_maker": round(cost_per_maker, 6),
                "sol_spent": round(s["sol_spent_buy"], 6),
                "sol_recovered": round(s["sol_recovered_sell"], 6),
                "wallets_with_ata": len(self._has_ata),
            },
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

    async def _detect_existing_atas(self, wallets):
        """Check which wallets already have token accounts (saves 0.00204 SOL reserve per wallet)"""
        token_mint_str = self.config.get("token_mint", "")
        if not token_mint_str:
            return
        token_mint = Pubkey.from_string(token_mint_str)
        active = [w for w in wallets if self._balance_cache.get(w["public_key"], 0) > 2_000_000]
        ata_checks = []
        for w in active:
            try:
                wallet_pub = Pubkey.from_string(w["public_key"])
                ata = get_ata(wallet_pub, token_mint)
                ata_checks.append((w["public_key"], str(ata)))
            except Exception:
                pass

        # Batch check ATA existence
        BATCH = 50
        async with httpx.AsyncClient(timeout=10.0) as client:
            for i in range(0, len(ata_checks), BATCH):
                batch = ata_checks[i:i + BATCH]
                rpc_batch = [
                    {"jsonrpc": "2.0", "id": idx, "method": "getAccountInfo",
                     "params": [ata_addr, {"encoding": "base64"}]}
                    for idx, (_, ata_addr) in enumerate(batch)
                ]
                try:
                    resp = await client.post(SOLANA_RPC, json=rpc_batch)
                    results = resp.json()
                    if isinstance(results, list):
                        for r in results:
                            rid = r.get("id", 0)
                            if 0 <= rid < len(batch) and r.get("result", {}).get("value"):
                                self._has_ata.add(batch[rid][0])
                except Exception:
                    pass
        if self._has_ata:
            logger.info(f"Detected {len(self._has_ata)} wallets with existing ATA (lower reserve)")

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

                # Detect existing ATAs (one-time at start, then after buys)
                if not self._has_ata:
                    await self._detect_existing_atas(sub_wallets)

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
        min_trade = self.config["min_sol_per_trade"]
        # Wallets with ATA need less reserve (no rent), so lower threshold
        funded_buy = []
        for w in sub_wallets:
            bal = self._balance_cache.get(w["public_key"], 0) / LAMPORTS_PER_SOL
            reserve = 0.001 if w["public_key"] in self._has_ata else 0.005
            if bal >= min_trade + reserve:
                funded_buy.append(w)
        funded_sell = [w for w in sub_wallets
                       if self._balance_cache.get(w["public_key"], 0) >= 1_500_000]  # 0.0015 SOL for sell fees
        holders = [w for w in sub_wallets if w["public_key"] in self._token_holders]

        # If holders exist but no wallet can BUY, try to SELL to recycle SOL
        if not funded_buy and holders:
            eligible_sellers = [h for h in holders
                                if h["public_key"] in [f["public_key"] for f in funded_sell]
                                and h["public_key"] != self._last_trade_wallet]
            if eligible_sellers:
                return "SELL"
            # Try any holder that can pay fees
            any_seller = [h for h in holders
                          if h["public_key"] in [f["public_key"] for f in funded_sell]]
            if any_seller:
                return "SELL"
            return "REFUND"

        # No funded wallets at all -> nothing to do
        if not funded_buy:
            return "REFUND"

        # Must buy first - need at least 2-4 holders before any selling
        min_holders_before_sell = random.randint(2, min(4, max(2, len(funded_buy) // 2 + 1)))
        if len(holders) < min_holders_before_sell:
            return "BUY"

        # Accumulate buys before allowing sells (random 2-5 buys between sells)
        buys_needed = random.randint(2, 5)
        sell_allowed = self._buys_since_sell >= buys_needed and len(holders) >= 2

        # Build weighted random choices - organic sequences
        weights = []
        actions = []

        if funded_buy:
            # More buys if few holders, less if many
            buy_weight = 50 if len(holders) < 4 else 35
            # If last action was also BUY, slightly reduce (but don't block)
            if self._last_action == "BUY":
                buy_weight = max(20, buy_weight - 10)
            actions.append("BUY")
            weights.append(buy_weight)

        if sell_allowed:
            # Only sell from wallets that are NOT the last buyer AND can pay fees
            eligible_sellers = [h for h in holders
                                if h["public_key"] != self._last_trade_wallet
                                and self._balance_cache.get(h["public_key"], 0) >= 3_000_000]
            if eligible_sellers:
                sell_weight = 30 if len(holders) < 5 else 45
                if self._last_action == "SELL":
                    sell_weight = max(10, sell_weight - 15)
                actions.append("SELL")
                weights.append(sell_weight)

        if len(funded_buy) > 1:
            actions.append("TRANSFER_SOL")
            weights.append(20)  # Higher weight - SOL concentration is key for bigger trades

        if self.config.get("auto_refund"):
            actions.append("REFUND")
            weights.append(3)  # Very low priority - don't block trading

        if not actions:
            return "BUY"

        return random.choices(actions, weights=weights, k=1)[0]

    async def _do_buy(self, sub_wallets):
        """Organic BUY - different wallet than last trade, gaussian amount"""
        min_trade = self.config["min_sol_per_trade"]
        funded = []
        for w in sub_wallets:
            bal = self._balance_cache.get(w["public_key"], 0) / LAMPORTS_PER_SOL
            reserve = 0.001 if w["public_key"] in self._has_ata else 0.005
            if bal >= min_trade + reserve:
                funded.append(w)
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
        # Reserve: 0.001 if wallet already has ATA, 0.005 if not (ATA rent 0.00204 + fees)
        pub = wallet["public_key"]
        reserve = 0.001 if pub in self._has_ata else 0.005
        wallet_sol = (self._balance_cache.get(pub, 0) / LAMPORTS_PER_SOL) - reserve
        sol_amount = min(sol_amount, max(0, wallet_sol))
        remaining = self.config["target_volume_sol"] - self.stats["daily_volume_sol"]
        sol_amount = min(sol_amount, remaining)
        sol_amount = round(sol_amount, 6)
        if sol_amount < 0.0005:
            return

        lamports = int(sol_amount * LAMPORTS_PER_SOL)
        token_mint = self.config["token_mint"]

        # Capture balance before trade for cost tracking
        bal_before = self._balance_cache.get(pub, 0)

        logger.info(f"BUY {sol_amount:.6f} SOL -> token via {wallet.get('label')}")
        result = await self._execute_swap(keypair, SOL_MINT, token_mint, lamports)

        if result and not result.get("error"):
            self.stats["total_trades"] += 1
            self.stats["daily_trades"] += 1
            self.stats["total_volume_sol"] += sol_amount
            self.stats["daily_volume_sol"] += sol_amount
            self.stats["successful_trades"] += 1
            self.stats["sol_spent_buy"] += sol_amount
            self.daily_wallets_used.add(pub)
            self.stats["daily_makers"] = len(self.daily_wallets_used)
            # Track token holding - accumulate if already holding
            existing = self._token_holders.get(pub, {})
            prev_amount = existing.get("amount", 0)
            prev_sol = existing.get("sol_value", 0)
            self._token_holders[pub] = {
                "amount": prev_amount + int(result.get("out_amount", 0)),
                "sol_value": prev_sol + sol_amount,
                "wallet": wallet,
            }
            self._has_ata.add(pub)  # Wallet now has ATA
            # Update balance cache
            self._balance_cache[pub] = max(0, bal_before - lamports - 10000)
            self._last_trade_wallet = pub
            self._last_action = "BUY"
            self._buys_since_sell += 1
            # Update net cost
            self.stats["net_cost"] = self.stats["sol_spent_buy"] - self.stats["sol_recovered_sell"]
            self._log_tx("BUY", sol_amount, result, wallet.get("label", ""))
        else:
            self.stats["errors"] += 1
            self.stats["failed_trades"] += 1
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
            self.stats["successful_trades"] += 1
            # Track recovered SOL
            sol_received_lamports = int(result.get("out_amount", 0))
            sol_received = sol_received_lamports / LAMPORTS_PER_SOL
            self.stats["sol_recovered_sell"] += sol_received
            self.stats["net_cost"] = self.stats["sol_spent_buy"] - self.stats["sol_recovered_sell"]
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

            self._balance_cache[pub] = self._balance_cache.get(pub, 0) + sol_received_lamports
            self._last_trade_wallet = pub
            self._last_action = "SELL"
            self._buys_since_sell = 0
            self._log_tx("SELL", sell_sol_value, result, wallet.get("label", ""))
            logger.info(f"SELL recovered {sol_received:.6f} SOL (net cost: {self.stats['net_cost']:.6f})")
        else:
            self.stats["errors"] += 1
            self.stats["failed_trades"] += 1
            self._log_tx("ERROR", sell_sol_value, result or {"error": "No result"}, wallet.get("label", ""))

    async def _do_sol_transfer(self, sub_wallets):
        """SOL CONCENTRATION: Aggregate SOL from multiple low-balance wallets into one
        for bigger trades. This creates a circulation pattern where SOL concentrates
        in fewer wallets, enabling larger swaps and better volume generation."""
        min_trade = self.config["min_sol_per_trade"]
        max_trade = self.config["max_sol_per_trade"]

        # Find wallets that can donate (have SOL but not holding tokens)
        donors = []
        for w in sub_wallets:
            bal = self._balance_cache.get(w["public_key"], 0) / LAMPORTS_PER_SOL
            if bal > 0.002 and w["public_key"] not in self._token_holders:
                donors.append((w, bal))

        # Find wallets that could do bigger trades if they had more SOL
        # Target: wallets that need SOL to reach max_trade level
        receivers = []
        for w in sub_wallets:
            bal = self._balance_cache.get(w["public_key"], 0) / LAMPORTS_PER_SOL
            if w["public_key"] not in self._token_holders and bal < max_trade:
                receivers.append((w, bal))

        if not donors or not receivers:
            return

        # Sort: donors by balance descending, receivers by balance ascending
        donors.sort(key=lambda x: x[1], reverse=True)
        receivers.sort(key=lambda x: x[1])

        # Pick a low-balance receiver to concentrate SOL into
        receiver, recv_bal = receivers[0]
        # Pick a donor that has excess SOL (but is NOT the receiver)
        donor = None
        for d, d_bal in donors:
            if d["public_key"] != receiver["public_key"] and d_bal > min_trade + 0.003:
                donor = d
                break
        if not donor:
            return

        donor_kp = self._load_keypair(donor["private_key"])
        if not donor_kp:
            return

        # Transfer enough SOL to enable a bigger trade
        donor_bal = self._balance_cache.get(donor["public_key"], 0)
        keep = int(0.002 * LAMPORTS_PER_SOL)  # Keep minimum for future fees
        available = donor_bal - keep
        if available <= 100_000:
            return

        # Transfer 50-80% of available SOL to concentrate it
        transfer_pct = random.uniform(0.5, 0.8)
        transfer_amount = int(available * transfer_pct)
        transfer_sol = transfer_amount / LAMPORTS_PER_SOL

        logger.info(f"CONCENTRATE {transfer_sol:.6f} SOL: {donor.get('label')} -> {receiver.get('label')} (for bigger trades)")
        result = await self._sol_transfer_tx(donor_kp, receiver["public_key"], transfer_amount)

        if result and result.get("success"):
            self._balance_cache[donor["public_key"]] = donor_bal - transfer_amount - 5000
            self._balance_cache[receiver["public_key"]] = self._balance_cache.get(receiver["public_key"], 0) + transfer_amount
            self.stats["daily_transfers"] += 1
            self._log_tx("TRANSFER", transfer_sol, result, f"{donor.get('label','')} -> {receiver.get('label','')}")
        else:
            self._log_tx("ERROR", transfer_sol, result or {"error": "Transfer failed"}, donor.get("label", ""))

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
        # Batch RPC for speed
        BATCH = 50
        async with httpx.AsyncClient(timeout=10.0) as client:
            for i in range(0, len(wallets), BATCH):
                batch = wallets[i:i + BATCH]
                rpc_batch = [
                    {"jsonrpc": "2.0", "id": idx, "method": "getBalance", "params": [w["public_key"]]}
                    for idx, w in enumerate(batch)
                ]
                try:
                    resp = await client.post(SOLANA_RPC, json=rpc_batch)
                    results = resp.json()
                    if isinstance(results, list):
                        for r in results:
                            rid = r.get("id", 0)
                            if 0 <= rid < len(batch):
                                self._balance_cache[batch[rid]["public_key"]] = r.get("result", {}).get("value", 0)
                except Exception:
                    pass
        self._balance_cache_time = now
        min_trade = self.config["min_sol_per_trade"]
        funded = 0
        for pub, bal in self._balance_cache.items():
            reserve = 0.001 if pub in self._has_ata else 0.005
            if bal / LAMPORTS_PER_SOL >= min_trade + reserve:
                funded += 1
        logger.info(f"Balances refreshed: {funded} funded wallets, {len(self._token_holders)} token holders")

    async def _execute_swap(self, keypair, input_mint, output_mint, amount):
        # Dynamic slippage: start from configured level, increase on retry
        base_slip = max(self.config["slippage_bps"], 1000)
        slippage_levels = [base_slip, base_slip + 500, base_slip + 1000]
        for attempt, slippage in enumerate(slippage_levels):
            result = await self._execute_swap_once(keypair, input_mint, output_mint, amount, slippage)
            if result and not result.get("error"):
                if attempt > 0:
                    logger.info(f"Swap succeeded on attempt {attempt + 1} with slippage {slippage} bps")
                return result
            err = str(result.get("error", "")) if result else ""
            is_slippage = "Custom" in err or "InstructionError" in err
            is_rate_limit = "429" in err
            if is_rate_limit or (not is_slippage) or attempt == len(slippage_levels) - 1:
                return result
            logger.info(f"Slippage/sim error at {slippage}bps, retrying at {slippage_levels[attempt + 1]}bps...")
            await asyncio.sleep(2)  # Wait 2s between retries to avoid 429
        return result

    async def _execute_swap_once(self, keypair, input_mint, output_mint, amount, slippage_bps=None):
        if slippage_bps is None:
            slippage_bps = self.config["slippage_bps"]
        try:
            async with httpx.AsyncClient() as client:
                quote_resp = await client.get(JUPITER_QUOTE_URL, params={
                    "inputMint": input_mint,
                    "outputMint": output_mint,
                    "amount": str(amount),
                    "slippageBps": str(slippage_bps),
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
                    "prioritizationFeeLamports": 50000,
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

                # Send directly with skipPreflight (simulation adds latency and can fail on slippage)
                rpc_resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1,
                    "method": "sendTransaction",
                    "params": [encoded_tx, {
                        "encoding": "base64",
                        "skipPreflight": True,
                        "maxRetries": 3,
                    }],
                }, timeout=30.0)

                rpc_data = rpc_resp.json()
                if "error" in rpc_data and rpc_data.get("error"):
                    err_msg = rpc_data["error"]
                    if isinstance(err_msg, dict):
                        err_msg = err_msg.get("message", str(err_msg))
                    return {"error": f"RPC: {err_msg}"}

                signature = rpc_data.get("result", "")
                if not signature:
                    return {"error": "No signature returned"}

                # Confirm transaction (wait up to 15s)
                for _ in range(5):
                    await asyncio.sleep(3)
                    try:
                        conf_resp = await client.post(SOLANA_RPC, json={
                            "jsonrpc": "2.0", "id": 1,
                            "method": "getSignatureStatuses",
                            "params": [[signature]],
                        }, timeout=10.0)
                        conf_data = conf_resp.json()
                        statuses = conf_data.get("result", {}).get("value", [])
                        if statuses and statuses[0]:
                            status = statuses[0]
                            if status.get("err"):
                                return {"error": f"Tx failed on-chain: {status['err']}", "signature": signature}
                            if status.get("confirmationStatus") in ("confirmed", "finalized"):
                                logger.info(f"Tx confirmed: {signature[:20]}...")
                                return {
                                    "signature": signature,
                                    "out_amount": quote.get("outAmount"),
                                    "price_impact": quote.get("priceImpactPct"),
                                    "in_amount": str(amount),
                                }
                    except Exception:
                        pass

                # Tx sent but not confirmed yet - still return signature
                return {
                    "signature": signature,
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
        token_mint_str = self.config.get("token_mint", "")

        BATCH = 50
        async with httpx.AsyncClient(timeout=10.0) as client:
            # SOL balances (batch RPC - fast)
            for i in range(0, len(wallets), BATCH):
                batch = wallets[i:i + BATCH]
                rpc_batch = [
                    {"jsonrpc": "2.0", "id": idx, "method": "getBalance", "params": [w["public_key"]]}
                    for idx, w in enumerate(batch)
                ]
                try:
                    resp = await client.post(SOLANA_RPC, json=rpc_batch)
                    results = resp.json()
                    if isinstance(results, list):
                        for r in results:
                            rid = r.get("id", 0)
                            if 0 <= rid < len(batch):
                                batch[rid]["balance_sol"] = r.get("result", {}).get("value", 0) / LAMPORTS_PER_SOL
                except Exception:
                    pass
                for w in batch:
                    w.setdefault("balance_sol", 0)

            # FTRX balances: compute ATA address offline, then batch getTokenAccountBalance
            for w in wallets:
                w["balance_ftrx"] = 0
            if token_mint_str:
                token_mint = Pubkey.from_string(token_mint_str)
                # Check ALL wallets for FTRX (not just those with SOL > threshold)
                # Compute ATAs (pure math, no RPC)
                ata_map = []
                for w in wallets:
                    try:
                        wallet_pub = Pubkey.from_string(w["public_key"])
                        ata = get_ata(wallet_pub, token_mint)
                        ata_map.append((w, str(ata)))
                    except Exception:
                        pass

                # Batch getTokenAccountBalance (much faster than getTokenAccountsByOwner)
                for i in range(0, len(ata_map), BATCH):
                    batch_items = ata_map[i:i + BATCH]
                    rpc_batch = [
                        {"jsonrpc": "2.0", "id": idx, "method": "getTokenAccountBalance", "params": [ata_addr]}
                        for idx, (_, ata_addr) in enumerate(batch_items)
                    ]
                    try:
                        resp = await client.post(SOLANA_RPC, json=rpc_batch)
                        results = resp.json()
                        if isinstance(results, list):
                            for r in results:
                                rid = r.get("id", 0)
                                if 0 <= rid < len(batch_items):
                                    wallet_ref = batch_items[rid][0]
                                    val = r.get("result", {}).get("value", {})
                                    ui_amount = val.get("uiAmount")
                                    if ui_amount is not None:
                                        wallet_ref["balance_ftrx"] = float(ui_amount)
                    except Exception:
                        pass

        return wallets

    async def refresh_ftrx_balances(self):
        """Fetch actual FTRX balances from blockchain for active wallets"""
        wallets = await self.db.bot_wallets.find({}, {"_id": 0, "private_key": 0}).to_list(200)
        token_mint = self.config.get("token_mint", "")
        if not token_mint:
            return {"wallets": 0, "holders": 0}

        holders = 0
        async with httpx.AsyncClient(timeout=8.0) as client:
            for w in wallets:
                try:
                    resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getTokenAccountsByOwner",
                        "params": [w["public_key"], {"mint": token_mint}, {"encoding": "jsonParsed"}],
                    })
                    data = resp.json()
                    accounts = data.get("result", {}).get("value", [])
                    if accounts:
                        info = accounts[0].get("account", {}).get("data", {}).get("parsed", {}).get("info", {})
                        amount = info.get("tokenAmount", {})
                        ui = float(amount.get("uiAmount", 0) or 0)
                        raw = int(amount.get("amount", 0) or 0)
                        if raw > 0:
                            self._token_holders[w["public_key"]] = {
                                "amount": raw,
                                "sol_value": ui,
                                "wallet": w,
                            }
                            holders += 1
                except Exception:
                    pass

        return {"wallets": len(wallets), "holders": holders}

    async def collect_ftrx(self):
        """Collect FTRX tokens from all sub-wallets to the main wallet"""
        main = await self.db.bot_wallets.find_one({"is_main": True}, {"_id": 0})
        if not main:
            return {"error": "Brak portfela glownego"}
        main_pub = Pubkey.from_string(main["public_key"])
        token_mint_str = self.config.get("token_mint", "")
        if not token_mint_str:
            return {"error": "Brak token mint w konfiguracji"}
        token_mint = Pubkey.from_string(token_mint_str)

        wallets = await self._get_wallets()
        sub_wallets = [w for w in wallets if not w.get("is_main")]

        main_ata = get_ata(main_pub, token_mint)
        total_collected = 0
        processed = 0
        errors = 0

        async with httpx.AsyncClient() as client:
            # Check if main wallet ATA exists
            main_ata_exists = False
            try:
                resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1,
                    "method": "getAccountInfo",
                    "params": [str(main_ata), {"encoding": "base64"}],
                }, timeout=5.0)
                ata_data = resp.json()
                if ata_data.get("result", {}).get("value"):
                    main_ata_exists = True
            except Exception:
                pass

            for w in sub_wallets:
                kp = self._load_keypair(w["private_key"])
                if not kp:
                    continue

                # Get token balance for this sub-wallet
                try:
                    resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getTokenAccountsByOwner",
                        "params": [
                            w["public_key"],
                            {"mint": token_mint_str},
                            {"encoding": "jsonParsed"}
                        ],
                    }, timeout=5.0)
                    data = resp.json()
                    accounts = data.get("result", {}).get("value", [])
                    if not accounts:
                        continue

                    token_account_info = accounts[0]
                    source_ata_str = token_account_info["pubkey"]
                    source_ata = Pubkey.from_string(source_ata_str)
                    parsed = token_account_info["account"]["data"]["parsed"]["info"]
                    token_amount = int(parsed["tokenAmount"]["amount"])
                    ui_amount = float(parsed["tokenAmount"].get("uiAmount", 0) or 0)

                    if token_amount <= 0:
                        continue

                except Exception:
                    continue

                # Build transaction
                try:
                    bh_resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getLatestBlockhash",
                        "params": [{"commitment": "finalized"}],
                    }, timeout=10.0)
                    blockhash = Hash.from_string(bh_resp.json()["result"]["value"]["blockhash"])

                    instructions = []

                    # Create main wallet ATA if not exists
                    if not main_ata_exists:
                        create_ata_ix = Instruction(
                            program_id=ASSOCIATED_TOKEN_PROGRAM_ID,
                            accounts=[
                                AccountMeta(kp.pubkey(), True, True),
                                AccountMeta(main_ata, True, False),
                                AccountMeta(main_pub, False, False),
                                AccountMeta(token_mint, False, False),
                                AccountMeta(SYSTEM_PROGRAM_ID, False, False),
                                AccountMeta(TOKEN_PROGRAM_ID, False, False),
                            ],
                            data=bytes(),
                        )
                        instructions.append(create_ata_ix)

                    # SPL Transfer instruction
                    transfer_data = bytes([3]) + token_amount.to_bytes(8, "little")
                    transfer_ix = Instruction(
                        program_id=TOKEN_PROGRAM_ID,
                        accounts=[
                            AccountMeta(source_ata, True, False),
                            AccountMeta(main_ata, True, False),
                            AccountMeta(kp.pubkey(), False, True),
                        ],
                        data=transfer_data,
                    )
                    instructions.append(transfer_ix)

                    msg = Message.new_with_blockhash(instructions, kp.pubkey(), blockhash)
                    tx = Transaction.new_unsigned(msg)
                    tx.sign([kp], blockhash)

                    encoded = base64.b64encode(bytes(tx)).decode("utf-8")
                    send_resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "sendTransaction",
                        "params": [encoded, {"encoding": "base64", "skipPreflight": True}],
                    }, timeout=30.0)
                    send_data = send_resp.json()

                    if "error" in send_data and send_data.get("error"):
                        logger.error(f"FTRX collect error for {w.get('label')}: {send_data['error']}")
                        errors += 1
                    else:
                        total_collected += ui_amount
                        processed += 1
                        main_ata_exists = True  # ATA now exists after first tx
                        logger.info(f"Collected {ui_amount} FTRX from {w.get('label')}")

                    await asyncio.sleep(0.3)
                except Exception as e:
                    logger.error(f"FTRX collect exception for {w.get('label')}: {e}")
                    errors += 1

        return {
            "success": True,
            "total_collected_ftrx": round(total_collected, 6),
            "wallets_processed": processed,
            "errors": errors,
        }
