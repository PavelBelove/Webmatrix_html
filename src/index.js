// Import styles
import './styles/main.css';
import './styles/table.css';
import './styles/components/spoiler.css';
import './styles/components/readme.css';
import './styles/components/chat.css';

// Import components
import { Settings } from './components/Settings';
import { AnalysisTable } from './components/AnalysisTable';
import { Chat } from './components/Chat';
import Readme from './components/Readme';

// Import agents
import { PromptMaster } from './agents/PromptMaster';
import { Analyst } from './agents/Analyst';

// Main application class
class WebMatrix {
  constructor() {
    this.container = document.querySelector('.container');
    this.initialize();
  }

  async initialize() {
    // Initialize components
    this.settings = new Settings(this.handleSettingsChange.bind(this));
    this.table = new AnalysisTable();
    this.chat = new Chat();
    this.readme = new Readme();

    // Initialize agents
    this.promptMaster = new PromptMaster();
    this.analyst = new Analyst(this.table);

    // Create control buttons
    this.createControls();

    // Render components
    this.readme.render(this.container);
    this.settings.render(this.container);
    this.renderControls();
    this.table.render(this.container);
    this.chat.render(this.container);

    // Add event listeners
    this.setupEventListeners();
  }

  handleSettingsChange(newSettings) {
    // Обновляем настройки во всех компонентах
    this.chat.updateProvider(newSettings);
    this.promptMaster.updateProvider(newSettings);
    this.analyst.updateProvider(newSettings);
  }

  createControls() {
    this.controls = document.createElement('div');
    this.controls.className = 'controls';

    // File input
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.xlsx,.csv';
    this.fileInput.style.display = 'none';

    // Buttons
    this.loadButton = document.createElement('button');
    this.loadButton.textContent = 'Load Data';
    this.loadButton.onclick = () => this.fileInput.click();

    this.promptButton = document.createElement('button');
    this.promptButton.textContent = 'Generate Prompt';
    this.promptButton.disabled = true;

    this.analyzeButton = document.createElement('button');
    this.analyzeButton.textContent = 'Start Analysis';
    this.analyzeButton.disabled = true;

    this.exportButton = document.createElement('button');
    this.exportButton.textContent = 'Export Results';
    this.exportButton.disabled = true;

    this.controls.append(
      this.fileInput,
      this.loadButton,
      this.promptButton,
      this.analyzeButton,
      this.exportButton
    );
  }

  renderControls() {
    this.container.appendChild(this.controls);
  }

  setupEventListeners() {
    // Обработка загрузки файла
    this.fileInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const data = await this.readFile(file);
        this.table.loadData(data);
        this.promptButton.disabled = false;
        this.analyzeButton.disabled = true;
        this.exportButton.disabled = true;
      } catch (error) {
        alert('Error loading file: ' + error.message);
      }
    });

    // Генерация промпта
    this.promptButton.addEventListener('click', async () => {
      const userRequest = prompt('What analysis would you like to perform?');
      if (!userRequest) return;

      try {
        const result = await this.promptMaster.generatePrompt(userRequest);
        this.analyst.setPrompt(result.prompt);
        this.table.setColumns(result.columns);
        this.analyzeButton.disabled = false;

        // Предложить сохранить пресет
        if (confirm('Would you like to save this preset?')) {
          const name = prompt('Enter preset name:');
          if (name) {
            this.promptMaster.savePreset(name, userRequest, result.prompt, result.columns);
          }
        }
      } catch (error) {
        alert('Error generating prompt: ' + error.message);
      }
    });

    // Запуск анализа
    this.analyzeButton.addEventListener('click', async () => {
      try {
        this.analyzeButton.disabled = true;
        await this.analyst.processTable(this.table.data);
        this.exportButton.disabled = false;
      } catch (error) {
        alert('Error during analysis: ' + error.message);
      } finally {
        this.analyzeButton.disabled = false;
      }
    });

    // Экспорт результатов
    this.exportButton.addEventListener('click', () => {
      const format = prompt('Choose format (excel/csv):');
      if (format === 'excel') {
        this.table.exportToExcel();
      } else if (format === 'csv') {
        this.table.exportToCSV();
      }
    });
  }

  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = [];
          if (file.name.endsWith('.csv')) {
            // Parse CSV
            const text = e.target.result;
            const rows = text.split('\n');
            const headers = rows[0].split(',').map(h => h.trim());

            for (let i = 1; i < rows.length; i++) {
              const values = rows[i].split(',').map(v => v.trim());
              if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                  row[header] = values[index];
                });
                data.push(row);
              }
            }
          } else {
            // Parse Excel
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
            data.push(...rows);
          }
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WebMatrix();
});
