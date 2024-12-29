import { OpenAIProvider } from './providers/OpenAIProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { PerplexityProvider } from './providers/PerplexityProvider';

export class LLMProviderFactory {
  static createProvider(type, apiKey, options = {}) {
    switch (type) {
      case 'openai':
        return new OpenAIProvider(apiKey, options);
      case 'gemini':
        return new GeminiProvider(apiKey, options);
      case 'perplexity':
        return new PerplexityProvider(apiKey, options);
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  static getAvailableProviders() {
    return [
      {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-4o', 'gpt-4o-mini'],
        description: 'GPT-4 Optimized models',
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        models: ['gemini-1.5-pro', 'gemini-2.0-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-8b'],
        description: 'Gemini models',
      },
      {
        id: 'perplexity',
        name: 'Perplexity',
        models: [
          'llama-3.1-sonar-small-128k-online',
          'llama-3.1-sonar-large-128k-online',
          'llama-3.1-sonar-huge-128k-online',
        ],
        description: 'Llama 3.1 Sonar models',
      },
    ];
  }
}
