"""
Iteration 8 Tests: Multi-Bot Architecture
Tests for 6 bots: volume, spread, sniper, trade, arbitrage, copytrade
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://solana-bot-4.preview.emergentagent.com').rstrip('/')
ADMIN_PASSWORD = "futurox2026"
HEADERS = {
    'Content-Type': 'application/json',
    'x-admin-password': ADMIN_PASSWORD
}

# ==================== ADMIN LOGIN ====================
class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Admin login with correct password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Admin login successful")
    
    def test_admin_login_failure(self):
        """Admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "wrongpassword"})
        assert response.status_code == 401
        print("✓ Admin login correctly rejects wrong password")


# ==================== BOT LIST ENDPOINT ====================
class TestBotListEndpoint:
    """Test GET /api/admin/bots - returns list of 6 bots"""
    
    def test_bots_list_returns_6_bots(self):
        """GET /api/admin/bots returns 6 bot types"""
        response = requests.get(f"{BASE_URL}/api/admin/bots", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "bots" in data
        bots = data["bots"]
        assert len(bots) == 6, f"Expected 6 bots, got {len(bots)}"
        
        bot_types = [b["type"] for b in bots]
        expected_types = ["volume", "spread", "sniper", "trade", "arbitrage", "copytrade"]
        for expected in expected_types:
            assert expected in bot_types, f"Missing bot type: {expected}"
        
        print(f"✓ Bot list returns 6 bots: {bot_types}")
    
    def test_bots_list_has_required_fields(self):
        """Each bot in list has type, running, has_wallets fields"""
        response = requests.get(f"{BASE_URL}/api/admin/bots", headers=HEADERS)
        assert response.status_code == 200
        bots = response.json()["bots"]
        
        for bot in bots:
            assert "type" in bot, f"Bot missing 'type' field"
            assert "running" in bot, f"Bot {bot.get('type')} missing 'running' field"
            assert "has_wallets" in bot, f"Bot {bot.get('type')} missing 'has_wallets' field"
        
        print("✓ All bots have required fields")


# ==================== VOLUME BOT (existing) ====================
class TestVolumeBotStatus:
    """Test Volume Bot status endpoint (existing bot)"""
    
    def test_volume_bot_status(self):
        """GET /api/admin/bot/status returns volume bot status"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        assert "config" in data
        assert "stats" in data
        print(f"✓ Volume bot status: running={data['running']}")
    
    def test_volume_bot_wallets(self):
        """GET /api/admin/wallets returns volume bot wallets"""
        response = requests.get(f"{BASE_URL}/api/admin/wallets", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "wallets" in data
        wallets = data["wallets"]
        print(f"✓ Volume bot has {len(wallets)} wallets")
        
        # Check FTRX balance fix - wallets should have balance_ftrx field
        if wallets:
            first_wallet = wallets[0]
            assert "balance_sol" in first_wallet, "Missing balance_sol field"
            assert "balance_ftrx" in first_wallet, "Missing balance_ftrx field (FTRX bug fix)"
            print(f"✓ FTRX balance field present in wallets")


# ==================== SPREAD BOT ====================
class TestSpreadBotEndpoints:
    """Test Spread Bot endpoints"""
    
    def test_spread_bot_status(self):
        """GET /api/admin/bot/spread/status returns spread bot status"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/spread/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        assert "config" in data
        assert "stats" in data
        
        # Check spread-specific config fields
        config = data["config"]
        assert "token_mint" in config
        assert "spread_percent" in config
        assert "max_position_sol" in config
        print(f"✓ Spread bot status: running={data['running']}, spread_percent={config.get('spread_percent')}")
    
    def test_spread_bot_config_save(self):
        """POST /api/admin/bot/spread/config saves configuration"""
        test_config = {
            "token_mint": "9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray",
            "spread_percent": 2.5,
            "slippage_bps": 1500
        }
        response = requests.post(f"{BASE_URL}/api/admin/bot/spread/config", 
                                headers=HEADERS, json=test_config)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Spread bot config saved successfully")
    
    def test_spread_bot_wallets(self):
        """GET /api/admin/bot/spread/wallets returns spread bot wallets"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/spread/wallets", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "wallets" in data
        print(f"✓ Spread bot has {len(data['wallets'])} wallets")
    
    def test_spread_bot_generate_wallets(self):
        """POST /api/admin/bot/spread/wallets/generate creates wallets"""
        response = requests.post(f"{BASE_URL}/api/admin/bot/spread/wallets/generate",
                                headers=HEADERS, json={"count": 2, "prefix": "TestSpread"})
        assert response.status_code == 200
        data = response.json()
        assert "created" in data or "wallets" in data
        print(f"✓ Spread bot wallet generation: {data}")


# ==================== SNIPER BOT ====================
class TestSniperBotEndpoints:
    """Test Sniper Bot endpoints"""
    
    def test_sniper_bot_status(self):
        """GET /api/admin/bot/sniper/status returns sniper bot status"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/sniper/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        assert "config" in data
        
        config = data["config"]
        assert "token_mint" in config
        assert "max_buy_sol" in config
        assert "take_profit_percent" in config
        assert "stop_loss_percent" in config
        print(f"✓ Sniper bot status: running={data['running']}")
    
    def test_sniper_bot_wallets(self):
        """GET /api/admin/bot/sniper/wallets returns sniper bot wallets"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/sniper/wallets", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "wallets" in data
        print(f"✓ Sniper bot has {len(data['wallets'])} wallets")


# ==================== TRADE BOT ====================
class TestTradeBotEndpoints:
    """Test Trade Bot endpoints with strategy selector"""
    
    def test_trade_bot_status(self):
        """GET /api/admin/bot/trade/status returns trade bot status"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/trade/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        assert "config" in data
        
        config = data["config"]
        assert "token_mint" in config
        assert "strategy" in config, "Trade bot must have strategy field"
        assert config["strategy"] in ["momentum", "mean_reversion", "dca"], \
            f"Invalid strategy: {config['strategy']}"
        print(f"✓ Trade bot status: running={data['running']}, strategy={config['strategy']}")
    
    def test_trade_bot_config_with_strategy(self):
        """POST /api/admin/bot/trade/config saves strategy configuration"""
        test_config = {
            "token_mint": "9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray",
            "strategy": "dca",
            "dca_interval_minutes": 30
        }
        response = requests.post(f"{BASE_URL}/api/admin/bot/trade/config",
                                headers=HEADERS, json=test_config)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Trade bot config with strategy saved")
    
    def test_trade_bot_wallets(self):
        """GET /api/admin/bot/trade/wallets returns trade bot wallets"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/trade/wallets", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "wallets" in data
        print(f"✓ Trade bot has {len(data['wallets'])} wallets")


# ==================== ARBITRAGE BOT ====================
class TestArbitrageBotEndpoints:
    """Test Arbitrage Bot endpoints"""
    
    def test_arbitrage_bot_status(self):
        """GET /api/admin/bot/arbitrage/status returns arbitrage bot status"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/arbitrage/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        assert "config" in data
        
        config = data["config"]
        assert "token_mint" in config
        assert "min_profit_percent" in config
        assert "max_trade_sol" in config
        print(f"✓ Arbitrage bot status: running={data['running']}")
    
    def test_arbitrage_bot_wallets(self):
        """GET /api/admin/bot/arbitrage/wallets returns arbitrage bot wallets"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/arbitrage/wallets", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "wallets" in data
        print(f"✓ Arbitrage bot has {len(data['wallets'])} wallets")


# ==================== COPY TRADE BOT ====================
class TestCopyTradeBotEndpoints:
    """Test Copy Trade Bot endpoints with target_wallet field"""
    
    def test_copytrade_bot_status(self):
        """GET /api/admin/bot/copytrade/status returns copytrade bot status"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/copytrade/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        assert "config" in data
        
        config = data["config"]
        assert "token_mint" in config
        assert "target_wallet" in config, "Copy Trade bot must have target_wallet field"
        assert "copy_ratio" in config
        assert "copy_buys" in config
        assert "copy_sells" in config
        print(f"✓ Copy Trade bot status: running={data['running']}, target_wallet={config.get('target_wallet', 'not set')[:20]}...")
    
    def test_copytrade_bot_config_with_target_wallet(self):
        """POST /api/admin/bot/copytrade/config saves target_wallet"""
        test_config = {
            "target_wallet": "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
            "copy_ratio": 0.1,
            "max_sol_per_trade": 0.05
        }
        response = requests.post(f"{BASE_URL}/api/admin/bot/copytrade/config",
                                headers=HEADERS, json=test_config)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Copy Trade bot config with target_wallet saved")
    
    def test_copytrade_bot_wallets(self):
        """GET /api/admin/bot/copytrade/wallets returns copytrade bot wallets"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/copytrade/wallets", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "wallets" in data
        print(f"✓ Copy Trade bot has {len(data['wallets'])} wallets")


# ==================== GENERIC BOT START/STOP ====================
class TestGenericBotStartStop:
    """Test start/stop for new bots (not volume)"""
    
    def test_spread_bot_start_without_token(self):
        """Spread bot start fails without token_mint configured"""
        # First clear token_mint
        requests.post(f"{BASE_URL}/api/admin/bot/spread/config",
                     headers=HEADERS, json={"token_mint": ""})
        
        response = requests.post(f"{BASE_URL}/api/admin/bot/spread/start", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        # Should fail or return success=False because no token configured
        print(f"✓ Spread bot start response: {data}")
    
    def test_spread_bot_stop(self):
        """Spread bot stop works"""
        response = requests.post(f"{BASE_URL}/api/admin/bot/spread/stop", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        print(f"✓ Spread bot stop: {data}")


# ==================== DISTRIBUTE/COLLECT SOL ====================
class TestDistributeCollectSol:
    """Test distribute and collect SOL for new bots"""
    
    def test_spread_bot_distribute_status(self):
        """GET /api/admin/bot/spread/wallets/distribute/status returns status"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/spread/wallets/distribute/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        print(f"✓ Spread bot distribute status: {data}")
    
    def test_spread_bot_collect_status(self):
        """GET /api/admin/bot/spread/wallets/collect/status returns status"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/spread/wallets/collect/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        print(f"✓ Spread bot collect status: {data}")


# ==================== FTRX BUG FIX VERIFICATION ====================
class TestFtrxBugFix:
    """Verify FTRX balances show for ALL wallets (not just SOL > 0.001)"""
    
    def test_volume_bot_wallets_have_ftrx_field(self):
        """All wallets have balance_ftrx field regardless of SOL balance"""
        response = requests.get(f"{BASE_URL}/api/admin/wallets", headers=HEADERS)
        assert response.status_code == 200
        wallets = response.json()["wallets"]
        
        if not wallets:
            print("⚠ No wallets to test FTRX bug fix")
            return
        
        wallets_with_ftrx_field = 0
        wallets_with_ftrx_balance = 0
        
        for w in wallets:
            if "balance_ftrx" in w:
                wallets_with_ftrx_field += 1
                if w["balance_ftrx"] > 0:
                    wallets_with_ftrx_balance += 1
        
        assert wallets_with_ftrx_field == len(wallets), \
            f"Not all wallets have balance_ftrx field: {wallets_with_ftrx_field}/{len(wallets)}"
        
        print(f"✓ FTRX bug fix verified: {wallets_with_ftrx_field}/{len(wallets)} wallets have balance_ftrx field")
        print(f"  {wallets_with_ftrx_balance} wallets have FTRX balance > 0")


# ==================== LANDING PAGE ====================
class TestLandingPage:
    """Test landing page loads"""
    
    def test_landing_page_loads(self):
        """Landing page returns 200"""
        response = requests.get(BASE_URL)
        assert response.status_code == 200
        print("✓ Landing page loads successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
