import http from 'http';
// import https from 'https';
import path from 'path';
import fs from 'fs';
import url from 'url';
import express from 'express';
import puppeteer from 'puppeteer';

//

const SERVER_ADDR = '0.0.0.0';
const SERVER_NAME = 'local-renderer.webaverse.com';
const PORT = parseInt(process.env.PORT, 10) ?? 5555;
const CB_PORT = PORT + 1;

//

const dirname = path.dirname(import.meta.url.replace(/^[a-z]+:\/\//, ''));

//

// curl 'http://local-renderer.webaverse.com:4444/?u=/avatars/ann.vrm&mimeType=image/png'

//

function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
 }
 return result;
}
const makeId = () => makeid(10);

function makePromise() {
  let accept, reject;
  const p = new Promise((a, r) => {
    accept = a;
    reject = r;
  });
  p.accept = accept;
  p.reject = reject;
  return p;
}

//

const args = new Map();
const cbs = new Map();

//

const handleReponse = (statusCode, req, res) => {
  // console.log('got cb', req.status, req.url, req.statusCode);
  // const rs = stream.Readable.fromWeb(response.body);
  // process.stdout.end(rs);

  // console.warn('page response status code', statusCode);

  req.pipe(process.stdout);

  req.on('end', () => {
    res.end();
  });

  /* // response : Response
  // proxt to res
  res.status(response.status);
  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }
  // proxy the body
  rs.pipe(res); */
};
const _startPostbackServer = () => (async () => {
  const server = await new Promise((accept, reject) => {
    const postbackApp = express();
    postbackApp.all('*', (req, res, next) => {
      try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        if (req.method === 'OPTIONS') {
          // console.log('postback server handle options', req.url);
          res.end();
        } else {
          // console.log('postback server got', req.url);
          const u = new URL(req.url, `${req.protocol}://${req.headers.host}`);
          const proxyStatusCode = req.headers['x-proxy-status-code'] || 200;
          const {searchParams} = u;
          const id = searchParams.get('id');
          // console.log('postback', {url: req.url, headers: req.headers, id});
          
          const o = url.parse(req.url, true);
          if (o.pathname === '/args') {
            // console.log('postback handle args');
            let arg = args.get(id);
            if (arg) {
              args.delete(id);
              res.end(arg);
            } else {
              // throw new Error('no arg for id: ' + id);
              res.status(404).end('no arg for id: ' + id);
            }
          } else if (o.pathname === '/cb') {
            // console.log('postback handle cb');
            let cb = cbs.get(id);
            if (cb) {
              cbs.delete(id);
              cb(proxyStatusCode, req, res);
            } else {
              // throw new Error('no cb for id: ' + id);
              res.status(404).end('no cb for id: ' + id);
            }
          } else {
            // console.log('postback handle not found');
            res.status(404).end('url not found');
          }
        }
      } catch(err) {
        console.warn(err.stack);
        res.status(500).send(err.stack);
      }
    });
    const server = http.createServer(postbackApp);
    server.listen(CB_PORT, (err) => {
      // console.log('listen', {err});
      
      if (err) {
        reject(err);
      } else {
        accept(server);
        // setTimeout(accept, 1000);
      }
    });
  });
  return {
    argsUrl: `http://127.0.0.1:${CB_PORT}/args`,
    cbUrl: `http://127.0.0.1:${CB_PORT}/cb`,
    close() {
      server.close();
    },
  };
})();
const _readBody = req => new Promise((accept, reject) => {
  const buffers = [];
  const ondata = data => {
    // console.log('args read data', data.byteLength);
    buffers.push(data);
  };
  req.on('data', ondata);
  const onend = () => {
    const b = Buffer.concat(buffers);
    // console.log('args read end', b.byteLength);
    accept(b);
    buffers.length = 0;
    cleanup();
  };
  req.on('end', onend);
  const onerror = err => {
    // console.warn('args read error', err);
    reject(err);
    cleanup();
  };
  req.on('error', onerror);

  const cleanup = () => {
    req.removeListener('data', ondata);
    req.removeListener('end', onend);
    req.removeListener('error', onerror);
  };
});

const port = parseInt(process.env.PORT, 10) || 8888;
// const compilerUrl = process.argv[2] || `https://127.0.0.1/`;
const MAX_TIMEOUT = 120 * 1000;
/* const start_url = process.argv[3];
const mimeType = process.argv[4] || 'application/octet-stream';

if (compilerUrl && start_url) {
  (async () => {
    const postbackServer = await _startPostbackServer();

    

    postbackServer.close();
  })();
} */

(async () => {
  const postbackServer = await _startPostbackServer();

  const browser = await puppeteer.launch({
    dumpio: true,
    // offline: false,
    ignoreHTTPSErrors: true,
  });

  const _render = async (start_url, funcName, argsData) => {
    // console.log('await new page');

    const page = await browser.newPage();
    page.on('pageerror', err => {
      console.warn('closing page due to page error', start_url, funcName, err);
      page.close();
    });

    // console.log('renderer render', {
    //   start_url,
    //   funcName,
    //   argsLength: args?.length
    // });

    const id = makeId();
    // const u = new URL(compilerUrl.replace(/\/+$/, '') + '/preview.html');
    const u = new URL(start_url);
    // ?u=' + encodeURI(start_url) + '&type=' + encodeURIComponent(mimeType) + (args ? ('&args=' + encodeURIComponent(args)) : '') + '&cbUrl=' + encodeURI(postbackServer.cbUrl + '/?id=' + id);
    u.searchParams.set('funcName', funcName);
    u.searchParams.set('argsUrl', postbackServer.argsUrl + '?id=' + id);
    u.searchParams.set('cbUrl', postbackServer.cbUrl + '?id=' + id);

    {
      args.set(id, argsData);
    }
    const cbPromise = (async () => {
      const promise = makePromise();
      cbs.set(id, (statusCode, req, res) => {
        // handleReponse(statusCode, req, res);
  
        const buffers = [];
        const ondata = data => {
          buffers.push(data);
        };
        req.on('data', ondata);
        const onend = () => {
          res.end();

          promise.accept({
            contentType: req.headers['content-type'],
            body: Buffer.concat(buffers),
          });
        };
        req.on('end', onend);
        const onerror = err => {
          promise.reject(err);
        };
        req.on('error', onerror);
        
        const cleanup = () => {
          req.removeListener('data', ondata);
          req.removeListener('end', onend);
          req.removeListener('error', onerror);
        };
        promise.finally(cleanup);
      });
      return await promise;
    })();
    
    page.setDefaultNavigationTimeout(MAX_TIMEOUT);
    await page.goto(u);

    const result = await cbPromise;

    // close the page
    await page.close();

    // await browser.close();

    return result;
  };

  const requestCache = new Map();
  const _cachedRender = (start_url, funcName, argsData, cache) => {
    // const key = start_url + ':' + funcName + ':' + args + ':' + cache;
    const key = cache;
    let p = key ? requestCache.get(key) : null;
    // console.log('cached render had', {start_url, funcName, had: !!p});
    if (!p) {
      p = _render(start_url, funcName, argsData);
      requestCache.set(key, p);
    }
    return p;
  };

  const app = express();
  app.all('*', async (req, res, next) => {
    // console.log('got headers', req.method, req.url, req.headers);
    // console.log('render server got', req.url);

    const o = url.parse(req.url, true);
    if (o.pathname === '/') {
      res.setHeader('Content-Type', 'text/html');
      const rs = fs.createReadStream(dirname + '/index.html');
      rs.pipe(res);
    } else if (o.pathname === '/api') {
      // parse the URL and query string, making sure the protocol is correct
      const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
      const {searchParams} = url;
      const start_url = searchParams.get('start_url');
      // const mimeType = searchParams.get('mimeType');
      const funcName = searchParams.get('funcName');
      // const args = searchParams.get('args') || '';
      const cache = searchParams.get('cache') || '';

      if (start_url && funcName) {
        try {
          // console.log('wait for args body', req.method, req.headers, start_url, funcName, cache);
          // wait for the body
          const argsData = await _readBody(req);
          // console.log('got args body 0');
          // console.log('got args body 1', argsData?.length);
          const {
            contentType,
            body,
          } = await _cachedRender(start_url, funcName, argsData, cache);
          // console.log('renderer got result', contentType, body?.length);
          res.setHeader('Content-Type', contentType);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', '*');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.end(body);
        } catch(err) {
          // console.warn('render server caught error', err.stack);
          res.setHeader('Content-Type', 'text/plain');
          res.status(500).send(err.stack);
        }
      } else {
        // console.warn('render server invalid query', {
        //   start_url,
        //   funcName,
        // });
        res.status(404).end('invalid query: ' + JSON.stringify({start_url, funcName}));
      }
    } else {
      res.status(404).end('not found');
    }
  });

  const _makeHttpServer = () => http.createServer(app);
  const httpServer = _makeHttpServer();
  
  // await _startCompiler();
  await new Promise((accept, reject) => {
    httpServer.listen(port, SERVER_ADDR, () => {
      accept();
    });
    httpServer.on('error', reject);
  });
  console.log(`  > Local Previewer: http://${SERVER_NAME}:${port}/`);
  console.log(`previewer ready`);
})();

process.on('disconnect', function() {
  console.log('previewer parent exited')
  process.exit();
});
process.on('SIGTERM', function() {
  console.log('previewer SIGTERM')
  process.exit();
});