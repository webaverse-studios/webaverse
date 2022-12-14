import * as THREE from 'three';
import {
  ZineStoryboard,
  zineMagicBytes,
} from 'zine/zine-format.js';
import {
  ZineRenderer,
} from 'zine/zine-renderer.js';
import {
  panelSize,
  floorNetWorldSize,
  floorNetWorldDepth,
  floorNetResolution,
  floorNetPixelSize,
} from 'zine/zine-constants.js';
import {
  setPerspectiveCameraFromJson,
  setOrthographicCameraFromJson,
} from 'zine/zine-camera-utils.js';
import {
  setCameraViewPositionFromOrthographicViewZ,
  depthFloat32ArrayToOrthographicGeometry,
} from 'zine/zine-geometry-utils.js';
import {appsMapName, heightfieldScale} from './constants.js'

// locals

const localCamera = new THREE.PerspectiveCamera();
const localOrthographicCamera = new THREE.OrthographicCamera();

// utils
    
const getGeometryHeights = (geometry, width, height) => {
  const heights = new Int16Array(geometry.attributes.position.array.length / 3);
  let writeIndex = 0;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const ax = dx;
      const ay = height - 1 - dy;
      // XXX this is WRONG!
      // we should index by ay * width + ax
      // however, because of a bug which computes this wrong, we have to do it this way
      const readIndex = ax * width + ay;

      const y = geometry.attributes.position.array[readIndex * 3 + 1];
      heights[writeIndex] = Math.round(y / heightfieldScale);

      writeIndex++;
    }
  }
  return heights;
};

// main class

class ZineManager {
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

    // panel
    const panel = storyboard.getPanel(0);
    const layer0 = panel.getLayer(0);
    const layer1 = panel.getLayer(1);
    const cameraJson = layer1.getData('cameraJson');
    const floorResolution = layer1.getData('floorResolution');
    const floorNetDepths = layer1.getData('floorNetDepths');
    const floorNetCameraJson = layer1.getData('floorNetCameraJson');
    
    // zine renderer
    const zineRenderer = this.#createRenderer({
      panel,
    });
    const {
      sceneMesh,
      scenePhysicsMesh,
      floorNetMesh,
    } = zineRenderer;

    // transform
    const floorInverseQuaternion = new THREE.Quaternion()
      .fromArray(zineRenderer.metadata.floorPlaneLocation.quaternion)
      .invert();
    {
      zineRenderer.scene.quaternion.copy(floorInverseQuaternion);
      zineRenderer.scene.updateMatrixWorld();

      zineRenderer.camera.quaternion.copy(floorInverseQuaternion);
      zineRenderer.camera.updateMatrixWorld();
    }

    // camera
    // const camera = setPerspectiveCameraFromJson(localCamera, cameraJson);
    const floorNetCamera = setOrthographicCameraFromJson(localOrthographicCamera, floorNetCameraJson);
    // instance.camera = camera;
    instance.camera = zineRenderer.camera;

    // lights
    {
      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(0, 1, 2);
      instance.add(light);
      light.updateMatrixWorld();
    }

    // meshes
    {
      instance.add(zineRenderer.scene);
    }

    // physics
    const physicsIds = [];
    instance.physicsIds = physicsIds;

    // object physics
    {
      const geometry2 = scenePhysicsMesh.geometry.clone();
      // double-side the geometry
      const indices = geometry2.index.array;
      const newIndices = new indices.constructor(indices.length * 2);
      newIndices.set(indices);
      // the second set of indices is flipped
      for (let i = 0; i < indices.length; i += 3) {
        newIndices[indices.length + i + 0] = indices[i + 2];
        newIndices[indices.length + i + 1] = indices[i + 1];
        newIndices[indices.length + i + 2] = indices[i + 0];
      }
      geometry2.setIndex(new THREE.BufferAttribute(newIndices, 1));

      const material2 = scenePhysicsMesh.material.clone();
      const scenePhysicsMesh2 = new THREE.Mesh(geometry2, material2);
      scenePhysicsMesh.matrixWorld.decompose(
        scenePhysicsMesh2.position,
        scenePhysicsMesh2.quaternion,
        scenePhysicsMesh2.scale
      );
      scenePhysicsMesh2.updateMatrixWorld();

      const physicsId = physics.addGeometry(scenePhysicsMesh2);
      physicsIds.push(physicsId);
    }

    // floor physics
    {
      const [width, height] = floorResolution;

      const floorNetPhysicsMesh = (() => {
        const geometry = depthFloat32ArrayToOrthographicGeometry(
          floorNetDepths,
          floorNetPixelSize,
          floorNetPixelSize,
          floorNetCamera,
        );
        geometry.computeVertexNormals();

        // shift geometry by half a floorNetWorldSize
        geometry.translate(floorNetWorldSize/2, 0, floorNetWorldSize/2);
        // ...but also shift the mesh to compensate
        // this centering is required for the physics to work and render correctly
        const material = new THREE.MeshPhongMaterial({
          color: 0x0000ff,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.2,
        });
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
      })();
      floorNetPhysicsMesh.position.set(-floorNetWorldSize/2, 0, -floorNetWorldSize/2);
      zineRenderer.transformScene.add(floorNetPhysicsMesh);

      const numRows = width;
      const numColumns = height;
      // if (floorNetDepths.length !== width * height) {
      //   throw new Error('floorNetDepths length mismatch');
      // }
      const heights = getGeometryHeights(
        floorNetPhysicsMesh.geometry,
        width,
        height
      );
      const heightfieldPhysicsObject = physics.addHeightFieldGeometry(
        floorNetPhysicsMesh,
        numRows,
        numColumns,
        heights,
        heightfieldScale,
        floorNetResolution,
        floorNetResolution
      );
      physicsIds.push(heightfieldPhysicsObject);
    }

    // methods
    instance.link = () => {
      const panel1 = storyboard.getPanel(1);
      const zineRenderer2 = this.#createRenderer(panel1);
      console.log('link instance', zineRenderer, zineRenderer2);
      
      zineRenderer.connect(zineRenderer2);
      
      // scene mesh
      {
        instance.add(zineRenderer2.scene);
      }

      // extra meshes
      {
        const entranceExitMesh2 = new EntranceExitMesh({
          entranceExitLocations: zineRenderer2.metadata.entranceExitLocations,
          matrixWorld: zineRenderer2.transformScene.matrixWorld,
        });
        instance.add(entranceExitMesh2);
      }

      instance.updateMatrixWorld();
    };

    // update matrix world
    instance.updateMatrixWorld();

    // return
    return instance;
  }
}
const zineManager = new ZineManager();
export default zineManager;