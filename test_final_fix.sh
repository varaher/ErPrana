#!/bin/bash
echo "========================================="
echo "TESTING FINAL FIXES"
echo "========================================="
echo ""

# Test 1: Chest pain - should NOT loop on severity
echo "Test 1: Chest pain with expected slot"
RESP1=$(curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input": "chest pain", "user_id": "final_test1"}')
SID1=$(echo $RESP1 | python3 -c "import sys, json; r=json.load(sys.stdin); print(r.get('session_id', 'none'))")
echo "Session: $SID1"
echo "Question: $(echo $RESP1 | python3 -c "import sys, json; r=json.load(sys.stdin); print(r['response'][:60])")"
echo ""

echo "User answers severity: 7"
RESP2=$(curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d "{\"user_input\": \"7\", \"user_id\": \"final_test1\", \"session_id\": \"$SID1\"}")
echo "Response: $(echo $RESP2 | python3 -c "import sys, json; r=json.load(sys.stdin); print(r['response'][:80])")"
echo "Next step: $(echo $RESP2 | python3 -c "import sys, json; r=json.load(sys.stdin); print(r.get('next_step', 'unknown'))")"
echo ""

echo "========================================="
echo ""

# Test 2: Bare number "10" should NOT be temperature
echo "Test 2: Temperature extraction (should need unit)"
RESP3=$(curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input": "I have fever with temperature 102F", "user_id": "final_test2"}')
echo "Input: 'fever with temperature 102F'"
echo "Detected: $(echo $RESP3 | python3 -c "import sys, json; r=json.load(sys.stdin); print('fever' if 'fever' in r['response'].lower() else 'other')")"
echo "Slots: $(echo $RESP3 | python3 -c "import sys, json; r=json.load(sys.stdin); print(list(r.get('collected_slots', {}).keys()))")"
echo ""

echo "========================================="
