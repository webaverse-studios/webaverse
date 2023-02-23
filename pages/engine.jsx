import offscreenEngineApi from 'offscreen-engine/offscreen-engine-api.js';
import {
  // compileVirtualScene,
  compileVirtualSceneExport,
} from '../src/generators/scene-generator.js';
// import {
//   ZineStoryboard,
// } from '../src/zine/zine-format.js';
// import {zbencode} from '../src/zine/encoding.js';
// import {
//   mainImageKey,
//   promptKey,
//   layer0Specs,
//   layer1Specs,
// } from '../src/zine/zine-data-specs.js';
// import physx from '../physx.js';
// import {VQAClient} from '../src/clients/vqa-client.js';

offscreenEngineApi(async (funcName, args, opts) => {
  if (funcName === 'compileScene') {
    // await physx.waitForLoad();

    const {
      imageArrayBuffer,
    } = args;
    
    // XXX debugging
    if (!imageArrayBuffer) {
      throw new Error('offscreenEngineApi got no imageArrayBuffer', imageArrayBuffer);
    }

    const uint8Array = await compileVirtualSceneExport(imageArrayBuffer)
    return uint8Array;
  } else {
    throw new Error('unknown function: ' + funcName);
  }
});

//

export const Engine = () => {
  return (
    <div className='engine-fake-node'>engine.html</div>
  );
};
