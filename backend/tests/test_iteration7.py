"""
Iteration 7 - Bug Fix Testing
Tests for:
1. DELETE functionality on CollectionsPage using onSelect (no window.confirm)
2. DELETE functionality on ProjectsPage using onSelect (no window.confirm)
3. CollectionsPage detail view - clicking items opens edit dialog
4. TagsPage - clicking tag card shows items grouped by source
5. Backend DELETE endpoints return 200
6. GET /api/tags/{tag_name}/items returns items grouped by source
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndSetup:
    """Auth setup for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login with existing test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_debug@test.com",
            "password": "test123"
        })
        if response.status_code != 200:
            # Try creating test user
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": "test_debug@test.com",
                "password": "test123",
                "name": "Test User"
            })
        assert response.status_code in [200, 201], f"Auth failed: {response.text}"
        return response.json()["access_token"]
    
    def test_auth_works(self, auth_token):
        """Verify auth token is valid"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        print(f"Authenticated as: {response.json()['email']}")


class TestDeleteEndpoints:
    """Test all DELETE endpoints return 200"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_debug@test.com",
            "password": "test123"
        })
        if response.status_code != 200:
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": "test_debug@test.com",
                "password": "test123",
                "name": "Test User"
            })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_collection_create_and_delete(self, auth_headers):
        """Create collection and delete it - verify 200 response"""
        # Create
        response = requests.post(f"{BASE_URL}/api/collections", 
            headers=auth_headers,
            json={"name": "TEST_DeleteCollection", "color": "blue"})
        assert response.status_code == 200, f"Create failed: {response.text}"
        collection_id = response.json()["id"]
        print(f"Created collection: {collection_id}")
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/collections/{collection_id}", 
            headers=auth_headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        print(f"Deleted collection - status: {response.status_code}")
        
        # Verify deleted
        response = requests.get(f"{BASE_URL}/api/collections/{collection_id}",
            headers=auth_headers)
        assert response.status_code == 404
        print("Collection verified deleted (404)")
    
    def test_project_create_and_delete(self, auth_headers):
        """Create project and delete it - verify 200 response"""
        # Create
        response = requests.post(f"{BASE_URL}/api/projects",
            headers=auth_headers,
            json={"name": "TEST_DeleteProject", "color": "violet"})
        assert response.status_code == 200, f"Create failed: {response.text}"
        project_id = response.json()["id"]
        print(f"Created project: {project_id}")
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/projects/{project_id}",
            headers=auth_headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        print(f"Deleted project - status: {response.status_code}")
        
        # Verify deleted
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}",
            headers=auth_headers)
        assert response.status_code == 404
        print("Project verified deleted (404)")
    
    def test_inventory_create_and_delete(self, auth_headers):
        """Create inventory item and delete it - verify 200 response"""
        # Create
        response = requests.post(f"{BASE_URL}/api/inventory",
            headers=auth_headers,
            json={"name": "TEST_DeleteInventory", "tags": ["testdelete"]})
        assert response.status_code == 200, f"Create failed: {response.text}"
        item_id = response.json()["id"]
        print(f"Created inventory item: {item_id}")
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/inventory/{item_id}",
            headers=auth_headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        print(f"Deleted inventory item - status: {response.status_code}")
    
    def test_wishlist_create_and_delete(self, auth_headers):
        """Create wishlist item and delete it"""
        # Create
        response = requests.post(f"{BASE_URL}/api/wishlist",
            headers=auth_headers,
            json={"name": "TEST_DeleteWishlist", "price": 100})
        assert response.status_code == 200, f"Create failed: {response.text}"
        item_id = response.json()["id"]
        print(f"Created wishlist item: {item_id}")
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/wishlist/{item_id}",
            headers=auth_headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        print(f"Deleted wishlist item - status: {response.status_code}")
    
    def test_content_create_and_delete(self, auth_headers):
        """Create content and delete it"""
        # Create
        response = requests.post(f"{BASE_URL}/api/content",
            headers=auth_headers,
            json={"title": "TEST_DeleteContent", "content_type": "recipe"})
        assert response.status_code == 200, f"Create failed: {response.text}"
        item_id = response.json()["id"]
        print(f"Created content item: {item_id}")
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/content/{item_id}",
            headers=auth_headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        print(f"Deleted content item - status: {response.status_code}")


class TestTagsEndpoint:
    """Test GET /api/tags/{tag_name}/items endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_debug@test.com",
            "password": "test123"
        })
        if response.status_code != 200:
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": "test_debug@test.com",
                "password": "test123",
                "name": "Test User"
            })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_tags_all_endpoint(self, auth_headers):
        """Test /api/tags/all returns all tags"""
        response = requests.get(f"{BASE_URL}/api/tags/all", headers=auth_headers)
        assert response.status_code == 200, f"Tags all failed: {response.text}"
        tags = response.json()
        print(f"Found {len(tags)} tags: {[t['name'] for t in tags]}")
        
        # Verify tag structure
        if tags:
            tag = tags[0]
            assert "name" in tag
            assert "count" in tag
            assert "sources" in tag
            print(f"Sample tag structure: {tag}")
    
    def test_create_items_with_tag_and_query(self, auth_headers):
        """Create items with a tag, then query via GET /api/tags/{tag_name}/items"""
        test_tag = "TEST_ITER7_TAG"
        
        # Create inventory item with tag
        inv_response = requests.post(f"{BASE_URL}/api/inventory",
            headers=auth_headers,
            json={"name": "TEST_InvItemWithTag", "tags": [test_tag]})
        assert inv_response.status_code == 200
        inv_id = inv_response.json()["id"]
        print(f"Created inventory with tag: {inv_id}")
        
        # Create wishlist item with same tag
        wish_response = requests.post(f"{BASE_URL}/api/wishlist",
            headers=auth_headers,
            json={"name": "TEST_WishItemWithTag", "tags": [test_tag]})
        assert wish_response.status_code == 200
        wish_id = wish_response.json()["id"]
        print(f"Created wishlist with tag: {wish_id}")
        
        # Create content item with same tag
        content_response = requests.post(f"{BASE_URL}/api/content",
            headers=auth_headers,
            json={"title": "TEST_ContentWithTag", "content_type": "recipe", "tags": [test_tag]})
        assert content_response.status_code == 200
        content_id = content_response.json()["id"]
        print(f"Created content with tag: {content_id}")
        
        # Query items by tag
        response = requests.get(f"{BASE_URL}/api/tags/{test_tag}/items", headers=auth_headers)
        assert response.status_code == 200, f"Tag items query failed: {response.text}"
        
        items_by_source = response.json()
        print(f"Items grouped by source: {list(items_by_source.keys())}")
        
        # Verify structure - should be grouped by source type
        assert "inventory" in items_by_source, "Should have inventory items"
        assert "wishlist" in items_by_source, "Should have wishlist items"
        assert "content" in items_by_source, "Should have content items"
        
        # Verify counts
        assert len(items_by_source["inventory"]) >= 1, "Should have at least 1 inventory item"
        assert len(items_by_source["wishlist"]) >= 1, "Should have at least 1 wishlist item"
        assert len(items_by_source["content"]) >= 1, "Should have at least 1 content item"
        
        print(f"Tag items verification: inventory={len(items_by_source['inventory'])}, wishlist={len(items_by_source['wishlist'])}, content={len(items_by_source['content'])}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/inventory/{inv_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/wishlist/{wish_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/content/{content_id}", headers=auth_headers)
        print("Cleanup complete")


class TestCollectionItems:
    """Test collection items endpoint for detail view"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_debug@test.com",
            "password": "test123"
        })
        if response.status_code != 200:
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": "test_debug@test.com",
                "password": "test123",
                "name": "Test User"
            })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_collection_items_endpoint(self, auth_headers):
        """Create collection with items and query items"""
        # Create collection
        col_response = requests.post(f"{BASE_URL}/api/collections",
            headers=auth_headers,
            json={"name": "TEST_CollectionWithItems", "color": "emerald"})
        assert col_response.status_code == 200
        collection_id = col_response.json()["id"]
        print(f"Created collection: {collection_id}")
        
        # Create inventory item in collection
        inv_response = requests.post(f"{BASE_URL}/api/inventory",
            headers=auth_headers,
            json={"name": "TEST_InvInCollection", "collection_id": collection_id})
        assert inv_response.status_code == 200
        inv_id = inv_response.json()["id"]
        print(f"Created inventory in collection: {inv_id}")
        
        # Create wishlist item in collection
        wish_response = requests.post(f"{BASE_URL}/api/wishlist",
            headers=auth_headers,
            json={"name": "TEST_WishInCollection", "collection_id": collection_id})
        assert wish_response.status_code == 200
        wish_id = wish_response.json()["id"]
        print(f"Created wishlist in collection: {wish_id}")
        
        # Query collection items
        response = requests.get(f"{BASE_URL}/api/collections/{collection_id}/items", 
            headers=auth_headers)
        assert response.status_code == 200, f"Collection items query failed: {response.text}"
        
        items = response.json()
        print(f"Collection items response: {items.keys()}")
        
        # Verify structure
        assert "inventory" in items, "Should have inventory key"
        assert "wishlist" in items, "Should have wishlist key"
        assert len(items["inventory"]) >= 1
        assert len(items["wishlist"]) >= 1
        
        print(f"Collection items: inventory={len(items['inventory'])}, wishlist={len(items['wishlist'])}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/inventory/{inv_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/wishlist/{wish_id}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/collections/{collection_id}", headers=auth_headers)
        print("Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
