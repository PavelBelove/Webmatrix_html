import { Storage } from '../utils/storage';

export class AnalysisTable {
  constructor(settings) {
    this.settings = settings;
    this.element = document.createElement('div');
    this.element.className = 'table-container';

    // Создаем контейнер для фильтров
    this.filterContainer = document.createElement('div');
    this.filterContainer.className = 'table-filters';

    // Создаем обертку для таблицы
    this.tableWrapper = document.createElement('div');
    this.tableWrapper.className = 'table-wrapper';

    // Создаем контейнер для скролла
    this.tableScroll = document.createElement('div');
    this.tableScroll.className = 'table-scroll';

    // Создаем таблицу
    this.table = document.createElement('table');
    this.table.id = 'resultsTable';

    // Собираем структуру
    this.tableScroll.appendChild(this.table);
    this.tableWrapper.appendChild(this.tableScroll);
    this.element.appendChild(this.filterContainer);
    this.element.appendChild(this.tableWrapper);

    this.data = [];
    this.columns = [];
    this.currentRow = 0;
    this.isProcessing = false;
    this.filters = {};
    this.selectedRows = new Set();
    this.sortDirections = {};

    // Создаем и добавляем панель управления
    this.controls = this.createControls();
    this.element.insertBefore(this.controls, this.element.firstChild);

    // Создаем статус-бар
    this.statusBar = document.createElement('div');
    this.statusBar.className = 'status-bar';
    this.statusBar.style.display = 'none';

    // Добавляем статус-бар после контролов, но перед таблицей
    this.element.insertBefore(this.statusBar, this.tableWrapper);

    // Биндим методы
    this.handleMasterCheckbox = this.handleMasterCheckbox.bind(this);
    this.handleRowCheckbox = this.handleRowCheckbox.bind(this);
    this.toggleAllRows = this.toggleAllRows.bind(this);
    this.toggleRow = this.toggleRow.bind(this);

    // Добавляем отдельный объект для разметки
    this.rowMarks = {}; // {rowIndex: 'true'|'false'|'hidden'}
  }

  setColumns(columns) {
    this.columns = columns;
    this.renderHeader();
    this.setupFilters();
  }

  renderHeader() {
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');

    // Колонка с чекбоксами
    const checkboxTh = document.createElement('th');
    checkboxTh.className = 'checkbox-column';
    const masterCheckbox = document.createElement('input');
    masterCheckbox.type = 'checkbox';
    masterCheckbox.checked = true;
    masterCheckbox.addEventListener('change', this.handleMasterCheckbox);
    checkboxTh.appendChild(masterCheckbox);
    tr.appendChild(checkboxTh);

    // Создаем базовые заголовки
    const createBasicHeader = column => {
      const th = document.createElement('th');
      th.className = 'header-cell';
      th.dataset.column = column;

      const headerContent = document.createElement('div');
      headerContent.className = 'header-content';

      const titleSpan = document.createElement('span');
      titleSpan.textContent = column;
      headerContent.appendChild(titleSpan);

      const controls = document.createElement('div');
      controls.className = 'header-controls';

      // Иконка сортировки
      const sortIcon = document.createElement('span');
      sortIcon.className = 'sort-icon';
      sortIcon.innerHTML = '↕️';
      sortIcon.title = 'Sort';
      sortIcon.addEventListener('click', e => {
        e.stopPropagation();
        this.sortByColumn(column);
      });
      controls.appendChild(sortIcon);

      headerContent.appendChild(controls);
      th.appendChild(headerContent);
      return th;
    };

    // Добавляем исходные колонки
    if (this.data.length > 0) {
      Object.keys(this.data[0]).forEach(column => {
        tr.appendChild(createBasicHeader(column));
      });
    }

    // Добавляем колонки результатов
    this.columns.forEach(column => {
      if (!column.trim()) return;
      tr.appendChild(createBasicHeader(column));
    });

    thead.appendChild(tr);
    this.table.innerHTML = '';
    this.table.appendChild(thead);

    // Рендерим тело таблицы
    this.renderBody();

    // После рендеринга данных добавляем фильтры
    this.addFiltersToHeaders();
  }

  // Новый метод для добавления фильтров
  addFiltersToHeaders() {
    const headers = Array.from(this.table.querySelectorAll('thead th'));
    headers.forEach(th => {
      const column = th.dataset.column;
      if (!column) return;

      const values = new Set();
      const columnIndex = Array.from(th.parentElement.children).indexOf(th);

      Array.from(this.table.querySelectorAll('tbody tr')).forEach(row => {
        if (row.cells[columnIndex]) {
          values.add(row.cells[columnIndex].textContent);
        }
      });

      if (values.size <= 20) {
        const controls = th.querySelector('.header-controls');
        const filterIcon = document.createElement('span');
        filterIcon.className = 'filter-icon';
        filterIcon.innerHTML = '🔍';
        filterIcon.title = 'Filter';
        filterIcon.dataset.column = column;

        // Сохраняем значения в dataset
        filterIcon.dataset.values = JSON.stringify([...values]);

        // Изменяем обработчик клика
        const handleFilterClick = e => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          // Получаем значения из dataset
          const savedValues = new Set(JSON.parse(filterIcon.dataset.values));
          this.toggleFilter(column, filterIcon, savedValues, e);
        };

        filterIcon.addEventListener('click', handleFilterClick, true);
        controls.appendChild(filterIcon);
      }
    });
  }

  setupFilters() {
    // Удаляем этот метод, так как фильтры теперь создаются по требованию
  }

  toggleFilter(column, filterIcon, values, event) {
    console.log('Toggle filter for column:', column, 'Values:', values);

    event.stopPropagation();
    event.preventDefault();

    // Закрываем все открытые дропдауны и сбрасываем активные иконки
    document.querySelectorAll('.filter-dropdown').forEach(d => d.remove());
    document.querySelectorAll('.filter-icon').forEach(icon => icon.classList.remove('active'));

    // Создаем дропдаун
    const dropdown = document.createElement('div');
    dropdown.className = 'filter-dropdown';
    dropdown.setAttribute('data-column', column);

    // Создаем контент
    const content = document.createElement('div');
    content.className = 'filter-content';

    // "Выбрать все" чекбокс
    const selectAllWrapper = document.createElement('div');
    selectAllWrapper.className = 'filter-checkbox-wrapper';
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.checked = true;
    const selectAllLabel = document.createElement('label');
    selectAllLabel.textContent = 'Select All';
    selectAllWrapper.appendChild(selectAllCheckbox);
    selectAllWrapper.appendChild(selectAllLabel);
    content.appendChild(selectAllWrapper);

    // Разделитель
    const divider = document.createElement('hr');
    content.appendChild(divider);

    // Сортируем и добавляем значения
    const sortedValues = [...values].sort((a, b) => a.toString().localeCompare(b.toString()));
    console.log('Sorted values:', sortedValues);

    sortedValues.forEach(value => {
      const wrapper = document.createElement('div');
      wrapper.className = 'filter-checkbox-wrapper';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.addEventListener('change', e => {
        e.stopPropagation();
        this.applyColumnFilter(column, filterIcon);
        const allChecked = [...wrapper.parentElement.querySelectorAll('input[type="checkbox"]')]
          .slice(1)
          .every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
      });

      const label = document.createElement('label');
      label.textContent = value || '(Empty)';

      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      content.appendChild(wrapper);
    });

    // Обработчик "Выбрать все"
    selectAllCheckbox.addEventListener('change', e => {
      e.stopPropagation();
      const checkboxes = content.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        if (cb !== selectAllCheckbox) cb.checked = selectAllCheckbox.checked;
      });
      this.applyColumnFilter(column, filterIcon);
    });

    dropdown.appendChild(content);

    // Добавляем в DOM до позиционирования
    document.body.appendChild(dropdown);

    // Позиционируем дропдаун
    const rect = filterIcon.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();

    // Вычисляем позицию относительно окна
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Определяем начальную позицию (под иконкой)
    let top = rect.bottom;
    let left = rect.left;

    // Проверяем, поместится ли дропдаун снизу
    if (top + dropdownRect.height > viewportHeight) {
      // Если нет - показываем над иконкой
      top = rect.top - dropdownRect.height;
    }

    // Проверяем, не выходит ли за правый край
    if (left + dropdownRect.width > viewportWidth) {
      left = viewportWidth - dropdownRect.width - 10;
    }

    // Проверяем, не выходит ли за левый край
    if (left < 0) {
      left = 10;
    }

    // Учитываем прокрутку страницы
    top += window.scrollY;
    left += window.scrollX;

    // Применяем позиционирование
    Object.assign(dropdown.style, {
      position: 'absolute',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: '10000',
    });

    filterIcon.classList.add('active');

    // Закрытие при клике вне
    const handleOutsideClick = e => {
      if (!dropdown.contains(e.target) && !filterIcon.contains(e.target)) {
        dropdown.remove();
        filterIcon.classList.remove('active');
        document.removeEventListener('click', handleOutsideClick);
      }
    };

    // Предотвращаем немедленное закрытие
    requestAnimationFrame(() => {
      document.addEventListener('click', handleOutsideClick);
    });

    console.log('Dropdown element:', dropdown);
  }

  renderBody() {
    const tbody = document.createElement('tbody');

    this.data.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.id = `row-${index}`;

      // Чекбокс
      const checkboxTd = document.createElement('td');
      checkboxTd.className = 'checkbox-column';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = this.rowMarks[index] === 'true';
      checkbox.onchange = () => this.handleRowCheckbox(index, checkbox.checked);
      checkboxTd.appendChild(checkbox);
      tr.appendChild(checkboxTd);

      // Исходные данные
      Object.values(row).forEach(value => {
        const td = document.createElement('td');
        td.className = 'data-cell';
        td.textContent = value; // Используем полный текст
        td.title = value; // Для показа полного текста при наведении
        tr.appendChild(td);
      });

      // Плейсхолдеры для результатов анализа
      this.columns.forEach(() => {
        const td = document.createElement('td');
        td.className = 'result-cell';
        td.textContent = '...';
        td.style.color = '#999';
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    const existingTbody = this.table.querySelector('tbody');
    if (existingTbody) {
      existingTbody.remove();
    }
    this.table.appendChild(tbody);
  }

  toggleRow(index, checked) {
    if (checked) {
      this.selectedRows.add(index);
    } else {
      this.selectedRows.delete(index);
    }
  }

  toggleAllRows(checked) {
    const selectedCount = Object.values(this.rowMarks).filter(state => state === 'true').length;
    const totalVisible = Object.values(this.rowMarks).filter(state => state !== 'hidden').length;

    if (!checked && selectedCount > 0 && selectedCount < totalVisible) {
      if (!confirm('This will clear your current selection. Continue?')) {
        return;
      }
    }

    const checkboxes = this.table.querySelectorAll('tbody input[type="checkbox"]');
    checkboxes.forEach((checkbox, index) => {
      checkbox.checked = checked;
      if (checked) {
        this.selectedRows.add(index);
        this.rowMarks[index] = 'true';
      } else {
        this.selectedRows.delete(index);
        this.rowMarks[index] = 'false';
      }
    });
  }

  sortByColumn(column) {
    const tbody = this.table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // Находим индекс колонки через заголовки
    const headers = Array.from(this.table.querySelectorAll('thead th'));
    const columnIndex = headers.findIndex(
      th => th.querySelector('.header-content span')?.textContent === column
    );

    if (columnIndex === -1) return;

    // Определяем текущее направление сортировки
    const currentDirection = this.sortDirections?.[column] || 'asc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    this.sortDirections = { ...this.sortDirections, [column]: newDirection };

    rows.sort((a, b) => {
      const aValue = a.cells[columnIndex]?.textContent || '';
      const bValue = b.cells[columnIndex]?.textContent || '';

      // Пробуем сначала как числа
      const aNum = Number(aValue);
      const bNum = Number(bValue);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return newDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Если не числа, сортируем как строки
      return newDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));

    // Обновляем иконку сортировки
    const sortIcon = headers[columnIndex].querySelector('.sort-icon');
    if (sortIcon) {
      sortIcon.innerHTML = newDirection === 'asc' ? '↑' : '↓';
    }
  }

  applyFilters() {
    const tbody = this.table.querySelector('tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    if (!rows.length) return;

    const thead = this.table.querySelector('thead tr');
    if (!thead) return;

    const headerCells = Array.from(thead.cells);

    rows.forEach(row => {
      const rowIndex = Number(row.id.split('-')[1]);
      let show = true;

      Object.entries(this.filters).forEach(([column, allowedValues]) => {
        const columnIndex = headerCells.findIndex(cell => {
          const span = cell.querySelector('.header-content span');
          return span?.textContent === column;
        });

        if (columnIndex !== -1 && row.cells[columnIndex]) {
          const cellText = row.cells[columnIndex].textContent;
          if (!allowedValues.has(cellText)) {
            show = false;
          }
        }
      });

      row.style.display = show ? '' : 'none';
      this.rowMarks[rowIndex] = show ? this.rowMarks[rowIndex] : 'hidden';
    });

    // Обновляем мастер-чекбокс
    const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
    const selectedVisibleRows = visibleRows.filter(
      row => this.rowMarks[Number(row.id.split('-')[1])] === 'true'
    );

    const masterCheckbox = this.table.querySelector('thead input[type="checkbox"]');
    if (masterCheckbox) {
      masterCheckbox.checked =
        visibleRows.length > 0 && selectedVisibleRows.length === visibleRows.length;
    }
  }

  loadData(data) {
    this.data = data;

    // Инициализируем разметку и выбор - все строки выбраны по умолчанию
    this.rowMarks = {};
    this.selectedRows.clear(); // Очищаем старый выбор
    data.forEach((_, index) => {
      this.rowMarks[index] = 'true';
      this.selectedRows.add(index); // Добавляем все строки в выбранные
    });

    if (data.length > 0) {
      this.promptMaster?.setSourceColumns(Object.keys(data[0]));
    }

    this.renderHeader();
    this.renderBody();

    if (this.data.length > 0) {
      this.promptButton.disabled = false;
      this.analyzeButton.disabled = false;
      this.exportXlsxButton.disabled = false;
      this.exportCsvButton.disabled = false;
    }
  }

  updateCell(rowIndex, columnIndex, value, status = 'success') {
    const row = this.table.querySelector(`#row-${rowIndex}`);
    if (!row) return;

    const cells = row.querySelectorAll('td');
    const targetCell = cells[Object.keys(this.data[0]).length + columnIndex];
    if (!targetCell) return;

    targetCell.textContent = value;
    row.className = `${status}-row`;
  }

  markRowAsProcessing(rowIndex) {
    const row = this.table.querySelector(`#row-${rowIndex}`);
    if (row) {
      row.className = 'processing-row';
    }
  }

  markRowAsError(rowIndex, error) {
    const row = this.table.querySelector(`#row-${rowIndex}`);
    if (!row) return;

    // Получаем исходное количество колонок данных
    const sourceColumnsCount = Object.keys(this.data[0]).length;

    // Получаем ячейки только для результатов
    const resultCells = Array.from(row.cells).slice(sourceColumnsCount + 1);

    // Получаем URL из данных строки
    const rowData = this.data[rowIndex];
    const url = rowData['Link to the course'] || '';

    // Формируем сообщение об ошибке с полным URL
    const errorMessage = error.message.replace('[URL from Link to the course column]', url);

    // Заполняем первую ячейку результатов полным сообщением об ошибке
    if (resultCells[0]) {
      resultCells[0].textContent = errorMessage;
      resultCells[0].title = errorMessage; // Добавляем тултип для длинных сообщений
    }

    // Остальные ячейки результатов помечаем как Err
    for (let i = 1; i < resultCells.length; i++) {
      if (resultCells[i]) {
        resultCells[i].textContent = 'Err';
      }
    }

    row.className = 'error-row';
  }

  exportToExcel() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(this.table);
    XLSX.utils.book_append_sheet(wb, ws, 'Analysis Results');
    XLSX.writeFile(wb, 'analysis_results.xlsx');
  }

  exportToCSV() {
    const ws = XLSX.utils.table_to_sheet(this.table);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'analysis_results.csv';
    link.click();
  }

  render(parent) {
    parent.appendChild(this.element);
    return this;
  }

  applyColumnFilter(column, filterIcon) {
    const dropdown = document.querySelector(`.filter-dropdown[data-column="${column}"]`);
    if (!dropdown) {
      console.error('Dropdown not found for column:', column);
      return;
    }

    // Получаем все чекбоксы, кроме "Select All"
    const checkboxWrappers = Array.from(
      dropdown.querySelectorAll('.filter-checkbox-wrapper')
    ).slice(1);
    const allowedValues = new Set();

    // Собираем значения из отмеченных чекбоксов
    checkboxWrappers.forEach(wrapper => {
      const checkbox = wrapper.querySelector('input[type="checkbox"]');
      const label = wrapper.querySelector('label');
      if (checkbox && label && checkbox.checked) {
        allowedValues.add(label.textContent === '(Empty)' ? '' : label.textContent);
      }
    });

    console.log('Allowed values:', allowedValues);

    // Находим индекс колонки
    const columnIndex = Array.from(this.table.querySelectorAll('thead th')).findIndex(
      th => th.dataset.column === column
    );

    if (columnIndex === -1) {
      console.error('Column index not found for:', column);
      return;
    }

    // Обновляем фильтры для этой колонки
    this.filters[column] = allowedValues;

    // Применяем все активные фильтры
    const rows = this.table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      let showRow = true;

      // Проверяем все активные фильтры
      Object.entries(this.filters).forEach(([filterColumn, values]) => {
        const filterColumnIndex = Array.from(this.table.querySelectorAll('thead th')).findIndex(
          th => th.dataset.column === filterColumn
        );

        if (filterColumnIndex !== -1) {
          const cellValue = row.cells[filterColumnIndex]?.textContent || '';
          if (!values.has(cellValue)) {
            showRow = false;
          }
        }
      });

      row.style.display = showRow ? '' : 'none';
      console.log('Row value:', row.cells[columnIndex]?.textContent, 'Show:', showRow);
    });

    // Обновляем состояние главного чекбокса
    this.updateMasterCheckbox();
  }

  updateMasterCheckbox() {
    const visibleRows = Array.from(this.table.querySelectorAll('tbody tr')).filter(
      row => row.style.display !== 'none'
    );
    const selectedVisibleRows = visibleRows.filter(row =>
      this.selectedRows.has(Number(row.id.split('-')[1]))
    );

    const masterCheckbox = this.table.querySelector('thead input[type="checkbox"]');
    if (masterCheckbox) {
      masterCheckbox.checked =
        visibleRows.length > 0 && selectedVisibleRows.length === visibleRows.length;
    }
  }

  clearFilters() {
    this.filters = {};
    const rows = this.table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      row.style.display = '';
    });
    this.updateMasterCheckbox();
  }

  createControls() {
    const controls = document.createElement('div');
    controls.className = 'controls';

    // File input
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.xlsx,.csv';
    this.fileInput.style.display = 'none';

    // Добавляем обработчик загрузки файла
    this.fileInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const data = await this.readFile(file);
        this.loadData(data);
      } catch (error) {
        alert('Error loading file: ' + error.message);
      }
    });

    // Load Data button
    const loadButton = document.createElement('button');
    loadButton.className = 'secondary';
    loadButton.textContent = 'Load Data';
    loadButton.setAttribute('data-icon', '📂');
    loadButton.onclick = () => this.fileInput.click();

    // Generate Prompt button
    const promptButton = document.createElement('button');
    promptButton.className = 'secondary';
    promptButton.textContent = 'Generate Prompt';
    promptButton.setAttribute('data-icon', '✨');
    promptButton.disabled = true;
    promptButton.onclick = async () => {
      if (promptButton.disabled) return;

      try {
        // Получаем текущие значения
        const currentPrompt = document.getElementById('promptTemplate').value;
        const currentColumns = document
          .getElementById('outputColumns')
          .value.trim()
          .split('\n')
          .filter(Boolean);

        if (!currentPrompt) {
          alert('Please enter prompt template first');
          return;
        }

        if (!this.data || this.data.length === 0) {
          alert('Please load data first');
          return;
        }

        // Блокируем кнопку и показываем статус
        promptButton.disabled = true;
        promptButton.classList.add('processing');
        this.updateStatus('Generating improved prompt...', 'processing');

        // Получаем данные таблицы с заголовками
        const tableData = {
          headers: Object.keys(this.data[0]),
          rows: this.data.slice(0, 3),
        };

        // Передаем исходные колонки в промпт мастер
        this.promptMaster.setSourceColumns(tableData.headers);

        // Генерируем улучшенный промпт
        const result = await this.promptMaster.generatePrompt(
          currentPrompt,
          currentColumns,
          tableData
        );

        // Обновляем поля
        document.getElementById('promptTemplate').value = result.prompt;
        document.getElementById('outputColumns').value = result.columns.join('\n');

        // Показываем успешное завершение
        this.updateStatus('Prompt generated successfully!', 'success');
        setTimeout(() => this.clearStatus(), 3000);
      } catch (error) {
        this.updateStatus(`Error: ${error.message}`, 'error');
      } finally {
        // Разблокируем кнопку
        promptButton.disabled = false;
        promptButton.classList.remove('processing');
      }
    };
    this.promptButton = promptButton;

    // Start Analysis button
    const analyzeButton = document.createElement('button');
    analyzeButton.className = 'primary';
    analyzeButton.textContent = 'Analyze';
    analyzeButton.setAttribute('data-icon', '🔍');
    analyzeButton.disabled = true;
    analyzeButton.onclick = async () => {
      try {
        analyzeButton.disabled = true;

        const promptTemplate = document.getElementById('promptTemplate').value;
        if (!promptTemplate) {
          throw new Error('Please enter analysis prompt first');
        }

        // Сохраняем текущие фильтры и состояния строк
        const currentFilters = { ...this.filters };
        const currentMarks = { ...this.rowMarks };

        // Обновляем колонки и делаем рефреш
        const outputColumns =
          document.getElementById('outputColumns')?.value.trim().split('\n') || [];
        this.columns = outputColumns.filter(Boolean);

        // При рефреше восстанавливаем состояния
        this.refreshTable(() => {
          this.filters = currentFilters;
          this.rowMarks = currentMarks;
          this.applyFilters();
        });

        this.analyst.setPrompt(promptTemplate);
        // Передаем разметку в аналитика
        this.analyst.setRowMarks(this.rowMarks);
        await this.startAnalysis();
      } catch (error) {
        alert('Error during analysis: ' + error.message);
      } finally {
        analyzeButton.disabled = false;
      }
    };
    this.analyzeButton = analyzeButton;

    // Refresh Table button
    const refreshButton = document.createElement('button');
    refreshButton.className = 'secondary';
    refreshButton.textContent = 'Refresh Table';
    refreshButton.setAttribute('data-icon', '🔄');
    refreshButton.onclick = () => this.refreshTable();

    // Export XLSX button
    const exportXlsxButton = document.createElement('button');
    exportXlsxButton.className = 'secondary';
    exportXlsxButton.textContent = 'Export Excel';
    exportXlsxButton.setAttribute('data-icon', '📊');
    exportXlsxButton.disabled = true;
    exportXlsxButton.onclick = () => this.exportToExcel();
    this.exportXlsxButton = exportXlsxButton;

    // Export CSV button
    const exportCsvButton = document.createElement('button');
    exportCsvButton.className = 'secondary';
    exportCsvButton.textContent = 'Export CSV';
    exportCsvButton.setAttribute('data-icon', '📄');
    exportCsvButton.disabled = true;
    exportCsvButton.onclick = () => this.exportToCSV();
    this.exportCsvButton = exportCsvButton;

    controls.append(
      this.fileInput,
      loadButton,
      promptButton,
      analyzeButton,
      refreshButton,
      exportXlsxButton,
      exportCsvButton
    );
    return controls;
  }

  // Добавим метод для чтения файла
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

  // Обновляем метод refreshTable
  refreshTable(callback) {
    this.renderHeader();
    this.renderBody();
    if (callback) callback();
  }

  // Метод для обновления статус-бара
  updateStatus(message, type = 'info') {
    this.statusBar.textContent = message;
    this.statusBar.className = `status-bar ${type}`;
    this.statusBar.style.display = 'block';
  }

  // Метод для скрытия статус-бара
  clearStatus() {
    this.statusBar.style.display = 'none';
  }

  async startAnalysis() {
    try {
      if (!this.settings?.analysisProvider) {
        throw new Error('Analysis provider not configured. Please check your settings.');
      }

      // Сохраняем текущий промпт
      this.promptMaster.saveCurrentPrompt(
        document.getElementById('promptTemplate').value,
        document.getElementById('outputColumns').value.split('\n')
      );

      // Запускаем анализ только для выбранных строк
      const results = [];
      let shouldContinue = true;

      for (let i = 0; i < this.data.length; i++) {
        if (!shouldContinue || this.rowMarks[i] !== 'true') continue;

        try {
          const result = await this.analyzeRow(this.data[i], i);
          results.push(result);

          // После 3-х строк проверяем результаты
          if (results.length === 3) {
            if (this.promptMaster.checkInitialResults(results)) {
              // Останавливаем анализ и пробуем регенерировать промпт
              const newPrompt = await this.promptMaster.regeneratePromptAfterError(
                document.getElementById('promptTemplate').value,
                document.getElementById('outputColumns').value.split('\n'),
                { headers: Object.keys(this.data[0]), rows: this.data.slice(0, 3) }
              );
              
              // Обновляем промпт и перезапускаем анализ
              document.getElementById('promptTemplate').value = newPrompt.prompt;
              shouldContinue = false; // Останавливаем текущий цикл
              return this.startAnalysis(); // Рекурсивный перезапуск
            }
          }
        } catch (error) {
          console.error(`Error analyzing row ${i}:`, error);
          this.markRowAsError(i, error);
          results.push({ error: error.message });
        }
      }

      return results;
    } catch (error) {
      if (error.message.includes('3 попыток')) {
        alert(error.message);
      }
      throw error;
    }
  }

  async analyzeRow(row, index) {
    try {
      this.markRowAsProcessing(index);
      
      // Подготавливаем промпт с подстановкой значений
      let filledPrompt = document.getElementById('promptTemplate').value;
      Object.entries(row).forEach(([key, value]) => {
        filledPrompt = filledPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
      });

      // Получаем ответ от модели
      const response = await this.settings.analysisProvider.generateResponse(filledPrompt);

      try {
        // Извлекаем JSON из ответа
        const jsonStr = this.extractJsonFromResponse(response);
        // Пытаемся распарсить JSON
        const result = JSON.parse(jsonStr);
        
        // Обновляем ячейки результатов
        Object.entries(result).forEach(([key, value], colIndex) => {
          this.updateCell(index, colIndex + 1, value);
        });

        return result;
      } catch (parseError) {
        console.error('Raw response:', response);
        console.error('Parse error:', parseError);
        throw new Error(`Failed to parse model response as JSON: ${parseError.message}`);
      }
    } catch (error) {
      console.error(`Error in analyzeRow(${index}):`, error);
      this.markRowAsError(index, error);
      throw error;
    }
  }

  // Добавляем метод для извлечения JSON из ответа
  extractJsonFromResponse(response) {
    try {
      // Убираем markdown-обертки для кода
      let jsonStr = response.replace(/```(json)?/g, '').trim();
      
      // Находим первую { и последнюю }
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      
      if (startIdx === -1 || endIdx === -1) {
        throw new Error('No JSON object found in response');
      }
      
      // Извлекаем только JSON-часть
      jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      
      // Заменяем некорректные кавычки если есть
      jsonStr = jsonStr.replace(/[""]/g, '"');
      
      // Удаляем возможные экранированные переносы строк
      jsonStr = jsonStr.replace(/\\n/g, ' ');
      
      // Удаляем комментарии если есть
      jsonStr = jsonStr.replace(/\/\/.*/g, '');
      
      return jsonStr;
    } catch (error) {
      console.error('Error extracting JSON:', error);
      throw new Error(`Failed to extract JSON from response: ${error.message}`);
    }
  }

  // Методы для работы с чекбоксами
  handleMasterCheckbox(e) {
    this.toggleAllRows(e.target.checked);
  }

  handleRowCheckbox(index, checked) {
    if (checked) {
      this.selectedRows.add(index);
      this.rowMarks[index] = 'true';
    } else {
      this.selectedRows.delete(index);
      this.rowMarks[index] = 'false';
    }
  }

  // Добавляем новые методы, не трогая существующие
  updateFilteredRows(filteredIndexes) {
    // Сохраняем текущие состояния видимых строк
    const previousStates = { ...this.rowMarks };

    // Обновляем состояния
    Object.keys(this.rowMarks).forEach(index => {
      if (!filteredIndexes.includes(Number(index))) {
        this.rowMarks[index] = 'hidden';
      } else {
        // Восстанавливаем предыдущее состояние или ставим true по умолчанию
        this.rowMarks[index] = previousStates[index] || 'true';
      }
    });
  }

  // Добавляем метод заполнения NA
  fillRowNA(rowIndex) {
    const result = {};
    this.columns.forEach(column => {
      result[column] = 'NA';
    });
    this.updateRow(rowIndex, result);
  }

  // Добавляем метод обновления настроек
  updateSettings(settings) {
    this.settings = settings;
    if (settings?.analysisProvider) {
      console.log('Analysis provider updated:', settings.analysisProvider.name);
    } else {
      console.warn('No analysis provider in settings');
    }
  }

  // Модифицируем метод подготовки данных для экспорта
  prepareDataForExport() {
    return this.data.map((row, index) => ({
      ...row,
      ...this.getAnalysisResults(index),
      Selected: this.rowMarks[index] || 'false',
    }));
  }
}
