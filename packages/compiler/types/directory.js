import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import {fillTemplate, createRelativeFromAbsolutePath, getCwd} from '../util.js';
import metaversefileLoader from './metaversefile.js';

// const dirname = path.dirname(import.meta.url.replace(/^[a-z]+:\/\//, ''));
// const templateString = fs.readFileSync(path.join(dirname, '..', 'type_templates', 'html.js'));
const templateString = fs.readFileSync(path.resolve('.', 'public', 'type_templates', 'html.js'), 'utf8');

const _resolveHtml = async (id, importer) => {
  const code = fillTemplate(templateString, {
    srcUrl: JSON.stringify(id),
  });
  return {
    code,
    map: null,
  };
};

export default {
  async resolveId(id, importer) {
    // const oldId = id;
    
    id = createRelativeFromAbsolutePath(id);

    // console.log('load directory', oldId, id, /^https?:\/\//.test(id), /\/$/.test(id));
    if (/^https?:\/\//.test(id) && /\/$/.test(id)) {
      const metaversefilePath = id + '.metaversefile';
      const res = await fetch(metaversefilePath, {
        method: 'HEAD',
      });
      if (res.ok) {
        const metaversefileStartUrl = await metaversefileLoader.resolveId(metaversefilePath, id);
        // console.log('got metaversefile', {metaversefilePath, metaversefileStartUrl, id: id + '.fakeFile'});
        return metaversefileStartUrl;
      } else {
        // console.log('got html', id, importer);
        
        const indexHtmlPath = id + 'index.html';
        const res = await fetch(indexHtmlPath, {
          method: 'HEAD',
        });
        if (res.ok) {
          return indexHtmlPath;
        } else {
          throw new Error(`directory index.html fetch failed: ${res.status} "${id}"`)
        }
      }
    } else if (/^\//.test(id)) {
      // console.log('got pre id 1', {id});
      const cwd = getCwd();
      id = path.resolve(id);
      const idFullPath = path.join(cwd, id);
      const isDirectory = await new Promise((accept, reject) => {
        fs.lstat(idFullPath, (err, stats) => {
          accept(!err && stats.isDirectory());
        });
      });
      if (isDirectory) {
        const metaversefilePath = path.join(id, '.metaversefile');
        const metaversefileFullPath = path.join(cwd, metaversefilePath);
        const metaversefileExists = await new Promise((accept, reject) => {
          fs.lstat(metaversefileFullPath, (err, stats) => {
            accept(!err && stats.isFile());
          });
        });
        // console.log('got pre id 2', {id, metaversefilePath, metaversefileFullPath, metaversefileExists});
        if (metaversefileExists) {
          const fakeImporter = path.join(id, '.fakeFile');
          const fakeId = path.join(path.dirname(fakeImporter), '.metaversefile');
          // console.log('exists 1.1', {metaversefilePath, fakeId, fakeImporter});
          const metaversefileStartUrl = await metaversefileLoader.resolveId(fakeId, fakeImporter);
          // console.log('exists 1.2', {metaversefilePath, metaversefileStartUrl});
          // console.log('got metaversefile', {metaversefilePath, metaversefileStartUrl, id: id + '.fakeFile'});
          return metaversefileStartUrl;
        } else {
          // console.log('exists 2');
          
          const indexHtmlPath = path.join(id, 'index.html');
          const indexHtmlFullPath = path.join(cwd, indexHtmlPath);
          const indexHtmlExists = await new Promise((accept, reject) => {
            fs.lstat(indexHtmlFullPath, (err, stats) => {
              accept(!err && stats.isFile());
            });
          });

          if (indexHtmlExists) {
            // console.log('exists 3', {indexHtmlPath});
            return indexHtmlPath;
          } else {
            // console.log('exists 4');
            throw new Error(`directory index.html does not exist: "${id}"`)
          }
        }
      } else {
        throw new Error(`not a directory: "${id}"`)
      }
    } else {
      throw new Error(`unknown path format: "${id}"`)
    }
  },
  /* async load(id) {
    if (id === '/@react-refresh') {
      return null;
    } else {
      id = id.replace(/^\/@proxy\//, '');
      return await _resolveHtml(id);
    }
  } */
};