"""
Backend API Tests for Volume Bot Admin Panel
Tests: Admin login, bot status/start/stop/config, wallet management
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_PASSWORD = "futurox2026"

class TestAdminLogin:
    """Tests for /api/admin/login endpoint"""
    
    def test_admin_login_success(self):
        """Test admin login with correct password returns success"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "success" in data, f"Expected 'success' in response, got: {data}"
        assert data["success"] == True, f"Expected success=True, got: {data}"
        print(f"✓ Admin login successful with correct password")
    
    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "wrongpassword123"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Admin login correctly rejected wrong password with 401")
    
    def test_admin_login_empty_password(self):
        """Test admin login with empty password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ""},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Admin login correctly rejected empty password with 401")


class TestBotStatusEndpoint:
    """Tests for /api/admin/bot/status endpoint"""
    
    def test_bot_status_with_auth(self):
        """Test bot status endpoint with valid auth header"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bot/status",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "running" in data, f"Expected 'running' in response, got: {data.keys()}"
        assert "config" in data, f"Expected 'config' in response"
        assert "stats" in data, f"Expected 'stats' in response"
        assert "recent_transactions" in data, f"Expected 'recent_transactions' in response"
        
        # Verify config structure
        config = data["config"]
        assert "min_sol" in config, "Expected 'min_sol' in config"
        assert "max_sol" in config, "Expected 'max_sol' in config"
        assert "min_delay" in config, "Expected 'min_delay' in config"
        assert "max_delay" in config, "Expected 'max_delay' in config"
        assert "slippage_bps" in config, "Expected 'slippage_bps' in config"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_trades" in stats, "Expected 'total_trades' in stats"
        assert "total_volume_sol" in stats, "Expected 'total_volume_sol' in stats"
        assert "cycles" in stats, "Expected 'cycles' in stats"
        assert "errors" in stats, "Expected 'errors' in stats"
        
        print(f"✓ Bot status returned: running={data['running']}, trades={stats['total_trades']}")
    
    def test_bot_status_without_auth(self):
        """Test bot status endpoint without auth header returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Bot status correctly requires auth (401 without header)")
    
    def test_bot_status_wrong_auth(self):
        """Test bot status endpoint with wrong auth header returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bot/status",
            headers={"x-admin-password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Bot status correctly rejects wrong password (401)")


class TestBotStartStop:
    """Tests for /api/admin/bot/start and /api/admin/bot/stop endpoints"""
    
    def test_bot_start_with_auth(self):
        """Test bot start endpoint with valid auth"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/start",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "success" in data, f"Expected 'success' in response, got: {data}"
        assert "message" in data, f"Expected 'message' in response"
        
        # success can be True (started) or False (already running)
        print(f"✓ Bot start: success={data['success']}, message={data['message']}")
    
    def test_bot_stop_with_auth(self):
        """Test bot stop endpoint with valid auth"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/stop",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "success" in data, f"Expected 'success' in response, got: {data}"
        assert "message" in data, f"Expected 'message' in response"
        
        print(f"✓ Bot stop: success={data['success']}, message={data['message']}")
    
    def test_bot_start_without_auth(self):
        """Test bot start endpoint without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/admin/bot/start")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Bot start correctly requires auth (401)")
    
    def test_bot_stop_without_auth(self):
        """Test bot stop endpoint without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/admin/bot/stop")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Bot stop correctly requires auth (401)")


class TestBotConfig:
    """Tests for /api/admin/bot/config endpoint"""
    
    def test_bot_config_update(self):
        """Test updating bot configuration"""
        new_config = {
            "min_sol": 0.002,
            "max_sol": 0.02,
            "min_delay": 15,
            "max_delay": 45,
            "slippage_bps": 250
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json=new_config,
            headers={
                "Content-Type": "application/json",
                "x-admin-password": ADMIN_PASSWORD
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "success" in data, f"Expected 'success' in response"
        assert data["success"] == True, f"Expected success=True"
        assert "config" in data, f"Expected 'config' in response"
        
        # Verify config was updated
        config = data["config"]
        assert config["min_sol"] == 0.002, f"min_sol not updated"
        assert config["max_sol"] == 0.02, f"max_sol not updated"
        assert config["min_delay"] == 15, f"min_delay not updated"
        assert config["max_delay"] == 45, f"max_delay not updated"
        assert config["slippage_bps"] == 250, f"slippage_bps not updated"
        
        print(f"✓ Bot config updated successfully: {config}")
    
    def test_bot_config_partial_update(self):
        """Test partial config update (only some fields)"""
        partial_config = {"min_sol": 0.005}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json=partial_config,
            headers={
                "Content-Type": "application/json",
                "x-admin-password": ADMIN_PASSWORD
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["success"] == True
        assert data["config"]["min_sol"] == 0.005
        
        print(f"✓ Partial config update successful")
    
    def test_bot_config_without_auth(self):
        """Test config update without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"min_sol": 0.001},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Bot config correctly requires auth (401)")
    
    def test_bot_config_restore_defaults(self):
        """Restore default config after tests"""
        default_config = {
            "min_sol": 0.001,
            "max_sol": 0.01,
            "min_delay": 10,
            "max_delay": 60,
            "slippage_bps": 300
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json=default_config,
            headers={
                "Content-Type": "application/json",
                "x-admin-password": ADMIN_PASSWORD
            }
        )
        assert response.status_code == 200
        print(f"✓ Config restored to defaults")


class TestWalletManagement:
    """Tests for /api/admin/wallets endpoints"""
    
    def test_get_wallets_with_auth(self):
        """Test getting wallet list with valid auth"""
        response = requests.get(
            f"{BASE_URL}/api/admin/wallets",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "wallets" in data, f"Expected 'wallets' in response, got: {data}"
        assert isinstance(data["wallets"], list), "wallets should be a list"
        
        print(f"✓ Wallet list returned: {len(data['wallets'])} wallets")
    
    def test_get_wallets_without_auth(self):
        """Test getting wallet list without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/wallets")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Wallet list correctly requires auth (401)")
    
    def test_add_wallet_invalid_key(self):
        """Test adding wallet with invalid private key returns error"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets",
            json={
                "label": "Test Invalid Wallet",
                "private_key": "invalid_key_12345"
            },
            headers={
                "Content-Type": "application/json",
                "x-admin-password": ADMIN_PASSWORD
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should return success=False with error message
        assert "success" in data, f"Expected 'success' in response"
        assert data["success"] == False, f"Expected success=False for invalid key, got: {data}"
        assert "error" in data, f"Expected 'error' in response"
        assert "invalid" in data["error"].lower(), f"Expected 'invalid' in error message"
        
        print(f"✓ Invalid wallet key correctly rejected: {data['error']}")
    
    def test_add_wallet_without_auth(self):
        """Test adding wallet without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets",
            json={
                "label": "Test Wallet",
                "private_key": "some_key"
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Add wallet correctly requires auth (401)")
    
    def test_delete_wallet_without_auth(self):
        """Test deleting wallet without auth returns 401"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/wallets/somepublickey123",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Delete wallet correctly requires auth (401)")
    
    def test_delete_nonexistent_wallet(self):
        """Test deleting non-existent wallet"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/wallets/nonexistent_public_key_12345",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should return success=False since wallet doesn't exist
        assert "success" in data
        assert data["success"] == False, f"Expected success=False for non-existent wallet"
        
        print(f"✓ Delete non-existent wallet handled correctly")


class TestBotStartStopCycle:
    """Test bot start/stop cycle to verify state changes"""
    
    def test_bot_lifecycle(self):
        """Test full bot start -> status -> stop cycle"""
        headers = {"x-admin-password": ADMIN_PASSWORD}
        
        # 1. Stop bot first to ensure clean state
        stop_resp = requests.post(f"{BASE_URL}/api/admin/bot/stop", headers=headers)
        assert stop_resp.status_code == 200
        print(f"  Step 1: Bot stopped")
        
        # 2. Check status - should be not running
        status_resp = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=headers)
        assert status_resp.status_code == 200
        status_data = status_resp.json()
        assert status_data["running"] == False, f"Expected running=False after stop"
        print(f"  Step 2: Status confirmed not running")
        
        # 3. Start bot
        start_resp = requests.post(f"{BASE_URL}/api/admin/bot/start", headers=headers)
        assert start_resp.status_code == 200
        start_data = start_resp.json()
        assert start_data["success"] == True, f"Expected success=True on start"
        print(f"  Step 3: Bot started")
        
        # 4. Check status - should be running
        time.sleep(0.5)  # Small delay for state to update
        status_resp2 = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=headers)
        assert status_resp2.status_code == 200
        status_data2 = status_resp2.json()
        assert status_data2["running"] == True, f"Expected running=True after start"
        print(f"  Step 4: Status confirmed running")
        
        # 5. Try to start again - should return success=False (already running)
        start_resp2 = requests.post(f"{BASE_URL}/api/admin/bot/start", headers=headers)
        assert start_resp2.status_code == 200
        start_data2 = start_resp2.json()
        assert start_data2["success"] == False, f"Expected success=False when already running"
        print(f"  Step 5: Double-start correctly handled")
        
        # 6. Stop bot
        stop_resp2 = requests.post(f"{BASE_URL}/api/admin/bot/stop", headers=headers)
        assert stop_resp2.status_code == 200
        print(f"  Step 6: Bot stopped")
        
        # 7. Verify stopped
        status_resp3 = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=headers)
        assert status_resp3.status_code == 200
        status_data3 = status_resp3.json()
        assert status_data3["running"] == False, f"Expected running=False after final stop"
        print(f"  Step 7: Final status confirmed not running")
        
        print(f"✓ Bot lifecycle test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
