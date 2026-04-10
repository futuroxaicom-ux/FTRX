import asyncio
import random
import time
import base64
import base58
import httpx
import logging
from solders.keypair import Keypair
from solders.transaction import VersionedTransaction
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

FTRX_MINT = "9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray"
SOL_MINT = "So11111111111111111111111111111111111111112"
JUPITER_QUOTE_URL = "https://quote-api.jup.ag/v6/quote"
JUPITER_SWAP_URL = "https://quote-api.jup.ag/v6/swap"
SOLANA_RPC = "https://api.mainnet-beta.solana.com"


class VolumeBot:
    def __init__(self, db):
        self.db = db
        self.running = False
        self.task = None
        self.config = {
            "min_sol": 0.001,
            "max_sol": 0.01,
            "min_delay": 10,
            "max_delay": 60,
            "slippage_bps": 300,
        }
        self.stats = {
            "total_trades": 0,
            "total_volume_sol": 0.0,
            "cycles": 0,
            "errors": 0,
            "last_trade_time": None,
            "started_at": None,
        }
        self.transaction_log = []

    async def start(self):
        if self.running:
            return False
        self.running = True
        self.stats["started_at"] = time.time()
        self.stats["total_trades"] = 0
        self.stats["total_volume_sol"] = 0.0
        self.stats["cycles"] = 0
        self.stats["errors"] = 0
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
        self.stats["started_at"] = None
        logger.info("Volume bot stopped")
        return True

    def get_status(self):
        return {
            "running": self.running,
            "config": self.config,
            "stats": self.stats,
            "recent_transactions": self.transaction_log[-50:],
        }

    def update_config(self, new_config):
        for key in ["min_sol", "max_sol", "min_delay", "max_delay", "slippage_bps"]:
            if key in new_config:
                self.config[key] = new_config[key]
        return self.config

    async def _run_loop(self):
        while self.running:
            try:
                wallets = await self._get_wallets()
                if not wallets:
                    logger.warning("No wallets configured, waiting...")
                    await asyncio.sleep(5)
                    continue

                wallet = random.choice(wallets)
                keypair = self._load_keypair(wallet["private_key"])
                if not keypair:
                    logger.error(f"Invalid keypair for wallet: {wallet.get('label', 'unknown')}")
                    await asyncio.sleep(5)
                    continue

                sol_amount = random.uniform(self.config["min_sol"], self.config["max_sol"])
                lamports = int(sol_amount * 1_000_000_000)

                # BUY: SOL -> FTRX
                logger.info(f"Cycle {self.stats['cycles']+1}: BUY {sol_amount:.6f} SOL -> FTRX via {wallet.get('label', 'wallet')}")
                buy_result = await self._execute_swap(keypair, SOL_MINT, FTRX_MINT, lamports)

                if buy_result and not buy_result.get("error"):
                    self.stats["total_trades"] += 1
                    self.stats["total_volume_sol"] += sol_amount
                    self._log_transaction("BUY", sol_amount, buy_result, wallet.get("label", ""))
                    logger.info(f"BUY success: {buy_result.get('signature', '')[:20]}...")
                else:
                    self.stats["errors"] += 1
                    self._log_transaction("ERROR", sol_amount, buy_result or {"error": "No result"}, wallet.get("label", ""))
                    logger.error(f"BUY failed: {buy_result}")

                # Wait between buy and sell
                half_delay = random.uniform(self.config["min_delay"] / 2, self.config["max_delay"] / 2)
                await asyncio.sleep(half_delay)

                # SELL: FTRX -> SOL
                if buy_result and buy_result.get("out_amount") and not buy_result.get("error"):
                    out_amount = int(buy_result["out_amount"])
                    logger.info(f"Cycle {self.stats['cycles']+1}: SELL {out_amount} FTRX -> SOL")
                    sell_result = await self._execute_swap(keypair, FTRX_MINT, SOL_MINT, out_amount)

                    if sell_result and not sell_result.get("error"):
                        self.stats["total_trades"] += 1
                        self.stats["total_volume_sol"] += sol_amount
                        self._log_transaction("SELL", sol_amount, sell_result, wallet.get("label", ""))
                        logger.info(f"SELL success: {sell_result.get('signature', '')[:20]}...")
                    else:
                        self.stats["errors"] += 1
                        self._log_transaction("ERROR", sol_amount, sell_result or {"error": "No result"}, wallet.get("label", ""))

                self.stats["cycles"] += 1
                self.stats["last_trade_time"] = time.time()

                # Wait between cycles
                cycle_delay = random.uniform(self.config["min_delay"], self.config["max_delay"])
                await asyncio.sleep(cycle_delay)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.stats["errors"] += 1
                self._log_transaction("ERROR", 0, {"error": str(e)}, "system")
                logger.error(f"Bot loop error: {e}")
                await asyncio.sleep(10)

    async def _execute_swap(self, keypair, input_mint, output_mint, amount):
        try:
            async with httpx.AsyncClient() as client:
                # Step 1: Get quote
                quote_resp = await client.get(JUPITER_QUOTE_URL, params={
                    "inputMint": input_mint,
                    "outputMint": output_mint,
                    "amount": str(amount),
                    "slippageBps": str(self.config["slippage_bps"]),
                }, timeout=15.0)

                if quote_resp.status_code != 200:
                    return {"error": f"Quote API error: {quote_resp.status_code}"}

                quote = quote_resp.json()
                if "error" in quote:
                    return {"error": f"Quote error: {quote['error']}"}

                # Step 2: Get swap transaction
                swap_resp = await client.post(JUPITER_SWAP_URL, json={
                    "quoteResponse": quote,
                    "userPublicKey": str(keypair.pubkey()),
                    "dynamicComputeUnitLimit": True,
                    "prioritizationFeeLamports": "auto",
                }, timeout=15.0)

                if swap_resp.status_code != 200:
                    return {"error": f"Swap API error: {swap_resp.status_code}"}

                swap_data = swap_resp.json()
                swap_tx_b64 = swap_data.get("swapTransaction")
                if not swap_tx_b64:
                    return {"error": "No swapTransaction in response"}

                # Step 3: Decode and sign
                tx_bytes = base64.b64decode(swap_tx_b64)
                tx = VersionedTransaction.from_bytes(tx_bytes)
                signed_tx = VersionedTransaction(tx.message, [keypair])

                # Step 4: Submit to Solana RPC
                encoded_tx = base64.b64encode(bytes(signed_tx)).decode("utf-8")
                rpc_resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "sendTransaction",
                    "params": [encoded_tx, {"encoding": "base64", "skipPreflight": False}],
                }, timeout=30.0)

                rpc_data = rpc_resp.json()
                if "error" in rpc_data:
                    return {"error": f"RPC error: {rpc_data['error']}"}

                signature = rpc_data.get("result", "")
                return {
                    "signature": signature,
                    "out_amount": quote.get("outAmount"),
                    "price_impact": quote.get("priceImpactPct"),
                    "in_amount": str(amount),
                }

        except Exception as e:
            return {"error": str(e)}

    def _load_keypair(self, private_key_str):
        try:
            # Try base58 encoded private key (64 bytes)
            key_bytes = base58.b58decode(private_key_str)
            return Keypair.from_bytes(key_bytes)
        except Exception:
            pass
        try:
            # Try JSON array format [1,2,3,...]
            import json
            key_list = json.loads(private_key_str)
            key_bytes = bytes(key_list)
            return Keypair.from_bytes(key_bytes)
        except Exception:
            pass
        return None

    async def _get_wallets(self):
        wallets = await self.db.bot_wallets.find({}, {"_id": 0}).to_list(100)
        return wallets

    def _log_transaction(self, tx_type, sol_amount, result, wallet_label):
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

    async def add_wallet(self, label, private_key):
        keypair = self._load_keypair(private_key)
        if not keypair:
            return {"success": False, "error": "Invalid private key format"}

        public_key = str(keypair.pubkey())

        existing = await self.db.bot_wallets.find_one({"public_key": public_key}, {"_id": 0})
        if existing:
            return {"success": False, "error": "Wallet already exists"}

        doc = {
            "label": label,
            "public_key": public_key,
            "private_key": private_key,
            "added_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.db.bot_wallets.insert_one(doc)
        return {"success": True, "public_key": public_key}

    async def remove_wallet(self, public_key):
        result = await self.db.bot_wallets.delete_one({"public_key": public_key})
        return {"success": result.deleted_count > 0}

    async def get_wallets_info(self):
        wallets = await self.db.bot_wallets.find({}, {"_id": 0, "private_key": 0}).to_list(100)
        # Fetch balances
        async with httpx.AsyncClient() as client:
            for w in wallets:
                try:
                    resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getBalance",
                        "params": [w["public_key"]]
                    }, timeout=10.0)
                    data = resp.json()
                    if "result" in data:
                        w["balance_sol"] = data["result"]["value"] / 1_000_000_000
                    else:
                        w["balance_sol"] = 0
                except Exception:
                    w["balance_sol"] = 0
        return wallets
