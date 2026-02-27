#!/usr/bin/env python3
"""
MyBase - Test New Features (CoinGecko, Alerts, Links)
Focused testing for the new features added to MyBase
"""

import requests
import sys
import json
from datetime import datetime

class MyBaseNewFeaturesTester:
    def __init__(self, base_url="https://life-hub-20.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_items = {
            'portfolio': [],
            'alerts': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data}")
                    except:
                        print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth(self):
        """Test authentication"""
        print("=== AUTHENTICATION ===")
        success, response = self.run_test(
            "Login with test user",
            "POST",
            "auth/login",
            200,
            data={"email": "test@test.com", "password": "password123"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   ✅ Authenticated as: {response['user']['name']}")
            return True
        return False

    def test_coingecko_integration(self):
        """Test CoinGecko crypto price integration"""
        print("\n=== COINGECKO CRYPTO PRICES ===")
        
        # Test crypto prices API
        success, response = self.run_test(
            "Get BTC and ETH prices",
            "GET",
            "crypto/prices",
            200,
            params={"symbols": "BTC,ETH"}
        )
        
        if success:
            btc_price = response.get('BTC', {}).get('price_eur')
            eth_price = response.get('ETH', {}).get('price_eur')
            print(f"   📈 BTC Price: €{btc_price}")
            print(f"   📈 ETH Price: €{eth_price}")
            
            if btc_price and eth_price:
                print("   ✅ CoinGecko API working correctly")
            else:
                print("   ⚠️  Prices not returned properly")
        
        # Test crypto search
        success, response = self.run_test(
            "Search for Bitcoin",
            "GET",
            "crypto/search",
            200,
            params={"query": "bitcoin"}
        )
        
        if success and response:
            print(f"   🔍 Found {len(response)} crypto results")
            if response:
                print(f"   First result: {response[0].get('name')} ({response[0].get('symbol')})")
        
        # Test portfolio price refresh
        success, response = self.run_test(
            "Refresh portfolio prices",
            "POST",
            "portfolio/refresh-prices",
            200
        )
        
        if success:
            updated_count = response.get('updated', 0)
            message = response.get('message', '')
            print(f"   🔄 {message}")
            return updated_count >= 0  # Should return 0 or more
        
        return False

    def test_price_alerts_system(self):
        """Test price alerts functionality"""
        print("\n=== PRICE ALERTS SYSTEM ===")
        
        # First, get existing portfolio assets
        success, portfolio_response = self.run_test(
            "Get portfolio assets for alerts",
            "GET",
            "portfolio",
            200
        )
        
        if not success or not portfolio_response:
            print("   ⚠️  No portfolio assets found, creating one for testing...")
            # Create a test crypto asset
            asset_data = {
                "name": "Test Bitcoin Alert",
                "asset_type": "crypto",
                "symbol": "BTC",
                "quantity": 0.01,
                "purchase_price": 45000.0,
                "currency": "EUR"
            }
            
            success, asset_response = self.run_test(
                "Create test crypto asset",
                "POST",
                "portfolio",
                201,
                data=asset_data
            )
            
            if success:
                self.created_items['portfolio'].append(asset_response['id'])
                portfolio_response = [asset_response]
            else:
                print("   ❌ Cannot create test asset for alerts")
                return False
        
        # Test creating different types of alerts
        first_asset = portfolio_response[0]
        print(f"   Using asset: {first_asset['name']} (ID: {first_asset['id']})")
        
        # Test 1: Target price alert
        alert_data = {
            "item_type": "portfolio",
            "item_id": first_asset['id'],
            "alert_type": "target_price",
            "target_value": 50000.0,
            "is_percentage": False
        }
        
        success, response = self.run_test(
            "Create target price alert",
            "POST",
            "alerts",
            201,
            data=alert_data
        )
        
        if success:
            alert_id = response.get('id')
            self.created_items['alerts'].append(alert_id)
            print(f"   📢 Created alert for: {response.get('item_name')}")
        
        # Test 2: Price change percentage alert
        alert_data_pct = {
            "item_type": "portfolio",
            "item_id": first_asset['id'],
            "alert_type": "price_change_up",
            "target_value": 10.0,
            "is_percentage": True
        }
        
        success, response = self.run_test(
            "Create percentage change alert",
            "POST",
            "alerts",
            201,
            data=alert_data_pct
        )
        
        if success:
            alert_id = response.get('id')
            self.created_items['alerts'].append(alert_id)
        
        # Test getting all alerts
        success, response = self.run_test(
            "Get all alerts",
            "GET",
            "alerts",
            200
        )
        
        if success:
            print(f"   📋 Total alerts: {len(response)}")
            active_alerts = [a for a in response if not a.get('triggered')]
            triggered_alerts = [a for a in response if a.get('triggered')]
            print(f"   ⏳ Active: {len(active_alerts)}")
            print(f"   ✅ Triggered: {len(triggered_alerts)}")
        
        # Test checking alerts
        success, response = self.run_test(
            "Check alerts for triggers",
            "POST",
            "alerts/check",
            200
        )
        
        if success:
            checked = response.get('checked', 0)
            triggered = response.get('triggered', 0)
            print(f"   🔍 Checked {checked} alerts, {triggered} triggered")
        
        return True

    def test_item_links_system(self):
        """Test bidirectional item linking"""
        print("\n=== ITEM LINKS SYSTEM ===")
        
        # Get items from different collections
        collections_data = {}
        
        for item_type in ['portfolio', 'inventory', 'wishlist', 'projects']:
            endpoint = item_type if item_type != 'projects' else 'projects'
            success, response = self.run_test(
                f"Get {item_type} items",
                "GET",
                endpoint,
                200
            )
            if success and response:
                collections_data[item_type] = response
                print(f"   📦 Found {len(response)} {item_type} items")
        
        # Create links between different item types
        if collections_data.get('portfolio') and collections_data.get('inventory'):
            portfolio_item = collections_data['portfolio'][0]
            inventory_item = collections_data['inventory'][0]
            
            link_data = {
                "source_type": "portfolio",
                "source_id": portfolio_item['id'],
                "target_type": "inventory",
                "target_id": inventory_item['id'],
                "label": "Related investment"
            }
            
            success, response = self.run_test(
                "Create portfolio-inventory link",
                "POST",
                "links",
                200,
                data=link_data
            )
            
            if success:
                print(f"   🔗 Linked '{portfolio_item['name']}' to '{inventory_item['name']}'")
                
                # Test getting links for the portfolio item
                success, links_response = self.run_test(
                    "Get portfolio item links",
                    "GET",
                    f"links/portfolio/{portfolio_item['id']}",
                    200
                )
                
                if success:
                    print(f"   📋 Portfolio item has {len(links_response)} links")
                    if links_response:
                        for link in links_response:
                            print(f"      → {link.get('item_name')} ({link.get('item_type')})")
                
                # Test getting links for the inventory item (bidirectional)
                success, links_response = self.run_test(
                    "Get inventory item links",
                    "GET",
                    f"links/inventory/{inventory_item['id']}",
                    200
                )
                
                if success:
                    print(f"   📋 Inventory item has {len(links_response)} links")
                
                # Test deleting the link
                success, response = self.run_test(
                    "Delete item link",
                    "DELETE",
                    "links",
                    200,
                    params={
                        "source_type": "portfolio",
                        "source_id": portfolio_item['id'],
                        "target_type": "inventory",
                        "target_id": inventory_item['id']
                    }
                )
                
                if success:
                    print("   🗑️  Link deleted successfully")
        
        return True

    def cleanup(self):
        """Clean up test data"""
        print("\n=== CLEANUP ===")
        
        # Delete created alerts
        for alert_id in self.created_items['alerts']:
            self.run_test(
                f"Delete alert {alert_id[:8]}...",
                "DELETE",
                f"alerts/{alert_id}",
                200
            )
        
        # Delete created portfolio assets
        for asset_id in self.created_items['portfolio']:
            self.run_test(
                f"Delete portfolio asset {asset_id[:8]}...",
                "DELETE",
                f"portfolio/{asset_id}",
                200
            )

    def run_all_tests(self):
        """Run all new feature tests"""
        print("🚀 Testing MyBase New Features")
        print(f"Target: {self.base_url}")
        
        if not self.test_auth():
            print("❌ Authentication failed")
            return 1
        
        # Test new features
        coingecko_ok = self.test_coingecko_integration()
        alerts_ok = self.test_price_alerts_system()
        links_ok = self.test_item_links_system()
        
        # Cleanup
        self.cleanup()
        
        # Results
        print(f"\n📊 RESULTS")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        print(f"\n🎯 FEATURE STATUS")
        print(f"CoinGecko Integration: {'✅' if coingecko_ok else '❌'}")
        print(f"Price Alerts System: {'✅' if alerts_ok else '❌'}")
        print(f"Item Links System: {'✅' if links_ok else '❌'}")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = MyBaseNewFeaturesTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())