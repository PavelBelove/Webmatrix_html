import { LLMProviderFactory } from '../utils/api';
import { Storage } from '../utils/storage';

export class Analyst {
  constructor(table) {
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

    this.table = table;
    this.currentPrompt = '';
    this.isProcessing = false;
  }

  setPrompt(prompt) {
    this.currentPrompt = prompt;
  }

  async processRow(rowData, rowIndex) {
    if (!this.currentPrompt) {
      throw new Error('Prompt is not set');
    }

    if (!this.provider) {
      throw new Error('API key not set. Please configure API key in settings.');
    }

    try {
      this.table.markRowAsProcessing(rowIndex);

      // Подготавливаем промпт, заменяя плейсхолдеры
      let processedPrompt = this.currentPrompt;
      Object.entries(rowData).forEach(([key, value]) => {
        processedPrompt = processedPrompt.replace(`{{${key}}}`, value);
      });

      // Получаем ответ от LLM
      const response = await this.provider.generateResponse(processedPrompt);

      try {
        // Парсим JSON ответ
        const result = JSON.parse(response);

        // Обновляем ячейки таблицы
        Object.entries(result).forEach(([key, value], index) => {
          this.table.updateCell(rowIndex, index, value);
        });

        return result;
      } catch (error) {
        throw new Error('Failed to parse LLM response as JSON');
      }
    } catch (error) {
      this.table.markRowAsError(rowIndex, error.message);
      throw error;
    }
  }

  async processTable(data) {
    this.isProcessing = true;
    const results = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const result = await this.processRow(data[i], i);
        results.push(result);
      } catch (error) {
        console.error(`Error processing row ${i}:`, error);
        results.push({ error: error.message });
      }
    }

    this.isProcessing = false;
    return results;
  }

  stop() {
    this.isProcessing = false;
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
