import * as THREE from 'three';
import {
  depthFloat32ArrayToOrthographicGeometry,
} from './zine-geometry-utils.js';
import {
  floorNetWorldSize,
  floorNetWorldDepth,
  floorNetResolution,
  floorNetPixelSize,
} from './zine-constants.js';

//

export const getFloorNetPhysicsMesh = ({
  floorNetDepths,
  floorNetCamera,
  material,
}) => {
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
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(-floorNetWorldSize/2, 0, -floorNetWorldSize/2);
  return mesh;
};