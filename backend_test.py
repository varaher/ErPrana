import requests
import sys
from datetime import datetime
import json
import uuid
import io

class BackendAPITester:
    def __init__(self, base_url="https://medassist-28.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = str(uuid.uuid4())
        self.test_professional_id = str(uuid.uuid4())
        self.test_device_id = str(uuid.uuid4())
        self.test_patient_id = str(uuid.uuid4())

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data, timeout=10)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

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

    # ========== WEARABLES SYNC API TESTS ==========
    
    def test_wearables_get_user_devices(self):
        """Test getting user devices"""
        return self.run_test(
            "Wearables - Get User Devices",
            "GET",
            f"wearables/devices/{self.test_user_id}",
            200
        )
    
    def test_wearables_request_permission(self):
        """Test requesting wearable permissions"""
        test_data = {
            "user_id": self.test_user_id,
            "device_type": "apple_watch",
            "requested_permissions": ["heart_rate", "steps", "sleep"]
        }
        return self.run_test(
            "Wearables - Request Permission",
            "POST",
            "wearables/request-permission",
            200,
            data=test_data
        )
    
    def test_wearables_grant_permission(self):
        """Test granting wearable permissions"""
        test_data = {
            "user_id": self.test_user_id,
            "device_id": self.test_device_id,
            "permissions": {
                "heart_rate": True,
                "steps": True,
                "sleep": False
            },
            "granted_at": datetime.now().isoformat()
        }
        return self.run_test(
            "Wearables - Grant Permission",
            "POST",
            "wearables/grant-permission",
            200,
            data=test_data
        )
    
    def test_wearables_connect_device(self):
        """Test connecting a wearable device"""
        test_data = {
            "device_id": self.test_device_id,
            "device_name": "John's Apple Watch",
            "manufacturer": "Apple",
            "device_type": "apple_watch",
            "connected": True,
            "permissions_granted": True,
            "last_sync": datetime.now().isoformat()
        }
        return self.run_test(
            "Wearables - Connect Device",
            "POST",
            "wearables/connect-device",
            200,
            data=test_data
        )
    
    def test_wearables_sync_data(self):
        """Test syncing wearable data"""
        test_data = [
            {
                "user_id": self.test_user_id,
                "device_id": self.test_device_id,
                "data_type": "heart_rate",
                "value": "72",
                "unit": "bpm",
                "timestamp": datetime.now().isoformat(),
                "sync_id": str(uuid.uuid4())
            },
            {
                "user_id": self.test_user_id,
                "device_id": self.test_device_id,
                "data_type": "steps",
                "value": "8500",
                "unit": "steps",
                "timestamp": datetime.now().isoformat(),
                "sync_id": str(uuid.uuid4())
            }
        ]
        return self.run_test(
            "Wearables - Sync Data",
            "POST",
            "wearables/sync-data",
            200,
            data=test_data
        )
    
    def test_wearables_get_data(self):
        """Test getting wearable data"""
        return self.run_test(
            "Wearables - Get Data",
            "GET",
            f"wearables/data/{self.test_user_id}?data_type=heart_rate&limit=10",
            200
        )
    
    def test_wearables_get_permissions(self):
        """Test getting user permissions"""
        return self.run_test(
            "Wearables - Get Permissions",
            "GET",
            f"wearables/permissions/{self.test_user_id}",
            200
        )
    
    def test_wearables_disconnect_device(self):
        """Test disconnecting a device"""
        return self.run_test(
            "Wearables - Disconnect Device",
            "DELETE",
            f"wearables/disconnect/{self.test_device_id}",
            200
        )

    # ========== VOICE ASSISTANT API TESTS ==========
    
    def test_voice_health_check(self):
        """Test voice assistant health check"""
        return self.run_test(
            "Voice - Health Check",
            "GET",
            "voice/health",
            200
        )
    
    def test_voice_get_voices(self):
        """Test getting available voices"""
        return self.run_test(
            "Voice - Get Available Voices",
            "GET",
            "voice/voices",
            200
        )
    
    def test_voice_text_to_speech(self):
        """Test text to speech conversion"""
        test_data = {
            "text": "Hello, this is ARYA, your medical assistant. How can I help you today?",
            "voice": "nova",
            "speed": 1.0
        }
        return self.run_test(
            "Voice - Text to Speech",
            "POST",
            "voice/text-to-speech",
            200,
            data=test_data
        )
    
    def test_voice_conversation(self):
        """Test voice conversation with ARYA"""
        test_data = {
            "user_id": self.test_user_id,
            "message": "I have been experiencing chest pain for the last hour",
            "session_id": str(uuid.uuid4()),
            "language": "en-US"
        }
        return self.run_test(
            "Voice - Conversation",
            "POST",
            "voice/conversation",
            200,
            data=test_data
        )
    
    def test_voice_realtime_session(self):
        """Test creating realtime voice session"""
        return self.run_test(
            "Voice - Create Realtime Session",
            "POST",
            "voice/realtime/session",
            200
        )

    # ========== PROFESSIONAL MODE API TESTS ==========
    
    def test_professional_register(self):
        """Test professional registration"""
        test_data = {
            "user_id": self.test_user_id,
            "license_number": "MD123456789",
            "specialty": "Emergency Medicine",
            "institution": "General Hospital"
        }
        success, response = self.run_test(
            "Professional - Register",
            "POST",
            "professional/register",
            200,
            data=test_data
        )
        if success and 'professional_id' in response:
            self.test_professional_id = response['professional_id']
        return success, response
    
    def test_professional_get_profile(self):
        """Test getting professional profile"""
        return self.run_test(
            "Professional - Get Profile",
            "GET",
            f"professional/profile/{self.test_user_id}",
            200
        )
    
    def test_professional_create_patient(self):
        """Test creating patient record"""
        test_data = {
            "patient_id": self.test_patient_id,
            "professional_id": self.test_professional_id,
            "patient_name": "Sarah Johnson",
            "patient_age": 35,
            "patient_gender": "Female",
            "chief_complaint": "Chest pain and shortness of breath",
            "history_present_illness": "35-year-old female presents with acute onset chest pain that started 2 hours ago while at rest. Pain is described as sharp, substernal, 8/10 severity, radiating to left arm. Associated with shortness of breath and diaphoresis.",
            "medical_history": ["Hypertension", "Hyperlipidemia"],
            "medications": ["Lisinopril 10mg daily", "Atorvastatin 20mg daily"],
            "allergies": ["NKDA"],
            "vital_signs": {
                "blood_pressure": "150/95",
                "heart_rate": "110",
                "respiratory_rate": "22",
                "temperature": "98.6",
                "oxygen_saturation": "96%"
            },
            "assessment": "Acute coronary syndrome vs pulmonary embolism",
            "plan": "EKG, chest X-ray, troponins, D-dimer, CBC, BMP",
            "notes": "Patient appears anxious and diaphoretic. Will monitor closely."
        }
        return self.run_test(
            "Professional - Create Patient Record",
            "POST",
            "professional/patients",
            200,
            data=test_data
        )
    
    def test_professional_get_patients(self):
        """Test getting professional's patients"""
        return self.run_test(
            "Professional - Get Patients",
            "GET",
            f"professional/patients/{self.test_professional_id}",
            200
        )
    
    def test_professional_get_patient_record(self):
        """Test getting specific patient record"""
        return self.run_test(
            "Professional - Get Patient Record",
            "GET",
            f"professional/patient/{self.test_patient_id}",
            200
        )
    
    def test_professional_create_assessment(self):
        """Test creating clinical assessment"""
        test_data = {
            "assessment_id": str(uuid.uuid4()),
            "patient_id": self.test_patient_id,
            "professional_id": self.test_professional_id,
            "symptoms": ["chest pain", "shortness of breath", "diaphoresis"],
            "differential_diagnosis": [
                "Acute myocardial infarction",
                "Unstable angina",
                "Pulmonary embolism",
                "Aortic dissection"
            ],
            "recommended_tests": [
                "12-lead EKG",
                "Chest X-ray",
                "Troponin I",
                "D-dimer",
                "CT pulmonary angiogram"
            ],
            "treatment_plan": "Aspirin 325mg, Clopidogrel 600mg loading dose, Atorvastatin 80mg, Metoprolol 25mg BID. Cardiology consultation.",
            "urgency_level": "high",
            "created_at": datetime.now().isoformat()
        }
        return self.run_test(
            "Professional - Create Assessment",
            "POST",
            "professional/assessment",
            200,
            data=test_data
        )
    
    def test_professional_get_assessments(self):
        """Test getting professional's assessments"""
        return self.run_test(
            "Professional - Get Assessments",
            "GET",
            f"professional/assessments/{self.test_professional_id}",
            200
        )
    
    def test_professional_create_teaching_case(self):
        """Test creating teaching case"""
        test_data = {
            "case_id": str(uuid.uuid4()),
            "professional_id": self.test_professional_id,
            "title": "Acute MI in Young Female",
            "specialty": "Emergency Medicine",
            "case_description": "35-year-old female with acute chest pain and ST-elevation myocardial infarction",
            "patient_presentation": "Patient presented with acute onset severe chest pain, diaphoresis, and nausea. EKG showed ST-elevation in leads II, III, aVF consistent with inferior STEMI.",
            "diagnostic_workup": [
                "12-lead EKG",
                "Chest X-ray",
                "Troponin I",
                "CBC, BMP",
                "PT/PTT"
            ],
            "final_diagnosis": "ST-elevation myocardial infarction (STEMI) - inferior wall",
            "learning_objectives": [
                "Recognize STEMI on EKG",
                "Understand time-sensitive nature of STEMI care",
                "Learn about primary PCI vs thrombolytic therapy"
            ],
            "discussion_points": [
                "Why might a young female present with MI?",
                "What are the contraindications to thrombolytic therapy?",
                "When is primary PCI preferred over thrombolytics?"
            ],
            "references": [
                "2013 ACCF/AHA Guideline for the Management of ST-Elevation Myocardial Infarction",
                "ESC Guidelines for the management of acute myocardial infarction in patients presenting with ST-segment elevation"
            ]
        }
        return self.run_test(
            "Professional - Create Teaching Case",
            "POST",
            "professional/teaching-case",
            200,
            data=test_data
        )
    
    def test_professional_get_teaching_cases(self):
        """Test getting teaching cases"""
        return self.run_test(
            "Professional - Get Teaching Cases",
            "GET",
            "professional/teaching-cases?specialty=Emergency Medicine&limit=10",
            200
        )
    
    def test_professional_get_dashboard(self):
        """Test getting professional dashboard"""
        return self.run_test(
            "Professional - Get Dashboard",
            "GET",
            f"professional/dashboard/{self.test_professional_id}",
            200
        )

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