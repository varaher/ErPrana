#!/usr/bin/env python3
"""
Test script demonstrating improvements to complaint detection and feedback system
"""

import requests
import json

BACKEND_URL = "http://localhost:8001"

def test_complaint_detection():
    """Test enhanced complaint detection with real-world inputs"""
    print("\n" + "="*70)
    print(" TEST 1: Enhanced Complaint Detection")
    print("="*70)
    
    test_cases = [
        ("chest heaviness", "chest pain"),
        ("im feeling heaviness in chest", "chest pain"),
        ("giddiness", "dizziness"),
        ("fvr", "fever"),
        ("sweating followed by chest heaviness", "chest pain"),
        ("chest heviness", "chest pain"),  # typo
        ("102 f fever", "fever")
    ]
    
    passed = 0
    for user_input, expected in test_cases:
        response = requests.post(
            f"{BACKEND_URL}/api/hybrid/chat",
            json={"user_input": user_input, "user_id": "test_user"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("next_step") == "slot_filling" or expected.lower() in data.get("response", "").lower():
                print(f"✅ '{user_input}' → Correctly detected")
                passed += 1
            else:
                print(f"❌ '{user_input}' → Not detected properly")
        else:
            print(f"❌ '{user_input}' → API error: {response.status_code}")
    
    print(f"\nResult: {passed}/{len(test_cases)} passed ({passed/len(test_cases)*100:.1f}%)")
    return passed == len(test_cases)

def test_feedback_system():
    """Test triage feedback collection"""
    print("\n" + "="*70)
    print(" TEST 2: Triage Feedback System")
    print("="*70)
    
    # Create a test session first
    response = requests.post(
        f"{BACKEND_URL}/api/symptom-intelligence-layer/start-session",
        json={"chief_complaint": "chest pain", "user_id": "test_feedback"}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to create session")
        return False
    
    session_id = response.json()["session_id"]
    print(f"✅ Created test session: {session_id}")
    
    # Answer questions to complete interview
    requests.post(
        f"{BACKEND_URL}/api/symptom-intelligence-layer/process-response",
        json={"session_id": session_id, "slot": "onset", "value": "sudden"}
    )
    requests.post(
        f"{BACKEND_URL}/api/symptom-intelligence-layer/process-response",
        json={"session_id": session_id, "slot": "radiation", "value": "yes"}
    )
    requests.post(
        f"{BACKEND_URL}/api/symptom-intelligence-layer/process-response",
        json={"session_id": session_id, "slot": "severity", "value": "9"}
    )
    final = requests.post(
        f"{BACKEND_URL}/api/symptom-intelligence-layer/process-response",
        json={"session_id": session_id, "slot": "associated_symptoms", "value": "shortness of breath"}
    )
    
    triage_level = final.json().get("triage_level")
    print(f"✅ Interview completed with triage: {triage_level}")
    
    # Submit feedback
    feedback_response = requests.post(
        f"{BACKEND_URL}/api/triage-feedback/submit-triage-feedback",
        json={
            "session_id": session_id,
            "user_id": "test_feedback",
            "feedback_type": "correct",
            "system_triage": triage_level,
            "user_comment": "Diagnosis was accurate",
            "severity_rating": 5
        }
    )
    
    if feedback_response.status_code == 200:
        print(f"✅ Feedback submitted successfully")
        print(f"   Message: {feedback_response.json()['message']}")
        
        # Get feedback statistics
        stats_response = requests.get(f"{BACKEND_URL}/api/triage-feedback/feedback-statistics")
        if stats_response.status_code == 200:
            stats = stats_response.json()
            print(f"\n📊 Feedback Statistics:")
            print(f"   Total Feedback: {stats['total_feedback']}")
            print(f"   Accuracy Rate: {stats['accuracy_rate']}%")
            return True
    
    print(f"❌ Feedback submission failed")
    return False

def test_multi_symptom_detection():
    """Test detection of multiple symptoms in one input"""
    print("\n" + "="*70)
    print(" TEST 3: Multi-Symptom Detection")
    print("="*70)
    
    test_input = "I have chest pain and sweating with shortness of breath"
    
    response = requests.post(
        f"{BACKEND_URL}/api/hybrid/chat",
        json={"user_input": test_input, "user_id": "test_multi"}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("next_step") == "slot_filling":
            print(f"✅ Multi-symptom input handled correctly")
            print(f"   Input: '{test_input}'")
            print(f"   Prioritized: {data.get('response')[:50]}...")
            return True
    
    print(f"❌ Multi-symptom detection failed")
    return False

def main():
    """Run all tests"""
    print("\n" + "="*70)
    print(" COMPREHENSIVE IMPROVEMENT TESTS")
    print("="*70)
    
    results = {
        "Complaint Detection": test_complaint_detection(),
        "Feedback System": test_feedback_system(),
        "Multi-Symptom Detection": test_multi_symptom_detection()
    }
    
    print("\n" + "="*70)
    print(" FINAL RESULTS")
    print("="*70)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    total_passed = sum(results.values())
    total_tests = len(results)
    print(f"\nOverall: {total_passed}/{total_tests} tests passed ({total_passed/total_tests*100:.1f}%)")

if __name__ == "__main__":
    main()
