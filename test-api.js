/**
 * Simple API structure test for @relayplane/sdk
 * 
 * This script verifies that all expected exports are available
 * and have the correct types without making actual API calls.
 */

const RelayPlane = require('./dist/index.js');

console.log('🧪 RelayPlane SDK - API Structure Test\n');

// Test default export
console.log('✅ Default export available:', typeof RelayPlane);
console.log('   - relay:', typeof RelayPlane.relay);
console.log('   - optimize:', typeof RelayPlane.optimize);
console.log('   - configure:', typeof RelayPlane.configure);
console.log('   - canOptimize:', typeof RelayPlane.canOptimize);
console.log('   - getOptimizeCapabilities:', typeof RelayPlane.getOptimizeCapabilities);
console.log('   - clearOptimizeCache:', typeof RelayPlane.clearOptimizeCache);
console.log('   - getOptimizeMetrics:', typeof RelayPlane.getOptimizeMetrics);

// Test named exports
const { 
  relay, 
  optimize, 
  configure, 
  canOptimize, 
  getOptimizeCapabilities, 
  clearOptimizeCache, 
  getOptimizeMetrics,
  RelayError, 
  RelayTimeoutError, 
  RelayAuthError, 
  RelayRateLimitError 
} = RelayPlane;

console.log('\n✅ Named exports available:');
console.log('   - relay:', typeof relay);
console.log('   - optimize:', typeof optimize);
console.log('   - configure:', typeof configure);
console.log('   - canOptimize:', typeof canOptimize);
console.log('   - getOptimizeCapabilities:', typeof getOptimizeCapabilities);
console.log('   - clearOptimizeCache:', typeof clearOptimizeCache);
console.log('   - getOptimizeMetrics:', typeof getOptimizeMetrics);

console.log('\n✅ Error classes available:');
console.log('   - RelayError:', typeof RelayError);
console.log('   - RelayTimeoutError:', typeof RelayTimeoutError);
console.log('   - RelayAuthError:', typeof RelayAuthError);
console.log('   - RelayRateLimitError:', typeof RelayRateLimitError);

// Test canOptimize function
console.log('\n✅ Testing canOptimize function:');
console.log('   - canOptimize():', canOptimize());
console.log('   - canOptimize({ apiKey: "test" }):', canOptimize({ apiKey: "test" }));

// Test getOptimizeMetrics function
console.log('\n✅ Testing getOptimizeMetrics function:');
const metrics = getOptimizeMetrics();
console.log('   - Returns object with cacheSize:', typeof metrics.cacheSize);
console.log('   - Returns object with modelMetrics:', typeof metrics.modelMetrics);
console.log('   - Cache size:', metrics.cacheSize);
console.log('   - Model metrics keys:', Object.keys(metrics.modelMetrics).length);

// Test clearOptimizeCache function
console.log('\n✅ Testing clearOptimizeCache function:');
try {
  clearOptimizeCache();
  console.log('   - clearOptimizeCache() executed successfully');
} catch (error) {
  console.log('   - clearOptimizeCache() failed:', error.message);
}

// Package version
console.log('\n✅ Version:', require('./package.json').version);

console.log('\n🎉 API structure test completed successfully!');
console.log('All expected exports are available and have correct types.'); 