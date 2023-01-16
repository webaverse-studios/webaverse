import path from 'path';
import fs from 'fs';
import {fillTemplate, parseIdHash} from '../util.js';

const templateString = fs.readFileSync(path.resolve('.', 'public', 'contract_templates', 'cryptovoxels.js'), 'utf8');

export default {
  resolveId(source, importer) {
    return source;
  },
  async load(id) {
    id = id
      .replace(/^(eth?:\/(?!\/))/, '$1/');
    
    const match = id.match(/^eth:\/\/(0x[0-9a-f]+)\/([0-9]+)$/i);
    if (match) {
      const contractAddress = match[1];
      const tokenId = parseInt(match[2], 10);

      const {
        contentId,
        name,
        description,
        components,
      } = parseIdHash(id);

      const code = fillTemplate(templateString, {
        contractAddress,
        tokenId,
        contentId,
        name,
        description,
        components,
      });
      // console.log('got glb id', id);
      return {
        code,
        map: null,
      };
    } else {
      return null;
    }
  },
};