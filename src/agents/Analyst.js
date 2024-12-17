import { settingsStorage } from '../utils/storage';
import { LLMProviderFactory } from '../utils/api';

export class Analyst {
  constructor(table) {
    this.table = table;
    this.provider = null;
    this.prompt = '';
    this.currentRow = 0;
    this.isProcessing = false;
  }

  updateProvider(settings) {
    if (!settings?.provider) {
      console.error('No provider in settings');
      return;
    }
    this.provider = settings.provider;
  }

  setPrompt(prompt) {
    this.prompt = prompt;
  }

  async processTable(data) {
    if (!this.provider) {
      throw new Error('Provider not initialized. Please configure API settings first.');
    }

    if (!this.prompt) {
      throw new Error('Prompt not set. Please generate or load a prompt first.');
    }

    this.isProcessing = true;
    this.currentRow = 0;

    try {
      for (const row of data) {
        if (!this.isProcessing) break;

        // Подготавливаем промпт для текущей строки
        const rowPrompt = this.preparePrompt(row);

        try {
          // Получаем ответ от модели
          const response = await this.provider.generateResponse(rowPrompt);

          // Парсим JSON ответ
          const result = JSON.parse(response);

          // Обновляем строку таблицы
          this.updateTableRow(row, result);
        } catch (error) {
          console.error('Error processing row:', error);
          this.markRowError(row);
        }

        this.currentRow++;
        await this.sleep(100); // Небольшая задержка между запросами
      }
    } finally {
      this.isProcessing = false;
    }
  }

  preparePrompt(row) {
    // Заменяем {{value}} на значение из строки
    return this.prompt.replace(/{{value}}/g, row.value || '');
  }

  updateTableRow(row, result) {
    Object.assign(row, result);
    this.table.renderBody(); // Обновляем отображение таблицы
  }

  markRowError(row) {
    row.error = true;
    this.table.renderBody();
  }

  stop() {
    this.isProcessing = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
