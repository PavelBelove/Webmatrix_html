import { settingsStorage, presetsStorage } from '../utils/storage';
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
      models: {
        gemini: [
          'gemini-1.5-pro',
          'gemini-2.0-flash-exp',
          'gemini-2.0-thinking-exp-1219',
          'learnlm-1.5-pro-experimental',
          'gemini-exp-1206',
        ],
        openai: ['gpt-4o', 'gpt-4o-mini'],
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
    const { gemini, openai } = this.settings;

    // Получаем только доступные модели (с установленными ключами)
    const availableModels = [
      ...(gemini.apiKey ? this.settings.models.gemini : []),
      ...(openai.apiKey ? this.settings.models.openai : []),
    ];

    // Если нет моделей, показываем сообщение
    const modelOptions =
      availableModels.length > 0
        ? availableModels
            .map(
              model => `
          <option value="${model}" ${
                model === this.settings.selectedAssistantModel ? 'selected' : ''
              }>
            ${this.getModelDisplayName(model)}
          </option>
        `
            )
            .join('')
        : '<option value="" disabled selected>No API keys configured</option>';

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
        </div>

        <div class="settings-controls-row">
          <!-- Model Selection -->
          <div class="model-selections">
            <div class="model-selection">
              <h3>Assistant Model</h3>
              <select id="assistantModelSelect">
                ${modelOptions}
              </select>
            </div>

            <div class="model-selection">
              <h3>Analysis Model</h3>
              <select id="analysisModelSelect">
                ${modelOptions}
              </select>
            </div>
          </div>

          <button id="saveApiSettings" class="primary">Save Settings</button>
        </div>
      </div>
    `;
  }

  getModelDisplayName(modelId) {
    const displayNames = {
      'gpt-4o': 'GPT-4 Optimized',
      'gpt-4o-mini': 'GPT-4 Optimized Mini',
      'gemini-1.5-pro': 'Gemini 1.5 Pro',
      'gemini-2.0-flash-exp': 'Gemini 2.0 Flash',
      'gemini-2.0-thinking-exp-1219': 'Gemini 2.0 Thinking',
      'learnlm-1.5-pro-experimental': 'LearnLM 1.5 Pro',
      'gemini-exp-1206': 'Gemini Experimental',
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

        // Если в поле что-то введено - используем это значение
        // Если поле пустое, но есть сохраненный ключ - используем его
        const geminiKey =
          geminiInput.value.trim() ||
          (geminiInput.dataset.hasKey === 'true' ? this.settings.gemini.apiKey : '');
        const openaiKey =
          openaiInput.value.trim() ||
          (openaiInput.dataset.hasKey === 'true' ? this.settings.openai.apiKey : '');

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

        // Обновляем data-has-key
        geminiInput.dataset.hasKey = !!newSettings.gemini.apiKey;
        openaiInput.dataset.hasKey = !!newSettings.openai.apiKey;

        // Обновляем плейсхолдеры
        geminiInput.placeholder = newSettings.gemini.apiKey
          ? 'API key is set'
          : 'Enter Gemini API key';
        openaiInput.placeholder = newSettings.openai.apiKey
          ? 'API key is set'
          : 'Enter OpenAI API key';

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
    ['geminiKey', 'openaiKey'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', () => this.updateAvailableModels());
      }
    });

    // Обработчик изменения модели для показа/скрытия настроек поиска
    const modelSelect = document.getElementById('assistantModelSelect');
    if (modelSelect) {
      modelSelect.addEventListener('change', e => {
        const searchSettings = document.querySelector('.search-settings');
        if (searchSettings) {
          const model = e.target.value;
          const needsSearch = model.includes('thinking') || model.includes('flash');
          searchSettings.classList.toggle('hidden', !needsSearch);
        }
      });
    }

    const presetsSelect = document.getElementById('presetsSelect');
    const loadPreset = document.getElementById('loadPreset');
    const savePreset = document.getElementById('savePreset');
    const exportPreset = document.getElementById('exportPreset');
    const importPreset = document.getElementById('importPreset');
    const importInput = document.getElementById('importPresetInput');

    if (presetsSelect) {
      // Применить выбранный пресет
      loadPreset.onclick = () => {
        const presetName = presetsSelect.value;
        if (!presetName) {
          alert('Please select a preset first');
          return;
        }

        const preset = presetsStorage.get(presetName);
        if (preset) {
          document.getElementById('promptTemplate').value = preset.prompt;
          document.getElementById('outputColumns').value = preset.columns.join('\n');
        }
      };

      // Сохранить текущий как новый пресет
      savePreset.onclick = () => {
        const name = prompt('Enter preset name:');
        if (!name) return;

        const promptTemplate = document.getElementById('promptTemplate').value;
        const outputColumns = document
          .getElementById('outputColumns')
          .value.trim()
          .split('\n')
          .filter(Boolean);

        presetsStorage.set(name, {
          prompt: promptTemplate,
          columns: outputColumns,
        });

        // Обновляем список пресетов
        presetsSelect.innerHTML = `
          <option value="">Select preset...</option>
          ${this.getPresetOptions()}
        `;

        // Выбираем только что созданный пресет
        presetsSelect.value = name;
      };

      // Экспорт выбранного пресета
      exportPreset.onclick = () => {
        const presetName = presetsSelect.value;
        if (!presetName) {
          alert('Please select a preset to export');
          return;
        }

        const preset = presetsStorage.get(presetName);
        const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webmatrix_preset_${presetName}.json`;
        a.click();
        URL.revokeObjectURL(url);
      };

      // Импорт пресета
      importPreset.onclick = () => importInput.click();
      importInput.onchange = async e => {
        try {
          const file = e.target.files[0];
          const text = await file.text();
          const preset = JSON.parse(text);

          // Проверяем структуру пресета
          if (!preset.prompt || !preset.columns) {
            throw new Error('Invalid preset format');
          }

          // Используем имя файла как имя пресета (без .json)
          const presetName = file.name.replace('.json', '').replace('webmatrix_preset_', '');

          // Сохраняем пресет
          presetsStorage.set(presetName, preset);

          // Обновляем список и выбираем импортированный пресет
          presetsSelect.innerHTML = `
            <option value="">Select preset...</option>
            ${this.getPresetOptions()}
          `;
          presetsSelect.value = presetName;

          // Сразу применяем импортированный пресет
          document.getElementById('promptTemplate').value = preset.prompt;
          document.getElementById('outputColumns').value = preset.columns.join('\n');

          alert('Preset imported and applied successfully');
        } catch (error) {
          alert('Error importing preset: ' + error.message);
        }
        importInput.value = '';
      };
    }
  }

  getProviderFromModel(modelId) {
    if (modelId.startsWith('gemini')) return 'gemini';
    if (modelId.startsWith('gpt')) return 'openai';
    if (modelId.startsWith('llama-')) return 'perplexity';
    return 'gemini'; // default
  }

  createPresetsSection() {
    return `
      <div class="presets-section">
        <h3>Presets</h3>
        
        <!-- Выпадающий список пресетов -->
        <select id="presetsSelect" class="presets-select">
          <option value="">Select preset...</option>
          ${this.getPresetOptions()}
        </select>

        <div class="presets-controls">
          <!-- Применить выбранный пресет -->
          <button id="loadPreset" class="secondary" data-icon="📂">
            Load
          </button>

          <!-- Сохранить текущий как новый пресет -->
          <button id="savePreset" class="primary" data-icon="💾">
            Save
          </button>

          <!-- Экспорт выбранного пресета -->
          <button id="exportPreset" class="primary" data-icon="📤">
            Export
          </button>

          <!-- Импорт пресета -->
          <button id="importPreset" class="secondary" data-icon="📥">
            Import
          </button>
          <input type="file" id="importPresetInput" accept=".json" style="display: none;">
        </div>
      </div>
    `;
  }

  // Получаем опции для выпадающего списка
  getPresetOptions() {
    const presets = presetsStorage.getAll();
    return Object.keys(presets)
      .map(name => `<option value="${name}">${name}</option>`)
      .join('');
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
      models: settings.models,
      selectedAssistantModel: settings.selectedAssistantModel,
      selectedAnalysisModel: settings.selectedAnalysisModel,
    });

    this.settings = settings;

    // Сохраняем в storage только сериализуемые данные
    const storageData = {
      activeProvider: settings.activeProvider,
      gemini: settings.gemini,
      openai: settings.openai,
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

    // Берем ключи из сохраненных настроек
    const { gemini, openai } = this.settings;

    // Обновляем список доступных моделей в настройках
    this.settings.models = {
      gemini: gemini.apiKey
        ? [
            'gemini-1.5-pro',
            'gemini-2.0-flash-exp',
            'gemini-2.0-thinking-exp-1219',
            'learnlm-1.5-pro-experimental',
            'gemini-exp-1206',
          ]
        : [],
      openai: openai.apiKey ? ['gpt-4o', 'gpt-4o-mini'] : [],
    };

    // Собираем все доступные модели
    const availableModels = [...this.settings.models.gemini, ...this.settings.models.openai];

    // Обновляем селекты
    [assistantSelect, analysisSelect].forEach(select => {
      const currentValue = select.value;

      // Если текущая модель недоступна, выбираем первую из доступных
      if (!availableModels.includes(currentValue) && availableModels.length > 0) {
        if (select === assistantSelect) {
          this.settings.selectedAssistantModel = availableModels[0];
        } else {
          this.settings.selectedAnalysisModel = availableModels[0];
        }
      }

      select.innerHTML =
        availableModels.length > 0
          ? availableModels
              .map(
                model => `
              <option value="${model}" ${
                  model ===
                  (select === assistantSelect
                    ? this.settings.selectedAssistantModel
                    : this.settings.selectedAnalysisModel)
                    ? 'selected'
                    : ''
                }>
                ${this.getModelDisplayName(model)}
              </option>
            `
              )
              .join('')
          : '<option value="" disabled selected>No API keys configured</option>';
    });

    // Сохраняем обновленные настройки
    settingsStorage.set('current', this.settings);
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
}
