"""
Backend tests for MyBase - Portfolio Advanced Features (Iteration 5)
Tests: Portfolio Transactions CRUD, Snapshots, Storage Usage API
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://unified-dashboard-24.preview.emergentagent.com').rstrip('/')

# ==================== FIXTURES ====================

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test2@test.com",
        "password": "test123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")

@pytest.fixture
def api_client(auth_token):
    """Authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session

@pytest.fixture
def test_asset(api_client):
    """Create a test asset for transactions"""
    asset_name = f"TEST_Asset_{uuid.uuid4().hex[:6]}"
    response = api_client.post(f"{BASE_URL}/api/portfolio", json={
        "name": asset_name,
        "asset_type": "crypto",
        "symbol": "TEST",
        "quantity": 10,
        "purchase_price": 100.0,
        "currency": "EUR"
    })
    assert response.status_code == 200
    return response.json()

# ==================== AUTH TESTS ====================

class TestAuth:
    """Test authentication"""
    
    def test_login_success(self):
        """Test successful login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "test2@test.com"

# ==================== STORAGE USAGE TESTS ====================

class TestStorageUsage:
    """Test storage usage endpoint"""
    
    def test_get_storage_usage(self, api_client):
        """Test GET /api/storage/usage returns correct format"""
        response = api_client.get(f"{BASE_URL}/api/storage/usage")
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected fields
        expected_fields = [
            "user_file_count", "user_size_bytes", "user_size_mb",
            "total_disk_bytes", "total_disk_mb", "total_disk_files"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Validate types
        assert isinstance(data["user_file_count"], int)
        assert isinstance(data["total_disk_files"], int)
        assert isinstance(data["total_disk_mb"], (int, float))
        assert data["user_file_count"] >= 0
        assert data["total_disk_files"] >= 0

# ==================== PORTFOLIO ASSET TESTS ====================

class TestPortfolioAssets:
    """Test portfolio asset CRUD"""
    
    def test_create_portfolio_asset(self, api_client):
        """Test creating a portfolio asset"""
        asset_name = f"TEST_Bitcoin_{uuid.uuid4().hex[:6]}"
        response = api_client.post(f"{BASE_URL}/api/portfolio", json={
            "name": asset_name,
            "asset_type": "crypto",
            "symbol": "BTC",
            "quantity": 1,
            "purchase_price": 50000.0,
            "currency": "EUR",
            "notes": "Test Bitcoin asset"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == asset_name
        assert data["asset_type"] == "crypto"
        assert data["symbol"] == "BTC"
        assert data["quantity"] == 1
        assert data["purchase_price"] == 50000.0
        assert "id" in data
        return data
    
    def test_get_portfolio_assets(self, api_client):
        """Test getting all portfolio assets"""
        response = api_client.get(f"{BASE_URL}/api/portfolio")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_portfolio_assets_by_type(self, api_client):
        """Test filtering portfolio assets by type"""
        response = api_client.get(f"{BASE_URL}/api/portfolio", params={"asset_type": "crypto"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for asset in data:
            assert asset["asset_type"] == "crypto"
    
    def test_update_portfolio_asset(self, api_client, test_asset):
        """Test updating a portfolio asset"""
        response = api_client.put(f"{BASE_URL}/api/portfolio/{test_asset['id']}", json={
            "current_price": 150.0,
            "notes": "Updated notes"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["current_price"] == 150.0
        assert data["notes"] == "Updated notes"
    
    def test_delete_portfolio_asset(self, api_client):
        """Test deleting a portfolio asset"""
        # Create asset to delete
        asset_name = f"TEST_ToDelete_{uuid.uuid4().hex[:6]}"
        create_response = api_client.post(f"{BASE_URL}/api/portfolio", json={
            "name": asset_name,
            "asset_type": "stock",
            "quantity": 5,
            "purchase_price": 200.0
        })
        assert create_response.status_code == 200
        asset_id = create_response.json()["id"]
        
        # Delete
        delete_response = api_client.delete(f"{BASE_URL}/api/portfolio/{asset_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = api_client.get(f"{BASE_URL}/api/portfolio/{asset_id}")
        assert get_response.status_code == 404

# ==================== PORTFOLIO TRANSACTIONS TESTS ====================

class TestPortfolioTransactions:
    """Test portfolio transactions CRUD"""
    
    def test_create_buy_transaction(self, api_client, test_asset):
        """Test creating a buy transaction"""
        response = api_client.post(f"{BASE_URL}/api/portfolio/transactions", json={
            "asset_id": test_asset["id"],
            "transaction_type": "buy",
            "quantity": 5,
            "price_per_unit": 110.0,
            "fees": 2.5,
            "notes": "Test buy transaction"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["asset_id"] == test_asset["id"]
        assert data["transaction_type"] == "buy"
        assert data["quantity"] == 5
        assert data["price_per_unit"] == 110.0
        assert data["total"] == 550.0  # 5 * 110
        assert data["fees"] == 2.5
        assert "id" in data
        return data
    
    def test_create_sell_transaction(self, api_client, test_asset):
        """Test creating a sell transaction"""
        response = api_client.post(f"{BASE_URL}/api/portfolio/transactions", json={
            "asset_id": test_asset["id"],
            "transaction_type": "sell",
            "quantity": 2,
            "price_per_unit": 120.0
        })
        assert response.status_code == 200
        data = response.json()
        assert data["transaction_type"] == "sell"
        assert data["quantity"] == 2
        assert data["total"] == 240.0
    
    def test_get_all_transactions(self, api_client):
        """Test getting all transactions"""
        response = api_client.get(f"{BASE_URL}/api/portfolio/transactions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_transactions_by_asset(self, api_client, test_asset):
        """Test getting transactions for specific asset"""
        # Create a transaction first
        api_client.post(f"{BASE_URL}/api/portfolio/transactions", json={
            "asset_id": test_asset["id"],
            "transaction_type": "buy",
            "quantity": 1,
            "price_per_unit": 100.0
        })
        
        # Get transactions for this asset
        response = api_client.get(f"{BASE_URL}/api/portfolio/transactions", 
                                 params={"asset_id": test_asset["id"]})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        for tx in data:
            assert tx["asset_id"] == test_asset["id"]
    
    def test_delete_transaction(self, api_client, test_asset):
        """Test deleting a transaction"""
        # Create transaction
        create_response = api_client.post(f"{BASE_URL}/api/portfolio/transactions", json={
            "asset_id": test_asset["id"],
            "transaction_type": "buy",
            "quantity": 1,
            "price_per_unit": 50.0
        })
        assert create_response.status_code == 200
        tx_id = create_response.json()["id"]
        
        # Delete transaction
        delete_response = api_client.delete(f"{BASE_URL}/api/portfolio/transactions/{tx_id}")
        assert delete_response.status_code == 200
    
    def test_transaction_with_invalid_asset(self, api_client):
        """Test creating transaction with non-existent asset"""
        response = api_client.post(f"{BASE_URL}/api/portfolio/transactions", json={
            "asset_id": "non-existent-id",
            "transaction_type": "buy",
            "quantity": 1,
            "price_per_unit": 100.0
        })
        assert response.status_code == 404

# ==================== PORTFOLIO SNAPSHOTS TESTS ====================

class TestPortfolioSnapshots:
    """Test portfolio snapshots"""
    
    def test_create_snapshot(self, api_client):
        """Test creating a portfolio snapshot"""
        response = api_client.post(f"{BASE_URL}/api/portfolio/snapshots")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "total_value" in data
        assert isinstance(data["total_value"], (int, float))
    
    def test_get_snapshots(self, api_client):
        """Test getting portfolio snapshots"""
        response = api_client.get(f"{BASE_URL}/api/portfolio/snapshots")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_snapshots_with_months_filter(self, api_client):
        """Test getting snapshots with months filter"""
        response = api_client.get(f"{BASE_URL}/api/portfolio/snapshots", params={"months": 6})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_snapshot_data_structure(self, api_client):
        """Test snapshot returns expected data structure"""
        # Create a snapshot first
        api_client.post(f"{BASE_URL}/api/portfolio/snapshots")
        
        # Get snapshots
        response = api_client.get(f"{BASE_URL}/api/portfolio/snapshots")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            snapshot = data[-1]  # Get latest
            expected_fields = ["date", "total_value", "user_id"]
            for field in expected_fields:
                assert field in snapshot, f"Snapshot missing field: {field}"

# ==================== DASHBOARD STATS TESTS ====================

class TestDashboardStats:
    """Test dashboard stats include portfolio data"""
    
    def test_dashboard_includes_portfolio_stats(self, api_client):
        """Test dashboard stats include portfolio values"""
        response = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Check portfolio-related fields
        portfolio_fields = ["portfolio", "portfolio_invested", "portfolio_current", "portfolio_gain"]
        for field in portfolio_fields:
            assert field in data, f"Missing portfolio field: {field}"

# ==================== MINDMAP TESTS ====================

class TestMindmap:
    """Test mindmap endpoint still works"""
    
    def test_get_mindmap(self, api_client):
        """Test getting mindmap data"""
        response = api_client.get(f"{BASE_URL}/api/mindmap")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data

# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
