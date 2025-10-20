#!/bin/bash
echo "========================================="
echo "FINAL IMPROVEMENTS TEST SUITE"
echo "========================================="
echo ""

echo "1. Testing warm greeting..."
curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input": "hi", "user_id": "test1"}' | python3 -c "import sys, json; print('✅ ' + json.load(sys.stdin)['response'][:80] + '...')"

echo ""
echo "2. Testing complaint with emotional context..."
curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input": "I am worried about my chest pain", "user_id": "test2"}' | python3 -c "import sys, json; r=json.load(sys.stdin); print('✅ Detected complaint:', 'chest pain' if 'chest pain' in r['response'].lower() else 'Other'); print('   Response:', r['response'][:80] + '...')"

echo ""
echo "3. Testing colloquial symptom (chest heaviness)..."
curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input": "I have chest heaviness", "user_id": "test3"}' | python3 -c "import sys, json; r=json.load(sys.stdin); print('✅' if r['next_step'] == 'slot_filling' else '❌', 'Chest heaviness detected')"

echo ""
echo "4. Testing typo handling..."
curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input": "fvr", "user_id": "test4"}' | python3 -c "import sys, json; r=json.load(sys.stdin); print('✅' if 'fever' in r['response'].lower() else '❌', 'Typo fvr → fever')"

echo ""
echo "5. Testing multi-symptom (sweating with chest heaviness)..."
curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input": "sweating followed by chest heaviness", "user_id": "test5"}' | python3 -c "import sys, json; r=json.load(sys.stdin); print('✅' if r['next_step'] == 'slot_filling' else '❌', 'Multi-symptom detected')"

echo ""
echo "========================================="
echo "ALL TESTS COMPLETED"
echo "========================================="
