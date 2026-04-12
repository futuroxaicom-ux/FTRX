"""Copy Trade Bot - Monitors whale wallets and copies their trades"""
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


class CopyTradeBot:
    def __init__(self, db):
        self.db = db
        self.collection_wallets = "copy_bot_wallets"
        self.collection_config = "copy_bot_config"
        self.running = False
        self.task = None
        self.config = {
            "token_mint": "",
            "target_wallet": "",
            "max_sol_per_trade": 0.05,
            "copy_ratio": 0.1,  # Copy 10% of whale's trade
            "check_interval": 10,
            "slippage_bps": 1500,
            "copy_buys": True,
            "copy_sells": True,
            "min_whale_trade_sol": 0.1,
        }
        self.stats = self._empty_stats()
        self.transaction_log = []
        self._last_whale_sig = None
        self._whale_token_balance = 0

    def _empty_stats(self):
        return {
            "total_copies": 0, "buys_copied": 0, "sells_copied": 0,
            "total_volume_sol": 0.0, "profit_sol": 0.0,
            "sol_spent": 0.0, "sol_recovered": 0.0,
            "whale_trades_detected": 0, "errors": 0,
            "started_at": None, "last_copy_time": None,
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
        if self.running or not self.config.get("target_wallet"):
            return False
        await self.load_config()
        self.running = True
        self.stats = self._empty_stats()
        self.stats["started_at"] = time.time()
        self.transaction_log = []
        self._last_whale_sig = None
        # Get initial whale token balance
        await self._update_whale_balance()
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

    async def _update_whale_balance(self):
        """Track whale's token balance to detect buys/sells"""
        target = self.config.get("target_wallet", "")
        token = self.config.get("token_mint", "")
        if not target or not token:
            return
        bals = await batch_get_token_balances([target], token)
        self._whale_token_balance = bals.get(target, 0)

    async def _run_loop(self):
        while self.running:
            try:
                await self._monitor_whale()
            except Exception as e:
                logger.error(f"CopyTradeBot error: {e}")
                self.stats["errors"] += 1
                self._log("ERROR", "", 0, str(e))
            await asyncio.sleep(self.config.get("check_interval", 10))

    async def _monitor_whale(self):
        """Monitor whale wallet for new transactions"""
        target = self.config.get("target_wallet", "")
        token = self.config.get("token_mint", "")
        if not target:
            return

        # Check whale's recent transactions
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1,
                    "method": "getSignaturesForAddress",
                    "params": [target, {"limit": 5}],
                })
                data = resp.json()
                sigs = data.get("result", [])
                if not sigs:
                    return

                latest_sig = sigs[0].get("signature", "")
                if latest_sig == self._last_whale_sig:
                    return  # No new transactions

                self._last_whale_sig = latest_sig

                # Detect if whale bought or sold by checking token balance change
                old_balance = self._whale_token_balance
                await self._update_whale_balance()
                new_balance = self._whale_token_balance

                diff = new_balance - old_balance
                if abs(diff) < 1:
                    return  # Negligible change

                self.stats["whale_trades_detected"] += 1

                if diff > 0 and self.config.get("copy_buys"):
                    # Whale BOUGHT tokens → copy buy
                    self._log("WHALE_BUY", target[:16], diff, f"Whale bought {diff:.2f} tokens")
                    await self._copy_buy()
                elif diff < 0 and self.config.get("copy_sells"):
                    # Whale SOLD tokens → copy sell
                    self._log("WHALE_SELL", target[:16], abs(diff), f"Whale sold {abs(diff):.2f} tokens")
                    await self._copy_sell()

            except Exception as e:
                logger.debug(f"Whale monitor error: {e}")

    async def _copy_buy(self):
        """Copy whale's buy"""
        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        subs = [w for w in wallets if not w.get("is_main")]
        if not subs:
            return

        wallet = random.choice(subs)
        pub = wallet["public_key"]
        sol_bals = await batch_get_sol_balances([pub])
        sol_bal = sol_bals.get(pub, 0)
        buy_amount = min(self.config["max_sol_per_trade"], sol_bal - 0.005)
        if buy_amount < 0.001:
            return

        kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
        result = await jupiter_swap(kp, SOL_MINT, self.config["token_mint"], int(buy_amount * LAMPORTS_PER_SOL), self.config["slippage_bps"])
        if result["success"]:
            self.stats["total_copies"] += 1
            self.stats["buys_copied"] += 1
            self.stats["total_volume_sol"] += buy_amount
            self.stats["sol_spent"] += buy_amount
            self.stats["last_copy_time"] = time.time()
            self._log("COPY_BUY", pub, buy_amount, result.get("tx", ""))
        else:
            self.stats["errors"] += 1
            self._log("ERROR", pub, 0, result.get("error", ""))

    async def _copy_sell(self):
        """Copy whale's sell"""
        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        subs = [w for w in wallets if not w.get("is_main")]
        if not subs:
            return

        for wallet in subs:
            pub = wallet["public_key"]
            token_bals = await batch_get_token_balances([pub], self.config["token_mint"])
            token_bal = token_bals.get(pub, 0)
            if token_bal <= 0:
                continue

            kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
            sell_amount = int(token_bal * 0.9 * 1e9)
            result = await jupiter_swap(kp, self.config["token_mint"], SOL_MINT, sell_amount, self.config["slippage_bps"])
            if result["success"]:
                sol_out = result.get("out_amount", 0) / LAMPORTS_PER_SOL
                self.stats["total_copies"] += 1
                self.stats["sells_copied"] += 1
                self.stats["total_volume_sol"] += sol_out
                self.stats["sol_recovered"] += sol_out
                self.stats["profit_sol"] = self.stats["sol_recovered"] - self.stats["sol_spent"]
                self.stats["last_copy_time"] = time.time()
                self._log("COPY_SELL", pub, sol_out, result.get("tx", ""))
            else:
                self.stats["errors"] += 1
                self._log("ERROR", pub, 0, result.get("error", ""))
            break  # Only sell from one wallet per signal

    async def get_status_async(self):
        await self.load_config()
        return {
            "running": self.running,
            "config": self.config,
            "stats": self.stats,
            "whale_token_balance": self._whale_token_balance,
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

    async def generate_wallets(self, count: int, prefix: str = "Copy"):
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
