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
  depthFloat32ArrayToOrthographicGeometry,
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
      // floorNetMesh.visible = true;

      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(0, 1, 2);
      instance.add(light);
      light.updateMatrixWorld();
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

      const geometry = depthFloat32ArrayToOrthographicGeometry(
        floorNetDepths,
        floorNetPixelSize,
        floorNetPixelSize,
        floorNetCamera,
      );
      geometry.computeVertexNormals();
      const heights = new Int16Array(geometry.attributes.position.array.length / 3);
      // const heightsFloat32 = new Float32Array(geometry.attributes.position.array.length / 3);
      {
        let writeIndex = 0;
        for (let dy = 0; dy < height; dy++) {
          for (let dx = 0; dx < width; dx++) {
            const ax = dx;
            const ay = height - 1 - dy;
            // XXX note that readIndex is WRONG; we should index by ay * width + ax
            // however, because of some other bug which computes this wrong, we have to do it this way
            const readIndex = ax * width + ay;

            const y = geometry.attributes.position.array[readIndex * 3 + 1];
            heights[writeIndex] = Math.round(y / heightfieldScale);
            // heightsFloat32[writeIndex] = y;

            writeIndex++;
          }
        }
      }
      // console.log('got geometry heights', heightsFloat32);

      // shift geometry by half a floorNetWorldSize
      geometry.translate(floorNetWorldSize/2, 0, floorNetWorldSize/2);
      // ...but also shift the mesh to compensate
      // this centering is required for the physics to work and render correctly
      const material = new THREE.MeshPhongMaterial({
        color: 0x0000ff,
        side: THREE.DoubleSide,
      });
      const floorNetPhysicsMesh = new THREE.Mesh(geometry, material);
      floorNetPhysicsMesh.position.set(-floorNetWorldSize/2, 0, -floorNetWorldSize/2);
      instance.add(floorNetPhysicsMesh);
      floorNetPhysicsMesh.updateMatrixWorld();

      const numRows = width;
      const numColumns = height;
      if (floorNetDepths.length !== width * height) {
        throw new Error('floorNetDepths length mismatch');
      }
      console.log('add object 1', {
        floorNetPhysicsMesh,
        numRows,
        numColumns,
        heights,
        heightfieldScale,
        floorNetResolution,
        floorNetDepths,
      });
      const heightfieldPhysicsObject = physics.addHeightFieldGeometry(
        floorNetPhysicsMesh,
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

    console.log('create instance done');

    instance.updateMatrixWorld();
    return instance;
  }
}
const zineManager = new ZineManager();
export default zineManager;