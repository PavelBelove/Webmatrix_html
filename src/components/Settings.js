import { settingsStorage } from '../utils/storage';
import { LLMProviderFactory } from '../utils/api';
import { Spoiler } from './Spoiler';

export class Settings {
  constructor(onChange) {
    this.onChange = onChange;
    this.element = document.createElement('div');
    this.element.className = 'settings-panel';

    // Загружаем сохраненные настройки
    this.settings = settingsStorage.get('current') || {
      activeProvider: 'gemini',
      gemini: {
        apiKey: '',
        isCommercial: false,
      },
      openai: {
        apiKey: '',
      },
      perplexity: {
        apiKey: '',
      },
      models: {
        gemini: ['gemini-1.5-pro'],
        openai: ['gpt-4o', 'gpt-4o-mini'],
        perplexity: ['pplx-7b', 'pplx-70b'],
      },
      selectedAssistantModel: 'gemini-1.5-pro',
      selectedAnalysisModel: 'gemini-1.5-pro',
    };

    // Инициализируем провайдера если есть ключ
    this.initializeProviders();
    this.init();
  }

  initializeProviders() {
    const { activeProvider } = this.settings;
    const providerSettings = this.settings[activeProvider];

    console.log('Initializing providers:', {
      activeProvider,
      hasKey: !!providerSettings?.apiKey,
      assistantModel: this.settings.selectedAssistantModel,
      analysisModel: this.settings.selectedAnalysisModel,
    });

    if (providerSettings?.apiKey) {
      try {
        // Создаем провайдера для ассистентов
        const assistantProvider = LLMProviderFactory.createProvider(
          this.getProviderFromModel(this.settings.selectedAssistantModel),
          providerSettings.apiKey,
          {
            isCommercial: providerSettings.isCommercial,
            model: this.settings.selectedAssistantModel,
          }
        );

        // Создаем провайдера для анализа
        const analysisProvider = LLMProviderFactory.createProvider(
          this.getProviderFromModel(this.settings.selectedAnalysisModel),
          providerSettings.apiKey,
          {
            isCommercial: providerSettings.isCommercial,
            model: this.settings.selectedAnalysisModel,
          }
        );

        // Проверяем работоспособность провайдеров
        Promise.all([assistantProvider.validateApiKey(), analysisProvider.validateApiKey()])
          .then(() => {
            console.log('Providers validated successfully');
            this.settings.assistantProvider = assistantProvider;
            this.settings.analysisProvider = analysisProvider;
            // Уведомляем об изменениях только после успешной валидации
            if (this.onChange) {
              this.onChange(this.settings);
            }
          })
          .catch(error => {
            console.error('Failed to validate providers:', error);
            providerSettings.apiKey = '';
            this.settings.assistantProvider = null;
            this.settings.analysisProvider = null;
            this.saveSettings(this.settings);
            alert('Invalid API key. Please check your settings.');
          });
      } catch (error) {
        console.error('Failed to initialize providers:', error);
        providerSettings.apiKey = '';
        this.settings.assistantProvider = null;
        this.settings.analysisProvider = null;
        this.saveSettings(this.settings);
      }
    } else {
      console.log('No API key found for provider:', activeProvider);
      this.settings.assistantProvider = null;
      this.settings.analysisProvider = null;
      if (this.onChange) {
        this.onChange(this.settings);
      }
    }
  }

  init() {
    // Создаем основной спойлер настроек (открыт по умолчанию)
    const settingsSpoiler = new Spoiler('⚙️ Settings', '', true);

    // API Key секция
    const apiKeyContent = this.createApiKeySection();
    const apiKeySpoiler = new Spoiler('🔑 Models Settings', apiKeyContent);

    // Presets секция
    const presetsContent = this.createPresetsSection();

    // Prompt и Output Columns
    const promptContent = this.createPromptSection();

    // Добавляем основной спойлер в DOM
    this.element.appendChild(settingsSpoiler.element);

    // Теперь добавляем контент в основной спойлер
    settingsSpoiler.setContent(`
      <div id="apiKeySection"></div>
      <div class="presets-section">${presetsContent}</div>
      ${promptContent}
    `);

    // После того как контент добавлен, рендерим API Key спойлер
    setTimeout(() => {
      const apiKeySection = document.getElementById('apiKeySection');
      if (apiKeySection) {
        apiKeySpoiler.render(apiKeySection);

        // Инициализируем обработчики событий ПОСЛЕ добавления всех элементов в DOM
        this.initEventHandlers();
      }
    }, 0);

    // Обновляем визуальное состояние
    this.updateProviderStatus();
  }

  createApiKeySection() {
    const { gemini, openai, perplexity } = this.settings;

    return `
      <div class="api-settings">
        <div class="api-keys-row">
          <!-- Gemini Settings -->
          <div class="provider-settings ${
            this.settings.activeProvider === 'gemini' ? 'active' : ''
          }" data-provider="gemini">
            <h3>Gemini</h3>
            <div class="input-group">
              <div class="key-input-wrapper">
                <input type="text" 
                       id="geminiKey" 
                       placeholder="${gemini.apiKey ? 'API key is set' : 'Enter Gemini API key'}"
                       value=""
                       data-has-key="${!!gemini.apiKey}"
                />
                <div class="checkbox-wrapper">
                  <input type="checkbox" 
                         id="geminiCommercial" 
                         ${gemini.isCommercial ? 'checked' : ''}
                  />
                  <label for="geminiCommercial">Commercial Key</label>
                </div>
              </div>
            </div>
          </div>

          <!-- OpenAI Settings -->
          <div class="provider-settings ${
            this.settings.activeProvider === 'openai' ? 'active' : ''
          }" data-provider="openai">
            <h3>OpenAI</h3>
            <input type="text" 
                   id="openaiKey" 
                   placeholder="${openai.apiKey ? 'API key is set' : 'Enter OpenAI API key'}"
                   value=""
                   data-has-key="${!!openai.apiKey}"
            />
          </div>

          <!-- Perplexity Settings -->
          <div class="provider-settings ${
            this.settings.activeProvider === 'perplexity' ? 'active' : ''
          }" data-provider="perplexity">
            <h3>Perplexity</h3>
            <input type="text" 
                   id="perplexityKey" 
                   placeholder="${
                     perplexity.apiKey ? 'API key is set' : 'Enter Perplexity API key'
                   }"
                   value=""
                   data-has-key="${!!perplexity.apiKey}"
            />
          </div>
        </div>

        <div class="settings-controls-row">
          <!-- Model Selection -->
          <div class="model-selections">
            <div class="model-selection">
              <h3>Assistant Model</h3>
              <select id="assistantModelSelect">
                ${this.getAvailableModels()
                  .map(
                    model => `
                  <option value="${model}" ${
                      model === this.settings.selectedAssistantModel ? 'selected' : ''
                    }>
                    ${this.getModelDisplayName(model)}
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>

            <div class="model-selection">
              <h3>Analysis Model</h3>
              <select id="analysisModelSelect">
                ${this.getAvailableModels()
                  .map(
                    model => `
                  <option value="${model}" ${
                      model === this.settings.selectedAnalysisModel ? 'selected' : ''
                    }>
                    ${this.getModelDisplayName(model)}
                  </option>
                `
                  )
                  .join('')}
              </select>
            </div>
          </div>

          <button id="saveApiSettings" class="primary">Save Settings</button>
        </div>
      </div>
    `;
  }

  getAvailableModels() {
    const models = [];
    const { gemini, openai, perplexity } = this.settings;

    if (gemini.apiKey) {
      models.push(...this.settings.models.gemini);
    }
    if (openai.apiKey) {
      models.push(...this.settings.models.openai);
    }
    if (perplexity.apiKey) {
      models.push(...this.settings.models.perplexity);
    }

    return models;
  }

  getModelDisplayName(modelId) {
    const displayNames = {
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gpt-4o': 'GPT-4 Optimized',
      'gpt-4o-mini': 'GPT-4 Optimized Mini',
      'pplx-7b': 'Perplexity 7B',
      'pplx-70b': 'Perplexity 70B',
    };
    return displayNames[modelId] || modelId;
  }

  initEventHandlers() {
    const saveBtn = document.getElementById('saveApiSettings');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', () => {
      try {
        // Получаем значения
        const geminiInput = document.getElementById('geminiKey');
        const openaiInput = document.getElementById('openaiKey');
        const perplexityInput = document.getElementById('perplexityKey');

        // Если в поле что-то введено - используем это значение
        // Если поле пустое, но есть сохраненный ключ - используем его
        const geminiKey =
          geminiInput.value.trim() ||
          (geminiInput.dataset.hasKey === 'true' ? this.settings.gemini.apiKey : '');
        const openaiKey =
          openaiInput.value.trim() ||
          (openaiInput.dataset.hasKey === 'true' ? this.settings.openai.apiKey : '');
        const perplexityKey =
          perplexityInput.value.trim() ||
          (perplexityInput.dataset.hasKey === 'true' ? this.settings.perplexity.apiKey : '');

        const isCommercial = document.getElementById('geminiCommercial')?.checked;
        const selectedAssistantModel = document.getElementById('assistantModelSelect')?.value;
        const selectedAnalysisModel = document.getElementById('analysisModelSelect')?.value;

        // Определяем активного провайдера по выбранной модели
        const activeProvider = this.getProviderFromModel(selectedAssistantModel);

        const newSettings = {
          ...this.settings,
          activeProvider,
          gemini: {
            apiKey: geminiKey,
            isCommercial,
          },
          openai: {
            apiKey: openaiKey,
          },
          perplexity: {
            apiKey: perplexityKey,
          },
          selectedAssistantModel,
          selectedAnalysisModel,
        };

        // Создаем провайдера для активной модели
        if (newSettings[activeProvider]?.apiKey) {
          const provider = LLMProviderFactory.createProvider(
            activeProvider,
            newSettings[activeProvider].apiKey,
            {
              isCommercial: newSettings.gemini.isCommercial,
              model: selectedAssistantModel,
            }
          );
          newSettings.provider = provider;
        }

        // Сохраняем настройки
        this.saveSettings(newSettings);

        // Очищаем поля ввода
        geminiInput.value = '';
        openaiInput.value = '';
        perplexityInput.value = '';

        // Обновляем data-has-key
        geminiInput.dataset.hasKey = !!newSettings.gemini.apiKey;
        openaiInput.dataset.hasKey = !!newSettings.openai.apiKey;
        perplexityInput.dataset.hasKey = !!newSettings.perplexity.apiKey;

        // Обновляем плейсхолдеры
        geminiInput.placeholder = newSettings.gemini.apiKey
          ? 'API key is set'
          : 'Enter Gemini API key';
        openaiInput.placeholder = newSettings.openai.apiKey
          ? 'API key is set'
          : 'Enter OpenAI API key';
        perplexityInput.placeholder = newSettings.perplexity.apiKey
          ? 'API key is set'
          : 'Enter Perplexity API key';

        // Показываем уведомление об успехе
        const apiSettings = document.querySelector('.api-settings');
        apiSettings.classList.add('save-success');
        setTimeout(() => apiSettings.classList.remove('save-success'), 500);
      } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings: ' + error.message);
      }
    });

    // Обработчики изменения ключей
    ['geminiKey', 'openaiKey', 'perplexityKey'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', () => this.updateAvailableModels());
      }
    });
  }

  getProviderFromModel(modelId) {
    if (modelId.startsWith('gemini')) return 'gemini';
    if (modelId.startsWith('gpt')) return 'openai';
    if (modelId.startsWith('pplx')) return 'perplexity';
    return 'gemini'; // default
  }

  createPresetsSection() {
    return `
      <div class="presets-controls">
        <button id="loadPreset" class="secondary">📂 Load</button>
        <button id="savePreset" class="secondary">💾 Save</button>
        <button id="exportPresets" class="secondary">📤 Export</button>
        <input type="file" id="importPresets" accept=".json" style="display: none;">
        <button id="importPresetsBtn" class="secondary">📥 Import</button>
      </div>
    `;
  }

  createPromptSection() {
    return `
      <div class="prompt-section">
        <textarea id="promptTemplate" placeholder="Enter prompt template...">${
          this.settings.promptTemplate || ''
        }</textarea>
        <textarea id="outputColumns" placeholder="Enter output columns (one per line)">${
          this.settings.outputColumns?.join('\n') || ''
        }</textarea>
      </div>
    `;
  }

  saveSettings(settings) {
    console.log('Saving settings:', {
      ...settings,
      assistantProvider: settings.assistantProvider?.name,
      analysisProvider: settings.analysisProvider?.name,
      gemini: { ...settings.gemini, apiKey: '***' },
      openai: { ...settings.openai, apiKey: '***' },
      perplexity: { ...settings.perplexity, apiKey: '***' },
    });

    this.settings = settings;

    // Сохраняем в storage только сериализуемые данные
    const storageData = {
      activeProvider: settings.activeProvider,
      gemini: settings.gemini,
      openai: settings.openai,
      perplexity: settings.perplexity,
      models: settings.models,
      selectedAssistantModel: settings.selectedAssistantModel,
      selectedAnalysisModel: settings.selectedAnalysisModel,
    };

    settingsStorage.set('current', storageData);

    // Обновляем визуальное состояние
    this.updateProviderStatus();
    this.updateAvailableModels();

    // Создаем провайдеров для разных задач
    this.initializeProviders();
  }

  render(parent) {
    parent.appendChild(this.element);
    return this;
  }

  updateProvider(settings) {
    if (!settings?.provider) {
      console.error('No provider in settings');
      return;
    }
    this.settings = settings;
  }

  updateAvailableModels() {
    const assistantSelect = document.getElementById('assistantModelSelect');
    const analysisSelect = document.getElementById('analysisModelSelect');
    if (!assistantSelect || !analysisSelect) return;

    const geminiKey = document.getElementById('geminiKey')?.value;
    const openaiKey = document.getElementById('openaiKey')?.value;
    const perplexityKey = document.getElementById('perplexityKey')?.value;

    // Собираем доступные модели
    const availableModels = [];
    if (geminiKey) availableModels.push(...this.settings.models.gemini);
    if (openaiKey) availableModels.push(...this.settings.models.openai);
    if (perplexityKey) availableModels.push(...this.settings.models.perplexity);

    // Обновляем селекты
    [assistantSelect, analysisSelect].forEach(select => {
      const currentValue = select.value;
      select.innerHTML =
        availableModels.length > 0
          ? availableModels
              .map(
                model => `
              <option value="${model}" ${model === currentValue ? 'selected' : ''}>
                ${this.getModelDisplayName(model)}
              </option>
            `
              )
              .join('')
          : '<option value="" disabled selected>No API keys configured</option>';
    });
  }

  updateProviderStatus() {
    const { activeProvider } = this.settings;

    document.querySelectorAll('.provider-settings').forEach(el => {
      el.classList.remove('active', 'inactive');
      const providerId = el.getAttribute('data-provider');
      if (providerId === activeProvider) {
        el.classList.add('active');
      } else {
        el.classList.add('inactive');
      }
    });
  }

  // Обновление списка пресетов
  updatePresetsList() {
    const presets = this.promptMaster.getAllPresets();
    this.presetsList.innerHTML = '';

    Object.entries(presets).forEach(([name, preset]) => {
      const presetItem = document.createElement('div');
      presetItem.className = 'preset-item';

      const presetName = document.createElement('span');
      presetName.textContent = name;
      presetItem.appendChild(presetName);

      const presetControls = document.createElement('div');
      presetControls.className = 'preset-controls';

      // Кнопка загрузки пресета
      const loadButton = document.createElement('button');
      loadButton.textContent = 'Load';
      loadButton.onclick = () => {
        const preset = this.promptMaster.loadPreset(name);
        if (preset) {
          document.getElementById('promptTemplate').value = preset.prompt;
          document.getElementById('outputColumns').value = preset.columns.join('\n');
        }
      };

      // Кнопка удаления пресета
      const deleteButton = document.createElement('button');
      deleteButton.textContent = '🗑️';
      deleteButton.onclick = () => {
        if (confirm(`Delete preset "${name}"?`)) {
          this.promptMaster.deletePreset(name);
          this.updatePresetsList();
        }
      };

      presetControls.append(loadButton, deleteButton);
      presetItem.appendChild(presetControls);
      this.presetsList.appendChild(presetItem);
    });
  }
}
