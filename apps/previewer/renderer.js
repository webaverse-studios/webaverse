// import stream from 'stream';
import http from 'http';
import express from 'express';
import puppeteer from 'puppeteer';

//

// node ./renderer.js https://127.0.0.1/ https://webaverse.github.io/silsword/ image/png

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

const cbs = new Map();

const PORT = parseInt(process.env.PORT, 10) || 4444;
const CB_PORT = PORT + 1;

//

const handleReponse = (statusCode, req, res) => {
  // console.log('got cb', req.status, req.url, req.statusCode);
  // const rs = stream.Readable.fromWeb(response.body);
  // process.stdout.end(rs);

  console.warn('page response status code', statusCode);

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
          res.end();
        } else {
          // console.log('postback to 1');
          const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
          const proxyStatusCode = req.headers['x-proxy-status-code'] || 200;
          const {searchParams} = url;
          const id = searchParams.get('id');
          // console.log('postback', {url: req.url, headers: req.headers, id});
          
          let cb = cbs.get(id);
          if (cb) {
            cbs.delete(id);
            cb(proxyStatusCode, req, res);
          } else {
            // throw new Error('no cb for id: ' + id);
            res.status(404).end('no cb for id: ' + id);
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
    cbUrl: `http://127.0.0.1:${CB_PORT}`,
    close() {
      server.close();
    },
  };
})();

const compilerUrl = process.argv[2];
const start_url = process.argv[3];
const mimeType = process.argv[4] || 'application/octet-stream';

if (compilerUrl && start_url) {
  (async () => {
    const postbackServer = await _startPostbackServer();

    const browser = await puppeteer.launch({
      // dumpio: true,
      // offline: false,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();

    const id = makeId();
    const u = compilerUrl.replace(/\/+$/, '') + '/preview.html?u=' + encodeURI(start_url) + '&type=' + encodeURIComponent(mimeType) + '&cbUrl=' + encodeURI(postbackServer.cbUrl + '/?id=' + id);
    
    console.warn(u);

    const promise = makePromise();
    cbs.set(id, (statusCode, req, res) => {
      handleReponse(statusCode, req, res);
      
      req.on('end', promise.accept);
      req.on('error', promise.reject);
    });
    
    await page.goto(u);

    await promise;

    // Print all the files.
    // console.log(links.join('\n'));

    await browser.close();

    postbackServer.close();
  })();
}