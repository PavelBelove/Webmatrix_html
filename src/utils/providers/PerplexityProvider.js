export class PerplexityProvider {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.name = 'perplexity';
    this.model = options.model || 'pplx-70b-online';
    this.baseUrl = 'https://api.perplexity.ai';
  }

  async validateApiKey() {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant.',
            },
            {
              role: 'user',
              content: 'test',
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: response.statusText } }));
        throw new Error(error.error?.message || 'Invalid API key');
      }

      return true;
    } catch (error) {
      console.error('Perplexity validateApiKey error:', error);
      return false;
    }
  }

  async generateResponse(prompt) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: response.statusText } }));
        throw new Error(error.error?.message || 'Failed to generate response');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Perplexity generateResponse error:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
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
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
        }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: response.statusText } }));
        throw new Error(error.error?.message || 'Failed to send message');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Perplexity sendMessage error:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  getModelInfo() {
    return {
      'pplx-7b-online': {
        name: 'Perplexity 7B',
        maxTokens: 4096,
        description: '7B parameters, fast responses',
      },
      'pplx-70b-online': {
        name: 'Perplexity 70B',
        maxTokens: 4096,
        description: '70B parameters, high quality responses',
      },
      'pplx-70b-chat': {
        name: 'Perplexity 70B Chat',
        maxTokens: 4096,
        description: '70B parameters, optimized for chat',
      },
      'mixtral-8x7b-online': {
        name: 'Mixtral 8x7B',
        maxTokens: 4096,
        description: 'Mixtral model, balanced performance',
      },
    };
  }

  setModel(model) {
    const validModels = Object.keys(this.getModelInfo());
    if (!validModels.includes(model)) {
      throw new Error(`Unsupported model: ${model}`);
    }
    this.model = model;
  }
}
