import { Spoiler } from './Spoiler';
import { Storage } from '../utils/storage';
import { LLMProviderFactory } from '../utils/api';

export class Chat {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'chat-container';

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

    this.chatPrompts = Storage.load('webmatrix_chat_prompts', []);
    this.currentContext = {
      showPreset: false,
      showTable: false,
      messages: [],
    };

    this.initializeUI();
  }

  initializeUI() {
    // Настройки чата
    const settingsPanel = new Spoiler('Chat Settings', this.createSettingsPanel());
    settingsPanel.render(this.element);

    // Область сообщений
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'chat-messages';
    this.element.appendChild(this.messagesContainer);

    // Поле ввода
    this.createInputPanel();
  }

  createSettingsPanel() {
    const container = document.createElement('div');

    // Управление промптами
    const promptsContainer = document.createElement('div');

    // Список промптов
    const promptSelect = document.createElement('select');
    this.chatPrompts.forEach(prompt => {
      const option = document.createElement('option');
      option.value = prompt.name;
      option.textContent = prompt.name;
      promptSelect.appendChild(option);
    });

    // Кнопки экспорта/импорта
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export Prompts';
    exportButton.onclick = () =>
      Storage.exportToFile('webmatrix_chat_prompts', 'chat_prompts.json');

    const importButton = document.createElement('button');
    importButton.textContent = 'Import Prompts';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    fileInput.accept = '.json';
    fileInput.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        Storage.importFromFile('webmatrix_chat_prompts', file)
          .then(() => this.refreshPrompts())
          .catch(error => alert('Error importing prompts: ' + error.message));
      }
    };
    importButton.onclick = () => fileInput.click();

    // Чекбоксы для контекста
    const showPresetCheckbox = document.createElement('input');
    showPresetCheckbox.type = 'checkbox';
    showPresetCheckbox.checked = this.currentContext.showPreset;
    showPresetCheckbox.onchange = e => {
      this.currentContext.showPreset = e.target.checked;
    };
    const presetLabel = document.createElement('label');
    presetLabel.appendChild(showPresetCheckbox);
    presetLabel.appendChild(document.createTextNode('Show Preset in Context'));

    const showTableCheckbox = document.createElement('input');
    showTableCheckbox.type = 'checkbox';
    showTableCheckbox.checked = this.currentContext.showTable;
    showTableCheckbox.onchange = e => {
      this.currentContext.showTable = e.target.checked;
    };
    const tableLabel = document.createElement('label');
    tableLabel.appendChild(showTableCheckbox);
    tableLabel.appendChild(document.createTextNode('Show Table in Context'));

    promptsContainer.appendChild(promptSelect);
    promptsContainer.appendChild(exportButton);
    promptsContainer.appendChild(importButton);
    promptsContainer.appendChild(fileInput);

    container.appendChild(promptsContainer);
    container.appendChild(presetLabel);
    container.appendChild(tableLabel);

    return container;
  }

  createInputPanel() {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'chat-input';

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Type your message...';

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'chat-buttons';

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.onclick = () => this.sendMessage(textarea.value);

    const uploadButton = document.createElement('button');
    uploadButton.textContent = 'Upload File';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    fileInput.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = e => {
          textarea.value += e.target.result;
        };
        reader.readAsText(file);
      }
    };
    uploadButton.onclick = () => fileInput.click();

    buttonContainer.appendChild(sendButton);
    buttonContainer.appendChild(uploadButton);
    buttonContainer.appendChild(fileInput);

    inputContainer.appendChild(textarea);
    inputContainer.appendChild(buttonContainer);

    this.element.appendChild(inputContainer);
  }

  async sendMessage(text) {
    if (!text.trim()) return;

    // Добавляем сообщение пользователя
    this.addMessage('user', text);

    try {
      if (!this.provider) {
        throw new Error('API key not set. Please configure API key in settings.');
      }

      // Получаем ответ от LLM
      const response = await this.provider.generateResponse(text);

      // Добавляем ответ в чат
      this.addMessage('assistant', response);
    } catch (error) {
      console.error('Error sending message:', error);
      this.addMessage('error', 'Error: ' + error.message);
    }
  }

  addMessage(type, content) {
    const message = document.createElement('div');
    message.className = `chat-message ${type}-message`;

    const text = document.createElement('div');
    text.className = 'message-content';

    if (type === 'assistant') {
      text.innerHTML = marked.parse(content);
    } else {
      text.textContent = content;
    }

    message.appendChild(text);
    this.messagesContainer.appendChild(message);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    // Сохраняем сообщение в историю
    this.currentContext.messages.push({ type, content });
  }

  refreshPrompts() {
    this.chatPrompts = Storage.load('webmatrix_chat_prompts', []);
    this.element.innerHTML = '';
    this.initializeUI();
  }

  render(parent) {
    parent.appendChild(this.element);
    return this;
  }

  updateProvider(settings) {
    this.settings = settings;
    if (settings.apiKey) {
      this.provider = LLMProviderFactory.createProvider(settings.provider, settings.apiKey);
    } else {
      this.provider = null;
    }
  }
}
