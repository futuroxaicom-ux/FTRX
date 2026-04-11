"""Sniper Bot - Monitors new Raydium pools and buys tokens early"""
import asyncio
import time
import random
import logging
import base58
import httpx
from solders.keypair import Keypair
from bot_utils import (
    SOL_MINT, LAMPORTS_PER_SOL, SOLANA_RPC, jupiter_swap,
    batch_get_sol_balances, batch_get_token_balances,
    distribute_sol_from_wallet, collect_sol_to_wallet
)

logger = logging.getLogger(__name__)

RAYDIUM_PAIRS_API = "https://api.raydium.io/v2/main/pairs"


class SniperBot:
    def __init__(self, db):
        self.db = db
        self.collection_wallets = "sniper_bot_wallets"
        self.collection_config = "sniper_bot_config"
        self.running = False
        self.task = None
        self.config = {
            "token_mint": "",
            "max_buy_sol": 0.1,
            "auto_sell": True,
            "take_profit_percent": 50.0,
            "stop_loss_percent": 20.0,
            "check_interval": 5,
            "slippage_bps": 2000,
            "monitor_new_pools": True,
            "min_liquidity_usd": 1000,
        }
        self.stats = self._empty_stats()
        self.transaction_log = []
        self._sniped_tokens = {}
        self._known_pools = set()

    def _empty_stats(self):
        return {
            "total_snipes": 0, "successful_snipes": 0,
            "total_sol_spent": 0.0, "total_sol_recovered": 0.0,
            "profit_sol": 0.0, "errors": 0,
            "pools_monitored": 0, "started_at": None,
            "last_snipe_time": None,
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
        if self.running:
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
                if self.config.get("monitor_new_pools"):
                    await self._monitor_pools()
                if self.config.get("token_mint"):
                    await self._check_positions()
            except Exception as e:
                logger.error(f"SniperBot error: {e}")
                self.stats["errors"] += 1
                self._log("ERROR", "", 0, str(e))
            await asyncio.sleep(self.config.get("check_interval", 5))

    async def _monitor_pools(self):
        """Monitor for new Raydium pools"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"https://api.dexscreener.com/latest/dex/search?q=raydium")
                data = resp.json()
                pairs = data.get("pairs", [])
                new_count = 0
                for pair in pairs[:20]:
                    pair_addr = pair.get("pairAddress", "")
                    if pair_addr and pair_addr not in self._known_pools:
                        self._known_pools.add(pair_addr)
                        new_count += 1
                        liq = float(pair.get("liquidity", {}).get("usd", 0) or 0)
                        if liq >= self.config.get("min_liquidity_usd", 1000):
                            token = pair.get("baseToken", {}).get("address", "")
                            if token and token != SOL_MINT:
                                self._log("NEW_POOL", "", liq, f"Token: {token[:16]}... Liq: ${liq:.0f}")
                self.stats["pools_monitored"] = len(self._known_pools)
        except Exception as e:
            logger.debug(f"Pool monitor error: {e}")

    async def _check_positions(self):
        """Check existing positions for take-profit/stop-loss"""
        if not self._sniped_tokens:
            # Try to snipe target token
            await self._execute_snipe()
            return

        for token, info in list(self._sniped_tokens.items()):
            from bot_utils import get_token_price
            price_data = await get_token_price(token)
            current_price = price_data.get("price_native", 0)
            if current_price <= 0:
                continue
            entry_price = info.get("entry_price", 0)
            if entry_price <= 0:
                continue
            change_pct = ((current_price - entry_price) / entry_price) * 100

            if change_pct >= self.config["take_profit_percent"]:
                await self._sell_position(token, info, "TAKE_PROFIT")
            elif change_pct <= -self.config["stop_loss_percent"]:
                await self._sell_position(token, info, "STOP_LOSS")

    async def _execute_snipe(self):
        """Execute a snipe buy on the target token"""
        token_mint = self.config.get("token_mint", "")
        if not token_mint:
            return

        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        subs = [w for w in wallets if not w.get("is_main")]
        if not subs:
            return

        wallet = random.choice(subs)
        pub = wallet["public_key"]
        sol_bals = await batch_get_sol_balances([pub])
        sol_bal = sol_bals.get(pub, 0)

        buy_amount = min(self.config["max_buy_sol"], sol_bal - 0.005)
        if buy_amount < 0.001:
            return

        kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
        amount_lamports = int(buy_amount * LAMPORTS_PER_SOL)
        result = await jupiter_swap(kp, SOL_MINT, token_mint, amount_lamports, self.config["slippage_bps"])

        if result["success"]:
            from bot_utils import get_token_price
            price_data = await get_token_price(token_mint)
            self._sniped_tokens[token_mint] = {
                "wallet": pub, "entry_price": price_data.get("price_native", 0),
                "sol_spent": buy_amount, "time": time.time(),
            }
            self.stats["total_snipes"] += 1
            self.stats["successful_snipes"] += 1
            self.stats["total_sol_spent"] += buy_amount
            self.stats["last_snipe_time"] = time.time()
            self._log("SNIPE_BUY", pub, buy_amount, result.get("tx", ""))
        else:
            self.stats["errors"] += 1
            self._log("ERROR", pub, 0, result.get("error", ""))

    async def _sell_position(self, token, info, reason):
        """Sell a sniped position"""
        wallet_pub = info["wallet"]
        wallet = await self.db[self.collection_wallets].find_one({"public_key": wallet_pub}, {"_id": 0})
        if not wallet:
            return

        token_bals = await batch_get_token_balances([wallet_pub], token)
        token_bal = token_bals.get(wallet_pub, 0)
        if token_bal <= 0:
            del self._sniped_tokens[token]
            return

        kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
        sell_amount = int(token_bal * 0.95 * 1e9)
        result = await jupiter_swap(kp, token, SOL_MINT, sell_amount, self.config["slippage_bps"])

        if result["success"]:
            sol_out = result.get("out_amount", 0) / LAMPORTS_PER_SOL
            self.stats["total_sol_recovered"] += sol_out
            self.stats["profit_sol"] = self.stats["total_sol_recovered"] - self.stats["total_sol_spent"]
            self._log(reason, wallet_pub, sol_out, result.get("tx", ""))
            del self._sniped_tokens[token]
        else:
            self.stats["errors"] += 1
            self._log("ERROR", wallet_pub, 0, result.get("error", ""))

    def get_status(self):
        return {
            "running": self.running,
            "config": self.config,
            "stats": self.stats,
            "sniped_positions": len(self._sniped_tokens),
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

    async def generate_wallets(self, count: int, prefix: str = "Sniper"):
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
