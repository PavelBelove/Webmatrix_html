import { settingsStorage } from '../utils/storage';
import { LLMProviderFactory } from '../utils/api';

export class Analyst {
  constructor(table) {
    this.table = table;
    this.provider = null;
    this.prompt = '';
    this.isProcessing = false;
    this.rowMarks = null;
  }

  setRowMarks(marks) {
    this.rowMarks = marks;
  }

  async processTable(data) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    if (!this.prompt) {
      throw new Error('Analysis prompt not set');
    }

    if (!this.rowMarks) {
      throw new Error('Row marks not set');
    }

    this.isProcessing = true;
    const totalRows = Object.values(this.rowMarks).filter(mark => mark === 'true').length;
    let processedRows = 0;
    const startTime = Date.now();

    try {
      for (let i = 0; i < data.length; i++) {
        if (!this.isProcessing) break;

        if (this.rowMarks[i] === 'true') {
          await this.processRow(data[i], i);
          processedRows++;

          if (processedRows % 10 === 0) {
            this.updateProgress(processedRows, totalRows, startTime);
          }
        } else {
          this.table.fillRowNA(i);
        }
      }
    } finally {
      this.isProcessing = false;
      this.showFinalStats(totalRows, startTime);
    }
  }

  async processRow(row, index) {
    try {
      this.table.markRowAsProcessing(index);
      const prompt = this.preparePrompt(row);
      const response = await this.provider.generateResponse(prompt);

      const result = this.parseResponse(response);
      this.table.updateRow(index, result);

      return {
        success: true,
        rowIndex: index,
        result,
      };
    } catch (error) {
      this.table.markRowAsError(index, error.message);
      return {
        success: false,
        rowIndex: index,
        error: error.message,
      };
    }
  }

  parseResponse(response) {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return this.createErrorResult(response);
    }

    let jsonStr = jsonMatch[0];

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      try {
        jsonStr = this.fixCommonJsonErrors(jsonStr);
        return JSON.parse(jsonStr);
      } catch (e2) {
        return this.createErrorResult(response);
      }
    }
  }

  fixCommonJsonErrors(jsonStr) {
    return jsonStr
      .replace(/(?<!\\)(?:\\{2})*"([^"]*?)(?<!\\)(?:\\{2})*"/g, (match, content) => {
        return `"${content.replace(/(?<!\\)"/g, '\\"')}"`;
      })
      .replace(/'/g, '"')
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/}(\s*){/g, '},{')
      .replace(/](\s*)\[/g, '],[')
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*(undefined|NaN)\s*([,}])/g, ':null$2')
      .replace(/\\([^"\\\/bfnrtu])/g, '$1');
  }

  createErrorResult(rawResponse) {
    const expectedColumns =
      this.prompt
        .match(/JSON.*?{([^}]+)}/s)?.[1]
        ?.split('\n')
        .map(line => line.trim())
        .filter(line => line.includes(':'))
        .map(line => line.split(':')[0].trim().replace(/['"]/g, ''))
        .filter(Boolean) || [];

    const result = {};

    if (expectedColumns.length > 0) {
      result[expectedColumns[0]] = rawResponse.slice(0, 500);
    }

    expectedColumns.slice(1).forEach(column => {
      result[column] = 'Err';
    });

    return result;
  }

  updateProgress(processedRows, totalRows, startTime) {
    if (!startTime) return;

    const elapsed = (Date.now() - startTime) / 1000;
    const progress = processedRows / totalRows;
    const estimatedTotal = elapsed / progress;
    const remaining = estimatedTotal - elapsed;

    this.table.updateStatus(
      `Processing: ${processedRows}/${totalRows} rows ` +
        `(${Math.round(progress * 100)}%) | ` +
        `Elapsed: ${Math.round(elapsed)}s | ` +
        `Estimated remaining: ${Math.round(remaining)}s`,
      'processing'
    );
  }

  showFinalStats(totalRows, startTime) {
    if (!startTime) return;

    const totalTime = (Date.now() - startTime) / 1000;
    this.table.updateStatus(
      `Analysis complete! Processed ${totalRows} rows in ${Math.round(totalTime)}s`,
      'success'
    );
    setTimeout(() => this.table.clearStatus(), 5000);
  }

  stop() {
    this.isProcessing = false;
  }

  updateProvider(settings) {
    if (!settings?.provider) {
      console.error('No provider in settings');
      return;
    }
    this.provider = settings.provider;
  }

  setPrompt(prompt) {
    this.prompt = prompt;
  }

  preparePrompt(row) {
    return this.prompt.replace(/{{(\w+)}}/g, (match, field) => row[field] || match);
  }
}
