/**
 * Chained Agents Example
 * 
 * This example demonstrates how to create multi-step agent workflows using RelayPlane SDK.
 * It shows how different models can work together in a pipeline to accomplish complex tasks.
 */

const { relay, optimize, configure } = require('@relayplane/sdk');

async function runChainedAgentsExample() {
  console.log('🔗 RelayPlane SDK - Chained Agents Example\n');

  // Configure RelayPlane (use hosted mode if available)
  configure({
    apiKey: process.env.RELAY_API_KEY,
    debug: true
  });

  // Example 1: Research → Summarize → Translate Chain
  console.log('--- Example 1: Research → Summarize → Translate Chain ---');
  console.log('GPT-4 researches → Claude summarizes → GPT-3.5 translates\n');

  try {
    // Step 1: Research with GPT-4 (good for complex analysis)
    console.log('Step 1: Researching AI trends with GPT-4...');
    const researchResponse = await relay({
      to: 'gpt-4',
      payload: {
        model: 'gpt-4',
        max_tokens: 800,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'You are a technology research analyst. Provide detailed, factual information.'
          },
          {
            role: 'user',
            content: 'What are the top 3 emerging AI trends in 2024? Focus on practical applications and business impact.'
          }
        ]
      },
      metadata: {
        step: 'research',
        agent: 'gpt-4',
        chain_id: 'research-summarize-translate'
      }
    });

    const researchText = researchResponse.body.choices[0].message.content;
    console.log(`✅ Research completed in ${researchResponse.latency_ms}ms`);
    console.log('Research excerpt:', researchText.substring(0, 150) + '...\n');

    // Step 2: Summarize with Claude (good for concise summaries)
    console.log('Step 2: Summarizing research with Claude...');
    const summaryResponse = await relay({
      to: 'claude-3-sonnet',
      payload: {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Please summarize this AI research in 3 bullet points:\n\n${researchText}`
          }
        ]
      },
      metadata: {
        step: 'summarize',
        agent: 'claude-3-sonnet',
        chain_id: 'research-summarize-translate'
      }
    });

    const summaryText = summaryResponse.body.content[0].text;
    console.log(`✅ Summary completed in ${summaryResponse.latency_ms}ms`);
    console.log('Summary:', summaryText + '\n');

    // Step 3: Translate with GPT-3.5 (fast for simple tasks)
    console.log('Step 3: Translating summary to Spanish with GPT-3.5...');
    const translationResponse = await relay({
      to: 'gpt-3.5-turbo',
      payload: {
        model: 'gpt-3.5-turbo',
        max_tokens: 400,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the following text to Spanish, maintaining technical accuracy.'
          },
          {
            role: 'user',
            content: summaryText
          }
        ]
      },
      metadata: {
        step: 'translate',
        agent: 'gpt-3.5-turbo',
        chain_id: 'research-summarize-translate'
      }
    });

    const translationText = translationResponse.body.choices[0].message.content;
    console.log(`✅ Translation completed in ${translationResponse.latency_ms}ms`);
    console.log('Spanish translation:', translationText + '\n');

    const totalLatency = researchResponse.latency_ms + summaryResponse.latency_ms + translationResponse.latency_ms;
    console.log(`🎯 Chain completed! Total latency: ${totalLatency}ms\n`);

  } catch (error) {
    console.error('❌ Chain failed:', error.message);
  }

  console.log('🎉 Chained agents example completed!');
  console.log('This demonstrates the power of orchestrating multiple AI models for complex workflows.');
}

// Run the example
if (require.main === module) {
  runChainedAgentsExample().catch(console.error);
}

module.exports = { runChainedAgentsExample }; 