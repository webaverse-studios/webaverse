import * as THREE from 'three';
import {minFov} from './constants.js';

//

export const makeDefaultPerspectiveCamera = () => {
  const camera = new THREE.PerspectiveCamera(minFov, 1, 0.1, 10000);
  camera.position.set(0, 1.6, 0);
  camera.rotation.order = 'YXZ';
  camera.name = 'sceneCamera';
  return camera;
};