import asyncio
import random
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
JUPITER_QUOTE_URL = "https://quote-api.jup.ag/v6/quote"
JUPITER_SWAP_URL = "https://quote-api.jup.ag/v6/swap"
SOLANA_RPC = "https://api.mainnet-beta.solana.com"
LAMPORTS_PER_SOL = 1_000_000_000


class VolumeBot:
    def __init__(self, db):
        self.db = db
        self.running = False
        self.task = None
        self.config = {
            "token_mint": "9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray",
            "target_volume_sol": 10,
            "target_makers": 20,
            "trade_interval_min": 10,
            "trade_interval_max": 15,
            "min_sol_per_trade": 0.005,
            "max_sol_per_trade": 0.05,
            "slippage_bps": 300,
        }
        self.stats = {
            "total_trades": 0,
            "total_volume_sol": 0.0,
            "daily_volume_sol": 0.0,
            "daily_makers": 0,
            "daily_trades": 0,
            "cycles": 0,
            "errors": 0,
            "last_trade_time": None,
            "started_at": None,
            "day_start": None,
        }
        self.daily_wallets_used = set()
        self.transaction_log = []

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
        self.stats["started_at"] = now
        self.stats["daily_volume_sol"] = 0.0
        self.stats["daily_makers"] = 0
        self.stats["daily_trades"] = 0
        self.stats["day_start"] = now
        self.stats["errors"] = 0
        self.daily_wallets_used = set()
        self.transaction_log = []
        self.task = asyncio.create_task(self._run_loop())
        logger.info("Volume bot started")
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
        trades_per_day = int(vol / avg_trade) if avg_trade > 0 else 0
        trades_from_interval = int((24 * 60) / ((cfg["trade_interval_min"] + cfg["trade_interval_max"]) / 2))
        actual_trades = min(trades_per_day, trades_from_interval)

        gas_per_tx = 0.000005
        priority_per_tx = 0.0001
        total_txs = actual_trades * 2  # buy + sell
        gas_cost = total_txs * (gas_per_tx + priority_per_tx)

        slippage_pct = cfg["slippage_bps"] / 10000
        slippage_cost = vol * slippage_pct

        total_daily_cost = gas_cost + slippage_cost
        sol_needed = avg_trade * cfg["target_makers"] + gas_cost

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
            self.stats["day_start"] = now
            self.daily_wallets_used = set()

    async def _run_loop(self):
        while self.running:
            try:
                self._reset_daily_if_needed()

                # Check daily target
                if self.stats["daily_volume_sol"] >= self.config["target_volume_sol"]:
                    logger.info("Daily volume target reached, waiting for next day...")
                    await asyncio.sleep(60)
                    continue

                wallets = await self._get_wallets()
                if not wallets:
                    logger.warning("No wallets configured")
                    await asyncio.sleep(5)
                    continue

                # Pick wallet - prefer unused wallets for maker count
                unused = [w for w in wallets if w["public_key"] not in self.daily_wallets_used]
                wallet = random.choice(unused) if unused else random.choice(wallets)

                keypair = self._load_keypair(wallet["private_key"])
                if not keypair:
                    logger.error(f"Invalid keypair: {wallet.get('label')}")
                    await asyncio.sleep(5)
                    continue

                sol_amount = random.uniform(
                    self.config["min_sol_per_trade"],
                    self.config["max_sol_per_trade"]
                )
                remaining = self.config["target_volume_sol"] - self.stats["daily_volume_sol"]
                sol_amount = min(sol_amount, remaining)
                if sol_amount < 0.0001:
                    continue

                lamports = int(sol_amount * LAMPORTS_PER_SOL)
                token_mint = self.config["token_mint"]

                # BUY: SOL -> Token
                logger.info(f"BUY {sol_amount:.6f} SOL -> {token_mint[:8]}... via {wallet.get('label')}")
                buy_result = await self._execute_swap(keypair, SOL_MINT, token_mint, lamports)

                if buy_result and not buy_result.get("error"):
                    self.stats["total_trades"] += 1
                    self.stats["daily_trades"] += 1
                    self.stats["total_volume_sol"] += sol_amount
                    self.stats["daily_volume_sol"] += sol_amount
                    self.daily_wallets_used.add(wallet["public_key"])
                    self.stats["daily_makers"] = len(self.daily_wallets_used)
                    self._log_tx("BUY", sol_amount, buy_result, wallet.get("label", ""))
                else:
                    self.stats["errors"] += 1
                    self._log_tx("ERROR", sol_amount, buy_result or {"error": "No result"}, wallet.get("label", ""))

                # Wait between buy and sell
                half_interval = random.uniform(
                    self.config["trade_interval_min"] * 30,
                    self.config["trade_interval_max"] * 30
                )
                await asyncio.sleep(half_interval)

                # SELL: Token -> SOL
                if buy_result and buy_result.get("out_amount") and not buy_result.get("error"):
                    out_amount = int(buy_result["out_amount"])
                    sell_result = await self._execute_swap(keypair, token_mint, SOL_MINT, out_amount)

                    if sell_result and not sell_result.get("error"):
                        self.stats["total_trades"] += 1
                        self.stats["daily_trades"] += 1
                        self.stats["total_volume_sol"] += sol_amount
                        self.stats["daily_volume_sol"] += sol_amount
                        self._log_tx("SELL", sol_amount, sell_result, wallet.get("label", ""))
                    else:
                        self.stats["errors"] += 1
                        self._log_tx("ERROR", sol_amount, sell_result or {"error": "No result"}, wallet.get("label", ""))

                self.stats["cycles"] += 1
                self.stats["last_trade_time"] = time.time()

                # Wait for next trade cycle
                interval_sec = random.uniform(
                    self.config["trade_interval_min"] * 60,
                    self.config["trade_interval_max"] * 60
                )
                await asyncio.sleep(interval_sec)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.stats["errors"] += 1
                self._log_tx("ERROR", 0, {"error": str(e)}, "system")
                logger.error(f"Bot loop error: {e}")
                await asyncio.sleep(10)

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
                    "prioritizationFeeLamports": "auto",
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
                    "params": [encoded_tx, {"encoding": "base64", "skipPreflight": False}],
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

    async def _sol_transfer(self, sender_keypair, receiver_pubkey_str, lamports):
        try:
            receiver = Pubkey.from_string(receiver_pubkey_str)
            ix = transfer(TransferParams(
                from_pubkey=sender_keypair.pubkey(),
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
                blockhash_str = bh_data["result"]["value"]["blockhash"]
                blockhash = Hash.from_string(blockhash_str)

                msg = Message.new_with_blockhash([ix], sender_keypair.pubkey(), blockhash)
                tx = Transaction.new_unsigned(msg)
                tx.sign([sender_keypair], blockhash)

                encoded = base64.b64encode(bytes(tx)).decode("utf-8")
                send_resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1,
                    "method": "sendTransaction",
                    "params": [encoded, {"encoding": "base64"}],
                }, timeout=30.0)
                send_data = send_resp.json()
                if "error" in send_data:
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
        return await self.db.bot_wallets.find({}, {"_id": 0}).to_list(100)

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

    # === Wallet Management ===

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
        for i in range(min(count, 50)):
            kp = Keypair()
            pub = str(kp.pubkey())
            priv = base58.b58encode(bytes(kp)).decode("utf-8")
            label = f"{prefix} #{len(await self._get_wallets()) + 1}"
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
            return {"error": "No main wallet set. Mark one wallet as main first."}

        main_kp = self._load_keypair(main["private_key"])
        if not main_kp:
            return {"error": "Invalid main wallet keypair"}

        wallets = await self._get_wallets()
        sub_wallets = [w for w in wallets if not w.get("is_main")]
        if not sub_wallets:
            return {"error": "No sub-wallets to distribute to"}

        lamports = int(sol_per_wallet * LAMPORTS_PER_SOL)
        results = []
        for w in sub_wallets:
            r = await self._sol_transfer(main_kp, w["public_key"], lamports)
            results.append({"wallet": w["label"], "public_key": w["public_key"], **r})
            await asyncio.sleep(0.5)

        success = sum(1 for r in results if r.get("success"))
        return {
            "success": True,
            "total": len(sub_wallets),
            "sent": success,
            "failed": len(sub_wallets) - success,
            "sol_per_wallet": sol_per_wallet,
            "total_sol_sent": round(sol_per_wallet * success, 4),
            "details": results,
        }

    async def collect_sol(self):
        main = await self.db.bot_wallets.find_one({"is_main": True}, {"_id": 0})
        if not main:
            return {"error": "No main wallet set"}

        main_pub = main["public_key"]
        wallets = await self._get_wallets()
        sub_wallets = [w for w in wallets if not w.get("is_main")]

        results = []
        total_collected = 0
        for w in sub_wallets:
            kp = self._load_keypair(w["private_key"])
            if not kp:
                continue
            # Get balance
            async with httpx.AsyncClient() as client:
                try:
                    resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getBalance", "params": [w["public_key"]],
                    }, timeout=10.0)
                    bal = resp.json()["result"]["value"]
                except Exception:
                    continue

            # Leave 0.001 SOL for rent
            send_amount = bal - 5000 - 1_000_000
            if send_amount <= 0:
                continue

            r = await self._sol_transfer(kp, main_pub, send_amount)
            if r.get("success"):
                total_collected += send_amount / LAMPORTS_PER_SOL
            results.append({"wallet": w["label"], **r})
            await asyncio.sleep(0.5)

        return {
            "success": True,
            "total_collected_sol": round(total_collected, 6),
            "wallets_processed": len(results),
            "details": results,
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
