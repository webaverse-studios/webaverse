import {bindCanvas} from './renderer.js';

import physx from './physx.js';
import metaversefileApi from './metaversefile-api.js';
import metaversefile from 'metaversefile';

import physxWorkerManager from './physx-worker-manager.js';
import Avatar from './avatars/avatars.js';

const _waitForLoad = async () => {
  const canvas = document.getElementById('canvas');
  bindCanvas(canvas);

  await physx.waitForLoad();
  await physxWorkerManager.waitForLoad();
  await Avatar.waitForLoad();
};

(async () => {
  const url = new URL(location.href);
  const {searchParams} = url;
  const u = searchParams.get('u');
  const mimeType = searchParams.get('type');
  const cbUrl = searchParams.get('cbUrl');
  let args = searchParams.get('args');
  if (args) {
    try {
      args = JSON.parse(args);
    } catch(err) {
      console.warn('invalid args', err);
    }
  }
  if (!args) {
    args = {};
  }

  const _respond = async (statusCode, contentType, body) => {
    const res = await fetch(cbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        // 'woot': 'toot',
        'X-Proxy-Status-Code': statusCode,
      },
      body,
    });
  
    // console.log('respond 2', res.ok);
    
    if (res.ok) {
      await res.blob();
      // console.log('got response');
    } else {
      throw new Error('failed to respond: ' + res.status);
    }
  };

  if (u && cbUrl) {
    try {
      // console.log('respond 0', JSON.stringify({u, cbUrl, mimeType}));
      
      await _waitForLoad();
      
      // console.log('respond 1', JSON.stringify({u, cbUrl, mimeType}));

      const app = await metaversefile.createAppAsync({
        start_url: u,
      });

      /* console.log('respond 2', JSON.stringify({u, cbUrl, mimeType}), app.exports.length);
      if (!app.exports) {
        debugger;
      } */

      if (app.exports.length > 0) {
        for (const exFn of app.exports) {
          const result = await exFn({mimeType, args});
          if (result) {
            const type = (result instanceof Blob) ? result.type : mimeType;
            _respond(200, type, result);
            return;
          }
        }
        _respond(404, 'text/plain', 'no exports found at ' + JSON.stringify(u) + ' for mime type ' + JSON.stringify(mimeType) + ' ' + JSON.stringify(args));
      } else {
        _respond(404, 'text/plain', 'no exports found at ' + JSON.stringify(u) + ' for mime type ' + JSON.stringify(mimeType) + ' ' + JSON.stringify(args));
      }

      // const body = JSON.stringify({
      //   u,
      //   cbUrl,
      // });
      // await _respond(body);
    } catch(err) {
      console.warn(err.stack);
      _respond(500, 'text/plain', err.stack);
    }
  }
})();