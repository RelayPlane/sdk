/**
 * GPT-4 Integration Example
 * 
 * This example demonstrates how to use the RelayPlane SDK with OpenAI GPT models.
 * It shows both local mode (requires OPENAI_API_KEY) and hosted mode (requires RELAY_API_KEY).
 */

const { relay, configure } = require('@relayplane/sdk');

async function runGPTExample() {
  console.log('🧠 RelayPlane SDK - GPT-4 Example\n');

  // Example 1: Local Mode (direct to OpenAI)
  console.log('--- Example 1: Local Mode ---');
  console.log('Using GPT-4 directly via OpenAI API (requires OPENAI_API_KEY)\n');
  
  try {
    const response = await relay({
      to: 'gpt-4',
      payload: {
        model: 'gpt-4',
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant that explains complex topics clearly.'
          },
          {
            role: 'user',
            content: 'What are the key differences between neural networks and traditional algorithms?'
          }
        ]
      },
      metadata: {
        example: 'gpt-local',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Response received:');
    console.log('Relay ID:', response.relay_id);
    console.log('Status Code:', response.status_code);
    console.log('Latency:', response.latency_ms + 'ms');
    console.log('Fallback Used:', response.fallback_used);
    console.log('Response:', response.body.choices[0].message.content.substring(0, 200) + '...\n');

  } catch (error) {
    console.error('❌ Local mode failed:', error.message);
    console.log('Make sure OPENAI_API_KEY is set in your environment.\n');
  }

  // Example 2: Hosted Mode with GPT-3.5 Turbo
  console.log('--- Example 2: Hosted Mode ---');
  console.log('Using GPT-3.5 Turbo via RelayPlane hosted service (requires RELAY_API_KEY)\n');

  // Configure for hosted mode
  configure({
    apiKey: process.env.RELAY_API_KEY,
    debug: true
  });

  try {
    const response = await relay({
      to: 'gpt-3.5-turbo',
      payload: {
        model: 'gpt-3.5-turbo',
        max_tokens: 300,
        temperature: 0.9,
        messages: [
          {
            role: 'user',
            content: 'Generate a creative short story about a robot learning to paint, in exactly 100 words.'
          }
        ]
      },
      metadata: {
        example: 'gpt-hosted',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Hosted response received:');
    console.log('Relay ID:', response.relay_id);
    console.log('Status Code:', response.status_code);
    console.log('Latency:', response.latency_ms + 'ms');
    console.log('Fallback Used:', response.fallback_used);
    console.log('Story:', response.body.choices[0].message.content + '\n');

  } catch (error) {
    console.error('❌ Hosted mode failed:', error.message);
    console.log('Make sure RELAY_API_KEY is set, or sign up at https://relayplane.com\n');
  }

  // Example 3: Function Calling with GPT-4
  console.log('--- Example 3: Function Calling ---');
  console.log('Demonstrating function calling capabilities with GPT-4\n');

  try {
    const response = await relay({
      to: 'gpt-4',
      payload: {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'What\'s the weather like in San Francisco and Tokyo right now?'
          }
        ],
        functions: [
          {
            name: 'get_weather',
            description: 'Get the current weather in a given location',
            parameters: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'The city and country, e.g. San Francisco, CA'
                },
                unit: {
                  type: 'string',
                  enum: ['celsius', 'fahrenheit']
                }
              },
              required: ['location']
            }
          }
        ],
        function_call: 'auto'
      },
      metadata: {
        example: 'gpt-functions',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Function calling response:');
    console.log('Relay ID:', response.relay_id);
    
    if (response.body.choices[0].message.function_call) {
      console.log('Function called:', response.body.choices[0].message.function_call.name);
      console.log('Arguments:', response.body.choices[0].message.function_call.arguments);
    } else {
      console.log('Response:', response.body.choices[0].message.content);
    }
    console.log();

  } catch (error) {
    console.error('❌ Function calling failed:', error.message);
    console.log('This feature requires valid API credentials.\n');
  }

  // Example 4: Different Temperature Settings
  console.log('--- Example 4: Temperature Comparison ---');
  console.log('Showing how temperature affects creativity\n');

  const prompt = 'Write a one-sentence description of a magical forest.';

  for (const temp of [0.2, 0.7, 1.0]) {
    try {
      const response = await relay({
        to: 'gpt-3.5-turbo',
        payload: {
          model: 'gpt-3.5-turbo',
          max_tokens: 50,
          temperature: temp,
          messages: [{ role: 'user', content: prompt }]
        },
        metadata: { temperature: temp }
      });

      console.log(`Temperature ${temp}:`, response.body.choices[0].message.content.trim());

    } catch (error) {
      console.log(`Temperature ${temp}: Failed (${error.message})`);
    }
  }

  console.log('\n🎉 GPT example completed!');
  console.log('Try different models and parameters to see how RelayPlane handles routing.');
}

// Run the example
if (require.main === module) {
  runGPTExample().catch(console.error);
}

module.exports = { runGPTExample }; 