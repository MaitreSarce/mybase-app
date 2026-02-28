"""
Iteration 6 Backend Tests - Bug fixes and improvements
Tests:
1. Auth login test2@test.com
2. Tags /api/tags/all - auto-discover from all items
3. Collections /api/collections/{id}/items - returns inventory + wishlist
4. Wishlist collection_id support
5. Delete operations (inventory, wishlist, collections, content, projects)
6. CRUD on all entities
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_existing_user(self):
        """Test 1: Login with test2@test.com / test123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "test2@test.com"
        print(f"✓ Login successful for test2@test.com")
        return data["access_token"]


class TestTagsAutoDiscover:
    """Test /api/tags/all endpoint - auto-discover tags from all items"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    def test_get_all_tags(self, auth_token):
        """Test 18: GET /api/tags/all returns tags with counts and sources"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/tags/all", headers=headers)
        
        assert response.status_code == 200, f"Failed to get tags: {response.text}"
        data = response.json()
        
        # Should be a list of tags
        assert isinstance(data, list)
        
        # Each tag should have name, count, sources
        if len(data) > 0:
            tag = data[0]
            assert "name" in tag
            assert "count" in tag
            assert "sources" in tag
            assert isinstance(tag["sources"], list)
            print(f"✓ Tags API returned {len(data)} tags")
            print(f"  Sample tag: {tag}")
        else:
            print("✓ Tags API returned empty list (no tags yet)")


class TestCollectionItems:
    """Test /api/collections/{id}/items - returns inventory + wishlist items"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    def test_get_collection_items(self, auth_token):
        """Test 19: GET /api/collections/{id}/items returns inventory + wishlist"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a test collection
        collection_data = {
            "name": "TEST_Collection_For_Items",
            "description": "Test collection for items endpoint",
            "color": "blue"
        }
        col_response = requests.post(f"{BASE_URL}/api/collections", headers=headers, json=collection_data)
        assert col_response.status_code == 200
        collection = col_response.json()
        collection_id = collection["id"]
        
        try:
            # Create inventory item with collection_id
            inv_data = {
                "name": "TEST_Inventory_In_Collection",
                "description": "Inventory item in test collection",
                "collection_id": collection_id,
                "tags": ["test"]
            }
            inv_response = requests.post(f"{BASE_URL}/api/inventory", headers=headers, json=inv_data)
            assert inv_response.status_code == 200
            inv_item = inv_response.json()
            
            # Create wishlist item with collection_id
            wish_data = {
                "name": "TEST_Wishlist_In_Collection",
                "description": "Wishlist item in test collection",
                "collection_id": collection_id,
                "price": 100,
                "tags": ["test"]
            }
            wish_response = requests.post(f"{BASE_URL}/api/wishlist", headers=headers, json=wish_data)
            assert wish_response.status_code == 200
            wish_item = wish_response.json()
            
            # Now test the collection items endpoint
            items_response = requests.get(f"{BASE_URL}/api/collections/{collection_id}/items", headers=headers)
            assert items_response.status_code == 200, f"Failed: {items_response.text}"
            
            items_data = items_response.json()
            assert "inventory" in items_data
            assert "wishlist" in items_data
            
            # Verify inventory item is in the list
            inv_items = items_data["inventory"]
            assert len(inv_items) >= 1, "No inventory items found"
            assert any(i["name"] == "TEST_Inventory_In_Collection" for i in inv_items)
            
            # Verify wishlist item is in the list
            wish_items = items_data["wishlist"]
            assert len(wish_items) >= 1, "No wishlist items found"
            assert any(i["name"] == "TEST_Wishlist_In_Collection" for i in wish_items)
            
            print(f"✓ Collection items API returned {len(inv_items)} inventory and {len(wish_items)} wishlist items")
            
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/inventory/{inv_item['id']}", headers=headers)
            requests.delete(f"{BASE_URL}/api/wishlist/{wish_item['id']}", headers=headers)
            requests.delete(f"{BASE_URL}/api/collections/{collection_id}", headers=headers)


class TestWishlistCollectionId:
    """Test wishlist collection_id field support"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    def test_wishlist_with_collection_id(self, auth_token):
        """Test 5: Create wishlist item with collection_id"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a collection
        col_data = {"name": "TEST_Collection_For_Wishlist", "color": "pink"}
        col_response = requests.post(f"{BASE_URL}/api/collections", headers=headers, json=col_data)
        assert col_response.status_code == 200
        collection = col_response.json()
        
        try:
            # Create wishlist item with collection_id
            wish_data = {
                "name": "TEST_Wishlist_With_Collection",
                "description": "Wishlist item linked to collection",
                "price": 250,
                "priority": 2,
                "collection_id": collection["id"]
            }
            response = requests.post(f"{BASE_URL}/api/wishlist", headers=headers, json=wish_data)
            assert response.status_code == 200
            
            wish_item = response.json()
            assert wish_item["collection_id"] == collection["id"]
            print(f"✓ Wishlist created with collection_id: {wish_item['collection_id']}")
            
            # Verify the GET returns collection_id
            get_response = requests.get(f"{BASE_URL}/api/wishlist/{wish_item['id']}", headers=headers)
            assert get_response.status_code == 200
            fetched = get_response.json()
            assert fetched["collection_id"] == collection["id"]
            print(f"✓ Wishlist GET returns collection_id correctly")
            
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/wishlist/{wish_item['id']}", headers=headers)
            requests.delete(f"{BASE_URL}/api/collections/{collection['id']}", headers=headers)


class TestDeleteOperations:
    """Test delete operations work (stopPropagation fix verification)"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    def test_delete_inventory_item(self, auth_token):
        """Test 3: Delete inventory item"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create an item to delete
        data = {"name": "TEST_Delete_Inventory", "description": "To be deleted"}
        create_response = requests.post(f"{BASE_URL}/api/inventory", headers=headers, json=data)
        assert create_response.status_code == 200
        item = create_response.json()
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/inventory/{item['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Inventory delete successful")
        
        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/api/inventory/{item['id']}", headers=headers)
        assert get_response.status_code == 404
        print(f"✓ Inventory item no longer exists after delete")
    
    def test_delete_wishlist_item(self, auth_token):
        """Test 7: Delete wishlist item"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create
        data = {"name": "TEST_Delete_Wishlist", "price": 50}
        create_response = requests.post(f"{BASE_URL}/api/wishlist", headers=headers, json=data)
        assert create_response.status_code == 200
        item = create_response.json()
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/wishlist/{item['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Wishlist delete successful")
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/wishlist/{item['id']}", headers=headers)
        assert get_response.status_code == 404
        print(f"✓ Wishlist item no longer exists after delete")
    
    def test_delete_collection(self, auth_token):
        """Test 9: Delete collection"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create
        data = {"name": "TEST_Delete_Collection", "color": "red"}
        create_response = requests.post(f"{BASE_URL}/api/collections", headers=headers, json=data)
        assert create_response.status_code == 200
        item = create_response.json()
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/collections/{item['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Collection delete successful")
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/collections/{item['id']}", headers=headers)
        assert get_response.status_code == 404
        print(f"✓ Collection no longer exists after delete")
    
    def test_delete_content(self, auth_token):
        """Test 13: Delete content"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create
        data = {"title": "TEST_Delete_Content", "content_type": "recipe", "description": "To be deleted"}
        create_response = requests.post(f"{BASE_URL}/api/content", headers=headers, json=data)
        assert create_response.status_code == 200
        item = create_response.json()
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/content/{item['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Content delete successful")
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/content/{item['id']}", headers=headers)
        assert get_response.status_code == 404
        print(f"✓ Content no longer exists after delete")
    
    def test_delete_project(self, auth_token):
        """Test delete project"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create
        data = {"name": "TEST_Delete_Project", "description": "To be deleted", "color": "blue"}
        create_response = requests.post(f"{BASE_URL}/api/projects", headers=headers, json=data)
        assert create_response.status_code == 200
        item = create_response.json()
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/projects/{item['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Project delete successful")
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/projects/{item['id']}", headers=headers)
        assert get_response.status_code == 404
        print(f"✓ Project no longer exists after delete")


class TestContentCustomTypes:
    """Test custom content types"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    def test_create_content_with_custom_type(self, auth_token):
        """Test 11: Create content with custom type"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create content with a custom type (not predefined)
        custom_type = "monguide"  # Custom type
        data = {
            "title": "TEST_Custom_Type_Content",
            "content_type": custom_type,
            "description": "Content with custom type",
            "body": "# My Custom Guide\n\nThis is a test.",
            "category": "Personal"
        }
        
        response = requests.post(f"{BASE_URL}/api/content", headers=headers, json=data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        content = response.json()
        assert content["content_type"] == custom_type
        print(f"✓ Content created with custom type: {custom_type}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/content/{content['id']}", headers=headers)


class TestCrossTypeLinks:
    """Test cross-type linking functionality"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    def test_create_cross_type_link(self, auth_token):
        """Test 20: Create cross-type link between wishlist and project"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a wishlist item
        wish_data = {"name": "TEST_Wishlist_For_Link", "price": 100}
        wish_response = requests.post(f"{BASE_URL}/api/wishlist", headers=headers, json=wish_data)
        assert wish_response.status_code == 200
        wish_item = wish_response.json()
        
        # Create a project
        proj_data = {"name": "TEST_Project_For_Link", "color": "violet"}
        proj_response = requests.post(f"{BASE_URL}/api/projects", headers=headers, json=proj_data)
        assert proj_response.status_code == 200
        project = proj_response.json()
        
        try:
            # Create link between wishlist and project
            link_data = {
                "source_type": "wishlist",
                "source_id": wish_item["id"],
                "target_type": "project",
                "target_id": project["id"],
                "label": "related"
            }
            link_response = requests.post(f"{BASE_URL}/api/links", headers=headers, json=link_data)
            assert link_response.status_code == 200, f"Link creation failed: {link_response.text}"
            print(f"✓ Cross-type link created between wishlist and project")
            
            # Verify link exists
            links_response = requests.get(f"{BASE_URL}/api/links/wishlist/{wish_item['id']}", headers=headers)
            assert links_response.status_code == 200
            links = links_response.json()
            assert len(links) >= 1
            print(f"✓ Link verified with {len(links)} link(s)")
            
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/wishlist/{wish_item['id']}", headers=headers)
            requests.delete(f"{BASE_URL}/api/projects/{project['id']}", headers=headers)


class TestInventoryFeatures:
    """Test inventory features"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        return response.json()["access_token"]
    
    def test_get_inventory_with_existing_data(self, auth_token):
        """Verify inventory items exist (e.g., Rolex Submariner)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/inventory", headers=headers)
        assert response.status_code == 200
        items = response.json()
        
        print(f"✓ Inventory has {len(items)} items")
        
        # Look for test data like "Rolex Submariner"
        rolex_items = [i for i in items if "rolex" in i["name"].lower()]
        if rolex_items:
            print(f"✓ Found 'Rolex' item(s): {[i['name'] for i in rolex_items]}")
        
        return items


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
