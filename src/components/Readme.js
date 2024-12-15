import { Spoiler } from './Spoiler';
import '../styles/components/readme.css';

export default class Readme {
  constructor() {
    this.currentLang = 'en';
    this.template = {
      en: {
        title: '🤖 WebMatrix',
        subtitle: 'Smart Data Analysis Assistant',
        intro:
          'Hi there! WebMatrix is a compact tool that helps automate routine work with tables, search, and data analysis using AI. Just open the file in your browser, upload a table, and describe in plain words what you need to find or analyze.',
        features: [
          '✨ No installation required',
          '🔒 Your data stays local',
          '⚡ Quick results',
          '📊 One-click analysis',
          '🔄 Works in background',
          "💻 Won't disrupt your workflow",
          '💬 Built-in AI assistant',
          '🔄 Interactive result analysis',
          '📝 Data-driven prompt improvement',
        ],
        capabilities: {
          title: '🎯 What can WebMatrix do?',
          cases: [
            {
              title: 'Company Analysis',
              description:
                'Automatically researches websites, finds key information about business scale, operations, and specialization',
            },
            {
              title: 'Data Processing',
              description:
                'Classifies, categorizes, and enriches tabular data with additional insights',
            },
            {
              title: 'Automation',
              description: "Uses AI to handle routine table tasks that you'd normally do manually",
            },
            {
              title: 'Validation',
              description:
                'Checks data against specified criteria, identifies discrepancies and finds supporting evidence',
            },
            {
              title: 'Interactive Analysis',
              description:
                'Discusses results with AI, helps improve prompts and uncovers hidden patterns in data',
            },
          ],
        },
        howItWorks: {
          title: '🔄 How does it work?',
          steps: [
            '1️⃣ Upload your data table (e.g., a list of companies to analyze)',
            '2️⃣ Describe what you need to find or verify in plain English',
            '3️⃣ WebMatrix creates optimal AI query and response columns',
            '4️⃣ AI analyzes data and adds results to your table',
            '5️⃣ Discuss results with AI assistant to improve quality and find patterns',
          ],
        },
        recipes: {
          title: '📚 Ready-made recipes',
          items: [
            {
              title: '🔍 B2B Company Analysis',
              description: 'Automatically determines:',
              list: [
                'Business size and geography',
                'Main areas of operation',
                'Potential for collaboration',
                'Indicators of international trade',
              ],
              prompt: `Analyze the company:
• Scale of international operations
• Presence of currency operations
• Potential as a B2B client
• Main regions of presence`,
            },
            {
              title: '📋 Keyword Improvement',
              description: 'Searches for key phrases in "good" signals',
              list: ['Reads high-quality signals', 'Finds key phrases', 'Creates a list'],
              prompt: `Read the article and find key phrases that can be used to find similar news on Google:
 - Startup attracted investments.
 - Operates in the {{industry}} industry.
 - Has a distributed team.
{{article_text}}`,
            },
            {
              title: '📊 Data Enrichment',
              description: 'Enriches tables with information:',
              list: [
                'Descriptions from open sources',
                'Categorization by criteria',
                'Potential assessment',
                'Identifying features',
              ],
              prompt: `Enrich the data about the company:
• Brief business description
• Main areas of operation
• Annual revenue assessment
• Country of the main office location`,
            },
          ],
        },
        assistant: {
          title: '💬 AI assistant',
          features: [
            'Analysis of the entire table for pattern discovery',
            'Checking results for errors and hallucinations',
            'Data-driven prompt improvement',
            'Generating key phrases for search',
            'Creating summaries of results',
          ],
          examples: [
            {
              title: '📊 Analysis results',
              description: 'After processing the data, ask:',
              prompt: `"Analyze the results and find:
• Companies with the highest potential
• Common characteristics of successful cases
• Possible false positives
• What can be improved in the prompt"`,
            },
            {
              title: '🔍 Improvement of search',
              description: 'Upload successful cases and ask:',
              prompt: `"Based on these successful findings:
- Create a list of key phrases for searching similar signals
- Find common traits in descriptions and news
- Identify common features of websites"`,
            },
            {
              title: '👥 Role-play scenarios',
              description: 'Use specialized roles:',
              prompt: `"You are the CEO of a fintech company, looking for partners.
Look at the analysis results and:
- Evaluate the attractiveness of the found companies
- Point out what to pay attention to during the first contact
- Suggest how to improve the search potential"`,
            },
          ],
        },
        tips: {
          title: '💡 Useful tips',
          sections: [
            {
              title: '🎯 Analysis accuracy',
              items: [
                'Use specific evaluation criteria',
                'Specify priority parameters',
                'Ask for confirmation of conclusions with links',
                "Don't ask too many questions in one go",
                'Explicitly specify models what and how they should do',
                "Manually analyze the first lines and compare the model's answers with expected ones",
              ],
            },
            {
              title: '⚡ Work speed',
              items: [
                'Save successful prompts',
                'The Magic button can be used multiple times',
                'Monitor the first results and adjust the prompt',
                'In "incognito" mode, it can work in multiple instances with different API keys',
              ],
            },
            {
              title: '📈 Improvement of results',
              items: [
                'Check the first results',
                'Adjust the prompt as needed',
                'Specify typical model errors in the prompt',
                'Use AI to improve prompts based on data',
                'Always remember: Models lie very convincingly.',
              ],
            },
            {
              title: '💬 Working with chat',
              items: [
                'Use chat to check results for errors',
                'Create specialized roles for specific tasks',
                'Analyze the entire table at once for pattern discovery',
                'Generate key phrases based on successful findings',
                'Discuss results from different perspectives (analyst, client, lead)',
              ],
            },
          ],
        },
        quickStart: {
          title: '🚀 Quick start',
          steps: [
            {
              title: '1️⃣ Get API key',
              description: 'It will take literally a minute:',
              list: [
                'Open makersuite.google.com',
                'Click "Create API Key"',
                'Save the key in a secure place',
              ],
            },
            {
              title: '2️⃣ Run WebMatrix',
              description: 'Open the file in your browser',
              list: [],
            },
          ],
        },
      },
    };
  }

  render(container) {
    const content = this.template[this.currentLang];
    const mainSpoiler = new Spoiler('📖 README');

    const readmeContent = `
      <div class="readme-container">
        <h1>${content.title}</h1>
        
        <div class="intro-section">
          <h2>${content.subtitle}</h2>
          
          <p class="intro-text">
            ${content.intro}
          </p>

          <div class="key-features">
            ${content.features
              .map(
                feature => `
              <div class="feature">${feature}</div>
            `
              )
              .join('')}
          </div>
        </div>

        <div id="capabilities-section"></div>
        <div id="how-it-works-section"></div>
        <div id="recipes-section"></div>
        <div id="assistant-section"></div>
        <div id="tips-section"></div>
        <div id="quick-start-section"></div>
      </div>
    `;

    mainSpoiler.setContent(readmeContent);
    mainSpoiler.render(container);

    // Рендерим каждую секцию как отдельный спойлер
    this.renderCapabilities(content.capabilities, document.getElementById('capabilities-section'));
    this.renderHowItWorks(content.howItWorks, document.getElementById('how-it-works-section'));
    this.renderRecipes(content.recipes, document.getElementById('recipes-section'));
    this.renderAssistant(content.assistant, document.getElementById('assistant-section'));
    this.renderTips(content.tips, document.getElementById('tips-section'));
    this.renderQuickStart(content.quickStart, document.getElementById('quick-start-section'));
  }

  renderCapabilities(capabilities, container) {
    const spoiler = new Spoiler(capabilities.title);
    const content = `
      <div class="cases-grid">
        ${capabilities.cases
          .map(
            item => `
          <div class="case">
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
        `
          )
          .join('')}
      </div>
    `;
    spoiler.setContent(content);
    spoiler.render(container);
  }

  renderHowItWorks(howItWorks, container) {
    const spoiler = new Spoiler(howItWorks.title);
    const content = `
      <div class="steps">
        ${howItWorks.steps
          .map(
            step => `
          <div class="step">
            <p>${step}</p>
          </div>
        `
          )
          .join('')}
      </div>
    `;
    spoiler.setContent(content);
    spoiler.render(container);
  }

  renderRecipes(recipes, container) {
    const spoiler = new Spoiler(recipes.title);
    const content = `
      <div class="recipe-cards">
        ${recipes.items
          .map(
            recipe => `
          <div class="recipe">
            <h3>${recipe.title}</h3>
            <p class="recipe-desc">${recipe.description}</p>
            <ul>
              ${recipe.list.map(item => `<li>${item}</li>`).join('')}
            </ul>
            <div class="recipe-prompt">
              <p>Example query:</p>
              <pre>${recipe.prompt}</pre>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
    spoiler.setContent(content);
    spoiler.render(container);
  }

  renderAssistant(assistant, container) {
    const spoiler = new Spoiler(assistant.title);
    const content = `
      <div class="chat-features">
        <h3>Chat capabilities</h3>
        <ul>
          ${assistant.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>

        <h3>Examples of use</h3>
        ${assistant.examples
          .map(
            example => `
          <div class="chat-example">
            <h4>${example.title}</h4>
            <p>${example.description}</p>
            <pre>${example.prompt}</pre>
          </div>
        `
          )
          .join('')}
      </div>
    `;
    spoiler.setContent(content);
    spoiler.render(container);
  }

  renderTips(tips, container) {
    const spoiler = new Spoiler(tips.title);
    const content = `
      <div class="tips-grid">
        ${tips.sections
          .map(
            section => `
          <div class="tip">
            <h3>${section.title}</h3>
            <ul>
              ${section.items.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        `
          )
          .join('')}
      </div>
    `;
    spoiler.setContent(content);
    spoiler.render(container);
  }

  renderQuickStart(quickStart, container) {
    const spoiler = new Spoiler(quickStart.title);
    const content = `
      <div class="setup-steps">
        ${quickStart.steps
          .map(
            step => `
          <div class="step">
            <h3>${step.title}</h3>
            <p>${step.description}</p>
            ${
              step.list.length > 0
                ? `
              <ol>
                ${step.list.map(item => `<li>${item}</li>`).join('')}
              </ol>
            `
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>
    `;
    spoiler.setContent(content);
    spoiler.render(container);
  }
}
