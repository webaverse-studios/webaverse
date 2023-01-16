import {Configuration, OpenAIApi} from 'openai';
import {makePromise} from '../../utils.js';
import {getFormData} from '../utils/http-utils.js';
import {blob2img} from '../utils/convert-utils.js';
import {OPENAI_API_KEY} from '../constants/auth.js';

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
  // formDataCtor: FormData,
});
const openai = new OpenAIApi(configuration);

//

const createImageBlob = async prompt => {
  const response = await openai.createImage({
    prompt,
    n: 1,
    size: "1024x1024",
  });
  const image_url = response.data.data[0].url;

  // const u2 = new URL('/api/proxy', location.href);
  // u2.searchParams.set('url', image_url);
  // image_url = u2.href;

  const res = await fetch(image_url);
  const blob = await res.blob();
  return blob;
};

/* export const editImg = (blob, maskBlob, prompt) => {
  const fd = makeEditImgFormData(blob, maskBlob, prompt);
  return editImgFormData(fd);
}; */
const makeEditImgFormData = (blob, maskBlob, prompt) => {
  const fd = getFormData({
    image: blob,
    mask: maskBlob,
    prompt,
    n: 1,
    size: '1024x1024',
  });
  return fd;
};
const editImgFormDataBlob = async fd => {
  const response = await fetch(`https://api.openai.com/v1/images/edits`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: fd,
  });
  const responseData = await response.json();
  const image_url = responseData.data[0].url;

  // const u2 = new URL('/api/proxy', location.href);
  // u2.searchParams.set('url', image_url);
  // image_url = u2.href;

  const res = await fetch(image_url);
  const blob = await res.blob();
  return blob;
};
const editRequestBlob = async req => {
  // console.log('req 1', new Error().stack);
  const contentType = req.headers['content-type'];
  // console.log('req 2');
  const response = await fetch(`https://api.openai.com/v1/images/edits`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': contentType,
    },
    // pipe the node stream to the fetch body
    body: req,
  });
  if (response.ok) {
    const responseData = await response.json();
    const image_url = responseData.data[0].url;

    // const u2 = new URL('/api/proxy', location.href);
    // u2.searchParams.set('url', image_url);
    // image_url = u2.href;

    const res = await fetch(image_url);
    const blob = await res.blob();
    return blob;
  } else {
    const text = await response.text();
    console.warn('got error response', text, response.headers);
    throw new Error(text);
  }
};

export class ImageAiClient {
  constructor() {
    // nothing
  }

  async createImage(prompt, opts) {
    const resultBlob = await this.createImageBlob(prompt, opts);
    const img = await blob2img(resultBlob);
    return img;
  }

  async createImageBlob(prompt, {
    n = 1,
    size = '1024x1024',
  } = {}) {
    const u = new URL('/api/ai/image-ai/createImageBlob', location.href);
    u.searchParams.set('prompt', prompt);
    if (n !== undefined) {
      u.searchParams.set('n', n);
    }
    if (size !== undefined) {
      u.searchParams.set('size', size);
    }
    const res = await fetch(u);
    const resultBlob = await res.blob();
    return resultBlob;
  }

  async editImgBlob(blob, maskBlob, prompt, {
    n = 1,
  } = {}) {
    const fd = makeEditImgFormData(blob, maskBlob, prompt);
    const u = new URL('/api/ai/image-ai/editImgBlob', location.href);
    u.searchParams.set('prompt', prompt);
    if (n !== undefined) {
      u.searchParams.set('n', n);
    }
    const res = await fetch(u, {
      method: 'POST',
      body: fd,
    });
    const resultBlob = await res.blob();
    return resultBlob;
  }

  async editImg(blob, maskBlob, prompt, opts) {
    const resultBlob = await this.editImgBlob(blob, maskBlob, prompt, opts);
    const img = await blob2img(resultBlob);
    return img;
  }
}
export class ImageAiServer {
  constructor() {
    // nothing
  }

  async handleRequest(req, res) {
    try {
      const match = req.url.match(/^\/api\/ai\/image-ai\/([^\/\?]+)/);
      if (match) {
        const method = match[1];
        switch (method) {
          case 'createImageBlob': {
            // read query string
            const {prompt, n, size} = req.query;
            const blob = await createImageBlob(prompt, {
              n,
              size,
            });
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            res.setHeader('Content-Type', blob.type);
            res.end(buffer);
            break;
          }
          case 'editImgBlob': {
            const blob = await editRequestBlob(req);
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            res.setHeader('Content-Type', blob.type);
            res.end(buffer);
            break;
          }
          default: {
            console.warn('method not found', method);
            res.send(404);
            break;
          }
        }
      } else {
        console.warn('image client had no url match', req.url);
        res.send(404);
      }
    } catch (err) {
      console.warn('image client error', err);
      res.status(500).send(err.stack);
    }
  }
}