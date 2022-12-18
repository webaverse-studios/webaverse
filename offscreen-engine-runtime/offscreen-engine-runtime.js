// import {
//   zbencode,
// } from 'zjs';
import {bindCanvas} from '../renderer.js';
import physx from '../physx.js';
import physxWorkerManager from '../physx-worker-manager.js';
import Avatar from '../avatars/avatars.js';

import {
  makeLocalWorker,
} from './local-engine-worker.js';
import offscreenEngineApi from './offscreen-engine-api.js';

console.log('offscreen engine api run...');
offscreenEngineApi(async (funcName, args, opts) => {
  const worker = makeLocalWorker();

  const _waitForLoad = async () => {
    const canvas = document.getElementById('canvas');
    bindCanvas(canvas);

    await physx.waitForLoad();
    await physxWorkerManager.waitForLoad();
    await Avatar.waitForLoad();
    await worker.waitForLoad();
  };

  await _waitForLoad();
  const result = await worker.request(funcName, args);
  return result;
});