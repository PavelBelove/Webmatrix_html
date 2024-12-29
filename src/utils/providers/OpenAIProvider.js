export class OpenAIProvider {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.name = 'openai';
    this.model = options.model || 'gpt-4o';
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async generateResponse(prompt) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a helpful AI assistant.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  async sendMessage(message, context = '') {
    try {
      const messages = [];

      // Добавляем системный промпт
      messages.push({
        role: 'system',
        content: 'You are a helpful AI assistant.',
      });

      // Добавляем контекст, если он есть
      if (context) {
        messages.push({ role: 'user', content: context });
        messages.push({
          role: 'assistant',
          content: 'I understand the context. How can I help you?',
        });
      }

      // Добавляем текущее сообщение
      messages.push({ role: 'user', content: message });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.9,
          max_tokens: 4000,
          top_p: 0.95,
          frequency_penalty: 0.1,
          presence_penalty: 0.1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI chat error');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error(`OpenAI chat error: ${error.message}`);
    }
  }

  async validateApiKey() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Invalid API key');
      }

      const data = await response.json();
      const availableModels = data.data.map(model => model.id);
      const ourModels = Object.keys(this.getModelInfo());
      const hasRequiredModels = ourModels.some(
        model =>
          availableModels.includes(model) || availableModels.includes(this.mapModelToApi(model))
      );

      if (!hasRequiredModels) {
        console.log('Available models:', availableModels);
        console.log('Our models:', ourModels);
        throw new Error('Required models not available');
      }

      return true;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  setModel(model) {
    const validModels = Object.keys(this.getModelInfo());
    if (!validModels.includes(model)) {
      throw new Error('Unsupported model');
    }
    this.model = this.mapModelToApi(model);
  }

  // Маппинг наших идентификаторов моделей в реальные идентификаторы API
  mapModelToApi(model) {
    const mapping = {
      'gpt-4o': 'gpt-4-0125-preview',
      'gpt-4o-mini': 'gpt-4-0125-preview',
    };
    return mapping[model] || model;
  }

  getModelInfo() {
    return {
      'gpt-4o': {
        name: 'GPT-4 Optimized',
        maxTokens: 128000,
        description: 'Latest GPT-4 Turbo with 128k context',
        apiModel: 'gpt-4-0125-preview',
      },
      'gpt-4o-mini': {
        name: 'GPT-4 Optimized Mini',
        maxTokens: 128000,
        description: 'Smaller, faster version of GPT-4 Optimized',
        apiModel: 'gpt-4-0125-preview',
      },
    };
  }
}
