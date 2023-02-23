// import stream from 'stream';
import url from 'url';
// import {Readable} from 'node:stream';
const fetch = require("node-fetch");

const proxy = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  const o = url.parse(req.url, true);
  const {url: u} = o.query;
  if (u) {
    console.log('fetch u', {u});



    // copy the headers for proxying
    // const headers = {};
    // for (const k in req.headers) {
    //   if ([
    //     'connection',
    //     'host',
    //     'origin',
    //     'referer',
    //     'user-agent',
    //   ].includes(k) || /^sec/i.test(k) || /^upgrade/i.test(k) || /^accept/i.test(k)) {
    //     continue;
    //   }
    //   headers[k] = req.headers[k];
    // }
    // console.log('got headers', headers);
    const proxyRes = await fetch(u, {
      // headers,
    });
    
    // proxy status code
    res.statusCode = proxyRes.status;

    // console.log('got status code', proxyRes.status);

    // proxy all headers
    // for (const [k, v] of proxyRes.headers.entries()) {
    //   res.setHeader(k, v);
    // }

    // pipe response from the web stream
    // const body = Readable.fromWeb(proxyRes.body);
    proxyRes.body.pipe(res);
  } else {
    res.statusCode = 400;
    res.end('url required');
  }
};
export default proxy;