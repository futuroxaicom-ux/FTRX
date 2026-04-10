"""
Backend API Tests for FuturoX AI - Crypto Landing Page
Tests: FTRX price, SOL price, Solana balance, Whitelist endpoints
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndRoot:
    """Basic health check tests"""
    
    def test_root_endpoint(self):
        """Test root API endpoint returns Hello World"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Hello World"
        print(f"✓ Root endpoint working: {data}")


class TestCryptoPrice:
    """Tests for /api/crypto/price - SOL price from CoinGecko"""
    
    def test_crypto_price_returns_solana_data(self):
        """Test that /api/crypto/price returns valid SOL price"""
        response = requests.get(f"{BASE_URL}/api/crypto/price")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "solana" in data, f"Expected 'solana' key in response, got: {data}"
        assert "usd" in data["solana"], f"Expected 'usd' in solana data, got: {data['solana']}"
        
        # Verify price is a valid number
        sol_price = data["solana"]["usd"]
        assert isinstance(sol_price, (int, float)), f"SOL price should be numeric, got: {type(sol_price)}"
        assert sol_price > 0, f"SOL price should be positive, got: {sol_price}"
        
        print(f"✓ SOL Price: ${sol_price}")
        
        # Check for 24h change (optional field)
        if "usd_24h_change" in data["solana"]:
            print(f"  24h Change: {data['solana']['usd_24h_change']:.2f}%")


class TestFTRXPrice:
    """Tests for /api/ftrx/price - FTRX token price from DexScreener"""
    
    def test_ftrx_price_returns_valid_data(self):
        """Test that /api/ftrx/price returns valid FTRX price data"""
        response = requests.get(f"{BASE_URL}/api/ftrx/price")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "price" in data, f"Expected 'price' key in response, got: {data.keys()}"
        assert "change24h" in data, f"Expected 'change24h' key in response"
        assert "chartData" in data, f"Expected 'chartData' key in response"
        
        # Verify price is numeric (can be 0 if token not yet listed)
        price = data["price"]
        assert isinstance(price, (int, float)), f"Price should be numeric, got: {type(price)}"
        
        # Verify chartData is a list with 7 days of data
        chart_data = data["chartData"]
        assert isinstance(chart_data, list), f"chartData should be a list"
        assert len(chart_data) == 7, f"Expected 7 days of chart data, got: {len(chart_data)}"
        
        # Verify chart data structure
        for point in chart_data:
            assert "time" in point, "Chart point should have 'time'"
            assert "price" in point, "Chart point should have 'price'"
        
        print(f"✓ FTRX Price: ${price}")
        print(f"  24h Change: {data['change24h']}%")
        print(f"  Source: {data.get('source', 'unknown')}")
        print(f"  Chart data points: {len(chart_data)}")


class TestSolanaBalance:
    """Tests for /api/solana/balance/{address} - Wallet balance"""
    
    def test_solana_balance_valid_address(self):
        """Test balance endpoint with a known Solana address"""
        # Using a well-known Solana address (Solana Foundation)
        test_address = "GK2zqSsXLA2rwVZk347RYhh6jJpRsCA69FjLW93ZGi3B"
        
        response = requests.get(f"{BASE_URL}/api/solana/balance/{test_address}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "address" in data, f"Expected 'address' in response"
        assert data["address"] == test_address
        
        # Check for either success or error response
        if "sol" in data:
            assert "lamports" in data, "Expected 'lamports' in response"
            assert isinstance(data["sol"], (int, float)), "SOL balance should be numeric"
            assert isinstance(data["lamports"], int), "Lamports should be integer"
            print(f"✓ Balance for {test_address[:8]}...: {data['sol']} SOL")
        elif "error" in data:
            # API might return error for some addresses
            print(f"⚠ Balance API returned error: {data['error']}")
    
    def test_solana_balance_invalid_address(self):
        """Test balance endpoint with invalid address"""
        invalid_address = "invalid_address_123"
        
        response = requests.get(f"{BASE_URL}/api/solana/balance/{invalid_address}")
        # Should still return 200 but with error in response
        assert response.status_code == 200
        data = response.json()
        
        # Should have error or invalid response
        print(f"✓ Invalid address handled: {data}")


class TestWhitelist:
    """Tests for /api/whitelist endpoints"""
    
    def test_whitelist_count(self):
        """Test /api/whitelist/count returns count"""
        response = requests.get(f"{BASE_URL}/api/whitelist/count")
        assert response.status_code == 200
        data = response.json()
        
        assert "count" in data, f"Expected 'count' in response, got: {data}"
        assert isinstance(data["count"], int), f"Count should be integer"
        assert data["count"] >= 0, f"Count should be non-negative"
        
        print(f"✓ Whitelist count: {data['count']}")
    
    def test_whitelist_add_new_entry(self):
        """Test adding a new entry to whitelist"""
        unique_email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
        
        payload = {
            "email": unique_email,
            "wallet_address": "GK2zqSsXLA2rwVZk347RYhh6jJpRsCA69FjLW93ZGi3B"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/whitelist",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data, f"Expected 'success' in response"
        assert data["success"] == True, f"Expected success=True, got: {data}"
        
        print(f"✓ Added to whitelist: {unique_email}")
    
    def test_whitelist_duplicate_email(self):
        """Test that duplicate email is rejected"""
        unique_email = f"TEST_duplicate_{uuid.uuid4().hex[:8]}@test.com"
        
        payload = {"email": unique_email}
        
        # First submission should succeed
        response1 = requests.post(
            f"{BASE_URL}/api/whitelist",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response1.status_code == 200
        assert response1.json()["success"] == True
        
        # Second submission with same email should fail
        response2 = requests.post(
            f"{BASE_URL}/api/whitelist",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        assert data2["success"] == False, f"Expected success=False for duplicate, got: {data2}"
        assert "already registered" in data2.get("detail", "").lower(), f"Expected 'already registered' message"
        
        print(f"✓ Duplicate email correctly rejected")
    
    def test_whitelist_email_only(self):
        """Test adding entry with email only (no wallet)"""
        unique_email = f"TEST_emailonly_{uuid.uuid4().hex[:8]}@test.com"
        
        payload = {"email": unique_email}
        
        response = requests.post(
            f"{BASE_URL}/api/whitelist",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        print(f"✓ Email-only whitelist entry added")


class TestCryptoChart:
    """Tests for /api/crypto/chart - SOL price history"""
    
    def test_crypto_chart_returns_data(self):
        """Test that /api/crypto/chart returns valid chart data"""
        response = requests.get(f"{BASE_URL}/api/crypto/chart")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response has prices array
        assert "prices" in data, f"Expected 'prices' in response, got: {data.keys()}"
        
        prices = data["prices"]
        assert isinstance(prices, list), "Prices should be a list"
        assert len(prices) > 0, "Should have price data points"
        
        # Each price point should be [timestamp, price]
        for point in prices[:3]:  # Check first 3 points
            assert isinstance(point, list), f"Price point should be list, got: {type(point)}"
            assert len(point) == 2, f"Price point should have 2 elements"
        
        print(f"✓ Chart data: {len(prices)} price points")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
