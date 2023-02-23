import * as THREE from 'three';
// import {scene, camera} from './renderer.js';
// import physicsManager from './physics/physics-manager.js';
import Avatar from './avatars/avatars.js';
// import metaversefile from 'metaversefile';
import * as coreModules from './core-modules.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();

//

// const scene = 'not implemented'; // XXX

//

const hitAttemptEventData = {
  type: '',
  args: null,
};
// const hitAttemptEvent = new MessageEvent('hitattempt', {
//   data: hitAttemptEventData,
// });

export class CharacterHitter {
  constructor({
    character,
  }) {
    this.character = character;

    this.lastHitTime = -Infinity;
    this.cleanupFns = [];

    this.#listen();
  }

  #listen() {
    const hit = e => {
      this.getHit();
    };
    this.character.addEventListener('hit', hit);
    this.cleanupFns.push(() => {
      this.character.removeEventListener('hit', hit);
    });
  }
  destroy() {
    for (const cleanupFn of this.cleanupFns) {
      cleanupFn();
    }
  }

  getHit() {
    const hurtAction = this.character.actionManager.addAction({
      type: 'hurt',
      animation: Math.random() < 0.5 ? 'pain_arch' : 'pain_back',
    });

    const emotions = [
      // 'joy',
      // 'fun',
      'sorrow',
      'angry',
      // 'neutral',
      'surprise',
    ];
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    const faceposeAction = this.character.actionManager.addAction({
      type: 'facepose',
      emotion,
      value: 1,
    });

    const gruntTypes = [
      'hurt',
      'scream',
      'attack',
      'angry',
      'gasp',
    ];
    const gruntType = gruntTypes[Math.floor(Math.random() * gruntTypes.length)];
    // console.log('play grunt', emotion, gruntType);
    this.character.avatarCharacterSfx?.playGrunt(gruntType);

    /* {
      const damageMeshApp = metaversefile.createApp();
      (async () => {
        // await coreModules.waitForLoad();
        // const {modules} = metaversefile.useDefaultModules();
        const m = await coreModules.importModule('damageMesh');
        await damageMeshApp.addModule(m);
      })();
      damageMeshApp.position.copy(this.character.position);
      localEuler.setFromQuaternion(camera.quaternion, 'YXZ');
      localEuler.x = 0;
      localEuler.z = 0;
      damageMeshApp.quaternion.setFromEuler(localEuler);
      damageMeshApp.updateMatrixWorld();
      scene.add(damageMeshApp);
    } */

    const animations = Avatar.getAnimations();
    const hurtAnimation = animations.find(a => a.isHurt);
    const hurtAnimationDuration = hurtAnimation.duration;
    setTimeout(() => {
      // const hurtActionIndex = this.character.indexOfAction(hurtAction);
      this.character.actionManager.removeAction(hurtAction);
    }, hurtAnimationDuration * 1000);
    setTimeout(() => {
      // const faceposeActionIndex = this.character.indexOfAction(faceposeAction);
      this.character.actionManager.removeAction(faceposeAction);
    }, 1000);
  }

  update() {
    // nothing, but still called
  }
}
// const hitManager = new EventTarget();
// export default hitManager;