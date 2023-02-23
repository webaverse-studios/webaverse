/*
this file contains the universe/meta-world/scenes/multiplayer code.
responsibilities include loading the world on url change.
*/

import * as THREE from 'three';
// import metaversefile from 'metaversefile';
// import {NetworkRealms} from '../multiplayer/public/network-realms.mjs';
// import WSRTC from 'wsrtc/wsrtc.js';
// import * as Z from 'zjs';

import {
  initialPosY,
  realmSize,
} from '../constants.js';
// import {
//   playersMapName,
//   appsMapName,
//   actionsMapName,
//   // partyMapName,
// } from './network-schema/constants.js';
// import {loadOverworld} from './overworld.js';
// import physicsManager from './physics/physics-manager.js';
// import physxWorkerManager from './physics/physx-worker-manager.js';
// import {playersManager} from './players-manager.js';
// import {
//   PlayersManager,
// } from './players-manager.js';
import {makeId, parseQuery} from '../util.js';
// import voiceInput from './voice-input/voice-input.js';
// import {world} from './world.js';
import {scenesBaseUrl, defaultSceneName} from '../endpoints.js';
// import {
//   SpawnManager,
// } from '../spawn-manager.js';
import {
  SceneManager,
} from '../scene-manager.js';
import {
  World,
} from './world.js';
import {
  Universe,
} from './universe.js';
// import {
//   loadScene,
// } from './realm-utils.js';
// import {rootScene} from './renderer.js';
// import physx from './physics/physx.js';

//

// const actionsPrefix = 'actions.';
// const appsPrefix = 'apps.';

//

export class RealmManager extends THREE.Object3D {
  #rootRealm = null;

  constructor({
    playersManager,
    spawnManager,
    engine,
    characterSelectManager,
    audioManager,
  }) {
    super();

    // members
    if (!playersManager || !spawnManager || !engine || !characterSelectManager || !audioManager) {
      console.warn('invalid args', {
        playersManager,
        spawnManager,
        engine,
        characterSelectManager,
        audioManager,
      });
      debugger;
    }
    this.playersManager = playersManager;
    this.spawnManager = spawnManager;
    this.engine = engine;
    this.characterSelectManager = characterSelectManager;
    this.audioManager = audioManager;

    // locals
    // this.multiplayerEnabled = false;
    // this.multiplayerConnected = false;
    // this.realms = null;
    // this.playerCleanupFns = [];
  }

  /* getWorldsHost() {
    return window.location.protocol + '//' + window.location.hostname + ':' +
      ((window.location.port ? parseInt(window.location.port, 10) : (window.location.protocol === 'https:' ? 443 : 80)) + 1) + '/worlds/';
  } */

  getRootRealm() {
    const rootRealm = this.#rootRealm;
    if (!rootRealm) {
      debugger;
    }
    return rootRealm;
  }

  async setRealmSpec(realmSpec) {
    if (this.#rootRealm) {
      console.warn('already had a root realm');
      debugger;
      throw new Error('already had a root realm');
    }

    // console.log('set realm spec 1', realmSpec);
    const {/*src, */room} = realmSpec;

    if (!room) { // singleplayer
      this.#rootRealm = new World({
        engine: this.engine,
      });
    } else { // multiplayer
      this.#rootRealm = new Universe({
        playersManager: this.playersManager,
        spawnManager: this.spawnManager,
        engine: this.engine,
        characterSelectManager: this.characterSelectManager,
        audioManager: this.audioManager,
      });
    }
    this.add(this.#rootRealm);
    this.#rootRealm.updateMatrixWorld();
    await this.#rootRealm.setRealmSpec(realmSpec);
    
    const localPlayer = this.playersManager.getLocalPlayer();
    localPlayer.position.set(0, initialPosY, 0);
    localPlayer.updateMatrixWorld();

    localPlayer.characterPhysics.setPosition(localPlayer.position);
    localPlayer.characterPhysics.reset();
    // localPlayer.updatePhysics(0, 0);

    await this.spawnManager.spawn();

    // console.log('set realm spec 2', realmSpec);
  }

  async pushUrl(u) {
    history.pushState({}, '', u);
    globalThis.dispatchEvent(new MessageEvent('pushstate'));
    await this.handleUrlUpdate();
  }

  async handleUrlUpdate() {
    const q = parseQuery(location.search);
    await this.setRealmSpec(q);
  }
}