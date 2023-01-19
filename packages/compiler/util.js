import path from 'path';
import fs from 'fs';
import url, {URL, format} from 'url';
import fetch from 'node-fetch';

export function jsonParse(s) {
  try {
    return JSON.parse(s);
  } catch (err) {
    return null;
  }
}

export const resolveFileFromId = (id, importer) => {
  id = id.replace(/^[\/\\]+/, '');
  let match;
  // console.log('load', id, match);
  if (match = id.match(/^ipfs:\/+([a-z0-9]+)((?:\/?[^\/\?]*)*)(\?\.(.+))?$/i)) {
    return `https://ipfs.webaverse.com/ipfs/${match[1]}${match[2]}`;
  /* } else if (match = id.match(/^\/@proxy\/(.+)$/)) {
    return match[1]; */
  } else {
    return null;
  }
};

export const getCwd = () => path.resolve(process.cwd(), process.env.BASE_CWD ?? '');

export const readFile = async id => {
  if (/^https?:\/\//.test(id)) {
    const res = await fetch(id)
    const text = await res.text();
    return text;
  } else {
    // read from disk
    const rs = fs.createReadStream(id);
    const chunks = [];
    for await (const chunk of rs) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
};

export const fetchFileFromId = async (id, importer, encoding = null) => {
  //  .replace(/^\/@proxy\//, '')
  //  .replace(/^(https?:\/(?!\/))/, '$1/');
  if (/^https?:\/\//.test(id)) {
    const u = url.parse(id, true);
    u.query.noimport = 1 + '';
    id = format(u);
    const res = await fetch(id)
    if (encoding === 'utf8') {
      const s = await res.text();
      return s;
    } else {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer;
    }
  } else {
    return await new Promise((accept, reject) => {
      const cwd = getCwd();
      const p = path.join(cwd, id.replace(/^[\/\\]+/, ''));
      // console.log('read dir', {id, importer, p});
      fs.readFile(p, encoding, (err, d) => {
        if (!err) {
          accept(d);
        } else {
          if (err.code === 'ENOENT') {
            accept(null);
          } else {
            reject(err);
          }
        }
      });
    });
  }
};

export const fillTemplate = function(templateString, templateVars) {
  // eslint-disable-next-line no-new-func
  return new Function("return `"+templateString +"`;").call(templateVars);
};

export const createRelativeFromAbsolutePath = path => {
  /* const cwd = process.cwd();
  if (path.startsWith(cwd.replaceAll('\\','/'))) {
    path = path.slice(cwd.length);
  } */
  return path;
}

export const parseIdHash = id => {
  let contentId = '';
  let name = '';
  let description = '';
  let components = [];

  const match = id.match(/#([\s\S]+)$/);
  if (match) {
    const q = new URLSearchParams(match[1]);
    const qContentId = q.get('contentId');
    if (qContentId !== undefined) {
      contentId = qContentId;
    }
    const qName = q.get('name');
    if (qName !== undefined) {
      name = qName;
    }
    const qDescription = q.get('description');
    if (qDescription !== undefined) {
      description = qDescription;
    }
    const qComponents = q.get('components');
    if (qComponents !== undefined) {
      components = jsonParse(qComponents) ?? [];
    }
  }
  if (!contentId) {
    contentId = id.match(/^([^#]*)/)[1];
  }
  if (!name) {
    if (/^data:/.test(contentId)) {
      name = contentId.match(/^data:([^\;\,]*)/)[1];
    } else {
      name = contentId.match(/([^\/\.]*)(?:\.[a-zA-Z0-9]*)?$/)[1];
    }
  }

  return {
    contentId,
    name,
    description,
    components,
  };
};