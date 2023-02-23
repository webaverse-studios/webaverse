import dotenv from 'dotenv';
// import {Configuration, OpenAIApi} from 'openai';
// import {getFormData} from '../utils/http-utils.js';
// import {blob2img} from '../utils/convert-utils.js';
import {
  Readable,
} from 'stream';

dotenv.config();
const OPENAI_API_KEY = process.env['OPENAI_KEY'];

if (!OPENAI_API_KEY) {
  throw new Error('missing OPENAI_KEY');
}

// const configuration = new Configuration({
//   apiKey: OPENAI_API_KEY,
//   // formDataCtor: FormData,
// });
// const openai = new OpenAIApi(configuration);

//

const createImageBlob = async (prompt) => {
  // const response = await openai.createImage({
  //   prompt,
  //   n: 1,
  //   size: "1024x1024",
  // });
  const res = await fetch(`https://api.openai.com/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      n: 1,
      size: '1024x1024',
    }),
  });
  const responseData = await res.json();
  if (!res.ok) {
    console.log('got error response', res.ok, res.status, responseData);
  }
  const image_url = responseData.data[0].url;

  const res2 = await fetch(image_url);
  const blob = await res2.blob();
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
    duplex: 'half',
  });
  if (response.ok) {
    const responseData = await response.json();
    let image_url = responseData.data[0].url;

    const res = await fetch(image_url);
    const blob = await res.blob();
    return blob;
  } else {
    const text = await response.text();
    console.warn('got error response', text, response.headers);
    throw new Error(text);
  }
};

export class AiServer {
  constructor() {
    // nothing
  }
  async handleRequest(req, res) {
    try {
      console.log('ai server handle request', req.url);

      let match;
      if (match = req.url.match(/^\/api\/ai\/(completions|embeddings)/)) {
        const sub = match[1];

        // console.log('match 1', match);

        const proxyRes = await fetch(`https://api.openai.com/v1/${sub}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          // pipe the node request to the fetch body
          body: req,
          duplex: 'half',
        });

        if (proxyRes.ok) {
          // pipe the proxy response web stream to the nodejs response stream
          Readable.fromWeb(proxyRes.body).pipe(res);
        } else {
          const text = await proxyRes.text();
          console.warn('got error response', text);
          res.status(500).send(text);
        }
      } else if (match = req.url.match(/^\/api\/image-ai\/([^\/\?]+)/)) {
        const method = match[1];

        // console.log('match 2', match);

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
      console.warn('ai client error', err);
      res.status(500).send(err.stack);
    }
  }
}