import { presetsStorage } from '../utils/storage';

// Метапромпт из монолита
const META_PROMPT = `CRITICAL REQUIREMENTS:
Your response MUST be at least 3000 characters and STRICTLY follow the format below.
Any deviation from the format will cause system errors.

<INSTRUCTIONS>
You are an expert in creating prompts for data analysis. Your task is to create a detailed prompt that will be used by an AI model for line-by-line data analysis in an automated system.

The prompt you create will be used as a template, where values from columns marked as {{column_name}} will be automatically substituted.
Some columns are filled with data - this is the source material, refer to them in the prompt if the data will help the model in analysis.
Other columns (optionally) will be filled with "Pending..." - these columns are intended for model responses, list them at the end of the answer. You can add columns for responses if necessary, but no more than 10 questions to the model.
The prompt must contain questions for the model corresponding to each response column, and require answers in json format, without additional text (the response is processed by the program)
Give detailed, comprehensive instructions for the model, with examples and explanations of how to handle non-standard situations.

Available data context:
{{TABLE_CONTEXT}}

User task description:
"{{USER_TASK}}"

TABLE STRUCTURE HANDLING:
1. Analyze the provided table structure:
   - Columns with data are your input variables - reference them using {{column_name}}
   - Columns with "Pending..." are reserved for model responses
   - You can suggest better column names or additional columns for responses
   - Remove columns that don't match the analysis task
   - Maximum 10 response columns total

2. Column Usage Rules:
   - Input columns: Use as variables in prompt, e.g., "analyze {{website}}"
   - Response columns: Must match JSON fields in model's response
   - The number and order of columns must STRICTLY correspond to the number and order of fields in the JSON response from the analyst model, otherwise there will be parsing issues.
   - JSON structure must be flat (no nested objects)
   - Column names: use only letters, numbers, and underscores

3. Response Format:
   - JSON fields will be mapped to columns in order
   - Each field in JSON must correspond to a column in COLUMNS section
   - Do not include input columns in COLUMNS section
   - List only columns needed for model's response

</INSTRUCTIONS>

<PROMPT REQUIREMENTS>

1. Prompt structure must contain:
   - Clear description of analysis task
   - Detailed data processing instructions
   - Questions and tasks for the model
   - Result validation rules
   - Response formats for different situations
   - Examples of good and bad responses, example response for errors or non-standard situations
   - Write prompt in English unless user explicitly requested another language

2. Data handling rules for the model:
   - Reference available columns through {{column_name}}
   - Strip URLs of protocols and www, try accessing site again once if failed
   - Check availability of data sources
   - Validate input data
   - Make no assumptions when data is missing

3. JSON response format for model:
   - Flat structure only (no nested objects or arrays)
   - Numerical ratings on 0-10 scale
   - Text fields for descriptions and comments
   - "N/A" for missing data
   - Mandatory field for errors/issues description

4. Mandatory response examples in composed prompt
   - Successful response example
   - Limited data example
   - Non-standard situation response example

5. Special instructions:
   - Do not use personal data (contacts, names) unless explicitly required by the task
   - Avoid binary assessments (yes/no), use 0-10 scale
   - Always indicate data source
   - Describe reasons for low ratings
   - Note uncertainty in data

6. Must include in prompt:
    - Set model role based on task and data type
    - Requirement not to make assumptions, write either verified data or report verification impossibility
    - If task requires visiting sites, give explicit instruction for model to visit site and reference URL column
    - Questions and tasks for model
    - 3 JSON response examples - good analysis result, negative and response for non-standard situation
    - Requirement to respond strictly in specified JSON structure and explanation that data is parsed by program

7. User interaction instructions:
   - Prompt must be written in English unless user requested another language
   - If you received a valid prompt in another language - translate it to English
   - User can write instructions both for you and for inclusion in prompt. Distinguish them and process correctly

REMEMBER, excessive prompt is better than insufficient. Success of large data volume analysis depends on quality of your work. Write detailed prompt as if writing instruction for human.

</PROMPT REQUIREMENTS>

<COMPLETE_RESPONSE_EXAMPLE>
Here's an example of a complete, properly formatted response:

===PROMPT_START===
PROMPT:
You are an experienced financial analyst evaluating companies for potential fintech service sales. Your task is to analyze the company's website and determine if they could benefit from international payment solutions.

NALYSIS INSTRUCTIONS:
1. Website Access:
    - Try opening site {{website}} without http/https/www
    - Make one retry attempt if failed
    - Return error response if site remains inaccessible

2. Company Analysis:
    - Determine exact name and business type
    - Assess operation scale and geographic presence
    - Analyze current financial services and international activities
    - Find evidence of cross-border operations

3. Potential Assessment:
    - Rate international presence (0-10)
    - Rate technical readiness (0-10)
    - Rate target profile match (0-10)

4. Evidence Collection:
    - Check About/Services sections
    - Look for international operations mentions
    - Find international office locations
    - Document specific countries/regions
    - Save URLs with evidence

5. Data Validation:
    - Use only publicly available information
    - Make no assumptions without evidence
    - Note any uncertainty in assessments
    - Indicate data sources
    - Document any access issues

RESPONSE FORMAT:
Return strictly JSON format without additional text:

{
    "company_name": "Exact name or domain",
    "has_international_offices": boolean,
    "has_currency_exchange": boolean,
    "has_money_transfer": boolean,
    "sales_potential": number (0-5),
    "estimated_yearly_fx_volume": "Estimate or N/A",
    "locations": "List of countries/regions or N/A",
    "company_summary": "Brief description up to 300 characters",
    "lead_quality_notes": "Important observations, limitations",
    "proof_url": "URL with evidence or N/A"
}

RESPONSE EXAMPLES:

Successful analysis:
{
    "company_name": "Global Trade Solutions",
    "has_international_offices": true,
    "has_currency_exchange": true,
    "has_money_transfer": true,
    "sales_potential": 5,
    "estimated_yearly_fx_volume": ">$10M",
    "locations": "USA, EU, Asia",
    "company_summary": "Large trading platform with developed international infrastructure",
    "lead_quality_notes": "High potential, ready infrastructure, active international operations",
    "proof_url": "globaltrade.com/about"
}

Limited data:
{
    "company_name": "Local Shop",
    "has_international_offices": false,
    "has_currency_exchange": false,
    "has_money_transfer": false,
    "sales_potential": 1,
    "estimated_yearly_fx_volume": "N/A",
    "locations": "Local only",
    "company_summary": "Local shop without international presence",
    "lead_quality_notes": "Limited potential, no signs of international operations",
    "proof_url": "localshop.com"
}

Error:
{
    "company_name": "N/A",
    "has_international_offices": false,
    "has_currency_exchange": false,
    "has_money_transfer": false,
    "sales_potential": 0,
    "estimated_yearly_fx_volume": "N/A",
    "locations": "N/A",
    "company_summary": "Site inaccessible",
    "lead_quality_notes": "Error: [exact problem description]",
    "proof_url": "N/A"
}
===PROMPT_END===
===COLUMNS_START===
company_name
has_international_offices
has_currency_exchange
has_money_transfer
sales_potential
estimated_yearly_fx_volume
locations
company_summary
lead_quality_notes
proof_url
===COLUMNS_END===
</COMPLETE_RESPONSE_EXAMPLE>

<PROMPT_REQUIREMENTS>
Your prompt MUST include:
1. Clear definition of model's role
2. Detailed step-by-step analysis instructions
3. Specific data processing and validation rules
4. Exact JSON response format specification
5. Three complete response examples (success, limited, error)
6. Instructions for handling non-standard situations

Prompt must be comprehensive and self-contained, minimum 3000 characters.
</PROMPT_REQUIREMENTS>

<RESPONSE_FORMAT_RULES>
1. Response must exactly match COMPLETE_RESPONSE_EXAMPLE format
2. Prompt section must be at least 3000 characters
3. Must have up to 10 specified output columns
4. No explanatory text outside specified sections
5. Column names must exactly match specification
6. JSON format must exactly match examples
7. Special instructions:
   - Don't use personal data (contacts, names) unless task explicitly requires it
   - Avoid binary assessments (yes/no), use 0-10 scale
   - Always indicate data source
   - Describe reasons for low ratings
   - Note uncertainty in data

8. Must include in prompt:
    - Set model role based on task and data type
    - Requirement not to make assumptions, write either verified data or report verification impossibility
    - If task requires visiting sites, give explicit instruction for model to visit site and reference URL column
    - Questions and tasks for model
    - 3 json response examples - good analysis result, negative and response for non-standard situation
    - Requirement to respond strictly in specified Json structure and explanation that data is parsed by program
    - References to data column names in double curly braces {{}}, needed by model for analysis. But not including column names with "Pending...". If column contains url - give direct instruction to visit it.

IMPORTANT:
- Don't include existing columns from input data
- Don't add explanations after COLUMNS_END or before prompt - your response is processed by program
- Use only letters, numbers and underscores in column names
- Your response must contain only prompt between ===PROMPT_START=== and ===PROMPT_END=== and columns section between ===COLUMNS_START=== and ===COLUMNS_END=== separators, this is critically important
- Don't add anything to response except prompt and columns section at the end!
- Write prompt in English unless user requested another language

CRITICALLY IMPORTANT:
Write prompt in full compliance with response format and CAREFULLY follow all instructions, and require the same from the model.
Remember that prompt will be used by automated analysis system, and your mistake could be very costly, while energy for erroneous analysis will leave carbon footprint unnecessarily.

REMEMBER, excessive prompt is better than insufficient. Success of large data volume analysis depends on quality of your work. Write detailed prompt as if writing instruction for human.

</RESPONSE_FORMAT_RULES>`;

export class PromptMaster {
  constructor() {
    this.currentPreset = null;
    this.provider = null;
    this.sourceColumns = [];
  }

  updateProvider(settings) {
    if (!settings?.provider) {
      console.error('No provider in settings');
      return;
    }
    console.log('Updating PromptMaster provider:', settings.provider.name);
    this.provider = settings.provider;
  }

  // Сохраняем исходные колонки при загрузке данных
  setSourceColumns(columns) {
    this.sourceColumns = columns;
  }

  async generatePrompt(currentPrompt, currentColumns, tableData) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    if (!tableData || !tableData.headers || !tableData.rows || tableData.headers.length === 0) {
      throw new Error('Table data is required');
    }

    // Формируем контекст таблицы с примером данных
    const tableContext = `Available input columns (use as {{column_name}} in prompt):
${this.sourceColumns.join(', ')}

Sample data (first 3 rows):
${tableData.rows.map(row => JSON.stringify(row, null, 2)).join('\n')}`;

    // Формируем текущий шаблон
    const currentTemplate = `Current prompt template:
${currentPrompt}

Current output columns:
${currentColumns.join('\n')}`;

    // Подставляем данные в метапромпт
    const fullPrompt = META_PROMPT.replace('{{TABLE_CONTEXT}}', tableContext).replace(
      '{{USER_TASK}}',
      currentTemplate
    );

    try {
      const response = await this.provider.generateResponse(fullPrompt);

      // Парсим ответ
      const promptMatch = response.match(/===PROMPT_START===([\s\S]*?)===PROMPT_END===/);
      const columnsMatch = response.match(/===COLUMNS_START===([\s\S]*?)===COLUMNS_END===/);

      if (!promptMatch || !columnsMatch) {
        throw new Error('Invalid response format');
      }

      const prompt = promptMatch[1].trim();
      const columns = columnsMatch[1]
        .trim()
        .split('\n')
        .map(col => col.trim());

      return {
        prompt,
        columns,
      };
    } catch (error) {
      console.error('Error generating prompt:', error);
      throw new Error('Failed to generate prompt. Please try again or use manual input.');
    }
  }

  // Методы для работы с пресетами оставляем, они нужны
  savePreset(name, request, prompt, columns) {
    const preset = {
      request,
      prompt,
      columns,
      timestamp: Date.now(),
    };
    presetsStorage.set(name, preset);
    this.currentPreset = preset;
  }

  loadPreset(name) {
    const preset = presetsStorage.get(name);
    if (preset) {
      this.currentPreset = preset;
      return preset;
    }
    return null;
  }

  getCurrentPreset() {
    return this.currentPreset;
  }

  getAllPresets() {
    return presetsStorage.getAll();
  }
}
