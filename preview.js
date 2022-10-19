import {bindCanvas, waitForLoad} from './renderer.js';

// import {getEmotionCanvases} from './offscreen-engine/fns/avatar-iconer-fn.js';
// import {createSpriteAvatarMesh, crunchAvatarModel, optimizeAvatarModel} from './offscreen-engine/fns/avatar-renderer-fns.js';
// import {generateObjectUrlCardRemote} from './offscreen-engine/fns/cards-manager-fn.js';
// import {getLandImage} from './offscreen-engine/fns/land-iconer-fn.js';
// import {createAppUrlSpriteSheet} from './offscreen-engine/fns/spriting-fn.js';
// import {getSpriteAnimationForAppUrlInternal} from './offscreen-engine/fns/sprite-animation-manager-fn.js';
import physx from './physx.js';
// import {offscreenCanvasSize} from './constants.js';
import metaversefile from 'metaversefile';
import metaversefileApi from './metaversefile-api';

// import physicsManager from './physics-manager.js';
import physxWorkerManager from './physx-worker-manager.js';
import Avatar from './avatars/avatars.js';

const _waitForLoad = async () => {
  const canvas = document.getElementById('canvas');
  bindCanvas(canvas);

  // await bindCanvas();
  // await metaversefile.waitForLoad();
  // await physx.waitForLoad();
  await Avatar.waitForLoad();
  await physx.waitForLoad();
  await physxWorkerManager.waitForLoad();
};

(async () => {
  const url = new URL(location.href);
  const {searchParams} = url;
  const u = searchParams.get('u');
  const mimeType = searchParams.get('type');
  const cbUrl = searchParams.get('cbUrl');

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
          const result = await exFn({mimeType});
          if (result) {
            const type = (result instanceof Blob) ? result.type : mimeType;
            _respond(200, type, result);
            return;
          }
        }
        _respond(404, 'text/plain', 'no exports found at ' + JSON.stringify(u) + ' for mime type ' + JSON.stringify(mimeType));
      } else {
        _respond(404, 'text/plain', 'no exports found at ' + JSON.stringify(u) + ' for mime type ' + JSON.stringify(mimeType));
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