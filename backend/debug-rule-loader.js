const { loadRulePack } = require('./src/rule-engine/ruleLoader');

async function debugRuleLoader() {
  console.log('🔍 Debugging Rule Loader...\n');

  try {
    console.log('📋 Testing loadRulePack for "chest_pain"...');
    const result = await loadRulePack('chest_pain');
    
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 Rule pack loaded successfully!');
      console.log('📊 Coverage:', result.coverage);
      console.log('📦 Source:', result.source);
      console.log('📝 Message:', result.message);
    } else {
      console.log('❌ Rule pack loading failed');
      console.log('📝 Error message:', result.message);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the debug
debugRuleLoader();
