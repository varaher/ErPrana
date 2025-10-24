#!/bin/bash
echo "Testing Loop Fix..."
echo ""

# Test 1: Fever with additional symptoms
echo "1. Start fever interview"
RESP1=$(curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input": "i have fever", "user_id": "test_loop"}')
SESSION_ID=$(echo $RESP1 | python3 -c "import sys, json; print(json.load(sys.stdin).get('session_id', 'none'))")
echo "Session: $SESSION_ID"

echo ""
echo "2. Answer: 1 week"
curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d "{\"user_input\": \"1 week\", \"user_id\": \"test_loop\", \"session_id\": \"$SESSION_ID\"}" | python3 -c "import sys, json; r=json.load(sys.stdin); print('Next Q:', r['response'][:60])"

echo ""
echo "3. Mention additional symptoms: cough with sputum"
curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d "{\"user_input\": \"cough with sputum and chills\", \"user_id\": \"test_loop\", \"session_id\": \"$SESSION_ID\"}" | python3 -c "import sys, json; r=json.load(sys.stdin); print('Response:', r['response'][:80]); print('Step:', r['next_step'])"

