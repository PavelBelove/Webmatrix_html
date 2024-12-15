export class LLMProvider {
  constructor(apiKey) {
    if (this.constructor === LLMProvider) {
      throw new Error('Abstract class "LLMProvider" cannot be instantiated directly.');
    }
    this.apiKey = apiKey;
  }

  async generateResponse(prompt) {
    throw new Error('Method "generateResponse" must be implemented.');
  }

  async validateApiKey() {
    throw new Error('Method "validateApiKey" must be implemented.');
  }
}

export class GeminiProvider extends LLMProvider {
  constructor(apiKey) {
    super(apiKey);
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest';
  }

  async generateResponse(prompt) {
    try {
      const response = await fetch(`${this.baseUrl}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async validateApiKey() {
    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Фабрика для создания провайдеров
export class LLMProviderFactory {
  static createProvider(type, apiKey) {
    switch (type.toLowerCase()) {
      case 'gemini':
        return new GeminiProvider(apiKey);
      // Здесь можно добавить другие провайдеры
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}
