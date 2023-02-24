import path from 'path';
import http from 'http';
import https from 'https';
import fs from 'fs';
import url from 'url';

import express from 'express';
import * as vite from 'vite';

//

const isProduction = process.env.NODE_ENV === 'production';
const vercelJson = JSON.parse(fs.readFileSync('./vercel.json', 'utf8'));

const SERVER_NAME = 'local.webaverse.com';
// const MULTIPLAYER_NAME = 'local-multiplayer.webaverse.com';
const COMPILER_NAME = 'local-compiler.webaverse.com';
const RENDERER_NAME = 'local-renderer.webaverse.com';

const port = parseInt(process.env.PORT, 10) || 8080;
const COMPILER_PORT = parseInt(process.env.COMPILER_PORT, 10) || 3333;
const RENDERER_PORT = parseInt(process.env.RENDERER_PORT, 10) || 5555;

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
const tmpDir = `/tmp/webaverse-dev-server`;
fs.mkdirSync(tmpDir, {
  recursive: true,
});

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
  const {method} = req;
  const opts = {
    method,
  };
  const proxyReq = /^https:/.test(u) ? https.request(u, opts) : http.request(u, opts);
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
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
};
const serveDirectories = [
  '/packages/scenes/',
  '/packages/characters/',
  // '/packages/wsrtc/',
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
const _proxyTmp = (req, res) => {
  const o = new URL(req.url);
  const p = path.join(tmpDir, o.path.replace(/^\/tmp\//, ''));

  // console.log('got tmp request', req.method, req.url, p);

  if (req.method === 'GET') {
    const rs = fs.createReadStream(p);
    rs.on('error', err => {
      console.warn(err);
      res.statusCode = 500;
      res.end(err.stack);
    });
    rs.pipe(res);
  } else if (['PUT', 'POST'].includes(req.method)) {
    const ws = fs.createWriteStream(p);
    ws.on('error', err => {
      console.warn(err);
      res.statusCode = 500;
      res.end(err.stack);
    });
    ws.on('finish', () => {
      res.end();
    });
    req.pipe(ws);
  } else if (req.method === 'OPTIONS') {
    res.end();
  } else {
    res.statusCode = 400;
    res.end('not implemented');
  }
};

// main

(async () => {
  const app = express();
  app.all('*', async (req, res, next) => {
    // console.log('got headers', req.method, req.url, req.headers);

    _setHeaders(res);

    if (req.headers.host === COMPILER_NAME) {
      const u = `http://127.0.0.1:${COMPILER_PORT}${req.url}`;
      _proxyUrl(req, res, u);
    } else if (req.headers.host === RENDERER_NAME) {
      const u = `http://127.0.0.1:${RENDERER_PORT}${req.url}`;
      // console.log('proxy to renderer', u);
      _proxyUrl(req, res, u);
    } else if (req.url.startsWith('/tmp/')) {
      _proxyTmp(req, res);
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