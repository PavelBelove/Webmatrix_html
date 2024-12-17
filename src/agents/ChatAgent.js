import { chatStorage } from '../utils/storage';

export class ChatAgent {
  constructor() {
    this.history = [];
    this.maxHistoryLength = 10;
    this.provider = null;
    this.defaultPrompt = `You are a helpful AI assistant with expertise in data analysis and machine learning. You help users work with WebMatrix - a tool for analyzing data using LLMs.

Your capabilities:
1. Explain how to use WebMatrix features
2. Help improve analysis prompts
3. Discuss data from the table
4. Suggest better ways to analyze data
5. Explain technical concepts

Always be concise but informative. If you're not sure about something, say so.
If user asks about table data or preset, check if they are included in the context first.`;
  }

  buildContext(includePreset = false, includeTable = false) {
    const context = [];

    // Добавляем пресет если нужно
    if (includePreset && window.app?.promptMaster?.getCurrentPreset()) {
      const preset = window.app.promptMaster.getCurrentPreset();
      if (preset) {
        console.log('Adding preset to context:', preset);
        context.push(`Current Analysis Preset:
Request: ${preset.request}
Prompt: ${preset.prompt}
Output Columns: ${preset.columns.join(', ')}`);
      }
    }

    // Добавляем данные таблицы если нужно
    if (includeTable && window.app?.table?.data) {
      const tableData = window.app.table.data;
      if (tableData && tableData.length > 0) {
        console.log('Adding table data to context:', tableData.slice(0, 3));
        context.push(`Table Data (first 3 rows):
${JSON.stringify(tableData.slice(0, 3), null, 2)}`);
      }
    }

    const result = context.join('\n\n');
    console.log('Built context:', result);
    return result;
  }

  savePrompt(name, prompt) {
    chatStorage.set(name, {
      prompt,
      history: this.history,
      timestamp: Date.now(),
    });
  }

  loadPrompt(name) {
    const data = chatStorage.get(name);
    if (data) {
      this.history = data.history || [];
      return data.prompt;
    }
    return this.defaultPrompt;
  }

  exportPrompts() {
    const prompts = chatStorage.getAll();
    return Object.entries(prompts).map(([name, data]) => ({
      name,
      prompt: data.prompt,
      history: data.history,
      timestamp: data.timestamp,
    }));
  }

  updateProvider(settings) {
    console.log('ChatAgent updating provider:', {
      provider: settings?.provider?.name,
      model: settings?.provider?.model,
    });

    if (!settings?.provider) {
      console.error('No provider in settings:', settings);
      return;
    }

    this.provider = settings.provider;
  }

  async sendMessage(message, prompt, options = {}) {
    console.log('ChatAgent sending message with provider:', {
      provider: this.provider?.name,
      model: this.provider?.model,
    });

    if (!this.provider) {
      console.error('Provider not initialized:', {
        provider: this.provider,
        message,
        prompt,
        options,
      });
      throw new Error('Provider not initialized. Please configure API settings first.');
    }

    const { includePreset, includeTable } = options;
    let context = this.buildContext(includePreset, includeTable);

    // Добавляем историю диалога
    const historyContext = this.history
      .map(item => `User: ${item.user}\nAssistant: ${item.assistant}`)
      .join('\n\n');

    // Формируем полный контекст
    const fullContext = [prompt, historyContext, context, `User: ${message}`]
      .filter(Boolean)
      .join('\n\n');

    try {
      console.log('Sending message to provider:', {
        provider: this.provider.name,
        model: this.provider.model,
        contextLength: fullContext.length,
      });

      const response = await this.provider.sendMessage(fullContext);

      // Сохраняем в историю
      this.history.push({
        user: message,
        assistant: response,
        timestamp: Date.now(),
      });

      // Ограничиваем длину истории
      if (this.history.length > this.maxHistoryLength) {
        this.history = this.history.slice(-this.maxHistoryLength);
      }

      return response;
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }

  // ... остальные методы ...
}
