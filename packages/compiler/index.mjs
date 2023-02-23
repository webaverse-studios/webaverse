// import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
// import child_process from 'child_process';

import express from 'express';

import {
  handler,
} from './handler.js';

//

const isProduction = process.env.NODE_ENV === 'production';
const vercelJson = JSON.parse(fs.readFileSync('./vercel.json', 'utf8'));

const _tryReadFile = p => {
  try {
    return fs.readFileSync(p);
  } catch(err) {
    // console.warn(err);
    return null;
  }
};
const certs = {
  key: _tryReadFile('./certs/privkey.pem') || _tryReadFile('./certs-local/privkey.pem'),
  cert: _tryReadFile('./certs/fullchain.pem') || _tryReadFile('./certs-local/fullchain.pem'),
};

//

const SERVER_NAME = `local-compiler.webaverse.com`;
const port = parseInt(process.env.PORT, 10) || 443;
console.log('compiler port', port);

//

const {headers: headerSpecs} = vercelJson;
const headerSpec0 = headerSpecs[0];
const {headers} = headerSpec0;
const _setHeaders = res => {
  for (const {key, value} of headers) {
    res.setHeader(key, value);
  }
};

//

(async () => {
  const app = express();
  app.all('*', async (req, res, next) => {
    // console.log('compiler got request', req);

    _setHeaders(res);
    
    if (req.method === 'OPTIONS') {
      res.end();
    } else {
      handler(req, res);
    }
  });

  const isHttps = false; // !process.env.HTTP_ONLY && (!!certs.key && !!certs.cert);
  const _makeHttpServer = () => isHttps ? https.createServer(certs, app) : http.createServer(app);
  const httpServer = _makeHttpServer();
  
  await new Promise((accept, reject) => {
    console.log('compiler listen on port', {port});
    httpServer.listen(port, '0.0.0.0', () => {
      accept();
    });
    httpServer.on('error', reject);
  });
  // console.log('pid', process.pid);
  console.log(`  > Compiler: http${isHttps ? 's' : ''}://${SERVER_NAME}:${port}/`);
})();
