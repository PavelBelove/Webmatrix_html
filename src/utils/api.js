class BaseLLMProvider {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.isCommercial = options.isCommercial || false;
    this.model = options.model || null;
  }

  async generateResponse(prompt) {
    throw new Error('generateResponse must be implemented');
  }

  async sendMessage(message) {
    throw new Error('sendMessage must be implemented');
  }

  async validateApiKey() {
    throw new Error('validateApiKey must be implemented');
  }
}

class GeminiProvider extends BaseLLMProvider {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.name = 'gemini';
    this.model = options.model || 'gemini-1.5-pro';
  }

  async validateApiKey() {
    try {
      // Пробуем сделать простой запрос для проверки ключа
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Test connection' }] }],
            generationConfig: {
              temperature: 0.1,
              topK: 1,
              topP: 1,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API validation failed');
      }

      return true;
    } catch (error) {
      throw new Error(`API key validation failed: ${error.message}`);
    }
  }

  async generateResponse(prompt) {
    // Реализация для анализа данных
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'API Error');
    }

    return data.candidates[0].content.parts[0].text;
  }

  async sendMessage(message) {
    // Реализация для чата
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'API Error');
    }

    return data.candidates[0].content.parts[0].text;
  }
}

class OpenAIProvider extends BaseLLMProvider {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.name = 'openai';
    this.model = options.model || 'gpt-4o';
  }

  async validateApiKey() {
    // TODO: Implement OpenAI key validation
    throw new Error('OpenAI support coming soon');
  }

  async generateResponse(prompt) {
    // TODO: Implement OpenAI API call
    throw new Error('OpenAI support coming soon');
  }

  async sendMessage(message) {
    // TODO: Implement OpenAI API call
    throw new Error('OpenAI support coming soon');
  }
}

class PerplexityProvider extends BaseLLMProvider {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.name = 'perplexity';
    this.model = options.model || 'pplx-70b';
  }

  async validateApiKey() {
    // TODO: Implement Perplexity key validation
    throw new Error('Perplexity support coming soon');
  }

  async generateResponse(prompt) {
    // TODO: Implement Perplexity API call
    throw new Error('Perplexity support coming soon');
  }

  async sendMessage(message) {
    // TODO: Implement Perplexity API call
    throw new Error('Perplexity support coming soon');
  }
}

export class LLMProviderFactory {
  static createProvider(name, apiKey, options = {}) {
    switch (name) {
      case 'gemini':
        return new GeminiProvider(apiKey, options);
      case 'openai':
        return new OpenAIProvider(apiKey, options);
      case 'perplexity':
        return new PerplexityProvider(apiKey, options);
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
  }
}
