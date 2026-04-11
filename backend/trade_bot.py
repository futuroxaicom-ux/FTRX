"""Trade Bot - Auto-trading with price monitoring and strategies"""
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


class TradeBot:
    def __init__(self, db):
        self.db = db
        self.collection_wallets = "trade_bot_wallets"
        self.collection_config = "trade_bot_config"
        self.running = False
        self.task = None
        self.config = {
            "token_mint": "",
            "strategy": "momentum",  # momentum, mean_reversion, dca
            "check_interval": 15,
            "buy_threshold_percent": -3.0,  # Buy when price drops X%
            "sell_threshold_percent": 5.0,   # Sell when price rises X%
            "stop_loss_percent": 10.0,
            "take_profit_percent": 20.0,
            "min_sol_per_trade": 0.005,
            "max_sol_per_trade": 0.05,
            "slippage_bps": 1500,
            "max_open_positions": 5,
            "dca_interval_minutes": 60,
        }
        self.stats = self._empty_stats()
        self.transaction_log = []
        self._price_history = []
        self._positions = {}
        self._last_dca_time = 0

    def _empty_stats(self):
        return {
            "total_trades": 0, "buys": 0, "sells": 0,
            "total_volume_sol": 0.0, "profit_sol": 0.0,
            "sol_invested": 0.0, "sol_recovered": 0.0,
            "win_trades": 0, "loss_trades": 0,
            "errors": 0, "started_at": None, "last_trade_time": None,
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
        self._price_history = []
        self._positions = {}
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
                logger.error(f"TradeBot error: {e}")
                self.stats["errors"] += 1
                self._log("ERROR", "", 0, str(e))
            await asyncio.sleep(self.config.get("check_interval", 15))

    async def _cycle(self):
        price_data = await get_token_price(self.config["token_mint"])
        price = price_data.get("price_native", 0)
        if price <= 0:
            return

        self._price_history.append({"time": time.time(), "price": price})
        if len(self._price_history) > 200:
            self._price_history = self._price_history[-200:]

        strategy = self.config.get("strategy", "momentum")
        if strategy == "momentum":
            await self._strategy_momentum(price)
        elif strategy == "mean_reversion":
            await self._strategy_mean_reversion(price)
        elif strategy == "dca":
            await self._strategy_dca(price)

        # Check stop-loss / take-profit for open positions
        await self._check_exits(price)

    async def _strategy_momentum(self, current_price):
        """Buy on dips, sell on rises"""
        if len(self._price_history) < 3:
            return
        prev = self._price_history[-3]["price"]
        change_pct = ((current_price - prev) / prev) * 100

        if change_pct <= self.config["buy_threshold_percent"]:
            await self._execute_buy(current_price, f"Momentum dip: {change_pct:.1f}%")
        elif change_pct >= self.config["sell_threshold_percent"]:
            await self._execute_sell(current_price, f"Momentum rise: {change_pct:.1f}%")

    async def _strategy_mean_reversion(self, current_price):
        """Buy below average, sell above average"""
        if len(self._price_history) < 20:
            return
        avg = sum(p["price"] for p in self._price_history[-20:]) / 20
        deviation = ((current_price - avg) / avg) * 100

        if deviation <= self.config["buy_threshold_percent"]:
            await self._execute_buy(current_price, f"Below avg: {deviation:.1f}%")
        elif deviation >= self.config["sell_threshold_percent"]:
            await self._execute_sell(current_price, f"Above avg: {deviation:.1f}%")

    async def _strategy_dca(self, current_price):
        """Dollar-cost averaging - buy at regular intervals"""
        interval = self.config.get("dca_interval_minutes", 60) * 60
        if time.time() - self._last_dca_time >= interval:
            await self._execute_buy(current_price, "DCA interval buy")
            self._last_dca_time = time.time()

    async def _execute_buy(self, price, reason):
        if len(self._positions) >= self.config.get("max_open_positions", 5):
            return
        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        subs = [w for w in wallets if not w.get("is_main")]
        if not subs:
            return
        wallet = random.choice(subs)
        pub = wallet["public_key"]
        sol_bals = await batch_get_sol_balances([pub])
        sol_bal = sol_bals.get(pub, 0)
        buy_amount = gauss_amount(self.config["min_sol_per_trade"], min(self.config["max_sol_per_trade"], sol_bal - 0.005))
        if buy_amount < 0.001:
            return

        kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
        result = await jupiter_swap(kp, SOL_MINT, self.config["token_mint"], int(buy_amount * LAMPORTS_PER_SOL), self.config["slippage_bps"])
        if result["success"]:
            self._positions[pub] = {"entry_price": price, "sol_spent": buy_amount, "time": time.time()}
            self.stats["buys"] += 1
            self.stats["total_trades"] += 1
            self.stats["total_volume_sol"] += buy_amount
            self.stats["sol_invested"] += buy_amount
            self.stats["last_trade_time"] = time.time()
            self._log("BUY", pub, buy_amount, f"{reason} | tx: {result.get('tx', '')[:16]}")
        else:
            self.stats["errors"] += 1
            self._log("ERROR", pub, 0, result.get("error", ""))

    async def _execute_sell(self, price, reason):
        if not self._positions:
            return
        pub = list(self._positions.keys())[0]
        wallet = await self.db[self.collection_wallets].find_one({"public_key": pub}, {"_id": 0})
        if not wallet:
            del self._positions[pub]
            return
        token_bals = await batch_get_token_balances([pub], self.config["token_mint"])
        token_bal = token_bals.get(pub, 0)
        if token_bal <= 0:
            del self._positions[pub]
            return

        kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
        sell_amount = int(token_bal * 0.9 * 1e9)
        result = await jupiter_swap(kp, self.config["token_mint"], SOL_MINT, sell_amount, self.config["slippage_bps"])
        if result["success"]:
            sol_out = result.get("out_amount", 0) / LAMPORTS_PER_SOL
            pos = self._positions.pop(pub, {})
            sol_spent = pos.get("sol_spent", 0)
            if sol_out > sol_spent:
                self.stats["win_trades"] += 1
            else:
                self.stats["loss_trades"] += 1
            self.stats["sells"] += 1
            self.stats["total_trades"] += 1
            self.stats["total_volume_sol"] += sol_out
            self.stats["sol_recovered"] += sol_out
            self.stats["profit_sol"] = self.stats["sol_recovered"] - self.stats["sol_invested"]
            self.stats["last_trade_time"] = time.time()
            self._log("SELL", pub, sol_out, f"{reason} | tx: {result.get('tx', '')[:16]}")
        else:
            self.stats["errors"] += 1
            self._log("ERROR", pub, 0, result.get("error", ""))

    async def _check_exits(self, current_price):
        for pub, pos in list(self._positions.items()):
            entry = pos.get("entry_price", 0)
            if entry <= 0:
                continue
            change = ((current_price - entry) / entry) * 100
            if change >= self.config["take_profit_percent"]:
                await self._execute_sell(current_price, f"Take profit: {change:.1f}%")
            elif change <= -self.config["stop_loss_percent"]:
                await self._execute_sell(current_price, f"Stop loss: {change:.1f}%")

    def get_status(self):
        return {
            "running": self.running,
            "config": self.config,
            "stats": self.stats,
            "open_positions": len(self._positions),
            "price_history_count": len(self._price_history),
            "recent_transactions": self.transaction_log[-50:],
        }

    async def get_wallets_info(self):
        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0, "private_key": 0}).to_list(200)
        if not wallets:
            return []
        pubs = [w["public_key"] for w in wallets]
        sol_bals = await batch_get_sol_balances(pubs)
        token_bals = await batch_get_token_balances(pubs, self.config.get("token_mint", ""))
        for w in wallets:
            w["balance_sol"] = sol_bals.get(w["public_key"], 0)
            w["balance_token"] = token_bals.get(w["public_key"], 0)
        return wallets

    async def generate_wallets(self, count: int, prefix: str = "Trade"):
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
