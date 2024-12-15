<script>
// Глобальная переменная для ключа
let GEMINI_API_KEY = '';
let isProcessing = false;
let results = [];

// Добавляем константы для API
const API_CONFIG = {
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  MODEL: 'gemini-1.5-pro',
  ENDPOINT: ':generateContent',
};

// Обновляем конфигурацию по умолчанию
const DEFAULT_CONFIG = {
  profiles: {
    website_analyzer: {
      name: 'Website Analyzer',
      description:
        'Анализ сайтов на предмет международной активности и поенциала для финтех решений',
      prompt: 'You are an AI agent...',
      output_columns: [
        'company_name',
        'has_international_offices',
        'has_currency_exchange',
        'has_money_transfer',
        'sales_potential',
        'estimated_yearly_fx_volume',
        'locations',
        'company_summary',
        'lead_quality_notes',
        'proof_url',
      ],
      model: 'gemini-1.5-pro',
      temperature: 0.0,
    },
    quick_check: {
      name: 'Quick Check',
      description: 'Быстрый анализ только главной страницы',
      prompt: 'Visit {url} and analyze ONLY the main page content...', // весь текст промпта
      output_columns: [
        'company_name',
        'has_international_offices',
        'has_currency_exchange',
        'has_money_transfer',
        'sales_potential',
        'estimated_yearly_fx_volume',
        'locations',
        'company_summary',
        'lead_quality_notes',
        'proof_url',
      ],
      model: 'gemini-1.5-pro',
      temperature: 0.0,
    },
  },
};

// Убираем неиспользуемые функции
function loadConfig() {
  return DEFAULT_CONFIG;
}

function saveConfig(config) {
  return true;
}

function initConfig() {
  return DEFAULT_CONFIG;
}

// Добавляем после объявления переменных чата
const DEFAULT_SYSTEM_PROMPT = `I am an AI assistant helping you with data analysis and prompt engineering.
  
  When table data is shared:
  - I will analyze the data and help you understand patterns and insights
  - I can suggest improvements for data processing
  - I can help optimize prompts based on the results
  
  When preset is shared:
  - I will help you improve the prompt structure
  - I can suggest ways to make instructions more clear
  - I will help optimize the output format
  
  I will always:
  - Provide clear explanations
  - Suggest specific improvements
  - Use examples when helpful
  - Focus on practical solutions
  
  Let me know what you'd like to analyze or improve!`;

// Добавляем функцию для получения данных из таблицы
function getTableData() {
  const table = document.getElementById('resultsTable');
  if (!table) return null;

  const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
  const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
    const row = {};
    Array.from(tr.cells).forEach((cell, i) => {
      row[headers[i]] = cell.textContent;
    });
    return row;
  });

  return {
    headers: headers,
    rows: rows,
    totalRows: rows.length,
    lastProcessed: rows.filter(row => row.company_name && row.company_name !== 'N/A').length,
  };
}

// Обновляем инциализацию
document.addEventListener('DOMContentLoaded', async function () {
  // Инициализация основного интерфейса
  GEMINI_API_KEY = localStorage.getItem('gemini_api_key') || '';
  updateApiKeyStatus();

  // Настройка спойлеров (один раз для всех)
  setupCollapsible();

  // Обновление пресетов
  await updatePresetList();

  // Инициализация чата
  loadChatHistory();
  setupMessageInput();
  setupDragAndDrop();

  // Открываем Settings и закрываем README
  const collapsibles = document.getElementsByClassName('collapsible');
  Array.from(collapsibles).forEach(button => {
    const content = button.nextElementSibling;
    if (button.textContent.includes('Settings')) {
      button.classList.add('active');
      content.style.display = 'block';
    } else if (button.textContent.includes('README')) {
      button.classList.remove('active');
      content.style.display = 'none';
    }
  });

  // Устанавливаем системный промпт по умолчанию
  document.getElementById('systemPrompt').value = DEFAULT_SYSTEM_PROMPT;
});

// Обновляем функцию setupCollapsible
function setupCollapsible() {
  var coll = document.getElementsByClassName('collapsible');
  for (var i = 0; i < coll.length; i++) {
    coll[i].addEventListener('click', function (e) {
      e.stopPropagation();

      this.classList.toggle('active');
      var content = this.nextElementSibling;

      if (content.style.display === 'block') {
        content.style.display = 'none';
      } else {
        content.style.display = 'block';

        // Если это секция чата, прокручиваем страницу
        if (this.textContent.includes('Chat')) {
          // Даем время на отрисовку контента
          setTimeout(() => {
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: 'smooth',
            });
          }, 100);
        }
      }
    });
  }
}

function loadSavedSettings() {
  const apiKey = localStorage.getItem('geminiApiKey');
  const promptTemplate = localStorage.getItem('promptTemplate');
  const outputColumns = localStorage.getItem('outputColumns');

  if (apiKey) document.getElementById('apiKey').value = apiKey;
  if (promptTemplate) document.getElementById('promptTemplate').value = promptTemplate;
  if (outputColumns) document.getElementById('outputColumns').value = outputColumns;
}

// Добавляем функцию очистки URL
function cleanUrl(url) {
  // Удаляем протокол (http://, https://, etc)
  url = url.replace(/^(https?:\/\/)?(www\.)?/i, '');

  // Удаляем trailing slash и все что после него
  url = url.split('/')[0];

  // Удаляем пробелы
  url = url.trim();

  return url;
}

// Общая функция проверки ответа API
async function checkModelResponse(response) {
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Gemini 1.5 Pro is not available');
    }
    const errorData = await response.json();
    throw new Error(`API request failed: ${errorData.error?.message || response.status}`);
  }

  const result = await response.json();

  // Проверяем наличие валидного ответа
  if (!result?.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid API response format');
  }

  // Проверяем признаки ответа от неправильной модели
  const response_text = result.candidates[0].content.parts[0].text;
  if (
    response_text &&
    (response_text.includes('I apologize, but I cannot browse the internet') ||
      response_text.includes('I cannot access external websites') ||
      response_text.includes("I don't have the ability to browse"))
  ) {
    throw new Error('Response indicates limited model capabilities');
  }

  return result;
}

function validateJsonResponse(jsonData, requiredFields) {
  if (!jsonData) return false;

  return requiredFields.every(field => {
    return jsonData.hasOwnProperty(field);
  });
}

function extractJsonFromResponse(response) {
  try {
    // Получаем текст из структуры ответа API
    const text = response.candidates[0].content.parts[0].text;
    console.log('Raw API response text:', text); // Отладка
    
    // Ищем JSON в тексте ответа
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('No JSON found, raw text:', text); // Отладка
      throw new Error('No JSON found in response ' + text);
    }

    const parsedJson = JSON.parse(jsonMatch[0]);
    console.log('Parsed JSON:', parsedJson); // Отладка
    return parsedJson;
  } catch (e) {
    console.error('JSON extraction error:', e); // Отладка
    throw e; // Пробрасываем ошибку дальше для обработки
  }
}

function createEmptyResponse(message) {
  const fields = document
    .getElementById('outputColumns')
    .value.trim()
    .split('\n')
    .filter(col => col);

  const response = {};
  fields.forEach(field => (response[field] = 'N/A'));
  return response;
}

function addResult(url, response, isError = false) {
  const resultsDiv = document.getElementById('results');
  const resultElement = document.createElement('div');
  resultElement.className = `result ${isError ? 'error' : 'success'}`;

  let jsonData;
  if (isError) {
    jsonData = createEmptyResponse();
  } else {
    jsonData = extractJsonFromResponse(response);
  }

  resultElement.innerHTML = `
                  <strong>URL:</strong> ${url}<br>
                  <strong>Response:</strong><br>
                  ${JSON.stringify(jsonData, null, 2)}
              `;

  resultsDiv.insertBefore(resultElement, resultsDiv.firstChild);

  results.push({
    url: url,
    data: jsonData,
    timestamp: new Date().toISOString(),
  });
}

function convertToCSV(results) {
  const outputColumns = document
    .getElementById('outputColumns')
    .value.trim()
    .split('\n')
    .map(col => col.trim());

  // Заголовки
  let csv = ['URL', ...outputColumns].join(',') + '\n';

  // Данные
  results.forEach(result => {
    const row = [result.url];
    const jsonData = extractJsonFromResponse(result.response);

    if (jsonData) {
      outputColumns.forEach(col => {
        let value = jsonData[col] || '';
        // Экранируем запятые и кавычки
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        row.push(value);
      });
    } else {
      outputColumns.forEach(() => row.push('N/A'));
    }

    csv += row.join(',') + '\n';
  });

  return csv;
}

function downloadExcel() {
  const csv = convertToCSV(results);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `results_${new Date().toISOString()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function updateProgress(current, total) {
  const percentage = (current / total) * 100;
  document.querySelector('.progress-bar-fill').style.width = percentage + '%';
}

function updateStatus(message, current, total) {
  const status = document.getElementById('status');
  if (current !== undefined && total !== undefined) {
    status.textContent = `${message} (${current}/${total})`;
  } else {
    status.textContent = message;
  }
}

// Инициализация таблицы при загрузке данных
function initTable(data) {
  const headers = [
    'URL',
    ...document.getElementById('outputColumns').value.trim().split('\n'),
  ];
  const headerRow = document.getElementById('headerRow');
  headerRow.innerHTML = headers.map(h => `<th>${h}</th>`).join('');

  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = ''; // Очищаем таблицу

  // Создаем пстые строки для всех URL
  data.split('\n').forEach(url => {
    if (!url.trim()) return;

    const row = tbody.insertRow();
    row.id = `row-${url.trim()}`;
    headers.forEach((_, i) => {
      const cell = row.insertCell(i);
      if (i === 0) cell.textContent = url.trim();
      else cell.textContent = 'Pending...';
    });
  });
}

// Обновление строки при получении резуьтата
function updateTableRow(index, data) {
  const row = document.getElementById(`row-${index}`);
  if (!row) return;

  const outputColumns = document
    .getElementById('outputColumns')
    .value.trim()
    .split('\n')
    .filter(col => col);

  const startIndex = row.cells.length - outputColumns.length;

  outputColumns.forEach((field, i) => {
    const cell = row.cells[startIndex + i];
    cell.textContent = data[field] || 'N/A';
  });

  row.classList.remove('processing-row');
  row.classList.add(data.company_name === 'N/A' ? 'error-row' : 'success-row');
}

// Исправляем функцию highlightProcessingRow
function highlightProcessingRow(index) {
  // ыло (url)
  const row = document.getElementById(`row-${index}`); // теперь ищем по индексу
  if (row) {
    row.classList.add('processing-row');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Константа для задержки
const REQUEST_DELAY = 30500; // 30.5 секунд в миллисекундах

// И упрощаем функцию processUrls, убирая лишнее логирование
async function processUrls(data) {
  let lastRequestTime = 0;

  for (let i = 0; i < data.length && isProcessing; i++) {
    const row = data[i];
    const url =
      row.url ||
      row.URL ||
      row.Website ||
      row.website ||
      row.WEBSITE ||
      row.Domain ||
      row.domain;
    if (!url) continue;

    const cleanedUrl = cleanUrl(url);
    highlightProcessingRow(i);
    updateStatus(`Processing: ${cleanedUrl}`, i + 1, data.length);

    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - lastRequestTime;

    if (timeSinceLastRequest < REQUEST_DELAY) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest));
    }

    try {
      lastRequestTime = Date.now();
      const response = await makeRequest(cleanedUrl, GEMINI_API_KEY);
      const jsonData = extractJsonFromResponse(response);
      updateTableRow(i, jsonData);

      results.push({
        ...row,
        ...jsonData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error processing ${cleanedUrl}:`, error);
      const errorResponse = createEmptyResponse();
      errorResponse[Object.keys(errorResponse)[0]] = error.message;
      updateTableRow(i, errorResponse);
    }
  }

  isProcessing = false;
  updateStatus('Processing completed', data.length, data.length);
}

// Обновляем функцию startProcessing
function startProcessing() {
  if (!GEMINI_API_KEY) {
    alert('Please set your Gemini API Key first');
    showApiKeyForm();
    return;
  }

  const table = document.getElementById('resultsTable');
  if (!table || table.rows.length <= 1) {
    alert('Please upload data file first');
    return;
  }

  // Обновляем клон еед началм анализа
  updateTableColumns();

  isProcessing = true;
  const data = tableToData();
  processUrls(data);
}

// Функция для преобразования таблицы в массив объектов
function tableToData() {
  const table = document.getElementById('resultsTable');
  const headers = Array.from(table.rows[0].cells).map(cell => cell.textContent);
  const data = [];

  for (let i = 1; i < table.rows.length; i++) {
    const row = table.rows[i];
    const rowData = {};
    headers.forEach((header, j) => {
      rowData[header] = row.cells[j].textContent;
    });
    data.push(rowData);
  }

  return data;
}

function stopProcessing() {
  isProcessing = false;
  updateStatus('Processing stopped');
}

function downloadResults() {
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `results_${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Функции для работы с пресетами
async function updatePresetList() {
  const presets = getPresets();
  const select = document.getElementById('presetSelect');
  select.innerHTML = '<option value="">Select preset...</option>';

  Object.keys(presets).forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

function loadPreset() {
  const presetName = document.getElementById('presetSelect').value;
  if (!presetName) return;

  const presets = getPresets();
  const preset = presets[presetName];
  if (!preset) return;

  document.getElementById('promptTemplate').value = preset.prompt;
  document.getElementById('outputColumns').value = preset.columns;

  // Обновляем колонки если таблица уже создана
  const table = document.getElementById('resultsTable');
  if (table && table.rows.length > 0) {
    updateTableColumns();
  }
}

function showSavePresetDialog() {
  document.getElementById('savePresetDialog').style.display = 'block';
  document.getElementById('presetName').focus();
}

function hideSavePresetDialog() {
  document.getElementById('savePresetDialog').style.display = 'none';
  document.getElementById('presetName').value = '';
}

function savePreset() {
  const name = document.getElementById('presetName').value.trim();
  if (!name) {
    alert('Please enter preset name');
    return;
  }

  const presets = getPresets();
  presets[name] = {
    prompt: document.getElementById('promptTemplate').value,
    columns: document.getElementById('outputColumns').value,
  };

  if (savePresets(presets)) {
    updatePresetList();
    hideSavePresetDialog();
    alert('Preset saved successfully');
  } else {
    alert('Error saving preset');
  }
}

function deletePreset() {
  const name = document.getElementById('presetSelect').value;
  if (!name || !confirm(`Delete preset "${name}"?`)) return;

  const presets = getPresets();
  delete presets[name];

  if (savePresets(presets)) {
    updatePresetList();
    alert('Preset deleted');
  } else {
    alert('Error deleting preset');
  }
}

// Добавляем функции импорта/экспорта
function exportPresets() {
  const presets = getPresets();
  const blob = new Blob([JSON.stringify(presets, null, 2)], {
    type: 'application/json',
  }); // Убрана лишняя скобка
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `webmatrix_presets_${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importPresets(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedPresets = JSON.parse(e.target.result);
      const currentPresets = getPresets();

      // Объединяем пресеты
      const mergedPresets = { ...currentPresets, ...importedPresets };

      if (savePresets(mergedPresets)) {
        updatePresetList();
        alert('Presets imported successfully');
      } else {
        alert('Error importing presets');
      }
    } catch (e) {
      console.error('Import error:', e);
      alert('Error importing presets: Invalid file format');
    }
  };
  reader.readAsText(file);
}

// Функции для работы с localStorage
function getPresets() {
  try {
    const presets = localStorage.getItem('webmatrix_presets');
    return presets ? JSON.parse(presets) : {};
  } catch (e) {
    console.error('Error loading presets:', e);
    return {};
  }
}

function savePresets(presets) {
  try {
    localStorage.setItem('webmatrix_presets', JSON.stringify(presets));
    return true;
  } catch (e) {
    console.error('Error saving presets:', e);
    return false;
  }
}

// Функция для загрузки Excel/CSV файла
function handleFileUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    let data;
    if (file.name.endsWith('.csv')) {
      data = parseCSV(e.target.result);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const workbook = XLSX.read(e.target.result, { type: 'binary' });
      data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    }
    initTableWithData(data);
  };

  if (file.name.endsWith('.csv')) {
    reader.readAsText(file);
  } else {
    reader.readAsBinaryString(file);
  }
}

// Функция для инициализации таблиц с данными
function initTableWithData(data) {
  if (!data || !data.length) {
    alert('No data found in file');
    return;
  }

  // Получаем колонки
  const inputColumns = Object.keys(data[0]);
  const outputColumns = document.getElementById('outputColumns').value.trim().split('\n');
  const allColumns = [...inputColumns, ...outputColumns];

  // Создаем заголовки
  const headerRow = document.getElementById('headerRow');
  headerRow.innerHTML = allColumns.map(h => `<th>${h}</th>`).join('');

  // Создаем строки с данными
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';

  data.forEach((row, index) => {
    const tr = tbody.insertRow();
    tr.id = `row-${index}`;

    // Заполняем существующие данные
    inputColumns.forEach(col => {
      const cell = tr.insertCell();
      const content = row[col] || '';
      cell.textContent = formatCellContent(content);
      cell.title = content; // Полный текст в тултие
    });

    // Добавляем ячейки для результатов
    outputColumns.forEach(() => {
      const cell = tr.insertCell();
      cell.textContent = 'Pending...';
    });
  });
}

// Функция для форматирования содержимого ячейки
function formatCellContent(content, maxLength = 50) {
  if (content === null || content === undefined) return 'N/A';

  content = content.toString();
  if (content.length <= maxLength) return content;

  return content.substring(0, maxLength) + '...';
}

// Обновляем стили для таблицы
const styles = `
              .table-container {
                  max-height: 600px;
                  overflow-y: auto;
                  border: 1px solid #ddd;
              }
  
              #resultsTable {
                  width: 100%;
                  border-collapse: collapse;
                  table-layout: fixed; /* Фиксировання шириа колонок */
              }
  
              #resultsTable th, #resultsTable td {
                  border: 1px solid #ddd;
                  padding: 8px;
                  text-align: left;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  max-width: 200px; /* Максимальная ширина ячейки */
              }
  
              #resultsTable th {
                  position: sticky;
                  top: 0;
                  background: white;
                  z-index: 1;
              }
  
              #resultsTable td:hover {
                  white-space: normal;
                  word-wrap: break-word;
                  background-color: #f8f9fa;
                  position: relative;
              }
  
              /* Тултип для полного текста */
              #resultsTable td[title]:hover::after {
                  content: attr(title);
                  position: absolute;
                  bottom: 100%;
                  left: 0;
                  background: #333;
                  color: white;
                  padding: 5px;
                  border-radius: 3px;
                  max-width: 300px;
                  word-wrap: break-word;
                  z-index: 2;
              }
          `;

// Обновляем функцию updateTableRow для работы с новым форматом
function updateTableRow(index, data) {
  const row = document.getElementById(`row-${index}`);
  if (!row) return;

  const outputColumns = document.getElementById('outputColumns').value.trim().split('\n');
  const startIndex = row.cells.length - outputColumns.length;

  outputColumns.forEach((field, i) => {
    const cell = row.cells[startIndex + i];
    const content = data[field] || 'N/A';
    cell.textContent = formatCellContent(content);
    cell.title = content; // Полный текст в тултипе
  });

  row.classList.remove('processing-row');
  row.classList.add(data.company_name === 'N/A' ? 'error-row' : 'success-row');
}

// Функция для парсинга CSV
function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : '';
    });
    data.push(row);
  }

  return data;
}

// Функция для обновленя колонок тблицы
function updateTableColumns() {
  const table = document.getElementById('resultsTable');
  if (!table || table.rows.length === 0) return;

  const inputColumns = Array.from(table.rows[0].cells)
    .slice(0, -document.getElementById('outputColumns').value.trim().split('\n').length)
    .map(cell => cell.textContent);

  const outputColumns = document.getElementById('outputColumns').value.trim().split('\n');
  const allColumns = [...inputColumns, ...outputColumns];

  // Обновляем заголовки
  const headerRow = document.getElementById('headerRow');
  headerRow.innerHTML = allColumns.map(h => `<th>${h}</th>`).join('');

  // Обновляем все строки
  const tbody = document.getElementById('resultsBody');
  Array.from(tbody.rows).forEach((row, index) => {
    // Сохраняем существующие данные
    const existingData = {};
    inputColumns.forEach((col, i) => {
      existingData[col] = row.cells[i].textContent;
    });

    // Пересоздаем строку
    row.innerHTML = '';

    // Восстанавливаем входные данные
    inputColumns.forEach(col => {
      const cell = row.insertCell();
      cell.textContent = existingData[col];
    });

    // Добавляем ячейки для рзультаов
    outputColumns.forEach(() => {
      const cell = row.insertCell();
      cell.textContent = 'Pending...';
    });
  });
}

// Функция очистки для любых строк, которые огут содержать URL
function cleanPossibleUrl(text) {
  // Если текст похож на URL, очищаем его
  if (
    text.includes('.') &&
    (text.includes('http') || text.includes('www') || text.includes('/'))
  ) {
    return text
      .replace(/^(https?:\/\/)?(www\.)?/i, '')
      .split('/')[0]
      .trim();
  }
  return text;
}

// Обновляем функцию generatePrompt для мастера промптов
async function generatePrompt() {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/${API_CONFIG.MODEL}${API_CONFIG.ENDPOINT}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: metaPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.0,
            maxOutputTokens: 2048,
            topP: 0.8,
            topK: 40,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE',
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API request failed: ${errorData.error?.message || response.status}`);
    }

    const result = await response.json();

    // Проверяем ответ на использование правильной модели
    const modelCheck = checkModelResponse(result);
    if (modelCheck.error) {
      throw new Error(modelCheck.message);
    }

    if (!result?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from prompt generator');
    }

    return result.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error generating prompt:', error);
    if (error.message.includes('Gemini 1.5 Pro is not available')) {
      alert('ERROR: Prompt generation requires Gemini 1.5 Pro model');
    }
    throw error;
  }
}

function updateApiKeyStatus() {
  const message = document.getElementById('apiKeyMessage');
  const button = document.getElementById('apiKeyButton');

  if (GEMINI_API_KEY) {
    message.textContent = 'API Key is set';
    message.style.color = '#28a745';
    button.textContent = 'Change API Key';
  } else {
    message.textContent = 'API Key required';
    message.style.color = '#dc3545';
    button.textContent = 'Set API Key';
  }
}

function showApiKeyForm() {
  document.getElementById('apiKeyForm').style.display = 'flex';
  document.getElementById('apiKeyInput').focus();
}

function hideApiKeyForm() {
  document.getElementById('apiKeyForm').style.display = 'none';
  document.getElementById('apiKeyInput').value = '';
}

function saveApiKey() {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  if (!apiKey) {
    alert('Please enter API Key');
    return;
  }

  try {
    localStorage.setItem('gemini_api_key', apiKey);
    GEMINI_API_KEY = apiKey;
    updateApiKeyStatus();
    hideApiKeyForm();
  } catch (e) {
    alert('Error saving API Key to localStorage');
    console.error('Storage error:', e);
  }
}

function showExportPresetDialog() {
  document.getElementById('exportPresetDialog').style.display = 'block';
  const defaultName = `webmatrix_presets_${new Date().toISOString().split('T')[0]}`;
  document.getElementById('exportPresetName').value = defaultName;
  document.getElementById('exportPresetName').focus();
}

function hideExportPresetDialog() {
  document.getElementById('exportPresetDialog').style.display = 'none';
  document.getElementById('exportPresetName').value = '';
}

function doExportPresets() {
  const fileName = document.getElementById('exportPresetName').value.trim();
  if (!fileName) {
    alert('Please enter file name');
    return;
  }

  const presets = getPresets();
  const blob = new Blob([JSON.stringify(presets, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  hideExportPresetDialog();
}

function downloadCSV() {
  const table = document.getElementById('resultsTable');
  if (!table) return;

  let csv = [];
  // Заголовки
  let headers = [];
  for (let cell of table.rows[0].cells) {
    headers.push(cell.textContent);
  }
  csv.push(headers.join(','));

  // Данные
  for (let i = 1; i < table.rows.length; i++) {
    let row = [];
    for (let cell of table.rows[i].cells) {
      let value = cell.textContent || '';
      // Экранируем запятые и кавычки
      if (value.includes(',') || value.includes('"')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      row.push(value);
    }
    csv.push(row.join(','));
  }

  const blob = new Blob(['\ufeff' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `results_${new Date().toISOString()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Переменные чата
let chatHistory = [];
const MAX_HISTORY = 100;
const MAX_CONTEXT = 10;

// Настройка поля ввода
function setupMessageInput() {
  const input = document.getElementById('messageInput');

  // Обработка Enter для отправки
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Автоматическое изменение высоты
  input.addEventListener('input', function () {
    // Если поле пустое - возвращаем начальную высоту
    if (!this.value.trim()) {
      this.style.height = '100px';
      return;
    }

    // Сбрасываем высоту для правильного расчета
    this.style.height = '100px';

    // Вычисляем новую высоту
    const newHeight = Math.min(this.scrollHeight, window.innerHeight * 0.5);

    // Устанавливаем новую ысоту
    this.style.height = Math.max(100, newHeight) + 'px';
  });
}

// Функции для рабоы с сообщениями
function addMessage(text, sender, save = true) {
  const container = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;

  // Рендерим Markdown
  const rendered = marked.parse(text, {
    gfm: true, // GitHub Flavored Markdown
    breaks: true, // Convert \n to <br>
    highlight: function (code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(code, { language: lang }).value;
          return `<div class="code-wrapper">
                                          <button class="copy-button" onclick="copyCode(this)">Copy</button>
                                          ${highlighted}
                                      </div>`;
        } catch (err) {}
      }
      return code;
    },
  });

  messageDiv.innerHTML = rendered;

  // Активруем подсветку синтаксиса
  messageDiv.querySelectorAll('pre code').forEach(block => {
    hljs.highlightBlock(block);
  });

  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;

  // Сохраняем в историю только если это новое сообщение
  if (save) {
    chatHistory.push({ sender, text });
    if (chatHistory.length > MAX_HISTORY) {
      chatHistory.shift();
    }
    saveChatHistory();
  }
}

// Обновляем функцию отправки сообщения в чат
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  input.value = '';
  input.style.height = '100px';

  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/${API_CONFIG.MODEL}${API_CONFIG.ENDPOINT}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: message,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 0.8,
            topK: 40,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE',
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `API Error: ${response.status} ${data.error?.message || response.statusText}`
      );
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
    addMessage(aiResponse, 'ai');
  } catch (error) {
    console.error('Chat error:', error);
    addMessage('Error: ' + error.message, 'error');
  }
}

// Функции для работы с контекстом
function getContext() {
  const context = {
    systemPrompt: document.getElementById('systemPrompt').value,
    showTable: document.getElementById('showTable').checked,
    showPreset: document.getElementById('showPreset').checked,
    history: chatHistory.slice(-MAX_CONTEXT),
  };

  // Добавляем данные таблицы если включено
  if (context.showTable) {
    context.tableData = getTableData();
  }

  // Добавляем пресет если включно
  if (context.showPreset) {
    context.preset = {
      prompt: document.getElementById('promptTemplate').value,
      columns: document.getElementById('outputColumns').value.split('\n'),
    };
  }

  return context;
}

// Функция для отправки запроса к API
async function sendToAPI(prompt, apiKey, config) {
  console.log('Sending prompt:', prompt); // Для отладки

  const response = await fetch(
    `${API_CONFIG.BASE_URL}/${API_CONFIG.MODEL}${API_CONFIG.ENDPOINT}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt, // Передаем промпт напрямую из makeRequest
              },
            ],
          },
        ],
        generationConfig: {
          temperature: config.temperature || 0.0,
          maxOutputTokens: 2048,
          topP: 0.8,
          topK: 40,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API request failed: ${errorData.error?.message || response.status}`);
  }

  const result = await response.json();
  return result.candidates[0].content.parts[0].text;
}

// Исправляем функцию exportPresets
function exportPresets() {
  const presets = getPresets();
  const blob = new Blob([JSON.stringify(presets, null, 2)], {
    type: 'application/json',
  }); // Убрана лишняя скобка
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `webmatrix_presets_${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleChatFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  await processFile(file);
}

function checkModelResponse(result) {
  // Проверка на использование неправильной модеи
  if (result.candidates?.[0]?.citationMetadata?.citations?.[0]?.startIndex === 0) {
    return {
      error: true,
      message: 'API is using a different model than requested. Results may be unreliable!',
    };
  }

  // Проверка текста ответа на признаки ограниченной модели
  const response_text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (
    response_text &&
    (response_text.includes('I apologize, but I cannot browse the internet') ||
      response_text.includes('I cannot access external websites') ||
      response_text.includes("I don't have the ability to browse"))
  ) {
    return {
      error: true,
      message: 'Response indicates limited model capabilities',
    };
  }

  return { error: false };
}

// Функции для сохранения и загрузки истории чата
function saveChatHistory() {
  try {
    localStorage.setItem('webmatrix_chat_history', JSON.stringify(chatHistory));
  } catch (e) {
    console.error('Error saving chat history:', e);
  }
}

function loadChatHistory() {
  try {
    const saved = localStorage.getItem('webmatrix_chat_history');
    if (saved) {
      chatHistory = JSON.parse(saved);
      // Восстанавливаем сообщения в интерфейсе
      const container = document.getElementById('chatContainer');
      container.innerHTML = ''; // Очищаем контейнер
      chatHistory.forEach(msg => {
        addMessage(msg.text, msg.sender, false); // false - не сохранять повторно
      });
    }
  } catch (e) {
    console.error('Error loading chat history:', e);
    chatHistory = [];
  }
}

// Функция для копирования кода
function copyCode(button) {
  const codeBlock = button.parentElement.querySelector('code');
  const text = codeBlock.textContent;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    })
    .catch(err => {
      console.error('Failed to copy:', err);
      button.textContent = 'Error!';
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  loadChatHistory();
  setupMessageInput();
});

async function makeRequest(url, apiKey) {
  const preset = document.getElementById('presetSelect').value;
  const config = DEFAULT_CONFIG.profiles[preset] || DEFAULT_CONFIG.profiles.website_analyzer;
  
  let prompt = document.getElementById('promptTemplate').value;
  
  const tableData = getTableData();
  if (tableData && tableData.rows.length > 0) {
    const currentRow = tableData.rows[tableData.lastProcessed || 0];
    for (const column in currentRow) {
      prompt = prompt.replace(`{{${column}}}`, currentRow[column] || '');
    }
  }
  
  prompt = prompt.replace('{url}', url);
  
  try {
    // Получаем текст ответа от API
    const responseText = await sendToAPI(prompt, apiKey, config);
    console.log('Raw model response:', responseText); // Отладка
    
    // Передаем сам текст, а не объект
    const jsonData = extractJsonFromResponse(responseText);
    
    return jsonData;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}
// Добавляем функцию setupDragAndDrop
function setupDragAndDrop() {
  const dropZone = document.getElementById('chatContainer');

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length) {
      handleChatFileUpload({ target: { files: files } });
    }
  });
}
</script>