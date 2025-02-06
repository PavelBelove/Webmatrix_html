export class GeminiProvider {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.name = 'gemini';
    this.model = options.model || 'gemini-1.5-pro';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.useWebSearch = options.useWebSearch || options.model?.includes('thinking') || options.model?.includes('flash');
    
    // Rate limiting
    this.requestsInMinute = 0;
    this.lastRequestTime = Date.now();
    this.rateLimit = this.getRateLimit(this.model);
    console.log(`Initialized ${this.model} with rate limit: ${this.rateLimit} RPM, web search: ${this.useWebSearch}`);
  }

  getRateLimit(model) {
    if (model.includes('2.0')) {
      return 9; // Жесткое ограничение для Gemini 2.0
    }
    return 54; // 90% от лимита в 60 RPM для остальных моделей
  }

  async checkRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Сброс счетчика каждую минуту
    if (timeSinceLastRequest > 60000) {
      this.requestsInMinute = 0;
      this.lastRequestTime = now;
      return;
    }
    
    // Если превысили лимит - ждем
    if (this.requestsInMinute >= this.rateLimit) {
      const waitTime = 60000 - timeSinceLastRequest + 1000; // +1000ms для большей подстраховки
      console.log(`Rate limit reached (${this.requestsInMinute}/${this.rateLimit}). Waiting ${Math.round(waitTime/1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestsInMinute = 0;
      this.lastRequestTime = Date.now();
      return;
    }

    this.requestsInMinute++;
    console.log(`Request ${this.requestsInMinute}/${this.rateLimit} in current minute for ${this.model}`);
  }

  async generateResponse(prompt) {
    try {
      await this.checkRateLimit();

      const body = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.8,
          topK: 40,
        },
      };

      // Для моделей 2.0 добавляем веб-поиск если нужно
      if (this.useWebSearch && this.model.includes('2.0')) {
        body.tools = [{
          google_search: {}
        }];
      }

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

  async validateApiKey() {
    try {
      await this.generateResponse('test');
      return true;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  async sendMessage(message, context = '') {
    return this.generateResponse(message);
  }
}
