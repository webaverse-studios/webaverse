import * as THREE from 'three';
// import {scene, camera} from './renderer.js';
import physicsManager from '../../physics/physics-manager.js';
// import Avatar from '../../avatars/avatars.js';
// import metaversefile from 'metaversefile';
// import * as coreModules from './core-modules.js';
import {
  HitTracker,
} from './hit-tracker.js'
import {
  getOwnerApp,
} from '../../physics/physics-traverse-utils.js';

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
const hitAttemptEvent = new MessageEvent('hitattempt', {
  data: hitAttemptEventData,
});

//

export class HitManager extends EventTarget {
  constructor({
    webaverseRenderer,
    playersManager,
    physicsTracker,
    sounds,
  }) {
    super();

    if (!webaverseRenderer || !playersManager || !physicsTracker || !sounds) {
      console.warn('missing args', {
        webaverseRenderer,
        playersManager,
        physicsTracker,
        sounds,
      });
      debugger;
    } 
    this.webaverseRenderer = webaverseRenderer;
    this.playersManager = playersManager;
    this.physicsTracker = physicsTracker;
    this.sounds = sounds;

    // this.hitters = new Map();
    this.hitTrackers = new Map();

    // this.character = character;
    this.lastHitTime = -Infinity;
  }

  createHitTracker(opts) {
    return new HitTracker(opts, {
      sounds: this.sounds,
    });
  }
  /* addAppHitter(app, hitter) {
    // console.log('register hitter', {app, hitter});
    this.hitters.set(app, hitter);
  }
  removeAppHitter(app) {
    this.hitters.delete(app);
  } */
  addAppHitTracker(app, hitTracker) {
    this.hitTrackers.set(app, hitTracker);
  }
  removeAppHitTracker(app) {
    this.hitTrackers.delete(app);
  }

  attemptHit({
    character, // the character doing the hitting
    type,
    args,
    timestamp = performance.now(),
  }) {
    const {camera} = this.webaverseRenderer;

    hitAttemptEventData.type = type;
    hitAttemptEventData.args = args;
    this.dispatchEvent(hitAttemptEvent);

    const _disableLocalPlayerChracterController = () => {
      const localPlayer = this.playersManager.getLocalPlayer();
      const characterControllerPhysicsObject = localPlayer.characterPhysics.characterController;

      // console.log('disable local player', localPlayer);

      // const physicsObjects = this.physicsTracker.getAppPhysicsObjects(characterControllerPhysicsObject);
      const physicsObjects = [
        characterControllerPhysicsObject,
      ];
      const physicsScene = physicsManager.getScene();
      for (const physicsObject of physicsObjects) {
        physicsScene.disableGeometryQueries(physicsObject);
        physicsScene.disableGeometry(physicsObject);
        physicsScene.disableActor(physicsObject);
      }

      // debugger;
      return () => {
        // console.log('re-enable');
        for (const physicsObject of physicsObjects) {
          physicsScene.enableActor(physicsObject);
          physicsScene.enableGeometry(physicsObject);
          physicsScene.enableGeometryQueries(physicsObject);
        }
      };
    };
    /* this.physicsTracker.addAppPhysicsObject(
      avatarApp,
      this.characterPhysics.characterController
    ); */
    /* const physicsObjects = this.physicsTracker.getAppPhysicsObjects(app);
    const physicsScene = physicsManager.getScene();
    for (const physicsObject of physicsObjects) {
      physicsScene.disableGeometryQueries(physicsObject);
      physicsScene.disableGeometry(physicsObject);
      physicsScene.disableActor(physicsObject);
    } */
    const _getCollisionResult = () => {
      switch (type) {
        case 'sword': {
          const {
            hitRadius,
            hitHalfHeight,
            position,
            quaternion,
          } = args;
          const physicsScene = physicsManager.getScene();
          const collision = physicsScene.getCollisionObject(
            hitRadius,
            hitHalfHeight,
            position,
            quaternion,
          );
          
          // console.log('got collision', collision);

          if (collision) {
            const collisionId = collision.objectId;
            const timeDiff = timestamp - this.lastHitTime;
            if (timeDiff > 1000){
              hitAttemptEventData.args.physicsId = collisionId;
              this.dispatchEvent(hitAttemptEvent);
              this.lastHitTime = timestamp;
            }
            const result = this.physicsTracker.getPairByPhysicsId(collisionId);
            // console.log('got result', result);

            if (result) {
              let [app, physicsObject] = result;
              app = getOwnerApp(app);
              if (timeDiff > 1000) {
                const useAction = character.actionManager.getActionType('use');
                const damage = typeof useAction.damage === 'number' ? useAction.damage : 10;
                const hitDirection = app.position.clone()
                  .sub(character.position);
                hitDirection.y = 0;
                hitDirection.normalize();
      
                const damageMeshOffsetDistance = 1.5;
                const hitPosition = localVector.copy(character.position)
                  .add(localVector2.set(0, 0, -damageMeshOffsetDistance).applyQuaternion(character.quaternion))
                  .clone();
                localEuler.setFromQuaternion(camera.quaternion, 'YXZ');
                localEuler.x = 0;
                localEuler.z = 0;
                const hitQuaternion = localQuaternion.setFromEuler(localEuler);
      
                // XXX replace with hitTrackers; hitter is internally bound to respond with scream events
                // const hitter = this.hitters.get(app);
                // if (!hitter) {
                //   console.warn('no hitter', app, this.hitters);
                //   debugger;
                // }
                // debugger;
                const hitTracker = this.hitTrackers.get(app);
                if (hitTracker) {
                  // const willDie = app.willDieFrom(damage);
                  hitTracker.hit(damage, {
                    type: 'sword',
                    collisionId,
                    physicsObject,
                    hitPosition,
                    hitQuaternion,
                    hitDirection,
                    // willDie,
                  });
                
                  this.lastHitTime = timestamp;

                  return collision;
                }
              }
            }
          }
          return null;
        }
        case 'bullet': {
          const result = physicsManager.raycast(args.position, args.quaternion);
          if (result) {
            hitAttemptEventData.args.physicsId = result.objectId;
            this.dispatchEvent(hitAttemptEvent);
            const _performHit = () => {
              const targetApp = metaversefile.getAppByPhysicsId(result.objectId);
              if (targetApp) {
                const damage = 2;

                const hitPosition = new THREE.Vector3().fromArray(result.point);
                const hitQuaternion = new THREE.Quaternion().setFromRotationMatrix(
                  localMatrix.lookAt(
                    this.character.position,
                    hitPosition,
                    localVector.set(0, 1, 0)
                  )
                );

                const hitDirection = targetApp.position.clone()
                  .sub(this.character.position);
                // hitDirection.y = 0;
                hitDirection.normalize();
                
                // const willDie = targetApp.willDieFrom(damage);
                targetApp.hit(damage, {
                  type: 'bullet',
                  collisionId: result.objectId,
                  hitPosition,
                  hitDirection,
                  hitQuaternion,
                  // willDie,
                });
              } else {
                console.warn('no app with physics id', result.objectId);
              }
            };
            _performHit();

            return result
          }
          return null;
        }
        default: {
          throw new Error('unknown hit type :' + type);
        }
      }
    };

    const enableLocalPlayerCharacterController = _disableLocalPlayerChracterController();
    const result = _getCollisionResult();
    enableLocalPlayerCharacterController();
    return result;
  }

  update() {
    // nothing
  }
}