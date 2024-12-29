export class GeminiProvider {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.name = 'gemini';
    this.model = options.model || 'gemini-1.5-pro';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.useWebSearch = options.model?.includes('thinking') || options.model?.includes('flash');
    this.maxSearchIterations = 3;
  }

  async generateResponse(prompt) {
    try {
      const body = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        tools: this.useWebSearch ? [{ google_search: {} }] : undefined,
        generation_config: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      };

      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini API error');
      }

      const data = await response.json();
      console.log('Gemini response:', data);
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  async sendMessage(message, context = '') {
    try {
      const messages = [];

      if (context) {
        messages.push({
          parts: [{ text: context }],
        });
        messages.push({
          parts: [{ text: 'I understand the context. How can I help you?' }],
        });
      }

      messages.push({
        parts: [{ text: message }],
      });

      const body = {
        contents: messages,
        tools: this.useWebSearch ? [{ google_search: {} }] : undefined,
        generation_config: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      };

      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini chat error');
      }

      const data = await response.json();
      console.log('Gemini chat response:', data);
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini chat error:', error);
      throw new Error(`Gemini chat error: ${error.message}`);
    }
  }

  async validateApiKey() {
    try {
      const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);

      if (!response.ok) {
        throw new Error('Invalid API key');
      }

      const data = await response.json();
      const availableModels = data.models.map(model => model.name.split('/').pop());
      console.log('Available Gemini models:', availableModels);

      const ourModels = Object.keys(this.getModelInfo());
      const hasRequiredModels = ourModels.some(model => availableModels.includes(model));

      if (!hasRequiredModels) {
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
    this.model = model;
  }

  getModelInfo() {
    return {
      'gemini-1.5-pro': {
        name: 'Gemini 1.5 Pro',
        maxTokens: 128000,
        description: 'Стабильная версия Gemini 1.5',
      },
      'gemini-2.0-flash-exp': {
        name: 'Gemini 2.0 Flash',
        maxTokens: 128000,
        description: 'Функции нового поколения, превосходная скорость, веб-поиск',
      },
      'gemini-2.0-thinking-exp-1219': {
        name: 'Gemini 2.0 Thinking',
        maxTokens: 128000,
        description: 'Улучшенное рассуждение и анализ, веб-поиск',
      },
      'learnlm-1.5-pro-experimental': {
        name: 'LearnLM 1.5 Pro',
        maxTokens: 128000,
        description: 'Мультимодальная модель (аудио, изображения, видео)',
      },
      'gemini-exp-1206': {
        name: 'Gemini Experimental',
        maxTokens: 128000,
        description: 'Улучшения качества, празднование 1 года Gemini',
      },
    };
  }
}
