const RelayPlane = require('./dist/index.js');

async function testSDKWithNewAPI() {
  console.log('🧪 Testing SDK with new API format...');
  
  // Configure SDK to use local API
  RelayPlane.configure({
    baseUrl: 'http://localhost:3001',
    apiKey: 'test-key-for-sdk-testing',
    debug: true
  });

  try {
    // Test the new SDK interface
    const response = await RelayPlane.relay({
      to: 'claude-3-sonnet',
      payload: {
        messages: [
          { role: 'user', content: 'Hello! This is a test of the new SDK interface.' }
        ],
        temperature: 0.7,
        max_tokens: 100
      },
      metadata: {
        test: 'sdk-api-sync',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ SDK test successful!');
    console.log('Response:', {
      relay_id: response.relay_id,
      status_code: response.status_code,
      latency_ms: response.latency_ms,
      body_preview: JSON.stringify(response.body).substring(0, 100) + '...'
    });

  } catch (error) {
    console.log('❌ SDK test failed:', error.message);
    if (error.statusCode) {
      console.log('Status Code:', error.statusCode);
    }
  }
}

if (require.main === module) {
  testSDKWithNewAPI();
}

module.exports = { testSDKWithNewAPI }; 