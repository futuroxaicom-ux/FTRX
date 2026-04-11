"""
Test suite for Volume Bot Organic Mode features (Iteration 5)
Tests new fields: buys_since_sell, last_action, token_holders
Tests bot start/stop cycle and config updates
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_PASSWORD = "futurox2026"
HEADERS = {"Content-Type": "application/json", "x-admin-password": ADMIN_PASSWORD}


class TestOrganicModeStatusFields:
    """Test that /api/admin/bot/status returns new organic mode fields"""
    
    def test_status_returns_token_holders(self):
        """Status should include token_holders count"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "token_holders" in data, "Missing token_holders field"
        assert isinstance(data["token_holders"], int), "token_holders should be int"
        print(f"✓ token_holders field present: {data['token_holders']}")
    
    def test_status_returns_buys_since_sell(self):
        """Status should include buys_since_sell count"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "buys_since_sell" in data, "Missing buys_since_sell field"
        assert isinstance(data["buys_since_sell"], int), "buys_since_sell should be int"
        print(f"✓ buys_since_sell field present: {data['buys_since_sell']}")
    
    def test_status_returns_last_action(self):
        """Status should include last_action field (can be null)"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "last_action" in data, "Missing last_action field"
        # last_action can be None/null or a string like "BUY", "SELL", "TRANSFER"
        assert data["last_action"] is None or isinstance(data["last_action"], str), \
            "last_action should be null or string"
        print(f"✓ last_action field present: {data['last_action']}")
    
    def test_status_returns_all_required_fields(self):
        """Status should return all expected fields for organic mode"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "running", "config", "stats", "daily_wallets_used",
            "token_holders", "buys_since_sell", "last_action", "recent_transactions"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ All required fields present: {required_fields}")


class TestBotConfigUpdate:
    """Test /api/admin/bot/config updates correctly"""
    
    def test_config_update_token_mint(self):
        """Config update should accept token_mint"""
        original = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS).json()
        original_mint = original["config"]["token_mint"]
        
        # Update token_mint
        new_mint = "TestMint123456789012345678901234567890123"
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            headers=HEADERS,
            json={"token_mint": new_mint}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["config"]["token_mint"] == new_mint
        
        # Restore original
        requests.post(f"{BASE_URL}/api/admin/bot/config", headers=HEADERS, json={"token_mint": original_mint})
        print(f"✓ token_mint update works")
    
    def test_config_update_target_volume(self):
        """Config update should accept target_volume_sol"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            headers=HEADERS,
            json={"target_volume_sol": 25.5}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["config"]["target_volume_sol"] == 25.5
        
        # Restore default
        requests.post(f"{BASE_URL}/api/admin/bot/config", headers=HEADERS, json={"target_volume_sol": 10})
        print(f"✓ target_volume_sol update works")
    
    def test_config_update_trade_intervals(self):
        """Config update should accept trade_interval_min/max (in seconds)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            headers=HEADERS,
            json={"trade_interval_min": 10, "trade_interval_max": 60}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["config"]["trade_interval_min"] == 10
        assert data["config"]["trade_interval_max"] == 60
        
        # Restore defaults
        requests.post(f"{BASE_URL}/api/admin/bot/config", headers=HEADERS, 
                     json={"trade_interval_min": 5, "trade_interval_max": 30})
        print(f"✓ trade_interval_min/max update works")
    
    def test_config_update_sol_per_trade(self):
        """Config update should accept min/max_sol_per_trade"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            headers=HEADERS,
            json={"min_sol_per_trade": 0.005, "max_sol_per_trade": 0.05}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["config"]["min_sol_per_trade"] == 0.005
        assert data["config"]["max_sol_per_trade"] == 0.05
        
        # Restore defaults
        requests.post(f"{BASE_URL}/api/admin/bot/config", headers=HEADERS,
                     json={"min_sol_per_trade": 0.003, "max_sol_per_trade": 0.03})
        print(f"✓ min/max_sol_per_trade update works")
    
    def test_config_update_slippage(self):
        """Config update should accept slippage_bps"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            headers=HEADERS,
            json={"slippage_bps": 150}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["config"]["slippage_bps"] == 150
        
        # Restore default
        requests.post(f"{BASE_URL}/api/admin/bot/config", headers=HEADERS, json={"slippage_bps": 100})
        print(f"✓ slippage_bps update works")
    
    def test_config_update_auto_refund(self):
        """Config update should accept auto_refund toggle"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            headers=HEADERS,
            json={"auto_refund": False}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["config"]["auto_refund"] == False
        
        # Restore default
        requests.post(f"{BASE_URL}/api/admin/bot/config", headers=HEADERS, json={"auto_refund": True})
        print(f"✓ auto_refund toggle works")
    
    def test_config_update_min_wallet_balance(self):
        """Config update should accept min_wallet_balance"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            headers=HEADERS,
            json={"min_wallet_balance": 0.005}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["config"]["min_wallet_balance"] == 0.005
        
        # Restore default
        requests.post(f"{BASE_URL}/api/admin/bot/config", headers=HEADERS, json={"min_wallet_balance": 0.003})
        print(f"✓ min_wallet_balance update works")


class TestBotStartStop:
    """Test bot start/stop cycle"""
    
    def test_bot_start(self):
        """Bot should start successfully"""
        # First ensure bot is stopped
        requests.post(f"{BASE_URL}/api/admin/bot/stop", headers=HEADERS)
        
        response = requests.post(f"{BASE_URL}/api/admin/bot/start", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "started" in data["message"].lower() or data["success"] == True
        
        # Verify running state
        status = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS).json()
        assert status["running"] == True
        print(f"✓ Bot started successfully, running={status['running']}")
    
    def test_bot_status_when_running(self):
        """Status should show running=true and reset organic counters"""
        # Ensure bot is running
        requests.post(f"{BASE_URL}/api/admin/bot/start", headers=HEADERS)
        
        status = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS).json()
        assert status["running"] == True
        # When bot starts, counters should be reset
        assert status["buys_since_sell"] == 0
        assert status["token_holders"] == 0
        assert status["last_action"] is None
        print(f"✓ Bot running with reset counters")
    
    def test_bot_stop(self):
        """Bot should stop successfully"""
        response = requests.post(f"{BASE_URL}/api/admin/bot/stop", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Verify stopped state
        status = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS).json()
        assert status["running"] == False
        print(f"✓ Bot stopped successfully, running={status['running']}")
    
    def test_bot_start_already_running(self):
        """Starting already running bot should return appropriate response"""
        # Start bot
        requests.post(f"{BASE_URL}/api/admin/bot/start", headers=HEADERS)
        
        # Try to start again
        response = requests.post(f"{BASE_URL}/api/admin/bot/start", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        # Should indicate already running
        assert data["success"] == False or "already" in data.get("message", "").lower()
        
        # Cleanup
        requests.post(f"{BASE_URL}/api/admin/bot/stop", headers=HEADERS)
        print(f"✓ Bot handles double-start correctly")


class TestCostCalculator:
    """Test /api/admin/bot/costs endpoint"""
    
    def test_costs_returns_all_fields(self):
        """Costs endpoint should return all calculation fields"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/costs", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "trades_per_day", "total_transactions", "gas_cost_sol",
            "slippage_cost_sol", "total_daily_cost_sol", "sol_needed_minimum",
            "avg_trade_size", "cost_per_1sol_volume"
        ]
        for field in required_fields:
            assert field in data, f"Missing cost field: {field}"
        
        print(f"✓ Cost calculator returns all fields: {list(data.keys())}")
    
    def test_costs_values_are_numeric(self):
        """All cost values should be numeric"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/costs", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        
        for key, value in data.items():
            assert isinstance(value, (int, float)), f"{key} should be numeric, got {type(value)}"
        
        print(f"✓ All cost values are numeric")


class TestWalletEndpoints:
    """Test wallet-related endpoints"""
    
    def test_get_wallets(self):
        """Get wallets should return list"""
        response = requests.get(f"{BASE_URL}/api/admin/wallets", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "wallets" in data
        assert isinstance(data["wallets"], list)
        print(f"✓ Get wallets returns {len(data['wallets'])} wallets")
    
    def test_generate_wallets(self):
        """Generate wallets should create new wallets"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/generate",
            headers=HEADERS,
            json={"count": 2, "prefix": "TEST_ORGANIC"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["count"] == 2
        assert len(data["wallets"]) == 2
        
        # Verify wallets have public keys
        for wallet in data["wallets"]:
            assert "public_key" in wallet
            assert "label" in wallet
            assert "TEST_ORGANIC" in wallet["label"]
        
        print(f"✓ Generated {data['count']} wallets")
        
        # Cleanup - delete test wallets
        for wallet in data["wallets"]:
            requests.delete(f"{BASE_URL}/api/admin/wallets/{wallet['public_key']}", headers=HEADERS)


class TestAuthProtection:
    """Test that all admin endpoints require authentication"""
    
    def test_status_requires_auth(self):
        """Status endpoint should require auth"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/status")
        assert response.status_code == 401
        print(f"✓ /api/admin/bot/status requires auth")
    
    def test_start_requires_auth(self):
        """Start endpoint should require auth"""
        response = requests.post(f"{BASE_URL}/api/admin/bot/start")
        assert response.status_code == 401
        print(f"✓ /api/admin/bot/start requires auth")
    
    def test_stop_requires_auth(self):
        """Stop endpoint should require auth"""
        response = requests.post(f"{BASE_URL}/api/admin/bot/stop")
        assert response.status_code == 401
        print(f"✓ /api/admin/bot/stop requires auth")
    
    def test_config_requires_auth(self):
        """Config endpoint should require auth"""
        response = requests.post(f"{BASE_URL}/api/admin/bot/config", json={})
        assert response.status_code == 401
        print(f"✓ /api/admin/bot/config requires auth")
    
    def test_costs_requires_auth(self):
        """Costs endpoint should require auth"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/costs")
        assert response.status_code == 401
        print(f"✓ /api/admin/bot/costs requires auth")
    
    def test_wallets_requires_auth(self):
        """Wallets endpoint should require auth"""
        response = requests.get(f"{BASE_URL}/api/admin/wallets")
        assert response.status_code == 401
        print(f"✓ /api/admin/wallets requires auth")


class TestCleanup:
    """Cleanup after tests"""
    
    def test_ensure_bot_stopped(self):
        """Ensure bot is stopped after tests"""
        requests.post(f"{BASE_URL}/api/admin/bot/stop", headers=HEADERS)
        status = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS).json()
        assert status["running"] == False
        print(f"✓ Bot stopped after tests")
    
    def test_restore_default_config(self):
        """Restore default config values"""
        default_config = {
            "token_mint": "9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray",
            "target_volume_sol": 10,
            "target_makers": 20,
            "trade_interval_min": 5,
            "trade_interval_max": 30,
            "min_sol_per_trade": 0.003,
            "max_sol_per_trade": 0.03,
            "slippage_bps": 100,
            "auto_refund": True,
            "min_wallet_balance": 0.003
        }
        response = requests.post(f"{BASE_URL}/api/admin/bot/config", headers=HEADERS, json=default_config)
        assert response.status_code == 200
        print(f"✓ Default config restored")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
