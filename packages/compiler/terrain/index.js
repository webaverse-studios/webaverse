import * as THREE from 'three';
import metaversefile from 'metaversefile';

import View from './procgen/View/view.js';
import State from './procgen/State/state.js';

const {useApp, useFrame, useLoaders, usePhysics, useCleanup, useLocalPlayer, useInternals, useTerrainWorkerManager} = metaversefile;

const localVector = new THREE.Vector3(0, 0, 0);

const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1'); 
const textureLoader = new THREE.TextureLoader();

//###################################################### load texture #################################################################
const texturePacks = [
  {name: 'terrain-rock', texture: null, ext: 'png', repeat: true},
  {name: 'terrain-dirt', texture: null, ext: 'png', repeat: true},
  {name: 'terrain-sand', texture: null, ext: 'png', repeat: true},
  {name: 'terrain-grass', texture: null, ext: 'png', repeat: true},
  
];
const texturesPromise = (async () => {
  for(const texturePack of texturePacks){
    const texture = textureLoader.load(`${baseUrl}textures/${texturePack.name}.${texturePack.ext}`);
    if (texturePack.repeat) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }
    texturePack.texture = texture;
  }
})();
const waitForTextures = () => texturesPromise;


export default () => {

  const app = useApp();
  const physics = usePhysics();
  const player = useLocalPlayer();
  const terrainWorkerManager = useTerrainWorkerManager();
  const terrainWorker = terrainWorkerManager.worker;
  const {camera, scene, renderer} = useInternals();

  let state = null;
  let view = null;
  const setUpProcgen = async () => {
    await waitForTextures();
    state = new State(player, terrainWorker);
    view = new View(player, app, physics, texturePacks);
  };
  setUpProcgen();

  const geometry = new THREE.PlaneGeometry( 2000, 2000 );
  const material = new THREE.MeshBasicMaterial( {color: 0x05BAC4, side: THREE.DoubleSide} );
  const sea = new THREE.Mesh( geometry, material );
  sea.rotation.x = -Math.PI / 2;
  app.add( sea );
  
  const resetPositionThreshold = -80; // just in case player fall below the terrain initially
  useFrame(({timestamp}) => {
    sea.position.x = player.position.x;
    sea.position.z = player.position.z;
    view && view.update(timestamp);
	  state && state.update(timestamp);

    if (player.position.y < resetPositionThreshold) {
      localVector.set(player.position.x, 60, player.position.z);
      player.characterPhysics.setPosition(localVector);
    }

    app.updateMatrixWorld();
  });
  
  
  return app;
}