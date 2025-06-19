/**
 * RelayPlane SDK - Relay Optimize™ Example
 * 
 * This example demonstrates the advanced optimization features including:
 * - Intelligent model fallback chains
 * - Cost ceiling management
 * - Response caching
 * - Different optimization strategies
 * - Performance metrics
 */

const RelayPlane = require('../dist/index.js');

async function demonstrateOptimize() {
  console.log('🚀 RelayPlane SDK - Relay Optimize™ Demo\n');

  // Check if optimize is available
  console.log('📊 Checking optimization capabilities...');
  const canUseOptimize = RelayPlane.canOptimize();
  console.log(`   - Can optimize: ${canUseOptimize}`);
  
  if (!canUseOptimize) {
    console.log('   ⚠️  To use relay.optimize(), set RELAY_API_KEY environment variable');
    console.log('   📝 Example: export RELAY_API_KEY="your-key-here"');
    console.log('   🔄 Falling back to basic relay() examples...\n');
    
    // Show basic relay examples as fallback
    await demonstrateBasicRelay();
    return;
  }

  try {
    // Get optimization capabilities
    const capabilities = await RelayPlane.getOptimizeCapabilities();
    console.log('   - Current tier:', capabilities.tier);
    console.log('   - Features:', Object.keys(capabilities.features).filter(f => capabilities.features[f]).join(', '));
    console.log('   - Monthly limit:', capabilities.limits.maxCallsPerMonth.toLocaleString(), 'calls');
    console.log();

    // Example 1: Balanced strategy (default)
    console.log('🔄 Example 1: Balanced optimization strategy');
    await testOptimizeStrategy('balanced');

    // Example 2: Latency-focused strategy
    console.log('🔄 Example 2: Latency-focused optimization');
    await testOptimizeStrategy('latency');

    // Example 3: Cost-focused strategy
    console.log('🔄 Example 3: Cost-focused optimization');
    await testOptimizeStrategy('cost');

    // Example 4: Custom fallback chain
    console.log('🔄 Example 4: Custom fallback chain');
    await testCustomFallbackChain();

    // Example 5: Cache demonstration
    console.log('🔄 Example 5: Response caching');
    await testCaching();

    // Example 6: Cost ceiling
    console.log('🔄 Example 6: Cost ceiling management');
    await testCostCeiling();

    // Show optimization metrics
    console.log('📊 Final optimization metrics:');
    const metrics = RelayPlane.getOptimizeMetrics();
    console.log(`   - Cache entries: ${metrics.cacheSize}`);
    console.log('   - Model performance:');
    Object.entries(metrics.modelMetrics).forEach(([model, data]) => {
      if (data.requestCount > 0) {
        console.log(`     • ${model}: ${Math.round(data.averageLatency)}ms avg, ${Math.round(data.successRate * 100)}% success`);
      }
    });

  } catch (error) {
    console.error('❌ Optimize demo failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 To test optimize features:');
      console.log('   1. Get a RelayPlane API key at https://relayplane.com');
      console.log('   2. Set environment variable: export RELAY_API_KEY="your-key"');
      console.log('   3. Ensure you have provider API keys for fallback testing');
    }
  }
}

async function testOptimizeStrategy(strategy) {
  const request = {
    to: 'claude-3-sonnet',
    payload: {
      messages: [
        { role: 'user', content: `Test message for ${strategy} strategy optimization` }
      ],
      max_tokens: 50
    },
    metadata: { 
      example: `strategy-${strategy}`,
      timestamp: new Date().toISOString()
    }
  };

  const optimizeConfig = {
    strategy: strategy,
    maxCost: 0.10, // 10 cents limit
    enableCache: true,
    cacheTtl: 60, // 1 minute for demo
    maxRetries: 2
  };

  try {
    console.log(`   📤 Request to ${request.to} with ${strategy} strategy...`);
    const startTime = performance.now();
    
    const response = await RelayPlane.optimize(request, optimizeConfig, { debug: true });
    
    const duration = Math.round(performance.now() - startTime);
    console.log(`   ✅ Response received in ${duration}ms`);
    console.log(`   📊 Status: ${response.status_code}, Latency: ${response.latency_ms}ms`);
    console.log(`   🔄 Fallback used: ${response.fallback_used ? 'Yes' : 'No'}`);
    console.log(`   📝 Response preview: "${response.body?.choices?.[0]?.message?.content?.slice(0, 100) || 'No content'}..."`);
    console.log();

  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    console.log();
  }
}

async function testCustomFallbackChain() {
  const request = {
    to: 'claude-3-opus', // Start with premium model
    payload: {
      messages: [
        { role: 'user', content: 'What is 2 + 2? (testing custom fallback chain)' }
      ],
      max_tokens: 30
    }
  };

  const optimizeConfig = {
    strategy: 'fallback',
    fallbackChain: ['claude-3-opus', 'gpt-4', 'claude-3-sonnet', 'gpt-3.5-turbo'],
    maxCost: 0.05,
    enableCache: false // Disable cache to test actual fallback
  };

  try {
    console.log('   📤 Testing custom fallback chain...');
    const response = await RelayPlane.optimize(request, optimizeConfig, { debug: true });
    
    console.log(`   ✅ Final model succeeded: ${response.fallback_used ? 'via fallback' : 'primary model'}`);
    console.log(`   📊 Status: ${response.status_code}, Latency: ${response.latency_ms}ms`);
    console.log();

  } catch (error) {
    console.log(`   ❌ All models in fallback chain failed: ${error.message}`);
    console.log();
  }
}

async function testCaching() {
  const request = {
    to: 'gpt-3.5-turbo',
    payload: {
      messages: [
        { role: 'user', content: 'What is the capital of France? (cache test)' }
      ],
      max_tokens: 20
    }
  };

  const optimizeConfig = {
    enableCache: true,
    cacheTtl: 300 // 5 minutes
  };

  try {
    console.log('   📤 First request (should miss cache)...');
    const startTime1 = performance.now();
    const response1 = await RelayPlane.optimize(request, optimizeConfig, { debug: true });
    const duration1 = Math.round(performance.now() - startTime1);
    
    console.log(`   ✅ First response in ${duration1}ms (cache miss)`);
    
    console.log('   📤 Second identical request (should hit cache)...');
    const startTime2 = performance.now();
    const response2 = await RelayPlane.optimize(request, optimizeConfig, { debug: true });
    const duration2 = Math.round(performance.now() - startTime2);
    
    console.log(`   ✅ Second response in ${duration2}ms (cache ${duration2 < duration1 / 2 ? 'hit!' : 'miss?'})`);
    console.log(`   🚀 Speed improvement: ${Math.round((1 - duration2/duration1) * 100)}%`);
    console.log();

  } catch (error) {
    console.log(`   ❌ Cache test failed: ${error.message}`);
    console.log();
  }
}

async function testCostCeiling() {
  const request = {
    to: 'gpt-4', // Expensive model
    payload: {
      messages: [
        { role: 'user', content: 'Write a very long story about AI...' }
      ],
      max_tokens: 1000 // Large response
    }
  };

  const optimizeConfig = {
    maxCost: 0.001, // Very low cost ceiling (should trigger fallback)
    strategy: 'cost',
    enableCache: false
  };

  try {
    console.log('   📤 Testing cost ceiling with expensive request...');
    const response = await RelayPlane.optimize(request, optimizeConfig, { debug: true });
    
    console.log(`   ✅ Request completed under cost ceiling`);
    console.log(`   🔄 Fallback used: ${response.fallback_used ? 'Yes (cost optimization)' : 'No'}`);
    console.log();

  } catch (error) {
    console.log(`   ❌ Cost ceiling test result: ${error.message}`);
    if (error.message.includes('cost')) {
      console.log('   💡 This is expected behavior - cost ceiling protection worked!');
    }
    console.log();
  }
}

async function demonstrateBasicRelay() {
  console.log('🔄 Demonstrating basic relay() function...\n');

  const request = {
    to: 'gpt-3.5-turbo',
    payload: {
      messages: [
        { role: 'user', content: 'Hello! Can you help me test the RelayPlane SDK?' }
      ],
      max_tokens: 50
    }
  };

  try {
    console.log('📤 Sending basic relay request...');
    const response = await RelayPlane.relay(request, { debug: true });
    
    console.log('✅ Basic relay successful!');
    console.log(`📊 Status: ${response.status_code}, Latency: ${response.latency_ms}ms`);
    console.log();

  } catch (error) {
    console.log(`❌ Basic relay failed: ${error.message}`);
    
    if (error.message.includes('API key')) {
      console.log('💡 Set provider API keys to test local mode, or RELAY_API_KEY for hosted mode');
    }
    console.log();
  }
}

// Run the demo
if (require.main === module) {
  demonstrateOptimize().catch(console.error);
}

module.exports = {
  demonstrateOptimize,
  testOptimizeStrategy,
  testCustomFallbackChain,
  testCaching,
  testCostCeiling
}; 