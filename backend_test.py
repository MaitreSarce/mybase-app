#!/usr/bin/env python3
"""
MyBase Personal Life OS - Backend API Testing
Tests all CRUD operations for the Personal Life OS application
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class MyBaseAPITester:
    def __init__(self, base_url: str = "https://life-hub-20.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_items = {
            'collections': [],
            'inventory': [],
            'wishlist': [],
            'projects': [],
            'tasks': [],
            'content': [],
            'portfolio': []
        }

    def log(self, message: str, success: bool = True):
        """Log test results"""
        status = "✅" if success else "❌"
        print(f"{status} {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"Expected {expected_status}, got {response.status_code}", False)
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {str(e)}", False)
            return False, {}
        except Exception as e:
            self.log(f"Unexpected error: {str(e)}", False)
            return False, {}

    def test_auth_register(self) -> bool:
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "email": f"test_{timestamp}@mybase.test",
            "password": "TestPassword123!",
            "name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log(f"Registered user: {response['user']['email']}")
            return True
        return False

    def test_auth_login(self) -> bool:
        """Test user login with test credentials"""
        login_data = {
            "email": "test@test.com",
            "password": "password123"
        }
        
        success, response = self.run_test(
            "User Login (existing user)",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log(f"Logged in as: {response['user']['email']}")
            return True
        return False

    def test_auth_me(self) -> bool:
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_collections_crud(self) -> bool:
        """Test Collections CRUD operations"""
        print("\n📁 Testing Collections CRUD...")
        
        # Create collection
        collection_data = {
            "name": "Test Collection Montres",
            "description": "Collection de test pour les montres",
            "category": "Luxe",
            "color": "blue",
            "icon": "watch"
        }
        
        success, response = self.run_test(
            "Create Collection",
            "POST",
            "collections",
            200,
            data=collection_data
        )
        
        if not success:
            return False
            
        collection_id = response.get('id')
        if collection_id:
            self.created_items['collections'].append(collection_id)
        
        # Get all collections
        success, _ = self.run_test(
            "Get All Collections",
            "GET",
            "collections",
            200
        )
        
        if not success:
            return False
        
        # Get specific collection
        if collection_id:
            success, _ = self.run_test(
                "Get Collection by ID",
                "GET",
                f"collections/{collection_id}",
                200
            )
            
            if not success:
                return False
            
            # Update collection
            update_data = {
                "description": "Description mise à jour"
            }
            
            success, _ = self.run_test(
                "Update Collection",
                "PUT",
                f"collections/{collection_id}",
                200,
                data=update_data
            )
            
            if not success:
                return False
        
        return True

    def test_inventory_crud(self) -> bool:
        """Test Inventory CRUD operations"""
        print("\n📦 Testing Inventory CRUD...")
        
        # Create inventory item
        item_data = {
            "name": "Rolex Submariner Test",
            "description": "Montre de plongée de luxe",
            "tags": ["luxe", "montre", "plongée"],
            "purchase_price": 8500.00,
            "current_value": 9200.00,
            "purchase_date": "2024-01-15",
            "location": "Coffre-fort",
            "condition": "excellent",
            "quantity": 1
        }
        
        success, response = self.run_test(
            "Create Inventory Item",
            "POST",
            "inventory",
            200,
            data=item_data
        )
        
        if not success:
            return False
            
        item_id = response.get('id')
        if item_id:
            self.created_items['inventory'].append(item_id)
        
        # Get all inventory items
        success, _ = self.run_test(
            "Get All Inventory Items",
            "GET",
            "inventory",
            200
        )
        
        if not success:
            return False
        
        # Test with filters
        success, _ = self.run_test(
            "Get Inventory Items with Search",
            "GET",
            "inventory?search=Rolex",
            200
        )
        
        if not success:
            return False
        
        # Get specific item and update
        if item_id:
            success, _ = self.run_test(
                "Get Inventory Item by ID",
                "GET",
                f"inventory/{item_id}",
                200
            )
            
            if not success:
                return False
            
            # Update item
            update_data = {
                "current_value": 9500.00,
                "condition": "bon"
            }
            
            success, _ = self.run_test(
                "Update Inventory Item",
                "PUT",
                f"inventory/{item_id}",
                200,
                data=update_data
            )
            
            if not success:
                return False
        
        return True

    def test_wishlist_crud(self) -> bool:
        """Test Wishlist CRUD operations"""
        print("\n💝 Testing Wishlist CRUD...")
        
        # Create wishlist item
        item_data = {
            "name": "MacBook Pro M3 Test",
            "description": "Ordinateur portable pour le développement",
            "url": "https://apple.com/macbook-pro",
            "price": 2499.00,
            "currency": "EUR",
            "priority": 2,
            "tags": ["tech", "ordinateur"],
            "target_date": "2024-12-25"
        }
        
        success, response = self.run_test(
            "Create Wishlist Item",
            "POST",
            "wishlist",
            200,
            data=item_data
        )
        
        if not success:
            return False
            
        item_id = response.get('id')
        if item_id:
            self.created_items['wishlist'].append(item_id)
        
        # Get all wishlist items
        success, _ = self.run_test(
            "Get All Wishlist Items",
            "GET",
            "wishlist",
            200
        )
        
        if not success:
            return False
        
        # Test filters
        success, _ = self.run_test(
            "Get Wishlist Items (not purchased)",
            "GET",
            "wishlist?purchased=false",
            200
        )
        
        if not success:
            return False
        
        # Update and mark as purchased
        if item_id:
            success, _ = self.run_test(
                "Get Wishlist Item by ID",
                "GET",
                f"wishlist/{item_id}",
                200
            )
            
            if not success:
                return False
            
            # Mark as purchased
            update_data = {
                "purchased": True
            }
            
            success, _ = self.run_test(
                "Mark Wishlist Item as Purchased",
                "PUT",
                f"wishlist/{item_id}",
                200,
                data=update_data
            )
            
            if not success:
                return False
        
        return True

    def test_projects_tasks_crud(self) -> bool:
        """Test Projects and Tasks CRUD operations"""
        print("\n📋 Testing Projects & Tasks CRUD...")
        
        # Create project
        project_data = {
            "name": "Rénovation Cuisine Test",
            "description": "Projet de rénovation complète de la cuisine",
            "color": "emerald",
            "tags": ["maison", "rénovation"]
        }
        
        success, response = self.run_test(
            "Create Project",
            "POST",
            "projects",
            200,
            data=project_data
        )
        
        if not success:
            return False
            
        project_id = response.get('id')
        if project_id:
            self.created_items['projects'].append(project_id)
        
        # Get all projects
        success, _ = self.run_test(
            "Get All Projects",
            "GET",
            "projects",
            200
        )
        
        if not success:
            return False
        
        # Create task
        task_data = {
            "title": "Choisir les carrelages",
            "description": "Sélectionner le carrelage pour le sol et les murs",
            "project_id": project_id,
            "due_date": "2024-02-15",
            "priority": 2,
            "tags": ["carrelage", "choix"]
        }
        
        success, response = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data=task_data
        )
        
        if not success:
            return False
            
        task_id = response.get('id')
        if task_id:
            self.created_items['tasks'].append(task_id)
        
        # Get all tasks
        success, _ = self.run_test(
            "Get All Tasks",
            "GET",
            "tasks",
            200
        )
        
        if not success:
            return False
        
        # Test task completion
        if task_id:
            success, _ = self.run_test(
                "Complete Task",
                "PUT",
                f"tasks/{task_id}",
                200,
                data={"completed": True}
            )
            
            if not success:
                return False
        
        return True

    def test_content_crud(self) -> bool:
        """Test Content CRUD operations"""
        print("\n📚 Testing Content CRUD...")
        
        # Create content
        content_data = {
            "title": "Tiramisu Traditionnel Test",
            "content_type": "recipe",
            "description": "Recette authentique du tiramisu italien",
            "body": "Ingrédients:\n- 6 œufs\n- 500g mascarpone\n- Café fort\n\nPréparation:\n1. Séparer les blancs des jaunes...",
            "tags": ["dessert", "italien", "café"],
            "category": "Desserts"
        }
        
        success, response = self.run_test(
            "Create Content",
            "POST",
            "content",
            200,
            data=content_data
        )
        
        if not success:
            return False
            
        content_id = response.get('id')
        if content_id:
            self.created_items['content'].append(content_id)
        
        # Get all content
        success, _ = self.run_test(
            "Get All Content",
            "GET",
            "content",
            200
        )
        
        if not success:
            return False
        
        # Test filters
        success, _ = self.run_test(
            "Get Content by Type",
            "GET",
            "content?content_type=recipe",
            200
        )
        
        if not success:
            return False
        
        # Update content
        if content_id:
            success, _ = self.run_test(
                "Update Content",
                "PUT",
                f"content/{content_id}",
                200,
                data={"category": "Desserts Italiens"}
            )
            
            if not success:
                return False
        
        return True

    def test_portfolio_crud(self) -> bool:
        """Test Portfolio CRUD operations"""
        print("\n💰 Testing Portfolio CRUD...")
        
        # Create portfolio asset
        asset_data = {
            "name": "Bitcoin Test",
            "asset_type": "crypto",
            "symbol": "BTC",
            "quantity": 0.5,
            "purchase_price": 45000.00,
            "purchase_date": "2024-01-10",
            "currency": "EUR",
            "current_price": 48000.00,
            "tags": ["crypto", "bitcoin"],
            "notes": "Achat de test pour diversification"
        }
        
        success, response = self.run_test(
            "Create Portfolio Asset",
            "POST",
            "portfolio",
            200,
            data=asset_data
        )
        
        if not success:
            return False
            
        asset_id = response.get('id')
        if asset_id:
            self.created_items['portfolio'].append(asset_id)
        
        # Get all assets
        success, _ = self.run_test(
            "Get All Portfolio Assets",
            "GET",
            "portfolio",
            200
        )
        
        if not success:
            return False
        
        # Test filters
        success, _ = self.run_test(
            "Get Assets by Type",
            "GET",
            "portfolio?asset_type=crypto",
            200
        )
        
        if not success:
            return False
        
        # Update asset price
        if asset_id:
            success, _ = self.run_test(
                "Update Asset Price",
                "PUT",
                f"portfolio/{asset_id}",
                200,
                data={"current_price": 50000.00}
            )
            
            if not success:
                return False
        
        return True

    def test_dashboard_stats(self) -> bool:
        """Test Dashboard and Stats endpoints"""
        print("\n📊 Testing Dashboard & Stats...")
        
        # Get dashboard stats
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if not success:
            return False
        
        # Verify stats structure
        expected_keys = ['collections', 'inventory', 'wishlist', 'projects', 'tasks_pending', 
                        'content', 'portfolio', 'portfolio_invested', 'portfolio_current']
        
        for key in expected_keys:
            if key not in response:
                self.log(f"Missing key in stats: {key}", False)
                return False
        
        # Get recent items
        success, _ = self.run_test(
            "Get Recent Items",
            "GET",
            "dashboard/recent?limit=5",
            200
        )
        
        if not success:
            return False
        
        return True

    def test_search_functionality(self) -> bool:
        """Test Global Search"""
        print("\n🔍 Testing Search Functionality...")
        
        # Global search
        success, response = self.run_test(
            "Global Search",
            "GET",
            "search?q=test",
            200
        )
        
        if not success:
            return False
        
        # Verify search response structure
        expected_sections = ['collections', 'inventory', 'wishlist', 'projects', 
                           'tasks', 'content', 'portfolio']
        
        for section in expected_sections:
            if section not in response:
                self.log(f"Missing section in search: {section}", False)
                return False
        
        # Get all tags
        success, _ = self.run_test(
            "Get All Tags",
            "GET",
            "tags",
            200
        )
        
        return success

    def cleanup_test_data(self) -> bool:
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        cleanup_success = True
        
        # Delete in reverse order to handle dependencies
        for item_type in ['tasks', 'projects', 'portfolio', 'content', 'wishlist', 'inventory', 'collections']:
            for item_id in self.created_items[item_type]:
                endpoint = item_type if item_type != 'tasks' else 'tasks'
                success, _ = self.run_test(
                    f"Delete {item_type[:-1]} {item_id}",
                    "DELETE",
                    f"{endpoint}/{item_id}",
                    200
                )
                if not success:
                    cleanup_success = False
        
        return cleanup_success

    def run_all_tests(self) -> bool:
        """Run all API tests"""
        print("🚀 Starting MyBase API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Try login first, then registration if login fails
        if not self.test_auth_login():
            print("Login failed, trying registration...")
            if not self.test_auth_register():
                print("❌ Authentication failed completely")
                return False
        
        # Test auth/me endpoint
        if not self.test_auth_me():
            return False
        
        # Test all CRUD operations
        test_methods = [
            self.test_collections_crud,
            self.test_inventory_crud,
            self.test_wishlist_crud,
            self.test_projects_tasks_crud,
            self.test_content_crud,
            self.test_portfolio_crud,
            self.test_dashboard_stats,
            self.test_search_functionality
        ]
        
        for test_method in test_methods:
            if not test_method():
                print(f"❌ Test failed: {test_method.__name__}")
                return False
        
        # Cleanup
        self.cleanup_test_data()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*50}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*50}")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("❌ Some tests failed")
            return False

def main():
    """Main test execution"""
    tester = MyBaseAPITester()
    
    try:
        success = tester.run_all_tests()
        final_success = tester.print_summary()
        
        return 0 if success and final_success else 1
        
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())