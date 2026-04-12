"""Sniper Bot - Auto-discovers new Raydium/Solana pools and snipes them"""
import asyncio
import time
import random
import logging
import base58
import httpx
from solders.keypair import Keypair
from bot_utils import (
    SOL_MINT, LAMPORTS_PER_SOL, SOLANA_RPC, jupiter_swap,
    batch_get_sol_balances, batch_get_token_balances, get_token_price,
    distribute_sol_from_wallet, collect_sol_to_wallet
)

logger = logging.getLogger(__name__)


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
            "take_profit_percent": 10.0,
            "stop_loss_percent": 20.0,
            "check_interval": 10,
            "slippage_bps": 2000,
            "min_liquidity_usd": 100,
            "max_liquidity_usd": 500000,
            "min_pool_age_seconds": 0,
            "max_pool_age_seconds": 0,  # 0 = no age filter
            "auto_discover": True,
            "max_concurrent_positions": 3,
        }
        self.stats = self._empty_stats()
        self.transaction_log = []
        self._positions = {}
        self._known_pairs = set()
        self._blacklisted_tokens = set()

    def _empty_stats(self):
        return {
            "total_snipes": 0, "successful_snipes": 0,
            "total_sol_spent": 0.0, "total_sol_recovered": 0.0,
            "profit_sol": 0.0, "errors": 0,
            "pools_scanned": 0, "new_pools_found": 0,
            "take_profits": 0, "stop_losses": 0,
            "started_at": None, "last_snipe_time": None,
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
        self._positions = {}
        self._known_pairs = set()
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
            "wallet": wallet[:8] if wallet else "", "amount": round(amount, 6), "detail": str(detail)[:120],
        })
        if len(self.transaction_log) > 100:
            self.transaction_log = self.transaction_log[-100:]

    async def _run_loop(self):
        self._log("INFO", "", 0, "Sniper Bot started - scanning for new pools...")
        while self.running:
            try:
                # Phase 1: Discover new tokens
                if self.config.get("auto_discover", True):
                    await self._discover_new_pools()

                # Phase 2: Snipe specific token if set
                if self.config.get("token_mint") and self.config["token_mint"] not in self._positions:
                    await self._snipe_token(self.config["token_mint"])

                # Phase 3: Monitor open positions
                await self._monitor_positions()

            except Exception as e:
                logger.error(f"SniperBot error: {e}")
                self.stats["errors"] += 1
                self._log("ERROR", "", 0, str(e)[:100])
            await asyncio.sleep(self.config.get("check_interval", 10))

    async def _discover_new_pools(self):
        """Scan DexScreener for new Solana pools"""
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                # Try multiple discovery methods
                pairs = []

                # Method 1: Latest boosted tokens (often new)
                try:
                    resp = await client.get("https://api.dexscreener.com/token-boosts/latest/v1")
                    if resp.status_code == 200:
                        boosts = resp.json()
                        if isinstance(boosts, list):
                            for b in boosts:
                                if b.get("chainId") == "solana":
                                    token_addr = b.get("tokenAddress", "")
                                    if token_addr and token_addr not in self._known_pairs:
                                        # Fetch pair data for this token
                                        try:
                                            tr = await client.get(f"https://api.dexscreener.com/latest/dex/tokens/{token_addr}")
                                            td = tr.json()
                                            for p in td.get("pairs", [])[:1]:
                                                pairs.append(p)
                                        except Exception:
                                            pass
                except Exception:
                    pass

                # Method 2: Search for new SOL pairs
                try:
                    resp2 = await client.get("https://api.dexscreener.com/latest/dex/search", params={"q": "SOL"})
                    if resp2.status_code == 200:
                        data2 = resp2.json()
                        pairs.extend(data2.get("pairs", []))
                except Exception:
                    pass

                self.stats["pools_scanned"] += len(pairs)

                found_new = 0
                for pair in pairs:
                    pair_addr = pair.get("pairAddress", "")
                    if not pair_addr or pair_addr in self._known_pairs:
                        continue
                    self._known_pairs.add(pair_addr)

                    chain = pair.get("chainId", "")
                    if chain != "solana":
                        continue

                    base_token = pair.get("baseToken", {})
                    token_addr = base_token.get("address", "")
                    token_symbol = base_token.get("symbol", "???")
                    token_name = base_token.get("name", "???")

                    if not token_addr or token_addr == SOL_MINT:
                        continue
                    if token_addr in self._blacklisted_tokens or token_addr in self._positions:
                        continue

                    liq_usd = float(pair.get("liquidity", {}).get("usd", 0) or 0)
                    min_liq = self.config.get("min_liquidity_usd", 500)
                    max_liq = self.config.get("max_liquidity_usd", 50000)
                    if liq_usd < min_liq or liq_usd > max_liq:
                        continue

                    pair_created = pair.get("pairCreatedAt", 0)
                    age_seconds = 0
                    if pair_created:
                        age_seconds = (time.time() * 1000 - pair_created) / 1000
                        max_age = self.config.get("max_pool_age_seconds", 86400)
                        if max_age > 0 and age_seconds > max_age:
                            continue

                    found_new += 1
                    self.stats["new_pools_found"] += 1
                    self._log("NEW_POOL", "", liq_usd, f"{token_symbol} Liq:${liq_usd:.0f} Age:{age_seconds/60:.0f}m")
                    logger.info(f"SNIPER: New pool found: {token_symbol} ({token_addr[:16]}) Liq:${liq_usd:.0f}")

                    if len(self._positions) < self.config.get("max_concurrent_positions", 3):
                        await self._snipe_token(token_addr)

                if found_new == 0 and len(self.transaction_log) < 3:
                    self._log("SCAN", "", 0, f"Scanned {len(pairs)} pairs - no new matches yet. Waiting...")

        except Exception as e:
            logger.error(f"Pool discovery error: {e}")
            self._log("ERROR", "", 0, f"Discovery: {str(e)[:80]}")

    async def _snipe_token(self, token_mint):
        """Execute snipe buy on a token"""
        if token_mint in self._positions:
            return
        if len(self._positions) >= self.config.get("max_concurrent_positions", 3):
            return

        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        if not wallets:
            self._log("ERROR", "", 0, "No wallets! Generate wallets first.")
            return

        # Use ANY funded wallet (including main)
        wallet = None
        pubs = [w["public_key"] for w in wallets]
        bals = await batch_get_sol_balances(pubs)
        for w in wallets:
            if bals.get(w["public_key"], 0) >= self.config["max_buy_sol"] + 0.005:
                wallet = w
                break
        if not wallet:
            self._log("SKIP", "", 0, f"No wallet with {self.config['max_buy_sol']+0.005:.3f} SOL for {token_mint[:12]}")
            return

        pub = wallet["public_key"]
        buy_amount = self.config["max_buy_sol"]
        kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
        amount_lamports = int(buy_amount * LAMPORTS_PER_SOL)

        self._log("SNIPE_TRY", pub, buy_amount, f"Trying to snipe {token_mint[:20]}...")
        result = await jupiter_swap(kp, SOL_MINT, token_mint, amount_lamports, self.config["slippage_bps"])

        if result["success"]:
            price_data = await get_token_price(token_mint)
            self._positions[token_mint] = {
                "wallet": pub, "entry_price": price_data.get("price_usd", 0),
                "entry_price_native": price_data.get("price_native", 0),
                "sol_spent": buy_amount, "time": time.time(),
                "token_mint": token_mint,
            }
            self.stats["total_snipes"] += 1
            self.stats["successful_snipes"] += 1
            self.stats["total_sol_spent"] += buy_amount
            self.stats["last_snipe_time"] = time.time()
            self._log("SNIPE_BUY", pub, buy_amount, f"SNIPED {token_mint} tx:{result.get('tx','')[:16]}")
        else:
            self.stats["errors"] += 1
            self._blacklisted_tokens.add(token_mint)
            self._log("SNIPE_FAIL", pub, 0, f"{token_mint[:16]}... {result.get('error','')[:60]}")

    async def _monitor_positions(self):
        for token_mint, pos in list(self._positions.items()):
            try:
                price_data = await get_token_price(token_mint)
                current_price = price_data.get("price_usd", 0)
                entry_price = pos.get("entry_price", 0)

                if entry_price > 0 and current_price > 0:
                    change_pct = ((current_price - entry_price) / entry_price) * 100
                else:
                    current_native = price_data.get("price_native", 0)
                    entry_native = pos.get("entry_price_native", 0)
                    if entry_native > 0 and current_native > 0:
                        change_pct = ((current_native - entry_native) / entry_native) * 100
                    else:
                        continue

                if change_pct >= self.config["take_profit_percent"]:
                    await self._sell_position(token_mint, pos, f"TAKE_PROFIT +{change_pct:.1f}%")
                    self.stats["take_profits"] += 1
                elif change_pct <= -self.config["stop_loss_percent"]:
                    await self._sell_position(token_mint, pos, f"STOP_LOSS {change_pct:.1f}%")
                    self.stats["stop_losses"] += 1

            except Exception as e:
                logger.debug(f"Position monitor error: {e}")

    async def _sell_position(self, token_mint, pos, reason):
        wallet_pub = pos["wallet"]
        wallet = await self.db[self.collection_wallets].find_one({"public_key": wallet_pub}, {"_id": 0})
        if not wallet:
            del self._positions[token_mint]
            return

        token_bals = await batch_get_token_balances([wallet_pub], token_mint)
        token_bal = token_bals.get(wallet_pub, 0)
        if token_bal <= 0:
            del self._positions[token_mint]
            return

        kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
        sell_amount = int(token_bal * 0.95 * 1e9)
        result = await jupiter_swap(kp, token_mint, SOL_MINT, sell_amount, self.config["slippage_bps"])

        if result["success"]:
            sol_out = result.get("out_amount", 0) / LAMPORTS_PER_SOL
            self.stats["total_sol_recovered"] += sol_out
            self.stats["profit_sol"] = self.stats["total_sol_recovered"] - self.stats["total_sol_spent"]
            self._log(reason.split()[0], wallet_pub, sol_out, f"{reason} | tx:{result.get('tx','')[:12]}")
            del self._positions[token_mint]
        else:
            self.stats["errors"] += 1
            self._log("SELL_FAIL", wallet_pub, 0, result.get("error", "")[:60])

    def get_status(self):
        positions_info = []
        for token, pos in self._positions.items():
            positions_info.append({
                "token_mint": token,
                "wallet": pos["wallet"],
                "sol_spent": pos["sol_spent"],
                "entry_price": pos.get("entry_price", 0),
                "age_minutes": round((time.time() - pos.get("time", 0)) / 60, 1),
            })
        return {
            "running": self.running,
            "config": self.config,
            "stats": self.stats,
            "open_positions": positions_info,
            "positions_count": len(self._positions),
            "known_pairs": len(self._known_pairs),
            "recent_transactions": self.transaction_log[-50:],
        }

    async def manual_sell(self, token_mint: str, wallet_pubkey: str = ""):
        """Manually sell a token from sniper wallets"""
        try:
            from solders.pubkey import Pubkey
            Pubkey.from_string(token_mint)  # Validate mint address
        except Exception:
            return {"error": "Invalid token mint address"}

        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        if not wallets:
            return {"error": "No wallets"}

        target_wallets = [w for w in wallets if not wallet_pubkey or w["public_key"] == wallet_pubkey]
        if not target_wallets:
            target_wallets = wallets

        for wallet in target_wallets:
            pub = wallet["public_key"]
            # Get actual token balance from chain
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post("https://solana.publicnode.com", json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getTokenAccountsByOwner",
                        "params": [pub, {"mint": token_mint}, {"encoding": "jsonParsed"}],
                    })
                    data = resp.json()
                    accounts = data.get("result", {}).get("value", [])
                    if not accounts:
                        continue
                    info = accounts[0]["account"]["data"]["parsed"]["info"]
                    raw_amount = int(info["tokenAmount"]["amount"])
                    if raw_amount <= 0:
                        continue
                    # Sell 95% of holdings (raw amount, proper decimals)
                    sell_amount = int(raw_amount * 0.95)
            except Exception:
                continue

            kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
            await self.load_config()
            result = await jupiter_swap(kp, token_mint, SOL_MINT, sell_amount, self.config.get("slippage_bps", 2000))

            if result["success"]:
                sol_out = result.get("out_amount", 0) / LAMPORTS_PER_SOL
                self.stats["total_sol_recovered"] += sol_out
                self._log("MANUAL_SELL", pub, sol_out, f"Sold {token_mint[:20]}... tx:{result.get('tx','')[:16]}")
                if token_mint in self._positions:
                    del self._positions[token_mint]
                return {"success": True, "sol_received": sol_out, "tx": result.get("tx", "")}
            else:
                return {"success": False, "error": result.get("error", "")}

        return {"error": "No wallet holds this token"}

    async def get_holdings(self):
        """Scan ALL sniper wallets for ANY token holdings (from chain, not memory)"""
        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        if not wallets:
            return []
        holdings = []
        rpcs = ["https://api.mainnet-beta.solana.com", "https://solana.publicnode.com"]
        async with httpx.AsyncClient(timeout=12.0) as client:
            for w in wallets:
                for rpc in rpcs:
                    try:
                        resp = await client.post(rpc, json={
                            "jsonrpc": "2.0", "id": 1,
                            "method": "getTokenAccountsByOwner",
                            "params": [w["public_key"], {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}, {"encoding": "jsonParsed"}],
                        })
                        if resp.status_code == 429:
                            await asyncio.sleep(2)
                            continue
                        data = resp.json()
                        accounts = data.get("result", {}).get("value", [])
                        for acc in accounts:
                            info = acc["account"]["data"]["parsed"]["info"]
                            mint = info["mint"]
                            ui_amount = float(info["tokenAmount"].get("uiAmount", 0) or 0)
                            if ui_amount > 0 and mint != SOL_MINT:
                                price_data = {}
                                try:
                                    price_data = await get_token_price(mint)
                                except Exception:
                                    pass
                                holdings.append({
                                    "token_mint": mint,
                                    "wallet": w["public_key"],
                                    "wallet_label": w.get("label", ""),
                                    "balance": ui_amount,
                                    "value_usd": ui_amount * price_data.get("price_usd", 0),
                                    "price_usd": price_data.get("price_usd", 0),
                                    "liquidity_usd": price_data.get("liquidity_usd", 0),
                                })
                        break  # Success on this RPC
                    except Exception:
                        continue
                await asyncio.sleep(0.5)
        return holdings

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
