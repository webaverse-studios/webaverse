import path from 'path';
import http from 'http';
import https from 'https';
import fs from 'fs';

import express from 'express';
import * as vite from 'vite';

//

const isProduction = process.env.NODE_ENV === 'production';
const vercelJson = JSON.parse(fs.readFileSync('./vercel.json', 'utf8'));

const SERVER_NAME = 'local.webaverse.com';
const MULTIPLAYER_NAME = 'local-multiplayer.webaverse.com';
const COMPILER_NAME = 'local-compiler.webaverse.com';
const WIKI_NAME = 'local-previewer.webaverse.com';
const PREVIEWER_NAME = 'local-previewer.webaverse.com';

const port = parseInt(process.env.PORT, 10) || 443;
const COMPILER_PORT = parseInt(process.env.COMPILER_PORT, 10) || 3333;

//

const dirname = path.dirname(import.meta.url.replace(/^file:\/\//, ''));
Error.stackTraceLimit = 300;

//

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

const {headers: headerSpecs} = vercelJson;
const headerSpec0 = headerSpecs[0];
const {headers} = headerSpec0;
const _setHeaders = res => {
  for (const {key, value} of headers) {
    res.setHeader(key, value);
  }
};

//

const _proxyUrl = (req, res, u) => {
  const proxyReq = /^https:/.test(u) ? https.request(u) : http.request(u);
  for (const header in req.headers) {
    proxyReq.setHeader(header, req.headers[header]);
  }
  proxyReq.on('response', proxyRes => {
    for (const header in proxyRes.headers) {
      res.setHeader(header, proxyRes.headers[header]);
    }
    res.statusCode = proxyRes.statusCode;
    proxyRes.pipe(res);
  });
  proxyReq.on('error', err => {
    console.error(err);
    res.statusCode = 500;
    res.end();
  });
  proxyReq.end();
};

//

const serveDirectories = [
  '/packages/scenes/',
  '/packages/characters/',
];
const _proxyFile = (req, res, u) => {
  u = path.join(dirname, u);
  // console.log('proxy file', u);
  const rs = fs.createReadStream(u);
  rs.on('error', err => {
    console.warn(err);
    res.statusCode = 404;
    res.end(err.stack);
  });
  rs.pipe(res);
};

// main

(async () => {
  const app = express();
  app.all('*', async (req, res, next) => {
    // console.log('got headers', req.method, req.url, req.headers);

    _setHeaders(res);

    if (req.headers.host === COMPILER_NAME) {
      const u = `http://localhost:${COMPILER_PORT}${req.url}`;
      _proxyUrl(req, res, u);
    } else if (serveDirectories.some(d => req.url.startsWith(d))) {
      _proxyFile(req, res, req.url);
    } else {
      next();
    }
  });

  const isHttps = !process.env.HTTP_ONLY && (!!certs.key && !!certs.cert);
  // const wsPort = port + 1;

  const _makeHttpServer = () => isHttps ? https.createServer(certs, app) : http.createServer(app);
  const httpServer = _makeHttpServer();
  const viteServer = await vite.createServer({
    mode: isProduction ? 'production' : 'development',
    server: {
      middlewareMode: true,
      // force: true,
      hmr: {
        server: httpServer,
        port,
        overlay: false,
      },
    }
  });
  app.use(viteServer.middlewares);
  
  await new Promise((accept, reject) => {
    httpServer.listen(port, '0.0.0.0', () => {
      accept();
    });
    httpServer.on('error', reject);
  });
  // console.log('pid', process.pid);
  console.log(`  > Local: http${isHttps ? 's' : ''}://${SERVER_NAME}:${port}/`);
})();

process.on('disconnect', function() {
  console.log('dev-server parent exited')
  process.exit();
});
process.on('SIGINT', function() {
  console.log('dev-server SIGINT')
  process.exit();
});
