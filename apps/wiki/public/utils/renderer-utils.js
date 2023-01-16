import * as THREE from 'three';

const localVector2D = new THREE.Vector2();

export const setRaycasterFromEvent = (raycaster, camera, e) => {
  const w = globalThis.innerWidth;
  const h = globalThis.innerHeight;
  const mouse = localVector2D.set(
    (e.clientX / w) * 2 - 1,
    -(e.clientY / h) * 2 + 1
  );
  raycaster.setFromCamera(mouse, camera);
};