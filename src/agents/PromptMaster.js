import { LLMProviderFactory } from '../utils/api';
import { Storage } from '../utils/storage';

export class PromptMaster {
  constructor() {
    this.settings = Storage.load('webmatrix_settings', {
      apiKey: '',
      provider: 'gemini',
      presets: [],
      currentPreset: null,
      outputColumns: [],
    });

    if (this.settings.apiKey) {
      this.provider = LLMProviderFactory.createProvider(
        this.settings.provider,
        this.settings.apiKey
      );
    }

    // Метапромпт для мастера промптов
    this.metaPrompt = `Ты - эксперт по созданию промптов для анализа данных. 
Твоя задача - создать промпт для анализа строк таблицы на основе запроса пользователя.

Формат ответа должен быть в JSON:
{
    "prompt": "промпт для анализа каждой строки, используй {{value}} для подстановки значения из строки",
    "columns": ["список", "выходных", "колонок"]
}

Промпт должен быть максимально четким и конкретным, чтобы получить структурированный ответ.
Используй системный подход и учитывай контекст задачи.`;
  }

  async generatePrompt(userRequest) {
    try {
      if (!this.provider) {
        throw new Error('API key not set. Please configure API key in settings.');
      }

      const fullPrompt = `${this.metaPrompt}\n\nЗапрос пользователя: ${userRequest}`;
      const response = await this.provider.generateResponse(fullPrompt);

      try {
        const result = JSON.parse(response);
        if (!result.prompt || !result.columns) {
          throw new Error('Invalid response format');
        }
        return result;
      } catch (error) {
        throw new Error('Failed to parse LLM response as JSON');
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      throw error;
    }
  }

  // Сохранение успешного пресета
  savePreset(name, userRequest, prompt, columns) {
    const presets = Storage.load('webmatrix_presets', []);
    presets.push({
      name,
      userRequest,
      prompt,
      columns,
      createdAt: new Date().toISOString(),
    });
    Storage.save('webmatrix_presets', presets);
  }

  // Загрузка пресета
  loadPreset(name) {
    const presets = Storage.load('webmatrix_presets', []);
    return presets.find(preset => preset.name === name);
  }

  // Обновление провайдера при изменении настроек
  updateProvider(settings) {
    this.settings = settings;
    if (settings.apiKey) {
      this.provider = LLMProviderFactory.createProvider(settings.provider, settings.apiKey);
    } else {
      this.provider = null;
    }
  }
}
