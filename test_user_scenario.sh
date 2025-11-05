#!/bin/bash
echo "Testing EXACT user scenario..."
echo ""

# Test: Comprehensive chest pain message
echo "1. User: 'Sudden chest pain since 2 hours, radiating to my left arm with sweating and shortness of breath'"
RESP=$(curl -s -X POST http://localhost:8001/api/hybrid/chat \
  -H "Content-Type: application/json" \
  -d '{"user_input": "Sudden chest pain since 2 hours, radiating to my left arm with sweating and shortness of breath", "user_id": "scenario_test"}')
  
echo $RESP | python3 -c "import sys, json; r=json.load(sys.stdin); print('Response:', r['response'][:150]); print('Next step:', r['next_step']); print('Triage:', r.get('triage_level', 'Not done')); print('Collected:', list(r.get('collected_slots', {}).keys()))"

echo ""
echo "========================================"
