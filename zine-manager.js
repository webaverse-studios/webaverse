import * as THREE from 'three';
import {
  ZineStoryboard,
  zineMagicBytes,
} from 'zine/zine-format.js';
import {
  ZineRenderer,
} from 'zine/zine-renderer.js';
// export const panelSize = 1024;
// export const floorNetWorldSize = 100;
// export const floorNetWorldDepth = 1000;
// export const floorNetResolution = 0.1;
// export const floorNetPixelSize = floorNetWorldSize / floorNetResolution;
import {
  panelSize,
  floorNetWorldSize,
  floorNetWorldDepth,
  floorNetResolution,
  floorNetPixelSize,
} from 'zine/zine-constants.js';
import {
  setOrthographicCameraFromJson,
} from 'zine/zine-camera-utils.js';
import {
  setCameraViewPositionFromOrthographicViewZ,
} from 'zine/zine-geometry-utils.js';
import {appsMapName, heightfieldScale} from './constants.js'

//

const localVector = new THREE.Vector3();
const localOrthographicCamera = new THREE.OrthographicCamera();

//

class ZineManager {
  // constructor() {}
  MAGIC_STRING = zineMagicBytes;
  async #loadUrl(u) {
    const response = await fetch(u);
    const arrayBuffer = await response.arrayBuffer();

    // const textEncoder = new TextEncoder();
    // const zineMagicBytesUint8Array = textEncoder.encode(zineMagicBytes);
    // const uint8Array = new Uint8Array(arrayBuffer, zineMagicBytesUint8Array.byteLength);
    const uint8Array = new Uint8Array(arrayBuffer, 4);
    const zineStoryboard = new ZineStoryboard();
    zineStoryboard.load(uint8Array);
    return zineStoryboard;
  }
  #createRenderer(opts) {
    const zineRenderer = new ZineRenderer(opts);
    return zineRenderer;
  }
  async createInstanceAsync({
    start_url,
    physics,
  }) {
    const instance = new THREE.Object3D();

    const storyboard = await this.#loadUrl(start_url);

    const panel = storyboard.getPanel(0);
    if (!panel) {
      throw new Error('no panels in zine');
    }
    const layer0 = panel.getLayer(0);
    if (!layer0) {
      throw new Error('no layer0 in panel0');
    }
    const layer1 = panel.getLayer(1);
    if (!layer1) {
      throw new Error('no layer1 in panel0');
    }

    const zineRenderer = this.#createRenderer({
      panel,
    });
    const {sceneMesh, scenePhysicsMesh, floorNetMesh} = zineRenderer;
    const floorResolution = layer1.getData('floorResolution');
    const floorNetDepths = layer1.getData('floorNetDepths');
    const floorNetCameraJson = layer1.getData('floorNetCameraJson');
    console.log('loaded storyboard', {
      storyboard,
      panel,
      zineRenderer,
      sceneMesh,
      scenePhysicsMesh,
      floorNetMesh,
      floorResolution,
      floorNetCameraJson,
      floorNetDepths,
    });

    const floorNetCamera = setOrthographicCameraFromJson(localOrthographicCamera, floorNetCameraJson);

    // add meshes to instance
    {
      instance.add(sceneMesh);
      instance.add(scenePhysicsMesh);
      instance.add(floorNetMesh);
    }

    // add object physics
    const physicsIds = [];
    instance.physicsIds = physicsIds;
    {
      const physicsId = physics.addGeometry(scenePhysicsMesh);
      physicsIds.push(physicsId);
    }

    // add floor heightfield physics
    {
      const [width, height] = floorResolution;
      const numRows = width;
      const numColumns = height;
      if (floorNetDepths.length !== width * height) {
        throw new Error('floorNetDepths length mismatch');
      }
      globalThis.zs = []; // XXX
      const heights = (() => {
        const heights = new Int16Array(floorNetDepths.length);
        for (let i = 0; i < floorNetDepths.length; i++) {
          const x = (i % width) / width;
          let y = Math.floor(i / width) / height;
          y = 1 - y;
        
          const viewZ = floorNetDepths[i];
          const worldPoint = setCameraViewPositionFromOrthographicViewZ(x, y, viewZ, floorNetCamera, localVector);

          globalThis.zs.push(worldPoint.z); // XXX

          const h = Math.round(worldPoint.z / heightfieldScale);
          if (h < -32768 || h > 32767) { // check that it fits in int16
            throw new Error('height out of range in createInstanceAsync');
          }
          heights[i] = h;
        }
        return heights;
      })();
      console.log('add object 1', {
        floorNetMesh,
        numRows,
        numColumns,
        heights,
        heightfieldScale,
        floorNetResolution,
        floorNetDepths,
        zs,
      });
      const heightfieldPhysicsObject = physics.addHeightFieldGeometry(
        floorNetMesh,
        numRows,
        numColumns,
        heights,
        heightfieldScale,
        floorNetResolution,
        floorNetResolution
      );
      console.log('add object 2', heightfieldPhysicsObject);
      physicsIds.push(heightfieldPhysicsObject);
    }

    instance.updateMatrixWorld();
    return instance;
  }
}
const zineManager = new ZineManager();
export default zineManager;