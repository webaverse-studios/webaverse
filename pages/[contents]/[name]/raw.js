// import uuidByString from 'uuid-by-string';
// import Markdown from 'marked-react';

import styles from '../../../styles/Character.module.css'
import {Ctx} from '../../../clients/context.js';
import {cleanName} from '../../../utils.js';
// import {DatasetEngine, formatItem} from '../../datasets/datasets.js';
// import datasets from '../../datasets/data.js';
// import {generateItem} from '../../datasets/dataset-generator.js';
// import {formatItemText} from '../../datasets/dataset-parser.js';
// import {getDatasetSpecs} from '../../datasets/dataset-specs.js';

const ContentObjectRaw = ({
  text,
  error,
}) => {
  if (!error) {
    return (
      <div className={styles.character}>
        <pre>{text}</pre>
      </div>
    );
  } else {
    return <div>Not found</div>
  }
};
ContentObjectRaw.getInitialProps = async ctx => {
  const {req} = ctx;
  const match = req.url.match(/^\/([^\/]*)\/([^\/]*)/);
  let type = match ? match[1].replace(/s$/, '') : '';
  let name = match ? match[2] : '';
  name = decodeURIComponent(name);
  name = cleanName(name);

  const c = new Ctx();
  const title = `${type}/${name}`;
  // const id = uuidByString(title);
  const query = await c.databaseClient.getByName('Content', title);
  if (query) {
    const {content: text} = query;
    return {
      text,
      error: null,
    };
  } else {
    return {
      text: null,
      // notFound: true,
      error: 'Not found',
    };
  }
};
export default ContentObjectRaw;