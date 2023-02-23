import uuidByString from 'uuid-by-string';
// import Markdown from 'marked-react';

import styles from '../../../styles/Character.module.css'
import {Ctx} from '../../../clients/context.js';
import {cleanName} from '../../../utils.js';
// import {DatasetEngine, formatItem} from '../../datasets/datasets.js';
// import datasets from '../../datasets/data.js';
// import {generateItem} from '../../datasets/dataset-generator.js';
import {parseDatasetItems} from '../../../datasets/dataset-parser.js';
import {getDatasetSpecs} from '../../../datasets/dataset-specs.js';

const ContentObjectJson = ({
  json,
  error,
}) => {
  if (!error) {
    return (
      <div className={styles.character}>
        <pre>{JSON.stringify(json, null, 2)}</pre>
      </div>
    );
  } else {
    return <div>{error}</div>
  }
};
ContentObjectJson.getInitialProps = async ctx => {
  const {req} = ctx;
  const match = req.url.match(/^\/([^\/]*)\/([^\/]*)/);
  let type = match ? match[1].replace(/s$/, '') : '';
  let name = match ? match[2] : '';
  name = decodeURIComponent(name);
  name = cleanName(name);

  const c = new Ctx();
  const title = `${type}/${name}`;
  const id = uuidByString(title);
  const query = await c.databaseClient.getByName('Content', title);
  if (query) {
    const {content: text} = query;

    const datasetSpecs = await getDatasetSpecs();
    const datasetSpec = datasetSpecs.find(ds => ds.type === type);
    const items = parseDatasetItems(text, datasetSpec);
    if (items.length > 0) {
      const item0 = items[0];
      return {
        json: item0,
        error: null,
      };
    } else {
      return {
        json: null,
        // notFound: true,
        error: 'Failed to parse item',
      };
    }
  } else {
    return {
      json: null,
      // notFound: true,
      error: 'Not found',
    };
  }
};
export default ContentObjectJson;