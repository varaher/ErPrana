#!/usr/bin/env python3

import requests
import json

def test_sob_followup_scenario():
    """Test SOB scenario with follow-up to see if triage escalation happens during interview"""
    
    base_url = "https://smart-triage-2.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🔍 Testing SOB PE Risk Factor Triage Escalation During Interview")
    print("=" * 70)
    
    # Step 1: Initial SOB message with risk factors
    print("\n📍 Step 1: Initial SOB message with risk factors")
    test_data_1 = {
        "user_message": "sudden shortness of breath with chest pain, I had surgery last week",
        "session_id": "sob_followup_test",
        "conversation_state": None,
        "user_id": "test_user"
    }
    
    response_1 = requests.post(f"{api_url}/integrated/medical-ai", json=test_data_1, timeout=10)
    print(f"Status: {response_1.status_code}")
    
    if response_1.status_code == 200:
        data_1 = response_1.json()
        print(f"Response: {data_1.get('assistant_message', '')[:100]}...")
        print(f"Interview Active: {data_1.get('interview_active')}")
        print(f"Interview Type: {data_1.get('interview_type')}")
        print(f"Triage Level: {data_1.get('triage_level')}")
        print(f"Emergency Detected: {data_1.get('emergency_detected')}")
        
        # Check if risk factors were collected
        updated_state = data_1.get('updated_state', {})
        sob_state = updated_state.get('shortness_of_breath_interview_state', {})
        slots = sob_state.get('slots', {})
        risk_factors = slots.get('risk_factors', [])
        print(f"Risk Factors Collected: {risk_factors}")
        
        # Step 2: Continue the interview to see if triage escalation happens
        print("\n📍 Step 2: Continue interview - confirm symptoms")
        test_data_2 = {
            "user_message": "yes, I have sudden shortness of breath and chest pain when breathing",
            "session_id": "sob_followup_test",
            "conversation_state": updated_state,
            "user_id": "test_user"
        }
        
        response_2 = requests.post(f"{api_url}/integrated/medical-ai", json=test_data_2, timeout=10)
        print(f"Status: {response_2.status_code}")
        
        if response_2.status_code == 200:
            data_2 = response_2.json()
            print(f"Response: {data_2.get('assistant_message', '')[:100]}...")
            print(f"Triage Level: {data_2.get('triage_level')}")
            print(f"Emergency Detected: {data_2.get('emergency_detected')}")
            
            # Check if triage escalated
            if data_2.get('triage_level') == 'red' or data_2.get('emergency_detected'):
                print("✅ SUCCESS: Triage escalated to RED due to PE risk factors!")
            else:
                print("❌ ISSUE: Triage not escalated despite PE risk factors")
                
            # Check assistant message for PE-specific content
            assistant_message = data_2.get('assistant_message', '').lower()
            if any(term in assistant_message for term in ['pulmonary embolism', 'blood clot', 'emergency', '911']):
                print("✅ SUCCESS: PE-specific emergency messaging provided")
            else:
                print("❌ ISSUE: No PE-specific emergency messaging")
                
        else:
            print(f"❌ Step 2 failed with status {response_2.status_code}")
            print(f"Error: {response_2.text}")
    else:
        print(f"❌ Step 1 failed with status {response_1.status_code}")
        print(f"Error: {response_1.text}")

if __name__ == "__main__":
    test_sob_followup_scenario()