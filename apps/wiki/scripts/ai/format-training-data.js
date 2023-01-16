import {capitalizeAllWords, isAllCaps} from '../../utils.js';
import {getTrainingItems} from '../../datasets/dataset-specs.js';

//

const _run = async (req, res) => {
  const items = await getTrainingItems();
  process.stdout.write(
    items.map(item => JSON.stringify(item))
      .join('\n')
  );
};
_run();