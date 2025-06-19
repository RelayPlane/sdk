# RelayPlane SDK

The official SDK for RelayPlane - the AI control plane for routing, optimizing, and orchestrating LLM requests with production-grade reliability.

## Features

🚀 **Multi-Model Routing** - Route requests to Claude, GPT, Gemini, and more  
⚡ **Intelligent Optimization** - Automatic cost and latency optimization  
🔄 **Fallback & Retry** - Built-in resilience for production workloads  
📊 **Usage Analytics** - Real-time monitoring and cost tracking  
🎯 **Simple Interface** - Clean, intuitive API design  

## Installation

```bash
npm install @relayplane/sdk
```

## Quick Start

```javascript
const RelayPlane = require('@relayplane/sdk');

// Configure with your API key
RelayPlane.configure({
  apiKey: 'your-api-key-here',
  baseUrl: 'https://api.relayplane.com' // Optional: defaults to hosted service
});

// Make a relay call
const response = await RelayPlane.relay({
  to: 'claude-3-sonnet',
  payload: {
    messages: [
      { role: 'user', content: 'Hello! How can you help me today?' }
    ],
    temperature: 0.7,
    max_tokens: 1000
  },
  metadata: {
    user_id: 'user123',
    session_id: 'session456'
  }
});

console.log(response.body.content);
```

## API Reference

### RelayPlane.configure(options)

Configure the SDK with your API key and options.

```javascript
RelayPlane.configure({
  apiKey: 'your-api-key',      // Required: Your RelayPlane API key
  baseUrl: 'https://...',      // Optional: Custom base URL
  timeout: 30000,              // Optional: Request timeout in ms
  debug: false                 // Optional: Enable debug logging
});
```

### RelayPlane.relay(request)

Send a request to an AI model through RelayPlane.

#### Request Format

```javascript
{
  to: string,                  // Model identifier (required)
  payload: {                   // Request payload (required)
    messages: Array<{          // Conversation messages
      role: 'user' | 'assistant' | 'system',
      content: string
    }>,
    temperature?: number,      // 0-2, controls randomness
    max_tokens?: number,       // Maximum tokens to generate
    stream?: boolean           // Enable streaming responses
  },
  metadata?: object,           // Optional tracking data
  optimize?: boolean,          // Enable cost/latency optimization
  cache?: boolean             // Enable response caching
}
```

#### Supported Models

| Provider | Model Identifiers |
|----------|------------------|
| **Anthropic** | `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku` |
| **OpenAI** | `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo` |
| **Google** | `gemini-pro`, `gemini-pro-vision` |

## Examples

### Basic Chat Completion

```javascript
const response = await RelayPlane.relay({
  to: 'gpt-4',
  payload: {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Explain quantum computing in simple terms.' }
    ],
    temperature: 0.7,
    max_tokens: 500
  }
});

console.log(response.body.choices[0].message.content);
```

### With Optimization

```javascript
const response = await RelayPlane.relay({
  to: 'claude-3-sonnet',
  payload: {
    messages: [{ role: 'user', content: 'Summarize this article...' }],
    max_tokens: 200
  },
  optimize: true,  // Enable cost and latency optimization
  cache: true      // Enable response caching
});
```

### Streaming Responses

```javascript
const response = await RelayPlane.relay({
  to: 'gpt-4-turbo',
  payload: {
    messages: [{ role: 'user', content: 'Write a short story about AI.' }],
    stream: true
  }
});

// Handle streaming response
if (response.body.stream) {
  response.body.on('data', (chunk) => {
    process.stdout.write(chunk.toString());
  });
}
```

### Error Handling

```javascript
try {
  const response = await RelayPlane.relay({
    to: 'claude-3-sonnet',
    payload: {
      messages: [{ role: 'user', content: 'Hello!' }]
    }
  });
  
  console.log(response.body);
} catch (error) {
  if (error.statusCode === 401) {
    console.error('Invalid API key');
  } else if (error.statusCode === 429) {
    console.error('Rate limit exceeded');
  } else {
    console.error('Request failed:', error.message);
  }
}
```

## Response Format

All relay calls return a response with the following structure:

```javascript
{
  relay_id: string,           // Unique request identifier
  status_code: number,        // HTTP status code
  latency_ms: number,         // Request latency in milliseconds
  headers: object,            // Response headers
  body: object,               // Model response body
  cached?: boolean            // Whether response was cached
}
```

## Configuration Options

### Environment Variables

You can also configure the SDK using environment variables:

```bash
RELAYPLANE_API_KEY=your-api-key
RELAYPLANE_BASE_URL=https://api.relayplane.com
RELAYPLANE_TIMEOUT=30000
RELAYPLANE_DEBUG=false
```

### Self-Hosted Setup

For self-hosted RelayPlane instances:

```javascript
RelayPlane.configure({
  apiKey: 'your-api-key',
  baseUrl: 'https://your-relayplane-instance.com'
});
```

## Getting Started

1. **Sign up** at [relayplane.com](https://relayplane.com) for a free account
2. **Get your API key** from the dashboard
3. **Install the SDK** with `npm install @relayplane/sdk`
4. **Start building** with the examples above

## Free Tier

- ✅ **10,000 API calls per month**
- ✅ **All model providers**
- ✅ **Basic optimization**
- ✅ **Usage analytics**

## Support

- 📖 **Documentation**: [docs.relayplane.com](https://docs.relayplane.com)
- 💬 **Discord**: [discord.gg/relayplane](https://discord.gg/relayplane)
- 🐛 **Issues**: [GitHub Issues](https://github.com/RelayPlane/sdk/issues)
- 📧 **Email**: support@relayplane.com

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the RelayPlane team** 