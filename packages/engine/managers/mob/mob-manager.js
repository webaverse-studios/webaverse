import * as THREE from 'three';
import {
  Matrix4,
  Quaternion,
  Vector3,
  Euler,
} from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// import metaversefile from 'metaversefile';

// import {
//   PlayersManager,
// } from './players-manager.js';
import physicsManager from '../../physics/physics-manager.js';
// import {
//   HPManager,
// } from './hp-manager.js';
// import {alea} from './procgen/procgen.js';
import {
  createRelativeUrl,
  lookAtQuaternion,
  getNextPhysicsId,
} from '../../util.js';
// import dropManager from './drop-manager.js';
// import loaders from './loaders.js';
// import {InstancedBatchedMesh, InstancedGeometryAllocator} from './geometry-batching.js';
// import {createTextureAtlas} from './atlasing.js';
import * as sounds from '../../sounds.js';
// import {ConstructorFragment} from 'ethers/lib/utils.js';
// import hitManager from './character-hitter.js'
// import {scene, camera} from './renderer.js';
// import * as coreModules from './core-modules.js';
import {
  MobSoundsPlayer,
} from './mob-sounds.js';

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

const upVector = new THREE.Vector3(0, 1, 0);
const identityMatrix = new THREE.Matrix4();
const chunkWorldSize = 16;
const minDistance = 1;
const hitDistance = 1.5;
const maxAnisotropy = 16;

let numGeometries = 8;
const maxNumGeometries = 32;
const maxAnimationPerGeometry = 8;
const maxInstancesPerDrawCall = 128;
const maxDrawCallsPerGeometry = 1;
const maxBonesPerInstance = 128;
const maxFrameCountPerAnimation = 512;

const bakeFps = 24;
const maxAnimationFrameLength = 512;

let unifiedBoneTextureSize = 1024;
const mobGlobalData = [];
const MAXSOUNDSSAMETIME = 3;

// hardcoded sound, loaded from centralized sound bank
// todo: load sounds from app, from wave file packaged with glb
const soundsDB = new Map([
  ["https://webaverse.github.io/silkworm-bloater/silkworm-bloater.glbattack",     "worm_bloaterattack"],
  ["https://webaverse.github.io/silkworm-bloater/silkworm-bloater.glbattack.001", "worm_bloaterattack"],
  ["https://webaverse.github.io/silkworm-bloater/silkworm-bloater.glbattack.002", "worm_bloaterattack"],
  ["https://webaverse.github.io/silkworm-bloater/silkworm-bloater.glbdeath",      "worm_bloaterdie"],
  // ["https://webaverse.github.io/silkworm-bloater/silkworm-bloater.glbidle",       ""],
  // ["https://webaverse.github.io/silkworm-bloater/silkworm-bloater.glbwalk",       ""],
  ["https://webaverse.github.io/silkworm-slasher/silkworm-slasher.glbattack",     "worm_slasherattack"],
  ["https://webaverse.github.io/silkworm-slasher/silkworm-slasher.glbattack.001", "worm_slasherattack"],
  ["https://webaverse.github.io/silkworm-slasher/silkworm-slasher.glbattack.002", "worm_slasherattack"],
  ["https://webaverse.github.io/silkworm-slasher/silkworm-slasher.glbdeath",      "worm_slasherdie"],
  // ["https://webaverse.github.io/silkworm-slasher/silkworm-slasher.glbidle",       ""],
  // ["https://webaverse.github.io/silkworm-slasher/silkworm-slasher.glbjump",       ""],
  // ["https://webaverse.github.io/silkworm-slasher/silkworm-slasher.glbwalk",       ""],
  ["https://webaverse.github.io/silkworm-runner/silkworm-runner.glbattack",       "worm_runnerattack"],
  ["https://webaverse.github.io/silkworm-runner/silkworm-runner.glbattack.001",   "worm_runnerattack"],
  ["https://webaverse.github.io/silkworm-runner/silkworm-runner.glbattack.002",   "worm_runnerattack"],
  ["https://webaverse.github.io/silkworm-runner/silkworm-runner.glbdeath",        "worm_runnerdie"],
  // ["https://webaverse.github.io/silkworm-runner/silkworm-runner.glbidle",         ""],
  // ["https://webaverse.github.io/silkworm-runner/silkworm-runner.glbwalk",         ""]
  ["attack", "worm_attack"],
  ["death", "worm_die"]
]);

// mob instances constants
const debugMob = false;
const IDLEACTIONTYPE = 'IDLE';
const ATTACKACTIONTYPE = 'ATCK';
const DIEACTIONTYPE = 'DIE';
const ANIMATIONACTIONTYPE = 'ANMT';
const HITACTIONTYPE = 'HIT';
const VANISHACTIONTYPE = 'VANISH';
const defaultMobLifePoint = 5;
const animationEasing = 16;
const defaultAggroDistance = 3;
const debugMobActions = true;
const debugShader = false;
const debugBBox = false;

export const MobStates = {
  idle: 0,
  attack: 1,
  followTarget: 3,
  attackTarget: 4,
};

// const MAXSOUNDSSAMETIME = 2;
// window.THREE = THREE;

const _zeroY = v => {
  v.y = 0;
  return v;
};
const _findMesh = o => {
  let mesh = null;
  const _recurse = o => {
    if (o.isMesh) {
      mesh = o;
    } else if (o.children) {
      for (const child of o.children) {
        _recurse(child);
        if (mesh) {
          break;
        }
      }
    }
  };
  _recurse(o);
  return mesh;
};
const _findBone = o => {
  let bone = null;
  const _recurse = o => {
    if (o.isBone) {
      bone = o;
    } else if (o.children) {
      for (const child of o.children) {
        _recurse(child);
        if (bone) {
          break;
        }
      }
    }
  };
  _recurse(o);
  return bone;
};

function makeCharacterController(app, {
  radius,
  height,
  physicsOffset,
}) {
  const innerHeight = height - radius * 2;
  const contactOffset = 0.1 * height;
  const stepOffset = 0.1 * height;

  const characterPosition = localVector.setFromMatrixPosition(app.matrixWorld)
    .add(
      localVector3.copy(physicsOffset)
        .applyQuaternion(localQuaternion)
    );

  const physicsScene = physicsManager.getScene();
  const characterController = physicsScene.createCharacterController(
    radius - contactOffset,
    innerHeight,
    contactOffset,
    stepOffset,
    characterPosition
  );
  return characterController;
}

class Mob {
  constructor(app, srcUrl) {
    this.app = app;
    this.subApp = null;

    this.name = 'mob@' + srcUrl;

    this.updateFns = [];
    this.cleanupFns = [];

    // if (srcUrl) {
      this.loadPromise = (async () => {
        await this.loadApp(srcUrl);
      })();
    // }
  }

  /* #getRng() {
    return alea(this.name);
  } */

  async loadApp(mobJsonUrl) {
    // let live = true;
    // this.cleanupFns.push(() => {
    //   live = false;
    // });

    const res = await fetch(mobJsonUrl);
    // if (!live) return;
    const json = await res.json();
    // if (!live) return;

    const mobComponent = json;
    if (mobComponent) {
      let {
        mobUrl = '',
        radius = 0.3,
        height = 1,
        physicsPosition = [0, 0, 0],
        // physicsQuaternion = [0, 0, 0],
        // modelPosition = [0, 0, 0],
        modelQuaternion = [0, 0, 0, 1],
        extraPhysics = [],
      } = mobComponent;
      mobUrl = createRelativeUrl(mobUrl, mobJsonUrl);
      const physicsOffset = new THREE.Vector3().fromArray(physicsPosition);
      // const physicsRotation = new THREE.Quaternion().fromArray(physicsQuaternion);
      // const modelOffset = new THREE.Vector3().fromArray(modelPosition);
      const modelPrerotation = new THREE.Quaternion().fromArray(modelQuaternion);

      const subApp = await metaversefile.createAppAsync({
        start_url: mobUrl,
        position: this.app.position,
        quaternion: this.app.quaternion,
        scale: this.app.scale,
      });
      if (!live) return;

      // const rng = this.#getRng();
      const numDrops = Math.floor(Math.random() * 3) + 1;
      let lastHitTime = 0;

      const _attachToApp = () => {
        this.app.add(subApp);
        this.subApp = subApp;

        this.app.position.set(0, 0, 0);
        this.app.quaternion.identity();
        this.app.scale.set(1, 1, 1);
        this.app.updateMatrixWorld();

        this.cleanupFns.push(() => {
          this.app.clear();
        });
      };
      _attachToApp();

      const _drop = () => {
        const {moduleUrls} = metaversefile.useDefaultModules();
        const silkStartUrl = moduleUrls.silk;
        for (let i = 0; i < numDrops; i++) {
          dropManager.createDropApp({
            start_url: silkStartUrl,
            position: subApp.position.clone()
              .add(new THREE.Vector3(0, 0.7, 0)),
            quaternion: subApp.quaternion,
            scale: subApp.scale
          });
        }
      };
      const _bindHitTracker = () => {
        const hitTracker = hpManager.makeHitTracker();
        hitTracker.bind(subApp);
        subApp.dispatchEvent({type: 'hittrackeradded'});
        const die = () => {
          this.app.destroy();
          _drop();
        };
        subApp.addEventListener('die', die, {once: true});
      };
      _bindHitTracker();

      const mesh = subApp;
      const animations = subApp.glb.animations;
      let  {
        idleAnimation = ['idle'],
        aggroDistance,
        walkSpeed = 1,
      } = mobComponent;
      if (idleAnimation) {
        if (!Array.isArray(idleAnimation)) {
          idleAnimation = [idleAnimation];
        }
      } else {
        idleAnimation = [];
      }

      const characterController = makeCharacterController(subApp, {
        radius,
        height,
        physicsOffset,
      });
      const _getPhysicsExtraPositionQuaternion = (
        spec,
        localVector,
        localQuaternion,
        localVector2,
        localMatrix
      ) => {
        const {
          position,
          quaternion,
        } = spec;
        
        localVector.fromArray(position);
        localQuaternion.fromArray(quaternion);
        localVector2.set(1, 1, 1);
        localMatrix.compose(localVector, localQuaternion, localVector2)
          .premultiply(mesh.matrixWorld)
          .decompose(localVector, localQuaternion, localVector2);
      };
      const extraPhysicsObjects = extraPhysics.map(spec => {
        const {
          radius,
          halfHeight,
        } = spec;
        _getPhysicsExtraPositionQuaternion(spec, localVector, localQuaternion, localVector2, localMatrix);
        const physicsObject = physicsManager.addCapsuleGeometry(localVector, localQuaternion, radius, halfHeight);
        physicsObject.spec = spec;
        return physicsObject;
      });
      const physicsObjects = [characterController].concat(extraPhysicsObjects);
      subApp.getPhysicsObjects = () => physicsObjects;

      this.cleanupFns.push(() => {
        physicsManager.destroyCharacterController(characterController);
        for (const extraPhysicsObject of extraPhysicsObjects) {
          physicsManager.removeGeometry(extraPhysicsObject);
        }
      });

      // rotation hacks
      {
        mesh.position.y = 0;
        localEuler.setFromQuaternion(mesh.quaternion, 'YXZ');
        localEuler.x = 0;
        localEuler.z = 0;
        mesh.quaternion.setFromEuler(localEuler);
      }

      // initialize animation
      const idleAnimationClips = idleAnimation.map(name => animations.find(a => a.name === name)).filter(a => !!a);
      if (idleAnimationClips.length > 0) {
        const mixer = new THREE.AnimationMixer(mesh);
        const idleActions = idleAnimationClips.map(idleAnimationClip => mixer.clipAction(idleAnimationClip));
        for (const idleAction of idleActions) {
          idleAction.play();
        }
        
        this.updateFns.push((timestamp, timeDiff) => {
          const deltaSeconds = timeDiff / 1000;
          mixer.update(deltaSeconds);
        });
      }

      // set up frame loop
      let animation = null;
      let velocity = new THREE.Vector3(0, 0, 0);
      this.updateFns.push((timestamp, timeDiff) => {
        const localPlayer = playersManager.getLocalPlayer();
        const timeDiffS = timeDiff / 1000;

        if (animation) {
          mesh.position.add(localVector.copy(animation.velocity).multiplyScalar(timeDiff/1000));
          animation.velocity.add(localVector.copy(physicsManager.getGravity()).multiplyScalar(timeDiff/1000));
          if (mesh.position.y < 0) {
            animation = null;
          }

          physicsManager.setCharacterControllerPosition(characterController, mesh.position);

          mesh.updateMatrixWorld();
          
          // _updatePhysics();
        } else {
          // decompose world transform
          mesh.matrixWorld.decompose(localVector2, localQuaternion, localVector3);
          const meshPosition = localVector2;
          const meshQuaternion = localQuaternion;
          const meshScale = localVector3;

          const meshPositionY0 = localVector4.copy(meshPosition);
          const characterPositionY0 = localVector5.copy(localPlayer.position)
            .add(localVector6.set(0, localPlayer.avatar ? -localPlayer.avatar.height : 0, 0));
          const distance = meshPositionY0.distanceTo(characterPositionY0);

          _zeroY(meshPositionY0);
          _zeroY(characterPositionY0);

          const _handleAggroMovement = () => {
            if (distance < aggroDistance) {
              if (distance > minDistance) {
                const movementDirection = _zeroY(characterPositionY0.sub(meshPositionY0))
                  .normalize();
                const maxMoveDistance = distance - minDistance;
                const moveDistance = Math.min(walkSpeed * timeDiff * 1000, maxMoveDistance);
                const moveDelta = localVector6.copy(movementDirection)
                  .multiplyScalar(moveDistance)
                  .add(localVector7.copy(velocity).multiplyScalar(timeDiffS));
                const minDist = 0;

                const popExtraGeometry = (() => {
                  for (const extraPhysicsObject of extraPhysicsObjects) {
                    physicsManager.disableActor(extraPhysicsObject);
                  }
                  return () => {
                    for (const extraPhysicsObject of extraPhysicsObjects) {
                      physicsManager.enableActor(extraPhysicsObject);
                    }
                  };
                })();

                const physicsScene = physicsManager.getScene();
                const flags = physicsScene.moveCharacterController(
                  characterController,
                  moveDelta,
                  minDist,
                  timeDiffS,
                  characterController.position
                );
                popExtraGeometry();

                // const collided = flags !== 0;
                let grounded = !!(flags & 0x1);
                if (!grounded) {
                  velocity.add(
                    localVector.copy(physicsScene.getGravity())
                      .multiplyScalar(timeDiffS)
                  );
                } else {
                  velocity.set(0, 0, 0);
                }

                meshPosition.copy(characterController.position)
                  .sub(physicsOffset);
                
                const targetQuaternion = localQuaternion2
                  .setFromRotationMatrix(
                    localMatrix
                      .lookAt(
                        meshPosition,
                        localPlayer.position,
                        upVector
                      )
                  ).premultiply(modelPrerotation);
                localEuler.setFromQuaternion(targetQuaternion, 'YXZ');
                localEuler.x = 0;
                localEuler.y += Math.PI;
                localEuler.z = 0;
                localQuaternion2.setFromEuler(localEuler);
                meshQuaternion.slerp(targetQuaternion, 0.1);

                mesh.matrixWorld.compose(meshPosition, meshQuaternion, meshScale);
                mesh.matrix.copy(mesh.matrixWorld);
                if (this.app.parent) {
                  mesh.matrix.premultiply(localMatrix.copy(this.app.parent.matrixWorld).invert());
                }
                mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
              }
            }
          };
          _handleAggroMovement();

          const _handleAggroHit = () => {
            if (distance < hitDistance) {
              const timeSinceLastHit = timestamp - lastHitTime;
              if (timeSinceLastHit > 1000) {
                localPlayer.characterHitter.getHit(Math.random() * 10);
                lastHitTime = timestamp;
              }
            }
          };
          _handleAggroHit();

          const _updateExtraPhysics = () => {
            for (const extraPhysicsObject of extraPhysicsObjects) {
              const {spec} = extraPhysicsObject;

              _getPhysicsExtraPositionQuaternion(spec, localVector, localQuaternion, localVector2, localMatrix);

              extraPhysicsObject.position.copy(localVector);
              extraPhysicsObject.quaternion.copy(localQuaternion);
              extraPhysicsObject.updateMatrixWorld();
              physicsManager.setTransform(extraPhysicsObject);
            }
          };
          _updateExtraPhysics();
        }
      });
      const hit = e => {
        const {hitQuaternion} = e;
        const euler = new THREE.Euler().setFromQuaternion(hitQuaternion, 'YXZ');
        euler.x = 0;
        euler.z = 0;
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        const hitSpeed = 1;
        animation = {
          velocity: new THREE.Vector3(0, 6, -5).applyQuaternion(quaternion).multiplyScalar(hitSpeed),
        };
      };
      subApp.addEventListener('hit', hit);
      this.cleanupFns.push(() => {
        subApp.removeEventListener('hit', hit);
      });
    }
  }

  // getPhysicsObjects() {
  //   if (this.subApp) {
  //     return this.subApp.getPhysicsObjects();
  //   } else {
  //     return [];
  //   }
  // }

  update(timestamp, timeDiff) {
    for (const fn of this.updateFns) {
      fn(timestamp, timeDiff);
    }
  }

  destroy() {
    for (const fn of this.cleanupFns) {
      fn();
    }
  }
}

/*
  Action to be attached to AI controlled entities
  durationFrames: action duration
  actionMethod: action to be performed
  actionMethodFrames: contains the frame id that need the action to be performed. If empty it will be performed only at the starting frame
*/

/* export class ActionComponent {
  constructor(
    actionId,
    type,
    durationS = 0.016,
    actionMethod = (mob)=>{},
    onFinish = undefined,
    tickMethod = undefined) {
    this.Do = actionMethod;
    this.onFinish = onFinish;
    this.durationS = durationS;
    this.timeStamp = 0;
    this.started = false;
    this.type = type;
    this.actionId = actionId;
    this.currentMob = undefined;
    this.tickMethod = tickMethod;
  }

  // get the promise called when the action finishes
  getActionFinishPromise(){
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  // starts the action, return the promise called at the end of the action
  start(mob){
    this.currentMob = mob;
    this.started = true;
    this.Do(mob);
    return this.resolvePromise ?? this.getActionFinishPromise();
  }

  // return true if the action is currently running, false if the action is not yet started
  isRunning(){
    return this.started;
  }

  // called every frame
  tick(timeDiffS){
    if(!this.started)
      return;

    this.timeStamp += timeDiffS;
    if(this.tickMethod){
      this.tickMethod(this.currentMob, this.timeStamp, timeDiffS);
    }
    if(this.timeStamp >= this.durationS){
      if(this.onFinish)
        this.onFinish(this.currentMob)
      if(this.resolvePromise)
        this.resolvePromise();
      this.stop();
    }
  }

  // stops the action and rewinds it back at the beginning
  stop(){
    this.timeStamp = 0;
    this.currentMob = undefined;
    this.started = false;
    this.resolvePromise = undefined;
  }
}

// default class for simple idle animation play
class DefaultIdleAction extends ActionComponent {
  constructor(durationS){
    const actionMethod = (mob)=>{
      mob.playAnimation('idle', false);

    }
    super('idle', IDLEACTIONTYPE, durationS, actionMethod);
  }
}

class AttackAction extends ActionComponent {
  constructor(durationS, attackId){
    const actionMethod = (mob)=>{
      if(!mob)
        return;
      
      mob.playAnimation(attackId, true);
      mob.target.characterHitter.getHit(Math.random() * 10);
    }
    super(attackId, ATTACKACTIONTYPE, durationS, actionMethod);
  }
}

class HitAction extends ActionComponent {
  constructor(durationS){
    const actionMethod = (mob)=>{
    }
    super('hit', HITACTIONTYPE, durationS, actionMethod);
  }
}

class DieAction extends ActionComponent {
  constructor(durationS){
    const actionMethod = (mob)=>{
      mob.playAnimation('death', true);
    }

    const onFinish = (mob)=>{
      mob.kill();
    }
    super('death', DIEACTIONTYPE, durationS, actionMethod, onFinish);
  }
}

class AnimationAction extends ActionComponent {
  constructor(durationS, animationId){
    const actionMethod = (mob)=>{
      mob.playAnimation(animationId, true);
    }
    super('animationAction'+animationId, ANIMATIONACTIONTYPE, durationS, actionMethod);
  }
}

class VanishAction extends ActionComponent {
  constructor(durationS){
    const actionMethod = (mob)=>{
    }

    const tickMethod = (mob, timeStampS, timeDiffS)=>{
      mob.vanish += timeDiffS/durationS;
      mob.updateVanish = true;
    }

    const onFinish = (mob)=>{
      mob.destroy();
    }
    super('vanish', VANISHACTIONTYPE, durationS, actionMethod, onFinish, tickMethod);
  }
}

class MobAIControllerPrototype {
  constructor({
    playersManager,
  }) {
    if (!playersManager) {
      throw new Error('playersManager is required'); 
    }

    this.playersManager = playersManager;

    this.mobs = [];

    throw new Error('using globals...');

    window.mobsAttack = (id)=>{
      let mobs;
      if(id === -1){
        mobs = this.mobs;
      }
      else{
        mobs = [this.mobs[id]];
      }
      for(const m of mobs){
        m.target = this.playersManager.getLocalPlayer();
        m.state = MobStates.attackTarget;
      }
    }

    window.mobsAttackInPlace = (id)=>{
      let mobs;
      if(id === -1){
        mobs = this.mobs;
      }
      else{
        mobs = [this.mobs[id]];
      }
      for(const m of mobs)
        m.state = MobStates.attack;
    }

    window.mobsIdle = (id)=>{
      let mobs;
      if(id === -1){
        mobs = this.mobs;
      }
      else{
        mobs = [this.mobs[id]];
      }
      for(const m of mobs)
        m.state = MobStates.idle;
    }

    window.mobsState = (id)=>{
      console.log(this.mobs[id].state);
    }

    window.mobsfollowTarget = (id)=>{
      let mobs;
      if(id === -1){
        mobs = this.mobs;
      }
      else{
        mobs = [this.mobs[id]];
      }
      for(const m of mobs){
        m.target = this.playersManager.getLocalPlayer();
        m.state = MobStates.followTarget;
      }
    }
  }

  addMob(mob){
    this.mobs.push(mob);
    mob.killEvents.push(()=>{
      const index = this.mobs.indexOf(mob);
      if (index > -1) {
        this.mobs.splice(index, 1);
      }
    });
  }
} */

/* class RagdollSpawner{
  constructor(addToScene){
    this.addToScene = addToScene;
  }

  spawnRagdoll(pos, quat, geoId){
    console.log(geoId)
    console.log(mobGlobalData)
    const mesh = mobGlobalData[geoId].mesh;
    //this.addToScene(mesh);
    mesh.position.copy(pos);
    mesh.rotation.setFromQuaternion(quat);
  }
}

let ragdollSpawner; */
/*
  class for mob instances. integrate the action system, performing actions through action components
  pos: mob position
  quat: mob orientation
  geometryIndex: geometry to use
  radius: for physics collision
  height: for physics collision
  velocity: mob walking speed
  idleAction: action to repeatedly perform when no other action are provided
*/
export class MobInstance {
  constructor(pos, quat, geometryIndex, timeOffset, radius, height, velocity, idleAction) {
    this.actions = [];
    this.target = undefined;
    this.life = defaultMobLifePoint;
    this.actionsQueue = [];
    this.position = new Vector3().fromArray(pos);
    this.quaternion = new Quaternion().fromArray(quat);
    this.geometryIndex = geometryIndex;
    this.timeOffset = timeOffset;
    this.animations = mobGlobalData[this.geometryIndex].animationsData;
    this.updatePosition = true;
    this.updateRotation = true;
    this.updateTimeOffset = true;
    this.updateVanish = true;
    this.vanish = 0;
    this.updateAnimation = true;
    this.rotationInterpolation = 1;
    this.lookAtTarget = new Vector3(1, 0, 0);
    this.locationTarget = new Vector3().copy(this.position);
    this.velocity = velocity;
    this.grounded = false;
    this.movement = new Vector3(0, 0, 0);
    this.radius = radius;
    this.initPhysics(radius, height);
    this._createActions();
    this.killEvents = [];
    this.askForTarget = undefined;
    this.aggroDistance = defaultAggroDistance;
    this.dead = false;
    this.state = MobStates.idle;
    this.stateActionMap = new Map([
      [MobStates.idle, ['idle']],
      [MobStates.attack, ['attack']]
    ]);
    this.followTargetOutOfRange = false;
    this.uTimeInt = 0;
    hitManager.addEventListener('hitattempt', (e) => this.hitAction(e.data));
  }

  hitAction(hitData){
    if(!hitData.args.physicsId || hitData.args.physicsId !== this.controller.physicsId)
      return;

    // damage and death
    switch(hitData.type){
      case 'sword':
        this.life -= 2;
        this.checkDeath();
        break;
      case 'bullet':
        this.life -= 1;
        this.checkDeath();
        break;
    }
    
    /* // damage UI
    const damageMeshApp = metaversefile.createApp();
    (async () => {
      const m = await coreModules.importModule('damageMesh');
      await damageMeshApp.addModule(m);
    })(); */
    
    damageMeshApp.position.copy(this.position);
    localEuler.setFromQuaternion(camera.quaternion, 'YXZ');
    localEuler.x = 0;
    localEuler.z = 0;
    damageMeshApp.quaternion.setFromEuler(localEuler);
    damageMeshApp.updateMatrixWorld();
    scene.add(damageMeshApp);
  }

  initPhysics(radius, height){
    const physicsScene = physicsManager.getScene();
    this.controller = physicsScene.createCharacterController(
      radius,
      height,
      height*0.05,
      height*0.05,
      this.position
    );
    this.controller.position.copy(this.position);
    this.controller.applyQuaternion(this.quaternion);
    physicsScene.setTransform(this.controller, true);
    this.fallTime = 0;
    if(debugBBox)
      this.controller.physicsMesh.visible = true;
  }

  getGeometryIndex(){
    return this.geometryIndex;
  }

  checkDeath(){
    if(this.life <= 0){
      this.actionsQueue = [];
      this.startAction('death');
    }
  }

  destroy(){
    for(const k of this.killEvents){
      k();
    }
  }

  kill(){
    this.dead = true;
    const anim = this.animations.get('death');
    this.timeOffset = anim.frameCount*0.99;
    this.updateTimeOffset = true;
    this.startAction('vanish');
  }

  _createActions(){
    for(let [key, value] of this.animations){
      if(key === 'idle'){
        this.actions.push(new DefaultIdleAction(value.duration));
        continue;
      }

      if(key.startsWith('attack')){
        this.actions.push(new AttackAction(value.duration, key));
        continue;
      }

      if(key === 'death'){
        this.actions.push(new DieAction(value.duration * 0.99));
        continue;
      }

      this.actions.push(new AnimationAction(value.duration, key));
    }
    const hitAnim = this.animations.get('death');
    this.actions.push(new HitAction(0));
    this.actions.push(new VanishAction(4));
  }

  getPostion(){
    return this.position.toArray();
  }

  getQuaternion(){
    return this.quaternion.toArray();
  }

  hasAction(type){
    for(const a of this.actions){
      if (a.type === type)
        return true;
    }
    return false;
  }

  startAction(actionId){
    for(const a of this.actions){
      if(a.actionId === actionId){
        if(this.life <= 0 && a.type !== DIEACTIONTYPE && a.type !== VANISHACTIONTYPE)
          return;
        this.actionsQueue.push(a);
      }
    }
  }

  addAction(action){
    this.action.push(action);
  }

  // turn mob towards t versor with an ease out profile animation
  animatedLookAt(t){
    const p = this.position;
    this.lookAtTarget = new Vector3(t.x - p.x, 0/* t.y - p.y */, t.z - p.z);
    this.rotationInterpolation = 0;
  }

  // rotate mob instantly
  lookAt(t){
    const p = this.position;
    this.quaternion = lookAtQuaternion(new Vector3(t.x - p.x, 0, t.z - p.z));
    this.updateRotation = true;
  }

  // walk mob for one frame towards a direction;
  walk(walkVersor){
    this.playAnimation('walk', false);
    this.movement.add(walkVersor.normalize().multiplyScalar(this.velocity));
  }

  debugAction(timeDiffS){
    if(this.actionsQueue.length === 0){
      this.startAction('attack');
      this.actionsQueue.push(this.idleAction);
    }

    const currentAction = this.actionsQueue[0];
    if(currentAction.isRunning()){
      currentAction.tick(timeDiffS);
    } else{
      currentAction.start(this).then(()=>{
        this.actionsQueue.shift();
      });
    }
  }

  // action management routine, it will play action in a blocking way (for the moment).
  // after each action is finised it will pop it out of the action queue
  manageActions(timeDiffS){
    
    if(this.actionsQueue.length === 0){
      if(this.dead)
        return;
      
      if(!this.stateActionMap.has(this.state)){
        return;
      }
        
      const currentActions = this.stateActionMap.get(this.state);
      for(const a of currentActions){
        this.startAction(a);
      }
      return;
    }

    const currentAction = this.actionsQueue[0];
    if(currentAction.isRunning()){
      currentAction.tick(timeDiffS);
    } else{
      currentAction.start(this).then(()=>{
        this.actionsQueue.shift();
      });
    }
  }

  followTarget(attack){
    if (this.life <= 0 || !this.target) {
      return;
    }

    this.animatedLookAt(this.target.position);
    const targetVector = this.target.position.clone().sub(this.position);
    if(targetVector.length() < this.aggroDistance*1.1){
      if(targetVector.length() < this.aggroDistance*0.8){
        this.followTargetOutOfRange = false;
        if(this.currentAnimation === this.animations.get('walk').id){
          this.playAnimation('idle', false);
        }
      }

      if(attack){
        let isAttacking = false;
        for(const a of this.actionsQueue){
          if(a.type === ATTACKACTIONTYPE){
            isAttacking = true;
            break;
          }
        }
        if(!isAttacking){
          for(const a of this.stateActionMap.get(MobStates.attack)){
            this.startAction(a);
          }
        }
      }

    }
    else if(targetVector.length() > this.aggroDistance){
      this.followTargetOutOfRange = true;
    }

    if(this.followTargetOutOfRange){
      this.walk(targetVector);
    }
  }

  // called every frame
  update(playerLocation, timeDiff){
    const timeDiffS = timeDiff / 1000;
    switch(this.state) {
      case MobStates.followTarget:
        this.followTarget(false);
        break;

      case MobStates.attackTarget:
        this.followTarget(true);
        break;
    }
    this.manageActions(timeDiffS);

    if(!this.grounded){
      // 15 seconds it reach terminal velocity in air
      this.fallTime = this.fallTime >= 15 ? this.fallTime : this.fallTime + timeDiffS;
      const physicsScene = physicsManager.getScene();
      const gravity = physicsScene.getGravity().clone();
      this.movement.add(gravity.multiplyScalar(this.fallTime * this.fallTime));
    }
    else{
      this.fallTime = 0;
    }

    // manage Rotation
    if(this.rotationInterpolation < 1){
      this.rotationInterpolation += (1-this.rotationInterpolation) / animationEasing;
      this.rotationInterpolation.toFixed(2);
      this.quaternion.slerp(lookAtQuaternion(this.lookAtTarget), this.rotationInterpolation);
      this.controller.rotation.setFromQuaternion(this.quaternion);
      this.updateRotation = true;
    }

    // manage position
    if(this.movement.length() > 0 || Math.floor(this.uTime) > this.uTimeInt){
      this.uTimeInt = Math.floor(this.uTime);
      this.moveMobInternal(timeDiffS);
    }
  }

  // mixes up gravity movement with action movements
  moveMobInternal(timeDiffS){
    const physicsScene = physicsManager.getScene();
    const flags = physicsScene.moveCharacterController(
      this.controller,
      this.movement.multiplyScalar(timeDiffS),
      0,
      timeDiffS,
      this.controller.position
    );
    // const collided = flags !== 0;
    this.grounded = !!(flags & 0x1);
    if(this.controller.position.distanceTo(this.position) > 0.01){
      this.position.copy(this.controller.position);
      if(debugBBox)
        this.controller.updateMatrixWorld();
      this.updatePosition = true;
    }
    this.movement.x = 0;
    this.movement.y = 0;
    this.movement.z = 0;
  }

  updateDrawTime(uTime, diff){
    if (this.dead){
      return;
    }
    this.uTime = uTime;
    this.timeOffset += diff;
    this.updateTimeOffset = true;
  }

  getLocalPlayerDistance(){
    const player = this.playersManager.getLocalPlayer();
    return this.position.clone().sub(player.position).length();
  }

  // plays the animationName animation. If the animationName is not among the available animations returns
  playAnimation(animationName, restart, withSound = true){
    if (this.dead) {
      return;
    }
    if (!this.animations.has(animationName)) {
      return;
    }
    
    const anim = this.animations.get(animationName);
    if(this.currentAnimation !== anim.id){
      this.currentAnimation = anim.id;
      this.updateAnimation = true;
    }
    if(restart){
      // this.timeOffset = -((this.uTime % anim.frameCount) / anim.frameCount);
      this.timeOffset = 0;
      this.updateTimeOffset = true;
      if(withSound){
        const soundName = anim.soundName ?? soundsDB.get(anim.key);
        
        this.getLocalPlayerDistance() < 10 && soundName && mobSoundsPlayer.playSound(soundName);
      }
    }
  }
}

/* class InstancedSkeleton extends THREE.Skeleton {
  constructor(parent) {
    super();

    this.parent = parent;

    // bone texture
    const boneTexture = this.parent.allocator.getTexture('boneTexture');
    this.unifiedBoneMatrices = boneTexture.image.data; // Avoid setting to THREE.Skeleton because update() tries to access texture buffer
    this.unifiedBoneTexture = boneTexture;
    unifiedBoneTextureSize = boneTexture.image.width;
    // console.log('boneTextureSize', unifiedBoneTextureSize);
  }

  bakeFrame(skeleton, freeListEntry, frameIndex) {

    const boneMatrices = this.unifiedBoneMatrices;

    // frame -> geometry (skeleton) -> bone -> matrix
    const dstOffset = frameIndex * numGeometries * maxBonesPerInstance * 8 +
      freeListEntry * maxBonesPerInstance * 8;

    const bones = skeleton.bones;
    const boneInverses = skeleton.boneInverses;

    // flatten bone matrices to array

    for (let i = 0, il = bones.length; i < il; i ++) {

      // compute the offset between the current and the original transform

      const matrix = bones[ i ] ? bones[ i ].matrixWorld : identityMatrix;

      localMatrix.multiplyMatrices(matrix, boneInverses[ i ]);

      // decompose the transformation, and assign to bone matrix in layout of
      // [t_3, s], [q_4]
      const translation = new THREE.Vector3();
      const rotation = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      localMatrix.decompose(translation, rotation, scale);
      rotation.invert();
      const pos = new THREE.Vector4(
        localMatrix.elements[12],
        localMatrix.elements[13],
        localMatrix.elements[14],
        scale.x);

      pos.toArray(boneMatrices, dstOffset + i * 8);
      rotation.toArray(boneMatrices, dstOffset + i * 8 + 4);
    }
  }
} */

/* class MobBatchedMesh extends InstancedBatchedMesh {
  constructor({
    procGenInstance,
    mobData,
    physics,
  }) {
    const {
      glbs,
      skinnedMeshes: meshes,
    } = mobData;
    const {
      meshes: mobDataMeshes,
      materials: atlasTextures,
    } = createTextureAtlas(meshes, {
      attributes: ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'],
      textures: ['map', 'normalMap', 'roughnessMap', 'metalnessMap'],
    });

    numGeometries = mobDataMeshes.length;
    const geometries = mobDataMeshes.map(m => m.geometry);

    // allocator
    const allocator = new InstancedGeometryAllocator([
      {
        name: 'p',
        Type: Float32Array,
        itemSize: 3,
      },
      {
        name: 'q',
        Type: Float32Array,
        itemSize: 4,
      },
      {
        name: 'timeOffset',
        Type: Float32Array,
        itemSize: 1,
      },
      {
        name: 'vanish',
        Type: Float32Array,
        itemSize: 1,
      },
      {
        name: 'animationIndex',
        Type: Float32Array,
        itemSize: 1,
      },
      {
        name: 'animationsFrameInfo',
        Type: Float32Array,
        itemSize: 1,
        customItemCount: maxNumGeometries * maxDrawCallsPerGeometry * maxAnimationPerGeometry
      },
      {
        name: 'boneTexture',
        Type: Float32Array,
        itemSize: maxBonesPerInstance * 8,
        customItemCount: maxNumGeometries * maxDrawCallsPerGeometry * maxAnimationPerGeometry * maxFrameCountPerAnimation
      },
    ], {
      maxNumGeometries,
      maxInstancesPerGeometryPerDrawCall: maxInstancesPerDrawCall,
      maxDrawCallsPerGeometry,
      boundingType: 'box'
      // maxSlotsPerGeometry: maxAnimationFrameLength,
    });

    allocator.setGeometries(geometries.map(g => [g]), [
      {name: 'skinIndex', itemSize: 4},
      {name: 'skinWeight', itemSize: 4}
    ]);

    const {geometry, textures: attributeTextures} = allocator;
    for (const k in attributeTextures) {
      const texture = attributeTextures[k];
      texture.anisotropy = maxAnisotropy;
    }

    // material

    const material = new THREE.MeshStandardMaterial({
      map: atlasTextures.map,
      normalMap: atlasTextures.normalMap,
      roughnessMap: atlasTextures.roughnessMap,
      metalnessMap: atlasTextures.metalnessMap
      // side: THREE.DoubleSide,
      // transparent: true,
      // alphaTest: 0.5,
    });
    material.onBeforeCompile = (shader) => {
        material.userData.shader = shader;

        shader.uniforms.pTexture = {
          value: attributeTextures.p,
          needsUpdate: true,
        };
        shader.uniforms.qTexture = {
          value: attributeTextures.q,
          needsUpdate: true,
        };
        shader.uniforms.timeOffsetTexture = {
          value: attributeTextures.timeOffset,
          needsUpdate: true,
        };
        shader.uniforms.vanishTexture = {
          value: attributeTextures.vanish,
          needsUpdate: true,
        };
        shader.uniforms.animationIndex = {
          value: attributeTextures.animationIndex,
          needsUpdate: true,
        };
        shader.uniforms.animationsFrameInfo = {
          value: attributeTextures.animationsFrameInfo,
          needsUpdate: true,
        };
        shader.uniforms.uBoneTexture = {
          value: attributeTextures.boneTexture,
          needsUpdate: true,
        };
        shader.uniforms.uTime = {value: 0};

        // skin vertex

        window.shader = shader;
        window.vertexShader = shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(`#include <skinning_pars_vertex>`, `\
#ifdef USE_SKINNING
mat4 quat2mat( vec4 q ) {
  mat4 m;
  m[0][0] = 1.0 - 2.0*(q.y*q.y + q.z*q.z);
  m[0][1] = 2.0*(q.x*q.y - q.z*q.w);
  m[0][2] = 2.0*(q.x*q.z + q.y*q.w);
  m[1][0] = 2.0*(q.x*q.y + q.z*q.w);
  m[1][1] = 1.0 - 2.0*(q.x*q.x + q.z*q.z);
  m[1][2] = 2.0*(q.y*q.z - q.x*q.w);
  m[2][0] = 2.0*(q.x*q.z - q.y*q.w);
  m[2][1] = 2.0*(q.y*q.z + q.x*q.w);
  m[2][2] = 1.0 - 2.0*(q.x*q.x + q.y*q.y);

  m[0][3] = 0.0;
  m[1][3] = 0.0;
  m[2][3] = 0.0;
  m[3][0] = 0.0;
  m[3][1] = 0.0;
  m[3][2] = 0.0;
  m[3][3] = 1.0;

  return m;
}
#define QUATERNION_IDENTITY vec4(0, 0, 0, 1)

vec4 q_slerp(vec4 a, vec4 b, float t) {
  // if either input is zero, return the other.
  if (length(a) == 0.0) {
      if (length(b) == 0.0) {
          return QUATERNION_IDENTITY;
      }
      return b;
  } else if (length(b) == 0.0) {
      return a;
  }

  float cosHalfAngle = a.w * b.w + dot(a.xyz, b.xyz);

  if (cosHalfAngle >= 1.0 || cosHalfAngle <= -1.0) {
      return a;
  } else if (cosHalfAngle < 0.0) {
      b.xyz = -b.xyz;
      b.w = -b.w;
      cosHalfAngle = -cosHalfAngle;
  }

  float blendA;
  float blendB;
  if (cosHalfAngle < 0.99) {
      // do proper slerp for big angles
      float halfAngle = acos(cosHalfAngle);
      float sinHalfAngle = sin(halfAngle);
      float oneOverSinHalfAngle = 1.0 / sinHalfAngle;
      blendA = sin(halfAngle * (1.0 - t)) * oneOverSinHalfAngle;
      blendB = sin(halfAngle * t) * oneOverSinHalfAngle;
  } else {
      // do lerp if angle is really small.
      blendA = 1.0 - t;
      blendB = t;
  }

  vec4 result = vec4(blendA * a.xyz + blendB * b.xyz, blendA * a.w + blendB * b.w);
  if (length(result) > 0.0) {
      return normalize(result);
  }
  return QUATERNION_IDENTITY;
}
#endif
#include <skinning_pars_vertex>
`);

        shader.vertexShader = shader.vertexShader.replace(`#include <skinning_pars_vertex>`, `\

#ifdef USE_SKINNING
uniform mat4 bindMatrix;
uniform mat4 bindMatrixInverse;
uniform highp sampler2D uBoneTexture;
uniform sampler2D timeOffsetTexture;
uniform float uTime;
uniform sampler2D animationIndex;
uniform sampler2D animationsFrameInfo;
flat varying int instanceIndex;

struct BoneTransform
{
  vec3 t;
  float s;
  vec4 q;
};

BoneTransform getBoneTransform( const in float base, const in float i ) {
  float j = base + i * 2.0;
  float x = mod( j, float( ${unifiedBoneTextureSize} ) );
  float y = floor( j / float( ${unifiedBoneTextureSize} ) );
  float dx = 1.0 / float( ${unifiedBoneTextureSize} );
  float dy = 1.0 / float( ${unifiedBoneTextureSize} );
  y = dy * ( y + 0.5 );
  vec4 v1 = texture2D( uBoneTexture, vec2( dx * ( x + 0.5 ), y ) );
  vec4 v2 = texture2D( uBoneTexture, vec2( dx * ( x + 1.5 ), y ) );

  BoneTransform transform;
  transform.t = v1.xyz;
  transform.s = v1.w;
  transform.q = v2;

  return transform;
}

mat4 getBoneMatrix( const in float base1, const in float base2, const in float ratio, const in float i ) {
  BoneTransform transform1 = getBoneTransform( base1, i );
  BoneTransform transform2 = getBoneTransform( base2, i );

  vec3 translation = transform1.t * (1.0 - ratio) + transform2.t * ratio;
  float s = transform1.s * (1.0 - ratio) + transform2.s * ratio;
  vec4 q = q_slerp( transform1.q, transform2.q, ratio );

  mat4 boneMat = quat2mat( q );
  boneMat = boneMat * s;
  boneMat[3] = vec4(translation, 1.0);

  return boneMat;
}
#endif
        `);
        shader.vertexShader = shader.vertexShader.replace(`#include <skinbase_vertex>`, `\
int boneTextureIndex = gl_DrawID * ${maxBonesPerInstance};
instanceIndex = gl_DrawID * ${maxInstancesPerDrawCall} + gl_InstanceID;

#ifdef USE_SKINNING
  
  const float timeOffsetWidth = ${attributeTextures.timeOffset.image.width.toFixed(8)};
  const float timeOffsetHeight = ${attributeTextures.timeOffset.image.height.toFixed(8)};
  float timeOffsetX = mod(float(instanceIndex), timeOffsetWidth);
  float timeOffsetY = floor(float(instanceIndex) / timeOffsetWidth);
  vec2 timeOffsetpUv = (vec2(timeOffsetX, timeOffsetY) + 0.5) / vec2(timeOffsetWidth, timeOffsetHeight);
  float timeOffset = texture2D(timeOffsetTexture, timeOffsetpUv).x;

  const float animIdwidth = ${attributeTextures.animationIndex.image.width.toFixed(8)};
  const float animIdheight = ${attributeTextures.animationIndex.image.height.toFixed(8)};
  float animIdx = mod(float(instanceIndex), animIdwidth);
  float animIdy = floor(float(instanceIndex) / animIdwidth);
  vec2 animIdUv = (vec2(animIdx, animIdy) + 0.5) / vec2(animIdwidth, animIdheight);
  float animationID = texture2D(animationIndex, animIdUv).x;


  float frameInfoId = float(gl_DrawID * ${maxAnimationPerGeometry});

  const float fInfoWidth = ${attributeTextures.animationsFrameInfo.image.width.toFixed(8)};
  const float fInfoHeight = ${attributeTextures.animationsFrameInfo.image.height.toFixed(8)};
  float fInfox = mod(frameInfoId, fInfoWidth) + animationID;
  float fInfoy = floor(frameInfoId / fInfoWidth) + floor(fInfox / fInfoWidth);
  fInfox = fInfox - fInfoWidth * floor(fInfox / fInfoWidth);
  vec2 fInfoUv = (vec2(fInfox, fInfoy) + 0.5) / vec2(fInfoWidth, fInfoHeight);
  vec2 animationData = texture2D(animationsFrameInfo, fInfoUv).xy;
  float frameCount = animationData.x;

  float time1 = float(floor(timeOffset));
  float time2 = float(ceil(timeOffset));
  float timeRatio = (timeOffset - time1) / (time2 - time1);
  if (time2 == time1) {
    timeRatio = 0.0f;
  }

  float frame1 = animationID * float(${maxAnimationFrameLength}) + mod( time1, frameCount - 1.0 );
  float frame2 = animationID * float(${maxAnimationFrameLength}) + mod( time2, frameCount - 1.0 );
  int boneTextureIndex1 = boneTextureIndex + int(frame1) * ${numGeometries} * ${maxBonesPerInstance};
  int boneTextureIndex2 = boneTextureIndex + int(frame2) * ${numGeometries} * ${maxBonesPerInstance};
  float boneIndexOffset1 = float(boneTextureIndex1) * 2.;
  float boneIndexOffset2 = float(boneTextureIndex2) * 2.;

  mat4 boneMatX = getBoneMatrix( boneIndexOffset1, boneIndexOffset2, timeRatio, skinIndex.x );
  mat4 boneMatY = getBoneMatrix( boneIndexOffset1, boneIndexOffset2, timeRatio, skinIndex.y );
  mat4 boneMatZ = getBoneMatrix( boneIndexOffset1, boneIndexOffset2, timeRatio, skinIndex.z );
  mat4 boneMatW = getBoneMatrix( boneIndexOffset1, boneIndexOffset2, timeRatio, skinIndex.w );

#endif
        `);
        shader.vertexShader = shader.vertexShader.replace(`#include <skinnormal_vertex>`, `\
#ifdef USE_SKINNING
  mat4 skinMatrix = mat4( 0.0 );
  skinMatrix += skinWeight.x * boneMatX;
  skinMatrix += skinWeight.y * boneMatY;
  skinMatrix += skinWeight.z * boneMatZ;
  skinMatrix += skinWeight.w * boneMatW;
  skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
  objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
  #ifdef USE_TANGENT
    objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
  #endif
#endif
        `);
        shader.vertexShader = shader.vertexShader.replace(`#include <skinning_vertex>`, `\
#ifdef USE_SKINNING
  vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
  vec4 skinned = vec4( 0.0 );
  skinned += boneMatX * skinVertex * skinWeight.x;
  skinned += boneMatY * skinVertex * skinWeight.y;
  skinned += boneMatZ * skinVertex * skinWeight.z;
  skinned += boneMatW * skinVertex * skinWeight.w;
  transformed = ( bindMatrixInverse * skinned ).xyz;
#endif
        `);
        
        // vertex shader

        shader.vertexShader = shader.vertexShader.replace(`#include <uv_pars_vertex>`, `\
#include <uv_pars_vertex>
uniform sampler2D pTexture;
uniform sampler2D qTexture;
varying vec4 debugColor;

vec3 rotate_vertex_position(vec3 position, vec4 q) { 
  return position + 2.0 * cross(q.xyz, cross(q.xyz, position) + q.w * position);
}
        `);
        shader.vertexShader = shader.vertexShader.replace(`#include <project_vertex>`, `\
const float width = ${attributeTextures.p.image.width.toFixed(8)};
const float height = ${attributeTextures.p.image.height.toFixed(8)};
float x = mod(float(instanceIndex), width);
float y = floor(float(instanceIndex) / width);
vec2 pUv = (vec2(x, y) + 0.5) / vec2(width, height);
vec3 p = texture2D(pTexture, pUv).xyz;
vec4 q = texture2D(qTexture, pUv).xyzw;
// instance offset position
{
  transformed = rotate_vertex_position(transformed, q);
  transformed += p;
  //transformed += vec3(frameCount, 0.0, 0.0);
}

debugColor = vec4(gl_DrawID == 0, 0.0, 0.0, 1.0);
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = viewMatrix * modelMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;

        `);

        // fragment shader        

        shader.fragmentShader = shader.fragmentShader.replace(`#include <uv_pars_fragment>`, `\
#undef USE_INSTANCING
uniform sampler2D vanishTexture;
flat varying int instanceIndex;
#if ( defined( USE_UV ) && ! defined( UVS_VERTEX_ONLY ) )
  varying vec2 vUv;
#endif

        `);
        // vanish effect shader
        shader.fragmentShader = shader.fragmentShader.replace(`#include <clipping_planes_fragment>`, `\
const float vanishWidth = ${attributeTextures.vanish.image.width.toFixed(8)};
const float vanishHeight = ${attributeTextures.vanish.image.height.toFixed(8)};
float vanishX = mod(float(instanceIndex), vanishWidth);
float vanishY = floor(float(instanceIndex) / vanishWidth);
vec2 vanishpUv = (vec2(vanishX, vanishY) + 0.5) / vec2(vanishWidth, vanishHeight);
float vanish = texture2D(vanishTexture, vanishpUv).x;
//generating hight field for vanish effect
if(vanish > 0.){
  float v1 = 
    (sin(vUv.x*100.0) + 
    sin(vUv.x*65.5) +
    sin(vUv.x*82.364) +
    sin(vUv.x*23.185) +
    sin(vUv.x*71.346) +
    sin(vUv.y*100.0) + 
    sin(vUv.y*93.113) +
    sin(vUv.y*42.388) +
    sin(vUv.y*32.581) +
    sin(vUv.x*26.12) +
    sin(vUv.x*16.15) +
    sin(vUv.x*301.2) +
    sin(vUv.x*152.78) +
    sin(vUv.y*98.45) + 
    sin(vUv.y*64.12) +
    sin(vUv.y*98.4) +
    sin(vUv.y*45.945) +
    sin(vUv.y*37.85)) / 18.;

  v1 = (v1+1.)/2. - vanish;
  if(v1 < 0.){
    discard;
  }

  if (v1 < 0.1) {
    float fac = (0.1 - v1) * 10.0;
    gl_FragColor.z = fac * 0.5;
    gl_FragColor.y = fac * 0.75;
    gl_FragColor.x = fac;
    return;
  }
}


#include <clipping_planes_fragment>

        `);
        
        // put true to debug shader
        if(debugShader)
          shader.fragmentShader = `\
#define DEBUG_SHADER
#if ( defined( USE_UV ) && ! defined( UVS_VERTEX_ONLY ) )
  varying vec2 vUv;
#endif
#ifdef DEBUG_SHADER
varying vec4 debugColor;
void main() {
  gl_FragColor = debugColor;
}
#endif
        `
    };

    // mesh

    super(geometry, material, allocator, maxNumGeometries * maxDrawCallsPerGeometry * maxInstancesPerDrawCall);
    this.frustumCulled = false;
    this.physics = physics;

    this.procGenInstance = procGenInstance;

    {
      this.isSkinnedMesh = true;

      this.bindMode = 'attached';
      this.bindMatrix = new THREE.Matrix4();
      this.bindMatrixInverse = new THREE.Matrix4();

      // this.bindMode = 'attached';
      // this.bindMatrix = this.matrixWorld;
      // this.bindMatrixInverse = this.bindMatrix.clone().invert();

      this.skeleton = new InstancedSkeleton(this);
    
      // window.skeleton = this.skeleton; // XXX
    }

    // window.shader = shader;
    // window.vertexShader = shader.vertexShader;
    // window.fragmentShader = shader.fragmentShader;
    // window.geometry = geometry;

    this.glbs = glbs;
    this.meshes = meshes;
    // this.rootBones = rootBones;
    this.drawCalls = Array(meshes.length).fill(null);

    for (let i = 0; i < geometries.length; i++) {
      const glb = glbs[i];
      const {animations} = glb;

      const glb2Scene = SkeletonUtils.clone(glb.scene);
      const mesh2 = _findMesh(glb2Scene);
      const rootBone2 = _findBone(glb2Scene);
      const skeleton2 = mesh2.skeleton;
      if (skeleton2.bones.length > maxBonesPerInstance) {
        throw new Error('too many bones in base mesh skeleton: ' + skeleton2.bones.length);
      }

      // animations
      let animKeys = new Map();
      for(let j = 0; j < maxAnimationPerGeometry; j++){
        if(j >= animations.length) break;
        const clip = animations[j];
        const frameCount = Math.floor(clip.duration * bakeFps);
        animKeys.set(clip.name, {id: j, frameCount: frameCount, duration: clip.duration, soundName: soundsDB.get(glb.url+clip.name)});
        const drawCall = this.getDrawCall(i);
        const padding = this.allocator.getTextureBytePadding();
        const dataId = i*maxAnimationPerGeometry * padding + j * padding;
        const texture = drawCall.getTexture('animationsFrameInfo');
        texture.image.data[dataId] = frameCount;

        const mixer = new THREE.AnimationMixer(rootBone2);
        const action = mixer.clipAction(clip);
        action.play();
        mixer.updateMatrixWorld = () => {
          glb2Scene.updateMatrixWorld();
        };

        mixer.setTime(0);
        for (let t = 0; t < frameCount; t++) {
          mixer.update(1. / bakeFps);
          mixer.updateMatrixWorld();
          this.skeleton.bakeFrame(skeleton2, drawCall.freeListEntry, j * maxFrameCountPerAnimation + t);
        }
      }
      mobGlobalData.push({animationsData: animKeys, mesh: this.meshes[i]});
    }
    this.skeleton.unifiedBoneTexture.needsUpdate = true;
    this.physicsScene = physicsManager.getScene();
    this.updateBBox = false;
  }

  getDrawCall(geometryIndex) {
    let drawCall = this.drawCalls[geometryIndex];
    if (!drawCall) {
      drawCall = this.allocator.allocDrawCall(geometryIndex, 0, 0, {min: new Vector3(), max: new Vector3()});
      drawCall.instances = [];

      this.drawCalls[geometryIndex] = drawCall;
    }
    return drawCall;
  }

  updateMobs(drawCall, uTime, uTimeDiff){
    if(!this.material.userData.shader)
      return;
    const pOffset           = drawCall.getTextureOffset('p');
    const qOffset           = drawCall.getTextureOffset('q');
    const timeOffsetOffset  = drawCall.getTextureOffset('timeOffset');
    const vanishOffset      = drawCall.getTextureOffset('vanish');
    const animOffset        = drawCall.getTextureOffset('animationIndex');
    const padding           = this.allocator.getTextureBytePadding();
    const textureToUpdate   = new Set();
    for(let instanceIndex = 0; instanceIndex < drawCall.instances.length; instanceIndex++){
      const mob = drawCall.instances[instanceIndex];
      mob.updateDrawTime(uTime, uTimeDiff);
      if(mob.updatePosition){
        // shifts mob rendering position to touch the ground
        const arr = mob.position.toArray();
        arr[1] -= mob.radius;
        drawCall.getTexture('p').image.data.set(arr, pOffset + instanceIndex * Math.max(3, padding));
        mob.updatePosition = false;
        textureToUpdate.add(JSON.stringify({name: 'p', size: 3}));
        this.material.userData.shader.uniforms.pTexture.value.needsUpdate = true;
        this.updateBBox = true;
      }
      
      if(mob.updateRotation){
        drawCall.getTexture('q').image.data.set(mob.quaternion.toArray(), qOffset + instanceIndex * Math.max(4, padding));
        mob.updateRotation = false;
        textureToUpdate.add(JSON.stringify({name: 'q', size: 4}));
        this.material.userData.shader.uniforms.qTexture.value.needsUpdate = true;
      }

      if(mob.updateTimeOffset){
        drawCall.getTexture('timeOffset').image.data[timeOffsetOffset + instanceIndex * Math.max(1, padding)] = mob.timeOffset;
        mob.updateTimeOffset = false;
        textureToUpdate.add(JSON.stringify({name: 'timeOffset', size: 1}));
        this.material.userData.shader.uniforms.timeOffsetTexture.value.needsUpdate = true;
      }

      if(mob.updateVanish){
        drawCall.getTexture('vanish').image.data[vanishOffset + instanceIndex * Math.max(1, padding)] = mob.vanish;
        mob.updateVanish = false;
        textureToUpdate.add(JSON.stringify({name: 'vanish', size: 1}));
        this.material.userData.shader.uniforms.vanishTexture.value.needsUpdate = true;
      }

      if(mob.updateAnimation){
        drawCall.getTexture('animationIndex').image.data[animOffset + instanceIndex * Math.max(1, padding)] = mob.currentAnimation;
        mob.updateTimeOffset = false;
        textureToUpdate.add(JSON.stringify({name: 'animationIndex', size: 1}));
        this.material.userData.shader.uniforms.animationIndex.value.needsUpdate = true;
      }
    }
    for(const tJson of textureToUpdate){
      const t = JSON.parse(tJson);
      drawCall.updateTexture(t.name, drawCall.getTextureOffset(t.name), t.size);
    }

    if(!this.updateBBox || drawCall.instances.length < 1)
      return;

    const bbox = [0, 0, 0, 0, 0, 0];

    // min bbox
    for(let i = 0; i < 3; i++){
      bbox[i] = drawCall.instances.reduce((prev, curr) => 
      prev.position.toArray()[i] < curr.position.toArray()[i] ? prev : curr).position.toArray()[i];
    }

    // max bbox
    for(let i = 0; i < 3; i++){
      bbox[i+3] = drawCall.instances.reduce((prev, curr) =>
      prev.position.toArray()[i] > curr.position.toArray()[i] ? prev : curr).position.toArray()[i];
    }

    const min = new Vector3(bbox[0], bbox[1], bbox[2]);
    const max = new Vector3(bbox[3], bbox[4], bbox[5]);
    this.allocator.setBoundingObject({min, max}, drawCall.freeListEntry);
  }

  addMobGeometry = (drawCall, mob, chunkPose) => {
    const instanceIndex = drawCall.getInstanceCount();
    if(chunkPose){
      this.setMatrixAt(instanceIndex, chunkPose);
      this.instanceMatrix.needsUpdate = true;
    }
    drawCall.instances.push(mob);

    // physics

    // bookkeeping

    drawCall.incrementInstanceCount();
  };

  removeMobGeometry = (drawCall, mobInstance) => {
    const instanceIndex = drawCall.instances.indexOf(mobInstance);
    if (drawCall.instances.length >= 2) {
      // locals
      
      const lastInstanceIndex = drawCall.getInstanceCount() - 1;
      const padding = this.allocator.getTextureBytePadding();
      const pTexture = drawCall.getTexture('p').image.data;
      const pOffset = drawCall.getTextureOffset('p');
      const qTexture = drawCall.getTexture('q').image.data;
      const qOffset = drawCall.getTextureOffset('q');
      const timeOffsetTexture = drawCall.getTexture('timeOffset').image.data;
      const timeOffsetOffset = drawCall.getTextureOffset('timeOffset');
      const vanishTexture = drawCall.getTexture('vanish').image.data;
      const vanishOffset = drawCall.getTextureOffset('vanish');
      const animationIndexTexture = drawCall.getTexture('animationIndex').image.data;
      const animationIndexOffset = drawCall.getTextureOffset('animationIndex');

      // delete by replacing current instance with last instance
      const pPadding = Math.max(3, padding);
      pTexture[pOffset + instanceIndex * pPadding] = pTexture[pOffset + lastInstanceIndex * pPadding];
      pTexture[pOffset + instanceIndex * pPadding + 1] = pTexture[pOffset + lastInstanceIndex * pPadding + 1];
      pTexture[pOffset + instanceIndex * pPadding + 2] = pTexture[pOffset + lastInstanceIndex * pPadding + 2];

      // sets position of last instance to 0
      for(const i of [0, 1, 2]){
        pTexture[pOffset + lastInstanceIndex * pPadding + i] = 0;
      }

      const qPadding = Math.max(4, padding);
      qTexture[qOffset + instanceIndex * qPadding] = qTexture[qOffset + lastInstanceIndex * qPadding];
      qTexture[qOffset + instanceIndex * qPadding + 1] = qTexture[qOffset + lastInstanceIndex * qPadding + 1];
      qTexture[qOffset + instanceIndex * qPadding + 2] = qTexture[qOffset + lastInstanceIndex * qPadding + 2];
      qTexture[qOffset + instanceIndex * qPadding + 3] = qTexture[qOffset + lastInstanceIndex * qPadding + 3];

      timeOffsetTexture[timeOffsetOffset + instanceIndex * padding] = timeOffsetTexture[timeOffsetOffset + lastInstanceIndex * padding];
      animationIndexTexture[animationIndexOffset + instanceIndex * padding] = animationIndexTexture[animationIndexOffset + lastInstanceIndex * padding];
      vanishTexture[vanishOffset + instanceIndex * padding] = vanishTexture[vanishOffset + lastInstanceIndex * padding];

      this.material.userData.shader.uniforms.pTexture.value.needsUpdate = true;
      this.material.userData.shader.uniforms.qTexture.value.needsUpdate = true;
      this.material.userData.shader.uniforms.timeOffsetTexture.value.needsUpdate = true;
      this.material.userData.shader.uniforms.vanishTexture.value.needsUpdate = true;
      this.material.userData.shader.uniforms.animationIndex.value.needsUpdate = true;


      drawCall.updateTexture('p', pOffset, 3);
      drawCall.updateTexture('q', qOffset, 4);
      drawCall.updateTexture('vanish', vanishOffset, 1);
      drawCall.updateTexture('animationIndex', animationIndexOffset, 1);

      // mob instance
      drawCall.instances[instanceIndex] = drawCall.instances[lastInstanceIndex];
      drawCall.instances[lastInstanceIndex] = undefined;
      drawCall.instances.length--;
    } else {
      drawCall.instances.length = 0;
    }

    // bookkeeping

    drawCall.decrementInstanceCount();
    this.updateBBox = true;
  }

  addChunk(chunk) {
    if (!chunk.mobs) return;

    for (let mob of chunk.mobs) {
      const drawCall = this.getDrawCall(mob.getGeometryIndex());
      this.addMobGeometry(drawCall, mob, chunk.pose);
      mob.killEvents.push(()=>{
        this.removeMobGeometry(drawCall, mob);
      });
    }
  }

  update(timestamp, timeDiff) {
    const shader = this.material.userData.shader;
    const frameIndex = timestamp * bakeFps / 1000;
    if (shader) {
      shader.uniforms.uTime.value = frameIndex;
    }
    
    for(const d of this.drawCalls)
      this.updateMobs(d, frameIndex, timeDiff * bakeFps / 1000);
  }
} */

/* class MobsCompiledData {
  constructor({
    appUrls = [],
  } = {}) {
    this.glbs = null;
    this.skinnedMeshes = null;

    this.loadPromise = (async () => {
      // lod mob modules
      const glbs = await Promise.all(appUrls.map(async u => {
        const m = await metaversefile.import(u);

        // load glb
        let mobUrl;
        const glb = await (async () => {
          const mobJsonUrl = m.srcUrl;
          const res = await fetch(mobJsonUrl);
          const j = await res.json();

          return await new Promise((accept, reject) => {
            mobUrl = createRelativeUrl(j.mobUrl, mobJsonUrl);
            loaders.gltfLoader.load(mobUrl, accept, function onProgress() {}, reject);
          });
        })();
        glb.url = mobUrl;
        return glb;
      }));
      const skinnedMeshSpecs = glbs.map(glb => {
        const mesh = _findMesh(glb.scene);

        return {
          glb,
          mesh,
        };
      });
      const skinnedMeshes = skinnedMeshSpecs.map(spec => spec.mesh);

      this.glbs = glbs;
      this.skinnedMeshes = skinnedMeshes;
    })();
  }

  waitForLoad() {
    return this.loadPromise;
  }
} */

/* class MobGenerator {
  constructor({
    procGenInstance,
    mobData,
    physics,
  }) {
    this.object = new THREE.Object3D();
    this.object.name = 'mob-chunks';
    if(debugMobActions)
      this.MobController = new MobAIControllerPrototype();
    // make batched mesh
    const mobBatchedMesh = new MobBatchedMesh({
      procGenInstance,
      mobData,
      physics,
    });
    this.mobs = this.generateRandomMobs(mobData.skinnedMeshes);
    mobBatchedMesh.addChunk({
      mobs: this.mobs,
      pose: new Matrix4().identity(),
    });
    this.object.add(mobBatchedMesh);
    this.mobBatchedMesh = mobBatchedMesh;
  }

  generateRandomMobs(meshes){
    const mobs = [];
    const seed = 1234;
    const rng = alea(seed);
    let mobCount = 256;
    for(let i = 0; i < mobCount; i++){
      // const size = new Vector3();
      // new THREE.Box3().setFromObject(meshes[geoId]).getSize(size);
      
      let geoId;
      let pos;
      let quat;
      if(debugMob){
        // animation debug
        // geoId = i%meshes.length;
        // pos = [i*4 - 2*2,  2, -10];
        // mobCount = 5
        // massive count debug
        const n = 30;
        mobCount = n*n;
        geoId = Math.floor(rng() * meshes.length);
        pos = [(i%n)*2, 0, (i/n)*2];
        quat = new Quaternion().toArray();
      }
      else{
        geoId = Math.floor(rng() * meshes.length);
        pos = [rng()*100, 250, 200+rng()*100];
        quat = new Quaternion().setFromEuler(new Euler(0, rng()*Math.PI*2, 0)).toArray();
      }

      const mob = new MobInstance(
        pos,
        quat,
        geoId,
        rng(),
        1,
        0.01,
        3
      );
      if (debugMobActions) {
        this.MobController.addMob(mob);
      }
      
      mobs.push(mob);
      if(debugBBox)
        this.object.add(mob.controller);
    }
    return mobs;
  }

  getMobModuleNames() {
    return Object.keys(this.mobModules).sort();
  }

  disposeChunk(chunk) {
    const {abortController} = chunk.binding;
    abortController.abort();
    chunk.binding = null;
  }

  update(timestamp, timeDiff) {
    const localPlayer = this.playersManager.getLocalPlayer();
    for(const m of this.mobs){
      m.update(localPlayer.position, timeDiff);
    }
    this.mobBatchedMesh.update(timestamp, timeDiff);
    
  }

  destroy() {
    // nothing; the owning lod tracker disposes of our contents
  }
} */

export class MobManager extends THREE.Object3D {
  constructor() {
    super();

    this.mobs = [];
  }

  /* createMobber({
    procGenInstance,
    mobData,
    physics,
  }) {
    const mobber = new MobGenerator({
      procGenInstance,
      mobData,
      physics,
    });
    return mobber;
  }

  async loadData(appUrls) {
    const mobData = new MobsCompiledData({
      appUrls,
    });
    await mobData.waitForLoad();
    return mobData;
  } */

  addMobApp(app, srcUrl) {
    if (app.appType !== 'mob') {
      console.warn('not a mob app', app);
      throw new Error('only mob apps can be mobs');
    }
    if (!srcUrl) {
      console.warn('no srcUrl', app);
      throw new Error('srcUrl is required');
    }

    const mob = new Mob(app, srcUrl);
    this.mobs.push(mob);
  }

  removeMobApp(app) {
    const index = this.mobs.findIndex(mob => mob.app === app);
    if (index !== -1) {
      const mob = this.mobs[index];
      mob.destroy();
      this.mobs.splice(index, 1);
    }
  }

  /* getPhysicsObjects() {
    let results = [];
    for (const mob of this.mobs) {
      const physicsObjects = mob.getPhysicsObjects();
      results.push(physicsObjects);
    }
    results = results.flat();
    return results;
  }

  update(timestamp, timeDiff) {
    for (const mob of this.mobs) {
      mob.update(timestamp, timeDiff);
    }
  } */
}
// const mobManager = new MobManager();
// export default mobManager;