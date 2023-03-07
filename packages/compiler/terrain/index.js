import * as THREE from 'three';
import metaversefile from 'metaversefile';

import View from './procgen/View/view.js';
import State from './procgen/State/state.js';

const {useApp, useFrame, useLoaders, usePhysics, useCleanup, useLocalPlayer, useInternals, useTerrainWorkerManager} = metaversefile;

const localVector = new THREE.Vector3(0, 0, 0);


export default () => {

  const app = useApp();
  const physics = usePhysics();
  const player = useLocalPlayer();
  const terrainWorkerManager = useTerrainWorkerManager();
  const terrainWorker = terrainWorkerManager.worker;
  const {camera, scene, renderer} = useInternals();

  const state = new State(player, terrainWorker);
  const view = new View(player, app, physics);
  

  const geometry = new THREE.PlaneGeometry( 2000, 2000 );
  const material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
  const sea = new THREE.Mesh( geometry, material );
  sea.rotation.x = -Math.PI / 2;
  app.add( sea );
  
  const resetPositionThreshold = -80; // just in case player fall below the terrain initially
  useFrame(({timestamp}) => {
    sea.position.x = player.position.x;
    sea.position.z = player.position.z;
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