"""Sniper Bot v4 - Helius WebSocket + DexScreener for real-time pool detection
Monitors Raydium Launchlab + pump.fun/pumpswap via Helius WebSocket.
Falls back to DexScreener if Helius unavailable."""
import asyncio
import os
import time
import logging
import base58
import json
import httpx
import websockets
from solders.keypair import Keypair
from bot_utils import (
    SOL_MINT, LAMPORTS_PER_SOL, SOLANA_RPC, HELIUS_KEY, HELIUS_RPC,
    jupiter_swap, batch_get_sol_balances, batch_get_token_balances,
    get_token_price, distribute_sol_from_wallet, collect_sol_to_wallet
)

logger = logging.getLogger(__name__)

# Solana program IDs for pool creation
RAYDIUM_LAUNCHLAB = "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj"
RAYDIUM_AMM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
RAYDIUM_CPMM = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"
PUMPFUN_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"


class SniperBot:
    def __init__(self, db):
        self.db = db
        self.collection_wallets = "sniper_bot_wallets"
        self.collection_config = "sniper_bot_config"
        self.collection_history = "sniper_bot_history"
        self.running = False
        self.task = None
        self.ws_task = None
        self.config = {
            "token_mint": "",
            "max_buy_sol": 0.08,
            "take_profit_percent": 20.0,
            "stop_loss_percent": 15.0,
            "check_interval": 8,
            "slippage_bps": 1500,
            "sell_slippage_bps": 800,
            "min_liquidity_usd": 5000,
            "max_liquidity_usd": 500000,
            "max_pool_age_seconds": 3600,
            "auto_discover": True,
            "max_concurrent_positions": 4,
            "min_price_change_5m": 3.0,
            "min_volume_1h_usd": 3000,
            "use_helius_ws": True,
        }
        self.stats = self._empty_stats()
        self.transaction_log = []
        self._positions = {}
        self._known_pairs = set()
        self._bought_tokens = set()
        self._ws_connected = False

    def _empty_stats(self):
        return {
            "total_snipes": 0, "successful_snipes": 0,
            "total_sol_spent": 0.0, "total_sol_recovered": 0.0,
            "profit_sol": 0.0, "errors": 0,
            "pools_scanned": 0, "new_pools_found": 0,
            "tokens_rejected": 0,
            "take_profits": 0, "stop_losses": 0,
            "started_at": None, "last_snipe_time": None,
            "helius_ws": False,
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
        self._bought_tokens = set()
        self._known_pairs = set()

        # Start Helius WebSocket listener for real-time pool detection
        if HELIUS_KEY and self.config.get("use_helius_ws", True):
            self.ws_task = asyncio.create_task(self._helius_ws_listener())
            self.stats["helius_ws"] = True
            self._log("INFO", "", 0, "Sniper v4 started with Helius WebSocket (real-time)")
        else:
            self._log("INFO", "", 0, "Sniper v4 started with DexScreener (delayed)")

        self.task = asyncio.create_task(self._run_loop())
        return True

    async def stop(self):
        if not self.running:
            return False
        self.running = False
        if self.task:
            self.task.cancel()
        if self.ws_task:
            self.ws_task.cancel()
        self._ws_connected = False
        return True

    def _log(self, type_, wallet, amount, detail):
        self.transaction_log.append({
            "time": time.time(), "type": type_,
            "wallet": wallet[:8] if wallet else "", "amount": round(amount, 6), "detail": str(detail)[:120],
        })
        if len(self.transaction_log) > 200:
            self.transaction_log = self.transaction_log[-200:]

    async def _save_trade(self, action, token_mint, wallet, sol_amount, tx_sig="", profit_sol=None, token_symbol=""):
        from datetime import datetime, timezone
        doc = {
            "action": action, "token_mint": token_mint, "token_symbol": token_symbol,
            "wallet": wallet, "sol_amount": round(sol_amount, 6),
            "tx_signature": tx_sig, "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if profit_sol is not None:
            doc["profit_sol"] = round(profit_sol, 6)
        await self.db[self.collection_history].insert_one(doc)

    # ============ HELIUS WEBSOCKET - REAL TIME ============

    async def _helius_ws_listener(self):
        """Listen for new pool creations via Helius WebSocket"""
        ws_url = f"wss://atlas-mainnet.helius-rpc.com/?api-key={HELIUS_KEY}"
        while self.running:
            try:
                async with websockets.connect(ws_url, ping_interval=30) as ws:
                    self._ws_connected = True
                    self._log("WS", "", 0, "Helius WebSocket connected - monitoring new pools")

                    # Subscribe to Raydium Launchlab + CPMM + pump.fun programs
                    for program_id in [RAYDIUM_LAUNCHLAB, RAYDIUM_CPMM, PUMPFUN_PROGRAM]:
                        await ws.send(json.dumps({
                            "jsonrpc": "2.0", "id": 1, "method": "transactionSubscribe",
                            "params": [{
                                "failed": False,
                                "accountInclude": [program_id],
                            }, {
                                "commitment": "confirmed",
                                "encoding": "jsonParsed",
                                "transactionDetails": "full",
                                "maxSupportedTransactionVersion": 0,
                            }]
                        }))

                    # Listen for new transactions
                    async for message in ws:
                        if not self.running:
                            break
                        try:
                            data = json.loads(message)
                            params = data.get("params", {})
                            result = params.get("result", {})
                            sig = result.get("signature", "")
                            tx = result.get("transaction", {})
                            meta = tx.get("meta", {})
                            logs = meta.get("logMessages", []) or []

                            # Detect pool creation from logs
                            is_new_pool = any(
                                "Initialize" in log or "CreatePool" in log or "create" in log.lower()
                                for log in logs
                            )
                            if not is_new_pool:
                                continue

                            # Extract token mint from transaction accounts
                            accounts = tx.get("transaction", {}).get("message", {}).get("accountKeys", [])
                            token_mint = None
                            for acc in accounts:
                                addr = acc.get("pubkey", "") if isinstance(acc, dict) else str(acc)
                                if addr and addr != SOL_MINT and len(addr) > 30:
                                    # Check if it's a token mint
                                    if addr not in self._bought_tokens and addr not in self._known_pairs:
                                        token_mint = addr
                                        break

                            if token_mint:
                                self._log("WS_POOL", "", 0, f"New pool detected: {token_mint[:30]}... sig:{sig[:16]}")
                                self.stats["new_pools_found"] += 1
                                # Quick check liquidity before sniping
                                await asyncio.sleep(2)  # Wait 2s for DexScreener to index
                                price_data = await get_token_price(token_mint)
                                liq = price_data.get("liquidity_usd", 0)
                                if liq >= self.config.get("min_liquidity_usd", 5000):
                                    if len(self._positions) < self.config.get("max_concurrent_positions", 4):
                                        await self._snipe_token(token_mint, "WS")
                                else:
                                    self._log("WS_SKIP", "", liq, f"Low liq ${liq:.0f} for {token_mint[:20]}")

                        except Exception as e:
                            logger.debug(f"WS message error: {e}")

            except Exception as e:
                self._ws_connected = False
                logger.error(f"Helius WS error: {e}")
                self._log("WS_ERR", "", 0, f"WS disconnected: {str(e)[:60]}. Reconnecting...")
                await asyncio.sleep(5)

    # ============ DEXSCREENER FALLBACK ============

    async def _run_loop(self):
        """Main loop - DexScreener discovery + position monitoring"""
        last_reset = time.time()
        while self.running:
            try:
                if time.time() - last_reset > 600:
                    self._known_pairs.clear()
                    last_reset = time.time()

                # DexScreener discovery (runs alongside WebSocket)
                if self.config.get("auto_discover", True):
                    await self._discover_dexscreener()

                if self.config.get("token_mint") and self.config["token_mint"] not in self._bought_tokens:
                    await self._snipe_token(self.config["token_mint"], "manual")

                await self._monitor_positions()

            except Exception as e:
                self.stats["errors"] += 1
                self._log("ERROR", "", 0, str(e)[:100])
            await asyncio.sleep(self.config.get("check_interval", 8))

    async def _discover_dexscreener(self):
        """DexScreener fallback discovery"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                pairs = []
                try:
                    r = await client.get("https://api.dexscreener.com/token-profiles/latest/v1")
                    if r.status_code == 200:
                        profiles = r.json()
                        if isinstance(profiles, list):
                            for p in [x for x in profiles if x.get("chainId") == "solana"][:10]:
                                addr = p.get("tokenAddress", "")
                                if addr and addr not in self._known_pairs:
                                    self._known_pairs.add(addr)
                                    try:
                                        tr = await client.get(f"https://api.dexscreener.com/latest/dex/tokens/{addr}")
                                        for pair in tr.json().get("pairs", [])[:1]:
                                            pairs.append(pair)
                                    except Exception:
                                        pass
                except Exception:
                    pass

                try:
                    r2 = await client.get("https://api.dexscreener.com/token-boosts/latest/v1")
                    if r2.status_code == 200:
                        boosts = r2.json()
                        if isinstance(boosts, list):
                            for b in [x for x in boosts if x.get("chainId") == "solana"]:
                                addr = b.get("tokenAddress", "")
                                if addr and addr not in self._known_pairs:
                                    self._known_pairs.add(addr)
                                    try:
                                        tr = await client.get(f"https://api.dexscreener.com/latest/dex/tokens/{addr}")
                                        for pair in tr.json().get("pairs", [])[:1]:
                                            pairs.append(pair)
                                    except Exception:
                                        pass
                except Exception:
                    pass

                self.stats["pools_scanned"] += len(pairs)

                for pair in pairs:
                    base = pair.get("baseToken", {})
                    token_addr = base.get("address", "")
                    token_symbol = base.get("symbol", "???")
                    if not token_addr or token_addr == SOL_MINT or token_addr in self._bought_tokens or token_addr in self._positions:
                        continue
                    if pair.get("chainId") != "solana":
                        continue
                    dex = pair.get("dexId", "").lower()
                    if not any(d in dex for d in ["pumpswap", "raydium", "meteora", "orca"]):
                        continue

                    liq = float(pair.get("liquidity", {}).get("usd", 0) or 0)
                    if liq < self.config.get("min_liquidity_usd", 5000) or liq > self.config.get("max_liquidity_usd", 500000):
                        continue

                    created = pair.get("pairCreatedAt", 0)
                    if created:
                        age_s = (time.time() * 1000 - created) / 1000
                        max_age = self.config.get("max_pool_age_seconds", 3600)
                        if max_age > 0 and age_s > max_age:
                            continue

                    price_5m = float(pair.get("priceChange", {}).get("m5", 0) or 0)
                    price_1h = float(pair.get("priceChange", {}).get("h1", 0) or 0)
                    if price_5m < self.config.get("min_price_change_5m", 3) and price_1h < self.config.get("min_price_change_5m", 3):
                        self.stats["tokens_rejected"] += 1
                        continue

                    vol_1h = float(pair.get("volume", {}).get("h1", 0) or 0)
                    if vol_1h < self.config.get("min_volume_1h_usd", 3000):
                        self.stats["tokens_rejected"] += 1
                        continue

                    self.stats["new_pools_found"] += 1
                    self._log("NEW_POOL", "", liq, f"{token_symbol} | {dex} | Liq:${liq:.0f} | 5m:{price_5m:+.1f}%")

                    if len(self._positions) < self.config.get("max_concurrent_positions", 4):
                        await self._snipe_token(token_addr, token_symbol)

        except Exception as e:
            logger.debug(f"DexScreener error: {e}")

    # ============ TRADING ============

    async def _snipe_token(self, token_mint, token_symbol=""):
        if token_mint in self._positions or token_mint in self._bought_tokens:
            return
        if len(self._positions) >= self.config.get("max_concurrent_positions", 4):
            return

        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        if not wallets:
            return

        wallet = None
        pubs = [w["public_key"] for w in wallets]
        bals = await batch_get_sol_balances(pubs)
        for w in wallets:
            if bals.get(w["public_key"], 0) >= self.config["max_buy_sol"] + 0.005:
                wallet = w
                break
        if not wallet:
            self._log("SKIP", "", 0, "No funded wallet")
            return

        pub = wallet["public_key"]
        buy_amount = self.config["max_buy_sol"]
        kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))

        # Price impact check
        try:
            rpc = HELIUS_RPC or SOLANA_RPC
            async with httpx.AsyncClient(timeout=8.0) as client:
                qr = await client.get("https://api.jup.ag/swap/v1/quote", params={
                    "inputMint": SOL_MINT, "outputMint": token_mint,
                    "amount": str(int(buy_amount * LAMPORTS_PER_SOL)),
                    "slippageBps": str(self.config["slippage_bps"]),
                })
                quote = qr.json()
                impact = float(quote.get("priceImpactPct", 0) or 0)
                if abs(impact) > 5:
                    self._log("SKIP", pub, 0, f"Impact {impact:.1f}% too high for {token_symbol}")
                    return
        except Exception:
            pass

        self._log("SNIPE_TRY", pub, buy_amount, f"Buying {token_symbol} ({token_mint[:20]}...)")
        result = await jupiter_swap(kp, SOL_MINT, token_mint, int(buy_amount * LAMPORTS_PER_SOL), self.config["slippage_bps"])

        if result["success"]:
            self._bought_tokens.add(token_mint)
            price_data = await get_token_price(token_mint)
            self._positions[token_mint] = {
                "wallet": pub,
                "entry_price_native": price_data.get("price_native", 0),
                "sol_spent": buy_amount,
                "time": time.time(),
                "token_symbol": token_symbol,
            }
            self.stats["total_snipes"] += 1
            self.stats["successful_snipes"] += 1
            self.stats["total_sol_spent"] += buy_amount
            self.stats["last_snipe_time"] = time.time()
            self._log("SNIPE_BUY", pub, buy_amount, f"BOUGHT {token_symbol} tx:{result.get('tx','')[:16]}")
            await self._save_trade("BUY", token_mint, pub, buy_amount, result.get("tx", ""), token_symbol=token_symbol)
        else:
            self.stats["errors"] += 1
            self._log("SNIPE_FAIL", pub, 0, f"{token_symbol} {result.get('error','')[:60]}")

    async def _monitor_positions(self):
        for token_mint, pos in list(self._positions.items()):
            try:
                price_data = await get_token_price(token_mint)
                current_native = price_data.get("price_native", 0)
                entry_native = pos.get("entry_price_native", 0)
                if entry_native <= 0 or current_native <= 0:
                    continue

                change_pct = ((current_native - entry_native) / entry_native) * 100
                symbol = pos.get("token_symbol", "???")

                tp = self.config.get("take_profit_percent", 20)
                if change_pct >= tp:
                    await self._sell_position(token_mint, pos, f"TAKE_PROFIT +{change_pct:.1f}% {symbol}")
                    self.stats["take_profits"] += 1
                    continue

                sl = self.config.get("stop_loss_percent", 15)
                if change_pct <= -sl:
                    await self._sell_position(token_mint, pos, f"STOP_LOSS {change_pct:.1f}% {symbol}")
                    self.stats["stop_losses"] += 1

            except Exception as e:
                logger.debug(f"Monitor error: {e}")

    async def _sell_position(self, token_mint, pos, reason):
        wallet_pub = pos["wallet"]
        wallet = await self.db[self.collection_wallets].find_one({"public_key": wallet_pub}, {"_id": 0})
        if not wallet:
            del self._positions[token_mint]
            return
        try:
            rpc = HELIUS_RPC or "https://api.mainnet-beta.solana.com"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(rpc, json={
                    "jsonrpc": "2.0", "id": 1,
                    "method": "getTokenAccountsByOwner",
                    "params": [wallet_pub, {"mint": token_mint}, {"encoding": "jsonParsed"}],
                })
                accounts = resp.json().get("result", {}).get("value", [])
                if not accounts:
                    del self._positions[token_mint]
                    return
                raw_amount = int(accounts[0]["account"]["data"]["parsed"]["info"]["tokenAmount"]["amount"])
                if raw_amount <= 0:
                    del self._positions[token_mint]
                    return
        except Exception:
            return

        sell_amount = int(raw_amount * 0.95)
        kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
        result = await jupiter_swap(kp, token_mint, SOL_MINT, sell_amount, self.config.get("sell_slippage_bps", 800))

        symbol = pos.get("token_symbol", "???")
        if result["success"]:
            sol_out = result.get("out_amount", 0) / LAMPORTS_PER_SOL
            profit = sol_out - pos.get("sol_spent", 0)
            self.stats["total_sol_recovered"] += sol_out
            self.stats["profit_sol"] = self.stats["total_sol_recovered"] - self.stats["total_sol_spent"]
            self._log(reason.split()[0], wallet_pub, sol_out, f"{reason} P/L:{profit:+.4f} SOL tx:{result.get('tx','')[:12]}")
            await self._save_trade("SELL", token_mint, wallet_pub, sol_out, result.get("tx", ""), profit, symbol)
            del self._positions[token_mint]
        else:
            self.stats["errors"] += 1
            self._log("SELL_FAIL", wallet_pub, 0, f"{symbol} {result.get('error','')[:60]}")

    # ============ STATUS / WALLET MANAGEMENT ============

    async def get_status_async(self):
        await self.load_config()
        positions_info = [{
            "token_mint": t, "token_symbol": p.get("token_symbol", "???"),
            "wallet": p["wallet"], "sol_spent": p["sol_spent"],
            "age_minutes": round((time.time() - p.get("time", 0)) / 60, 1),
        } for t, p in self._positions.items()]
        self.stats["helius_ws"] = self._ws_connected
        return {
            "running": self.running, "config": self.config, "stats": self.stats,
            "open_positions": positions_info, "positions_count": len(self._positions),
            "known_pairs": len(self._known_pairs), "bought_tokens": len(self._bought_tokens),
            "ws_connected": self._ws_connected,
            "recent_transactions": self.transaction_log[-50:],
        }

    async def manual_sell(self, token_mint, wallet_pubkey=""):
        try:
            from solders.pubkey import Pubkey
            Pubkey.from_string(token_mint)
        except Exception:
            return {"error": "Invalid token mint address"}
        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        if not wallets:
            return {"error": "No wallets"}
        targets = [w for w in wallets if not wallet_pubkey or w["public_key"] == wallet_pubkey] or wallets
        rpc = HELIUS_RPC or "https://api.mainnet-beta.solana.com"
        for wallet in targets:
            pub = wallet["public_key"]
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(rpc, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getTokenAccountsByOwner",
                        "params": [pub, {"mint": token_mint}, {"encoding": "jsonParsed"}],
                    })
                    accounts = resp.json().get("result", {}).get("value", [])
                    if not accounts:
                        continue
                    raw = int(accounts[0]["account"]["data"]["parsed"]["info"]["tokenAmount"]["amount"])
                    if raw <= 0:
                        continue
            except Exception:
                continue
            kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
            result = await jupiter_swap(kp, token_mint, SOL_MINT, int(raw * 0.95), self.config.get("sell_slippage_bps", 800))
            if result["success"]:
                sol_out = result.get("out_amount", 0) / LAMPORTS_PER_SOL
                await self._save_trade("MANUAL_SELL", token_mint, pub, sol_out, result.get("tx", ""))
                if token_mint in self._positions:
                    del self._positions[token_mint]
                return {"success": True, "sol_received": sol_out, "tx": result.get("tx", "")}
            else:
                return {"success": False, "error": result.get("error", "")}
        return {"error": "No wallet holds this token"}

    async def get_holdings(self):
        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(200)
        if not wallets:
            return []
        holdings = []
        rpc = HELIUS_RPC or "https://api.mainnet-beta.solana.com"
        async with httpx.AsyncClient(timeout=12.0) as client:
            for w in wallets:
                try:
                    resp = await client.post(rpc, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getTokenAccountsByOwner",
                        "params": [w["public_key"], {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}, {"encoding": "jsonParsed"}],
                    })
                    for acc in resp.json().get("result", {}).get("value", []):
                        info = acc["account"]["data"]["parsed"]["info"]
                        mint = info["mint"]
                        ui = float(info["tokenAmount"].get("uiAmount", 0) or 0)
                        if ui > 0 and mint != SOL_MINT:
                            pd = {}
                            try:
                                pd = await get_token_price(mint)
                            except Exception:
                                pass
                            holdings.append({
                                "token_mint": mint, "wallet": w["public_key"], "wallet_label": w.get("label", ""),
                                "balance": ui, "value_usd": ui * pd.get("price_usd", 0),
                                "price_usd": pd.get("price_usd", 0), "liquidity_usd": pd.get("liquidity_usd", 0),
                            })
                except Exception:
                    continue
                await asyncio.sleep(0.3)
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

    async def generate_wallets(self, count, prefix="Sniper"):
        created = []
        for i in range(count):
            kp = Keypair()
            existing = await self.db[self.collection_wallets].count_documents({})
            doc = {"label": f"{prefix} #{existing+1}", "public_key": str(kp.pubkey()),
                   "private_key": base58.b58encode(bytes(kp)).decode(), "is_main": existing == 0, "added_at": time.time()}
            await self.db[self.collection_wallets].insert_one(doc)
            created.append({"label": doc["label"], "public_key": doc["public_key"]})
        return {"created": len(created), "wallets": created}

    async def set_main_wallet(self, pk):
        await self.db[self.collection_wallets].update_many({}, {"$set": {"is_main": False}})
        r = await self.db[self.collection_wallets].update_one({"public_key": pk}, {"$set": {"is_main": True}})
        return {"success": r.modified_count > 0}

    async def remove_wallet(self, pk):
        r = await self.db[self.collection_wallets].delete_one({"public_key": pk})
        return {"success": r.deleted_count > 0}

    async def distribute_sol(self, sol_per_wallet):
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
