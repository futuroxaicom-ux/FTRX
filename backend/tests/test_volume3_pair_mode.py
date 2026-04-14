"""
Test Volume Bot 3 (Bot Makk GL) - Token Pair Mode Features
Tests for iteration 9: Volume Bot 3 renamed to 'Bot Makk GL' with pair mode (MAKK GL <-> CRBR)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_PASSWORD = "futurox2026"
HEADERS = {
    "Content-Type": "application/json",
    "x-admin-password": ADMIN_PASSWORD
}

# Token addresses for pair mode
MAKK_GL_TOKEN = "4VdntG75wH1TUZMUaVL3bgbTGesLk18RbhJ7T35cmakK"
CRBR_TOKEN = "BrXYiFB8zkwdp75RQvJjeXVfnhHC9Bkny3Q9N2pCrbr"


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Admin login with correct password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("PASS: Admin login successful")
    
    def test_admin_login_failure(self):
        """Admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "wrongpassword"})
        assert response.status_code == 401
        print("PASS: Admin login correctly rejects wrong password")


class TestVolume3Status:
    """Test Volume Bot 3 status endpoint - pair_mode field"""
    
    def test_volume3_status_returns_pair_mode(self):
        """Volume3 status API should return pair_mode field"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/volume3/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        
        # Check pair_mode field exists
        assert "pair_mode" in data, "pair_mode field missing from status"
        print(f"PASS: pair_mode field present, value: {data['pair_mode']}")
        
        # Check config has output_mint field
        config = data.get("config", {})
        assert "output_mint" in config, "output_mint field missing from config"
        print(f"PASS: output_mint field present in config, value: '{config.get('output_mint', '')}'")
        
        # If output_mint is set, pair_mode should be True
        if config.get("output_mint"):
            assert data["pair_mode"] == True, "pair_mode should be True when output_mint is configured"
            print("PASS: pair_mode is True when output_mint is configured")
        else:
            assert data["pair_mode"] == False, "pair_mode should be False when output_mint is empty"
            print("PASS: pair_mode is False when output_mint is empty")
    
    def test_volume3_status_has_running_field(self):
        """Volume3 status should have running field"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/volume3/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        print(f"PASS: running field present, value: {data['running']}")
    
    def test_volume3_status_has_config(self):
        """Volume3 status should have config object"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/volume3/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "config" in data
        config = data["config"]
        
        # Check required config fields
        required_fields = ["token_mint", "output_mint", "target_volume_sol", "target_makers", 
                          "trade_interval_min", "trade_interval_max", "min_sol_per_trade", 
                          "max_sol_per_trade", "slippage_bps"]
        for field in required_fields:
            assert field in config, f"Config missing field: {field}"
        print(f"PASS: All required config fields present: {required_fields}")


class TestVolume3ConfigUpdate:
    """Test Volume Bot 3 config update - output_mint field"""
    
    def test_volume3_config_accepts_output_mint(self):
        """Volume3 config API should accept and save output_mint field"""
        # First get current config
        status_resp = requests.get(f"{BASE_URL}/api/admin/bot/volume3/status", headers=HEADERS)
        assert status_resp.status_code == 200
        original_config = status_resp.json().get("config", {})
        original_output_mint = original_config.get("output_mint", "")
        
        # Update with new output_mint
        test_output_mint = CRBR_TOKEN
        update_resp = requests.post(
            f"{BASE_URL}/api/admin/bot/volume3/config",
            headers=HEADERS,
            json={"output_mint": test_output_mint}
        )
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data.get("success") == True
        print(f"PASS: Config update accepted output_mint: {test_output_mint}")
        
        # Verify it was saved
        verify_resp = requests.get(f"{BASE_URL}/api/admin/bot/volume3/status", headers=HEADERS)
        assert verify_resp.status_code == 200
        new_config = verify_resp.json().get("config", {})
        assert new_config.get("output_mint") == test_output_mint
        print(f"PASS: output_mint persisted correctly: {new_config.get('output_mint')}")
        
        # Verify pair_mode is now True
        assert verify_resp.json().get("pair_mode") == True
        print("PASS: pair_mode is True after setting output_mint")
    
    def test_volume3_config_accepts_token_mint(self):
        """Volume3 config API should accept token_mint (base token)"""
        update_resp = requests.post(
            f"{BASE_URL}/api/admin/bot/volume3/config",
            headers=HEADERS,
            json={"token_mint": MAKK_GL_TOKEN}
        )
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data.get("success") == True
        
        # Verify
        verify_resp = requests.get(f"{BASE_URL}/api/admin/bot/volume3/status", headers=HEADERS)
        config = verify_resp.json().get("config", {})
        assert config.get("token_mint") == MAKK_GL_TOKEN
        print(f"PASS: token_mint (base) saved correctly: {MAKK_GL_TOKEN}")
    
    def test_volume3_config_clear_output_mint_disables_pair_mode(self):
        """Clearing output_mint should disable pair_mode"""
        # Set output_mint first
        requests.post(
            f"{BASE_URL}/api/admin/bot/volume3/config",
            headers=HEADERS,
            json={"output_mint": CRBR_TOKEN}
        )
        
        # Clear output_mint
        update_resp = requests.post(
            f"{BASE_URL}/api/admin/bot/volume3/config",
            headers=HEADERS,
            json={"output_mint": ""}
        )
        assert update_resp.status_code == 200
        
        # Verify pair_mode is False
        verify_resp = requests.get(f"{BASE_URL}/api/admin/bot/volume3/status", headers=HEADERS)
        assert verify_resp.json().get("pair_mode") == False
        print("PASS: pair_mode is False after clearing output_mint")
        
        # Restore output_mint for other tests
        requests.post(
            f"{BASE_URL}/api/admin/bot/volume3/config",
            headers=HEADERS,
            json={"output_mint": CRBR_TOKEN}
        )


class TestVolume3Wallets:
    """Test Volume Bot 3 wallets endpoint - balance_quote field"""
    
    def test_volume3_wallets_endpoint(self):
        """Volume3 wallets API should return wallet list"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/volume3/wallets", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "wallets" in data
        print(f"PASS: Wallets endpoint returns {len(data['wallets'])} wallets")
    
    def test_volume3_wallets_have_balance_fields(self):
        """Volume3 wallets should have balance_sol, balance_ftrx, and balance_quote fields"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/volume3/wallets", headers=HEADERS)
        assert response.status_code == 200
        wallets = response.json().get("wallets", [])
        
        if len(wallets) == 0:
            print("INFO: No wallets found for volume3, generating test wallets...")
            # Generate test wallets
            gen_resp = requests.post(
                f"{BASE_URL}/api/admin/bot/volume3/wallets/generate",
                headers=HEADERS,
                json={"count": 2, "prefix": "MakkGL"}
            )
            assert gen_resp.status_code == 200
            
            # Re-fetch wallets
            response = requests.get(f"{BASE_URL}/api/admin/bot/volume3/wallets", headers=HEADERS)
            wallets = response.json().get("wallets", [])
        
        if len(wallets) > 0:
            wallet = wallets[0]
            # Check balance_sol exists
            assert "balance_sol" in wallet, "balance_sol field missing"
            print(f"PASS: balance_sol field present: {wallet.get('balance_sol')}")
            
            # Check balance_ftrx exists (base token balance)
            assert "balance_ftrx" in wallet, "balance_ftrx field missing"
            print(f"PASS: balance_ftrx (base token) field present: {wallet.get('balance_ftrx')}")
            
            # Check balance_quote exists (quote token balance for pair mode)
            assert "balance_quote" in wallet, "balance_quote field missing"
            print(f"PASS: balance_quote field present: {wallet.get('balance_quote')}")
        else:
            pytest.skip("No wallets available for testing")


class TestVolume1NoRegression:
    """Test Volume Bot 1 still works (no regression)"""
    
    def test_volume1_status_works(self):
        """Volume Bot 1 status should still work"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        assert "config" in data
        print(f"PASS: Volume Bot 1 status works, running: {data['running']}")
    
    def test_volume1_pair_mode_is_false(self):
        """Volume Bot 1 should have pair_mode=false (not configured for pair trading)"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        
        # Volume Bot 1 should not be in pair mode
        pair_mode = data.get("pair_mode", False)
        assert pair_mode == False, "Volume Bot 1 should not be in pair mode"
        print(f"PASS: Volume Bot 1 pair_mode is False (no regression)")
    
    def test_volume1_wallets_work(self):
        """Volume Bot 1 wallets endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/admin/wallets", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "wallets" in data
        print(f"PASS: Volume Bot 1 wallets endpoint works, {len(data['wallets'])} wallets")


class TestOtherBotsAccessible:
    """Test all other bot tabs are still accessible"""
    
    def test_volume2_status(self):
        """Volume Bot 2 status should work"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/volume2/status", headers=HEADERS)
        assert response.status_code == 200
        print("PASS: Volume Bot 2 status accessible")
    
    def test_spread_bot_status(self):
        """Spread Bot status should work"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/spread/status", headers=HEADERS)
        assert response.status_code == 200
        print("PASS: Spread Bot status accessible")
    
    def test_sniper_bot_status(self):
        """Sniper Bot status should work"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/sniper/status", headers=HEADERS)
        assert response.status_code == 200
        print("PASS: Sniper Bot status accessible")
    
    def test_trade_bot_status(self):
        """Trade Bot status should work"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/trade/status", headers=HEADERS)
        assert response.status_code == 200
        print("PASS: Trade Bot status accessible")
    
    def test_arbitrage_bot_status(self):
        """Arbitrage Bot status should work"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/arbitrage/status", headers=HEADERS)
        assert response.status_code == 200
        print("PASS: Arbitrage Bot status accessible")
    
    def test_copytrade_bot_status(self):
        """Copy Trade Bot status should work"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/copytrade/status", headers=HEADERS)
        assert response.status_code == 200
        print("PASS: Copy Trade Bot status accessible")
    
    def test_holder_bot_status(self):
        """Holder Bot status should work"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/holder/status", headers=HEADERS)
        assert response.status_code == 200
        print("PASS: Holder Bot status accessible")


class TestBotListEndpoint:
    """Test bot list endpoint includes volume3"""
    
    def test_bot_list_includes_volume3(self):
        """Bot list should include volume3"""
        response = requests.get(f"{BASE_URL}/api/admin/bots", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        bots = data.get("bots", [])
        
        bot_types = [b["type"] for b in bots]
        assert "volume3" in bot_types, "volume3 missing from bot list"
        print(f"PASS: volume3 in bot list. All bots: {bot_types}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
