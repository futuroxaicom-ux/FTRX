"""
Test suite for FTRX Features (Iteration 6)
- FTRX balance in wallet list
- Collect FTRX endpoint
- Collect FTRX status endpoint
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://solana-bot-4.preview.emergentagent.com').rstrip('/')
ADMIN_PASSWORD = "futurox2026"
HEADERS = {
    "Content-Type": "application/json",
    "x-admin-password": ADMIN_PASSWORD
}


class TestCollectFtrxEndpoints:
    """Test the new collect-ftrx endpoints"""
    
    def test_collect_ftrx_post_returns_success(self):
        """POST /api/admin/wallets/collect-ftrx should return success message"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/collect-ftrx",
            headers=HEADERS,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        # Should return success or already running
        assert "success" in data or "error" in data
        if "success" in data:
            assert data["success"] == True
            assert "message" in data
            print(f"Collect FTRX response: {data}")
    
    def test_collect_ftrx_status_returns_status(self):
        """GET /api/admin/wallets/collect-ftrx/status should return status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/wallets/collect-ftrx/status",
            headers=HEADERS,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        # Should have running and result fields
        assert "running" in data
        assert isinstance(data["running"], bool)
        print(f"Collect FTRX status: {data}")
        
        # If result exists, check structure
        if data.get("result"):
            result = data["result"]
            if "success" in result:
                assert "total_collected_ftrx" in result or "error" in result
                if "total_collected_ftrx" in result:
                    assert isinstance(result["total_collected_ftrx"], (int, float))
                    assert "wallets_processed" in result
                    assert "errors" in result
    
    def test_collect_ftrx_requires_auth(self):
        """Collect FTRX endpoints should require authentication"""
        # POST without auth
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/collect-ftrx",
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        assert response.status_code == 401
        
        # GET status without auth
        response = requests.get(
            f"{BASE_URL}/api/admin/wallets/collect-ftrx/status",
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        assert response.status_code == 401


class TestBotStatusFields:
    """Test bot status returns all required fields"""
    
    def test_bot_status_has_all_fields(self):
        """Bot status should have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bot/status",
            headers=HEADERS,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check main fields
        assert "running" in data
        assert "config" in data
        assert "stats" in data
        assert "recent_transactions" in data
        
        # Check organic mode fields
        assert "token_holders" in data
        assert "buys_since_sell" in data
        assert "last_action" in data
        assert "daily_wallets_used" in data
        
        print(f"Bot status fields: {list(data.keys())}")
    
    def test_bot_config_has_token_mint(self):
        """Bot config should have token_mint field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bot/status",
            headers=HEADERS,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        config = data.get("config", {})
        assert "token_mint" in config
        assert isinstance(config["token_mint"], str)
        assert len(config["token_mint"]) > 0
        print(f"Token mint: {config['token_mint']}")


class TestWalletsEndpointStructure:
    """Test wallets endpoint returns correct structure (without waiting for full response)"""
    
    def test_wallets_endpoint_exists(self):
        """Wallets endpoint should exist and require auth"""
        # Without auth should return 401
        response = requests.get(
            f"{BASE_URL}/api/admin/wallets",
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        assert response.status_code == 401
    
    def test_generate_wallets_works(self):
        """Generate wallets endpoint should work"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/generate",
            headers=HEADERS,
            json={"count": 1, "prefix": "Test"},
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "wallets" in data
        assert len(data["wallets"]) >= 1
        
        # Store wallet for cleanup
        if data["wallets"]:
            wallet_pubkey = data["wallets"][0]["public_key"]
            print(f"Generated test wallet: {wallet_pubkey}")
            
            # Cleanup - delete the test wallet
            delete_response = requests.delete(
                f"{BASE_URL}/api/admin/wallets/{wallet_pubkey}",
                headers=HEADERS,
                timeout=15
            )
            print(f"Cleanup response: {delete_response.json()}")


class TestCostCalculator:
    """Test cost calculator endpoint"""
    
    def test_cost_calculator_returns_all_fields(self):
        """Cost calculator should return all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bot/costs",
            headers=HEADERS,
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "trades_per_day",
            "total_transactions",
            "gas_cost_sol",
            "slippage_cost_sol",
            "total_daily_cost_sol",
            "sol_needed_minimum",
            "avg_trade_size",
            "cost_per_1sol_volume"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], (int, float)), f"Field {field} should be numeric"
        
        print(f"Cost calculator: {data}")


class TestBotStartStop:
    """Test bot start/stop functionality"""
    
    def test_bot_start_stop_cycle(self):
        """Bot should start and stop correctly"""
        # Start bot
        start_response = requests.post(
            f"{BASE_URL}/api/admin/bot/start",
            headers=HEADERS,
            timeout=15
        )
        assert start_response.status_code == 200
        start_data = start_response.json()
        print(f"Start response: {start_data}")
        
        # Check status
        time.sleep(1)
        status_response = requests.get(
            f"{BASE_URL}/api/admin/bot/status",
            headers=HEADERS,
            timeout=15
        )
        assert status_response.status_code == 200
        status_data = status_response.json()
        
        # Bot should be running
        assert status_data["running"] == True
        
        # Stop bot
        stop_response = requests.post(
            f"{BASE_URL}/api/admin/bot/stop",
            headers=HEADERS,
            timeout=15
        )
        assert stop_response.status_code == 200
        stop_data = stop_response.json()
        print(f"Stop response: {stop_data}")
        
        # Verify stopped
        time.sleep(1)
        final_status = requests.get(
            f"{BASE_URL}/api/admin/bot/status",
            headers=HEADERS,
            timeout=15
        )
        assert final_status.json()["running"] == False


class TestConfigSave:
    """Test config save functionality"""
    
    def test_config_save_and_restore(self):
        """Config should save and persist"""
        # Get current config
        status_response = requests.get(
            f"{BASE_URL}/api/admin/bot/status",
            headers=HEADERS,
            timeout=15
        )
        original_config = status_response.json()["config"]
        original_volume = original_config.get("target_volume_sol", 10)
        
        # Update config
        new_volume = 25
        update_response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            headers=HEADERS,
            json={"target_volume_sol": new_volume},
            timeout=15
        )
        assert update_response.status_code == 200
        update_data = update_response.json()
        assert update_data["success"] == True
        assert update_data["config"]["target_volume_sol"] == new_volume
        
        # Verify change persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/bot/status",
            headers=HEADERS,
            timeout=15
        )
        assert verify_response.json()["config"]["target_volume_sol"] == new_volume
        
        # Restore original
        restore_response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            headers=HEADERS,
            json={"target_volume_sol": original_volume},
            timeout=15
        )
        assert restore_response.status_code == 200
        print(f"Config test passed - updated to {new_volume}, restored to {original_volume}")


class TestAdminLogin:
    """Test admin login"""
    
    def test_login_with_correct_password(self):
        """Login should succeed with correct password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            headers={"Content-Type": "application/json"},
            json={"password": ADMIN_PASSWORD},
            timeout=15
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
    
    def test_login_with_wrong_password(self):
        """Login should fail with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            headers={"Content-Type": "application/json"},
            json={"password": "wrongpassword"},
            timeout=15
        )
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
