from fastapi import FastAPI, APIRouter, Header, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
import time
import asyncio
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from volume_bot import VolumeBot
from spread_bot import SpreadBot
from sniper_bot import SniperBot
from trade_bot import TradeBot
from arbitrage_bot import ArbitrageBot
from copytrade_bot import CopyTradeBot

# Simple in-memory cache for CoinGecko API
class PriceCache:
    def __init__(self, ttl_seconds: int = 60):
        self.ttl = ttl_seconds
        self.price_data: Optional[Dict[str, Any]] = None
        self.price_timestamp: float = 0
        self.chart_data: Optional[Dict[str, Any]] = None
        self.chart_timestamp: float = 0
    
    def get_price(self) -> Optional[Dict[str, Any]]:
        if self.price_data and (time.time() - self.price_timestamp) < self.ttl:
            return self.price_data
        return None
    
    def set_price(self, data: Dict[str, Any]):
        self.price_data = data
        self.price_timestamp = time.time()
    
    def get_chart(self) -> Optional[Dict[str, Any]]:
        if self.chart_data and (time.time() - self.chart_timestamp) < (self.ttl * 5):  # 5 min for chart
            return self.chart_data
        return None
    
    def set_chart(self, data: Dict[str, Any]):
        self.chart_data = data
        self.chart_timestamp = time.time()

# Initialize cache with 60 second TTL for price
price_cache = PriceCache(ttl_seconds=60)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class WhitelistEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    wallet_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WhitelistCreate(BaseModel):
    email: str
    wallet_address: Optional[str] = None
    timestamp: Optional[str] = None

class BotConfigUpdate(BaseModel):
    token_mint: Optional[str] = None
    output_mint: Optional[str] = None
    target_volume_sol: Optional[float] = None
    target_makers: Optional[int] = None
    trade_interval_min: Optional[float] = None
    trade_interval_max: Optional[float] = None
    min_sol_per_trade: Optional[float] = None
    max_sol_per_trade: Optional[float] = None
    slippage_bps: Optional[int] = None
    auto_refund: Optional[bool] = None
    min_wallet_balance: Optional[float] = None

class WalletAdd(BaseModel):
    label: str
    private_key: str

# Initialize volume bot
volume_bot = VolumeBot(db, "bot")

# Initialize volume bot instances for other tokens
volume_bot_2 = VolumeBot(db, "vol2")
volume_bot_3 = VolumeBot(db, "vol3")

# Initialize new bots
spread_bot = SpreadBot(db)
sniper_bot = SniperBot(db)
trade_bot = TradeBot(db)
arbitrage_bot = ArbitrageBot(db)
copytrade_bot = CopyTradeBot(db)

BOT_REGISTRY = {
    "volume": volume_bot,
    "volume2": volume_bot_2,
    "volume3": volume_bot_3,
    "spread": spread_bot,
    "sniper": sniper_bot,
    "trade": trade_bot,
    "arbitrage": arbitrage_bot,
    "copytrade": copytrade_bot,
}

# Admin auth helper
def verify_admin(password: str):
    admin_pw = os.environ.get("ADMIN_PASSWORD", "")
    if not admin_pw or password != admin_pw:
        raise HTTPException(status_code=401, detail="Unauthorized")

# Admin endpoints
@api_router.post("/admin/login")
async def admin_login(body: dict):
    admin_pw = os.environ.get("ADMIN_PASSWORD", "")
    if body.get("password") == admin_pw:
        return {"success": True}
    raise HTTPException(status_code=401, detail="Invalid password")

@api_router.get("/admin/bot/status")
async def bot_status(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return volume_bot.get_status()

@api_router.post("/admin/bot/start")
async def bot_start(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    result = await volume_bot.start()
    return {"success": result, "message": "Bot started" if result else "Bot already running"}

@api_router.post("/admin/bot/stop")
async def bot_stop(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    result = await volume_bot.stop()
    return {"success": result, "message": "Bot stopped"}

@api_router.post("/admin/bot/config")
async def bot_config(config: BotConfigUpdate, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    updated = volume_bot.update_config(config.model_dump(exclude_none=True))
    await volume_bot.save_config()
    return {"success": True, "config": updated}

@api_router.get("/admin/bot/costs")
async def bot_costs(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return volume_bot.estimate_costs()

@api_router.get("/admin/wallets")
async def get_wallets(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    wallets = await volume_bot.get_wallets_info()
    return {"wallets": wallets}

@api_router.post("/admin/wallets")
async def add_wallet(wallet: WalletAdd, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    result = await volume_bot.add_wallet(wallet.label, wallet.private_key)
    return result

@api_router.delete("/admin/wallets/{public_key}")
async def remove_wallet(public_key: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    result = await volume_bot.remove_wallet(public_key)
    return result

@api_router.post("/admin/wallets/{public_key}/main")
async def set_main_wallet(public_key: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    result = await volume_bot.set_main_wallet(public_key)
    return result

class GenerateWalletsRequest(BaseModel):
    count: int = 10
    prefix: str = "Bot"

@api_router.post("/admin/wallets/generate")
async def generate_wallets(req: GenerateWalletsRequest, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    result = await volume_bot.generate_wallets(req.count, req.prefix)
    return result

class DistributeRequest(BaseModel):
    sol_per_wallet: float

# Track background tasks status
distribute_status = {"running": False, "result": None}
collect_status = {"running": False, "result": None}
collect_ftrx_status = {"running": False, "result": None}

@api_router.post("/admin/wallets/distribute")
async def distribute_sol(req: DistributeRequest, x_admin_password: str = Header(None), background_tasks: BackgroundTasks = None):
    verify_admin(x_admin_password)
    if distribute_status["running"]:
        return {"error": "Distribution already in progress", "status": distribute_status}

    async def run_distribute():
        distribute_status["running"] = True
        distribute_status["result"] = None
        try:
            result = await volume_bot.distribute_sol(req.sol_per_wallet)
            distribute_status["result"] = result
        except Exception as e:
            distribute_status["result"] = {"error": str(e)}
        distribute_status["running"] = False

    asyncio.create_task(run_distribute())
    return {"success": True, "message": f"Distributing to sub-wallets... ({req.sol_per_wallet} SOL each)"}

@api_router.get("/admin/wallets/distribute/status")
async def distribute_sol_status(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return distribute_status

@api_router.post("/admin/wallets/collect")
async def collect_sol(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if collect_status["running"]:
        return {"error": "Collection already in progress", "status": collect_status}

    async def run_collect():
        collect_status["running"] = True
        collect_status["result"] = None
        try:
            result = await volume_bot.collect_sol()
            collect_status["result"] = result
        except Exception as e:
            collect_status["result"] = {"error": str(e)}
        collect_status["running"] = False

    asyncio.create_task(run_collect())
    return {"success": True, "message": "Collecting SOL from sub-wallets..."}

@api_router.get("/admin/wallets/collect/status")
async def collect_sol_status(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return collect_status

@api_router.post("/admin/wallets/collect-ftrx")
async def collect_ftrx(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if collect_ftrx_status["running"]:
        return {"error": "FTRX collection already in progress", "status": collect_ftrx_status}

    async def run_collect_ftrx():
        collect_ftrx_status["running"] = True
        collect_ftrx_status["result"] = None
        try:
            result = await volume_bot.collect_ftrx()
            collect_ftrx_status["result"] = result
        except Exception as e:
            collect_ftrx_status["result"] = {"error": str(e)}
        collect_ftrx_status["running"] = False

    asyncio.create_task(run_collect_ftrx())
    return {"success": True, "message": "Collecting FTRX tokens from sub-wallets..."}

@api_router.get("/admin/wallets/collect-ftrx/status")
async def collect_ftrx_status_endpoint(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return collect_ftrx_status

refresh_ftrx_status = {"running": False, "result": None}

@api_router.post("/admin/wallets/refresh-ftrx")
async def refresh_ftrx(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if refresh_ftrx_status["running"]:
        return {"error": "Refresh already in progress"}

    async def run_refresh():
        refresh_ftrx_status["running"] = True
        try:
            result = await volume_bot.refresh_ftrx_balances()
            refresh_ftrx_status["result"] = result
        except Exception as e:
            refresh_ftrx_status["result"] = {"error": str(e)}
        refresh_ftrx_status["running"] = False

    asyncio.create_task(run_refresh())
    return {"success": True, "message": "Refreshing FTRX balances..."}


@api_router.post("/admin/wallets/send-sol")
async def send_sol_to_wallet(body: dict, x_admin_password: str = Header(None)):
    """Send SOL from main wallet to a specific sub wallet"""
    verify_admin(x_admin_password)
    target_pk = body.get("public_key", "")
    amount = body.get("amount", 0)
    if not target_pk or amount <= 0:
        raise HTTPException(status_code=400, detail="public_key and amount required")
    main = await db[volume_bot.wallets_collection].find_one({"is_main": True}, {"_id": 0})
    if not main:
        return {"error": "No main wallet"}
    from bot_utils import distribute_sol_from_wallet
    kp = Keypair.from_bytes(base58.b58decode(main["private_key"]))
    result = await distribute_sol_from_wallet(kp, [target_pk], amount)
    return {"success": result.get("success", 0) > 0, "result": result}

_token_collect_status = {"running": False, "result": None}
_token_distribute_status = {"running": False, "result": None}

@api_router.post("/admin/wallets/collect-tokens")
async def collect_tokens_to_main(x_admin_password: str = Header(None)):
    """Collect ALL tokens from sub wallets to main (direct SPL transfer)"""
    verify_admin(x_admin_password)
    if _token_collect_status["running"]:
        return {"error": "Already running"}
    async def run():
        _token_collect_status["running"] = True
        _token_collect_status["result"] = await volume_bot.collect_tokens_to_main()
        _token_collect_status["running"] = False
    asyncio.create_task(run())
    return {"success": True, "message": "Collecting tokens to main wallet..."}

@api_router.get("/admin/wallets/collect-tokens/status")
async def collect_tokens_status(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return _token_collect_status

@api_router.post("/admin/wallets/distribute-tokens")
async def distribute_tokens(body: dict, x_admin_password: str = Header(None)):
    """Distribute tokens from main to sub wallets (direct SPL transfer)"""
    verify_admin(x_admin_password)
    if _token_distribute_status["running"]:
        return {"error": "Already running"}
    tokens_per_wallet = body.get("tokens_per_wallet", 0)
    async def run():
        _token_distribute_status["running"] = True
        _token_distribute_status["result"] = await volume_bot.distribute_tokens(tokens_per_wallet)
        _token_distribute_status["running"] = False
    asyncio.create_task(run())
    return {"success": True, "message": "Distributing tokens..."}

@api_router.get("/admin/wallets/distribute-tokens/status")
async def distribute_tokens_status(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return _token_distribute_status


@api_router.post("/admin/wallets/cleanup")
async def cleanup_wallets(body: dict, x_admin_password: str = Header(None)):
    """Delete empty wallets, keep N wallets + main"""
    verify_admin(x_admin_password)
    keep_count = body.get("keep_count", 25)
    wallets = await db[volume_bot.wallets_collection].find({}, {"_id": 0}).to_list(500)
    main = next((w for w in wallets if w.get("is_main")), None)
    subs = [w for w in wallets if not w.get("is_main")]
    
    # Sort by SOL balance descending - keep the richest
    from bot_utils import batch_get_sol_balances
    pubs = [w["public_key"] for w in subs]
    bals = await batch_get_sol_balances(pubs)
    for w in subs:
        w["_sol"] = bals.get(w["public_key"], 0)
    subs.sort(key=lambda x: x["_sol"], reverse=True)
    
    keep = subs[:keep_count]
    delete = subs[keep_count:]
    
    deleted = 0
    for w in delete:
        await db[volume_bot.wallets_collection].delete_one({"public_key": w["public_key"]})
        deleted += 1
    
    return {"deleted": deleted, "remaining": keep_count + 1, "message": f"Deleted {deleted} wallets, kept {keep_count} + main"}


# ========== GENERIC BOT ENDPOINTS (spread, sniper, trade, arbitrage, copytrade) ==========

def _get_bot(bot_type: str):
    bot = BOT_REGISTRY.get(bot_type)
    if not bot:
        raise HTTPException(status_code=404, detail=f"Bot type '{bot_type}' not found")
    return bot

@api_router.get("/admin/bots")
async def list_bots(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    bots = []
    for name, bot in BOT_REGISTRY.items():
        bots.append({
            "type": name,
            "running": bot.running,
            "has_wallets": True,
        })
    return {"bots": bots}

@api_router.get("/admin/bot/{bot_type}/status")
async def generic_bot_status(bot_type: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if bot_type == "volume":
        return volume_bot.get_status()
    bot = _get_bot(bot_type)
    if bot_type in ("volume2", "volume3"):
        return bot.get_status()
    return await bot.get_status_async()

@api_router.post("/admin/bot/{bot_type}/start")
async def generic_bot_start(bot_type: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if bot_type in ("volume", "volume2", "volume3"):
        bot = BOT_REGISTRY[bot_type]
        result = await bot.start()
        return {"success": result, "message": f"{bot_type} started" if result else "Already running or no token"}
    bot = _get_bot(bot_type)
    result = await bot.start()
    return {"success": result, "message": f"{bot_type} bot started" if result else f"{bot_type} bot already running or no token configured"}

@api_router.post("/admin/bot/{bot_type}/stop")
async def generic_bot_stop(bot_type: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if bot_type in ("volume", "volume2", "volume3"):
        bot = BOT_REGISTRY[bot_type]
        result = await bot.stop()
        return {"success": result}
    bot = _get_bot(bot_type)
    result = await bot.stop()
    return {"success": result}

@api_router.post("/admin/bot/{bot_type}/config")
async def generic_bot_config(bot_type: str, config: dict, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if bot_type in ("volume", "volume2", "volume3"):
        bot = BOT_REGISTRY[bot_type]
        updated = bot.update_config(config)
        await bot.save_config()
        return {"success": True, "config": updated}
    bot = _get_bot(bot_type)
    updated = bot.update_config(config)
    await bot.save_config()
    return {"success": True, "config": updated}

@api_router.get("/admin/bot/{bot_type}/wallets")
async def generic_bot_wallets(bot_type: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if bot_type in ("volume", "volume2", "volume3"):
        bot = BOT_REGISTRY[bot_type]
        wallets = await bot.get_wallets_info()
        return {"wallets": wallets}
    bot = _get_bot(bot_type)
    wallets = await bot.get_wallets_info()
    return {"wallets": wallets}

@api_router.post("/admin/bot/{bot_type}/wallets/generate")
async def generic_bot_generate(bot_type: str, req: GenerateWalletsRequest, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if bot_type == "volume":
        return await volume_bot.generate_wallets(req.count, req.prefix)
    bot = _get_bot(bot_type)
    return await bot.generate_wallets(req.count, req.prefix)

@api_router.post("/admin/bot/{bot_type}/wallets/{public_key}/main")
async def generic_bot_set_main(bot_type: str, public_key: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if bot_type == "volume":
        return await volume_bot.set_main_wallet(public_key)
    bot = _get_bot(bot_type)
    return await bot.set_main_wallet(public_key)

@api_router.delete("/admin/bot/{bot_type}/wallets/{public_key}")
async def generic_bot_remove_wallet(bot_type: str, public_key: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if bot_type == "volume":
        return await volume_bot.remove_wallet(public_key)
    bot = _get_bot(bot_type)
    return await bot.remove_wallet(public_key)

_bot_distribute_status = {}
_bot_collect_status = {}

@api_router.post("/admin/bot/{bot_type}/wallets/distribute")
async def generic_bot_distribute(bot_type: str, req: DistributeRequest, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if bot_type == "volume":
        return await distribute_sol(req, x_admin_password)
    bot = _get_bot(bot_type)
    key = bot_type
    if _bot_distribute_status.get(key, {}).get("running"):
        return {"error": "Distribution already in progress"}

    async def run():
        _bot_distribute_status[key] = {"running": True, "result": None}
        try:
            result = await bot.distribute_sol(req.sol_per_wallet)
            _bot_distribute_status[key]["result"] = result
        except Exception as e:
            _bot_distribute_status[key]["result"] = {"error": str(e)}
        _bot_distribute_status[key]["running"] = False

    asyncio.create_task(run())
    return {"success": True, "message": f"Distributing SOL to {bot_type} wallets..."}

@api_router.get("/admin/bot/{bot_type}/wallets/distribute/status")
async def generic_bot_distribute_status(bot_type: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return _bot_distribute_status.get(bot_type, {"running": False, "result": None})

@api_router.post("/admin/bot/{bot_type}/wallets/collect")
async def generic_bot_collect(bot_type: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    if bot_type == "volume":
        return await collect_sol(x_admin_password)
    bot = _get_bot(bot_type)
    key = bot_type
    if _bot_collect_status.get(key, {}).get("running"):
        return {"error": "Collection already in progress"}

    async def run():
        _bot_collect_status[key] = {"running": True, "result": None}
        try:
            result = await bot.collect_sol()
            _bot_collect_status[key]["result"] = result
        except Exception as e:
            _bot_collect_status[key]["result"] = {"error": str(e)}
        _bot_collect_status[key]["running"] = False

    asyncio.create_task(run())
    return {"success": True, "message": f"Collecting SOL from {bot_type} wallets..."}

@api_router.get("/admin/bot/{bot_type}/wallets/collect/status")
async def generic_bot_collect_status(bot_type: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return _bot_collect_status.get(bot_type, {"running": False, "result": None})

_bot_token_distribute_status = {}
_bot_token_collect_status = {}

@api_router.post("/admin/bot/{bot_type}/wallets/distribute-tokens")
async def generic_bot_distribute_tokens(bot_type: str, body: dict, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    bot = _get_bot(bot_type)
    key = f"{bot_type}_tokens"
    if _bot_token_distribute_status.get(key, {}).get("running"):
        return {"error": "Already running"}
    tokens_per_wallet = body.get("tokens_per_wallet", 0)
    async def run():
        _bot_token_distribute_status[key] = {"running": True, "result": None}
        try:
            result = await bot.distribute_tokens(tokens_per_wallet)
            _bot_token_distribute_status[key]["result"] = result
        except Exception as e:
            _bot_token_distribute_status[key]["result"] = {"error": str(e)}
        _bot_token_distribute_status[key]["running"] = False
    asyncio.create_task(run())
    return {"success": True, "message": f"Distributing tokens to {bot_type} wallets..."}

@api_router.get("/admin/bot/{bot_type}/wallets/distribute-tokens/status")
async def generic_bot_distribute_tokens_status(bot_type: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return _bot_token_distribute_status.get(f"{bot_type}_tokens", {"running": False, "result": None})

@api_router.post("/admin/bot/{bot_type}/wallets/collect-tokens")
async def generic_bot_collect_tokens(bot_type: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    bot = _get_bot(bot_type)
    key = f"{bot_type}_tokens"
    if _bot_token_collect_status.get(key, {}).get("running"):
        return {"error": "Already running"}
    async def run():
        _bot_token_collect_status[key] = {"running": True, "result": None}
        try:
            result = await bot.collect_tokens_to_main()
            _bot_token_collect_status[key]["result"] = result
        except Exception as e:
            _bot_token_collect_status[key]["result"] = {"error": str(e)}
        _bot_token_collect_status[key]["running"] = False
    asyncio.create_task(run())
    return {"success": True, "message": f"Collecting tokens from {bot_type} wallets..."}

@api_router.get("/admin/bot/{bot_type}/wallets/collect-tokens/status")
async def generic_bot_collect_tokens_status(bot_type: str, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return _bot_token_collect_status.get(f"{bot_type}_tokens", {"running": False, "result": None})

@api_router.post("/admin/bot/{bot_type}/wallets/withdraw-tokens")
async def generic_bot_withdraw_tokens(bot_type: str, body: dict, x_admin_password: str = Header(None)):
    """Withdraw tokens from main wallet to external address"""
    verify_admin(x_admin_password)
    dest_address = body.get("destination", "")
    token_mint_override = body.get("token_mint", "")
    if not dest_address:
        raise HTTPException(status_code=400, detail="destination address required")
    bot = _get_bot(bot_type)
    
    import base58 as b58
    from solders.keypair import Keypair as Kp
    from solders.pubkey import Pubkey as Pk
    from solders.transaction import Transaction as Tx
    from solders.message import Message as Msg
    from solders.hash import Hash as Hs
    from solders.instruction import Instruction as Ix, AccountMeta as AM
    
    TP = Pk.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    ATP = Pk.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    SYS = Pk.from_string("11111111111111111111111111111111")
    
    def derive_ata(wallet, mint):
        ata, _ = Pk.find_program_address([bytes(wallet), bytes(TP), bytes(mint)], ATP)
        return ata
    
    main_w = await db[bot.wallets_collection].find_one({"is_main": True})
    if not main_w:
        return {"error": "No main wallet"}
    
    kp = Kp.from_bytes(b58.b58decode(main_w["private_key"]))
    main_pub = kp.pubkey()
    
    mint_str = token_mint_override or bot.config.get("token_mint", "")
    if not mint_str:
        return {"error": "No token mint"}
    
    mint_pub = Pk.from_string(mint_str)
    dest_pub = Pk.from_string(dest_address)
    source_ata = derive_ata(main_pub, mint_pub)
    dest_ata = derive_ata(dest_pub, mint_pub)
    
    RPC = "https://api.mainnet-beta.solana.com"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(RPC, json={
            "jsonrpc": "2.0", "id": 1,
            "method": "getTokenAccountBalance",
            "params": [str(source_ata)],
        })
        data = resp.json()
        if "error" in data:
            return {"error": f"No token account: {data['error']}"}
        raw_amount = int(data["result"]["value"]["amount"])
        ui_amount = data["result"]["value"].get("uiAmountString", "0")
        if raw_amount <= 0:
            return {"error": "No tokens to withdraw"}
        
        create_ata_ix = Ix(
            program_id=ATP,
            accounts=[
                AM(pubkey=main_pub, is_signer=True, is_writable=True),
                AM(pubkey=dest_ata, is_signer=False, is_writable=True),
                AM(pubkey=dest_pub, is_signer=False, is_writable=False),
                AM(pubkey=mint_pub, is_signer=False, is_writable=False),
                AM(pubkey=SYS, is_signer=False, is_writable=False),
                AM(pubkey=TP, is_signer=False, is_writable=False),
            ],
            data=bytes([1]),
        )
        
        transfer_data = bytes([3]) + raw_amount.to_bytes(8, "little")
        transfer_ix = Ix(
            program_id=TP,
            accounts=[
                AM(pubkey=source_ata, is_signer=False, is_writable=True),
                AM(pubkey=dest_ata, is_signer=False, is_writable=True),
                AM(pubkey=main_pub, is_signer=True, is_writable=False),
            ],
            data=transfer_data,
        )
        
        bh_resp = await client.post(RPC, json={
            "jsonrpc": "2.0", "id": 1, "method": "getLatestBlockhash",
            "params": [{"commitment": "finalized"}],
        })
        bh = Hs.from_string(bh_resp.json()["result"]["value"]["blockhash"])
        
        msg = Msg.new_with_blockhash([create_ata_ix, transfer_ix], main_pub, bh)
        tx = Tx.new_unsigned(msg)
        tx.sign([kp], bh)
        import base64
        encoded = base64.b64encode(bytes(tx)).decode("utf-8")
        
        send_resp = await client.post(RPC, json={
            "jsonrpc": "2.0", "id": 1, "method": "sendTransaction",
            "params": [encoded, {"encoding": "base64", "skipPreflight": False, "preflightCommitment": "confirmed"}],
        })
        send_data = send_resp.json()
        if "error" in send_data:
            return {"error": f"TX failed: {send_data['error']}"}
        
        sig = send_data.get("result", "")
        return {
            "success": True,
            "signature": sig,
            "amount": ui_amount,
            "token_mint": mint_str,
            "destination": dest_address,
            "solscan": f"https://solscan.io/tx/{sig}",
        }

# Sniper bot specific endpoints
@api_router.post("/admin/bot/sniper/sell")
async def sniper_manual_sell(body: dict, x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    token_mint = body.get("token_mint", "")
    wallet = body.get("wallet", "")
    if not token_mint:
        raise HTTPException(status_code=400, detail="token_mint required")
    return await sniper_bot.manual_sell(token_mint, wallet)

@api_router.get("/admin/bot/sniper/holdings")
async def sniper_holdings(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    holdings = await sniper_bot.get_holdings()
    return {"holdings": holdings}

@api_router.get("/admin/bot/sniper/history")
async def sniper_history(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    history = await db.sniper_bot_history.find({}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return {"history": history}

# Holder Bot specific endpoints
_holder_distribute_tokens_status = {"running": False, "result": None}

@api_router.post("/admin/bot/holder/distribute-tokens")
async def holder_distribute_tokens(body: dict, x_admin_password: str = Header(None)):
    """Distribute tokens from main wallet to all sub-wallets (creates holders)"""
    verify_admin(x_admin_password)
    if _holder_distribute_tokens_status["running"]:
        return {"error": "Already running"}
    tokens_per_wallet = body.get("tokens_per_wallet", 0)
    async def run():
        _holder_distribute_tokens_status["running"] = True
        _holder_distribute_tokens_status["result"] = None
        try:
            result = await holder_bot.distribute_tokens_to_holders(tokens_per_wallet)
            _holder_distribute_tokens_status["result"] = result
        except Exception as e:
            _holder_distribute_tokens_status["result"] = {"error": str(e)}
        _holder_distribute_tokens_status["running"] = False
    asyncio.create_task(run())
    return {"success": True, "message": "Distributing tokens to holders..."}

@api_router.get("/admin/bot/holder/distribute-tokens/status")
async def holder_distribute_tokens_status(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    return _holder_distribute_tokens_status

@api_router.post("/admin/bot/holder/collect-tokens")
async def holder_collect_tokens(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    async def run():
        return await holder_bot.collect_all_tokens()
    result = await run()
    return result

@api_router.post("/admin/bot/holder/close-accounts")
async def holder_close_accounts(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    async def run():
        return await holder_bot.close_accounts_and_recover()
    result = await run()
    return result

# ========== ANALYTICS ==========
from datetime import datetime

@api_router.post("/analytics/visit")
async def log_visit(body: dict):
    """Log page visit - called from frontend"""
    doc = {
        "page": body.get("page", "/"),
        "referrer": body.get("referrer", "direct"),
        "source": body.get("source", "direct"),
        "user_agent": body.get("user_agent", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.analytics_visits.insert_one(doc)
    return {"ok": True}

@api_router.post("/analytics/chat")
async def log_chat(body: dict):
    """Log chatbot question"""
    doc = {
        "question": body.get("question", ""),
        "answer": body.get("answer", "")[:200],
        "language": body.get("language", "en"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.analytics_chats.insert_one(doc)
    return {"ok": True}

@api_router.get("/admin/analytics")
async def get_analytics(x_admin_password: str = Header(None)):
    verify_admin(x_admin_password)
    
    # Visits
    visits = await db.analytics_visits.find({}, {"_id": 0}).sort("timestamp", -1).to_list(500)
    
    # Chat questions
    chats = await db.analytics_chats.find({}, {"_id": 0}).sort("timestamp", -1).to_list(200)
    
    # Aggregate sources
    sources = {}
    pages = {}
    daily = {}
    for v in visits:
        src = v.get("source", "direct")
        sources[src] = sources.get(src, 0) + 1
        pg = v.get("page", "/")
        pages[pg] = pages.get(pg, 0) + 1
        day = v.get("timestamp", "")[:10]
        daily[day] = daily.get(day, 0) + 1
    
    # Top chat questions
    questions = {}
    for c in chats:
        q = c.get("question", "").strip().lower()[:100]
        if q:
            questions[q] = questions.get(q, 0) + 1
    top_questions = sorted(questions.items(), key=lambda x: -x[1])[:20]
    
    return {
        "total_visits": len(visits),
        "sources": sources,
        "pages": pages,
        "daily_visits": daily,
        "total_chats": len(chats),
        "top_questions": [{"question": q, "count": c} for q, c in top_questions],
        "recent_chats": chats[:20],
        "recent_visits": visits[:20],
    }

# Solana RPC proxy - avoids browser CORS/403 issues
@api_router.post("/solana/rpc")
async def solana_rpc_proxy(body: dict):
    rpcs = [
        "https://solana.publicnode.com",
        "https://api.mainnet-beta.solana.com",
    ]
    async with httpx.AsyncClient() as client:
        for rpc in rpcs:
            try:
                resp = await client.post(rpc, json=body, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json()
                    if "error" not in data or data.get("result"):
                        return data
            except Exception:
                continue
    return {"error": "All RPC endpoints failed"}

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# CoinGecko Proxy endpoints with caching to avoid rate limits
@api_router.get("/crypto/price")
async def get_crypto_price():
    """Get current Solana price from CoinGecko (cached for 60 seconds)"""
    # Check cache first
    cached = price_cache.get_price()
    if cached:
        return cached
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": "solana",
                    "vs_currencies": "usd",
                    "include_24hr_change": "true"
                },
                timeout=10.0
            )
            data = response.json()
            # Cache the result
            if "solana" in data:
                price_cache.set_price(data)
            return data
        except Exception as e:
            logger.error(f"CoinGecko API error: {e}")
            # Return cached data if available, even if expired
            if price_cache.price_data:
                return price_cache.price_data
            return {"error": str(e)}

@api_router.get("/crypto/chart")
async def get_crypto_chart():
    """Get 7-day price history for Solana from CoinGecko (cached for 5 minutes)"""
    # Check cache first
    cached = price_cache.get_chart()
    if cached:
        return cached
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://api.coingecko.com/api/v3/coins/solana/market_chart",
                params={
                    "vs_currency": "usd",
                    "days": "7",
                    "interval": "daily"
                },
                timeout=10.0
            )
            data = response.json()
            # Cache the result
            if "prices" in data:
                price_cache.set_chart(data)
            return data
        except Exception as e:
            logger.error(f"CoinGecko API error: {e}")
            # Return cached data if available, even if expired
            if price_cache.chart_data:
                return price_cache.chart_data
            return {"error": str(e)}

# FTRX Token Price API
FTRX_TOKEN_ADDRESS = "CLNBpgy9dkAEZawHo4hpANeFBdkJfagT7o6byDwGFtrx"

FTRX_PAIR_ADDRESS = "HvaXgLZP28ATMMmqNAyL2MM3ob3HC7XyCJZcrqH7dkyC"
GECKO_BASE = "https://api.geckoterminal.com/api/v2/networks/solana/pools"

@api_router.get("/ftrx/price")
async def get_ftrx_price():
    """Get FTRX token price from GeckoTerminal (no API key needed)"""
    async with httpx.AsyncClient() as client:
        try:
            # Fetch current price + pool info
            pool_resp = await client.get(f"{GECKO_BASE}/{FTRX_PAIR_ADDRESS}", timeout=15.0)
            pool_data = pool_resp.json()
            attrs = pool_data.get("data", {}).get("attributes", {})
            price = float(attrs.get("base_token_price_usd") or 0)
            change24h = float((attrs.get("price_change_percentage") or {}).get("h24") or 0)

            # Fetch 7-day OHLCV chart data
            ohlcv_resp = await client.get(
                f"{GECKO_BASE}/{FTRX_PAIR_ADDRESS}/ohlcv/day?limit=7",
                timeout=15.0
            )
            ohlcv_data = ohlcv_resp.json()
            ohlcv_list = ohlcv_data.get("data", {}).get("attributes", {}).get("ohlcv_list", [])

            chart_data = []
            for candle in ohlcv_list:
                # candle: [timestamp, open, high, low, close, volume]
                ts, _, _, _, close, _ = candle
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                chart_data.append({
                    "time": dt.strftime("%b %d"),
                    "price": round(float(close), 8)
                })

            # If chart is empty but we have current price, generate a single point
            if not chart_data and price > 0:
                chart_data = [{"time": datetime.now(timezone.utc).strftime("%b %d"), "price": price}]

            return {
                "price": price,
                "change24h": change24h,
                "chartData": chart_data,
                "source": "GeckoTerminal",
                "pairAddress": FTRX_PAIR_ADDRESS,
                "dexId": "dexlab"
            }

        except Exception as e:
            logger.error(f"GeckoTerminal API error: {e}")
            chart_data = []
            for i in range(7):
                dt = datetime.now(timezone.utc) - timedelta(days=6-i)
                chart_data.append({"time": dt.strftime("%b %d"), "price": 0.1016 * (1 + i * 0.005)})
            return {
                "price": 0.1016,
                "change24h": 0,
                "chartData": chart_data,
                "source": "fallback",
                "message": str(e)
            }

@api_router.get("/solana/balance/{address}")
async def get_solana_balance(address: str):
    """Get SOL balance for a wallet address"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.mainnet-beta.solana.com",
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getBalance",
                    "params": [address]
                },
                headers={"Content-Type": "application/json"},
                timeout=15.0
            )
            data = response.json()
            if "result" in data and "value" in data["result"]:
                lamports = data["result"]["value"]
                sol = lamports / 1_000_000_000  # Convert lamports to SOL
                return {"address": address, "lamports": lamports, "sol": sol}
            return {"error": "Invalid response from Solana RPC", "raw": data}
        except Exception as e:
            logger.error(f"Solana balance error: {e}")
            return {"error": str(e)}

# Update request models
class UpdateRequestCreate(BaseModel):
    email: str
    wallet_address: str

class UpdateRequestEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    wallet_address: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Update request endpoints
@api_router.post("/update-request")
async def submit_update_request(req: UpdateRequestCreate):
    """Submit FTRX V1 -> V2 update request"""
    existing = await db.update_requests.find_one({"email": req.email}, {"_id": 0})
    if existing:
        return {"success": False, "detail": "Ten email został już zarejestrowany"}
    entry = UpdateRequestEntry(email=req.email, wallet_address=req.wallet_address)
    doc = entry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.update_requests.insert_one(doc)
    return {"success": True, "message": "Wniosek o aktualizację złożony pomyślnie"}

@api_router.get("/admin/update-requests")
async def get_update_requests(x_admin_password: str = Header(None)):
    """Get all FTRX update requests"""
    verify_admin(x_admin_password)
    cursor = db.update_requests.find({}, {"_id": 0}).sort("created_at", -1)
    entries = await cursor.to_list(length=1000)
    return {"requests": entries, "total": len(entries)}

@api_router.post("/admin/add-update-request")
async def admin_add_update_request(body: dict, x_admin_password: str = Header(None)):
    """Manually add an update request entry (admin only)"""
    verify_admin(x_admin_password)
    email = (body.get("email") or "").strip()
    wallet_address = (body.get("wallet_address") or "").strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Nieprawidłowy adres email")
    if not wallet_address or len(wallet_address) < 32:
        raise HTTPException(status_code=400, detail="Nieprawidłowy adres portfela Solana")
    existing = await db.update_requests.find_one({"email": email}, {"_id": 0})
    if existing:
        return {"success": False, "detail": "Ten email już istnieje w bazie", "entry": existing}
    entry = UpdateRequestEntry(email=email, wallet_address=wallet_address)
    doc = entry.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.update_requests.insert_one(doc)
    return {"success": True, "entry": {k: v for k, v in doc.items() if k != "_id"}}

def _build_update_email_html(entry_id: str, email: str, wallet: str) -> str:
    _replit_domain = os.environ.get("REPLIT_DEV_DOMAIN", "")
    _frontend_base = os.environ.get("FRONTEND_BASE_URL") or (f"https://{_replit_domain}" if _replit_domain else "https://futuroxai.com")
    declaration_link = f"{_frontend_base}/declaration/{entry_id}"
    deposit_address = "CCBLgadVU7orDytcaffTTznsT58xXQ4gN8p8Xtn5tKP2"
    return f"""<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Instrukcje migracji FTRX</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;color:#e0e0e0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:8px;overflow:hidden;max-width:600px;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0a0a0a 0%,#111 100%);padding:28px 32px;border-bottom:1px solid #1a1a1a;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td>
        <div style="display:inline-block;background:#00FFD1;color:#000;font-weight:900;font-size:12px;padding:6px 10px;border-radius:2px;letter-spacing:1px;">FTRX</div>
        <span style="color:#fff;font-size:20px;font-weight:700;margin-left:10px;vertical-align:middle;">FuturoX AI</span>
      </td>
    </tr>
    </table>
  </td></tr>
  <!-- Title -->
  <tr><td style="padding:28px 32px 0 32px;">
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:#fff;">Instrukcje migracji FTRX → FTRX v2</h1>
    <p style="margin:0;color:#888;font-size:14px;">Szanowny Użytkowniku,</p>
  </td></tr>
  <!-- Intro -->
  <tr><td style="padding:16px 32px;">
    <p style="margin:0;color:#ccc;font-size:14px;line-height:1.7;">
      Dziękujemy za rejestrację do migracji tokena FTRX. Poniżej znajdziesz oficjalne instrukcje dotyczące aktualizacji.
    </p>
  </td></tr>
  <!-- Divider -->
  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #222;"></div></td></tr>
  <!-- Rule -->
  <tr><td style="padding:20px 32px 0 32px;">
    <h2 style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#FFD700;">Zasada aktualizacji</h2>
    <p style="margin:0;color:#ccc;font-size:14px;line-height:1.7;">
      Migracja w stosunku <strong style="color:#fff;">1:1</strong> – każdy token FTRX v1 zostanie wymieniony na aktualną i obowiązującą wersję FTRX v2.
    </p>
  </td></tr>
  <!-- Step 1 -->
  <tr><td style="padding:20px 32px 0 32px;">
    <h2 style="margin:0 0 10px 0;font-size:15px;font-weight:700;color:#00FFD1;">Krok 1 — Depozyt FTRX</h2>
    <p style="margin:0 0 12px 0;color:#ccc;font-size:14px;line-height:1.7;">
      Prześlij posiadaną ilość FTRX na oficjalny adres depozytowy projektu:
    </p>
    <div style="background:#0d0d0d;border:1px solid #00FFD1;border-radius:6px;padding:14px 16px;">
      <p style="margin:0;font-family:'Courier New',monospace;font-size:13px;color:#00FFD1;word-break:break-all;letter-spacing:0.5px;">{deposit_address}</p>
    </div>
  </td></tr>
  <!-- Step 2 -->
  <tr><td style="padding:20px 32px 0 32px;">
    <h2 style="margin:0 0 10px 0;font-size:15px;font-weight:700;color:#00FFD1;">Krok 2 — Podpisanie oświadczenia</h2>
    <p style="margin:0 0 16px 0;color:#ccc;font-size:14px;line-height:1.7;">
      Po wykonaniu transferu wypełnij elektroniczne oświadczenie migracyjne pod poniższym indywidualnym linkiem:
    </p>
    <table cellpadding="0" cellspacing="0">
      <tr><td style="background:#FFD700;border-radius:4px;padding:12px 24px;">
        <a href="{declaration_link}" style="color:#000;font-weight:800;font-size:14px;text-decoration:none;">PRZEJDŹ DO OŚWIADCZENIA →</a>
      </td></tr>
    </table>
    <p style="margin:14px 0 0 0;color:#555;font-size:12px;">Lub skopiuj link: <span style="color:#888;">{declaration_link}</span></p>
  </td></tr>
  <!-- Sales schedule -->
  <tr><td style="padding:20px 32px 0 32px;">
    <h2 style="margin:0 0 10px 0;font-size:15px;font-weight:700;color:#AA44FF;">Oficjalne kanały sprzedaży FTRX v2</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #222;border-radius:6px;overflow:hidden;">
      <tr style="background:#1a1a1a;"><td style="padding:10px 14px;color:#888;font-size:12px;border-bottom:1px solid #222;font-weight:700;">Od</td><td style="padding:10px 14px;color:#888;font-size:12px;border-bottom:1px solid #222;font-weight:700;">Platforma</td></tr>
      <tr style="background:#111;"><td style="padding:10px 14px;color:#FFD700;font-size:13px;font-weight:700;border-bottom:1px solid #1a1a1a;">01.06.2026</td><td style="padding:10px 14px;color:#fff;font-size:13px;border-bottom:1px solid #1a1a1a;">PureXchange.io</td></tr>
      <tr style="background:#111;"><td style="padding:10px 14px;color:#FFD700;font-size:13px;font-weight:700;border-bottom:1px solid #1a1a1a;">20.06.2026</td><td style="padding:10px 14px;color:#fff;font-size:13px;border-bottom:1px solid #1a1a1a;">CryptoBridge → dowolna krypto</td></tr>
      <tr style="background:#111;"><td style="padding:10px 14px;color:#FFD700;font-size:13px;font-weight:700;">01.07.2026</td><td style="padding:10px 14px;color:#fff;font-size:13px;">Dowolna giełda DEX → dowolna krypto</td></tr>
    </table>
  </td></tr>
  <!-- Warning -->
  <tr><td style="padding:20px 32px 0 32px;">
    <div style="background:#1a0000;border:1px solid #FF4444;border-radius:6px;padding:16px;">
      <p style="margin:0 0 8px 0;font-size:13px;font-weight:800;color:#FF6666;">⚠ Uwaga – aktualizacja jednorazowa</p>
      <p style="margin:0;font-size:13px;color:#ccc;line-height:1.7;">
        Migracja FTRX → FTRX v2 jest procesem jednorazowym. Nie ma możliwości dokonania aktualizacji po raz drugi ani na podstawie nowo zakupionych tokenów starej wersji FTRX po dacie pierwszej migracji. W przypadku próby naruszenia systemu aktualizacji jej dokonanie nie będzie możliwe przez adres portfela nadawcy oraz wszystkie połączone z nim adresy w sieci.
      </p>
    </div>
  </td></tr>
  <!-- Non-custodial note -->
  <tr><td style="padding:16px 32px 0 32px;">
    <p style="margin:0;font-size:13px;color:#888;line-height:1.7;">
      <strong style="color:#00FFD1;">FuturoX AI</strong> nigdy nie poprosi o klucz prywatny ani seed phrase Twojego portfela. Cała procedura jest <strong>non-custodial</strong>.
    </p>
    <p style="margin:10px 0 0 0;font-size:13px;color:#888;line-height:1.7;">
      Zaktualizowane tokeny FTRX v2 zostaną wysłane na ten sam adres portfela, z którego dokonasz wpłaty FTRX v1.
    </p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:24px 32px;margin-top:24px;border-top:1px solid #1a1a1a;margin:24px 0 0 0;">
    <p style="margin:0;font-size:12px;color:#555;text-align:center;">FuturoX AI · <a href="https://futuroxai.com" style="color:#555;">futuroxai.com</a> · <a href="mailto:support@futuroxai.com" style="color:#555;">support@futuroxai.com</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""

def _send_email_sync(to_email: str, subject: str, html_body: str):
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user)
    if not smtp_user or not smtp_pass:
        raise ValueError("SMTP_USER and SMTP_PASS environment variables are not configured")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"FuturoX AI <{smtp_from}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, to_email, msg.as_string())

@api_router.post("/admin/send-update-email/{entry_id}")
async def send_update_email(entry_id: str, x_admin_password: str = Header(None)):
    """Send FTRX V1→V2 migration instructions email to user"""
    verify_admin(x_admin_password)
    entry = await db.update_requests.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Wniosek nie znaleziony")
    html = _build_update_email_html(entry_id, entry["email"], entry["wallet_address"])
    subject = "FuturoX AI — Instrukcje migracji FTRX → FTRX v2"
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send_email_sync, entry["email"], subject, html)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Email send error: {e}")
        raise HTTPException(status_code=500, detail=f"Błąd wysyłania e-mail: {str(e)}")
    await db.update_requests.update_one({"id": entry_id}, {"$set": {"email_sent_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": True, "message": f"E-mail wysłany do {entry['email']}"}

# Declaration models
class DeclarationSubmit(BaseModel):
    wallet_v2: str
    ftrx_amount: float
    confirmed_responsibility: bool
    confirmed_owner: bool
    confirmed_no_early_sale: bool
    confirmed_risk: bool
    confirmed_purexchange: bool
    confirmed_cryptobridge: bool
    confirmed_dex: bool

@api_router.post("/declaration/{declaration_id}")
async def submit_declaration(declaration_id: str, body: DeclarationSubmit):
    """Submit FTRX migration declaration"""
    entry = await db.update_requests.find_one({"id": declaration_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Nieprawidłowy link oświadczenia")
    if not all([body.confirmed_responsibility, body.confirmed_owner, body.confirmed_no_early_sale,
                body.confirmed_risk, body.confirmed_purexchange, body.confirmed_cryptobridge, body.confirmed_dex]):
        raise HTTPException(status_code=400, detail="Musisz zaznaczyć wszystkie wymagane pola")
    doc = {
        "declaration_id": declaration_id,
        "email": entry["email"],
        "wallet_v1": entry["wallet_address"],
        "wallet_v2": body.wallet_v2,
        "ftrx_amount": body.ftrx_amount,
        "confirmed_responsibility": body.confirmed_responsibility,
        "confirmed_owner": body.confirmed_owner,
        "confirmed_no_early_sale": body.confirmed_no_early_sale,
        "confirmed_risk": body.confirmed_risk,
        "confirmed_purexchange": body.confirmed_purexchange,
        "confirmed_cryptobridge": body.confirmed_cryptobridge,
        "confirmed_dex": body.confirmed_dex,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.declarations.insert_one(doc)
    await db.update_requests.update_one({"id": declaration_id}, {"$set": {"declaration_submitted": True}})
    return {"success": True, "message": "Oświadczenie zostało złożone pomyślnie"}

@api_router.get("/admin/declarations")
async def get_declarations(x_admin_password: str = Header(None)):
    """Get all submitted declarations"""
    verify_admin(x_admin_password)
    cursor = db.declarations.find({}, {"_id": 0}).sort("submitted_at", -1)
    items = await cursor.to_list(length=1000)
    return {"declarations": items, "total": len(items)}

@api_router.get("/declaration/{declaration_id}/check")
async def check_declaration(declaration_id: str):
    """Check if declaration exists"""
    entry = await db.update_requests.find_one({"id": declaration_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Nieprawidłowy link")
    already_submitted = await db.declarations.find_one({"declaration_id": declaration_id}, {"_id": 0})
    return {"valid": True, "email": entry["email"], "wallet_v1": entry["wallet_address"], "already_submitted": bool(already_submitted)}

# Whitelist endpoints
@api_router.post("/whitelist")
async def add_to_whitelist(entry: WhitelistCreate):
    """Add email and wallet to whitelist"""
    # Check if email already exists
    existing = await db.whitelist.find_one({"email": entry.email}, {"_id": 0})
    if existing:
        return {"success": False, "detail": "Email already registered"}
    
    whitelist_obj = WhitelistEntry(
        email=entry.email,
        wallet_address=entry.wallet_address
    )
    
    doc = whitelist_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.whitelist.insert_one(doc)
    return {"success": True, "message": "Successfully added to whitelist"}

@api_router.get("/whitelist/count")
async def get_whitelist_count():
    """Get total number of whitelist entries"""
    count = await db.whitelist.count_documents({})
    return {"count": count}


VALID_BOT_IDS = {"spread", "sniper", "trade", "arbitrage", "trend", "copytrade"}
VALID_SOL_TIERS = {5, 10, 25, 50, 100, 500, 1000}
VALID_PAYOUT_INTERVALS = {15, 30, 50, 100}
BOT_PRICES = {"spread": 99, "sniper": 199, "trade": 199, "arbitrage": 99, "trend": 99, "copytrade": 99}
BOT_NAMES = {
    "spread": "AI Spread Bot", "sniper": "AI Sniper Bot", "trade": "AI Trade Bot",
    "arbitrage": "AI Arbitrage Bot", "trend": "AI Trend Bot", "copytrade": "AI Copy Trade",
}

class BotOrderCreate(BaseModel):
    email: str
    bot_id: str
    bot_name: Optional[str] = None
    price_usd: Optional[float] = None
    sol_tier: int
    payout_interval: int
    profit_wallet: str

class BotOrderEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str = Field(default_factory=lambda: f"FTRX-{int(datetime.now(timezone.utc).timestamp())}-{str(uuid.uuid4())[:4].upper()}")
    email: str
    bot_id: str
    bot_name: str
    price_usd: float
    sol_tier: int
    payout_interval: int
    profit_wallet: str
    status: str = "pending_payment"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def _build_bot_order_email_html(entry) -> str:
    frontend_url = os.environ.get("FRONTEND_BASE_URL", "https://futuroxai.com")
    status_url = f"{frontend_url}/order-status/{entry.order_id}"
    payment_address = "C7Y9MqJjfmEm3WDA2r76acy6gzLVsEhC8RGHV3bsAMYR"
    return f"""
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

  <!-- Header -->
  <tr><td style="background:#0d0d0d;border:1px solid rgba(255,215,0,0.15);border-radius:12px 12px 0 0;padding:32px 32px 24px;">
    <table width="100%"><tr>
      <td><div style="display:inline-block;background:#FFD700;color:#000;font-size:11px;font-weight:900;padding:4px 8px;border-radius:4px;letter-spacing:1px;">FTRX</div></td>
      <td align="right"><span style="font-size:11px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;">FuturoX AI</span></td>
    </tr></table>
    <h1 style="margin:20px 0 8px;font-size:22px;font-weight:900;color:#fff;">Zamówienie przyjęte ✅</h1>
    <p style="margin:0;font-size:14px;color:#888;">Twój {entry.bot_name} zostanie skonfigurowany po potwierdzeniu płatności.</p>
  </td></tr>

  <!-- Order ID -->
  <tr><td style="background:#0a0a0a;border-left:1px solid rgba(255,215,0,0.15);border-right:1px solid rgba(255,215,0,0.15);padding:16px 32px;">
    <p style="margin:0 0 6px;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px;">Numer zamówienia</p>
    <code style="font-size:16px;font-weight:900;color:#FFD700;font-family:monospace;">{entry.order_id}</code>
    <p style="margin:6px 0 0;font-size:11px;color:#444;">Zachowaj ten numer — będzie potrzebny przy weryfikacji</p>
  </td></tr>

  <!-- Details table -->
  <tr><td style="background:#0a0a0a;border-left:1px solid rgba(255,215,0,0.15);border-right:1px solid rgba(255,215,0,0.15);padding:0 32px 20px;">
    <table width="100%" style="border-top:1px solid rgba(255,255,255,0.06);">
      {''.join(f'''<tr>
        <td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.5px;width:40%;">{label}</td>
        <td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px;font-weight:600;color:#fff;text-align:right;">{value}</td>
      </tr>''' for label, value in [
          ('Bot', entry.bot_name),
          ('E-mail', entry.email),
          ('Kapitał SOL', f'{entry.sol_tier} SOL'),
          ('Harmonogram wypłat', f'co {entry.payout_interval} dni'),
          ('Subskrypcja miesięczna', f'${entry.price_usd} USD / mies.'),
      ])}
    </table>
  </td></tr>

  <!-- Payment instructions -->
  <tr><td style="background:#0a0a0a;border-left:1px solid rgba(255,215,0,0.15);border-right:1px solid rgba(255,215,0,0.15);padding:0 32px 20px;">
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:16px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px;">Instrukcja płatności</p>
      <p style="margin:0 0 10px;font-size:12px;color:#888;">Wyślij <strong style="color:#fff;">dwa przelewy</strong> na adres portfela FuturoX AI:</p>
      <div style="background:#111;border:1px solid rgba(0,255,209,0.2);border-radius:6px;padding:10px 12px;margin-bottom:12px;">
        <p style="margin:0 0 4px;font-size:10px;color:#555;">Adres portfela (SOL + FTRX)</p>
        <code style="font-size:11px;color:#00FFD1;word-break:break-all;">{payment_address}</code>
      </div>
      <table width="100%">
        <tr>
          <td style="background:rgba(0,204,255,0.06);border:1px solid rgba(0,204,255,0.2);border-radius:6px;padding:10px;width:48%;vertical-align:top;">
            <p style="margin:0 0 4px;font-size:10px;color:#00CCFF;font-weight:700;">1. Kapitał roboczy</p>
            <p style="margin:0;font-size:18px;font-weight:900;color:#00CCFF;">{entry.sol_tier} SOL</p>
            <p style="margin:4px 0 0;font-size:10px;color:#555;">Natywny SOL · sieć Solana</p>
          </td>
          <td style="width:4%;"></td>
          <td style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.2);border-radius:6px;padding:10px;width:48%;vertical-align:top;">
            <p style="margin:0 0 4px;font-size:10px;color:#FFD700;font-weight:700;">2. Subskrypcja</p>
            <p style="margin:0;font-size:18px;font-weight:900;color:#FFD700;">wg kursu FTRX</p>
            <p style="margin:4px 0 0;font-size:10px;color:#555;">≈ ${entry.price_usd} USD w FTRX</p>
          </td>
        </tr>
      </table>
    </div>
  </td></tr>

  <!-- Status link CTA -->
  <tr><td style="background:#0a0a0a;border-left:1px solid rgba(255,215,0,0.15);border-right:1px solid rgba(255,215,0,0.15);padding:0 32px 28px;">
    <p style="margin:0 0 14px;font-size:13px;color:#888;">Śledź status swojego zamówienia w czasie rzeczywistym:</p>
    <a href="{status_url}" style="display:inline-block;background:#FFD700;color:#000;font-size:13px;font-weight:900;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:.3px;">
      Sprawdź status zamówienia →
    </a>
    <p style="margin:12px 0 0;font-size:11px;color:#444;">lub otwórz: <a href="{status_url}" style="color:#FFD700;text-decoration:none;">{status_url}</a></p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#060606;border:1px solid rgba(255,215,0,0.1);border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;">
    <p style="margin:0;font-size:11px;color:#333;text-align:center;">
      © 2026 FuturoX AI · Ten email został wysłany automatycznie po złożeniu zamówienia.<br>
      <a href="{frontend_url}" style="color:#555;text-decoration:none;">{frontend_url}</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
"""

@api_router.post("/bot-order")
async def submit_bot_order(req: BotOrderCreate):
    """Submit a bot purchase order"""
    if req.bot_id not in VALID_BOT_IDS:
        raise HTTPException(status_code=400, detail="Nieprawidłowy typ boota")
    if req.sol_tier not in VALID_SOL_TIERS:
        raise HTTPException(status_code=400, detail="Nieprawidłowy poziom kapitału SOL")
    if req.payout_interval not in VALID_PAYOUT_INTERVALS:
        raise HTTPException(status_code=400, detail="Nieprawidłowy harmonogram wypłat")
    if not req.profit_wallet or len(req.profit_wallet) < 32 or len(req.profit_wallet) > 44:
        raise HTTPException(status_code=400, detail="Nieprawidłowy adres portfela Solana")

    entry = BotOrderEntry(
        email=req.email,
        bot_id=req.bot_id,
        bot_name=BOT_NAMES.get(req.bot_id, req.bot_id),
        price_usd=BOT_PRICES.get(req.bot_id, 99),
        sol_tier=req.sol_tier,
        payout_interval=req.payout_interval,
        profit_wallet=req.profit_wallet,
    )
    doc = entry.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.bot_orders.insert_one(doc)

    # Send confirmation email asynchronously (non-blocking)
    try:
        loop = asyncio.get_event_loop()
        html_email = _build_bot_order_email_html(entry)
        subject = f"✅ Zamówienie {entry.bot_name} przyjęte — #{entry.order_id}"
        loop.run_in_executor(None, _send_email_sync, entry.email, subject, html_email)
    except Exception as e:
        logger.error(f"Bot order email error: {e}")

    return {
        "success": True,
        "order_id": entry.order_id,
        "email": entry.email,
        "bot_id": entry.bot_id,
        "bot_name": entry.bot_name,
        "price_usd": entry.price_usd,
        "sol_tier": entry.sol_tier,
        "payout_interval": entry.payout_interval,
        "profit_wallet": entry.profit_wallet,
        "status": entry.status,
    }

@api_router.get("/bot-order/{order_id}")
async def get_bot_order_status(order_id: str):
    """Get bot order status by order_id (public endpoint)"""
    order = await db.bot_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Zamówienie nie zostało znalezione")
    return {"success": True, "order": order}

@api_router.get("/admin/bot-orders")
async def get_bot_orders(x_admin_password: str = Header(None)):
    """Get all bot orders"""
    verify_admin(x_admin_password)
    cursor = db.bot_orders.find({}, {"_id": 0}).sort("created_at", -1)
    orders = await cursor.to_list(length=1000)
    return {"orders": orders, "total": len(orders)}

@api_router.patch("/admin/bot-orders/{order_id}/status")
async def update_bot_order_status(order_id: str, body: dict, x_admin_password: str = Header(None)):
    """Update bot order status"""
    verify_admin(x_admin_password)
    valid_statuses = {"pending_payment", "paid", "configuring", "access_granted", "live"}
    new_status = body.get("status", "")
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Nieprawidłowy status. Dozwolone: {valid_statuses}")
    result = await db.bot_orders.update_one({"order_id": order_id}, {"$set": {"status": new_status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Zamówienie nie znalezione")
    return {"success": True, "order_id": order_id, "status": new_status}


# Include the router in the main app
app.include_router(api_router)

# Serve React frontend static files in production
_build_dir = Path(__file__).parent.parent / "frontend" / "build"
if _build_dir.exists():
    app.mount("/static", StaticFiles(directory=str(_build_dir / "static")), name="static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_react(full_path: str):
        index = _build_dir / "index.html"
        return FileResponse(str(index))

    @app.get("/", include_in_schema=False)
    async def serve_root():
        return FileResponse(str(_build_dir / "index.html"))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()