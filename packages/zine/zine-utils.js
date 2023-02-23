import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {
  defaultCameraFov,
  floorNetWorldSize,
  floorNetWorldDepth,
} from './zine-constants.js';

//

// export const makePromise = () => {
//   let resolve = null;
//   let reject = null;
//   const promise = new Promise((a, b) => {
//     resolve = a;
//     reject = b;
//   });
//   promise.resolve = resolve;
//   promise.reject = reject;
//   return promise;
// }

//

export const makeRenderer = canvas => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.sortObjects = false;
  renderer.physicallyCorrectLights = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  return renderer;
};

//

export const makeGltfLoader = () => {
  const gltfLoader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/three/draco/');
  gltfLoader.setDRACOLoader(dracoLoader);
  return gltfLoader;
};

//

export const makeGltfExporter = () => {
  const gltfExporter = new GLTFExporter();
  return gltfExporter;
};

//

export const makeDefaultCamera = () => new THREE.PerspectiveCamera(defaultCameraFov, 1, 0.1, 1000);
export const makeFloorNetCamera = () => {
  const floorNetCamera = new THREE.OrthographicCamera(
    -floorNetWorldSize / 2,
    floorNetWorldSize / 2,
    floorNetWorldSize / 2,
    -floorNetWorldSize / 2,
    0,
    floorNetWorldDepth
  );
  floorNetCamera.position.set(0, -floorNetWorldDepth/2, 0);
  floorNetCamera.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2)
    .multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
    );
  floorNetCamera.updateMatrixWorld();
  return floorNetCamera;
};
export const makeMapIndexCamera = () => {
  const floorNetCamera = new THREE.OrthographicCamera(
    -floorNetWorldSize / 2,
    floorNetWorldSize / 2,
    floorNetWorldSize / 2,
    -floorNetWorldSize / 2,
    0,
    floorNetWorldDepth
  );
  floorNetCamera.position.set(0, -floorNetWorldDepth/2, 0);
  floorNetCamera.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2)
    .multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
    );
  floorNetCamera.updateMatrixWorld();
  return floorNetCamera;
};

//

export const pushMeshes = (scene, meshes, options = {}) => {
  const originalSpecs = meshes.map(mesh => {
    const {parent, frustumCulled} = mesh;
    scene.add(mesh);
    if (options.frustumCulled !== undefined) {
      mesh.frustumCulled = options.frustumCulled;
    }
    return {
      parent,
      frustumCulled,
    };
  });
  return () => {
    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      const originalSpec = originalSpecs[i];
      if (originalSpec.parent) {
        originalSpec.parent.add(mesh);
      } else {
        scene.remove(mesh);
      }
      mesh.frustumCulled = originalSpec.frustumCulled;
    }
  };
};

//

export const normalToQuaternion = (() => {
  const localVector = new THREE.Vector3();
  // const localVector2 = new THREE.Vector3();
  const localMatrix = new THREE.Matrix4();

  return (normal, quaternion, up) => {
    return quaternion.setFromRotationMatrix(
      localMatrix.lookAt(
        normal,
        localVector.set(0, 0, 0),
        up
      )
    );
  };
})();

//

export function range(value, min, max) {
  return Math.min(Math.max(value, min), max);
}