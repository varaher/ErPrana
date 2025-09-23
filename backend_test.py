import requests
import sys
from datetime import datetime
import json

class BackendAPITester:
    def __init__(self, base_url="https://aryahealth.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {json.dumps(response_data, indent=2)}")
                except:
                    print(f"Response: {response.text}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_create_status_check(self):
        """Test creating a status check"""
        test_data = {
            "client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"
        }
        success, response = self.run_test(
            "Create Status Check",
            "POST", 
            "status",
            200,
            data=test_data
        )
        return success, response.get('id') if success else None

    def test_get_status_checks(self):
        """Test getting all status checks"""
        return self.run_test("Get Status Checks", "GET", "status", 200)
    
    def test_health_endpoint(self):
        """Test the health endpoint specifically"""
        return self.run_test("Health Check Endpoint", "GET", "health", 200)
    
    def test_symptom_feedback_endpoint(self):
        """Test the symptom feedback endpoint that frontend uses"""
        test_feedback = {
            "sessionId": "test-session-123",
            "symptoms": ["I have severe flank pain"],
            "diagnosis": ["Ureteric Colic"],
            "feedback": "positive",
            "additionalFeedback": "",
            "timestamp": datetime.now().isoformat()
        }
        return self.run_test(
            "Symptom Feedback Endpoint",
            "POST",
            "symptom-feedback", 
            200,
            data=test_feedback
        )
    
    def test_get_symptom_feedback(self):
        """Test getting symptom feedback"""
        return self.run_test("Get Symptom Feedback", "GET", "symptom-feedback", 200)

def main():
    print("🚀 Starting Backend API Tests for ErPrana Application")
    print("=" * 60)
    
    # Setup
    tester = BackendAPITester()
    
    # Test health endpoint specifically (as requested)
    print("\n🏥 Testing Health Endpoint...")
    success, _ = tester.test_health_endpoint()
    if not success:
        print("❌ Health endpoint failed - Critical for frontend health checks")
    
    # Test basic connectivity
    print("\n📡 Testing API Connectivity...")
    success, _ = tester.test_root_endpoint()
    if not success:
        print("❌ Basic API connectivity failed. Backend may not be running.")
        print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
        return 1

    # Test status check creation
    print("\n📝 Testing Status Check Creation...")
    success, status_id = tester.test_create_status_check()
    if not success:
        print("❌ Status check creation failed")

    # Test status check retrieval
    print("\n📋 Testing Status Check Retrieval...")
    success, _ = tester.test_get_status_checks()
    if not success:
        print("❌ Status check retrieval failed")

    # Test symptom feedback endpoint (critical for frontend)
    print("\n🩺 Testing Symptom Feedback Creation...")
    success, _ = tester.test_symptom_feedback_endpoint()
    if not success:
        print("❌ Symptom feedback endpoint failed - Frontend feedback system won't work")
    
    # Test symptom feedback retrieval
    print("\n📊 Testing Symptom Feedback Retrieval...")
    success, _ = tester.test_get_symptom_feedback()
    if not success:
        print("❌ Symptom feedback retrieval failed")

    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed!")
        return 0
    else:
        print("⚠️  Some backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())