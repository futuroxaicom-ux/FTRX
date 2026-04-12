"""Arbitrage Bot - Cross-DEX price comparison and swap"""
import asyncio
import time
import random
import logging
import base58
import httpx
from solders.keypair import Keypair
from bot_utils import (
    SOL_MINT, LAMPORTS_PER_SOL, SOLANA_RPC, jupiter_swap,
    batch_get_sol_balances, batch_get_token_balances, gauss_amount,
    distribute_sol_from_wallet, collect_sol_to_wallet
)

logger = logging.getLogger(__name__)


class ArbitrageBot:
    def __init__(self, db):
        self.db = db
        self.collection_wallets = "arb_bot_wallets"
        self.collection_config = "arb_bot_config"
        self.running = False
        self.task = None
        self.config = {
            "token_mint": "",
            "min_profit_percent": 1.0,
            "max_trade_sol": 0.1,
            "check_interval": 5,
            "slippage_bps": 1000,
            "auto_execute": True,
        }
        self.stats = self._empty_stats()
        self.transaction_log = []
        self._opportunities = []

    def _empty_stats(self):
        return {
            "total_arbs": 0, "successful_arbs": 0,
            "total_profit_sol": 0.0, "total_volume_sol": 0.0,
            "opportunities_found": 0, "errors": 0,
            "started_at": None, "last_arb_time": None,
        }

    async def load_config(self):
        saved = await self.db[self.collection_config].find_one({"_id": "main"}, {"_id": 0})
        if saved:
            for k, v in saved.items():
                if k in self.config:
                    self.config[k] = v

    async def save_config(self):
        await self.db[self.collection_config].update_one(
            {"_id": "main"}, {"$set": self.config}, upsert=True
        )

    def update_config(self, updates: dict):
        for k, v in updates.items():
            if k in self.config:
                self.config[k] = v
        return self.config

    async def start(self):
        if self.running or not self.config.get("token_mint"):
            return False
        await self.load_config()
        self.running = True
        self.stats = self._empty_stats()
        self.stats["started_at"] = time.time()
        self.transaction_log = []
        self.task = asyncio.create_task(self._run_loop())
        return True

    async def stop(self):
        if not self.running:
            return False
        self.running = False
        if self.task:
            self.task.cancel()
        return True

    def _log(self, type_, wallet, amount, detail):
        self.transaction_log.append({
            "time": time.time(), "type": type_,
            "wallet": wallet[:8] if wallet else "", "amount": round(amount, 6), "detail": str(detail),
        })
        if len(self.transaction_log) > 100:
            self.transaction_log = self.transaction_log[-100:]

    async def _run_loop(self):
        while self.running:
            try:
                await self._scan_opportunities()
            except Exception as e:
                logger.error(f"ArbitrageBot error: {e}")
                self.stats["errors"] += 1
                self._log("ERROR", "", 0, str(e))
            await asyncio.sleep(self.config.get("check_interval", 5))

    async def _scan_opportunities(self):
        """Compare prices across different Jupiter routes/DEXs"""
        token = self.config.get("token_mint", "")
        if not token:
            return

        amounts = [int(0.01 * LAMPORTS_PER_SOL), int(0.05 * LAMPORTS_PER_SOL), int(0.1 * LAMPORTS_PER_SOL)]
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for amount in amounts:
                try:
                    # Get buy quote (SOL -> Token)
                    buy_resp = await client.get("https://api.jup.ag/swap/v1/quote", params={
                        "inputMint": SOL_MINT, "outputMint": token,
                        "amount": str(amount), "slippageBps": 100,
                    })
                    buy_quote = buy_resp.json()
                    if "error" in buy_quote:
                        continue
                    tokens_out = int(buy_quote.get("outAmount", 0))
                    if tokens_out <= 0:
                        continue

                    # Get sell quote (Token -> SOL)
                    sell_resp = await client.get("https://api.jup.ag/swap/v1/quote", params={
                        "inputMint": token, "outputMint": SOL_MINT,
                        "amount": str(tokens_out), "slippageBps": 100,
                    })
                    sell_quote = sell_resp.json()
                    if "error" in sell_quote:
                        continue
                    sol_back = int(sell_quote.get("outAmount", 0))

                    profit_lamports = sol_back - amount
                    profit_pct = (profit_lamports / amount) * 100

                    if profit_pct > 0:
                        opp = {
                            "time": time.time(),
                            "amount_sol": amount / LAMPORTS_PER_SOL,
                            "profit_pct": round(profit_pct, 3),
                            "profit_sol": round(profit_lamports / LAMPORTS_PER_SOL, 6),
                            "buy_route": buy_quote.get("routePlan", [{}])[0].get("swapInfo", {}).get("label", ""),
                            "sell_route": sell_quote.get("routePlan", [{}])[0].get("swapInfo", {}).get("label", ""),
                        }
                        self._opportunities.append(opp)
                        if len(self._opportunities) > 50:
                            self._opportunities = self._opportunities[-50:]
                        self.stats["opportunities_found"] += 1
                        self._log("OPPORTUNITY", "", opp["profit_sol"], f"{opp['profit_pct']:.2f}% on {opp['amount_sol']} SOL")

                        # Auto-execute if profitable enough
                        if self.config.get("auto_execute") and profit_pct >= self.config.get("min_profit_percent", 1.0):
                            await self._execute_arb(amount, token)

                except Exception as e:
                    logger.debug(f"Arb scan error: {e}")

    async def _execute_arb(self, amount_lamports, token):
        """Execute arbitrage: BUY token then immediately SELL back"""
        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        subs = [w for w in wallets if not w.get("is_main")]
        if not subs:
            return

        wallet = random.choice(subs)
        pub = wallet["public_key"]
        sol_bals = await batch_get_sol_balances([pub])
        sol_bal = sol_bals.get(pub, 0)
        trade_sol = amount_lamports / LAMPORTS_PER_SOL
        if sol_bal < trade_sol + 0.005:
            return

        kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))

        # BUY
        buy_result = await jupiter_swap(kp, SOL_MINT, token, amount_lamports, self.config["slippage_bps"])
        if not buy_result["success"]:
            self.stats["errors"] += 1
            self._log("ARB_FAIL", pub, 0, f"Buy failed: {buy_result.get('error', '')}")
            return

        tokens_received = buy_result.get("out_amount", 0)
        await asyncio.sleep(1)

        # SELL immediately
        sell_result = await jupiter_swap(kp, token, SOL_MINT, tokens_received, self.config["slippage_bps"])
        if sell_result["success"]:
            sol_back = sell_result.get("out_amount", 0) / LAMPORTS_PER_SOL
            profit = sol_back - trade_sol
            self.stats["total_arbs"] += 1
            self.stats["successful_arbs"] += 1
            self.stats["total_profit_sol"] += profit
            self.stats["total_volume_sol"] += trade_sol + sol_back
            self.stats["last_arb_time"] = time.time()
            self._log("ARB_SUCCESS", pub, profit, f"Profit: {profit:.6f} SOL | {buy_result.get('tx', '')[:12]}")
        else:
            self.stats["errors"] += 1
            self._log("ARB_FAIL", pub, 0, f"Sell failed: {sell_result.get('error', '')}")

    async def get_status_async(self):
        await self.load_config()
        return {
            "running": self.running,
            "config": self.config,
            "stats": self.stats,
            "recent_opportunities": self._opportunities[-10:],
            "recent_transactions": self.transaction_log[-50:],
        }

    async def get_wallets_info(self):
        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0, "private_key": 0}).to_list(200)
        if not wallets:
            return []
        pubs = [w["public_key"] for w in wallets]
        sol_bals = await batch_get_sol_balances(pubs)
        for w in wallets:
            w["balance_sol"] = sol_bals.get(w["public_key"], 0)
            w["balance_token"] = 0
        return wallets

    async def generate_wallets(self, count: int, prefix: str = "Arb"):
        created = []
        for i in range(count):
            kp = Keypair()
            existing = await self.db[self.collection_wallets].count_documents({})
            doc = {
                "label": f"{prefix} #{existing + 1}",
                "public_key": str(kp.pubkey()),
                "private_key": base58.b58encode(bytes(kp)).decode(),
                "is_main": existing == 0,
                "added_at": time.time(),
            }
            await self.db[self.collection_wallets].insert_one(doc)
            created.append({"label": doc["label"], "public_key": doc["public_key"]})
        return {"created": len(created), "wallets": created}

    async def set_main_wallet(self, public_key: str):
        await self.db[self.collection_wallets].update_many({}, {"$set": {"is_main": False}})
        r = await self.db[self.collection_wallets].update_one({"public_key": public_key}, {"$set": {"is_main": True}})
        return {"success": r.modified_count > 0}

    async def remove_wallet(self, public_key: str):
        r = await self.db[self.collection_wallets].delete_one({"public_key": public_key})
        return {"success": r.deleted_count > 0}

    async def distribute_sol(self, sol_per_wallet: float):
        main = await self.db[self.collection_wallets].find_one({"is_main": True}, {"_id": 0})
        if not main:
            return {"error": "No main wallet"}
        subs = await self.db[self.collection_wallets].find({"is_main": {"$ne": True}}, {"_id": 0}).to_list(200)
        kp = Keypair.from_bytes(base58.b58decode(main["private_key"]))
        return await distribute_sol_from_wallet(kp, [w["public_key"] for w in subs], sol_per_wallet)

    async def collect_sol(self):
        main = await self.db[self.collection_wallets].find_one({"is_main": True}, {"_id": 0})
        if not main:
            return {"error": "No main wallet"}
        subs = await self.db[self.collection_wallets].find({"is_main": {"$ne": True}}, {"_id": 0}).to_list(200)
        keypairs = [Keypair.from_bytes(base58.b58decode(w["private_key"])) for w in subs]
        return await collect_sol_to_wallet(keypairs, main["public_key"])
