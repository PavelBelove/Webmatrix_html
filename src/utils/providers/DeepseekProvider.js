export class DeepseekProvider {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.name = 'deepseek';
    this.model = options.model || 'deepseek-chat';
    this.baseUrl = 'https://api.deepseek.com/v1';
  }

  async generateResponse(prompt) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
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
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Deepseek API error');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Deepseek API error:', error);
      throw new Error(`Deepseek API error: ${error.message}`);
    }
  }

  async sendMessage(message, context = '') {
    try {
      const messages = [];

      if (context) {
        messages.push({ role: 'system', content: context });
      } else {
        messages.push({
          role: 'system',
          content: 'You are a helpful AI assistant.',
        });
      }

      messages.push({ role: 'user', content: message });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 4000,
          top_p: 0.95,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Deepseek chat error');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Deepseek chat error:', error);
      throw new Error(`Deepseek chat error: ${error.message}`);
    }
  }

  async validateApiKey() {
    try {
      await this.generateResponse('test');
      return true;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  getModelInfo() {
    return {
      'deepseek-chat': {
        name: 'Deepseek Chat',
        maxTokens: 4000,
        description: 'Основная чат-модель',
      },
      'deepseek-coder': {
        name: 'Deepseek Coder',
        maxTokens: 4000,
        description: 'Специализированная модель для работы с кодом',
      },
    };
  }

  setModel(model) {
    const validModels = Object.keys(this.getModelInfo());
    if (!validModels.includes(model)) {
      throw new Error('Unsupported model');
    }
    this.model = model;
  }
} 