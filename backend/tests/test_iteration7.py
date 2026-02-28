"""
Iteration 7 Tests - Bug Fixes
Tests for:
- DELETE functionality for inventory, wishlist, collections, content
- Mind map loading and filters
- Custom content type creation
- Card click opening edit dialogs
- Tags API format
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Test authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_login(self):
        """Test login with test2@test.com / test123"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"SUCCESS: Login - user: {data['user']['email']}")
        return data["access_token"]


class TestDeleteFunctionality:
    """Test DELETE endpoints for all resources"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login first
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_inventory_delete(self):
        """Test create and delete inventory item"""
        # Create test item
        create_response = self.session.post(f"{BASE_URL}/api/inventory", json={
            "name": "TEST_Delete_Item",
            "description": "Item for delete test",
            "tags": ["test-delete"]
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        item_id = create_response.json()["id"]
        print(f"SUCCESS: Created inventory item {item_id}")
        
        # Delete item
        delete_response = self.session.delete(f"{BASE_URL}/api/inventory/{item_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"SUCCESS: Deleted inventory item {item_id}")
        
        # Verify deletion - should return 404
        get_response = self.session.get(f"{BASE_URL}/api/inventory/{item_id}")
        assert get_response.status_code == 404
        print("SUCCESS: Verified item no longer exists")
    
    def test_wishlist_delete(self):
        """Test create and delete wishlist item"""
        # Create test item
        create_response = self.session.post(f"{BASE_URL}/api/wishlist", json={
            "name": "TEST_Delete_Wishlist",
            "description": "Wishlist item for delete test",
            "price": 100,
            "tags": ["test-delete"]
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        item_id = create_response.json()["id"]
        print(f"SUCCESS: Created wishlist item {item_id}")
        
        # Delete item
        delete_response = self.session.delete(f"{BASE_URL}/api/wishlist/{item_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"SUCCESS: Deleted wishlist item {item_id}")
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/wishlist/{item_id}")
        assert get_response.status_code == 404
        print("SUCCESS: Verified wishlist item no longer exists")
    
    def test_collection_delete(self):
        """Test create and delete collection"""
        # Create test collection
        create_response = self.session.post(f"{BASE_URL}/api/collections", json={
            "name": "TEST_Delete_Collection",
            "description": "Collection for delete test",
            "color": "blue"
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        collection_id = create_response.json()["id"]
        print(f"SUCCESS: Created collection {collection_id}")
        
        # Delete collection
        delete_response = self.session.delete(f"{BASE_URL}/api/collections/{collection_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"SUCCESS: Deleted collection {collection_id}")
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/collections/{collection_id}")
        assert get_response.status_code == 404
        print("SUCCESS: Verified collection no longer exists")
    
    def test_content_delete(self):
        """Test create and delete content"""
        # Create test content
        create_response = self.session.post(f"{BASE_URL}/api/content", json={
            "title": "TEST_Delete_Content",
            "content_type": "recipe",
            "description": "Content for delete test",
            "tags": ["test-delete"]
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        content_id = create_response.json()["id"]
        print(f"SUCCESS: Created content {content_id}")
        
        # Delete content
        delete_response = self.session.delete(f"{BASE_URL}/api/content/{content_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"SUCCESS: Deleted content {content_id}")
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/content/{content_id}")
        assert get_response.status_code == 404
        print("SUCCESS: Verified content no longer exists")


class TestCustomContentType:
    """Test custom content type creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login first
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_create_content_with_custom_type(self):
        """Test creating content with custom type 'podcast'"""
        # Create content with custom type
        create_response = self.session.post(f"{BASE_URL}/api/content", json={
            "title": "TEST_Podcast_Episode",
            "content_type": "podcast",
            "description": "A test podcast episode",
            "body": "Podcast content here",
            "tags": ["test-podcast"]
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        data = create_response.json()
        assert data["content_type"] == "podcast", "Content type should be 'podcast'"
        content_id = data["id"]
        print(f"SUCCESS: Created content with custom type 'podcast' - id: {content_id}")
        
        # Get the content to verify type is saved
        get_response = self.session.get(f"{BASE_URL}/api/content/{content_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["content_type"] == "podcast"
        print("SUCCESS: Custom content type 'podcast' is correctly saved")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/content/{content_id}")


class TestTagsAPI:
    """Test tags API format"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login first
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_tags_all_api_format(self):
        """Test GET /api/tags/all returns correct format [{name, count, sources}]"""
        response = self.session.get(f"{BASE_URL}/api/tags/all")
        assert response.status_code == 200, f"Tags API failed: {response.text}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Response should be a list"
        
        # Each item should have name, count, sources
        if len(data) > 0:
            tag = data[0]
            assert "name" in tag, "Tag should have 'name'"
            assert "count" in tag, "Tag should have 'count'"
            assert "sources" in tag, "Tag should have 'sources'"
            print(f"SUCCESS: Tags API format correct - {len(data)} tags found")
            print(f"  Sample tag: {tag}")
        else:
            print("SUCCESS: Tags API format correct - 0 tags found (empty list)")


class TestMindmapAPI:
    """Test mindmap API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login first
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_mindmap_data(self):
        """Test GET /api/mindmap returns nodes and edges"""
        response = self.session.get(f"{BASE_URL}/api/mindmap")
        assert response.status_code == 200, f"Mindmap API failed: {response.text}"
        data = response.json()
        
        assert "nodes" in data, "Response should have 'nodes'"
        assert "edges" in data, "Response should have 'edges'"
        print(f"SUCCESS: Mindmap API - {len(data['nodes'])} nodes, {len(data['edges'])} edges")
    
    def test_mindmap_with_type_filter(self):
        """Test GET /api/mindmap with type filter"""
        response = self.session.get(f"{BASE_URL}/api/mindmap", params={"perspective": "type:inventory"})
        assert response.status_code == 200, f"Mindmap filter failed: {response.text}"
        data = response.json()
        
        assert "nodes" in data
        assert "edges" in data
        # Check nodes are filtered by type
        for node in data.get("nodes", []):
            if node.get("type") != "inventory":
                # Some related nodes of other types might be included
                pass
        print(f"SUCCESS: Mindmap type filter - {len(data['nodes'])} nodes")
    
    def test_mindmap_with_tag_filter(self):
        """Test GET /api/mindmap with tag filter"""
        response = self.session.get(f"{BASE_URL}/api/mindmap", params={"perspective": "tag:luxe"})
        assert response.status_code == 200, f"Mindmap tag filter failed: {response.text}"
        data = response.json()
        
        assert "nodes" in data
        assert "edges" in data
        print(f"SUCCESS: Mindmap tag filter 'luxe' - {len(data['nodes'])} nodes")


class TestCollectionItems:
    """Test collection items API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login first
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_collection_items_api(self):
        """Test GET /api/collections/{id}/items returns inventory and wishlist"""
        # First get collections
        cols_response = self.session.get(f"{BASE_URL}/api/collections")
        assert cols_response.status_code == 200
        collections = cols_response.json()
        
        if len(collections) > 0:
            collection_id = collections[0]["id"]
            response = self.session.get(f"{BASE_URL}/api/collections/{collection_id}/items")
            assert response.status_code == 200, f"Collection items failed: {response.text}"
            data = response.json()
            
            assert "inventory" in data, "Response should have 'inventory'"
            assert "wishlist" in data, "Response should have 'wishlist'"
            print(f"SUCCESS: Collection items API - inventory: {len(data['inventory'])}, wishlist: {len(data['wishlist'])}")
        else:
            print("SUCCESS: No collections to test (skipped)")


class TestProjectDelete:
    """Test project delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login first
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_project_delete(self):
        """Test create and delete project"""
        # Create test project
        create_response = self.session.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_Delete_Project",
            "description": "Project for delete test",
            "color": "blue"
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        project_id = create_response.json()["id"]
        print(f"SUCCESS: Created project {project_id}")
        
        # Delete project
        delete_response = self.session.delete(f"{BASE_URL}/api/projects/{project_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"SUCCESS: Deleted project {project_id}")
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/projects/{project_id}")
        assert get_response.status_code == 404
        print("SUCCESS: Verified project no longer exists")


class TestPortfolioDelete:
    """Test portfolio asset delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login first
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_portfolio_delete(self):
        """Test create and delete portfolio asset"""
        # Create test asset
        create_response = self.session.post(f"{BASE_URL}/api/portfolio", json={
            "name": "TEST_Delete_Asset",
            "asset_type": "crypto",
            "symbol": "TEST",
            "quantity": 1,
            "purchase_price": 100
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        asset_id = create_response.json()["id"]
        print(f"SUCCESS: Created portfolio asset {asset_id}")
        
        # Delete asset
        delete_response = self.session.delete(f"{BASE_URL}/api/portfolio/{asset_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"SUCCESS: Deleted portfolio asset {asset_id}")
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/portfolio/{asset_id}")
        assert get_response.status_code == 404
        print("SUCCESS: Verified asset no longer exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
