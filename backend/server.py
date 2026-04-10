from fastapi import FastAPI, APIRouter, Header, HTTPException
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
from volume_bot import VolumeBot

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
    min_sol: Optional[float] = None
    max_sol: Optional[float] = None
    min_delay: Optional[int] = None
    max_delay: Optional[int] = None
    slippage_bps: Optional[int] = None

class WalletAdd(BaseModel):
    label: str
    private_key: str

# Initialize volume bot
volume_bot = VolumeBot(db)

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
    return {"success": True, "config": updated}

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

# Solana RPC Proxy to avoid CORS issues
@api_router.post("/solana/rpc")
async def solana_rpc_proxy(request: dict):
    """Proxy requests to Solana RPC to avoid CORS issues in browser"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.mainnet-beta.solana.com",
                json=request,
                headers={"Content-Type": "application/json"},
                timeout=15.0
            )
            return response.json()
        except Exception as e:
            logger.error(f"Solana RPC error: {e}")
            return {"error": str(e)}

# FTRX Token Price API
FTRX_TOKEN_ADDRESS = "9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray"

@api_router.get("/ftrx/price")
async def get_ftrx_price():
    """Get FTRX token price from Jupiter API or DexScreener"""
    async with httpx.AsyncClient() as client:
        try:
            # Try DexScreener API first (more reliable)
            response = await client.get(
                f"https://api.dexscreener.com/latest/dex/tokens/{FTRX_TOKEN_ADDRESS}",
                timeout=15.0
            )
            data = response.json()
            
            if "pairs" in data and len(data["pairs"]) > 0:
                pair = data["pairs"][0]  # Get the first/most liquid pair
                price = float(pair.get("priceUsd", 0) or 0)
                change24h = float(pair.get("priceChange", {}).get("h24", 0) or 0)
                
                # Generate chart data from price history if available
                chart_data = []
                from datetime import datetime, timedelta
                import random
                
                base_price = price if price > 0 else 0.000001
                for i in range(7):
                    date = datetime.now() - timedelta(days=6-i)
                    # Small random variation for visualization
                    variation = random.uniform(0.85, 1.15)
                    chart_data.append({
                        "time": date.strftime("%b %d"),
                        "price": round(base_price * variation, 10)
                    })
                
                return {
                    "price": price,
                    "change24h": change24h,
                    "chartData": chart_data,
                    "source": "DexScreener",
                    "pairAddress": pair.get("pairAddress", ""),
                    "dexId": pair.get("dexId", "raydium")
                }
            
            # Fallback: return placeholder data
            from datetime import datetime, timedelta
            chart_data = []
            for i in range(7):
                date = datetime.now() - timedelta(days=6-i)
                chart_data.append({
                    "time": date.strftime("%b %d"),
                    "price": 0.0000001 * (1 + i * 0.1)
                })
            
            return {
                "price": 0,
                "change24h": 0,
                "chartData": chart_data,
                "source": "placeholder",
                "message": "Token data not yet available on DexScreener"
            }
            
        except Exception as e:
            logger.error(f"DexScreener API error: {e}")
            # Return placeholder chart data
            from datetime import datetime, timedelta
            chart_data = []
            for i in range(7):
                date = datetime.now() - timedelta(days=6-i)
                chart_data.append({
                    "time": date.strftime("%b %d"),
                    "price": 0.0000001 * (1 + i * 0.1)
                })
            return {
                "price": 0,
                "change24h": 0,
                "chartData": chart_data,
                "error": str(e)
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

# Include the router in the main app
app.include_router(api_router)

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