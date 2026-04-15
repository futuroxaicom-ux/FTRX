"""Holder Bot - Creates token holders by buying minimum amounts across many wallets"""
import asyncio
import time
import logging
import base58
import base64
import httpx
import httpx
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import transfer, TransferParams
from solders.transaction import Transaction
from solders.message import Message
from solders.hash import Hash
from bot_utils import (
    SOL_MINT, LAMPORTS_PER_SOL, SOLANA_RPC, jupiter_swap,
    batch_get_sol_balances, batch_get_token_balances,
    distribute_sol_from_wallet, collect_sol_to_wallet, get_ata,
    TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
)

logger = logging.getLogger(__name__)

HOLDER_PRESETS = [50, 100, 200, 250, 500, 750, 1000, 5000]


class HolderBot:
    def __init__(self, db):
        self.db = db
        self.collection_wallets = "holder_bot_wallets"
        self.collection_config = "holder_bot_config"
        self.running = False
        self.task = None
        self.config = {
            "token_mint": "",
            "sol_per_buy": 0.001,
            "slippage_bps": 1500,
        }
        self.stats = {
            "total_holders": 0,
            "wallets_funded": 0,
            "wallets_bought": 0,
            "errors": 0,
            "phase": "idle",
            "progress": 0,
            "progress_total": 0,
        }
        self.transaction_log = []

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

    def _log(self, type_, wallet, amount, detail):
        self.transaction_log.append({
            "time": time.time(), "type": type_,
            "wallet": wallet[:8] if wallet else "", "amount": round(amount, 6), "detail": str(detail)[:120],
        })
        if len(self.transaction_log) > 200:
            self.transaction_log = self.transaction_log[-200:]

    async def start(self):
        """Start mass holder creation"""
        if self.running or not self.config.get("token_mint"):
            return False
        await self.load_config()
        self.running = True
        self.stats["phase"] = "starting"
        self.stats["errors"] = 0
        self.stats["wallets_funded"] = 0
        self.stats["wallets_bought"] = 0
        self.task = asyncio.create_task(self._run_holder_creation())
        return True

    async def stop(self):
        if not self.running:
            return False
        self.running = False
        if self.task:
            self.task.cancel()
        self.stats["phase"] = "stopped"
        return True

    async def _run_holder_creation(self):
        """Main process: distribute SOL -> buy tokens on each wallet"""
        try:
            wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(1000)
            main = next((w for w in wallets if w.get("is_main")), None)
            subs = [w for w in wallets if not w.get("is_main")]

            if not main or not subs:
                self._log("ERROR", "", 0, "No main wallet or sub wallets")
                self.stats["phase"] = "error"
                self.running = False
                return

            # Phase 1: Check which subs need SOL
            self.stats["phase"] = "checking_balances"
            self.stats["progress_total"] = len(subs)
            pubs = [w["public_key"] for w in subs]
            sol_bals = await batch_get_sol_balances(pubs)

            # Need: sol_per_buy + 0.003 SOL (ATA rent + fees)
            sol_needed = self.config["sol_per_buy"] + 0.003
            unfunded = [w for w in subs if sol_bals.get(w["public_key"], 0) < sol_needed]

            # Check if main has enough to fund all unfunded
            main_pub = main["public_key"]
            main_bals = await batch_get_sol_balances([main_pub])
            main_sol = main_bals.get(main_pub, 0)
            total_needed = len(unfunded) * sol_needed
            self._log("INFO", "", len(unfunded), f"Need to fund {len(unfunded)} wallets ({sol_needed:.4f} each). Main has {main_sol:.4f} SOL, needs {total_needed:.4f}")

            if main_sol < sol_needed and unfunded:
                self._log("ERROR", "", 0, f"Main wallet needs {total_needed:.4f} SOL but has only {main_sol:.4f}. Uzupelnij SOL!")
                self.stats["phase"] = "error - insufficient SOL on main"
                self.running = False
                return

            # Phase 2: Distribute SOL to unfunded wallets
            if unfunded:
                self.stats["phase"] = "distributing_sol"
                main_kp = Keypair.from_bytes(base58.b58decode(main["private_key"]))
                targets = [w["public_key"] for w in unfunded]
                # Batch distribute (20 per tx)
                for i in range(0, len(targets), 20):
                    if not self.running:
                        return
                    batch = targets[i:i + 20]
                    result = await distribute_sol_from_wallet(main_kp, batch, sol_needed)
                    self.stats["wallets_funded"] += result.get("success", 0)
                    self.stats["progress"] = min(i + 20, len(targets))
                    self._log("DISTRIBUTE", "", len(batch), f"Funded {result.get('success',0)}/{len(batch)}")
                    await asyncio.sleep(1)

            # Phase 3: Buy tokens on each wallet
            self.stats["phase"] = "buying_tokens"
            self.stats["progress"] = 0
            self.stats["progress_total"] = len(subs)
            token_mint = self.config["token_mint"]
            buy_lamports = int(self.config["sol_per_buy"] * LAMPORTS_PER_SOL)

            # Check which subs already hold tokens
            token_bals = await batch_get_token_balances(pubs, token_mint)
            need_buy = [w for w in subs if token_bals.get(w["public_key"], 0) <= 0]
            self._log("INFO", "", len(need_buy), f"Need to buy tokens for {len(need_buy)} wallets")
            self.stats["progress_total"] = len(need_buy)

            # Fetch ALL balances at once (not per-wallet to avoid rate limits)
            all_bals = await batch_get_sol_balances([w["public_key"] for w in need_buy])

            for idx, wallet in enumerate(need_buy):
                if not self.running:
                    return
                self.stats["progress"] = idx + 1
                pub = wallet["public_key"]

                # Check balance from pre-fetched data
                wallet_bal = all_bals.get(pub, 0)
                if wallet_bal < sol_needed:
                    self._log("SKIP", pub, 0, f"SOL: {wallet_bal:.4f} < needed {sol_needed:.4f}")
                    continue

                kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
                result = await jupiter_swap(kp, SOL_MINT, token_mint, buy_lamports, self.config["slippage_bps"])

                if result["success"]:
                    self.stats["wallets_bought"] += 1
                    self._log("BUY", pub, self.config["sol_per_buy"], f"Holder created | tx:{result.get('tx','')[:16]}")
                else:
                    self.stats["errors"] += 1
                    self._log("ERROR", pub, 0, result.get("error", "")[:80])

                # Delay to avoid rate limits
                await asyncio.sleep(2)

            # Done
            self.stats["phase"] = "done"
            self.stats["total_holders"] = self.stats["wallets_bought"] + len([w for w in subs if token_bals.get(w["public_key"], 0) > 0])
            self._log("DONE", "", self.stats["total_holders"], f"Holder creation complete: {self.stats['total_holders']} holders")
            self.running = False

        except Exception as e:
            logger.error(f"HolderBot error: {e}")
            self.stats["phase"] = "error"
            self._log("ERROR", "", 0, str(e)[:100])
            self.running = False

    async def collect_all_tokens(self):
        """Collect all tokens from sub wallets to main wallet using Jupiter sell"""
        await self.load_config()
        token_mint = self.config.get("token_mint", "")
        if not token_mint:
            return {"error": "No token mint configured"}

        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(1000)
        main = next((w for w in wallets if w.get("is_main")), None)
        subs = [w for w in wallets if not w.get("is_main")]
        if not main or not subs:
            return {"error": "No wallets"}

        collected = 0
        errors = 0
        total_sol = 0.0

        self.stats["phase"] = "collecting_tokens"
        self.stats["progress"] = 0
        self.stats["progress_total"] = len(subs)

        for idx, wallet in enumerate(subs):
            self.stats["progress"] = idx + 1
            pub = wallet["public_key"]

            # Check token balance
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post("https://api.mainnet-beta.solana.com", json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getTokenAccountsByOwner",
                        "params": [pub, {"mint": token_mint}, {"encoding": "jsonParsed"}],
                    })
                    accounts = resp.json().get("result", {}).get("value", [])
                    if not accounts:
                        continue
                    raw_amount = int(accounts[0]["account"]["data"]["parsed"]["info"]["tokenAmount"]["amount"])
                    if raw_amount <= 0:
                        continue
            except Exception:
                continue

            # Sell token for SOL
            kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
            sell_amount = int(raw_amount * 0.95)
            result = await jupiter_swap(kp, token_mint, SOL_MINT, sell_amount, self.config.get("slippage_bps", 1500))

            if result["success"]:
                sol_out = result.get("out_amount", 0) / LAMPORTS_PER_SOL
                total_sol += sol_out
                collected += 1
                self._log("SELL", pub, sol_out, f"Collected tokens | tx:{result.get('tx','')[:16]}")
            else:
                errors += 1
            await asyncio.sleep(2)

        self.stats["phase"] = "idle"
        # Now collect SOL to main
        if collected > 0:
            keypairs = [Keypair.from_bytes(base58.b58decode(w["private_key"])) for w in subs]
            await collect_sol_to_wallet(keypairs, main["public_key"])

        return {"collected": collected, "errors": errors, "total_sol": round(total_sol, 6)}

    async def close_accounts_and_recover(self):
        """Close token accounts to recover ATA rent SOL back to main wallet"""
        await self.load_config()
        token_mint = self.config.get("token_mint", "")
        if not token_mint:
            return {"error": "No token mint"}

        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(1000)
        main = next((w for w in wallets if w.get("is_main")), None)
        subs = [w for w in wallets if not w.get("is_main")]
        if not main:
            return {"error": "No main wallet"}

        closed = 0
        errors = 0
        mint_pub = Pubkey.from_string(token_mint)

        self.stats["phase"] = "closing_accounts"
        self.stats["progress"] = 0
        self.stats["progress_total"] = len(subs)

        async with httpx.AsyncClient(timeout=15.0) as client:
            for idx, wallet in enumerate(subs):
                self.stats["progress"] = idx + 1
                try:
                    pub = wallet["public_key"]
                    wallet_pub = Pubkey.from_string(pub)
                    kp = Keypair.from_bytes(base58.b58decode(wallet["private_key"]))
                    ata = get_ata(wallet_pub, mint_pub)

                    # Check if ATA exists and has 0 balance
                    resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "getTokenAccountBalance",
                        "params": [str(ata)],
                    })
                    data = resp.json()
                    if "error" in data:
                        continue  # No ATA
                    amount = int(data.get("result", {}).get("value", {}).get("amount", "0"))
                    if amount > 0:
                        continue  # Still has tokens

                    # Close the token account (rent goes back to wallet)
                    from solders.instruction import Instruction, AccountMeta
                    close_ix = Instruction(
                        program_id=TOKEN_PROGRAM_ID,
                        accounts=[
                            AccountMeta(pubkey=ata, is_signer=False, is_writable=True),
                            AccountMeta(pubkey=wallet_pub, is_signer=False, is_writable=True),
                            AccountMeta(pubkey=wallet_pub, is_signer=True, is_writable=False),
                        ],
                        data=bytes([9]),  # CloseAccount instruction
                    )
                    bh_resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash",
                        "params": [{"commitment": "confirmed"}],
                    })
                    bh = Hash.from_string(bh_resp.json()["result"]["value"]["blockhash"])
                    msg = Message.new_with_blockhash([close_ix], wallet_pub, bh)
                    tx = Transaction.new_unsigned(msg)
                    tx.sign([kp], bh)
                    encoded = base64.b64encode(bytes(tx)).decode("utf-8")

                    send_resp = await client.post(SOLANA_RPC, json={
                        "jsonrpc": "2.0", "id": 1, "method": "sendTransaction",
                        "params": [encoded, {"encoding": "base64", "skipPreflight": False}],
                    })
                    if "result" in send_resp.json():
                        closed += 1
                    else:
                        errors += 1
                except Exception:
                    errors += 1
                await asyncio.sleep(0.5)

        # Collect recovered SOL to main
        if closed > 0:
            await asyncio.sleep(3)
            keypairs = [Keypair.from_bytes(base58.b58decode(w["private_key"])) for w in subs]
            await collect_sol_to_wallet(keypairs, main["public_key"])
            self._log("CLOSE", "", closed, f"Closed {closed} accounts, SOL recovered to main")

        self.stats["phase"] = "idle"
        return {"closed": closed, "errors": errors, "rent_recovered_approx": round(closed * 0.00204, 4)}

    async def get_status_async(self):
        await self.load_config()
        return {
            "running": self.running,
            "config": self.config,
            "stats": self.stats,
            "total_holders": self.stats.get("total_holders", 0),
            "recent_transactions": self.transaction_log[-50:],
        }

    async def get_wallets_info(self):
        await self.load_config()
        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0, "private_key": 0}).to_list(1000)
        if not wallets:
            return []
        pubs = [w["public_key"] for w in wallets]
        sol_bals = await batch_get_sol_balances(pubs)
        for w in wallets:
            w["balance_sol"] = sol_bals.get(w["public_key"], 0)
            w["balance_token"] = 0

        # Fetch token balances using getTokenAccountsByOwner (reliable)
        token_mint = self.config.get("token_mint", "")
        token_symbol = ""
        if token_mint:
            # Get token symbol from DexScreener
            try:
                async with httpx.AsyncClient(timeout=8.0) as ds_client:
                    ds_resp = await ds_client.get(f"https://api.dexscreener.com/latest/dex/tokens/{token_mint}")
                    ds_pairs = ds_resp.json().get("pairs", [])
                    if ds_pairs:
                        token_symbol = ds_pairs[0].get("baseToken", {}).get("symbol", "")
            except Exception:
                pass

            BATCH = 5
            async with httpx.AsyncClient(timeout=15.0) as client:
                for i in range(0, len(wallets), BATCH):
                    batch = wallets[i:i + BATCH]
                    rpc_batch = [
                        {"jsonrpc": "2.0", "id": idx, "method": "getTokenAccountsByOwner",
                         "params": [w["public_key"], {"mint": token_mint}, {"encoding": "jsonParsed"}]}
                        for idx, w in enumerate(batch)
                    ]
                    for rpc in [SOLANA_RPC, "https://api.mainnet-beta.solana.com"]:
                        try:
                            resp = await client.post(rpc, json=rpc_batch)
                            if resp.status_code == 429:
                                await asyncio.sleep(2)
                                continue
                            results = resp.json()
                            if isinstance(results, list):
                                for r in results:
                                    rid = r.get("id", 0)
                                    if 0 <= rid < len(batch):
                                        accounts = r.get("result", {}).get("value", [])
                                        if accounts:
                                            ui = float(accounts[0]["account"]["data"]["parsed"]["info"]["tokenAmount"].get("uiAmount", 0) or 0)
                                            batch[rid]["balance_token"] = ui
                            break
                        except Exception:
                            continue
                    await asyncio.sleep(0.3)

        # Count holders
        holders = len([w for w in wallets if w.get("balance_token", 0) > 0])
        self.stats["total_holders"] = holders

        # Add token symbol to each wallet
        for w in wallets:
            w["token_symbol"] = token_symbol

        return wallets

    async def generate_wallets(self, count: int, prefix: str = "Holder"):
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
        subs = await self.db[self.collection_wallets].find({"is_main": {"$ne": True}}, {"_id": 0}).to_list(5000)
        kp = Keypair.from_bytes(base58.b58decode(main["private_key"]))
        return await distribute_sol_from_wallet(kp, [w["public_key"] for w in subs], sol_per_wallet)

    async def distribute_tokens_to_holders(self, tokens_per_wallet: float = 0):
        """Distribute tokens from main wallet to ALL sub-wallets (SPL transfer, no Jupiter).
        Creates ATA on each wallet and transfers tokens. This creates token holders."""
        await self.load_config()
        token_mint_str = self.config.get("token_mint", "")
        if not token_mint_str:
            return {"error": "No token mint configured"}

        wallets = await self.db[self.collection_wallets].find({}, {"_id": 0}).to_list(6000)
        main = next((w for w in wallets if w.get("is_main")), None)
        subs = [w for w in wallets if not w.get("is_main")]
        if not main or not subs:
            return {"error": "No main or sub wallets"}

        mint_pub = Pubkey.from_string(token_mint_str)
        main_kp = Keypair.from_bytes(base58.b58decode(main["private_key"]))
        main_pub = main_kp.pubkey()
        source_ata = get_ata(main_pub, mint_pub)
        SYSTEM_PROGRAM = Pubkey.from_string("11111111111111111111111111111111")

        RPC = "https://api.mainnet-beta.solana.com"

        # Get main token balance
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(RPC, json={
                "jsonrpc": "2.0", "id": 1,
                "method": "getTokenAccountsByOwner",
                "params": [str(main_pub), {"mint": token_mint_str}, {"encoding": "jsonParsed"}],
            })
            accounts = resp.json().get("result", {}).get("value", [])
            if not accounts:
                return {"error": "Main wallet has no token account"}
            main_raw = int(accounts[0]["account"]["data"]["parsed"]["info"]["tokenAmount"]["amount"])
            decimals = int(accounts[0]["account"]["data"]["parsed"]["info"]["tokenAmount"]["decimals"])

        if main_raw <= 0:
            return {"error": "Main wallet has 0 tokens"}

        # Calculate per-wallet amount
        if tokens_per_wallet > 0:
            raw_per_wallet = int(tokens_per_wallet * (10 ** decimals))
        else:
            raw_per_wallet = main_raw // len(subs)

        if raw_per_wallet <= 0:
            return {"error": "Not enough tokens to distribute"}

        self.stats["phase"] = "distributing_tokens"
        self.stats["progress"] = 0
        self.stats["progress_total"] = len(subs)
        distributed = 0
        errors = 0

        from solders.instruction import Instruction, AccountMeta

        async with httpx.AsyncClient(timeout=15.0) as client:
            bh = None
            for i, w in enumerate(subs):
                self.stats["progress"] = i + 1
                remaining = main_raw - (raw_per_wallet * distributed)
                if remaining < raw_per_wallet:
                    self._log("INFO", "", 0, f"Brak tokenow - rozdzielono na {distributed} portfeli")
                    break

                try:
                    wallet_pub = Pubkey.from_string(w["public_key"])
                    dest_ata = get_ata(wallet_pub, mint_pub)

                    # Refresh blockhash every 20 wallets
                    if i % 20 == 0:
                        bh_resp = await client.post(RPC, json={
                            "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash",
                            "params": [{"commitment": "finalized"}],
                        })
                        bh = Hash.from_string(bh_resp.json()["result"]["value"]["blockhash"])

                    # Create ATA (idempotent) + SPL Transfer in one TX
                    create_ata_ix = Instruction(
                        program_id=ASSOCIATED_TOKEN_PROGRAM_ID,
                        accounts=[
                            AccountMeta(pubkey=main_pub, is_signer=True, is_writable=True),
                            AccountMeta(pubkey=dest_ata, is_signer=False, is_writable=True),
                            AccountMeta(pubkey=wallet_pub, is_signer=False, is_writable=False),
                            AccountMeta(pubkey=mint_pub, is_signer=False, is_writable=False),
                            AccountMeta(pubkey=SYSTEM_PROGRAM, is_signer=False, is_writable=False),
                            AccountMeta(pubkey=TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
                        ],
                        data=bytes([1]),  # CreateIdempotent
                    )

                    transfer_data = bytes([3]) + raw_per_wallet.to_bytes(8, 'little')
                    transfer_ix = Instruction(
                        program_id=TOKEN_PROGRAM_ID,
                        accounts=[
                            AccountMeta(pubkey=source_ata, is_signer=False, is_writable=True),
                            AccountMeta(pubkey=dest_ata, is_signer=False, is_writable=True),
                            AccountMeta(pubkey=main_pub, is_signer=True, is_writable=False),
                        ],
                        data=transfer_data,
                    )

                    msg = Message.new_with_blockhash([create_ata_ix, transfer_ix], main_pub, bh)
                    tx = Transaction.new_unsigned(msg)
                    tx.sign([main_kp], bh)
                    encoded = base64.b64encode(bytes(tx)).decode("utf-8")

                    send_resp = await client.post(RPC, json={
                        "jsonrpc": "2.0", "id": 1, "method": "sendTransaction",
                        "params": [encoded, {"encoding": "base64", "skipPreflight": True}],
                    })
                    if "result" in send_resp.json():
                        distributed += 1
                        if distributed % 50 == 0:
                            self._log("DISTRIBUTE", w["public_key"], raw_per_wallet / (10 ** decimals),
                                      f"Rozdzielono na {distributed}/{len(subs)} portfeli")
                    else:
                        errors += 1
                        err = send_resp.json().get("error", {})
                        if isinstance(err, dict):
                            err = err.get("message", str(err))
                        self._log("ERROR", w["public_key"], 0, str(err)[:80])
                except Exception as e:
                    errors += 1
                    logger.error(f"Token distribute error: {e}")

                await asyncio.sleep(0.5)

        self.stats["phase"] = "idle"
        self.stats["total_holders"] = distributed
        tokens_ui = raw_per_wallet / (10 ** decimals)
        self._log("DONE", "", distributed, f"Rozdzielono tokeny na {distributed} portfeli ({tokens_ui} per wallet)")
        return {
            "success": True,
            "wallets_distributed": distributed,
            "errors": errors,
            "tokens_per_wallet": tokens_ui,
            "total_wallets": len(subs),
        }

    async def collect_sol(self):
        main = await self.db[self.collection_wallets].find_one({"is_main": True}, {"_id": 0})
        if not main:
            return {"error": "No main wallet"}
        subs = await self.db[self.collection_wallets].find({"is_main": {"$ne": True}}, {"_id": 0}).to_list(1000)
        keypairs = [Keypair.from_bytes(base58.b58decode(w["private_key"])) for w in subs]
        return await collect_sol_to_wallet(keypairs, main["public_key"])
