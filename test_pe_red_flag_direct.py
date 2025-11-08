#!/usr/bin/env python3

import requests
import json

def test_pe_red_flag_direct():
    """Test PE red flag by directly providing a conversation state with all required slots"""
    
    base_url = "https://symptom-intel.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🔍 Testing PE Red Flag with Direct Slot Values")
    print("=" * 70)
    
    # Create conversation state with all slots needed for PE red flag
    conversation_state = {
        "active_interview": "shortness_of_breath",
        "shortness_of_breath_interview_state": {
            "complaint": "shortness_of_breath",
            "stage": "RED_FLAGS",  # Force to RED_FLAGS stage
            "slots": {
                "confirm_shortness_of_breath": True,
                "onset": "sudden",  # ✅ Required for PE
                "chest_pain_pleuritic": True,  # ✅ Required for PE
                "risk_factors": ["recent_surgery"],  # ✅ Required for PE
                "duration": "2 hours ago",
                "pattern": ["at_rest"],
                "severity_scale": 8,
                "cough": "none",
                "wheeze": False,
                "stridor": False,
                "fever": False,
                "hemoptysis": False,
                "edema_legs": False,
                "age_group": "adult_18_40"
            },
            "interview_complete": False,
            "last_asked": None
        }
    }
    
    print("📍 Testing with PE red flag conditions:")
    print(f"  - onset: {conversation_state['shortness_of_breath_interview_state']['slots']['onset']}")
    print(f"  - chest_pain_pleuritic: {conversation_state['shortness_of_breath_interview_state']['slots']['chest_pain_pleuritic']}")
    print(f"  - risk_factors: {conversation_state['shortness_of_breath_interview_state']['slots']['risk_factors']}")
    
    test_data = {
        "user_message": "I need to know what's wrong with me",
        "session_id": "pe_red_flag_test",
        "conversation_state": conversation_state,
        "user_id": "test_user"
    }
    
    response = requests.post(f"{api_url}/integrated/medical-ai", json=test_data, timeout=10)
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {data.get('assistant_message', '')[:200]}...")
        print(f"Triage Level: {data.get('triage_level')}")
        print(f"Emergency Detected: {data.get('emergency_detected')}")
        print(f"Next Step: {data.get('next_step')}")
        
        # Check if PE red flag was triggered
        if data.get('triage_level') == 'red' or data.get('emergency_detected'):
            print("✅ SUCCESS: PE red flag triggered!")
            
            # Check for PE-specific messaging
            assistant_message = data.get('assistant_message', '').lower()
            if 'pulmonary embolism' in assistant_message:
                print("✅ SUCCESS: Pulmonary embolism mentioned in response")
            else:
                print("❌ ISSUE: Pulmonary embolism not mentioned")
                
            if '911' in assistant_message or 'emergency' in assistant_message:
                print("✅ SUCCESS: Emergency instructions provided")
            else:
                print("❌ ISSUE: No emergency instructions")
        else:
            print("❌ FAILURE: PE red flag not triggered")
            print(f"Full response: {json.dumps(data, indent=2)}")
    else:
        print(f"❌ Request failed: {response.status_code}")
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_pe_red_flag_direct()