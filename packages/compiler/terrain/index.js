import * as THREE from 'three';
import metaversefile from 'metaversefile';

import View from './procgen/View/view.js';
import State from './procgen/State/state.js';

const {useApp, useFrame, useLoaders, usePhysics, useCleanup, useLocalPlayer, useInternals} = metaversefile;

const localVector = new THREE.Vector3(0, 0, 0);


export default () => {

  const app = useApp();
  const physics = usePhysics();
  const player = useLocalPlayer();
  const {camera, scene, renderer} = useInternals();

  const state = new State(player);
  const view = new View(player, app, physics);
  
  
  const resetPositionThreshold = -80; // just in case player fall below the terrain initially
  useFrame(({timestamp}) => {
    view.update(timestamp);
	  state.update(timestamp);

    if (player.position.y < resetPositionThreshold) {
      localVector.set(player.position.x, 60, player.position.z);
      player.characterPhysics.setPosition(localVector);
    }

    app.updateMatrixWorld();
  });
  
  
  return app;
}