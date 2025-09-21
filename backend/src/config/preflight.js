/**
 * Preflight Guard - Checks for required packages before server startup
 * Prevents "Cannot find module" crashes with friendly error messages
 */

const requiredPackages = {
  // Core Express packages
  express: 'Express.js web framework',
  cors: 'CORS middleware for cross-origin requests',
  compression: 'Response compression middleware',
  helmet: 'Security headers middleware',
  'express-rate-limit': 'Rate limiting middleware',
  
  // Database packages
  sequelize: 'Sequelize ORM for database operations',
  pg: 'PostgreSQL driver for Node.js',
  'pg-hstore': 'PostgreSQL hstore support',
  
  // Authentication packages
  bcryptjs: 'Password hashing library',
  jsonwebtoken: 'JWT token handling',
  'express-validator': 'Request validation middleware',
  
  // Voice service packages (conditional)
  '@google-cloud/speech': 'Google Cloud Speech-to-Text',
  '@google-cloud/text-to-speech': 'Google Cloud Text-to-Speech',
  '@google-cloud/translate': 'Google Cloud Translation',
  openai: 'OpenAI API client',
  
  // Utility packages
  multer: 'File upload middleware',
  uuid: 'UUID generation library',
  'node-cron': 'Cron job scheduling',
  ws: 'WebSocket implementation'
};

/**
 * Check if a package is available
 * @param {string} packageName - Name of the package to check
 * @returns {boolean} - True if package is available
 */
function isPackageAvailable(packageName) {
  try {
    require.resolve(packageName);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Run preflight checks for all required packages
 * @param {Object} options - Preflight options
 * @param {boolean} options.checkVoiceServices - Whether to check voice service packages
 * @param {boolean} options.strict - Whether to fail on missing packages
 * @returns {Object} - Preflight results
 */
function runPreflightChecks(options = {}) {
  const { checkVoiceServices = false, strict = false } = options;
  
  console.log('🔍 Running preflight package checks...');
  
  const results = {
    passed: [],
    failed: [],
    warnings: [],
    total: 0
  };
  
  // Check core packages (always required)
  const corePackages = Object.keys(requiredPackages).filter(pkg => 
    !pkg.startsWith('@google-cloud') && pkg !== 'openai'
  );
  
  // Check voice packages (conditional)
  const voicePackages = ['@google-cloud/speech', '@google-cloud/text-to-speech', '@google-cloud/translate', 'openai'];
  
  // Run checks
  [...corePackages, ...(checkVoiceServices ? voicePackages : [])].forEach(packageName => {
    results.total++;
    
    if (isPackageAvailable(packageName)) {
      results.passed.push(packageName);
      console.log(`  ✅ ${packageName}: ${requiredPackages[packageName]}`);
    } else {
      const isVoicePackage = voicePackages.includes(packageName);
      const isCorePackage = corePackages.includes(packageName);
      
      if (isCorePackage) {
        results.failed.push(packageName);
        console.log(`  ❌ ${packageName}: ${requiredPackages[packageName]} - MISSING`);
      } else if (isVoicePackage) {
        results.warnings.push(packageName);
        console.log(`  ⚠️  ${packageName}: ${requiredPackages[packageName]} - Voice services will be unavailable`);
      }
    }
  });
  
  // Print summary
  console.log('');
  console.log('📊 Preflight Check Summary:');
  console.log(`  ✅ Passed: ${results.passed.length}`);
  console.log(`  ❌ Failed: ${results.failed.length}`);
  console.log(`  ⚠️  Warnings: ${results.warnings.length}`);
  console.log(`  📦 Total: ${results.total}`);
  
  // Determine if preflight passed
  const hasFailures = results.failed.length > 0;
  const hasWarnings = results.warnings.length > 0;
  
  if (hasFailures) {
    console.log('');
    console.log('❌ Preflight failed! Missing required packages:');
    results.failed.forEach(pkg => {
      console.log(`  - ${pkg}: ${requiredPackages[pkg]}`);
    });
    console.log('');
    console.log('💡 To fix:');
    console.log('  1. Run: npm install');
    console.log('  2. Check package.json for missing dependencies');
    console.log('  3. Verify node_modules exists');
    
    if (strict) {
      throw new Error(`Preflight failed: Missing ${results.failed.length} required packages`);
    }
  }
  
  if (hasWarnings) {
    console.log('');
    console.log('⚠️  Preflight warnings (voice services will be unavailable):');
    results.warnings.forEach(pkg => {
      console.log(`  - ${pkg}: ${requiredPackages[pkg]}`);
    });
    console.log('');
    console.log('💡 To enable voice services:');
    console.log('  1. Install missing packages: npm install <package-name>');
    console.log('  2. Set VOICE_GOOGLE_ENABLED=1 or VOICE_OPENAI_ENABLED=1 in .env');
  }
  
  if (!hasFailures) {
    console.log('');
    console.log('✅ Preflight passed! All required packages are available.');
  }
  
  return results;
}

/**
 * Quick check for critical packages (used during development)
 * @returns {boolean} - True if critical packages are available
 */
function quickCheck() {
  const criticalPackages = ['express', 'cors', 'helmet'];
  
  for (const pkg of criticalPackages) {
    if (!isPackageAvailable(pkg)) {
      console.error(`❌ Critical package missing: ${pkg}`);
      return false;
    }
  }
  
  return true;
}

module.exports = {
  runPreflightChecks,
  quickCheck,
  isPackageAvailable,
  requiredPackages
};
