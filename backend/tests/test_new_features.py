"""
Backend tests for MyBase Personal Life OS - New Features (Iteration 4)
Tests: Tags Management, Custom Types, Sub-projects, Mind Map API
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://life-hub-20.preview.emergentagent.com').rstrip('/')

# ==================== FIXTURES ====================

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    # Login with existing user
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test2@test.com",
        "password": "test123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    # If login fails, try to register new user
    test_email = f"test_iter4_{uuid.uuid4().hex[:8]}@test.com"
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_email,
        "password": "test123",
        "name": "Test User Iter4"
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

# ==================== AUTH TESTS ====================

class TestAuth:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "test2@test.com"
    
    def test_login_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@test.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
    
    def test_register_new_user(self):
        """Test user registration"""
        unique_email = f"TEST_newuser_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123",
            "name": "Test New User"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == unique_email

# ==================== TAGS MANAGEMENT TESTS ====================

class TestTagsManagement:
    """Test managed tags CRUD operations"""
    
    def test_create_tag(self, api_client):
        """Test creating a new managed tag"""
        tag_name = f"TEST_Tag_{uuid.uuid4().hex[:6]}"
        response = api_client.post(f"{BASE_URL}/api/tags/manage", json={
            "name": tag_name,
            "color": "blue",
            "category": "lieu"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == tag_name
        assert data["color"] == "blue"
        assert data["category"] == "lieu"
        assert "id" in data
        return data
    
    def test_get_all_tags(self, api_client):
        """Test getting all managed tags"""
        response = api_client.get(f"{BASE_URL}/api/tags/manage")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_tag(self, api_client):
        """Test updating a managed tag"""
        # First create a tag
        tag_name = f"TEST_TagUpdate_{uuid.uuid4().hex[:6]}"
        create_response = api_client.post(f"{BASE_URL}/api/tags/manage", json={
            "name": tag_name,
            "color": "red",
            "category": "statut"
        })
        assert create_response.status_code == 200
        tag_id = create_response.json()["id"]
        
        # Update the tag
        new_name = f"TEST_Updated_{uuid.uuid4().hex[:6]}"
        update_response = api_client.put(f"{BASE_URL}/api/tags/manage/{tag_id}", json={
            "name": new_name,
            "color": "emerald",
            "category": "priorite"
        })
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["name"] == new_name
        assert data["color"] == "emerald"
        assert data["category"] == "priorite"
    
    def test_delete_tag(self, api_client):
        """Test deleting a managed tag"""
        # First create a tag
        tag_name = f"TEST_TagDelete_{uuid.uuid4().hex[:6]}"
        create_response = api_client.post(f"{BASE_URL}/api/tags/manage", json={
            "name": tag_name,
            "color": "pink"
        })
        assert create_response.status_code == 200
        tag_id = create_response.json()["id"]
        
        # Delete the tag
        delete_response = api_client.delete(f"{BASE_URL}/api/tags/manage/{tag_id}")
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/tags/manage")
        tags = get_response.json()
        tag_ids = [t["id"] for t in tags]
        assert tag_id not in tag_ids

# ==================== CUSTOM TYPES TESTS ====================

class TestCustomTypes:
    """Test custom types CRUD operations"""
    
    def test_create_custom_type(self, api_client):
        """Test creating a custom type with fields"""
        type_name = f"TEST_Vinyles_{uuid.uuid4().hex[:6]}"
        response = api_client.post(f"{BASE_URL}/api/custom-types", json={
            "name": type_name,
            "category": "collection",
            "fields": [
                {"name": "artist", "type": "text"},
                {"name": "year", "type": "number"}
            ],
            "color": "violet"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == type_name
        assert data["category"] == "collection"
        assert len(data["fields"]) == 2
        assert data["fields"][0]["name"] == "artist"
        assert data["fields"][1]["name"] == "year"
        return data
    
    def test_get_custom_types(self, api_client):
        """Test getting all custom types"""
        response = api_client.get(f"{BASE_URL}/api/custom-types")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_custom_types_by_category(self, api_client):
        """Test getting custom types filtered by category"""
        response = api_client.get(f"{BASE_URL}/api/custom-types", params={"category": "collection"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_custom_type(self, api_client):
        """Test updating a custom type"""
        # First create a custom type
        type_name = f"TEST_TypeUpdate_{uuid.uuid4().hex[:6]}"
        create_response = api_client.post(f"{BASE_URL}/api/custom-types", json={
            "name": type_name,
            "category": "collection",
            "fields": [{"name": "field1", "type": "text"}]
        })
        assert create_response.status_code == 200
        type_id = create_response.json()["id"]
        
        # Update the type
        new_name = f"TEST_TypeUpd_{uuid.uuid4().hex[:6]}"
        update_response = api_client.put(f"{BASE_URL}/api/custom-types/{type_id}", json={
            "name": new_name,
            "fields": [
                {"name": "field1", "type": "text"},
                {"name": "field2", "type": "number"}
            ]
        })
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["name"] == new_name
        assert len(data["fields"]) == 2
    
    def test_delete_custom_type(self, api_client):
        """Test deleting a custom type"""
        # First create a custom type
        type_name = f"TEST_TypeDel_{uuid.uuid4().hex[:6]}"
        create_response = api_client.post(f"{BASE_URL}/api/custom-types", json={
            "name": type_name,
            "category": "collection",
            "fields": []
        })
        assert create_response.status_code == 200
        type_id = create_response.json()["id"]
        
        # Delete the type
        delete_response = api_client.delete(f"{BASE_URL}/api/custom-types/{type_id}")
        assert delete_response.status_code == 200

# ==================== PROJECTS SUB-PROJECTS TESTS ====================

class TestProjectsSubProjects:
    """Test projects with sub-projects (parent_id)"""
    
    def test_create_parent_project(self, api_client):
        """Test creating a parent project"""
        project_name = f"TEST_ParentProject_{uuid.uuid4().hex[:6]}"
        response = api_client.post(f"{BASE_URL}/api/projects", json={
            "name": project_name,
            "description": "Parent project for testing",
            "color": "amber"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == project_name
        assert data["parent_id"] is None
        assert "id" in data
        return data
    
    def test_create_sub_project(self, api_client):
        """Test creating a sub-project with parent_id"""
        # First create parent project
        parent_name = f"TEST_Parent_{uuid.uuid4().hex[:6]}"
        parent_response = api_client.post(f"{BASE_URL}/api/projects", json={
            "name": parent_name,
            "color": "blue"
        })
        assert parent_response.status_code == 200
        parent_id = parent_response.json()["id"]
        
        # Create sub-project
        sub_name = f"TEST_SubProject_{uuid.uuid4().hex[:6]}"
        sub_response = api_client.post(f"{BASE_URL}/api/projects", json={
            "name": sub_name,
            "description": "Sub-project for testing",
            "color": "cyan",
            "parent_id": parent_id
        })
        assert sub_response.status_code == 200
        data = sub_response.json()
        assert data["name"] == sub_name
        assert data["parent_id"] == parent_id
        return {"parent_id": parent_id, "sub_project": data}
    
    def test_update_project_parent(self, api_client):
        """Test updating a project's parent_id"""
        # Create two projects
        project1_name = f"TEST_Proj1_{uuid.uuid4().hex[:6]}"
        project1 = api_client.post(f"{BASE_URL}/api/projects", json={
            "name": project1_name
        }).json()
        
        project2_name = f"TEST_Proj2_{uuid.uuid4().hex[:6]}"
        project2 = api_client.post(f"{BASE_URL}/api/projects", json={
            "name": project2_name
        }).json()
        
        # Update project2 to be child of project1
        update_response = api_client.put(f"{BASE_URL}/api/projects/{project2['id']}", json={
            "parent_id": project1["id"]
        })
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["parent_id"] == project1["id"]
    
    def test_delete_parent_project(self, api_client):
        """Test deleting a parent project"""
        # Create parent with sub-project
        parent_name = f"TEST_ParentDel_{uuid.uuid4().hex[:6]}"
        parent = api_client.post(f"{BASE_URL}/api/projects", json={
            "name": parent_name
        }).json()
        
        sub_name = f"TEST_SubDel_{uuid.uuid4().hex[:6]}"
        api_client.post(f"{BASE_URL}/api/projects", json={
            "name": sub_name,
            "parent_id": parent["id"]
        })
        
        # Delete parent project
        delete_response = api_client.delete(f"{BASE_URL}/api/projects/{parent['id']}")
        assert delete_response.status_code == 200

# ==================== TASKS WITH PROJECT TESTS ====================

class TestTasksWithProjects:
    """Test tasks assigned to projects"""
    
    def test_create_task_with_project(self, api_client):
        """Test creating a task assigned to a project"""
        # First create a project
        project_name = f"TEST_TaskProject_{uuid.uuid4().hex[:6]}"
        project = api_client.post(f"{BASE_URL}/api/projects", json={
            "name": project_name
        }).json()
        
        # Create task assigned to project
        task_title = f"TEST_Task_{uuid.uuid4().hex[:6]}"
        task_response = api_client.post(f"{BASE_URL}/api/tasks", json={
            "title": task_title,
            "description": "Task for testing",
            "project_id": project["id"],
            "priority": 2
        })
        assert task_response.status_code == 200
        data = task_response.json()
        assert data["title"] == task_title
        assert data["project_id"] == project["id"]
        assert data["priority"] == 2
        return {"project": project, "task": data}
    
    def test_get_tasks_by_project(self, api_client):
        """Test getting tasks filtered by project"""
        # Create project and task
        project_name = f"TEST_FilterProj_{uuid.uuid4().hex[:6]}"
        project = api_client.post(f"{BASE_URL}/api/projects", json={
            "name": project_name
        }).json()
        
        task_title = f"TEST_FilterTask_{uuid.uuid4().hex[:6]}"
        api_client.post(f"{BASE_URL}/api/tasks", json={
            "title": task_title,
            "project_id": project["id"]
        })
        
        # Get tasks filtered by project
        response = api_client.get(f"{BASE_URL}/api/tasks", params={"project_id": project["id"]})
        assert response.status_code == 200
        tasks = response.json()
        assert len(tasks) >= 1
        assert any(t["title"] == task_title for t in tasks)

# ==================== MINDMAP API TESTS ====================

class TestMindmapAPI:
    """Test mindmap data endpoint"""
    
    def test_get_mindmap_data(self, api_client):
        """Test getting mindmap data"""
        response = api_client.get(f"{BASE_URL}/api/mindmap")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data
        assert isinstance(data["nodes"], list)
        assert isinstance(data["edges"], list)
    
    def test_mindmap_with_type_filter(self, api_client):
        """Test mindmap with type perspective filter"""
        response = api_client.get(f"{BASE_URL}/api/mindmap", params={"perspective": "type:project"})
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        # All nodes should be of type 'project'
        for node in data["nodes"]:
            assert node["type"] == "project"
    
    def test_mindmap_sub_project_edges(self, api_client):
        """Test that mindmap shows sub-project relationships"""
        # Create parent and sub-project
        parent_name = f"TEST_MapParent_{uuid.uuid4().hex[:6]}"
        parent = api_client.post(f"{BASE_URL}/api/projects", json={
            "name": parent_name
        }).json()
        
        sub_name = f"TEST_MapSub_{uuid.uuid4().hex[:6]}"
        sub = api_client.post(f"{BASE_URL}/api/projects", json={
            "name": sub_name,
            "parent_id": parent["id"]
        }).json()
        
        # Get mindmap
        response = api_client.get(f"{BASE_URL}/api/mindmap")
        assert response.status_code == 200
        data = response.json()
        
        # Check nodes exist
        node_ids = [n["id"] for n in data["nodes"]]
        assert parent["id"] in node_ids
        assert sub["id"] in node_ids
        
        # Check edge exists between parent and sub
        has_edge = any(
            (e["source"] == parent["id"] and e["target"] == sub["id"]) or
            (e["source"] == sub["id"] and e["target"] == parent["id"])
            for e in data["edges"]
        )
        assert has_edge, "Expected edge between parent and sub-project"

# ==================== COLLECTIONS TESTS ====================

class TestCollections:
    """Test collections CRUD (verify icon field removal)"""
    
    def test_create_collection_without_icon(self, api_client):
        """Test creating a collection without icon field"""
        collection_name = f"TEST_Collection_{uuid.uuid4().hex[:6]}"
        response = api_client.post(f"{BASE_URL}/api/collections", json={
            "name": collection_name,
            "description": "Test collection",
            "category": "test",
            "color": "blue"
            # Note: no icon field
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == collection_name
        assert data["color"] == "blue"
        # Icon can be null/None or absent
        assert data.get("icon") is None or "icon" not in data or data["icon"] == None
    
    def test_get_collections(self, api_client):
        """Test getting all collections"""
        response = api_client.get(f"{BASE_URL}/api/collections")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

# ==================== DASHBOARD STATS TESTS ====================

class TestDashboardStats:
    """Test dashboard statistics endpoint"""
    
    def test_get_dashboard_stats(self, api_client):
        """Test getting dashboard stats"""
        response = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Check expected fields
        expected_fields = [
            "collections", "inventory", "wishlist", "projects",
            "tasks_pending", "content", "portfolio"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], int), f"{field} should be integer"


# Run tests with pytest
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
