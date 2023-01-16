// import Alea from 'alea';
import {
  formatDatasetNamePrompt,
  formatDatasetDescriptionPrompt,
  formatDatasetAttributePrompts,
} from './dataset-parser.js';

const stops = [
  '\n\n',
  '@Type',
  '\n#'
];

export class DatasetEngine {
  constructor({
    dataset,
    aiClient,
  }) {
    this.dataset = dataset;
    this.aiClient = aiClient;
  }
  async generateItem(name = '', description = '') {
    const {
      nameKey,
      descriptionKey,
      // attributeKeys,
    } = this.dataset;

    if (!name) {
      const namePrompt = formatDatasetNamePrompt(this.dataset);
      // console.log('got name prompt', {namePrompt});
      name = await this.aiClient.generate(namePrompt, stops);
      name = name.trim();
    }
    if (!description) {
      const descriptionPrompt = formatDatasetDescriptionPrompt(this.dataset, name);
      // console.log('got description prompt', {descriptionPrompt});
      description = await this.aiClient.generate(descriptionPrompt, stops);
      description = description.trim();
    }

    const attributes = {
      [nameKey]: name,
      [descriptionKey]: description,
    };
    const attributePrompts = formatDatasetAttributePrompts(this.dataset, name, description);
    await Promise.all(attributePrompts.map(async attributePromptSpec => {
      const {
        key: attributeName,
        prompt: attributePrompt,
      } = attributePromptSpec;
      let attributeValue = await this.aiClient.generate(attributePrompt, stops);
      attributeValue = attributeValue.trim();
      attributes[attributeName] = attributeValue;
    }));

    return attributes;

    /* if (this.dataset.items.length > 0) {
      const item0 = this.dataset.items[0];

      const prompt = this.dataset.generateItemPrompt(name);
      const result = await this.aiClient.generate(prompt, '\n\n');
      
      const response = `##${result}`;
      const fullResponse = `# ${name}\n${response}`;
      const parsedResponse = parseItems(fullResponse)[0] ?? null;
      
      return {
        prompt,
        response,
        parsedResponse,
      };
    } else {
      throw new Error(`dataset has no items: ${this.dataset}`);
    } */
  }
}