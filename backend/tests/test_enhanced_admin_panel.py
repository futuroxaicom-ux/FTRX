"""
Backend API Tests for Enhanced Volume Bot Admin Panel (Iteration 4)
Tests: Token mint config, cost calculator, wallet generation, distribute/collect SOL, progress bars
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_PASSWORD = "futurox2026"
ADMIN_HEADERS = {
    "Content-Type": "application/json",
    "x-admin-password": ADMIN_PASSWORD
}


class TestAdminLoginEnhanced:
    """Tests for /api/admin/login endpoint"""
    
    def test_admin_login_success(self):
        """Test admin login with correct password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Admin login successful")
    
    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"password": "wrongpassword"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401
        print("✓ Wrong password correctly rejected with 401")


class TestBotStatusNewFields:
    """Tests for /api/admin/bot/status with new config fields"""
    
    def test_status_returns_new_config_fields(self):
        """Test bot status returns all new config fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bot/status",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify new config fields exist
        config = data.get("config", {})
        required_fields = [
            "token_mint",
            "target_volume_sol",
            "target_makers",
            "trade_interval_min",
            "trade_interval_max",
            "min_sol_per_trade",
            "max_sol_per_trade",
            "slippage_bps"
        ]
        
        for field in required_fields:
            assert field in config, f"Missing config field: {field}"
        
        # Verify token_mint is a string
        assert isinstance(config["token_mint"], str), "token_mint should be string"
        assert len(config["token_mint"]) > 0, "token_mint should not be empty"
        
        # Verify numeric fields
        assert isinstance(config["target_volume_sol"], (int, float))
        assert isinstance(config["target_makers"], int)
        assert isinstance(config["trade_interval_min"], int)
        assert isinstance(config["trade_interval_max"], int)
        assert isinstance(config["min_sol_per_trade"], (int, float))
        assert isinstance(config["max_sol_per_trade"], (int, float))
        assert isinstance(config["slippage_bps"], int)
        
        print(f"✓ Bot status returns all new config fields: {list(config.keys())}")
    
    def test_status_without_auth_returns_401(self):
        """Test bot status without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/status")
        assert response.status_code == 401
        print("✓ Bot status correctly requires auth")


class TestBotConfigNewFields:
    """Tests for /api/admin/bot/config with new fields"""
    
    def test_config_update_token_mint(self):
        """Test updating token_mint field"""
        # Save original config
        status_resp = requests.get(
            f"{BASE_URL}/api/admin/bot/status",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        original_config = status_resp.json().get("config", {})
        
        # Update token_mint
        new_mint = "TEST_TOKEN_MINT_ADDRESS_12345"
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"token_mint": new_mint},
            headers=ADMIN_HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["config"]["token_mint"] == new_mint
        
        # Restore original
        requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"token_mint": original_config.get("token_mint")},
            headers=ADMIN_HEADERS
        )
        print("✓ token_mint field can be updated")
    
    def test_config_update_target_volume_sol(self):
        """Test updating target_volume_sol field"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"target_volume_sol": 100},
            headers=ADMIN_HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert data["config"]["target_volume_sol"] == 100
        
        # Restore
        requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"target_volume_sol": 10},
            headers=ADMIN_HEADERS
        )
        print("✓ target_volume_sol field can be updated")
    
    def test_config_update_target_makers(self):
        """Test updating target_makers field"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"target_makers": 50},
            headers=ADMIN_HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert data["config"]["target_makers"] == 50
        
        # Restore
        requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"target_makers": 20},
            headers=ADMIN_HEADERS
        )
        print("✓ target_makers field can be updated")
    
    def test_config_update_trade_intervals(self):
        """Test updating trade interval fields"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"trade_interval_min": 5, "trade_interval_max": 30},
            headers=ADMIN_HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert data["config"]["trade_interval_min"] == 5
        assert data["config"]["trade_interval_max"] == 30
        
        # Restore
        requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"trade_interval_min": 10, "trade_interval_max": 15},
            headers=ADMIN_HEADERS
        )
        print("✓ trade_interval_min/max fields can be updated")
    
    def test_config_update_sol_per_trade(self):
        """Test updating min/max SOL per trade fields"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"min_sol_per_trade": 0.01, "max_sol_per_trade": 0.1},
            headers=ADMIN_HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert data["config"]["min_sol_per_trade"] == 0.01
        assert data["config"]["max_sol_per_trade"] == 0.1
        
        # Restore
        requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"min_sol_per_trade": 0.005, "max_sol_per_trade": 0.05},
            headers=ADMIN_HEADERS
        )
        print("✓ min/max_sol_per_trade fields can be updated")
    
    def test_config_without_auth_returns_401(self):
        """Test config update without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"target_volume_sol": 100},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401
        print("✓ Config update correctly requires auth")


class TestCostCalculator:
    """Tests for /api/admin/bot/costs endpoint"""
    
    def test_costs_returns_all_fields(self):
        """Test cost calculator returns all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bot/costs",
            headers={"x-admin-password": ADMIN_PASSWORD}
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
            assert field in data, f"Missing cost field: {field}"
        
        # Verify numeric types
        assert isinstance(data["trades_per_day"], int)
        assert isinstance(data["total_transactions"], int)
        assert isinstance(data["gas_cost_sol"], (int, float))
        assert isinstance(data["slippage_cost_sol"], (int, float))
        assert isinstance(data["total_daily_cost_sol"], (int, float))
        assert isinstance(data["sol_needed_minimum"], (int, float))
        
        print(f"✓ Cost calculator returns all fields: {data}")
    
    def test_costs_update_with_config_change(self):
        """Test that costs update when config changes"""
        # Get initial costs
        initial_resp = requests.get(
            f"{BASE_URL}/api/admin/bot/costs",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        initial_costs = initial_resp.json()
        
        # Update config to higher volume
        requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"target_volume_sol": 100},
            headers=ADMIN_HEADERS
        )
        
        # Get updated costs
        updated_resp = requests.get(
            f"{BASE_URL}/api/admin/bot/costs",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        updated_costs = updated_resp.json()
        
        # Slippage cost should be higher with higher volume
        assert updated_costs["slippage_cost_sol"] > initial_costs["slippage_cost_sol"], \
            "Slippage cost should increase with higher volume"
        
        # Restore config
        requests.post(
            f"{BASE_URL}/api/admin/bot/config",
            json={"target_volume_sol": 10},
            headers=ADMIN_HEADERS
        )
        
        print("✓ Cost calculator updates when config changes")
    
    def test_costs_without_auth_returns_401(self):
        """Test costs endpoint without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/costs")
        assert response.status_code == 401
        print("✓ Costs endpoint correctly requires auth")


class TestWalletGeneration:
    """Tests for /api/admin/wallets/generate endpoint"""
    
    def test_generate_wallets_success(self):
        """Test generating wallets returns public keys"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/generate",
            json={"count": 2, "prefix": "TestGen"},
            headers=ADMIN_HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("count") == 2
        assert "wallets" in data
        assert len(data["wallets"]) == 2
        
        # Verify wallet structure
        for wallet in data["wallets"]:
            assert "label" in wallet
            assert "public_key" in wallet
            assert "TestGen" in wallet["label"]
            # Solana public keys are 32-44 characters base58
            assert len(wallet["public_key"]) >= 32
        
        print(f"✓ Generated {data['count']} wallets: {[w['public_key'][:8]+'...' for w in data['wallets']]}")
    
    def test_generate_wallets_default_values(self):
        """Test generating wallets with default values"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/generate",
            json={},
            headers=ADMIN_HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Generated wallets with defaults: count={data.get('count')}")
    
    def test_generate_wallets_without_auth_returns_401(self):
        """Test generate wallets without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/generate",
            json={"count": 1},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401
        print("✓ Generate wallets correctly requires auth")


class TestWalletMainSetting:
    """Tests for /api/admin/wallets/{pubkey}/main endpoint"""
    
    def test_set_main_wallet(self):
        """Test setting a wallet as main"""
        # Get wallets
        wallets_resp = requests.get(
            f"{BASE_URL}/api/admin/wallets",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        wallets = wallets_resp.json().get("wallets", [])
        
        if len(wallets) == 0:
            pytest.skip("No wallets to test with")
        
        # Set first wallet as main
        pubkey = wallets[0]["public_key"]
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/{pubkey}/main",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify it's now main
        verify_resp = requests.get(
            f"{BASE_URL}/api/admin/wallets",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        verify_wallets = verify_resp.json().get("wallets", [])
        main_wallet = next((w for w in verify_wallets if w.get("is_main")), None)
        
        assert main_wallet is not None, "Should have a main wallet"
        assert main_wallet["public_key"] == pubkey
        
        print(f"✓ Set main wallet: {pubkey[:8]}...")
    
    def test_set_main_wallet_without_auth_returns_401(self):
        """Test set main wallet without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/somepubkey/main"
        )
        assert response.status_code == 401
        print("✓ Set main wallet correctly requires auth")


class TestWalletListWithIsMain:
    """Tests for /api/admin/wallets with is_main field"""
    
    def test_wallets_have_is_main_field(self):
        """Test wallet list includes is_main field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/wallets",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        wallets = data.get("wallets", [])
        if len(wallets) == 0:
            pytest.skip("No wallets to test")
        
        for wallet in wallets:
            assert "is_main" in wallet, f"Wallet missing is_main field: {wallet}"
            assert isinstance(wallet["is_main"], bool), "is_main should be boolean"
        
        # Count main wallets (should be 0 or 1)
        main_count = sum(1 for w in wallets if w["is_main"])
        assert main_count <= 1, f"Should have at most 1 main wallet, found {main_count}"
        
        print(f"✓ All {len(wallets)} wallets have is_main field, main_count={main_count}")


class TestDistributeSol:
    """Tests for /api/admin/wallets/distribute endpoint"""
    
    def test_distribute_sol_structure(self):
        """Test distribute SOL returns proper structure"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/distribute",
            json={"sol_per_wallet": 0.01},
            headers=ADMIN_HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have proper structure even if fails due to no funds
        if "error" in data:
            # Error case (no main wallet set)
            assert isinstance(data["error"], str)
            print(f"✓ Distribute SOL returned error (expected): {data['error']}")
        else:
            # Success structure
            assert "success" in data
            assert "total" in data
            assert "sent" in data
            assert "failed" in data
            assert "sol_per_wallet" in data
            assert "details" in data
            print(f"✓ Distribute SOL structure: total={data['total']}, sent={data['sent']}, failed={data['failed']}")
    
    def test_distribute_sol_without_auth_returns_401(self):
        """Test distribute SOL without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/distribute",
            json={"sol_per_wallet": 0.01},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401
        print("✓ Distribute SOL correctly requires auth")


class TestCollectSol:
    """Tests for /api/admin/wallets/collect endpoint"""
    
    def test_collect_sol_structure(self):
        """Test collect SOL returns proper structure"""
        response = requests.post(
            f"{BASE_URL}/api/admin/wallets/collect",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have proper structure even if no funds to collect
        if "error" in data:
            # Error case (no main wallet set)
            assert isinstance(data["error"], str)
            print(f"✓ Collect SOL returned error (expected): {data['error']}")
        else:
            # Success structure
            assert "success" in data
            assert "total_collected_sol" in data
            assert "wallets_processed" in data
            assert "details" in data
            print(f"✓ Collect SOL structure: collected={data['total_collected_sol']}, processed={data['wallets_processed']}")
    
    def test_collect_sol_without_auth_returns_401(self):
        """Test collect SOL without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/admin/wallets/collect")
        assert response.status_code == 401
        print("✓ Collect SOL correctly requires auth")


class TestAllEndpointsAuth:
    """Verify all admin endpoints return 401 without auth"""
    
    def test_all_endpoints_require_auth(self):
        """Test all admin endpoints return 401 without x-admin-password header"""
        # Endpoints with their required body data for validation
        endpoints = [
            ("GET", "/api/admin/bot/status", None),
            ("POST", "/api/admin/bot/start", None),
            ("POST", "/api/admin/bot/stop", None),
            ("POST", "/api/admin/bot/config", {}),
            ("GET", "/api/admin/bot/costs", None),
            ("GET", "/api/admin/wallets", None),
            ("POST", "/api/admin/wallets", {"label": "test", "private_key": "test"}),  # Needs valid body
            ("POST", "/api/admin/wallets/generate", {"count": 1}),
            ("POST", "/api/admin/wallets/distribute", {"sol_per_wallet": 0.01}),
            ("POST", "/api/admin/wallets/collect", None),
            ("DELETE", "/api/admin/wallets/testpubkey", None),
            ("POST", "/api/admin/wallets/testpubkey/main", None),
        ]
        
        for method, endpoint, body in endpoints:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}")
            elif method == "POST":
                response = requests.post(
                    f"{BASE_URL}{endpoint}",
                    json=body if body else {},
                    headers={"Content-Type": "application/json"}
                )
            elif method == "DELETE":
                response = requests.delete(f"{BASE_URL}{endpoint}")
            
            assert response.status_code == 401, f"{method} {endpoint} should return 401, got {response.status_code}"
        
        print(f"✓ All {len(endpoints)} admin endpoints correctly require auth")


class TestCleanup:
    """Cleanup test wallets"""
    
    def test_cleanup_test_wallets(self):
        """Remove test-generated wallets"""
        response = requests.get(
            f"{BASE_URL}/api/admin/wallets",
            headers={"x-admin-password": ADMIN_PASSWORD}
        )
        wallets = response.json().get("wallets", [])
        
        deleted = 0
        for wallet in wallets:
            if "Test" in wallet.get("label", "") or "TestGen" in wallet.get("label", ""):
                del_resp = requests.delete(
                    f"{BASE_URL}/api/admin/wallets/{wallet['public_key']}",
                    headers={"x-admin-password": ADMIN_PASSWORD}
                )
                if del_resp.status_code == 200:
                    deleted += 1
        
        print(f"✓ Cleaned up {deleted} test wallets")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
