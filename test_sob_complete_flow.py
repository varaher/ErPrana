#!/usr/bin/env python3

import requests
import json

def test_complete_sob_flow():
    """Test complete SOB interview flow to trigger PE red flag"""
    
    base_url = "https://med-diagnosis-1.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🔍 Testing Complete SOB Interview Flow for PE Red Flag")
    print("=" * 70)
    
    session_id = "complete_sob_test"
    conversation_state = None
    
    # Step 1: Initial SOB message with risk factors
    print("\n📍 Step 1: Initial SOB message")
    test_data = {
        "user_message": "sudden shortness of breath with chest pain, I had surgery last week",
        "session_id": session_id,
        "conversation_state": conversation_state,
        "user_id": "test_user"
    }
    
    response = requests.post(f"{api_url}/integrated/medical-ai", json=test_data, timeout=10)
    if response.status_code != 200:
        print(f"❌ Step 1 failed: {response.status_code} - {response.text}")
        return
    
    data = response.json()
    conversation_state = data.get('updated_state', {})
    print(f"✅ Step 1: {data.get('assistant_message', '')[:50]}...")
    
    # Step 2: Confirm SOB
    print("\n📍 Step 2: Confirm SOB")
    test_data = {
        "user_message": "yes, I have shortness of breath",
        "session_id": session_id,
        "conversation_state": conversation_state,
        "user_id": "test_user"
    }
    
    response = requests.post(f"{api_url}/integrated/medical-ai", json=test_data, timeout=10)
    if response.status_code != 200:
        print(f"❌ Step 2 failed: {response.status_code} - {response.text}")
        return
    
    data = response.json()
    conversation_state = data.get('updated_state', {})
    print(f"✅ Step 2: {data.get('assistant_message', '')[:50]}...")
    
    # Step 3: Provide duration
    print("\n📍 Step 3: Provide duration")
    test_data = {
        "user_message": "it started 2 hours ago",
        "session_id": session_id,
        "conversation_state": conversation_state,
        "user_id": "test_user"
    }
    
    response = requests.post(f"{api_url}/integrated/medical-ai", json=test_data, timeout=10)
    if response.status_code != 200:
        print(f"❌ Step 3 failed: {response.status_code} - {response.text}")
        return
    
    data = response.json()
    conversation_state = data.get('updated_state', {})
    print(f"✅ Step 3: {data.get('assistant_message', '')[:50]}...")
    
    # Step 4: Confirm sudden onset
    print("\n📍 Step 4: Confirm sudden onset")
    test_data = {
        "user_message": "suddenly",
        "session_id": session_id,
        "conversation_state": conversation_state,
        "user_id": "test_user"
    }
    
    response = requests.post(f"{api_url}/integrated/medical-ai", json=test_data, timeout=10)
    if response.status_code != 200:
        print(f"❌ Step 4 failed: {response.status_code} - {response.text}")
        return
    
    data = response.json()
    conversation_state = data.get('updated_state', {})
    print(f"✅ Step 4: {data.get('assistant_message', '')[:50]}...")
    
    # Continue through the interview until we get to pleuritic chest pain question
    steps = [
        ("Step 5: Pattern", "at rest and with activity"),
        ("Step 6: Severity", "8 out of 10"),
        ("Step 7: Cough", "no cough"),
        ("Step 8: Wheeze", "no wheezing"),
        ("Step 9: Stridor", "no stridor"),
        ("Step 10: Pleuritic chest pain", "yes, chest pain gets worse when I breathe deeply"),
    ]
    
    for step_name, response_text in steps:
        print(f"\n📍 {step_name}")
        test_data = {
            "user_message": response_text,
            "session_id": session_id,
            "conversation_state": conversation_state,
            "user_id": "test_user"
        }
        
        response = requests.post(f"{api_url}/integrated/medical-ai", json=test_data, timeout=10)
        if response.status_code != 200:
            print(f"❌ {step_name} failed: {response.status_code} - {response.text}")
            return
        
        data = response.json()
        conversation_state = data.get('updated_state', {})
        print(f"✅ {step_name}: {data.get('assistant_message', '')[:50]}...")
        
        # Check if red flag triggered
        triage_level = data.get('triage_level')
        emergency_detected = data.get('emergency_detected')
        
        if triage_level == 'red' or emergency_detected:
            print(f"🚨 RED FLAG TRIGGERED! Triage: {triage_level}, Emergency: {emergency_detected}")
            assistant_message = data.get('assistant_message', '').lower()
            if any(term in assistant_message for term in ['pulmonary embolism', 'blood clot', 'emergency', '911']):
                print("✅ SUCCESS: PE-specific emergency messaging provided!")
            else:
                print("❌ ISSUE: No PE-specific emergency messaging")
            return
    
    print("\n❌ RED FLAG NOT TRIGGERED: Interview completed without PE red flag")
    
    # Print final state for debugging
    sob_state = conversation_state.get('shortness_of_breath_interview_state', {})
    slots = sob_state.get('slots', {})
    print(f"\nFinal slots: {json.dumps(slots, indent=2)}")

if __name__ == "__main__":
    test_complete_sob_flow()