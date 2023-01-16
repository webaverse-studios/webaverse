import {
  getDatasetSpecs,
} from './dataset-specs.js';
import {DatasetEngine} from './dataset-engine.js';
import {Ctx} from '../clients/context.js';

export const generateItem = async (type, name = '', description = '') => {
  const datasetSpecs = await getDatasetSpecs();
  const datasetSpec = datasetSpecs.find(ds => ds.type === type);
  if (datasetSpec) {
    const ctx = new Ctx();
    const datasetEngine = new DatasetEngine({
      dataset: datasetSpec,
      aiClient: ctx.aiClient,
    });
    const generatedItem = await datasetEngine.generateItem(name, description);
    return generatedItem;
  } else {
    throw new Error('unknown dataset: ' + type);
  }
};