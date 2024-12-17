import { presetsStorage } from '../utils/storage';

export class PromptMaster {
  constructor() {
    this.currentPreset = null;
    this.provider = null;
  }

  updateProvider(settings) {
    if (!settings?.provider) {
      console.error('No provider in settings');
      return;
    }
    console.log('Updating PromptMaster provider:', settings.provider.name);
    this.provider = settings.provider;
  }

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

  async generatePrompt(request) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const prompt = `Help me create a prompt for analyzing text data. 
User request: "${request}"

Create a prompt template that:
1. Clearly explains the task
2. Specifies exact JSON format for output
3. Uses {{value}} placeholder for input text
4. Includes instructions for consistent output

Return JSON with:
{
  "prompt": "the analysis prompt",
  "columns": ["list", "of", "output", "columns"]
}`;

    try {
      const response = await this.provider.generateResponse(prompt);
      const result = JSON.parse(response);
      return {
        prompt: result.prompt,
        columns: result.columns,
      };
    } catch (error) {
      console.error('Error generating prompt:', error);
      throw new Error('Failed to generate prompt. Please try again or use manual input.');
    }
  }

  // ... остальные методы ...
}
