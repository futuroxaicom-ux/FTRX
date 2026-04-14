"""Shared utilities for all bots - wallet management, RPC, Jupiter API"""
import os
import asyncio
import base58
import base64
import json
import httpx
import logging
import random
import math
import time
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import transfer, TransferParams
from solders.transaction import Transaction, VersionedTransaction
from solders.message import Message
from solders.hash import Hash

logger = logging.getLogger(__name__)

SOL_MINT = "So11111111111111111111111111111111111111112"
JUPITER_QUOTE_URL = "https://api.jup.ag/swap/v1/quote"
JUPITER_SWAP_URL = "https://api.jup.ag/swap/v1/swap"
SOLANA_RPC = os.environ.get("SOLANA_RPC_URL", "https://solana.publicnode.com")
HELIUS_KEY = os.environ.get("HELIUS_API_KEY", "")
HELIUS_RPC = f"https://mainnet.helius-rpc.com/?api-key={HELIUS_KEY}" if HELIUS_KEY else ""
LAMPORTS_PER_SOL = 1_000_000_000
TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/tokens"


def get_ata(wallet_pubkey: Pubkey, mint_pubkey: Pubkey) -> Pubkey:
    ata, _bump = Pubkey.find_program_address(
        [bytes(wallet_pubkey), bytes(TOKEN_PROGRAM_ID), bytes(mint_pubkey)],
        ASSOCIATED_TOKEN_PROGRAM_ID,
    )
    return ata


def gauss_amount(min_val, max_val):
    mid = (min_val + max_val) / 2
    std = (max_val - min_val) / 4
    val = random.gauss(mid, std)
    return max(min_val, min(max_val, val))


async def get_token_price(token_mint: str) -> dict:
    """Get token price from DexScreener"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{DEXSCREENER_API}/{token_mint}")
            data = resp.json()
            if "pairs" in data and data["pairs"]:
                pair = data["pairs"][0]
                return {
                    "price_usd": float(pair.get("priceUsd", 0) or 0),
                    "price_native": float(pair.get("priceNative", 0) or 0),
                    "change_24h": float(pair.get("priceChange", {}).get("h24", 0) or 0),
                    "volume_24h": float(pair.get("volume", {}).get("h24", 0) or 0),
                    "liquidity_usd": float(pair.get("liquidity", {}).get("usd", 0) or 0),
                    "pair_address": pair.get("pairAddress", ""),
                    "dex": pair.get("dexId", ""),
                }
        except Exception as e:
            logger.error(f"Price fetch error: {e}")
    return {"price_usd": 0, "price_native": 0, "change_24h": 0, "volume_24h": 0, "liquidity_usd": 0}


async def batch_get_sol_balances(pubkeys: list) -> dict:
    """Batch fetch SOL balances (50 per request)"""
    BATCH = 50
    results = {}
    async with httpx.AsyncClient(timeout=15.0) as client:
        for i in range(0, len(pubkeys), BATCH):
            batch = pubkeys[i:i + BATCH]
            payload = [
                {"jsonrpc": "2.0", "id": idx, "method": "getBalance", "params": [pk]}
                for idx, pk in enumerate(batch)
            ]
            try:
                resp = await client.post(SOLANA_RPC, json=payload)
                data = resp.json()
                if isinstance(data, list):
                    for r in data:
                        rid = r.get("id", 0)
                        if 0 <= rid < len(batch):
                            results[batch[rid]] = r.get("result", {}).get("value", 0) / LAMPORTS_PER_SOL
            except Exception:
                pass
    return results


async def batch_get_token_balances(pubkeys: list, token_mint: str) -> dict:
    """Batch fetch token balances using offline ATA derivation"""
    if not token_mint:
        return {}
    mint = Pubkey.from_string(token_mint)
    ata_map = {}
    for pk in pubkeys:
        try:
            wallet_pub = Pubkey.from_string(pk)
            ata = get_ata(wallet_pub, mint)
            ata_map[str(ata)] = pk
        except Exception:
            pass

    BATCH = 50
    results = {}
    ata_list = list(ata_map.keys())
    async with httpx.AsyncClient(timeout=15.0) as client:
        for i in range(0, len(ata_list), BATCH):
            batch = ata_list[i:i + BATCH]
            payload = [
                {"jsonrpc": "2.0", "id": idx, "method": "getTokenAccountBalance", "params": [ata]}
                for idx, ata in enumerate(batch)
            ]
            try:
                resp = await client.post(SOLANA_RPC, json=payload)
                data = resp.json()
                if isinstance(data, list):
                    for r in data:
                        rid = r.get("id", 0)
                        if 0 <= rid < len(batch):
                            wallet_pk = ata_map[batch[rid]]
                            val = r.get("result", {}).get("value", {})
                            ui_amount = val.get("uiAmount")
                            if ui_amount is not None:
                                results[wallet_pk] = float(ui_amount)
            except Exception:
                pass
    return results


async def jupiter_swap(keypair: Keypair, input_mint: str, output_mint: str, amount_lamports: int, slippage_bps: int) -> dict:
    """Execute a Jupiter swap with dynamic slippage retry"""
    slippages = [slippage_bps, slippage_bps + 500, slippage_bps + 1000]
    pub = str(keypair.pubkey())

    for slip in slippages:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                quote_resp = await client.get(JUPITER_QUOTE_URL, params={
                    "inputMint": input_mint,
                    "outputMint": output_mint,
                    "amount": str(amount_lamports),
                    "slippageBps": slip,
                })
                quote = quote_resp.json()
                if "error" in quote:
                    continue

                swap_resp = await client.post(JUPITER_SWAP_URL, json={
                    "quoteResponse": quote,
                    "userPublicKey": pub,
                    "wrapAndUnwrapSol": True,
                    "dynamicComputeUnitLimit": True,
                    "prioritizationFeeLamports": 10000,
                })
                swap_data = swap_resp.json()
                swap_tx = swap_data.get("swapTransaction")
                if not swap_tx:
                    continue

                raw_tx = base64.b64decode(swap_tx)
                try:
                    tx = VersionedTransaction.from_bytes(raw_tx)
                    tx = VersionedTransaction(tx.message, [keypair])
                except Exception:
                    tx_legacy = Transaction.from_bytes(raw_tx)
                    tx_legacy.sign([keypair])
                    tx = tx_legacy

                encoded = base64.b64encode(bytes(tx)).decode("utf-8")
                send_resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1,
                    "method": "sendTransaction",
                    "params": [encoded, {"skipPreflight": False, "preflightCommitment": "confirmed", "encoding": "base64"}],
                })
                send_data = send_resp.json()
                if "result" in send_data:
                    out_amount = int(quote.get("outAmount", 0))
                    return {"success": True, "tx": send_data["result"], "out_amount": out_amount, "slippage": slip}
                elif "error" in send_data:
                    err = send_data["error"]
                    if isinstance(err, dict) and "Custom" in str(err):
                        continue
                    return {"success": False, "error": str(err)}
        except Exception as e:
            logger.error(f"Jupiter swap error at slippage {slip}: {e}")
            continue

    return {"success": False, "error": "All slippage attempts failed"}


async def distribute_sol_from_wallet(main_keypair: Keypair, targets: list, sol_per_wallet: float) -> dict:
    """Distribute SOL from main wallet to targets (max 20 per tx)"""
    lamports = int(sol_per_wallet * LAMPORTS_PER_SOL)
    main_pub = main_keypair.pubkey()
    success = 0
    failed = 0

    async with httpx.AsyncClient(timeout=30.0) as client:
        for i in range(0, len(targets), 20):
            batch = targets[i:i + 20]
            try:
                bh_resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash",
                    "params": [{"commitment": "confirmed"}],
                })
                bh = Hash.from_string(bh_resp.json()["result"]["value"]["blockhash"])

                ixs = [
                    transfer(TransferParams(from_pubkey=main_pub, to_pubkey=Pubkey.from_string(t), lamports=lamports))
                    for t in batch
                ]
                msg = Message.new_with_blockhash(ixs, main_pub, bh)
                tx = Transaction.new_unsigned(msg)
                tx.sign([main_keypair], bh)
                encoded = base64.b64encode(bytes(tx)).decode("utf-8")

                resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1, "method": "sendTransaction",
                    "params": [encoded, {"skipPreflight": True, "encoding": "base64"}],
                })
                if "result" in resp.json():
                    success += len(batch)
                else:
                    failed += len(batch)
            except Exception as e:
                logger.error(f"Distribute error: {e}")
                failed += len(batch)
            await asyncio.sleep(0.5)

    return {"success": success, "failed": failed}


async def collect_sol_to_wallet(sub_keypairs: list, main_pubkey: str) -> dict:
    """Collect SOL from sub wallets to main"""
    main_pub = Pubkey.from_string(main_pubkey)
    success = 0
    failed = 0
    total_collected = 0.0

    async with httpx.AsyncClient(timeout=30.0) as client:
        for kp in sub_keypairs:
            try:
                bal_resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1, "method": "getBalance",
                    "params": [str(kp.pubkey())],
                })
                balance = bal_resp.json().get("result", {}).get("value", 0)
                send_amount = balance - 5000
                if send_amount <= 0:
                    continue

                bh_resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash",
                    "params": [{"commitment": "confirmed"}],
                })
                bh = Hash.from_string(bh_resp.json()["result"]["value"]["blockhash"])

                ix = transfer(TransferParams(from_pubkey=kp.pubkey(), to_pubkey=main_pub, lamports=send_amount))
                msg = Message.new_with_blockhash([ix], kp.pubkey(), bh)
                tx = Transaction.new_unsigned(msg)
                tx.sign([kp], bh)
                encoded = base64.b64encode(bytes(tx)).decode("utf-8")

                resp = await client.post(SOLANA_RPC, json={
                    "jsonrpc": "2.0", "id": 1, "method": "sendTransaction",
                    "params": [encoded, {"skipPreflight": True, "encoding": "base64"}],
                })
                if "result" in resp.json():
                    success += 1
                    total_collected += send_amount / LAMPORTS_PER_SOL
                else:
                    failed += 1
            except Exception:
                failed += 1
            await asyncio.sleep(0.3)

    return {"success": success, "failed": failed, "total_sol": round(total_collected, 6)}
