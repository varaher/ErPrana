const { processTriage } = require('./src/rule-engine/ruleEngine.js');

async function testRuleEngine() {
  console.log('🧪 Testing Rule Engine...\n');

  // Test case 1: High-risk chest pain (should trigger emergency)
  console.log('📋 Test Case 1: High-risk chest pain');
  const testData1 = {
    abcde: {
      breathing: { distress: false, wheeze: false }
    },
    vitals: {
      hr: 110,
      sbp: 95,
      spo2: 98
    },
    sample: {
      pastHistory: ['hypertension']
    },
    socrates: {
      character: 'crushing',
      radiation: ['left arm'],
      associated: ['diaphoresis'],
      onset: 'gradual'
    },
    ageGroup: 'adult'
  };

  try {
    const result1 = await processTriage(testData1, 'chest_pain');
    console.log('✅ Result:', JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 2: Stable chest pain (should trigger urgent)
  console.log('📋 Test Case 2: Stable chest pain');
  const testData2 = {
    abcde: {
      breathing: { distress: false, wheeze: false }
    },
    vitals: {
      hr: 80,
      sbp: 140,
      spo2: 98
    },
    sample: {
      pastHistory: ['diabetes']
    },
    socrates: {
      character: 'pressure',
      radiation: ['jaw'],
      associated: ['exertion'],
      onset: 'gradual'
    },
    ageGroup: 'adult'
  };

  try {
    const result2 = await processTriage(testData2, 'chest_pain');
    console.log('✅ Result:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test case 3: Non-existent topic (should return web-fallback-needed)
  console.log('📋 Test Case 3: Non-existent topic');
  try {
    const result3 = await processTriage(testData1, 'non_existent_topic');
    console.log('✅ Result:', JSON.stringify(result3, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testRuleEngine().catch(console.error);
