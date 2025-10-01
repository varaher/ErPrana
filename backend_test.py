import requests
import sys
from datetime import datetime
import json
import uuid
import io

class BackendAPITester:
    def __init__(self, base_url="https://voice-medic-1.preview.emergentagent.com"):
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

    # ========== ADVANCED SYMPTOM INTELLIGENCE TESTS ==========
    
    def test_advanced_symptom_intelligence_health_check(self):
        """Test advanced symptom intelligence health check"""
        return self.run_test(
            "Advanced Symptom Intelligence - Health Check",
            "GET",
            "advanced/health",
            200
        )
    
    def test_advanced_symptom_intelligence_single_symptom(self):
        """Test single symptom detection - should ask follow-up questions, NOT generate recommendations yet"""
        test_data = {
            "user_message": "i have fever since 2days",
            "session_id": str(uuid.uuid4()),
            "user_id": "test_user_advanced"
        }
        
        success, response = self.run_test(
            "Advanced Symptom Intelligence - Single Symptom (Fever)",
            "POST",
            "advanced/symptom-intelligence/analyze",
            200,
            data=test_data
        )
        
        if success:
            # Verify it asks follow-up questions and doesn't generate recommendations yet
            next_step = response.get("next_step", "")
            all_collected = response.get("all_symptoms_collected", True)
            recommendations = response.get("recommendations")
            
            if next_step in ["followup_questions", "conversation_continue"] and not all_collected:
                print("✅ Single symptom: Correctly asks follow-up questions without recommendations")
            else:
                print(f"❌ Single symptom: Expected follow-up questions, got next_step='{next_step}', all_collected={all_collected}")
            
            if not recommendations:
                print("✅ Single symptom: Correctly no recommendations generated yet")
            else:
                print(f"❌ Single symptom: Unexpected recommendations generated: {len(recommendations) if recommendations else 0}")
        
        return success, response
    
    def test_advanced_symptom_intelligence_multiple_symptoms(self):
        """Test multiple symptom detection - should detect BOTH fever AND loose stools"""
        test_data = {
            "user_message": "i have fever along with loose stools",
            "session_id": str(uuid.uuid4()),
            "user_id": "test_user_advanced"
        }
        
        success, response = self.run_test(
            "Advanced Symptom Intelligence - Multiple Symptoms",
            "POST",
            "advanced/symptom-intelligence/analyze",
            200,
            data=test_data
        )
        
        if success:
            # Check if both symptoms are detected
            state = response.get("updated_state", {})
            collected_symptoms = state.get("collected_symptoms", [])
            
            fever_detected = any("fever" in str(symptom).lower() for symptom in collected_symptoms)
            diarrhea_detected = any(any(term in str(symptom).lower() for term in ["loose", "stool", "diarrhea"]) for symptom in collected_symptoms)
            
            if fever_detected and diarrhea_detected:
                print("✅ Multiple symptoms: Both fever and loose stools detected")
            else:
                print(f"❌ Multiple symptoms: Missing detection - fever: {fever_detected}, loose stools: {diarrhea_detected}")
                print(f"Collected symptoms: {collected_symptoms}")
        
        return success, response
    
    def test_advanced_symptom_intelligence_complex_multi_symptom(self):
        """Test complex multi-symptom detection"""
        test_data = {
            "user_message": "i also have other symptoms like abdominal pain on right side",
            "session_id": str(uuid.uuid4()),
            "user_id": "test_user_advanced"
        }
        
        success, response = self.run_test(
            "Advanced Symptom Intelligence - Complex Multi-Symptom",
            "POST",
            "advanced/symptom-intelligence/analyze",
            200,
            data=test_data
        )
        
        if success:
            # Check if abdominal pain is detected
            state = response.get("updated_state", {})
            collected_symptoms = state.get("collected_symptoms", [])
            
            abdominal_pain_detected = any(any(term in str(symptom).lower() for term in ["abdominal", "pain"]) for symptom in collected_symptoms)
            
            if abdominal_pain_detected:
                print("✅ Complex multi-symptom: Abdominal pain detected")
            else:
                print(f"❌ Complex multi-symptom: Abdominal pain not detected")
                print(f"Collected symptoms: {collected_symptoms}")
        
        return success, response
    
    def test_advanced_symptom_intelligence_emergency_detection(self):
        """Test emergency detection - should detect emergency and provide immediate instructions"""
        test_data = {
            "user_message": "severe chest pain and can't breathe",
            "session_id": str(uuid.uuid4()),
            "user_id": "test_user_advanced"
        }
        
        success, response = self.run_test(
            "Advanced Symptom Intelligence - Emergency Detection",
            "POST",
            "advanced/symptom-intelligence/analyze",
            200,
            data=test_data
        )
        
        if success:
            emergency_detected = response.get("emergency_detected", False)
            next_step = response.get("next_step", "")
            assistant_message = response.get("assistant_message", "").lower()
            
            if emergency_detected:
                print("✅ Emergency detection: Emergency correctly detected")
            else:
                print("❌ Emergency detection: Emergency not detected")
            
            if next_step == "emergency_assessment":
                print("✅ Emergency detection: Correct next step (emergency_assessment)")
            else:
                print(f"❌ Emergency detection: Expected emergency_assessment, got {next_step}")
            
            if "911" in assistant_message or "emergency" in assistant_message:
                print("✅ Emergency detection: Emergency instructions provided")
            else:
                print("❌ Emergency detection: No emergency instructions found")
        
        return success, response
    
    def test_advanced_symptom_intelligence_final_assessment_recommendations(self):
        """Test final assessment with point-wise recommendations"""
        # First, simulate a conversation that has collected symptoms
        conversation_state = {
            "collected_symptoms": [
                {"symptom": "fever", "details": "high fever for 2 days", "collected_at": "2024-01-01T10:00:00Z"},
                {"symptom": "headache", "details": "severe headache", "collected_at": "2024-01-01T10:01:00Z"}
            ],
            "symptom_collection_complete": True,
            "conversation_history": []
        }
        
        test_data = {
            "user_message": "no, i don't have any other symptoms",
            "session_id": str(uuid.uuid4()),
            "user_id": "test_user_advanced",
            "conversation_state": conversation_state
        }
        
        success, response = self.run_test(
            "Advanced Symptom Intelligence - Final Assessment with Recommendations",
            "POST",
            "advanced/symptom-intelligence/analyze",
            200,
            data=test_data
        )
        
        if success:
            recommendations = response.get("recommendations", [])
            all_collected = response.get("all_symptoms_collected", False)
            
            if recommendations and len(recommendations) > 0:
                print(f"✅ Final assessment: {len(recommendations)} recommendations generated")
                
                # Check if recommendations are numbered and have reasoning
                has_numbers = all("number" in rec for rec in recommendations)
                has_reasoning = all("reasoning" in rec for rec in recommendations)
                has_timeframes = all("timeframe" in rec for rec in recommendations)
                
                if has_numbers:
                    print("✅ Final assessment: Recommendations are numbered")
                else:
                    print("❌ Final assessment: Recommendations missing numbers")
                
                if has_reasoning:
                    print("✅ Final assessment: Recommendations include reasoning")
                else:
                    print("❌ Final assessment: Recommendations missing reasoning")
                
                if has_timeframes:
                    print("✅ Final assessment: Recommendations grouped by timeframes")
                    timeframes = [rec["timeframe"] for rec in recommendations]
                    print(f"Timeframes found: {set(timeframes)}")
                else:
                    print("❌ Final assessment: Recommendations missing timeframes")
                
            else:
                print("❌ Final assessment: No recommendations generated")
        
        return success, response
    
    def test_advanced_symptom_intelligence_conversation_handlers(self):
        """Test conversation flow handlers"""
        # Test followup_questions endpoint
        test_data = {
            "user_message": "i have chest pain",
            "session_id": str(uuid.uuid4()),
            "user_id": "test_user_advanced"
        }
        
        success1, response1 = self.run_test(
            "Advanced Symptom Intelligence - Followup Questions Handler",
            "POST",
            "advanced/followup-questions",
            200,
            data=test_data
        )
        
        # Test conversation continue endpoint
        success2, response2 = self.run_test(
            "Advanced Symptom Intelligence - Conversation Continue Handler",
            "POST",
            "advanced/conversation/continue",
            200,
            data=test_data
        )
        
        if success1:
            questions = response1.get("questions", [])
            if questions and len(questions) > 0:
                print(f"✅ Followup questions: {len(questions)} questions generated")
            else:
                print("❌ Followup questions: No questions generated")
        
        if success2:
            next_step = response2.get("next_step", "")
            if next_step == "conversation_continue":
                print("✅ Conversation continue: Correct flow maintained")
            else:
                print(f"❌ Conversation continue: Expected conversation_continue, got {next_step}")
        
        return success1 and success2, {"followup": response1, "continue": response2}
    
    # ========== INTEGRATED MEDICAL AI TESTS ==========
    
    def test_integrated_medical_ai_status(self):
        """Test integrated medical AI status endpoint"""
        return self.run_test(
            "Integrated Medical AI - Status Check",
            "GET",
            "integrated/medical-ai/status",
            200
        )
    
    def test_fever_interview_basic_trigger(self):
        """Test 1 - Basic Fever Interview: 'i have fever since 2 days'"""
        test_data = {
            "user_message": "i have fever since 2 days",
            "session_id": "fever_test_1",
            "conversation_state": None,
            "user_id": "test_user"
        }
        
        success, response = self.run_test(
            "Integrated Medical AI - Test 1: Basic Fever Interview",
            "POST",
            "integrated/medical-ai",
            200,
            data=test_data
        )
        
        if success:
            # Verify fever interview is triggered
            interview_active = response.get("interview_active", False)
            interview_type = response.get("interview_type")
            next_step = response.get("next_step")
            
            if interview_active and interview_type == "fever":
                print("✅ Fever interview correctly triggered")
            else:
                print(f"❌ Fever interview not triggered. Active: {interview_active}, Type: {interview_type}")
            
            if next_step == "interview_continue":
                print("✅ Interview continuation flow correct")
            else:
                print(f"❌ Expected interview_continue, got: {next_step}")
            
            # Check if duration was extracted
            updated_state = response.get("updated_state", {})
            fever_state = updated_state.get("fever_interview_state", {})
            slots = fever_state.get("slots", {})
            
            if "duration_days" in slots and slots["duration_days"] == 2:
                print("✅ Duration correctly extracted: 2 days")
            else:
                print(f"❌ Duration extraction failed. Got: {slots.get('duration_days')}")
        
        return success, response
    
    def test_fever_interview_temperature_collection(self):
        """Test 2 - Temperature Collection: Continue with temperature information"""
        # First establish fever interview state
        conversation_state = {
            "active_interview": "fever",
            "fever_interview_state": {
                "slots": {"duration_days": 2},
                "stage": "CORE",
                "interview_complete": False
            }
        }
        
        test_data = {
            "user_message": "it was 102 degree fahrenheit and started gradually",
            "session_id": "fever_test_1",
            "conversation_state": conversation_state,
            "user_id": "test_user"
        }
        
        success, response = self.run_test(
            "Integrated Medical AI - Test 2: Temperature Collection",
            "POST",
            "integrated/medical-ai",
            200,
            data=test_data
        )
        
        if success:
            # Check temperature extraction
            updated_state = response.get("updated_state", {})
            fever_state = updated_state.get("fever_interview_state", {})
            slots = fever_state.get("slots", {})
            
            if "max_temp_f" in slots and slots["max_temp_f"] == 102.0:
                print("✅ Temperature correctly extracted: 102°F")
            else:
                print(f"❌ Temperature extraction failed. Got: {slots.get('max_temp_f')}")
            
            if "onset" in slots and slots["onset"] == "gradual":
                print("✅ Onset correctly extracted: gradual")
            else:
                print(f"❌ Onset extraction failed. Got: {slots.get('onset')}")
        
        return success, response
    
    def test_fever_interview_symptom_collection(self):
        """Test 3 - Symptom Collection: Continue with symptom information"""
        conversation_state = {
            "active_interview": "fever",
            "fever_interview_state": {
                "slots": {
                    "duration_days": 2,
                    "max_temp_f": 102.0,
                    "onset": "gradual"
                },
                "stage": "ASSOCIATED",
                "interview_complete": False
            }
        }
        
        test_data = {
            "user_message": "i have dry cough and no other symptoms",
            "session_id": "fever_test_1",
            "conversation_state": conversation_state,
            "user_id": "test_user"
        }
        
        success, response = self.run_test(
            "Integrated Medical AI - Test 3: Symptom Collection",
            "POST",
            "integrated/medical-ai",
            200,
            data=test_data
        )
        
        if success:
            # Check symptom extraction
            updated_state = response.get("updated_state", {})
            fever_state = updated_state.get("fever_interview_state", {})
            slots = fever_state.get("slots", {})
            
            resp_symptoms = slots.get("resp_symptoms", [])
            if "cough_dry" in resp_symptoms:
                print("✅ Respiratory symptoms correctly extracted: dry cough")
            else:
                print(f"❌ Respiratory symptom extraction failed. Got: {resp_symptoms}")
            
            gi_symptoms = slots.get("gi_symptoms", [])
            if "none" in gi_symptoms or not gi_symptoms:
                print("✅ GI symptoms correctly identified as none")
            else:
                print(f"❌ GI symptoms should be none. Got: {gi_symptoms}")
        
        return success, response
    
    def test_fever_interview_comprehensive_analysis(self):
        """Test 4 - Comprehensive Analysis: Ask for advice to trigger analysis"""
        conversation_state = {
            "fever_interview_state": {
                "slots": {
                    "duration_days": 2,
                    "max_temp_f": 102.0,
                    "onset": "gradual",
                    "resp_symptoms": ["cough_dry"],
                    "gi_symptoms": ["none"],
                    "neuro_symptoms": ["none"],
                    "age_group": "adult_18_64"
                },
                "interview_complete": True
            }
        }
        
        test_data = {
            "user_message": "what should i do?",
            "session_id": "fever_test_1",
            "conversation_state": conversation_state,
            "user_id": "test_user"
        }
        
        success, response = self.run_test(
            "Integrated Medical AI - Test 4: Comprehensive Analysis",
            "POST",
            "integrated/medical-ai",
            200,
            data=test_data
        )
        
        if success:
            # Check comprehensive diagnoses
            comprehensive_diagnoses = response.get("comprehensive_diagnoses", [])
            if comprehensive_diagnoses and len(comprehensive_diagnoses) >= 3:
                print(f"✅ Comprehensive diagnoses generated: {len(comprehensive_diagnoses)} diagnoses")
                
                # Check for top 5 with percentages
                has_percentages = all("probability" in diag for diag in comprehensive_diagnoses)
                if has_percentages:
                    print("✅ Diagnoses include probability percentages")
                else:
                    print("❌ Diagnoses missing probability percentages")
                
                # Check for reasoning
                has_reasoning = all("reasoning" in diag for diag in comprehensive_diagnoses)
                if has_reasoning:
                    print("✅ Diagnoses include clinical reasoning")
                else:
                    print("❌ Diagnoses missing clinical reasoning")
                
            else:
                print(f"❌ Insufficient comprehensive diagnoses. Got: {len(comprehensive_diagnoses) if comprehensive_diagnoses else 0}")
            
            # Check triage level
            triage_level = response.get("triage_level")
            if triage_level in ["red", "orange", "yellow", "green"]:
                print(f"✅ Triage level assigned: {triage_level.upper()}")
            else:
                print(f"❌ Invalid or missing triage level: {triage_level}")
            
            # Check clinical summary
            clinical_summary = response.get("clinical_summary")
            if clinical_summary and len(clinical_summary) > 50:
                print("✅ Clinical summary provided")
            else:
                print("❌ Clinical summary missing or too short")
        
        return success, response
    
    def test_fever_interview_emergency_detection(self):
        """Test 5 - Emergency Detection: High fever with neurological symptoms"""
        test_data = {
            "user_message": "i have fever and stiff neck with confusion",
            "session_id": "emergency_test",
            "conversation_state": None,
            "user_id": "test_user"
        }
        
        success, response = self.run_test(
            "Integrated Medical AI - Test 5: Emergency Detection",
            "POST",
            "integrated/medical-ai",
            200,
            data=test_data
        )
        
        if success:
            # Check emergency detection
            emergency_detected = response.get("emergency_detected", False)
            if emergency_detected:
                print("✅ Emergency correctly detected")
            else:
                print("❌ Emergency not detected")
            
            # Check triage level
            triage_level = response.get("triage_level")
            if triage_level == "red":
                print("✅ RED triage level assigned for emergency")
            else:
                print(f"❌ Expected RED triage, got: {triage_level}")
            
            # Check next step
            next_step = response.get("next_step")
            if next_step == "emergency_care":
                print("✅ Emergency care next step assigned")
            else:
                print(f"❌ Expected emergency_care, got: {next_step}")
            
            # Check emergency message
            assistant_message = response.get("assistant_message", "").lower()
            if "emergency" in assistant_message or "911" in assistant_message:
                print("✅ Emergency instructions provided")
            else:
                print("❌ Emergency instructions missing")
        
        return success, response
    
    def test_temperature_format_recognition(self):
        """Test various temperature formats recognition"""
        temperature_formats = [
            ("102f", 102.0),
            ("102 degree fahrenheit", 102.0),
            ("38.9c", 102.02),  # 38.9°C = 102.02°F
            ("38.9 degree celsius", 102.02),
            ("104 degrees f", 104.0),
            ("39.4 celsius", 102.92)  # 39.4°C = 102.92°F
        ]
        
        results = []
        for temp_text, expected_f in temperature_formats:
            test_data = {
                "user_message": f"my temperature was {temp_text}",
                "session_id": f"temp_test_{temp_text.replace(' ', '_')}",
                "conversation_state": None,
                "user_id": "test_user"
            }
            
            success, response = self.run_test(
                f"Temperature Format Recognition - {temp_text}",
                "POST",
                "integrated/medical-ai",
                200,
                data=test_data
            )
            
            if success:
                # Check if temperature was extracted correctly
                updated_state = response.get("updated_state", {})
                fever_state = updated_state.get("fever_interview_state", {})
                slots = fever_state.get("slots", {})
                extracted_temp = slots.get("max_temp_f")
                
                if extracted_temp and abs(extracted_temp - expected_f) < 0.1:
                    print(f"✅ {temp_text} correctly recognized as {extracted_temp}°F")
                    results.append(True)
                else:
                    print(f"❌ {temp_text} incorrectly recognized. Expected: {expected_f}°F, Got: {extracted_temp}")
                    results.append(False)
            else:
                results.append(False)
        
        overall_success = all(results)
        return overall_success, {"tested_formats": len(temperature_formats), "successful": sum(results)}
    
    def test_cross_symptom_analysis(self):
        """Test cross-symptom analysis with multiple completed interviews"""
        # Simulate completed fever interview with respiratory symptoms
        conversation_state = {
            "fever_interview_state": {
                "slots": {
                    "duration_days": 3,
                    "max_temp_f": 103.5,
                    "onset": "gradual",
                    "resp_symptoms": ["cough_phlegm", "shortness_of_breath"],
                    "gi_symptoms": ["none"],
                    "neuro_symptoms": ["none"],
                    "age_group": "older_65_plus",
                    "comorbidities": ["copd_asthma"]
                },
                "interview_complete": True
            }
        }
        
        test_data = {
            "user_message": "what's wrong with me?",
            "session_id": "cross_symptom_test",
            "conversation_state": conversation_state,
            "user_id": "test_user"
        }
        
        success, response = self.run_test(
            "Integrated Medical AI - Cross-Symptom Analysis",
            "POST",
            "integrated/medical-ai",
            200,
            data=test_data
        )
        
        if success:
            # Check for interconnected analysis
            comprehensive_diagnoses = response.get("comprehensive_diagnoses", [])
            
            # Should prioritize pneumonia given age, comorbidities, and symptoms
            pneumonia_found = any("pneumonia" in diag.get("name", "").lower() for diag in comprehensive_diagnoses)
            if pneumonia_found:
                print("✅ Cross-symptom analysis correctly identified pneumonia risk")
            else:
                print("❌ Cross-symptom analysis missed pneumonia diagnosis")
            
            # Check triage level adjustment for high-risk patient
            triage_level = response.get("triage_level")
            if triage_level in ["orange", "red"]:
                print(f"✅ Appropriate triage level for high-risk patient: {triage_level.upper()}")
            else:
                print(f"❌ Triage level too low for high-risk patient: {triage_level}")
            
            # Check for interconnected findings
            assistant_message = response.get("assistant_message", "")
            if "clinical connections" in assistant_message.lower() or "interconnected" in assistant_message.lower():
                print("✅ Interconnected findings provided")
            else:
                print("❌ Interconnected findings missing")
        
        return success, response
    
    def test_structured_interview_progression(self):
        """Test that structured interview progresses through slots systematically"""
        session_id = "progression_test"
        
        # Step 1: Initial fever mention
        test_data_1 = {
            "user_message": "i have been having fever",
            "session_id": session_id,
            "conversation_state": None,
            "user_id": "test_user"
        }
        
        success_1, response_1 = self.run_test(
            "Interview Progression - Step 1: Initial Fever",
            "POST",
            "integrated/medical-ai",
            200,
            data=test_data_1
        )
        
        if not success_1:
            return False, {}
        
        # Step 2: Provide duration
        conversation_state_2 = response_1.get("updated_state", {})
        test_data_2 = {
            "user_message": "for about 4 days now",
            "session_id": session_id,
            "conversation_state": conversation_state_2,
            "user_id": "test_user"
        }
        
        success_2, response_2 = self.run_test(
            "Interview Progression - Step 2: Duration",
            "POST",
            "integrated/medical-ai",
            200,
            data=test_data_2
        )
        
        if success_2:
            # Verify systematic progression
            fever_state = response_2.get("updated_state", {}).get("fever_interview_state", {})
            slots = fever_state.get("slots", {})
            
            if "duration_days" in slots:
                print("✅ Interview systematically collected duration")
            else:
                print("❌ Interview failed to collect duration systematically")
            
            # Should ask for next slot (onset or temperature)
            assistant_message = response_2.get("assistant_message", "").lower()
            if "sudden" in assistant_message or "gradual" in assistant_message or "temperature" in assistant_message:
                print("✅ Interview progressing to next slot systematically")
            else:
                print("❌ Interview not progressing systematically")
        
        return success_2, response_2
    
    def test_no_repetitive_questions(self):
        """Test that interview doesn't ask repetitive questions for already collected data"""
        # Pre-populate conversation state with already collected data
        conversation_state = {
            "active_interview": "fever",
            "fever_interview_state": {
                "slots": {
                    "duration_days": 3,
                    "max_temp_f": 101.5,
                    "onset": "sudden"
                },
                "stage": "ASSOCIATED",
                "interview_complete": False
            }
        }
        
        test_data = {
            "user_message": "i told you it was 3 days and 101.5 degrees",
            "session_id": "no_repeat_test",
            "conversation_state": conversation_state,
            "user_id": "test_user"
        }
        
        success, response = self.run_test(
            "No Repetitive Questions Test",
            "POST",
            "integrated/medical-ai",
            200,
            data=test_data
        )
        
        if success:
            assistant_message = response.get("assistant_message", "").lower()
            
            # Should NOT ask for duration, temperature, or onset again
            repetitive_questions = [
                "how many days" in assistant_message,
                "what temperature" in assistant_message,
                "sudden or gradual" in assistant_message
            ]
            
            if not any(repetitive_questions):
                print("✅ No repetitive questions asked for already collected data")
            else:
                print("❌ Repetitive questions detected for already collected data")
            
            # Should ask for new information (symptoms, etc.)
            if any(word in assistant_message for word in ["cough", "symptoms", "nausea", "pain"]):
                print("✅ Interview progressing to new information collection")
            else:
                print("❌ Interview not progressing to collect new information")
        
        return success, response

    # ========== NATURAL LANGUAGE PROCESSING TESTS ==========
    
    def test_nlu_health_check(self):
        """Test NLU health check"""
        return self.run_test(
            "NLU - Health Check",
            "GET",
            "nlu/health",
            200
        )
    
    def test_nlu_colloquial_translation_vertigo(self):
        """Test colloquial language processing - 'surrounding is spinning' → 'vertigo'"""
        test_data = {
            "text": "surrounding is spinning and i feel dizzy"
        }
        
        success, response = self.run_test(
            "NLU - Colloquial Translation (Vertigo)",
            "POST",
            "nlu/process-natural-language",
            200,
            data=test_data
        )
        
        if success:
            medical_translations = response.get("medical_translations", {})
            detected_symptoms = response.get("detected_symptoms", [])
            
            if "surrounding is spinning" in medical_translations:
                translation = medical_translations["surrounding is spinning"]
                if translation == "vertigo":
                    print("✅ NLU Translation: 'surrounding is spinning' correctly translated to 'vertigo'")
                else:
                    print(f"❌ NLU Translation: Expected 'vertigo', got '{translation}'")
            else:
                print("❌ NLU Translation: 'surrounding is spinning' not found in translations")
            
            if "vertigo" in detected_symptoms or "dizziness" in detected_symptoms:
                print("✅ NLU Translation: Vertigo/dizziness detected in symptoms")
            else:
                print(f"❌ NLU Translation: Vertigo/dizziness not detected. Found: {detected_symptoms}")
        
        return success, response
    
    def test_nlu_colloquial_translation_loose_stools(self):
        """Test colloquial translation for loose stools"""
        test_data = {
            "text": "i have loose stools and feel queasy"
        }
        
        success, response = self.run_test(
            "NLU - Colloquial Translation (Loose Stools)",
            "POST",
            "nlu/process-natural-language",
            200,
            data=test_data
        )
        
        if success:
            medical_translations = response.get("medical_translations", {})
            detected_symptoms = response.get("detected_symptoms", [])
            
            # Check for loose stools → diarrhea translation
            if "loose stools" in medical_translations:
                translation = medical_translations["loose stools"]
                if translation == "diarrhea":
                    print("✅ NLU Translation: 'loose stools' correctly translated to 'diarrhea'")
                else:
                    print(f"❌ NLU Translation: Expected 'diarrhea', got '{translation}'")
            
            # Check for queasy → nausea translation
            if "queasy" in medical_translations:
                translation = medical_translations["queasy"]
                if translation == "nausea":
                    print("✅ NLU Translation: 'queasy' correctly translated to 'nausea'")
                else:
                    print(f"❌ NLU Translation: Expected 'nausea', got '{translation}'")
        
        return success, response
    
    def test_nlu_supported_phrases(self):
        """Test getting supported colloquial phrases"""
        return self.run_test(
            "NLU - Get Supported Phrases",
            "GET",
            "nlu/supported-phrases",
            200
        )
    
    def test_nlu_translate_symptoms_quick(self):
        """Test quick symptom translation endpoint"""
        test_data = "room is spinning and i feel woozy"
        
        # Note: This endpoint expects text as a query parameter, not JSON body
        # We'll test it as a POST with text parameter
        success, response = self.run_test(
            "NLU - Quick Symptom Translation",
            "POST",
            f"nlu/translate-symptoms?text={test_data}",
            200
        )
        
        if success:
            translations = response.get("translations", {})
            if translations:
                print(f"✅ NLU Quick Translation: {len(translations)} translations found")
            else:
                print("❌ NLU Quick Translation: No translations found")
        
        return success, response

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

    # Test PHASE 3 - WEARABLE INTELLIGENCE SYSTEM - PRIORITY TESTING
    print("\n🧠 PHASE 3 - WEARABLE INTELLIGENCE SYSTEM TESTS - PRIORITY")
    print("=" * 50)
    
    # Test health dashboard
    tester.test_wearable_intelligence_health_dashboard()
    
    # Test health report generation
    tester.test_wearable_intelligence_health_report_generation()
    
    # Test wearable data submission with real-time analysis
    tester.test_wearable_intelligence_data_submission_sleep()
    tester.test_wearable_intelligence_data_submission_heart_rate()
    tester.test_wearable_intelligence_data_submission_respiratory()
    
    # Test real-time analysis endpoints
    tester.test_wearable_intelligence_real_time_analysis_heart_rate()
    tester.test_wearable_intelligence_real_time_analysis_sleep()
    tester.test_wearable_intelligence_real_time_analysis_respiratory()
    
    # Test health memory management
    tester.test_wearable_intelligence_health_memory_add()
    tester.test_wearable_intelligence_health_memory_get()
    
    # Test health insights aggregation
    tester.test_wearable_intelligence_health_insights()

    # Test ADVANCED SYMPTOM INTELLIGENCE SYSTEM - PRIORITY TESTING
    print("\n🧠 ADVANCED SYMPTOM INTELLIGENCE SYSTEM TESTS - PRIORITY")
    print("=" * 50)
    
    # Test health check first
    tester.test_advanced_symptom_intelligence_health_check()
    
    # Test specific scenarios from review request
    print("\n🔍 SPECIFIC TEST SCENARIOS:")
    tester.test_advanced_symptom_intelligence_single_symptom()
    tester.test_advanced_symptom_intelligence_multiple_symptoms()
    tester.test_advanced_symptom_intelligence_complex_multi_symptom()
    tester.test_advanced_symptom_intelligence_emergency_detection()
    tester.test_advanced_symptom_intelligence_final_assessment_recommendations()
    tester.test_advanced_symptom_intelligence_conversation_handlers()

    # Test NATURAL LANGUAGE PROCESSING - PRIORITY TESTING
    print("\n🗣️ NATURAL LANGUAGE PROCESSING TESTS - PRIORITY")
    print("=" * 50)
    
    tester.test_nlu_health_check()
    tester.test_nlu_colloquial_translation_vertigo()
    tester.test_nlu_colloquial_translation_loose_stools()
    tester.test_nlu_supported_phrases()
    tester.test_nlu_translate_symptoms_quick()

    # Print final results
    print("\n" + "=" * 80)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    # Calculate success rates by category
    phase1_tests = 6  # Basic connectivity + existing endpoints
    wearables_tests = 8
    voice_tests = 5
    professional_tests = 10
    conversation_tests = 8
    wearable_intelligence_tests = 10  # Phase 3 tests
    
    print(f"\n📈 SUCCESS BREAKDOWN:")
    print(f"   Phase 1 (Basic): {min(tester.tests_passed, phase1_tests)}/{phase1_tests}")
    print(f"   Wearables API: Tests completed")
    print(f"   Voice Assistant API: Tests completed") 
    print(f"   Professional Mode API: Tests completed")
    print(f"   Infinite Conversation Flow: Tests completed")
    print(f"   Phase 3 Wearable Intelligence: Tests completed")
    
    if tester.tests_passed == tester.tests_run:
        print("\n🎉 ALL BACKEND TESTS PASSED! Phase 3 Wearable Intelligence APIs are working correctly.")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"\n⚠️  {failed_tests} backend tests failed. See details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())