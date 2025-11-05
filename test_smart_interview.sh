#!/bin/bash
echo "========================================================"
echo "TESTING SMART ADAPTIVE INTERVIEW"
echo "========================================================"
echo ""

# Test 1: Comprehensive initial message
echo "TEST 1: Comprehensive fever message (should skip most questions)"
echo "Input: 'I have fever for 1 week, 100F, comes and goes, with cough and chills'"
echo ""
curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input": "I have fever for 1 week, 100F, comes and goes, with cough and chills", "user_id": "smart_test1"}' \
  | python3 -c "import sys, json; r=json.load(sys.stdin); print('Response:', r['response'][:150]); print('Next step:', r['next_step']); print('Collected:', list(r.get('collected_slots', {}).keys()))"

echo ""
echo "========================================================"
echo ""

# Test 2: Multi-symptom in conversation
echo "TEST 2: Adding symptoms mid-conversation"
RESP2=$(curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input": "chest pain", "user_id": "smart_test2"}')
SID2=$(echo $RESP2 | python3 -c "import sys, json; print(json.load(sys.stdin)['session_id'])")
echo "Started chest pain interview, session: $SID2"
echo ""

echo "User adds: 'sudden onset, severe 9/10, radiating to left arm with sweating'"
curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d "{\"user_input\": \"sudden onset, severe 9/10, radiating to left arm with sweating\", \"user_id\": \"smart_test2\", \"session_id\": \"$SID2\"}" \
  | python3 -c "import sys, json; r=json.load(sys.stdin); print('Response:', r['response'][:150]); print('Next step:', r['next_step']); print('Triage:', r.get('triage_level'))"

echo ""
echo "========================================================"
