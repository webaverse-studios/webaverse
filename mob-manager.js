import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import metaversefile from 'metaversefile';
import {playersManager} from './players-manager.js';
import physicsManager from './physics-manager.js';
import hpManager from './hp-manager.js';
import {alea} from './procgen/procgen.js';
import {createRelativeUrl, lookAtQuaternion} from './util.js';
import dropManager from './drop-manager.js';
import loaders from './loaders.js';
import {InstancedBatchedMesh, InstancedGeometryAllocator} from './geometry-batching.js';
import {createTextureAtlas} from './atlasing.js';
import {Matrix4,Quaternion,Vector3,Euler} from 'three';

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
const animationKeys = [];
const debugAnimation = false;
const IDLEACTIONTYPE = 'IDLE';
const ATTACKACTIONTYPE = 'ATCK';
const DIEACTIONTYPE = 'DIE';
const ANIMATIONACTIONTYPE = 'ANMT';
const HITACTIONTYPE = 'HIT';
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

  const characterController = physicsManager.getScene().createCharacterController(
    radius - contactOffset,
    innerHeight,
    contactOffset,
    stepOffset,
    characterPosition
  );
  return characterController;
}

class Mob {
  constructor(app = null, srcUrl = '') {
    this.app = app;
    this.subApp = null;

    this.name = this.app.name + '@' + this.app.position.toArray().join(',');

    this.updateFns = [];
    this.cleanupFns = [];

    if (srcUrl) {
      (async () => {
        await this.loadApp(srcUrl);
      })();
    }
  }

  #getRng() {
    return alea(this.name);
  }

  async loadApp(mobJsonUrl) {
    let live = true;
    this.cleanupFns.push(() => {
      live = false;
    });

    const res = await fetch(mobJsonUrl);
    if (!live) return;
    const json = await res.json();
    if (!live) return;

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

      const rng = this.#getRng();
      const numDrops = Math.floor(rng() * 3) + 1;
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
      let  {idleAnimation = ['idle'], aggroDistance, walkSpeed = 1} = mobComponent;
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

                const flags = physicsManager.getScene().moveCharacterController(
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
                    localVector.copy(physicsManager.getScene().getGravity())
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

  getPhysicsObjects() {
    if (this.subApp) {
      return this.subApp.getPhysicsObjects();
    } else {
      return [];
    }
  }

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
export class ActionComponent {
  constructor(
    actionId,
    type,
    durationS = 0.016,
    actionMethod = (mob)=>{},
    onFinish = (mob)=>{}) {
    this.Do = actionMethod;
    this.onFinish = onFinish;
    this.durationS = durationS;
    this.timeStamp = 0;
    this.started = false;
    this.type = type;
    this.actionId = actionId;
    this.currentMob = undefined;
  }

  /*
    get the promise called when the action finishes
  */
  getActionFinishPromise(){
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  /*
    starts the action, return the promise called at the end of the action
  */
  start(mob){
    this.currentMob = mob;
    this.started = true;
    this.Do(mob);
    return this.resolvePromise ?? this.getActionFinishPromise();
  }

  /*
    return true if the action is currently running, false if the action is not yet started
  */
  isRunning(){
    return this.started;
  }

  /*
    called every frame
  */
  tick(timeDiffS){
    if(!this.started)
      return;

    this.timeStamp += timeDiffS;
    if(this.timeStamp >= this.durationS){
      if(this.resolvePromise)
        this.resolvePromise();
      if(this.onFinish)
        this.onFinish(this.currentMob)

      this.stop();
    }
  }

  /*
    stops the action and rewinds it back at the beginning
  */
  stop(){
    this.timeStamp = 0;
    this.currentMob = undefined;
    this.started = false;
    this.resolvePromise = undefined;
  }
}

/*
  default class for simple idle animation play
*/
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
      if(mob.target && mob.target.hasAction(HITACTIONTYPE)){
        mob.target.startAction('hit');
      }
    }
    super(attackId, ATTACKACTIONTYPE, durationS, actionMethod);
  }
}

class HitAction extends ActionComponent {
  constructor(durationS){
    const actionMethod = (mob)=>{
      if(mob.animations.has('hit')){
        mob.playAnimation('hit', true);
      }
      mob.life -= 1;
      mob.checkDeath();
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


class MobAIControllerPrototype {
  constructor(){
    this.mobs = []
  }
  addMob(mob){
    this.mobs.push(mob);
    mob.killEvents.push(()=>{
      const index = this.mobs.indexOf(mob);
      if (index > -1) {
        this.mobs.splice(index, 1);
      }
    });
    mob.askForTarget = ()=>{
      if(this.mobs.length < 2)
        return;
      
      let minDist = mob.position.clone().sub(this.mobs[0].position).length();
      let target = this.mobs[0];
      
      for(const m of this.mobs){
        if(m == mob)
          continue;
        
        const dist = mob.position.clone().sub(m.position).length();
        if(dist < minDist){
          minDist = dist;
          target = m;
        }
      }
      return target;
    }
  }
}
const debugMob = false;
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
    this.target;
    this.life = 10;
    this.actionsQueue = [];
    this.position = new Vector3().fromArray(pos);
    this.quaternion = new Quaternion().fromArray(quat);
    this.geometryIndex = geometryIndex;
    this.timeOffset = timeOffset;
    this.animations = animationKeys[this.geometryIndex]
    this.updatePosition = true;
    this.updateRotation = true;
    this.updateTimeOffset = true;
    this.updateAnimation = true;
    this.rotationInterpolation = 1;
    this.easing = 16;
    this.lookAtTarget = new Vector3(1, 0, 0);
    this.locationTarget = new Vector3().copy(this.position);
    this.velocity = velocity;
    this.grounded = false;
    this.controller = physicsManager.getScene().createCharacterController(
      radius,
      height,
      height*0.05,
      height*0.05,
      this.position
    );
    this.movement = new Vector3(0, 0, 0);
    this.controller.position.copy(this.position);
    this.controller.applyQuaternion(this.quaternion);
    this.fallTime = 0;
    physicsManager.getScene().setTransform(this.controller, true);
    this.idleAction = idleAction ??
    new DefaultIdleAction(this.animations.get('idle').duration);
    this._createActionFromClip();
    this.killEvents = [];
    this.askForTarget = undefined;
    this.aggroDistance = 3;
    this.dead = false
  }

  checkDeath(){
    if(this.life <= 0){
      this.actionsQueue = [];
      this.startAction('death');
    }
  }
  kill(){
    /*if(debugMob)
      return;*/
    
    for(const k of this.killEvents){
      k();
    }
    this.dead = true;
    this.actionsQueue = [];
  }
  _createActionFromClip(){
    for(let [key, value] of this.animations){
      if(key == 'idle'){
        continue;
      }

      if(key.startsWith('attack')){
        this.actions.push(new AttackAction(value.duration, key));
        continue;
      }

      if(key == 'death'){
        this.actions.push(new DieAction(value.duration));
        continue;
      }

      this.actions.push(new AnimationAction(value.duration, key));
    }
    const hitAnim = this.animations.get('death');
    this.actions.push(new HitAction(0));
  }

  getPostion(){
    return this.position.toArray();
  }

  getQuaternion(){
    return this.quaternion.toArray();
  }

  hasAction(type){
    for(const a of this.actions){
      if (a.type == type)
        return true;
    }
    return false;
  }

  startAction(actionId){
    for(const a of this.actions){
      if(a.actionId == actionId){
        if(this.life <= 0 && a.type != DIEACTIONTYPE)
          return;
        
        this.actionsQueue.push(a);
      }
    }
  }

  addAction(action){
    this.action.push(action);
  }

  /*
    turn mob towards t versor with an ease out profile animation
  */
  animatedLookAt(t){
    const p = this.position;
    this.lookAtTarget = new Vector3(t.x - p.x, 0/* t.y - p.y */, t.z - p.z);
    this.rotationInterpolation = 0;
  }

  /*
    rotate mob instantly
  */
  lookAt(t){
    const p = this.position;
    this.quaternion = lookAtQuaternion(new Vector3(t.x - p.x, 0, t.z - p.z));
    this.updateRotation = true;
  }

  /*
    walk mob for one frame towards a direction;
  */
  walk(walkVersor){
    this.playAnimation('walk', false);
    this.movement.add(walkVersor.normalize().multiplyScalar(this.velocity));
  }

  debugAction(timeDiffS){
    if(this.actionsQueue.length == 0){
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

  /*
    action management routine, it will play action in a blocking way (for the moment).
    after each action is finised it will pop it out of the action queue
  */
  manageActions(timeDiffS){
    if(this.dead)
      return;
    
    if(this.actionsQueue.length == 0){
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

  targetManagement(){
    if(this.life <= 0 || debugMob)
      return;
    if(!this.target && this.askForTarget){
      this.target = this.askForTarget();
      if(!this.target)
        return;
    }

    if(this.target.life <= 0){
      this.target = undefined;
      return;
    }
    this.animatedLookAt(this.target.position);
    const targetVector = this.target.position.clone().sub(this.position);
    if(targetVector.length() < this.aggroDistance){
      if(this.currentAnimation == this.animations.get('walk').id){
        this.playAnimation('idle', false);
      }
      let isAttacking = false;
      for(const a of this.actionsQueue){
        if(a.type == ATTACKACTIONTYPE){
          isAttacking = true;
          break;
        }
      }
      if(!isAttacking){
        this.startAction('attack');
        this.actionsQueue.push(this.idleAction);
      }
    }
    else{
      this.walk(targetVector);
    }
  }

  /*
    called every frame
  */
  update(playerLocation, timeDiff){
    const timeDiffS = timeDiff / 1000;
    this.targetManagement();

    if(debugMob){
      this.debugAction(timeDiffS);
    }
    else
      this.manageActions(timeDiffS);

    if(!this.grounded){
      //15 seconds it reach terminal velocity in air
      this.fallTime = this.fallTime >= 15 ? this.fallTime : this.fallTime + timeDiffS;
      const gravity = physicsManager.getScene().getGravity().clone();
      this.movement.add(gravity.multiplyScalar(this.fallTime * this.fallTime));
    }
    else{
      this.fallTime = 0;
    }

    if(false){
      this.movement.add(this.debugAnimation(playerLocation, timeDiff));
    }

    // manage Rotation
    if(this.rotationInterpolation < 1){
      this.rotationInterpolation += (1-this.rotationInterpolation) / this.easing;
      this.rotationInterpolation.toFixed(2);
      this.quaternion.slerp(lookAtQuaternion(this.lookAtTarget), this.rotationInterpolation);
      this.updateRotation = true;
    }
    //manage position
    this.moveMobInternal(timeDiffS);
  }

  /*
    mixes up gravity movement with action movements
  */
  moveMobInternal(timeDiffS){
    const flags = physicsManager.getScene().moveCharacterController(
      this.controller,
      this.movement.multiplyScalar(timeDiffS),
      0,
      timeDiffS,
      this.controller.position
    );
    // const collided = flags !== 0;
    this.grounded = !!(flags & 0x1);
    if(this.controller.position.distanceTo(this.position) > 0.01 ){
      this.position.copy(this.controller.position);
      this.updatePosition = true;
    }
    this.movement.x = 0;
    this.movement.y = 0;
    this.movement.z = 0;
  }

  updateDrawTime(uTime){
    this.uTime = uTime;
    if(this.dead){
      const anim = this.animations.get('death');
      if(this.currentAnimation != anim.id){
        this.currentAnimation = anim.id;
        this.updateAnimation = true;
      }
    }
  }

  /*
    plays the animationName animation. If the animationName is not among the available animations returns
  */
  playAnimation(animationName, restart){
    if(!this.animations.has(animationName))
      return;
    
    const anim = this.animations.get(animationName);
    if(this.currentAnimation != anim.id){
      this.currentAnimation = anim.id;
      this.updateAnimation = true;
    }
    if(restart){
      this.timeOffset = -((this.uTime % anim.frameCount) / anim.frameCount);
      this.updateTimeOffset = true;
    }
  }

  /*
    animation debug function. Contains hardcoded value interally to not pollute external code
  */
  debugAnimation(playerLocation, timeDiff){
    const selfToPlayer   = playerLocation.clone().sub(this.position);
    const playerDistance = selfToPlayer.length();
    const attackID       = this.animations.get('attack');
    const walkID         = this.animations.get('walk');
    const idleID         = this.animations.get('idle');
    const movement       = new Vector3(0, 0, 0);
    // player is in sight
    if(playerDistance < 8){
      this.animatedLookAt(playerLocation);
      if(playerDistance > 4){
        // update position
        this.locationTarget =
          playerLocation.clone().add(
            selfToPlayer.clone().negate().normalize().multiplyScalar(3)
          );
      } else if(this.currentAnimation == idleID) { // attack the player
        if(attackID !== undefined && this.currentAnimation != attackID){
          playAnimation('attack');
        }
      }
    }
    else if(this.currentAnimation != idleID){
      this.locationTarget.copy(this.position);
      playAnimation('idle');
    }

    // manage Position
    if(this.locationTarget.clone().sub(this.position).length() > 0.5){
      if(this.currentAnimation != walkID){
        this.playAnimation('walk');
      }

      const t = this.locationTarget.clone().sub(this.position).normalize();
      movement.add(t)
    }
    else{
      if(this.currentAnimation == walkID){
        playAnimation('idle');
      }
    }
    return movement;
  }
}

class InstancedSkeleton extends THREE.Skeleton {
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
}

class MobBatchedMesh extends InstancedBatchedMesh {
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
float instanceIndex = float(gl_DrawID * ${maxInstancesPerDrawCall} + gl_InstanceID);

#ifdef USE_SKINNING
  
  const float timeOffsetWidth = ${attributeTextures.timeOffset.image.width.toFixed(8)};
  const float timeOffsetHeight = ${attributeTextures.timeOffset.image.height.toFixed(8)};
  float timeOffsetX = mod(instanceIndex, timeOffsetWidth);
  float timeOffsetY = floor(instanceIndex / timeOffsetWidth);
  vec2 timeOffsetpUv = (vec2(timeOffsetX, timeOffsetY) + 0.5) / vec2(timeOffsetWidth, timeOffsetHeight);
  float timeOffset = texture2D(timeOffsetTexture, timeOffsetpUv).x;
  
  float time1 = float(floor(uTime));
  float time2 = float(ceil(uTime));
  float timeRatio = (uTime - time1) / (time2 - time1);
  if (time2 == time1) {
    timeRatio = 0.0f;
  }
  const float animIdwidth = ${attributeTextures.animationIndex.image.width.toFixed(8)};
  const float animIdheight = ${attributeTextures.animationIndex.image.height.toFixed(8)};
  float animIdx = mod(instanceIndex, animIdwidth);
  float animIdy = floor(instanceIndex / animIdwidth);
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

  float frame1 = animationID * float(${maxAnimationFrameLength}) + mod( float(time1) + timeOffset * frameCount, frameCount );
  float frame2 = animationID * float(${maxAnimationFrameLength}) + mod( float(time2) + timeOffset * frameCount, frameCount );
  int boneTextureIndex1 = boneTextureIndex + int(frame1) * ${numGeometries} * ${maxBonesPerInstance};
  int boneTextureIndex2 = boneTextureIndex + int(frame2) * ${numGeometries} * ${maxBonesPerInstance};
  float boneIndexOffset1 = float(boneTextureIndex1) * 2.;
  float boneIndexOffset2 = float(boneTextureIndex2) * 2.;

  mat4 boneMatX = getBoneMatrix( boneIndexOffset1, boneIndexOffset2, timeRatio, skinIndex.x );
  mat4 boneMatY = getBoneMatrix( boneIndexOffset1, boneIndexOffset2, timeRatio, skinIndex.y );
  mat4 boneMatZ = getBoneMatrix( boneIndexOffset1, boneIndexOffset2, timeRatio, skinIndex.z );
  mat4 boneMatW = getBoneMatrix( boneIndexOffset1, boneIndexOffset2, timeRatio, skinIndex.w );

  /* mat4 boneMatX = mat4(1.);
  mat4 boneMatY = mat4(1.);
  mat4 boneMatZ = mat4(1.);
  mat4 boneMatW = mat4(1.); */
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
float x = mod(instanceIndex, width);
float y = floor(instanceIndex / width);
vec2 pUv = (vec2(x, y) + 0.5) / vec2(width, height);
vec3 p = texture2D(pTexture, pUv).xyz;
vec4 q = texture2D(qTexture, pUv).xyzw;
// instance offset position
{
  transformed = rotate_vertex_position(transformed, q);
  transformed += p;
  //transformed += vec3(frameCount, 0.0, 0.0);
}

// debugColor = vec4((instanceMatrix[0][0] + 1.0)/2.0, 0.0, 0.0, 1.0);
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = viewMatrix * modelMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;

        `);
        /* shader.vertexShader = shader.vertexShader.replace(`#include <worldpos_vertex>`, `\
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif
        `); */

        // fragment shader        

        shader.fragmentShader = shader.fragmentShader.replace(`#include <uv_pars_fragment>`, `\
#undef USE_INSTANCING
#if ( defined( USE_UV ) && ! defined( UVS_VERTEX_ONLY ) )
  varying vec2 vUv;
#endif
        `);
        
        // put true to debug shader
        if(false)
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

      /* const bones = [];
      const boneInverses = [];
      for (let i = 0; i < meshes.length; i++) {
        const mesh = meshes[i];
        if (bones.length > maxBonesPerInstance) {
          throw new Error('too many bones in base mesh skeleton: ' + bones.length);
        }
        bones.push.apply(bones, mesh.skeleton.bones);
        boneInverses.push.apply(boneInverses, mesh.skeleton.boneInverses);
      } */

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
      for(let j = 0; j < maxAnimationPerGeometry/* animations.length */; j++){
        if(j >= animations.length) break;
        const clip = animations[j];
        const frameCount = Math.floor(clip.duration * bakeFps);
        animKeys.set(clip.name, {id: j, frameCount: frameCount, duration: clip.duration});
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
      animationKeys.push(animKeys);
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

  updateMobs(drawCall, uTime){
    if(!this.material.userData.shader)
      return;
    const pOffset           = drawCall.getTextureOffset('p');
    const qOffset           = drawCall.getTextureOffset('q');
    const timeOffsetOffset  = drawCall.getTextureOffset('timeOffset');
    const animOffset        = drawCall.getTextureOffset('animationIndex');
    const padding           = this.allocator.getTextureBytePadding();
    const textureToUpdate   = new Set();
    
    for(let instanceIndex = 0; instanceIndex < drawCall.instances.length; instanceIndex++){
      const mob = drawCall.instances[instanceIndex];
      mob.updateDrawTime(uTime);
      if(mob.updatePosition){
        drawCall.getTexture('p').image.data.set(mob.position.toArray(), pOffset + instanceIndex * padding);
        mob.updatePosition = false;
        textureToUpdate.add(JSON.stringify({name: 'p', size: 3}));
        this.material.userData.shader.uniforms.pTexture.value.needsUpdate = true;
        this.updateBBox = true;
      }
      
      if(mob.updateRotation){
        drawCall.getTexture('q').image.data.set(mob.quaternion.toArray(), qOffset + instanceIndex * padding);
        mob.updateRotation = false;
        textureToUpdate.add(JSON.stringify({name: 'q', size: 4}));
        this.material.userData.shader.uniforms.qTexture.value.needsUpdate = true;
      }

      if(mob.updateTimeOffset){
        drawCall.getTexture('timeOffset').image.data[timeOffsetOffset + instanceIndex * padding] = mob.timeOffset;
        mob.updateTimeOffset = false;
        textureToUpdate.add(JSON.stringify({name: 'timeOffset', size: 1}));
        this.material.userData.shader.uniforms.timeOffsetTexture.value.needsUpdate = true;
      }

      if(mob.updateAnimation){
        drawCall.getTexture('animationIndex').image.data[animOffset + instanceIndex * padding] = mob.currentAnimation;
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
      const animationIndexTexture = drawCall.getTexture('animationIndex').image.data;
      const animationIndexOffset = drawCall.getTextureOffset('animationIndex');
      const instanceDataBegin = instanceIndex * padding;

      // delete by replacing current instance with last instance

      pTexture[pOffset + instanceIndex * padding] = pTexture[pOffset + lastInstanceIndex * padding];
      pTexture[pOffset + instanceIndex * padding + 1] = pTexture[pOffset + lastInstanceIndex * padding + 1];
      pTexture[pOffset + instanceIndex * padding + 2] = pTexture[pOffset + lastInstanceIndex * padding + 2];

      //sets position of last instance to 0
      for(const i of [0, 1, 2]){
        pTexture[pOffset + lastInstanceIndex * padding + i] = 0;
      }

      qTexture[qOffset + instanceIndex * padding] = qTexture[qOffset + lastInstanceIndex * padding];
      qTexture[qOffset + instanceIndex * padding + 1] = qTexture[qOffset + lastInstanceIndex * padding + 1];
      qTexture[qOffset + instanceIndex * padding + 2] = qTexture[qOffset + lastInstanceIndex * padding + 2];
      qTexture[qOffset + instanceIndex * padding + 3] = qTexture[qOffset + lastInstanceIndex * padding + 3];

      timeOffsetTexture[timeOffsetOffset + instanceIndex * padding] = timeOffsetTexture[timeOffsetOffset + lastInstanceIndex * padding];
      animationIndexTexture[animationIndexOffset + instanceIndex * padding] = animationIndexTexture[animationIndexOffset + lastInstanceIndex * padding];

      this.material.userData.shader.uniforms.pTexture.value.needsUpdate = true;
      this.material.userData.shader.uniforms.qTexture.value.needsUpdate = true;
      this.material.userData.shader.uniforms.timeOffsetTexture.value.needsUpdate = true;
      this.material.userData.shader.uniforms.animationIndex.value.needsUpdate = true;


      drawCall.updateTexture('p', pOffset, 3);
      drawCall.updateTexture('q', qOffset, 4);
      drawCall.updateTexture('timeOffset', timeOffsetOffset, 1);
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
      const drawCall = this.getDrawCall(mob.geometryIndex);
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
      this.updateMobs(d, frameIndex);
  }
}

class MobsCompiledData {
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
        const glb = await (async () => {
          const mobJsonUrl = m.srcUrl;
          const res = await fetch(mobJsonUrl);
          const j = await res.json();

          return await new Promise((accept, reject) => {
            const mobUrl = createRelativeUrl(j.mobUrl, mobJsonUrl);
            loaders.gltfLoader.load(mobUrl, accept, function onProgress() {}, reject);
          });
        })();
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
}

class MobGenerator {
  constructor({
    procGenInstance,
    mobData,
    physics,
  }) {

    this.object = new THREE.Object3D();
    this.object.name = 'mob-chunks';
    this.MobController = new MobAIControllerPrototype();

    // make batched mesh
    const mobBatchedMesh = new MobBatchedMesh({
      procGenInstance,
      mobData,
      physics,
    });
    this.mobs = this.generateRandomMobs(mobData.skinnedMeshes);
    mobBatchedMesh.addChunk({mobs: this.mobs, pose: new Matrix4().identity()});
    this.object.add(mobBatchedMesh);
    this.mobBatchedMesh = mobBatchedMesh;
  }

  generateRandomMobs(meshes){
    const mobs = [];
    const seed = 1234;
    const rng = alea(seed);
    const mobCount = 512;
    const w = Math.sqrt(mobCount);
    for(let i = 0; i < 256; i++){
      //const geoId = i%meshes.length;
      const geoId = Math.floor(rng() * meshes.length);
      //const size = new Vector3();
      //new THREE.Box3().setFromObject(meshes[geoId]).getSize(size);
      //random position
      const pos = [rng()*100, 400, 200+rng()*100];
      //const pos = [i*4 - 2*2,  2, -10];
      const mob = new MobInstance(
        pos,
        new Quaternion().setFromEuler(new Euler(0, rng()*Math.PI*2, 0)).toArray(),
        geoId,
        rng(),
        0.3,
        0.1,
        3
      );
      this.MobController.addMob(mob);
      mobs.push(mob);
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
    const localPlayer = playersManager.getLocalPlayer();
    for(const m of this.mobs){
      m.update(localPlayer.position, timeDiff);
    }
    this.mobBatchedMesh.update(timestamp, timeDiff);
    
  }

  destroy() {
    // nothing; the owning lod tracker disposes of our contents
  }
}

class Mobber {
  constructor({
    procGenInstance,
    mobData,
  }) {
    this.procGenInstance = procGenInstance;
    this.mobData = mobData;
    
    const generator = new MobGenerator({
      procGenInstance,
      mobData,
    });
    this.generator = generator;
    /* this.tracker = new LodChunkTracker(this.generator, {
      chunkWorldSize,
    }); */
    const lods = 1;
    this.trackerCreated = new Promise((resolve, reject)=>{
      (async ()=>{
        const tracker = await procGenInstance.createLodChunkTracker({lods});
        const chunkdatarequest = (e) => {
          const {chunk, waitUntil, signal} = e;
          const {lod} = chunk;

          if (chunk.min.y !== 0) return;

          const loadPromise = (async () => {
            const result = await procGenInstance.dcWorkerManager.createMobSplat(
              chunk.min.x * chunkWorldSize,
              chunk.min.z * chunkWorldSize,
              lod
            );
            
            signal.throwIfAborted();

            return result;
          })();
          waitUntil(loadPromise);
        };
        const chunkadd = (e) => {
          const {renderData, chunk} = e;
          generator.mobBatchedMesh.drawChunk(chunk, renderData, tracker);
        };
        tracker.addEventListener('chunkdatarequest', chunkdatarequest);
        tracker.addEventListener('chunkadd', chunkadd);
        // tracker.onChunkDataRequest(chunkdatarequest);
        tracker.onChunkAdd(chunkadd);

        this.tracker = tracker;
        resolve();
      })();
    });
  }

  async waitForUpdate() {
    await trackerCreated;
    await new Promise((accept, reject) => {
      this.tracker.onPostUpdate(() => {
        accept();
      });
    });
  }

  /* async addMobModule(srcUrl) {
    const m = await metaversefile.import(srcUrl);
    this.mobModules[srcUrl] = m;
  }
  compile() {
    this.compiled = true;
  } */
  getChunks() {
    return this.generator.object;
  }

  update(timestamp, timeDiff) {
    const localPlayer = playersManager.getLocalPlayer();
    if(!this.procGenInstance.range && this.tracker)
      this.tracker.update(localPlayer.position);
    
    this.generator.update(timestamp, timeDiff);
  }

  destroy() {
    // this.tracker.destroy();
    this.generator.destroy();
  }
}

class MobManager {
  constructor() {
    this.mobs = [];
  }

  createMobber({
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
  }

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

  getPhysicsObjects() {
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
  }
}
const mobManager = new MobManager();

export default mobManager;