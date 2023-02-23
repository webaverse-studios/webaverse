// import * as THREE from 'three';
// import metaversefile from 'metaversefile';
// const {useApp, usePhysics, useZine} = metaversefile;

import {
  ZineManager,
} from '/packages/zine-runtime/zine-manager.js';
import {
  ZineCameraManager,
} from '/packages/zine-runtime/zine-camera.js';

export default ctx => {
  const {
    useApp,
    useLocalPlayer,
    useCamera,
    usePhysics,
    useSpawnManager,
  } = ctx;

  const app = useApp();
  const localPlayer = useLocalPlayer();
  const camera = useCamera();
  const physics = usePhysics();
  // const zine = useZine();
  const zine = new ZineManager();
  const spawnManager = useSpawnManager();

  const srcUrl = ${this.srcUrl};
  
  ctx.waitUntil((async () => {
    console.log('zine load 1');
    // camera manager
    const zineCameraManager = new ZineCameraManager({
      camera,
      localPlayer,
    }, {
      normalizeView: false,
      followView: false,
    });
    zineCameraManager.setLockCamera(camera);
    zineCameraManager.toggleCameraLock();

    console.log('zine load 2');
    const zineInstance = await zine.createStoryboardInstanceAsync({
      start_url: srcUrl,
      zineCameraManager,
      physics,
      localPlayer,
      spawnManager,
      ctx,
    });
    console.log('zine load 3');
    app.add(zineInstance);
    zineInstance.updateMatrixWorld();
    
    app.zineInstance = zineInstance;
    app.physicsIds = zineInstance?.physicsIds ?? [];

    console.log('zine load 4');
    await zineInstance.spawn();
    console.log('zine load 5');
  })());

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'zine';
export const components = ${this.components};