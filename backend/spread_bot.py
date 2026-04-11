"""Spread Bot (Market Making) - Buys low, sells high, earns on spread"""
import asyncio
import time
import random
import logging
import base58
from solders.keypair import Keypair
from bot_utils import (
    SOL_MINT, LAMPORTS_PER_SOL, get_token_price, jupiter_swap,
    batch_get_sol_balances, batch_get_token_balances, gauss_amount,
    distribute_sol_from_wallet, collect_sol_to_wallet
)

logger = logging.getLogger(__name__)


class SpreadBot:
    def __init__(self, db):
        self.db = db
        self.collection_wallets = "spread_bot_wallets"
        self.collection_config = "spread_bot_config"
        self.running = False
        self.task = None
        self.config = {
            "token_mint": "",
            "spread_percent": 2.0,
            "max_position_sol": 0.5,
            "check_interval": 10,
            "min_sol_per_trade": 0.005,
            "max_sol_per_trade": 0.05,
            "slippage_bps": 1500,
            "take_profit_percent": 5.0,
            "stop_loss_percent": 3.0,
        }
        self.stats = self._empty_stats()
        self.transaction_log = []
        self._entry_prices = {}

    def _empty_stats(self):
        return {
            "total_trades": 0, "total_volume_sol": 0.0,
            "profit_sol": 0.0, "buys": 0, "sells": 0,
            "errors": 0, "started_at": None,
            "last_trade_time": None, "current_position_sol": 0.0,
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
                await self._cycle()
            except Exception as e:
                logger.error(f"SpreadBot cycle error: {e}")
                self.stats["errors"] += 1
                self._log("ERROR", "", 0, str(e))
            interval = self.config.get("check_interval", 10)
            await asyncio.sleep(interval + random.uniform(0, 5))

    async def _cycle(self):
        price_data = await get_token_price(self.config["token_mint"])
        price = price_data.get("price_native", 0)
        if price <= 0:
            return

        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        if not wallets:
            return
        main = next((w for w in wallets if w.get("is_main")), None)
        subs = [w for w in wallets if not w.get("is_main")]
        if not main or not subs:
            return

        spread = self.config["spread_percent"] / 100
        buy_threshold = price * (1 - spread)
        sell_threshold = price * (1 + spread)

        # Randomly pick action: BUY if position < max, SELL if holding tokens
        wallet = random.choice(subs)
        kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
        pub = wallet["public_key"]

        sol_bals = await batch_get_sol_balances([pub])
        sol_bal = sol_bals.get(pub, 0)

        token_bals = await batch_get_token_balances([pub], self.config["token_mint"])
        token_bal = token_bals.get(pub, 0)

        if token_bal > 0 and random.random() < 0.5:
            # SELL
            sell_amount = int(token_bal * random.uniform(0.3, 0.8) * 1e9)
            if sell_amount > 0:
                result = await jupiter_swap(kp, self.config["token_mint"], SOL_MINT, sell_amount, self.config["slippage_bps"])
                if result["success"]:
                    sol_out = result.get("out_amount", 0) / LAMPORTS_PER_SOL
                    self.stats["sells"] += 1
                    self.stats["total_trades"] += 1
                    self.stats["total_volume_sol"] += sol_out
                    self.stats["profit_sol"] += sol_out
                    self.stats["last_trade_time"] = time.time()
                    self._log("SELL", pub, sol_out, result.get("tx", ""))
                else:
                    self.stats["errors"] += 1
                    self._log("ERROR", pub, 0, result.get("error", ""))
        elif sol_bal > self.config["min_sol_per_trade"] + 0.005:
            # BUY
            amount_sol = gauss_amount(self.config["min_sol_per_trade"], min(self.config["max_sol_per_trade"], sol_bal - 0.005))
            amount_lamports = int(amount_sol * LAMPORTS_PER_SOL)
            result = await jupiter_swap(kp, SOL_MINT, self.config["token_mint"], amount_lamports, self.config["slippage_bps"])
            if result["success"]:
                self.stats["buys"] += 1
                self.stats["total_trades"] += 1
                self.stats["total_volume_sol"] += amount_sol
                self.stats["profit_sol"] -= amount_sol
                self.stats["last_trade_time"] = time.time()
                self._log("BUY", pub, amount_sol, result.get("tx", ""))
            else:
                self.stats["errors"] += 1
                self._log("ERROR", pub, 0, result.get("error", ""))

    def get_status(self):
        return {
            "running": self.running,
            "config": self.config,
            "stats": self.stats,
            "recent_transactions": self.transaction_log[-50:],
        }

    async def get_wallets_info(self):
        wallets = await self.db[self.collection_wallets].find(
            {}, {"_id": 0, "private_key": 0}
        ).to_list(200)
        if not wallets:
            return []
        pubs = [w["public_key"] for w in wallets]
        sol_bals = await batch_get_sol_balances(pubs)
        token_bals = await batch_get_token_balances(pubs, self.config.get("token_mint", ""))
        for w in wallets:
            w["balance_sol"] = sol_bals.get(w["public_key"], 0)
            w["balance_token"] = token_bals.get(w["public_key"], 0)
        return wallets

    async def generate_wallets(self, count: int, prefix: str = "Spread"):
        created = []
        for i in range(count):
            kp = Keypair()
            doc = {
                "label": f"{prefix} #{i+1}",
                "public_key": str(kp.pubkey()),
                "private_key": base58.b58encode(bytes(kp)).decode(),
                "is_main": False,
                "added_at": time.time(),
            }
            existing = await self.db[self.collection_wallets].count_documents({})
            doc["label"] = f"{prefix} #{existing + 1}"
            if existing == 0:
                doc["is_main"] = True
            await self.db[self.collection_wallets].insert_one(doc)
            created.append({"label": doc["label"], "public_key": doc["public_key"]})
        return {"created": len(created), "wallets": created}

    async def set_main_wallet(self, public_key: str):
        await self.db[self.collection_wallets].update_many({}, {"$set": {"is_main": False}})
        result = await self.db[self.collection_wallets].update_one(
            {"public_key": public_key}, {"$set": {"is_main": True}}
        )
        return {"success": result.modified_count > 0}

    async def remove_wallet(self, public_key: str):
        result = await self.db[self.collection_wallets].delete_one({"public_key": public_key})
        return {"success": result.deleted_count > 0}

    async def distribute_sol(self, sol_per_wallet: float):
        main = await self.db[self.collection_wallets].find_one({"is_main": True}, {"_id": 0})
        if not main:
            return {"error": "No main wallet"}
        subs = await self.db[self.collection_wallets].find(
            {"is_main": {"$ne": True}}, {"_id": 0}
        ).to_list(200)
        if not subs:
            return {"error": "No sub wallets"}
        kp = Keypair.from_bytes(base58.b58decode(main["private_key"]))
        targets = [w["public_key"] for w in subs]
        return await distribute_sol_from_wallet(kp, targets, sol_per_wallet)

    async def collect_sol(self):
        main = await self.db[self.collection_wallets].find_one({"is_main": True}, {"_id": 0})
        if not main:
            return {"error": "No main wallet"}
        subs = await self.db[self.collection_wallets].find(
            {"is_main": {"$ne": True}}, {"_id": 0}
        ).to_list(200)
        keypairs = [Keypair.from_bytes(base58.b58decode(w["private_key"])) for w in subs]
        return await collect_sol_to_wallet(keypairs, main["public_key"])
