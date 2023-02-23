import * as THREE from 'three';
import {
  Matrix4,
  Quaternion,
  Vector3,
  Euler,
} from 'three';
// import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// import metaversefile from 'metaversefile';

// import {
//   PlayersManager,
// } from './players-manager.js';
// import physicsManager from './physics/physics-manager.js';
// import {
//   HPManager,
// } from './hp-manager.js';
// import {alea} from './procgen/procgen.js';
// import {createRelativeUrl, lookAtQuaternion, getNextPhysicsId} from './util.js';
// import dropManager from './drop-manager.js';
// import loaders from './loaders.js';
// import {InstancedBatchedMesh, InstancedGeometryAllocator} from './geometry-batching.js';
// import {createTextureAtlas} from './atlasing.js';
// import * as sounds from './sounds.js';
// import {ConstructorFragment} from 'ethers/lib/utils.js';
// import hitManager from './character-hitter.js'
// import {scene, camera} from './renderer.js';
// import * as coreModules from './core-modules.js';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector6 = new THREE.Vector3();
const localVector7 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();

//

export class MobSoundsPlayer {
  constructor({
    sounds,
  }) {
    this.sounds = sounds;

    this.soundsRequests = 0;
  }

  playSound(name) {
    /* if (this.soundsRequests >= MAXSOUNDSSAMETIME) {
      return;
    } */
    this.sounds.playSoundName(name);
    this.soundsRequests++;
    const duration = this.sounds.getSoundFiles()[name][0].duration * 1000;
    // setTimeout(()=>{this.soundsRequests--}, duration);
  }
}
// const mobSoundsPlayer = new MobSoundsPlayer();