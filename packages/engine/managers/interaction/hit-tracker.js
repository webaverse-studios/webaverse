import * as THREE from 'three';
// import physicsManager from '../../physics/physics-manager.js';
// import {
//   getOwnerApp,
// } from '../../physics/physics-traverse-utils.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();

//

const hitAnimationLength = 300;

//

export class HitTracker extends THREE.Object3D {
  constructor({
    app = null,
    totalHp = 100,
  }, {
    // world,
    sounds,
  }) {
    if (!app || !sounds) {
      console.warn('missing args', {
        app,
        sounds,
      });
      debugger;
    }
    super();

    const hitTracker = this; // new THREE.Object3D();
    hitTracker.name = 'hitTracker';
    
    let lastHitTime = -Infinity;
    hitTracker.hp = totalHp;
    hitTracker.totalHp = totalHp;
    let currentApp = null;
    // hitTracker.addEventListener('hit', e => {
    //   const e2 = {...e};
    //   app.dispatchEvent(e2);
    // });
    // hitTracker.addEventListener('die', e => {
    //   const e2 = {...e};
    //   app.dispatchEvent(e2);
    // });
    /* const frame = e => {
      hitTracker.update(e.data.timeDiff);
    };
    hitTracker.bind = app => {
      if (!currentApp) {
        app.parent.add(hitTracker);
        hitTracker.add(app);
        hitTracker.updateMatrixWorld();

        world.appManager.addEventListener('frame', frame);

        app.hitTracker = hitTracker;
        currentApp = app;
      } else {
        throw new Error('already bound');
      }
    };
    hitTracker.unbind = () => {
      if (currentApp) {
        if (hitTracker.parent) {
          hitTracker.parent.add(currentApp);
        } else {
          hitTracker.remove(currentApp);
        }
        currentApp.updateMatrixWorld();
        if (hitTracker.parent) {
          hitTracker.parent.remove(hitTracker);
        }

        currentApp = null;

        world.appManager.removeEventListener('frame', frame);
      } else {
        throw new Error('not bound');
      }
    }; */
    hitTracker.hit = (damage, opts) => {
      const result = hitTracker.damage(damage);
      const {hit, died} = result;
      if (hit) {
        const {collisionId, hitPosition, hitDirection, hitQuaternion} = opts;

        if (died) {
          // triggerDamageAnimation(collisionId);
          
          sounds.playSoundName('enemyDeath');
        }

        /* {
          const damageMeshApp = metaversefileApi.createApp();
          (async () => {
            const {importModule} = metaversefileApi.useDefaultModules();
            const m = await importModule('damageMesh');
            await damageMeshApp.addModule(m);
          })();
          damageMeshApp.position.copy(hitPosition);
          localEuler.setFromQuaternion(hitQuaternion, 'YXZ');
          localEuler.x = 0;
          localEuler.z = 0;
          damageMeshApp.quaternion.setFromEuler(localEuler);
          damageMeshApp.updateMatrixWorld();
          this.add(damageMeshApp);
        } */

        sounds.playSoundName('enemyCut');

        const hitEvent = {
          type: 'hit',
          collisionId,
          hitPosition,
          hitDirection,
          hitQuaternion,
          // willDie,
          damage,
          hp: hitTracker.hp,
          totalHp: hitTracker.totalHp,
        };
        // hitTracker.dispatchEvent(hitEvent);
        this.dispatchEvent(hitEvent);
        if (died) {
          const dieEvent = {
            type: 'die',
            // position: cylinderMesh.position,
            // quaternion: cylinderMesh.quaternion,
          };
          // hitTracker.dispatchEvent();
          this.dispatchEvent(dieEvent);
        }
      }
      return result;
    };

    hitTracker.damage = damage => {
      const now = performance.now();
      const timeDiff = now - lastHitTime;
      if (timeDiff > hitAnimationLength) {
        lastHitTime = now;
        
        hitTracker.hp = Math.max(hitTracker.hp - damage, 0);
        if (hitTracker.hp > 0) {
          // hitTime = 0;
          
          /* hitTracker.dispatchEvent({
            type: 'hit',
            hp,
            totalHp,
            position: cylinderMesh.startPosition.clone(),
            quaternion: cylinderMesh.quaternion.clone(),
          }); */
          return {
            hit: true,
            died: false,
          };
        } else {
          return {
            hit: true,
            died: true,
          };
        }
      } else {
        return {
          hit: false,
          died: false,
        };
      }
    };
    // hitTracker.willDieFrom = damage => (hitTracker.hp - damage) <= 0;
    /* hitTracker.update = timeDiff => {
      if (hitTime !== -1) {
        hitTime += timeDiff;
        
        const scale = (1-hitTime/hitAnimationLength) * 0.1;
        hitTracker.position.set((-1+Math.random()*2)*scale, (-1+Math.random()*2)*scale, (-1+Math.random()*2)*scale);
        hitTracker.updateMatrixWorld();
        if (hitTime > hitAnimationLength) {
          hitTime = -1;
        }
      }
    }; */
  }
}