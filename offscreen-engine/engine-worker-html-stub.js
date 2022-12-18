import {
  zbencode,
  zbdecode,
} from 'zjs';
import {bindCanvas} from '../renderer.js';
import physx from '../physx.js';
// import metaversefileApi from './metaversefile-api.js';
// import metaversefile from 'metaversefile';
import physxWorkerManager from '../physx-worker-manager.js';
import Avatar from '../avatars/avatars.js';

import {
  makeLocalWorker,
} from './offscreen-engine.js';

console.log('engine worker stub 0');

(async () => {
  const worker = makeLocalWorker();

  console.log('engine worker stub 2');

  const _getArgs = async argsUrl => {
    const res = await fetch(argsUrl);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const args = zbdecode(uint8Array);
      return args;
    } else {
      throw new Error('failed to fetch args: ' + argsUrl + ' ' + res.status);
    }
  };
  const _waitForLoad = async () => {
    const canvas = document.getElementById('canvas');
    bindCanvas(canvas);
  
    await physx.waitForLoad();
    await physxWorkerManager.waitForLoad();
    await Avatar.waitForLoad();
    await worker.waitForLoad();
  };

  const url = new URL(location.href);
  const {searchParams} = url;
  const funcName = searchParams.get('funcName');
  const argsUrl = searchParams.get('argsUrl');
  const cbUrl = searchParams.get('cbUrl');
  /* let args = searchParams.get('args');
  if (args) {
    try {
      args = JSON.parse(args);
    } catch(err) {
      console.warn('invalid args', err);
    }
  }
  if (!args) {
    args = {};
  } */
  const args = await _getArgs(argsUrl);

  const _respond = async (statusCode, contentType, body) => {
    const res = await fetch(cbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
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

  console.log('wait for worker 1', args?.constructor, args?.byteLength, args?.length);
  await _waitForLoad();
  console.log('wait for worker 2');
  const result = await worker.request(funcName, args);
  console.log('wait for worker 3', result);
  const resultUint8Array = zbencode(result);
  await _respond(200, 'application/octet-stream', resultUint8Array);
  console.log('wait for worker 4');
})();