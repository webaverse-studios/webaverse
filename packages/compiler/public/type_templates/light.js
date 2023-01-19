import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useLocalPlayer, useCleanup, /*usePhysics, */ useWorld, useLightsManager} = metaversefile;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();

export default e => {
  const app = useApp();
  const lightsManager = useLightsManager();

  const srcUrl = ${this.srcUrl};
  
  const worldLights = app;
  app.light = null;

  let json = null;
  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    json = await res.json();

    _render();
  })());

  const _render = () => {
    if (json !== null) {
      let {lightType, args, position, shadow} = json;
      const light = (() => {
        switch (lightType) {
          case 'ambient': {
            return new THREE.AmbientLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              args[1]
            );
          }
          case 'directional': {
            return new THREE.DirectionalLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              args[1]
            );
          }
          case 'point': {
            return new THREE.PointLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              args[1],
              args[2],
              args[3]
            );
          }
          case 'spot': {
            return new THREE.SpotLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              args[1],
              args[2],
              args[3],
              args[4],
              args[5]
            );
          }
          case 'rectArea': {
            return new THREE.RectAreaLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              args[1],
              args[2],
              args[3]
            );
          }
          case 'hemisphere': {
            return new THREE.HemisphereLight(
              new THREE.Color().fromArray(args[0]).multiplyScalar(1/255).getHex(),
              new THREE.Color().fromArray(args[1]).multiplyScalar(1/255).getHex(),
              args[2]
            );
          }
          default: {
            return null;
          }
        }
      })();
      if (light) {
        lightsManager.addLight(light, lightType, shadow, position);

        worldLights.add(light);
        if (light.target) {
          worldLights.add(light.target);
        }
        light.updateMatrixWorld(true);

        app.light = light;
      } else {
        console.warn('invalid light spec:', json);
      }
    }
  };

  useFrame(() => {
    if (lightsManager.lights.length > 0) {
      for (const light of lightsManager.lights) {
        if (!light.lastAppMatrixWorld.equals(app.matrixWorld)) {
          light.position.copy(app.position);
          // light.quaternion.copy(app.quaternion);
          if (light.target) {
            light.quaternion.setFromRotationMatrix(
              new THREE.Matrix4().lookAt(
                light.position,
                light.target.position,
                localVector.set(0, 1, 0),
              )
            );
          }
          light.scale.copy(app.scale);
          light.matrix.copy(app.matrix);
          light.matrixWorld.copy(app.matrixWorld);
          light.lastAppMatrixWorld.copy(app.matrixWorld);
          light.updateMatrixWorld();
        }
      }

      const localPlayer = useLocalPlayer();
      for (const light of lightsManager.lights) {
        if (light.isDirectionalLight) {
          light.plane.setFromNormalAndCoplanarPoint(localVector.set(0, 0, -1).applyQuaternion(light.shadow.camera.quaternion), light.shadow.camera.position);
          const planeTarget = light.plane.projectPoint(localPlayer.position, localVector);
          // light.updateMatrixWorld();
          const planeCenter = light.shadow.camera.position.clone();
          
          const x = planeTarget.clone().sub(planeCenter)
            .dot(localVector2.set(1, 0, 0).applyQuaternion(light.shadow.camera.quaternion));
          const y = planeTarget.clone().sub(planeCenter)
            .dot(localVector2.set(0, 1, 0).applyQuaternion(light.shadow.camera.quaternion));
          
          light.shadow.camera.left = x + light.shadow.camera.initialLeft;
          light.shadow.camera.right = x + light.shadow.camera.initialRight;
          light.shadow.camera.top = y + light.shadow.camera.initialTop;
          light.shadow.camera.bottom = y + light.shadow.camera.initialBottom;
          light.shadow.camera.updateProjectionMatrix();
          light.updateMatrixWorld();
        }
      }
    }
  });

  useCleanup(() => {
    for (const light of lightsManager.lights) {
      lightsManager.removeLight(light);
    }
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'light';
export const components = ${this.components};