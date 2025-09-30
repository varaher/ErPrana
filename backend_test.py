import requests
import sys
from datetime import datetime
import json
import uuid
import io

class BackendAPITester:
    def __init__(self, base_url="https://erprana-voice.preview.emergentagent.com"):
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

    # ========== INFINITE CONVERSATION FLOW TESTS ==========
    
    def test_symptom_intelligence_analyze_endpoint(self):
        """Test the new /api/symptom-intelligence/analyze endpoint for frontend compatibility"""
        test_data = {
            "user_id": "test@example.com",
            "message": "I have chest pain",
            "session_id": "test123"
        }
        success, response = self.run_test(
            "Symptom Intelligence - Analyze Endpoint",
            "POST",
            "symptom-intelligence/analyze",
            200,
            data=test_data
        )
        
        if success:
            # Verify infinite conversation structure
            if "next_step" in response and response["next_step"] == "conversation_continue":
                print("✅ Infinite conversation flow confirmed - next_step is 'conversation_continue'")
            else:
                print(f"❌ Missing or incorrect next_step: {response.get('next_step')}")
            
            if "requires_followup" in response and response["requires_followup"]:
                print("✅ Requires followup confirmed")
            else:
                print(f"❌ Missing or incorrect requires_followup: {response.get('requires_followup')}")
        
        return success, response
    
    def test_existing_analyze_symptom_endpoint(self):
        """Test the existing /api/analyze-symptom endpoint"""
        test_data = {
            "user_message": "I have chest pain",
            "session_id": "test123",
            "user_id": "test@example.com"
        }
        return self.run_test(
            "Existing Analyze Symptom Endpoint",
            "POST",
            "analyze-symptom",
            200,
            data=test_data
        )
    
    def test_infinite_conversation_chest_pain(self):
        """Test infinite conversation flow with chest pain scenario"""
        session_id = str(uuid.uuid4())
        
        # Initial chest pain message
        test_data = {
            "user_id": "test@example.com",
            "message": "I have chest pain",
            "session_id": session_id
        }
        
        success, response = self.run_test(
            "Infinite Conversation - Initial Chest Pain",
            "POST",
            "symptom-intelligence/analyze",
            200,
            data=test_data
        )
        
        if success and response.get("next_step") == "conversation_continue":
            print("✅ First message: Conversation continues as expected")
        else:
            print(f"❌ First message: Expected conversation_continue, got {response.get('next_step')}")
        
        return success, response
    
    def test_infinite_conversation_followup(self):
        """Test follow-up question in infinite conversation"""
        session_id = str(uuid.uuid4())
        
        # Follow-up message
        test_data = {
            "user_id": "test@example.com", 
            "message": "It started an hour ago",
            "session_id": session_id
        }
        
        success, response = self.run_test(
            "Infinite Conversation - Follow-up Question",
            "POST",
            "symptom-intelligence/analyze",
            200,
            data=test_data
        )
        
        if success and response.get("next_step") == "conversation_continue":
            print("✅ Follow-up: Conversation continues as expected")
        else:
            print(f"❌ Follow-up: Expected conversation_continue, got {response.get('next_step')}")
        
        return success, response
    
    def test_emergency_detection_with_continuation(self):
        """Test emergency detection while maintaining conversation flow"""
        session_id = str(uuid.uuid4())
        
        # Emergency scenario
        test_data = {
            "user_id": "test@example.com",
            "message": "I can't breathe and have severe chest pain",
            "session_id": session_id
        }
        
        success, response = self.run_test(
            "Emergency Detection - Severe Symptoms",
            "POST",
            "symptom-intelligence/analyze",
            200,
            data=test_data
        )
        
        if success:
            # Check if emergency is detected
            urgency = response.get("urgency_level", "").lower()
            if "emergency" in urgency:
                print("✅ Emergency correctly detected")
            else:
                print(f"❌ Emergency not detected, urgency_level: {urgency}")
            
            # Check if conversation still continues
            if response.get("next_step") == "conversation_continue":
                print("✅ Emergency detected but conversation can still continue")
            else:
                print(f"❌ Emergency should allow conversation continuation, got: {response.get('next_step')}")
        
        return success, response
    
    def test_emergency_keywords_sah(self):
        """Test emergency detection for SAH (worst headache)"""
        test_data = {
            "user_id": "test@example.com",
            "message": "I have the worst headache of my life, like nothing I've ever experienced",
            "session_id": str(uuid.uuid4())
        }
        
        success, response = self.run_test(
            "Emergency Keywords - SAH (Worst Headache)",
            "POST",
            "symptom-intelligence/analyze",
            200,
            data=test_data
        )
        
        if success:
            urgency = response.get("urgency_level", "").lower()
            if "emergency" in urgency:
                print("✅ SAH emergency pattern detected")
            else:
                print(f"⚠️ SAH pattern may not be detected, urgency: {urgency}")
        
        return success, response
    
    def test_conversation_context_awareness(self):
        """Test multi-turn conversation with context awareness"""
        session_id = str(uuid.uuid4())
        
        # First message
        test_data_1 = {
            "user_id": "test@example.com",
            "message": "I have been having chest pain for 2 hours",
            "session_id": session_id
        }
        
        success_1, response_1 = self.run_test(
            "Context Awareness - Turn 1",
            "POST",
            "symptom-intelligence/analyze",
            200,
            data=test_data_1
        )
        
        if not success_1:
            return False, {}
        
        # Second message with context
        test_data_2 = {
            "user_id": "test@example.com",
            "message": "The pain is getting worse and I feel nauseous",
            "session_id": session_id
        }
        
        success_2, response_2 = self.run_test(
            "Context Awareness - Turn 2",
            "POST", 
            "symptom-intelligence/analyze",
            200,
            data=test_data_2
        )
        
        if success_2 and response_2.get("next_step") == "conversation_continue":
            print("✅ Multi-turn conversation maintains context and continues")
        else:
            print(f"❌ Context awareness issue, next_step: {response_2.get('next_step')}")
        
        return success_2, response_2
    
    def test_conversation_never_ends(self):
        """Test that conversation never ends with 'assessment complete'"""
        test_data = {
            "user_id": "test@example.com",
            "message": "What should I do next?",
            "session_id": str(uuid.uuid4())
        }
        
        success, response = self.run_test(
            "Never Ending Conversation - What Should I Do Next",
            "POST",
            "symptom-intelligence/analyze", 
            200,
            data=test_data
        )
        
        if success:
            response_text = response.get("response", "").lower()
            next_step = response.get("next_step", "")
            
            # Check that response doesn't contain "assessment complete" or similar
            if "assessment complete" in response_text or "consultation complete" in response_text:
                print("❌ Conversation ended with 'assessment complete' - violates infinite conversation requirement")
            else:
                print("✅ Conversation does not end with 'assessment complete'")
            
            # Check that next_step allows continuation
            if next_step == "conversation_continue":
                print("✅ Conversation continues as expected")
            else:
                print(f"❌ Expected conversation_continue, got: {next_step}")
        
        return success, response
    
    def test_llm_integration_with_emergent_key(self):
        """Test that LLM integration works with Emergent key"""
        test_data = {
            "user_id": "test@example.com",
            "message": "Hello ARYA, I need help with my symptoms",
            "session_id": str(uuid.uuid4())
        }
        
        success, response = self.run_test(
            "LLM Integration - Emergent Key Test",
            "POST",
            "symptom-intelligence/analyze",
            200,
            data=test_data
        )
        
        if success:
            response_text = response.get("response", "")
            if response_text and len(response_text) > 10:
                print("✅ LLM integration working - received meaningful response")
            else:
                print(f"❌ LLM integration issue - response too short: {response_text}")
        
        return success, response

    # ========== PHASE 3 - WEARABLE INTELLIGENCE API TESTS ==========
    
    def test_wearable_intelligence_health_dashboard(self):
        """Test wearable intelligence health dashboard"""
        return self.run_test(
            "Wearable Intelligence - Health Dashboard",
            "GET",
            f"wearable-intelligence/health-dashboard/test_user_123",
            200
        )
    
    def test_wearable_intelligence_health_report_generation(self):
        """Test health report generation"""
        test_data = {
            "user_id": "test_user_123",
            "report_type": "weekly",
            "include_recommendations": True,
            "include_trends": True
        }
        return self.run_test(
            "Wearable Intelligence - Health Report Generation",
            "POST",
            "wearable-intelligence/health-reports/generate",
            200,
            data=test_data
        )
    
    def test_wearable_intelligence_data_submission_sleep(self):
        """Test wearable data submission with sleep data"""
        test_data = {
            "user_id": "test_user_123",
            "data_type": "sleep",
            "data": {
                "total_sleep_time": 6.5,
                "sleep_efficiency": 75,
                "sleep_onset_latency": 45,
                "rem_percentage": 18
            }
        }
        return self.run_test(
            "Wearable Intelligence - Sleep Data Submission",
            "POST",
            "wearable-intelligence/wearable-data/submit",
            200,
            data=test_data
        )
    
    def test_wearable_intelligence_real_time_analysis_heart_rate(self):
        """Test real-time wearable analysis with heart rate data"""
        test_data = {
            "user_id": "test_user_123",
            "analysis_type": "heart_rate",
            "data": {
                "resting_heart_rate": 105,
                "heart_rate_variability": 25,
                "nocturnal_heart_rate": 95
            }
        }
        return self.run_test(
            "Wearable Intelligence - Real-time Heart Rate Analysis",
            "POST",
            "wearable-intelligence/wearable-analysis/real-time",
            200,
            data=test_data
        )
    
    def test_wearable_intelligence_health_memory_add(self):
        """Test adding health memory entry"""
        test_data = {
            "user_id": "test_user_123",
            "condition": "Sleep Apnea",
            "diagnosed_date": "2023-01-15",
            "status": "active",
            "severity": "moderate"
        }
        return self.run_test(
            "Wearable Intelligence - Add Health Memory",
            "POST",
            "wearable-intelligence/health-memory/add",
            200,
            data=test_data
        )
    
    def test_wearable_intelligence_health_memory_get(self):
        """Test getting health memory"""
        return self.run_test(
            "Wearable Intelligence - Get Health Memory",
            "GET",
            "wearable-intelligence/health-memory/test_user_123",
            200
        )
    
    def test_wearable_intelligence_health_insights(self):
        """Test health insights aggregation"""
        return self.run_test(
            "Wearable Intelligence - Health Insights",
            "GET",
            "wearable-intelligence/health-insights/test_user_123?days=30",
            200
        )
    
    def test_wearable_intelligence_data_submission_heart_rate(self):
        """Test wearable data submission with heart rate data for real-time analysis"""
        test_data = {
            "user_id": "test_user_123",
            "data_type": "heart_rate",
            "data": {
                "resting_heart_rate": 110,
                "max_heart_rate": 180,
                "heart_rate_variability": 20,
                "irregular_rhythm_detected": True
            }
        }
        return self.run_test(
            "Wearable Intelligence - Heart Rate Data Submission",
            "POST",
            "wearable-intelligence/wearable-data/submit",
            200,
            data=test_data
        )
    
    def test_wearable_intelligence_data_submission_respiratory(self):
        """Test wearable data submission with respiratory data"""
        test_data = {
            "user_id": "test_user_123",
            "data_type": "respiratory",
            "data": {
                "respiratory_rate": 22,
                "breathing_pattern": "irregular",
                "oxygen_saturation": 94
            }
        }
        return self.run_test(
            "Wearable Intelligence - Respiratory Data Submission",
            "POST",
            "wearable-intelligence/wearable-data/submit",
            200,
            data=test_data
        )
    
    def test_wearable_intelligence_real_time_analysis_sleep(self):
        """Test real-time sleep analysis"""
        test_data = {
            "user_id": "test_user_123",
            "analysis_type": "sleep",
            "data": {
                "total_sleep_time": 4.5,
                "sleep_efficiency": 60,
                "sleep_onset_latency": 90,
                "rem_percentage": 10,
                "deep_sleep_percentage": 8
            }
        }
        return self.run_test(
            "Wearable Intelligence - Real-time Sleep Analysis",
            "POST",
            "wearable-intelligence/wearable-analysis/real-time",
            200,
            data=test_data
        )
    
    def test_wearable_intelligence_real_time_analysis_respiratory(self):
        """Test real-time respiratory analysis"""
        test_data = {
            "user_id": "test_user_123",
            "analysis_type": "respiratory",
            "data": {
                "respiratory_rate": 28,
                "breathing_pattern": "labored",
                "oxygen_saturation": 88,
                "apnea_events": 15
            }
        }
        return self.run_test(
            "Wearable Intelligence - Real-time Respiratory Analysis",
            "POST",
            "wearable-intelligence/wearable-analysis/real-time",
            200,
            data=test_data
        )

def main():
    print("🚀 Starting Comprehensive Backend API Tests for Phase 2 Advanced Features")
    print("=" * 80)
    
    # Setup
    tester = BackendAPITester()
    
    # Test basic connectivity first
    print("\n📡 PHASE 1 - BASIC CONNECTIVITY TESTS")
    print("=" * 50)
    
    success, _ = tester.test_health_endpoint()
    if not success:
        print("❌ Health endpoint failed - Critical for frontend health checks")
    
    success, _ = tester.test_root_endpoint()
    if not success:
        print("❌ Basic API connectivity failed. Backend may not be running.")
        print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
        return 1

    # Test existing endpoints
    print("\n📝 PHASE 1 - EXISTING ENDPOINT TESTS")
    print("=" * 50)
    
    success, status_id = tester.test_create_status_check()
    success, _ = tester.test_get_status_checks()
    success, _ = tester.test_symptom_feedback_endpoint()
    success, _ = tester.test_get_symptom_feedback()

    # Test Phase 2 - Wearables Sync API
    print("\n⌚ PHASE 2 - WEARABLES SYNC API TESTS")
    print("=" * 50)
    
    tester.test_wearables_get_user_devices()
    tester.test_wearables_request_permission()
    tester.test_wearables_grant_permission()
    tester.test_wearables_connect_device()
    tester.test_wearables_sync_data()
    tester.test_wearables_get_data()
    tester.test_wearables_get_permissions()
    tester.test_wearables_disconnect_device()

    # Test Phase 2 - Voice Assistant API
    print("\n🎤 PHASE 2 - VOICE ASSISTANT API TESTS")
    print("=" * 50)
    
    tester.test_voice_health_check()
    tester.test_voice_get_voices()
    tester.test_voice_text_to_speech()
    tester.test_voice_conversation()
    tester.test_voice_realtime_session()

    # Test Phase 2 - Professional Mode API
    print("\n👩‍⚕️ PHASE 2 - PROFESSIONAL MODE API TESTS")
    print("=" * 50)
    
    tester.test_professional_register()
    tester.test_professional_get_profile()
    tester.test_professional_create_patient()
    tester.test_professional_get_patients()
    tester.test_professional_get_patient_record()
    tester.test_professional_create_assessment()
    tester.test_professional_get_assessments()
    tester.test_professional_create_teaching_case()
    tester.test_professional_get_teaching_cases()
    tester.test_professional_get_dashboard()

    # Test INFINITE CONVERSATION FLOW - PRIORITY TESTING
    print("\n🔄 INFINITE CONVERSATION FLOW TESTS - PRIORITY")
    print("=" * 50)
    
    # Test both endpoints
    tester.test_symptom_intelligence_analyze_endpoint()
    tester.test_existing_analyze_symptom_endpoint()
    
    # Test infinite conversation scenarios
    tester.test_infinite_conversation_chest_pain()
    tester.test_infinite_conversation_followup()
    tester.test_emergency_detection_with_continuation()
    tester.test_emergency_keywords_sah()
    tester.test_conversation_context_awareness()
    tester.test_conversation_never_ends()
    tester.test_llm_integration_with_emergent_key()

    # Print final results
    print("\n" + "=" * 80)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    # Calculate success rates by category
    phase1_tests = 6  # Basic connectivity + existing endpoints
    wearables_tests = 8
    voice_tests = 5
    professional_tests = 10
    
    print(f"\n📈 SUCCESS BREAKDOWN:")
    print(f"   Phase 1 (Basic): {min(tester.tests_passed, phase1_tests)}/{phase1_tests}")
    print(f"   Wearables API: Tests completed")
    print(f"   Voice Assistant API: Tests completed") 
    print(f"   Professional Mode API: Tests completed")
    
    if tester.tests_passed == tester.tests_run:
        print("\n🎉 ALL BACKEND TESTS PASSED! Phase 2 APIs are working correctly.")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"\n⚠️  {failed_tests} backend tests failed. See details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())