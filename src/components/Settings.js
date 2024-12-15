import { Spoiler } from './Spoiler';

export class Settings {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'settings-panel';

    this.apiKey = localStorage.getItem('gemini_api_key') || '';
    this.isCommercial = localStorage.getItem('is_commercial_key') === 'true';

    this.init();
  }

  init() {
    // Создаем основной спойлер настроек (открыт по умолчанию)
    const settingsSpoiler = new Spoiler('⚙️ Settings', '', true);

    // API Key секция
    const apiKeyContent = this.createApiKeySection();
    const apiKeySpoiler = new Spoiler('🔑 API Key', apiKeyContent);

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
      }
    }, 0);

    // Инициализируем обработчики событий
    this.initEventHandlers();
  }

  createApiKeySection() {
    return `
      <div class="sub-panel">
        <div id="apiKeyStatus" class="api-status">
          <span id="apiKeyMessage">${this.apiKey ? 'API Key is set' : 'API Key required'}</span>
          <button onclick="showApiKeyForm()" class="button primary" id="apiKeyButton">
            ${this.apiKey ? 'Change API Key' : 'Set API Key'}
          </button>
        </div>
        
        <div id="apiKeyForm" style="display: none">
          <input type="password" id="apiKeyInput" placeholder="Enter Gemini API Key" />
          <div class="checkbox-wrapper">
            <input type="checkbox" id="isCommercialKey" ${this.isCommercial ? 'checked' : ''} />
            <label for="isCommercialKey">Commercial API Key (no rate limits)</label>
          </div>
          <button onclick="saveApiKey()" class="button primary">Save</button>
          <button onclick="hideApiKeyForm()" class="button warning">Cancel</button>
        </div>
      </div>
    `;
  }

  createPresetsSection() {
    const presets = this.loadPresets();
    return `
      <h3>Presets</h3>
      <div class="presets-controls">
        <select id="presetSelect" class="preset-select">
          <option value="">Select preset...</option>
          ${Object.keys(presets)
            .map(
              name => `
            <option value="${name}">${name}</option>
          `
            )
            .join('')}
        </select>

        <div class="button-group">
          <button onclick="loadPreset()" class="primary">📂 Load</button>
          <button onclick="showSavePresetDialog()" class="primary">💾 Save</button>
          <button onclick="deletePreset()" class="warning">🗑️ Delete</button>

          <input type="file" id="importPreset" accept=".json" style="display: none" />
          <label for="importPreset" class="button upload">📥 Import Presets</label>
          <button onclick="showExportPresetDialog()" class="download">📤 Export Presets</button>
        </div>
      </div>

      <div id="savePresetDialog" style="display: none" class="preset-dialog">
        <input type="text" id="presetName" placeholder="Enter preset name" />
        <div class="button-group">
          <button onclick="savePreset()" class="primary">Save</button>
          <button onclick="hideSavePresetDialog()" class="warning">Cancel</button>
        </div>
      </div>

      <div id="exportPresetDialog" style="display: none" class="preset-dialog">
        <input type="text" id="exportPresetName" placeholder="Enter export file name" />
        <div class="button-group">
          <button onclick="doExportPresets()" class="primary">Export</button>
          <button onclick="hideExportPresetDialog()" class="warning">Cancel</button>
        </div>
      </div>
    `;
  }

  createPromptSection() {
    return `
      <h3>Prompt</h3>
      <textarea id="promptTemplate">
Analyze this website: {{url}}

Your task is to evaluate if the company could benefit from international payment and fintech solutions.
Return response in this JSON format only:
{
    "company_name": string,
    "has_international_offices": boolean,
    "has_currency_exchange": boolean,
    "has_money_transfer": boolean,
    "sales_potential": number (0-5),
    "estimated_yearly_fx_volume": string,
    "locations": string,
    "company_summary": string,
    "lead_quality_notes": string,
    "proof_url": string
}</textarea>

      <h3>Output Columns (one per line)</h3>
      <textarea id="outputColumns">
company_name
has_international_offices
has_currency_exchange
has_money_transfer
sales_potential
estimated_yearly_fx_volume
locations
company_summary
lead_quality_notes
proof_url</textarea>
    `;
  }

  loadPresets() {
    try {
      const presets = localStorage.getItem('webmatrix_presets');
      return presets ? JSON.parse(presets) : {};
    } catch (e) {
      console.error('Error loading presets:', e);
      return {};
    }
  }

  initEventHandlers() {
    // API Key handlers
    window.showApiKeyForm = () => {
      document.getElementById('apiKeyForm').style.display = 'flex';
      document.getElementById('apiKeyInput').focus();
    };

    window.hideApiKeyForm = () => {
      document.getElementById('apiKeyForm').style.display = 'none';
      document.getElementById('apiKeyInput').value = '';
    };

    window.saveApiKey = () => {
      const apiKey = document.getElementById('apiKeyInput').value.trim();
      const isCommercial = document.getElementById('isCommercialKey').checked;

      if (!apiKey) {
        alert('Please enter API Key');
        return;
      }

      try {
        localStorage.setItem('gemini_api_key', apiKey);
        localStorage.setItem('is_commercial_key', isCommercial);
        this.apiKey = apiKey;
        this.isCommercial = isCommercial;
        this.updateApiKeyStatus();
        window.hideApiKeyForm();
      } catch (e) {
        alert('Error saving API Key to localStorage');
        console.error('Storage error:', e);
      }
    };

    // Preset handlers
    window.loadPreset = () => {
      const presetName = document.getElementById('presetSelect').value;
      if (!presetName) return;

      const presets = this.loadPresets();
      const preset = presets[presetName];
      if (!preset) return;

      document.getElementById('promptTemplate').value = preset.prompt;
      document.getElementById('outputColumns').value = preset.columns;
    };

    window.showSavePresetDialog = () => {
      document.getElementById('savePresetDialog').style.display = 'block';
      document.getElementById('presetName').focus();
    };

    window.hideSavePresetDialog = () => {
      document.getElementById('savePresetDialog').style.display = 'none';
      document.getElementById('presetName').value = '';
    };

    window.savePreset = () => {
      const name = document.getElementById('presetName').value.trim();
      if (!name) {
        alert('Please enter preset name');
        return;
      }

      const presets = this.loadPresets();
      presets[name] = {
        prompt: document.getElementById('promptTemplate').value,
        columns: document.getElementById('outputColumns').value,
      };

      try {
        localStorage.setItem('webmatrix_presets', JSON.stringify(presets));
        this.updatePresetList();
        window.hideSavePresetDialog();
        alert('Preset saved successfully');
      } catch (e) {
        alert('Error saving preset');
        console.error('Storage error:', e);
      }
    };
  }

  updateApiKeyStatus() {
    const message = document.getElementById('apiKeyMessage');
    const button = document.getElementById('apiKeyButton');

    if (this.apiKey) {
      message.textContent = 'API Key is set';
      message.style.color = '#28a745';
      button.textContent = 'Change API Key';
    } else {
      message.textContent = 'API Key required';
      message.style.color = '#dc3545';
      button.textContent = 'Set API Key';
    }
  }

  updatePresetList() {
    const presets = this.loadPresets();
    const select = document.getElementById('presetSelect');
    select.innerHTML = '<option value="">Select preset...</option>';

    Object.keys(presets).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
  }

  render(container) {
    container.appendChild(this.element);
  }
}
