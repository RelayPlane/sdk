/**
 * Claude Integration Example
 * 
 * This example demonstrates how to use the RelayPlane SDK with Claude models.
 * It shows both local mode (requires ANTHROPIC_API_KEY) and hosted mode (requires RELAY_API_KEY).
 */

const { relay, configure } = require('@relayplane/sdk');

async function runClaudeExample() {
  console.log('🤖 RelayPlane SDK - Claude Example\n');

  // Example 1: Local Mode (direct to Anthropic)
  console.log('--- Example 1: Local Mode ---');
  console.log('Using Claude directly via Anthropic API (requires ANTHROPIC_API_KEY)\n');
  
  try {
    const response = await relay({
      to: 'claude-3-sonnet',
      payload: {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: 'Explain quantum computing in simple terms.'
          }
        ]
      },
      metadata: {
        example: 'claude-local',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Response received:');
    console.log('Relay ID:', response.relay_id);
    console.log('Status Code:', response.status_code);
    console.log('Latency:', response.latency_ms + 'ms');
    console.log('Fallback Used:', response.fallback_used);
    console.log('Response:', response.body.content[0].text.substring(0, 200) + '...\n');

  } catch (error) {
    console.error('❌ Local mode failed:', error.message);
    console.log('Make sure ANTHROPIC_API_KEY is set in your environment.\n');
  }

  // Example 2: Hosted Mode (through RelayPlane)
  console.log('--- Example 2: Hosted Mode ---');
  console.log('Using Claude via RelayPlane hosted service (requires RELAY_API_KEY)\n');

  // Configure for hosted mode
  configure({
    apiKey: process.env.RELAY_API_KEY,
    debug: true
  });

  try {
    const response = await relay({
      to: 'claude-3-haiku',
      payload: {
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: 'Write a haiku about artificial intelligence.'
          }
        ]
      },
      metadata: {
        example: 'claude-hosted',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Hosted response received:');
    console.log('Relay ID:', response.relay_id);
    console.log('Status Code:', response.status_code);
    console.log('Latency:', response.latency_ms + 'ms');
    console.log('Fallback Used:', response.fallback_used);
    console.log('Response:', response.body.content[0].text + '\n');

  } catch (error) {
    console.error('❌ Hosted mode failed:', error.message);
    console.log('Make sure RELAY_API_KEY is set, or sign up at https://relayplane.com\n');
  }

  // Example 3: Error Handling
  console.log('--- Example 3: Error Handling ---');
  console.log('Demonstrating proper error handling with RelayPlane SDK\n');

  try {
    const response = await relay({
      to: 'claude-3-opus',
      payload: {
        model: 'claude-3-opus-20240229',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: 'This is a test of error handling and timeout behavior.'
          }
        ]
      }
    }, {
      timeout: 5000  // 5 second timeout for demo
    });

    console.log('✅ Error handling test completed successfully');
    
  } catch (error) {
    if (error.name === 'RelayTimeoutError') {
      console.log('⏱️  Request timed out as expected');
    } else if (error.name === 'RelayAuthError') {
      console.log('🔐 Authentication failed - check your API keys');
    } else {
      console.log('🔍 Other error:', error.message);
    }
  }

  console.log('\n🎉 Claude example completed!');
  console.log('Try setting RELAY_API_KEY to unlock hosted features and optimization.');
}

// Run the example
if (require.main === module) {
  runClaudeExample().catch(console.error);
}

module.exports = { runClaudeExample }; 