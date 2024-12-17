// Import styles
import './styles/main.css';
import './styles/table.css';
import './styles/components/spoiler.css';
import './styles/components/readme.css';
import './styles/components/chat.css';
import './styles/components/settings.css';

// Import components
import { Settings } from './components/Settings';
import { AnalysisTable } from './components/AnalysisTable';
import { Chat } from './components/Chat';
import Readme from './components/Readme';

// Import agents
import { PromptMaster } from './agents/PromptMaster';
import { Analyst } from './agents/Analyst';
import { ChatAgent } from './agents/ChatAgent';

// Import storage
import { settingsStorage } from './utils/storage';
import { LLMProviderFactory } from './utils/api';
import { presetsStorage } from './utils/storage';

// Main application class
class WebMatrix {
  constructor() {
    this.container = document.querySelector('.container');
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize settings first
      this.settings = new Settings(this.handleSettingsChange.bind(this));

      // Initialize agents with current settings
      const currentSettings = settingsStorage.get('current');
      if (
        currentSettings?.activeProvider &&
        currentSettings[currentSettings.activeProvider]?.apiKey
      ) {
        const providerSettings = currentSettings[currentSettings.activeProvider];

        // Создаем провайдеров для разных задач
        const assistantProvider = LLMProviderFactory.createProvider(
          currentSettings.activeProvider,
          providerSettings.apiKey,
          {
            isCommercial: providerSettings.isCommercial,
            model: currentSettings.selectedAssistantModel,
          }
        );

        const analysisProvider = LLMProviderFactory.createProvider(
          currentSettings.activeProvider,
          providerSettings.apiKey,
          {
            isCommercial: providerSettings.isCommercial,
            model: currentSettings.selectedAnalysisModel,
          }
        );

        // Update settings with providers
        this.handleSettingsChange({
          ...currentSettings,
          assistantProvider,
          analysisProvider,
        });
      }

      // Initialize agents
      this.promptMaster = new PromptMaster();
      this.chatAgent = new ChatAgent();

      // Initialize components
      this.table = new AnalysisTable();
      this.chat = new Chat();
      this.readme = new Readme();

      // Initialize analyst after table
      this.analyst = new Analyst(this.table);

      // Initialize components with their dependencies
      this.table.promptMaster = this.promptMaster;
      this.table.analyst = this.analyst;
      this.chat.initialize(this.chatAgent);

      // Load default preset if available
      const defaultPreset = presetsStorage.get('default');
      if (defaultPreset) {
        this.promptMaster.loadPreset('default');
      }

      // Render components
      this.readme.render(this.container);
      this.settings.render(this.container);
      this.table.render(this.container);
      this.chat.render(this.container);

      // Add event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('Initialization error:', error);
      alert('Error initializing application: ' + error.message);
    }
  }

  handleSettingsChange(newSettings) {
    try {
      if (!newSettings?.assistantProvider || !newSettings?.analysisProvider) {
        console.error('No providers in settings:', newSettings);
        return;
      }

      console.log('Updating providers with settings:', {
        assistant: {
          provider: newSettings.assistantProvider.name,
          model: newSettings.assistantProvider.model,
        },
        analysis: {
          provider: newSettings.analysisProvider.name,
          model: newSettings.analysisProvider.model,
        },
      });

      // Обновляем провайдеров для ассистентов
      if (this.chat?.updateProvider) {
        this.chat.updateProvider({ ...newSettings, provider: newSettings.assistantProvider });
      }
      if (this.promptMaster?.updateProvider) {
        this.promptMaster.updateProvider({
          ...newSettings,
          provider: newSettings.assistantProvider,
        });
      }

      // Обновляем провайдера для анализа
      if (this.analyst?.updateProvider) {
        this.analyst.updateProvider({ ...newSettings, provider: newSettings.analysisProvider });
      }
    } catch (error) {
      console.error('Settings update error:', error);
      alert('Error updating settings: ' + error.message);
    }
  }

  setupEventListeners() {
    // Добавляем обработчики событий, если нужно
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new WebMatrix();
});
