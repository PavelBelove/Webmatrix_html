import { Spoiler } from './Spoiler';
import { Storage } from '../utils/storage';
import { LLMProviderFactory } from '../utils/api';

export class Chat {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'chat-section';
    this.chatAgent = null;
    this.storage = new Storage('chat-prompts');
    this.includePreset = false;
    this.includeTable = false;
    this.createStructure();
    this.fileInput = null;
  }

  initialize(chatAgent) {
    this.chatAgent = chatAgent;

    try {
      const lastPrompt = this.storage.get('lastPrompt');
      this.promptArea.value = lastPrompt || this.chatAgent.defaultPrompt;
    } catch (error) {
      console.error('Error loading prompt:', error);
      this.promptArea.value = this.chatAgent.defaultPrompt;
    }
  }

  createStructure() {
    // Создаем спойлер для чата
    const chatSpoiler = document.createElement('details');
    chatSpoiler.className = 'spoiler chat-spoiler';

    const summary = document.createElement('summary');
    summary.textContent = '💬 AI Assistant';
    chatSpoiler.appendChild(summary);

    // Создаем контейнер для настроек
    const settingsSpoiler = document.createElement('details');
    settingsSpoiler.className = 'spoiler settings-spoiler';

    const settingsSummary = document.createElement('summary');
    settingsSummary.textContent = '⚙️ Chat Settings';
    settingsSpoiler.appendChild(settingsSummary);

    // Создаем секцию управления промптами
    const promptSection = document.createElement('div');
    promptSection.className = 'prompt-section';

    // Кнопки управления промптами
    const promptControls = document.createElement('div');
    promptControls.className = 'prompt-controls';

    const saveButton = document.createElement('button');
    saveButton.className = 'secondary';
    saveButton.textContent = 'Save Prompt';
    saveButton.setAttribute('data-icon', '💾');
    saveButton.onclick = () => this.savePrompt();

    const loadButton = document.createElement('button');
    loadButton.className = 'secondary';
    loadButton.textContent = 'Load Prompt';
    loadButton.setAttribute('data-icon', '📂');
    loadButton.onclick = () => this.loadPrompt();

    const exportButton = document.createElement('button');
    exportButton.className = 'secondary';
    exportButton.textContent = 'Export';
    exportButton.setAttribute('data-icon', '📤');
    exportButton.onclick = () => this.exportPrompts();

    const importButton = document.createElement('button');
    importButton.className = 'secondary';
    importButton.textContent = 'Import';
    importButton.setAttribute('data-icon', '📥');
    importButton.onclick = () => this.importPrompts();

    promptControls.append(saveButton, loadButton, exportButton, importButton);

    // Чекбоксы для контекста
    const contextControls = document.createElement('div');
    contextControls.className = 'context-controls';
    contextControls.innerHTML = `
      <div class="checkbox-wrapper">
        <input type="checkbox" id="includePreset" 
          ${this.includePreset ? 'checked' : ''}
        />
        <label for="includePreset">Include Analysis Preset</label>
      </div>
      <div class="checkbox-wrapper">
        <input type="checkbox" id="includeTable" 
          ${this.includeTable ? 'checked' : ''}
        />
        <label for="includeTable">Include Table Data</label>
      </div>
    `;

    // Добавляем обработчики для чекбоксов
    const presetCheckbox = contextControls.querySelector('#includePreset');
    const tableCheckbox = contextControls.querySelector('#includeTable');

    presetCheckbox.addEventListener('change', e => this.togglePreset(e.target.checked));
    tableCheckbox.addEventListener('change', e => this.toggleTable(e.target.checked));

    // Поле промпта
    this.promptArea = document.createElement('textarea');
    this.promptArea.className = 'prompt-area';
    this.promptArea.placeholder = 'Enter your chat prompt here...';
    this.promptArea.value = this.chatAgent?.defaultPrompt || '';

    promptSection.append(promptControls, contextControls, this.promptArea);
    settingsSpoiler.appendChild(promptSection);

    // Создаем чат
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-container';

    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'messages-container';

    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';

    this.messageInput = document.createElement('textarea');
    this.messageInput.className = 'message-input';
    this.messageInput.placeholder = 'Type your message...';
    this.messageInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-container';

    const sendButton = document.createElement('button');
    sendButton.className = 'primary';
    sendButton.textContent = 'Send';
    sendButton.setAttribute('data-icon', '📤');
    sendButton.onclick = () => this.sendMessage();

    const uploadButton = document.createElement('button');
    uploadButton.className = 'secondary';
    uploadButton.textContent = 'Upload File';
    uploadButton.setAttribute('data-icon', '📎');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    fileInput.multiple = true;
    fileInput.accept = '.txt,.md,.json,.csv';

    uploadButton.onclick = () => fileInput.click();

    // Добавляем кнопки в контейнер
    buttonsContainer.append(sendButton, uploadButton);

    // Собираем всё вместе
    inputContainer.append(this.messageInput, buttonsContainer, fileInput);

    chatContainer.append(this.messagesContainer, inputContainer);

    chatSpoiler.append(settingsSpoiler, chatContainer);
    this.element.appendChild(chatSpoiler);

    // Добавляем обработчик для загрузки файлов
    fileInput.addEventListener('change', e => this.handleFiles(e.target.files));
    this.fileInput = fileInput;
  }

  async sendMessage() {
    const messageInput = this.element.querySelector('.message-input');
    const message = messageInput.value.trim();

    if (!message) return;

    try {
      this.addMessage(message, 'user');
      messageInput.value = '';
      messageInput.style.height = 'auto';

      const promptArea = document.getElementById('chatPrompt');
      const prompt = promptArea?.value || this.chatAgent.defaultPrompt;

      console.log('Sending message with context:', {
        includePreset: this.includePreset,
        includeTable: this.includeTable,
      });

      const response = await this.chatAgent.sendMessage(message, prompt, {
        includePreset: this.includePreset,
        includeTable: this.includeTable,
      });

      this.addMessage(response, 'assistant');
    } catch (error) {
      console.error('Error sending message:', error);
      this.addMessage(`Error: ${error.message}`, 'error');
    }
  }

  addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    const icon = document.createElement('span');
    icon.className = 'message-icon';
    icon.textContent = type === 'user' ? '👤' : type === 'assistant' ? '🤖' : '⚠️';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;

    messageDiv.append(icon, content);
    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  async savePrompt() {
    if (!this.chatAgent) {
      this.addMessage('Error: Chat agent not initialized', 'error');
      return;
    }

    const name = prompt('Enter name for this prompt:');
    if (!name) return;

    try {
      const promptText = this.promptArea.value.trim();
      await this.chatAgent.savePrompt(name, promptText);
      this.storage.set('lastPrompt', promptText);
      alert('Prompt saved successfully!');
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Error saving prompt: ' + error.message);
    }
  }

  async loadPrompt() {
    if (!this.chatAgent) {
      this.addMessage('Error: Chat agent not initialized', 'error');
      return;
    }

    const prompts = this.chatAgent.exportPrompts();
    if (prompts.length === 0) {
      alert('No saved prompts found');
      return;
    }

    const promptList = prompts.map(p => p.name).join('\n');
    const name = prompt(`Enter prompt name to load:\n\nAvailable prompts:\n${promptList}`);
    if (!name) return;

    const prompt = this.chatAgent.loadPrompt(name);
    if (prompt) {
      this.promptArea.value = prompt;
      this.storage.set('lastPrompt', prompt);
      this.messagesContainer.innerHTML = '';
      this.chatAgent.history.forEach(item => {
        this.addMessage(item.user, 'user');
        this.addMessage(item.assistant, 'assistant');
      });
    } else {
      alert('Prompt not found');
    }
  }

  exportPrompts() {
    if (!this.chatAgent) {
      alert('Error: Chat agent not initialized');
      return;
    }

    const prompts = this.chatAgent.exportPrompts();
    const markdown = prompts
      .map(
        p => `
# ${p.name}
${p.prompt}

## History
${p.history
  .map(
    h => `
**User**: ${h.user}
**Assistant**: ${h.assistant}
`
  )
  .join('\n')}
`
      )
      .join('\n---\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat_prompts.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  async importPrompts() {
    if (!this.chatAgent) {
      alert('Error: Chat agent not initialized');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md';

    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const sections = text
          .split('---')
          .map(s => s.trim())
          .filter(Boolean);

        const prompts = sections.map(section => {
          const [_, name, promptText, historyText] = section.match(
            /# (.*?)\n(.*?)\n## History\n(.*)/s
          );
          const history =
            historyText
              .match(/\*\*User\*\*: (.*?)\n\*\*Assistant\*\*: (.*?)(?=\n\*\*User\*\*:|$)/gs)
              ?.map(h => {
                const [user, assistant] = h
                  .match(/\*\*User\*\*: (.*?)\n\*\*Assistant\*\*: (.*)/s)
                  .slice(1);
                return { user, assistant, timestamp: Date.now() };
              }) || [];

          return {
            name,
            prompt: promptText.trim(),
            history,
          };
        });

        this.chatAgent.importPrompts(prompts);
        alert('Prompts imported successfully!');
      } catch (error) {
        console.error('Error importing prompts:', error);
        alert('Error importing prompts: ' + error.message);
      }
    };

    input.click();
  }

  updateProvider(settings) {
    console.log('Chat updating provider:', {
      provider: settings?.provider?.name,
      model: settings?.provider?.model,
    });

    if (this.chatAgent) {
      this.chatAgent.updateProvider(settings);
    } else {
      console.error('Chat agent not initialized');
    }
  }

  render(parent) {
    parent.appendChild(this.element);
    return this;
  }

  async handleFiles(files) {
    for (const file of files) {
      try {
        const content = await this.readFile(file);
        const message = `File content from "${file.name}":\n\n${content}`;

        // Добавляем содержимое файла в поле ввода
        if (this.messageInput.value) {
          this.messageInput.value += '\n\n';
        }
        this.messageInput.value += message;

        // Автоматически расширяем поле ввода
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = `${this.messageInput.scrollHeight}px`;
      } catch (error) {
        console.error('Error reading file:', error);
        this.addMessage(`Error reading file "${file.name}": ${error.message}`, 'error');
      }
    }
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(new Error('Error reading file'));

      if (file.type === 'application/json') {
        reader.readAsText(file);
      } else if (
        file.type === 'text/csv' ||
        file.type === 'text/plain' ||
        file.type === 'text/markdown'
      ) {
        reader.readAsText(file);
      } else {
        reject(new Error('Unsupported file type'));
      }
    });
  }

  togglePreset(checked) {
    console.log('Toggle preset:', checked);
    this.includePreset = checked;
  }

  toggleTable(checked) {
    console.log('Toggle table:', checked);
    this.includeTable = checked;
  }
}
