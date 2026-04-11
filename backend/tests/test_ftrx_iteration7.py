"""
Test FTRX Features - Iteration 7
Tests for: Activity Chart, FTRX balance display, Collect FTRX button, Refresh FTRX button
Focus: Verify /api/admin/wallets responds quickly with balance_sol and balance_ftrx fields
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_PASSWORD = "futurox2026"
HEADERS = {"Content-Type": "application/json", "x-admin-password": ADMIN_PASSWORD}


class TestWalletsEndpointPerformance:
    """Test that /api/admin/wallets responds quickly with required fields"""
    
    def test_wallets_endpoint_responds_within_5_seconds(self):
        """CRITICAL: Wallets endpoint must respond in < 5 seconds for 134 wallets"""
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/admin/wallets", headers=HEADERS, timeout=10)
        elapsed = time.time() - start_time
        
        print(f"Wallets endpoint response time: {elapsed:.2f} seconds")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert elapsed < 5, f"Endpoint took {elapsed:.2f}s, expected < 5s"
        
    def test_wallets_have_balance_sol_field(self):
        """Each wallet should have balance_sol field"""
        response = requests.get(f"{BASE_URL}/api/admin/wallets", headers=HEADERS, timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        wallets = data.get("wallets", [])
        print(f"Total wallets: {len(wallets)}")
        
        assert len(wallets) > 0, "Expected at least 1 wallet"
        
        # Check first 5 wallets have balance_sol
        for i, wallet in enumerate(wallets[:5]):
            assert "balance_sol" in wallet, f"Wallet {i} missing balance_sol field"
            assert isinstance(wallet["balance_sol"], (int, float)), f"balance_sol should be numeric"
            print(f"Wallet {i}: {wallet.get('label', 'N/A')} - balance_sol: {wallet['balance_sol']}")
            
    def test_wallets_have_balance_ftrx_field(self):
        """Each wallet should have balance_ftrx field"""
        response = requests.get(f"{BASE_URL}/api/admin/wallets", headers=HEADERS, timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        wallets = data.get("wallets", [])
        
        # Check first 5 wallets have balance_ftrx
        for i, wallet in enumerate(wallets[:5]):
            assert "balance_ftrx" in wallet, f"Wallet {i} missing balance_ftrx field"
            assert isinstance(wallet["balance_ftrx"], (int, float)), f"balance_ftrx should be numeric"
            print(f"Wallet {i}: {wallet.get('label', 'N/A')} - balance_ftrx: {wallet['balance_ftrx']}")


class TestCollectFtrxEndpoint:
    """Test /api/admin/wallets/collect-ftrx endpoint"""
    
    def test_collect_ftrx_returns_success(self):
        """POST /api/admin/wallets/collect-ftrx should return success"""
        response = requests.post(f"{BASE_URL}/api/admin/wallets/collect-ftrx", headers=HEADERS, timeout=10)
        
        print(f"collect-ftrx response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True or "message" in data, "Expected success or message in response"
        
    def test_collect_ftrx_status_returns_status(self):
        """GET /api/admin/wallets/collect-ftrx/status should return status"""
        # First trigger collect
        requests.post(f"{BASE_URL}/api/admin/wallets/collect-ftrx", headers=HEADERS, timeout=10)
        
        # Wait a bit for background task
        time.sleep(2)
        
        # Check status
        response = requests.get(f"{BASE_URL}/api/admin/wallets/collect-ftrx/status", headers=HEADERS, timeout=10)
        
        print(f"collect-ftrx/status response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        
        data = response.json()
        assert "running" in data, "Expected 'running' field in status"


class TestRefreshFtrxEndpoint:
    """Test /api/admin/wallets/refresh-ftrx endpoint"""
    
    def test_refresh_ftrx_returns_success(self):
        """POST /api/admin/wallets/refresh-ftrx should return success"""
        response = requests.post(f"{BASE_URL}/api/admin/wallets/refresh-ftrx", headers=HEADERS, timeout=10)
        
        print(f"refresh-ftrx response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True or "message" in data, "Expected success or message in response"


class TestAdminLogin:
    """Test admin login still works"""
    
    def test_admin_login_with_correct_password(self):
        """Admin login should work with futurox2026"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            headers={"Content-Type": "application/json"},
            json={"password": "futurox2026"},
            timeout=10
        )
        
        print(f"Login response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True


class TestBotStatusWithActivityData:
    """Test bot status returns activity data for chart"""
    
    def test_bot_status_has_recent_transactions(self):
        """Bot status should have recent_transactions field for activity chart"""
        response = requests.get(f"{BASE_URL}/api/admin/bot/status", headers=HEADERS, timeout=10)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_transactions" in data, "Expected recent_transactions field for activity chart"
        assert isinstance(data["recent_transactions"], list), "recent_transactions should be a list"
        print(f"Recent transactions count: {len(data['recent_transactions'])}")


class TestLandingPage:
    """Test landing page loads"""
    
    def test_landing_page_loads(self):
        """Landing page at / should load"""
        response = requests.get(f"{BASE_URL}/", timeout=10)
        
        print(f"Landing page response: {response.status_code}")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
