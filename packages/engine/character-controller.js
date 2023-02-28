/*
this file is responisible for maintaining player state that is network-replicated.
*/
import murmurhash from 'murmurhash';
// import {WsAudioDecoder} from 'wsrtc/ws-codec.js';
// import {ensureAudioContext, getAudioContext} from 'wsrtc/ws-audio-context.js';
// import {getAudioDataBuffer} from 'wsrtc/ws-util.js';

import * as THREE from 'three';
// import * as Z from 'zjs';
// import {getRenderer, scene, camera, sceneLowPriority} from './renderer.js';
import physicsManager from './physics/physics-manager.js';
import avatarsWasmManager from './avatars/avatars-wasm-manager.js';
// import {world} from './world.js';
// import {
//   AudioManager,
// } from './audio-manager.js';
// import metaversefile from 'metaversefile';
import {
  crouchMaxTime,
  activateMaxTime,
  aimTransitionMaxTime,
  avatarInterpolationTimeDelay,
  avatarInterpolationNumFrames,
  numLoadoutSlots,
} from './constants.js';
import {
  playersMapName,
  avatarMapName,
  actionsMapName,
  appsMapName,
} from './network-schema/constants.js';
import {
  voiceEndpointBaseUrl,
} from './endpoints.js';
import {AppManager} from './app-manager.js';
import {CharacterPhysics} from './character-physics.js';
import {CharacterHups} from './character-hups.js';
import {CharacterHitter} from './character-hitter.js';
import {AvatarCharacterSfx} from './character-sfx.js';
import {AvatarCharacterFace} from './character-face.js';
import {AvatarCharacterFx} from './character-fx.js';
import {
  VoiceInput,
} from './audio/voice-input/voice-input.js';
import {VoicePack, VoicePackVoicer} from './audio/voice-output/voice-pack-voicer.js';
import {VoiceEndpoint, VoiceEndpointVoicer} from './audio/voice-output/voice-endpoint-voicer.js';
import {
  BinaryInterpolant,
  BiActionInterpolant,
  UniActionInterpolant,
  InfiniteActionInterpolant,
  PositionInterpolant,
  QuaternionInterpolant,
  VelocityInterpolant,
  ActionInterpolant,
} from './interpolants.js';
import {applyCharacterToAvatar, makeAvatar, switchAvatar} from './player-avatar-binding.js';
import {
  defaultPlayerName,
  defaultPlayerBio,
} from './ai/lore/lore-model.js';
// import musicManager from './music-manager.js';
// import {
//   MusicManager,
// } from './music-manager.js';
import {makeId, clone} from './util.js';
import overrides from './overrides.js';
// import physx from './physics/physx.js';
import {
  ActionManager,
} from './action-manager.js';
import {
  NpcBehavior,
} from './npc-behavior.js';
// import {
//   LocalPlayerCharacterBehavior,
// } from './character-behavior.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
// const localQuaternion2 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();
const localArray3 = [0, 0, 0];
const localArray4 = [0, 0, 0, 0];

const zeroVector = new THREE.Vector3(0, 0, 0);
const upVector = new THREE.Vector3(0, 1, 0);

const _getSession = () => {
  return null;
  // const renderer = getRenderer();
  // const session = renderer.xr.getSession();
  // return session;
};

const abortError = new Error('abort');
abortError.isAbortError = true;
/* function makeCancelFn() {
  let live = true;
  return {
    isLive() {
      return live;
    },
    cancel() {
      live = false;
    },
  };
} */

/* function loadPhysxAuxCharacterCapsule() {
  const avatarHeight = this.avatar.height;
  const radius = baseRadius/heightFactor * avatarHeight;
  const height = avatarHeight - radius*2;
  const halfHeight = height/2;

  const position = this.position.clone()
    .add(new THREE.Vector3(0, -avatarHeight/2, 0));
  const physicsMaterial = new THREE.Vector3(0, 0, 0);

  const physicsObject = physicsScene.addCapsuleGeometry(
    position,
    localQuaternion.copy(this.quaternion)
      .premultiply(
        localQuaternion2.setFromAxisAngle(
          localVector.set(0, 0, 1),
          Math.PI/2
        )
      ),
    radius,
    halfHeight,
    physicsMaterial,
    true
  );
  physicsObject.name = 'characterCapsuleAux';
  physicsScene.setGravityEnabled(physicsObject, false);
  physicsScene.setLinearLockFlags(physicsObject.physicsId, false, false, false);
  physicsScene.setAngularLockFlags(physicsObject.physicsId, false, false, false);
  this.physicsObject = physicsObject;
} */

class AvatarHand extends THREE.Object3D {
  constructor() {
    super();

    this.pointer = 0;
    this.grab = 0;
    this.enabled = false;
  }
}
class Character extends THREE.Object3D {
  constructor({
    engine,
    audioManager,
    chatManager,
    sounds,
    physicsTracker,
    environmentManager,
  }) {
    super();

    if (!engine || !audioManager || !chatManager || !sounds || !physicsTracker || !environmentManager) {
      console.warn('no audio manager', audioManager);
      debugger;
    }

    this.engine = engine;
    this.audioManager = audioManager;
    this.chatManager = chatManager;
    this.sounds = sounds;
    this.physicsTracker = physicsTracker;
    this.environmentManager = environmentManager;

    // this.name = defaultPlayerName;
    // this.bio = defaultPlayerBio;

    this.characterPhysics = new CharacterPhysics(this);

    this.characterHups = new CharacterHups({
      character: this,
      chatManager,
    });
    this.characterHitter = new CharacterHitter({
      character: this,
    });

    this.detached = false;

    this.appManager = new AppManager({
      engine,
    });
    // this.appManager.addEventListener('appadd', e => {
    //   if (!this.detached) {
    //     const app = e.data;
    //     console.log('scene add', scene);
    //     scene.add(app);
    //   }
    // });
    // this.appManager.addEventListener('appremove', e => {
    //   if (!this.detached) {
    //     const app = e.data;
    //     app.parent && app.parent.remove(app);
    //   }
    // });
    // this.add(this.appManager); // XXX make this attach one level higher
    // this.appManager.updateMatrixWorld();

    this.headTarget = new THREE.Vector3();
    this.headTargetInverted = false;
    this.headTargetEnabled = false;

    this.eyeballTarget = new THREE.Vector3();
    this.eyeballTargetEnabled = false;

    this.voicePack = null;
    this.voiceEndpoint = null;

    this.velocity = new THREE.Vector3();
  }

  /* get name() {
    debugger;
  }
  set name(name) {
    debugger;
  } */
  get bio() {
    debugger;
  }
  set bio(bio) {
    debugger;
  }

  /* setSpawnPoint(position, quaternion) {
    this.position.copy(position);
    this.quaternion.copy(quaternion);

    console.log('set spawn point with character controller', this.characterPhysics.characterController);
    if (this.characterPhysics.characterController) {
      this.characterPhysics.setPosition(position);
    }
  } */

  // serializers
  getPosition(v) {
    return this.position.toArray(v);
  }
  getQuaternion(q) {
    return this.quaternion.toArray(q);
  }
  getVelocity(v) {
    return this.velocity.toArray(v);
  }

  /* findAction(fn) {
    const actions = this.getActionsState();
    for (const action of actions) {
      if (fn(action)) {
        return action;
      }
    }
    return null;
  }

  findActionIndex(fn) {
    const actions = this.getActionsState();
    let i = 0;
    for (const action of actions) {
      if (fn(action)) {
        return i;
      }
      i++
    }
    return -1;
  }

  getAction(type) {
    const actions = this.getActionsState();
    for (const action of actions) {
      if (action.type === type) {
        return action;
      }
    }
    return null;
  }

  getActionByActionId(actionId) {
    const actions = this.getActionsState();
    for (const action of actions) {
      if (action.actionId === actionId) {
        return action;
      }
    }
    return null;
  }

  getActionIndex(type) {
    const actions = this.getActionsState();
    let i = 0;
    for (const action of actions) {
      if (action.type === type) {
        return i;
      }
      i++;
    }
    return -1;
  }

  indexOfAction(action) {
    const actions = this.getActionsState();
    let i = 0;
    for (const a of actions) {
      if (a === action) {
        return i;
      }
      i++;
    }
    return -1;
  }

  hasAction(type) {
    const actions = this.getActionsState();
    for (const action of actions) {
      if (action.type === type) {
        return true;
      }
    }
    return false;
  } */

  async setVoicePack({audioUrl, indexUrl}) {
    const self = this;
    const voiceSpec = JSON.stringify({audioUrl, indexUrl, endpointUrl: self.voiceEndpoint ? self.voiceEndpoint.url : ''});
    // self.playerData.set('voiceSpec', voiceSpec);
    await this.loadVoicePack({
      audioUrl,
      indexUrl,
    });
  }

  async loadVoicePack({
    audioUrl,
    indexUrl,
  }) {
    this.voicePack = await VoicePack.load({
      audioUrl,
      indexUrl,
      audioManager: this.audioManager,
    });
    this.updateVoicer();
  }

  setVoiceEndpoint(voiceId) {
    if (!voiceId) {
      throw new Error('voice Id is null');
    }
    const self = this;
    const url = `${voiceEndpointBaseUrl}?voice=${encodeURIComponent(voiceId)}`;
    /* this.playersArray.doc.transact(function tx() {
      let oldVoiceSpec = self.playerData.get('voiceSpec');
      if (oldVoiceSpec) {
        oldVoiceSpec = JSON.parse(oldVoiceSpec);
        const voiceSpec = JSON.stringify({audioUrl: oldVoiceSpec.audioUrl, indexUrl: oldVoiceSpec.indexUrl, endpointUrl: url});
        self.playerData.set('voiceSpec', voiceSpec);
      } else {
        const voiceSpec = JSON.stringify({audioUrl: self.voicePack?.audioUrl, indexUrl: self.voicePack?.indexUrl, endpointUrl: url})
        self.playerData.set('voiceSpec', voiceSpec);
      }
    }); */
    this.loadVoiceEndpoint(url)
  }

  loadVoiceEndpoint(url) {
    if (url) {
      this.voiceEndpoint = new VoiceEndpoint(url);
    } else {
      this.voiceEndpoint = null;
    }
    this.updateVoicer();
  }

  getVoice() {
    return this.voiceEndpoint || this.voicePack;
  }

  updateVoicer() {
    const voice = this.getVoice();
    if (voice instanceof VoicePack) {
      const {syllableFiles, audioBuffer} = voice;
      this.voicer = new VoicePackVoicer({
        syllableFiles,
        audioBuffer,
        player: this,
      });
    } else if (voice instanceof VoiceEndpoint) {
      this.voicer = new VoiceEndpointVoicer({
        voiceEndpoint: voice,
        player: this,
        audioManager: this.audioManager,
      });
    } else if (voice === null) {
      this.voicer = null;
    } else {
      throw new Error('invalid voice');
    }
  }

  async fetchThemeSong() {
    const avatarApp = this.getAvatarApp();
    const npcComponent = avatarApp.getComponent('npc');
    const npcThemeSongUrl = npcComponent?.themeSongUrl;
    return await Character.fetchThemeSong(npcThemeSongUrl);
  }

  static async fetchThemeSong(npcThemeSongUrl) {
    console.warn('do not fetch theme song', {
      musicManager: this.musicManager,
    });
    debugger;

    if (npcThemeSongUrl) {
      return await this.musicManager.fetchMusic(npcThemeSongUrl);
    } else {
      return null;
    }
  }

  getCrouchFactor() {
    return 1 - 0.4 * avatarsWasmManager.physxWorker.getActionInterpolantAnimationAvatar(this.avatar.animationAvatarPtr, 'crouch', 1);
    /* let factor = 1;
    factor *= 1 - 0.4 * this.actionInterpolants.crouch.getNormalized();
    return factor; */
  }

  wear(app, {
    loadoutIndex = -1,
  } = {}) {
    // console.log('wear app', app);
    // debugger;

    const _getNextLoadoutIndex = () => {
      let loadoutIndex = -1;
      const usedIndexes = Array(8).fill(false);
      for (const action of this.actionManager.getActionsArray()) {
        if (action.type === 'wear') {
          usedIndexes[action.loadoutIndex] = true;
        }
      }
      for (let i = 0; i < usedIndexes.length; i++) {
        if (!usedIndexes[i]) {
          loadoutIndex = i;
          break;
        }
      }
      return loadoutIndex;
    };
    if (loadoutIndex === -1) {
      loadoutIndex = _getNextLoadoutIndex();
    }

    if (loadoutIndex >= 0 && loadoutIndex < numLoadoutSlots) {
      const _destroyConflictingOldApp = () => {
        const actions = this.actionManager.getActionsArray();
        let oldLoadoutAction = null;
        for (let i = 0; i < actions.length; i++) {
          const action = actions[i];
          if (action.type === 'wear' && action.loadoutIndex === loadoutIndex) {
            oldLoadoutAction = action;
            break;
          }
        }
        if (oldLoadoutAction) {
          const app = this.appManager.getAppByInstanceId(oldLoadoutAction.instanceId);
          this.unwear(app, {
            destroy: true,
          });
        }
      };
      _destroyConflictingOldApp();

      const _transplantAppFromWorldToPlayer = () => {
        /* if (world.appManager.hasTrackedApp(app.instanceId)) {
          world.appManager.transplantApp(app, this.appManager);
        } else {
          // console.warn('need to transplant unowned app', app, world.appManager, this.appManager);
          // debugger;
        } */
        const rootRealm = this.engine.realmManager.getRootRealm();
        rootRealm.appManager.transplantApp(app, this.appManager);
      };
      _transplantAppFromWorldToPlayer();

      // XXX move this to the wear component
      const _disableAppPhysics = () => {
        // XXX NOTE: wear.js also does the following:
        /*
          physicsScene.disableActor(physicsObject);
        */

        // don't disable physics if the app is a pet
        if (!app.hasComponent('pet')) {
          const physicsObjects = this.physicsTracker.getAppPhysicsObjects(app);
          const physicsScene = physicsManager.getScene();
          for (const physicsObject of physicsObjects) {
            physicsScene.disableGeometryQueries(physicsObject);
            physicsScene.disableGeometry(physicsObject);
            physicsScene.disableActor(physicsObject);
          }
        }
      };
      _disableAppPhysics();

      const wearComponent = app.getComponent('wear');
      const holdAnimation = wearComponent? wearComponent.holdAnimation : null;
      const _addAction = () => {
        this.actionManager.addAction({
          type: 'wear',
          instanceId: app.instanceId,
          loadoutIndex,
          holdAnimation,
        });
      };
      _addAction();

      const _emitEvents = () => {
        app.dispatchEvent({
          type: 'wearupdate',
          player: this,
          wear: true,
          loadoutIndex,
          holdAnimation,
        });
        this.dispatchEvent({
          type: 'wearupdate',
          app,
          wear: true,
          loadoutIndex,
          holdAnimation,
        });
      };
      _emitEvents();
    }
  }

  unwear(app, {
    destroy = false,
    dropStartPosition = null,
    dropDirection = null,
  } = {}) {
    if (!dropStartPosition) {
      debugger;
    }

    const wearAction = this.actionManager.findAction(({type, instanceId}) => {
      return type === 'wear' && instanceId === app.instanceId;
    });
    if (wearAction) {
      // const wearAction = this.getActionsState().get(wearActionIndex);
      const {loadoutIndex} = wearAction;

      const _setAppTransform = () => {
        // console.log('unwear', {
        //   dropStartPosition,
        //   dropDirection,
        // });
        if (dropStartPosition && dropDirection) {
          const physicsObjects = this.physicsTracker.getAppPhysicsObjects(app);
          if (physicsObjects.length > 0) {
            const physicsObject = physicsObjects[0];

            physicsObject.position.copy(dropStartPosition);
            physicsObject.quaternion.copy(this.quaternion);
            physicsObject.updateMatrixWorld();

            // console.log('drop physics object', physicsObject.position.toArray());

            const physicsScene = physicsManager.getScene();
            physicsScene.setTransform(physicsObject, true);
            physicsScene.setVelocity(
              physicsObject,
              localVector.copy(dropDirection).multiplyScalar(5)/* .add(this.characterPhysics.velocity) */,
              true
            );
            physicsScene.setAngularVelocity(physicsObject, zeroVector, true);

            app.position.copy(physicsObject.position);
            app.quaternion.copy(physicsObject.quaternion);
            app.scale.copy(physicsObject.scale);
            app.matrix.copy(physicsObject.matrix);
            app.matrixWorld.copy(physicsObject.matrixWorld);
          } else {
            app.position.copy(dropStartPosition);
            app.quaternion.setFromRotationMatrix(
              localMatrix.lookAt(
                localVector.set(0, 0, 0),
                localVector2.set(dropDirection.x, 0, dropDirection.z).normalize(),
                upVector
              )
            );
            app.scale.set(1, 1, 1);
            app.updateMatrixWorld();
          }
          app.lastMatrix.copy(app.matrixWorld);
        } else {
          const avatarHeight = this.avatar ? this.avatar.height : 0;
          app.position.copy(this.position)
            .add(localVector.set(0, -avatarHeight + 0.5, -0.5).applyQuaternion(this.quaternion));
          app.quaternion.identity();
          app.scale.set(1, 1, 1);
          app.updateMatrixWorld();
        }
      };
      if(!app.getComponent('sit') && !app.getComponent('pet')){
        _setAppTransform();
      }

      const _transplantAppFromPlayerToWorld = () => {
        /* if (world.appManager.hasTrackedApp(app.instanceId)) {
          world.appManager.transplantApp(app, this.appManager);
        } else {
          // console.warn('need to transplant unowned app', app, world.appManager, this.appManager);
          // debugger;
        } */
        const rootRealm = this.engine.realmManager.getRootRealm();
        this.appManager.transplantApp(app, rootRealm.appManager);
      };
      _transplantAppFromPlayerToWorld();

      // XXX move this to the wear component
      const _enableAppPhysics = () => {
        if (!app.hasComponent('pet')) {
          const physicsObjects = this.physicsTracker.getAppPhysicsObjects(app);
          const physicsScene = physicsManager.getScene();
          for (const physicsObject of physicsObjects) {
            physicsScene.enableActor(physicsObject);
            physicsScene.enableGeometryQueries(physicsObject);
            physicsScene.enableGeometry(physicsObject);
          }
        }
      };
      _enableAppPhysics();

      const _removeAction = () => {
        // this.actionManager.removeActionIndex(wearActionIndex);
        this.actionManager.removeActionType('wear');
      };
      _removeAction();

      /* const _removeApp = () => {
        if (this.appManager.hasTrackedApp(app.instanceId)) {
          if (destroy) {
            this.appManager.removeApp(app);
            app.destroy();
          } else {
            this.appManager.transplantApp(app, world.appManager);
          }
        }
      };
      _removeApp(); */

      const _emitEvents = () => {
        app.dispatchEvent({
          type: 'wearupdate',
          player: this,
          wear: false,
          loadoutIndex,
        });
        this.dispatchEvent({
          type: 'wearupdate',
          app,
          wear: false,
          loadoutIndex,
        });
      };
      _emitEvents();
    }
  }

  setTarget(target) { // set both head and eyeball target;
    if (target) {
      this.headTarget.copy(target);
      this.headTargetInverted = true;
      this.headTargetEnabled = true;

      this.eyeballTarget.copy(target);
      this.eyeballTargetEnabled = true;
    } else {
      this.headTargetEnabled = false;
      this.eyeballTargetEnabled = false;
    }
  }

  destroy() {
    this.characterHups.destroy();
  }
}

//

class PlayerData {
  constructor() {
    this.data = new Map();
  }
  get(k) {
    return this.data.get(k);
  }
  set(k, v) {
    this.data.set(k, v);
  }
  delete(k) {
    this.data.delete(k);
  }
  has(k) {
    return this.data.has(k);
  }
}

//

const controlActionTypes = [
  // 'jump',
  // 'fallLoop',
  // 'land',
  // 'crouch',
  // 'fly',
  // 'sit',
  'swim',
];
class StateCharacter extends Character {
  constructor(opts) {
    if (!opts) {
      debugger;
    }
    super(opts);

    const {
      playerId = makeId(5),
    } = opts;

    this.playerId = playerId;
    this.playerIdInt = murmurhash.v3(playerId);
    this.playerData = new PlayerData();
    this.microphoneMediaStream = null;

    // this.avatarEpoch = 0;
    // this.syncAvatarAbortController = null;
    this.unbindFns = [];

    // this.transform = new Float32Array(11);
    // this.bindState(playersArray);
  }

  get playersArray() {
    debugger;
  }
  set playersArray(v) {
    debugger;
  }
  /* get playerMap() {
    debugger;
  }
  set playerMap(v) {
    debugger;
  } */

  isBound() {
    return true;
    // return !!this.playersArray;
  }

  /* unbindState() {
    debugger;

    if (this.isBound()) {
      this.playersArray = null;
      this.playerMap = null;
    }
  } */

  /* detachState() {
    throw new Error('called abstract method');
  }

  attachState(oldState) {
    throw new Error('called abstract method');
  } */

  bindCommonObservers() {
    console.log('bind common observers');
    debugger;

    const actions = this.getActionsState();
    let lastActions = actions.toJSON();
    const observeActionsFn = () => {
      const nextActions = Array.from(this.getActionsState());
      for (const nextAction of nextActions) {
        if (!lastActions.some(lastAction => lastAction.actionId === nextAction.actionId)) {
          this.dispatchEvent({
            type: 'actionadd',
            action: nextAction,
          });
          // console.log('add action', nextAction);
        }
      }
      for (const lastAction of lastActions) {
        if (!nextActions.some(nextAction => nextAction.actionId === lastAction.actionId)) {
          this.dispatchEvent({
            type: 'actionremove',
            action: lastAction,
          });
          // console.log('remove action', lastAction);
        }
      }
      // console.log('actions changed');
      lastActions = nextActions;
    };
    actions.observe(observeActionsFn);
    this.unbindFns.push(actions.unobserve.bind(actions, observeActionsFn));
  }

  /* unbindCommonObservers() {
    for (const unbindFn of this.unbindFns) {
      unbindFn();
    }
    this.unbindFns.length = 0;
  } */

  /* bindState(nextPlayersArray) {
    // latch old state
    const oldState = this.detachState();

    // unbind
    this.unbindState();
    this.appManager.unbindState();
    this.unbindCommonObservers();

    // note: leave the old state as is. it is the host's responsibility to garbage collect us when we disconnect.

    // blindly add to new state
    // this.playersArray = nextPlayersArray;
    this.attachState(oldState);
    this.bindCommonObservers();
  } */

  getAvatarInstanceId() {
    return this.playerData.get(avatarMapName);
  }

  /* getActionsByType(type) {
   const actions = this.getActionsState();
   const typedActions = Array.from(actions).filter(action => action.type === type);
   return typedActions;
  } */

  /* getActions() {
    return this.getActionsState();
  } */

  /* getActionsState() {
    let actionsArray = this.playerMap.has(actionsMapName) ?
      this.playerData.get(actionsMapName)
    : null;
    if (!actionsArray) {
      actionsArray = [];
      this.playerData.set(actionsMapName, actionsArray);
    }
    return actionsArray;
  }

  getActionsArray() {
    return this.isBound() ? Array.from(this.getActionsState()) : [];
  }

  getAppsState() {
    let appsArray = this.playerMap.has(appsMapName) ?
      this.playerData.get(appsMapName)
    : null;
    if (!appsArray) {
      appsArray = [];
      this.playerData.set(appsMapName, appsArray);
    }
    return appsArray;
  }

  getAppsArray() {
    return this.isBound() ? Array.from(this.getAppsState()) : [];
  }

  addAction(action) {
    action = clone(action);
    action.actionId = makeId(5);
    this.getActionsState().push(action);
    if (this.avatar) {
      avatarsWasmManager.physxWorker.addActionAnimationAvatar(this.avatar.animationAvatarPtr, action);
    }
    return action;
  }

  removeAction(type) {
    const actions = this.getActionsState();
    const actionsArray = this.getActionsArray();
    // actions is an array, use splicing instead
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (action.type === type) {
        actions.splice(i, 1);
        if (this.avatar) {
          avatarsWasmManager.physxWorker.removeActionAnimationAvatar(this.avatar.animationAvatarPtr, actionsArray[i]);
        }
        break;
      }
    }
  }

  removeActionIndex(index) {
    const actionsArray = this.getActionsArray();
    this.getActionsState().delete(index);
    if (this.avatar) {
      avatarsWasmManager.physxWorker.removeActionAnimationAvatar(this.avatar.animationAvatarPtr, actionsArray[index]);
    }
  }

  clearActions() {
    const actionsState = this.getActionsState();
    const numActions = actionsState.length;
    for (let i = numActions - 1; i >= 0; i--) {
      this.removeActionIndex(i);
    }
  } */

  /* setControlAction(action) {
    const actions = this.getActionsState();
    const actionsArray = this.getActionsArray();
    for (let i = 0; i < actions.length; i++) {
      const action = actions.get(i);
      const isControlAction = controlActionTypes.includes(action.type);
      if (isControlAction) {
        actions.delete(i);
        if (this.avatar) {
          avatarsWasmManager.physxWorker.removeActionAnimationAvatar(this.avatar.animationAvatarPtr, actionsArray[i]);
        }
        i--;
      }
    }
    actions.push(action);
    if (this.avatar) {
      avatarsWasmManager.physxWorker.addActionAnimationAvatar(this.avatar.animationAvatarPtr, action);
    }
  } */

  /* new() {
    const self = this;
    this.playersArray.doc.transact(function tx() {
      const actions = self.getActionsState();
      while (actions.length > 0) {
        actions.delete(actions.length - 1);
      }

      this.playerMap.delete('avatar');

      const apps = self.getAppsState();
      while (apps.length > 0) {
        apps.delete(apps.length - 1);
      }
    });
  }

  save() {
    const actions = this.getActionsState();
    const apps = this.getAppsState();
    return JSON.stringify({
      // actions: actions.toJSON(),
      avatar: this.getAvatarInstanceId(),
      apps: apps.toJSON(),
    });
  }

  load(s) {
    const j = JSON.parse(s);
    // console.log('load', j);
    const self = this;
    this.playersArray.doc.transact(function tx() {
      const actions = self.getActionsState();
      while (actions.length > 0) {
        actions.delete(actions.length - 1);
      }

      const avatar = self.getAvatarInstanceId();
      if (avatar) {
        this.playerData.set('avatar', avatar);
      }

      const apps = self.getAppsState();
      if (Array.isArray(j?.apps)) {
        for (const app of j.apps) {
          apps.push([app]);
        }
      }
    });
  } */

  destroy() {
    // this.unbindState();
    // this.appManager.unbindState();

    this.appManager.destroy();

    super.destroy();
  }
}

class AvatarCharacter extends StateCharacter {
  constructor(opts) {
    super(opts);

    // locals
    this.avatar = null;
    this.voiceInput = new VoiceInput({
      character: this,
      audioManager: this.audioManager,
      chatManager: this.chatManager,
    });
    // this.controlMode = '';

    // action manager
    this.actionManager = new ActionManager();
    this.actionManager.addEventListener('actionadded', e => {
      // console.log('action added', e);
      const {data} = e;
      const {action} = data;
      if (this.avatar) {
        // console.log('action add', action);
        avatarsWasmManager.physxWorker.addActionAnimationAvatar(this.avatar.animationAvatarPtr, action);
      } /* else {
        // debugger;
      } */
    });
    this.actionManager.addEventListener('actionremoved', e => {
      const {data} = e;
      const {action} = data;
      if (this.avatar) {
        avatarsWasmManager.physxWorker.removeActionAnimationAvatar(this.avatar.animationAvatarPtr, action);
      } /* else {
        // debugger;
      } */
    });

    this.avatarFace = new AvatarCharacterFace(this);
    this.avatarCharacterFx = new AvatarCharacterFx(this);
    this.avatarCharacterSfx = new AvatarCharacterSfx({
      character: this,
      audioManager: this.audioManager,
      sounds: this.sounds,
    });
    // this.glider = null;

    this.leftHand = new AvatarHand();
    this.rightHand = new AvatarHand();
    this.hands = [this.leftHand, this.rightHand];
  }

  // XXX debugging
  get controlMode() {
    debugger;
  }
  set controlMode(controlMode) {
    debugger;
  }
  get glider() {
    debugger;
  }
  set glider(glider) {
    debugger;
  }

  async setPlayerSpec(playerSpec) {
    const p = this.loadAvatar(playerSpec.avatarUrl);

    overrides.userVoiceEndpoint.set(playerSpec.voice ?? null);
    overrides.userVoicePack.set(playerSpec.voicePack ?? null);

    await p;
  }

  getAvatarApp() {
    const instanceId = this.playerData.get('avatar');
    const app = this.appManager.getAppByInstanceId(instanceId);
    return app;
  }

  async loadAvatar(url, {
    components = [],
  } = {}) {
    const avatarApp = await this.appManager.addAppAsync({
      contentId: url,
      position: localVector.set(0, 0, 0),
      quaternion: localQuaternion.set(0, 0, 0, 1),
      scale: localVector2.set(1, 1, 1),
      components,
    });
    // console.log('add app async', avatarApp);
    // this.avatarApp = avatarApp;
    this.playerData.set('avatar', avatarApp.instanceId);
    this.syncAvatar();
  }

  async toggleMic() {
    await this.voiceInput.toggleMic();
  }
  async toggleSpeech() {
    await this.voiceInput.toggleSpeech();
  }

  syncAvatar() {
    if (this.avatar) {
      console.warn('already had avatar');
      debugger;
    }
    // console.log('sync avatar 1');

    // if (this.syncAvatarAbortController) {
    //   this.syncAvatarAbortController.abort(abortError);
    //   this.syncAvatarAbortController = null;
    // }

    // console.log('sync avatar 2');
    // const abortController = new AbortController();
    // console.log('sync avatar 3');
    // this.syncAvatarAbortController = abortController;
    // console.log('sync avatar 4');
    // console.log('got instance id', {
    //   instanceId,
    // });

    // // remove last app
    // if (this.avatar) {
    //   const oldPeerOwnerAppManager = this.appManager.getPeerOwnerAppManager(
    //     this.avatar.app.instanceId
    //   );
    //   if (oldPeerOwnerAppManager) {
    //     this.appManager.transplantApp(this.avatar.app, oldPeerOwnerAppManager);
    //   }
    // }

    const instanceId = this.getAvatarInstanceId();
    const avatarApp = this.appManager.getAppByInstanceId(instanceId);
    if (!avatarApp) {
      debugger;
    }
    // const _setNextAvatarApp = (app) => {
      const avatar = makeAvatar(avatarApp, this.environmentManager);
      this.avatar = avatar;

      // globalThis.avatarApp = app;
      // globalThis.avatar = avatar;

      this.dispatchEvent({
        type: 'avatarchange',
        app: avatarApp,
        avatar,
      });

      const activate = () => {
        this.dispatchEvent({
          type: 'activate'
        });
      };
      avatarApp.addEventListener('activate', activate);
      this.addEventListener('avatarchange', () => {
        avatarApp.removeEventListener('activate', activate);
      });

      const widthPadding = 0.25; // we calculate width from shoulders, but we need a little padding

      this.characterPhysics.loadCharacterController(
        this.avatar.shoulderWidth + widthPadding,
        this.avatar.height,
      );

      // this.updatePhysicsStatus();
      // avatarApp.addPhysicsObject(this.characterPhysics.characterController);
      this.physicsTracker.addAppPhysicsObject(
        avatarApp,
        this.characterPhysics.characterController
      );

      this.dispatchEvent({
        type: 'avatarupdate',
        app: avatarApp,
      });
    // };

    /* if (instanceId) {
      // add next app from player app manager
      console.log('add app', instanceId, this.playerId);
      const nextAvatarApp = this.appManager.getAppByInstanceId(instanceId);
      // console.log('add next avatar local', nextAvatarApp);
      if (nextAvatarApp) {
        _setNextAvatarApp(nextAvatarApp);
      } else {
        // add next app from world app manager
        const nextAvatarApp = world.appManager.getAppByInstanceId(instanceId);
        // console.log('add next avatar world', nextAvatarApp);
        if (nextAvatarApp) {
          world.appManager.transplantApp(nextAvatarApp, this.appManager);
          _setNextAvatarApp(nextAvatarApp);
        } else {
          // add next app from currently loading apps
          const addPromise = this.appManager.pendingAddPromises.get(instanceId);
          if (addPromise) {
            const nextAvatarApp = await addPromise;
            if (!cancelFn.isLive()) return;
            _setNextAvatarApp(nextAvatarApp);
          } else {
            console.warn(
              'switching avatar to instanceId that does not exist in any app manager',
              instanceId
            );
          }
        }
      }
    } */
  }
  updateAvatar(timestamp, timeDiff) {
    if (this.avatar) {
      const timeDiffS = timeDiff / 1000;

      this.characterPhysics.update(timestamp, timeDiffS);
      // this.actionsManager.update(timestamp);
      // this.actionManager.update(timestamp);
      this.avatarCharacterSfx.update(timestamp, timeDiffS);
      this.avatarCharacterFx.update(timestamp, timeDiffS);
      this.characterHitter.update(timestamp, timeDiffS);
      this.avatarFace.update(timestamp, timeDiffS);

      avatarsWasmManager.physxWorker.updateInterpolationAnimationAvatar(
        this.avatar.animationAvatarPtr,
        timeDiff
      );

      const session = _getSession();
      const mirrors = this.environmentManager.getMirrors();
      applyCharacterToAvatar(this, session, this.avatar, mirrors);

      this.avatar.update(timestamp, timeDiff);

      // this.characterHups.update(timestamp);

      /* // note: Create glider app.
      if (!this.glider && this.getControlMode() === 'controlled') {
        this.glider = metaversefile.createApp();
        this.glider.setComponent('player', this);
        (async () => {
          const {importModule} = metaversefile.useDefaultModules();
          const m = await importModule('glider');
          await this.glider.addModule(m);
          const physicsScene = physicsManager.getScene();
          this.glider.physicsObjects.forEach(physicsObject => {
            physicsScene.disableActor(physicsObject);
          })
        })();
        this.glider.visible = false;
        sceneLowPriority.add(this.glider);
      }
      if (this.glider) {
        // note: Calc/set glider's main rotation.
        localEuler.order = 'YZX';
        localEuler.setFromQuaternion(this.quaternion);
        localEuler.y += Math.PI;
        this.glider.rotation.copy(localEuler);
        this.glider.rotation.x = 0;
        // note: Dynamically calc/set glider's rotation.z by hands positions.
        this.avatar.foundModelBones.Left_wrist.matrixWorld.decompose(localVector, localQuaternion, localVector4);
        // this.avatar.foundModelBones.Left_middleFinger1.matrixWorld.decompose(localVector3, localQuaternion, localVector4);
        // localVector.add(localVector3).multiplyScalar(0.5);
        this.avatar.foundModelBones.Right_wrist.matrixWorld.decompose(localVector2, localQuaternion, localVector4);
        // this.avatar.foundModelBones.Right_middleFinger1.matrixWorld.decompose(localVector3, localQuaternion, localVector4);
        // localVector2.add(localVector3).multiplyScalar(0.5);
        localVector.add(localVector2).multiplyScalar(0.5);
        localVector.y += 0.06; // note: because of some vrms such as meebit.vrm hasn't finger bones, so can't depend on finger's position, then have to hard-code this value to correct glider position.
        this.glider.position.copy(localVector);
        //
        localVector.set(0, 0, 0.032).applyEuler(this.glider.rotation);
        this.glider.position.add(localVector);
        //
        this.avatar.foundModelBones.Left_wrist.matrixWorld.decompose(localVector, localQuaternion, localVector4);
        this.avatar.foundModelBones.Right_wrist.matrixWorld.decompose(localVector2, localQuaternion, localVector4);
        localVector3.subVectors(localVector, localVector2);
        localVector4.copy(localVector3).setY(0);
        let angle = localVector3.angleTo(localVector4);
        if (localVector3.y < 0) angle *= -1;
        this.glider.rotation.z = angle;
        // note: Update glider's matrix.
        this.glider.updateMatrixWorld();
      } */
    }
  }

  /* updatePhysicsStatus() {
    return;
    const physicsScene = physicsManager.getScene();
    if (this.getControlMode() === 'controlled') {
      physicsScene.disableGeometryQueries(this.characterPhysics.characterController);
    } else {
      physicsScene.enableGeometryQueries(this.characterPhysics.characterController);
    }
  } */

  destroy() {
    this.avatarFace.destroy();
    this.avatarCharacterSfx.destroy();
    this.avatarCharacterFx.destroy();
    // if (this.glider) {
    //   sceneLowPriority.remove(this.glider);
    //   this.glider.destroy();
    //   this.glider = null;
    // }

    super.destroy();
  }
}

class InterpolatedPlayer extends AvatarCharacter {
  constructor(opts) {
    super(opts);

    this.positionInterpolant = new PositionInterpolant(
      (v) => this.getPosition(v),
      avatarInterpolationTimeDelay,
      avatarInterpolationNumFrames
    );
    this.quaternionInterpolant = new QuaternionInterpolant(
      (q) => this.getQuaternion(q),
      avatarInterpolationTimeDelay,
      avatarInterpolationNumFrames
    );
    this.velocityInterpolant = new VelocityInterpolant(
      (v) => this.getVelocity(v),
      avatarInterpolationTimeDelay,
      avatarInterpolationNumFrames
    );

    const actionsBufferSize = 32;
    this.actionInterpolant = new ActionInterpolant(
      avatarInterpolationTimeDelay,
      actionsBufferSize,
    );
    this.actionInterpolant.addEventListener('statechange', e => {
      const {actionId, action} = e.data;
      // console.log('state change', {
      //   actionId,
      //   action,
      // });
      if (action) {
        this.actionManager.addAction(action);
      } else {
        this.actionManager.removeActionId(actionId);
      }
    });

    // this.actionBinaryInterpolants = {
    //   crouch: new BinaryInterpolant(() => this.hasAction('crouch'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   activate: new BinaryInterpolant(() => this.hasAction('activate'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   use: new BinaryInterpolant(() => this.hasAction('use'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   pickUp: new BinaryInterpolant(() => this.hasAction('pickUp'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   aim: new BinaryInterpolant(() => this.hasAction('aim'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   narutoRun: new BinaryInterpolant(() => this.hasAction('narutoRun'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   fly: new BinaryInterpolant(() => this.hasAction('fly'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   jump: new BinaryInterpolant(() => this.hasAction('jump'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   doubleJump: new BinaryInterpolant(() => this.hasAction('doubleJump'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   land: new BinaryInterpolant(() => this.hasAction('land'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   dance: new BinaryInterpolant(() => this.hasAction('dance'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   emote: new BinaryInterpolant(() => this.hasAction('emote'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   // throw: new BinaryInterpolant(() => this.hasAction('throw'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   // chargeJump: new BinaryInterpolant(() => this.hasAction('chargeJump'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   // standCharge: new BinaryInterpolant(() => this.hasAction('standCharge'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   fallLoop: new BinaryInterpolant(() => this.hasAction('fallLoop'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   // swordSideSlash: new BinaryInterpolant(() => this.hasAction('swordSideSlash'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   // swordTopDownSlash: new BinaryInterpolant(() => this.hasAction('swordTopDownSlash'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    //   hurt: new BinaryInterpolant(() => this.hasAction('hurt'), avatarInterpolationTimeDelay, avatarInterpolationNumFrames),
    // };
    // this.actionBinaryInterpolantsArray = Object.keys(this.actionBinaryInterpolants).map(k => this.actionBinaryInterpolants[k]);
    // this.actionInterpolants = {
    //   crouch: new BiActionInterpolant(() => this.actionBinaryInterpolants.crouch.get(), 0, crouchMaxTime),
    //   activate: new UniActionInterpolant(() => this.actionBinaryInterpolants.activate.get(), 0, activateMaxTime),
    //   use: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.use.get(), 0),
    //   pickUp: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.pickUp.get(), 0),
    //   unuse: new InfiniteActionInterpolant(() => !this.actionBinaryInterpolants.use.get(), 0),
    //   aim: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.aim.get(), 0),
    //   aimRightTransition: new BiActionInterpolant(() => this.hasAction('aim') && this.hands[0].enabled, 0, aimTransitionMaxTime),
    //   aimLeftTransition: new BiActionInterpolant(() => this.hasAction('aim') && this.hands[1].enabled, 0, aimTransitionMaxTime),
    //   narutoRun: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.narutoRun.get(), 0),
    //   fly: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.fly.get(), 0),
    //   jump: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.jump.get(), 0),
    //   doubleJump: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.doubleJump.get(), 0),
    //   land: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.land.get(), 0),
    //   fallLoop: new InfiniteActionInterpolant(() => this.hasAction('fallLoop'), 0),
    //   fallLoopTransition: new BiActionInterpolant(() => this.actionBinaryInterpolants.fallLoop.get(), 0, 300),
    //   dance: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.dance.get(), 0),
    //   emote: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.emote.get(), 0),
    //   // throw: new UniActionInterpolant(() => this.actionBinaryInterpolants.throw.get(), 0, throwMaxTime),
    //   // chargeJump: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.chargeJump.get(), 0),
    //   // standCharge: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.standCharge.get(), 0),
    //   // fallLoop: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.fallLoop.get(), 0),
    //   // swordSideSlash: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.swordSideSlash.get(), 0),
    //   // swordTopDownSlash: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.swordTopDownSlash.get(), 0),
    //   hurt: new InfiniteActionInterpolant(() => this.actionBinaryInterpolants.hurt.get(), 0),
    //   movements: new InfiniteActionInterpolant(() => {
    //     const ioManager = metaversefile.useIoManager();
    //     return  ioManager.keys.up || ioManager.keys.down || ioManager.keys.left || ioManager.keys.right;
    //   }, 0),
    //   movementsTransition: new BiActionInterpolant(() => {
    //     const ioManager = metaversefile.useIoManager();
    //     return  ioManager.keys.up || ioManager.keys.down || ioManager.keys.left || ioManager.keys.right;
    //   }, 0, crouchMaxTime),
    //   sprint: new BiActionInterpolant(() => {
    //     const ioManager = metaversefile.useIoManager();
    //     return  ioManager.keys.shift;
    //   }, 0, crouchMaxTime),
    // };
    // this.actionInterpolantsArray = Object.keys(this.actionInterpolants).map(k => this.actionInterpolants[k]);

    this.avatarBinding = {
      position: this.positionInterpolant.get(),
      quaternion: this.quaternionInterpolant.get(),
      velocity: this.velocityInterpolant.get(),
    };
  }

  /* update(timestamp, timeDiff) {
    if (!this.avatar) return; // avatar takes time to load, ignore until it does

    this.updateInterpolation(timeDiff);

    const mirrors = metaversefile.getMirrors();
    applyPlayerToAvatar(this, null, this.avatar, mirrors);

    const timeDiffS = timeDiff / 1000;
    this.characterSfx.update(timestamp, timeDiffS);
    this.characterFx.update(timestamp, timeDiffS);
    this.characterPhysics.update(timestamp, timeDiffS);
    this.characterHitter.update(timestamp, timeDiffS);
    this.avatarFace.update(timestamp, timeDiffS);

    this.avatar.update(timestamp, timeDiff);
  } */
  updateInterpolation(timestamp) {
    this.positionInterpolant.update(timestamp);
    this.quaternionInterpolant.update(timestamp);
    this.velocityInterpolant.update(timestamp);
    this.actionInterpolant.update(timestamp);
    // for (const actionBinaryInterpolant of this.actionBinaryInterpolantsArray) {
    //   actionBinaryInterpolant.update(timeDiff);
    // }
    // for (const actionInterpolant of this.actionInterpolantsArray) {
    //   actionInterpolant.update(timeDiff);
    // }
  }
}
class UninterpolatedPlayer extends AvatarCharacter {
  constructor(opts) {
    super(opts);

    UninterpolatedPlayer.init.apply(this, arguments)
  }

  static init() {
    this.avatarBinding = {
      position: this.position,
      quaternion: this.quaternion,
      velocity: this.velocity,
    };
  }
}

//

class LocalPlayer extends UninterpolatedPlayer {
  constructor(opts) {
    super(opts);

    // this.avatarTracker = new AvatarTracker({
    //   playerData: this.playerData,
    //   actionManager: this.actionManager,
    // });
  }

  /* get avatar() {
    debugger;
  }
  set avatar(v) {
    debugger;
  } */
  get avatarApp() {
    debugger;
  }
  set avatarApp(v) {
    debugger;
  }
  /* get playerMap() {
    debugger;
  }
  set playerMap(v) {
    debugger;
  } */

  setMicMediaStream(mediaStream) {
    if (this.microphoneMediaStream) {
      this.microphoneMediaStream.disconnect();
      this.microphoneMediaStream = null;
    }
    if (mediaStream) {
      const {audioContext} = this.audioManager;
      this.avatar.setMicrophoneEnabled({
        audioContext,
      });

      const mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);

      mediaStreamSource.connect(this.avatar.getMicrophoneInput(true));

      this.microphoneMediaStream = mediaStreamSource;
    }
  }

  /* detachState() {
    const oldActions = (this.playersArray ? this.getActionsState() : new Z.Array());
    const oldAvatar = this.playersArray && this.getAvatarInstanceId();
    const oldApps = (this.playersArray ? this.getAppsState() : new Z.Array()).toJSON();
    return {
      oldActions,
      oldAvatar,
      oldApps,
    };
  } */

  /* attachState(oldState) {
    debugger;
  } */

  /* deletePlayerId(playerId) {
    const self = this;
    this.playersArray.doc.transact(function tx() {
      for (let i = 0; i < self.playersArray.length; i++) {
        const playerMap = self.playersArray.get(i, Z.Map);
        if (playerData.get('playerId') === playerId) {
          self.playersArray.delete(i);
          break;
        }
      }
    });
  } */

  grab(app, hand = 'left') {
    let position = null; let quaternion = null;

    if(_getSession()) {
      const h = this[hand === 'left' ? 'leftHand' : 'rightHand'];
      position = h.position;
      quaternion = h.quaternion;
    } else {
      position = this.position;
      quaternion = camera.quaternion;
    }

    app.updateMatrixWorld();
    app.savedRotation = app.rotation.clone();
    app.startQuaternion = quaternion.clone();

    const grabAction = {
      type: 'grab',
      hand,
      instanceId: app.instanceId,
      matrix: localMatrix.copy(app.matrixWorld)
        .premultiply(localMatrix2.compose(position, quaternion, localVector.set(1, 1, 1)).invert())
        .toArray()
    };
    this.actionManager.addAction(grabAction);

    const physicsScene = physicsManager.getScene();
    physicsScene.disableAppPhysics(app)

    app.dispatchEvent({
      type: 'grabupdate',
      grab: true,
    });
  }

  ungrab() {
    const actions = Array.from(this.getActionsState());
    let removeOffset = 0;
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (action.type === 'grab') {
        const app = metaversefile.getAppByInstanceId(action.instanceId);

        const physicsScene = physicsManager.getScene();
        physicsScene.enableAppPhysics(app)

        this.actionManager.removeActionTypeIndex(i + removeOffset);
        removeOffset -= 1;

        app.dispatchEvent({
          type: 'grabupdate',
          grab: false,
        });
      }
    }
  }

  lastMatrix = new THREE.Matrix4();
  /* pushPlayerUpdates() {
    debugger;
    // const self = this;
    // this.playersArray.doc.transact(() => {
    //   if (!this.matrixWorld.equals(this.lastMatrix)) {
    //     self.position.toArray(self.transform);
    //     self.quaternion.toArray(self.transform, 3);
    //     self.playerData.set('transform', self.transform);
    //     this.lastMatrix.copy(this.matrixWorld);
    //   }
    // }, 'push');
    this.appManager.updatePhysics();
  } */

  /* updatePhysics(timestamp, timeDiff) {
    debugger;
    // if (this.avatar) {
      const timeDiffS = timeDiff / 1000;
      this.characterPhysics.update(timestamp, timeDiffS);
    // }
  } */

  destroy() {
    super.destroy();
    this.characterPhysics.destroy();
  }
  /* teleportTo = (() => {
    const localVector = new THREE.Vector3();
    const localVector2 = new THREE.Vector3();
    const localQuaternion = new THREE.Quaternion();
    const localMatrix = new THREE.Matrix4();
    return function(position, quaternion, {relation = 'floor'} = {}) {
      const renderer = getRenderer();
      const xrCamera = renderer.xr.getSession() ? renderer.xr.getCamera(camera) : camera;

      const avatarHeight = this.avatar ? this.avatar.height : 0;
      if (renderer.xr.getSession()) {
        localMatrix.copy(xrCamera.matrix)
          .premultiply(dolly.matrix)
          .decompose(localVector, localQuaternion, localVector2);

        dolly.matrix
          .premultiply(localMatrix.makeTranslation(position.x - localVector.x, position.y - localVector.y, position.z - localVector.z))
          // .premultiply(localMatrix.makeRotationFromQuaternion(localQuaternion3.copy(quaternion).inverse()))
          // .premultiply(localMatrix.makeTranslation(localVector.x, localVector.y, localVector.z))
          .premultiply(localMatrix.makeTranslation(0, relation === 'floor' ? avatarHeight : 0, 0))
          .decompose(dolly.position, dolly.quaternion, dolly.scale);
        dolly.updateMatrixWorld();
      } else {
        camera.position.copy(position)
          .sub(localVector.copy(cameraManager.getCameraOffset()).applyQuaternion(camera.quaternion));
        camera.position.y += relation === 'floor' ? avatarHeight : 0;
        camera.quaternion.copy(quaternion);
        camera.updateMatrixWorld();
      }

      this.resetPhysics();
    };
  })() */
}

//

export class NpcPlayer extends LocalPlayer {
  constructor(opts) {
    super(opts);

    this.npcBehavior = new NpcBehavior({
      character: this,
    });
  }

  updateAvatar(timestamp, timeDiff) {
    this.npcBehavior.update(timestamp, timeDiff);

    super.updateAvatar(timestamp, timeDiff);
  }
}

//

class RemotePlayer extends InterpolatedPlayer {
  constructor(opts) {
    super(opts);

    this.isRemotePlayer = true;
    this.audioWorkletNode = null;
    this.audioWorkerLoaded = false;
    this.lastPosition = new THREE.Vector3();
    // this.controlMode = 'remote';
    // this.remoteTimeBias = 0;
    // this.needSyncRemoteTimestamp = true;
    // this.syncRemoteTimestampInterval = setInterval(() => {
    //   this.needSyncRemoteTimestamp = true;
    // }, 10000);
    this.lastLocalTimestamp = 0;
    this.lastRemoteTimestamp = 0;
  }

  get remoteTimeBias() {
    debugger;
  }
  set remoteTimeBias(v) {
    debugger;
  }

  /* // The audio worker handles hups and incoming voices
  // This includes the microphone from the owner of this instance
  async prepareAudioWorker() {
    debugger;
    if (!this.audioWorkerLoaded) {
      this.audioWorkerLoaded = true;

      await ensureAudioContext();
      const audioContext = getAudioContext();

      this.audioWorkletNode = new AudioWorkletNode(
        audioContext,
        'ws-output-worklet'
      );

      this.audioDecoder = new WsAudioDecoder({
        output: (data) => {
          const buffer = getAudioDataBuffer(data);
          this.audioWorkletNode.port.postMessage(buffer, [buffer.buffer]);
        },
      });

      if (!this.avatar.isAudioEnabled()) {
        this.avatar.setAudioEnabled(true);
      }

      this.audioWorkletNode.connect(this.avatar.getAudioInput());
    }
  }

  // This is called by WSRTC (in world.js) when it receives new packets for this player
  processAudioData(data) {
    console.log('process remote audio data', data);
    debugger;

    this.prepareAudioWorker();

    if (this.audioWorkletNode) {
      this.audioDecoder.decode(data.data);
    }
  } */

  /* detachState() {
    return null;
  } */

  // remote updates
  getLocalToRemoteTimestampBias() {
    return this.lastRemoteTimestamp - this.lastLocalTimestamp;
  }
  setRemoteTimestampBias(localTimestamp, remoteTimestamp) {
    this.lastLocalTimestamp = localTimestamp;
    this.lastRemoteTimestamp = remoteTimestamp;
  }
  setRemoteTransform(transform) {
    // const transform = e.changes.keys.get('transform').value;
    // const timestamp = performance.now();

    this.position.fromArray(transform);
    this.quaternion.fromArray(transform, 3);
    const remoteTimestamp = transform[10];
    const localToRemoteTimestampBias = this.getLocalToRemoteTimestampBias();
    const timestamp = remoteTimestamp - localToRemoteTimestampBias;

    // if (this.needSyncRemoteTimestamp) {
    //   this.needSyncRemoteTimestamp = false;
    //   this.remoteTimeBias = remoteTimestamp - timestamp;
    // }

    this.positionInterpolant.snapshot(timestamp);
    this.quaternionInterpolant.snapshot(timestamp);

    if (this.avatar) {
      localVector.copy(this.position);
      localVector.y -= this.avatar.height * 0.5;
      const physicsScene = physicsManager.getScene();
      physicsScene.setCharacterControllerPosition(this.characterPhysics.characterController, localVector);
    }
    this.lastPosition.copy(this.position);
  }
  setRemoteVelocity(velocity) {
    this.velocity.fromArray(velocity);
    const remoteTimestamp = velocity[3];
    const localToRemoteTimestampBias = this.getLocalToRemoteTimestampBias();
    const timestamp = remoteTimestamp - localToRemoteTimestampBias;
    this.velocityInterpolant.snapshot(timestamp);
  }
  // XXX the below code contains the rest of the multiplayer driving
  /* attachState(oldState) {
    let index = -1;
    for (let i = 0; i < this.playersArray.length; i++) {
      const player = this.playersArray.get(i, Z.Map);
      if (player.get('playerId') === this.playerId) {
        index = i;
        break;
      }
    }
    if (index !== -1) {
      this.playerMap = this.playersArray.get(index, Z.Map);
    } else {
      throw new Error('binding to nonexistent player object', this.playersArray.toJSON());
    }
    // let lastPosition = new THREE.Vector3();
    const observePlayerFn = (e) => {
      if (e.changes.keys.has('avatar')) {
        this.syncAvatar();
      }

      if (e.changes.keys.get('voiceSpec') || e.added?.keys?.get('voiceSpec')) {
        const voiceSpec = e.changes.keys.get('voiceSpec');
        const json = JSON.parse(voiceSpec.value);
        if (json.endpointUrl)
          {this.loadVoiceEndpoint(json.endpointUrl);}
        if (json.audioUrl && json.indexUrl) {
          this.loadVoicePack({
            audioUrl: json.audioUrl,
            indexUrl: json.indexUrl,
          });
        }
      }

      if (e.changes.keys.get('name')) {
        this.name = e.changes.keys.get('name').value;
      }

      if (e.changes.keys.has('transform')) {
        const transform = e.changes.keys.get('transform').value;
        const timestamp = performance.now();

        this.position.fromArray(transform);
        this.quaternion.fromArray(transform, 3);
        const remoteTimestamp = transform[7];

        if (this.needSyncRemoteTimestamp) {
          this.needSyncRemoteTimestamp = false;
          this.remoteTimeBias = remoteTimestamp - timestamp;
        }

        this.positionInterpolant.snapshot(remoteTimestamp);
        this.quaternionInterpolant.snapshot(remoteTimestamp);

        if(this.avatar){
          localVector.copy(this.position);
          localVector.y -= this.avatar.height * 0.5;
          const physicsScene = physicsManager.getScene();
          physicsScene.setCharacterControllerPosition(this.characterPhysics.characterController, localVector);
        }
        this.lastPosition.copy(this.position);
      }

      if (e.changes.keys.has('velocity')) {
        const velocity = e.changes.keys.get('velocity').value;
        this.velocity.fromArray(velocity);
      }
    }
    this.playerMap.observe(observePlayerFn);
    this.unbindFns.push(this.playerMap.unobserve.bind(this.playerMap, observePlayerFn));
    this.appManager.bindState(this.getAppsState());
    this.appManager.loadApps().then(() => {
      if(!this.voicer || !this.voiceEndpoint){
        if (this.playerData.get('voiceSpec') !== undefined) {
          let voiceSpec = JSON.parse(this.playerData.get('voiceSpec'));
          this.loadVoiceEndpoint(voiceSpec.endpointUrl);
        }
      }
      this.syncAvatar();
    });
  } */

  updateAvatar(timestamp, timeDiff) {
    if (this.avatar) {
      const timeDiffS = timeDiff / 1000;

      // this.characterPhysics.update(timestamp, timeDiffS);

      // this.actionsManager.update(timestamp);
      // this.actionManager.update(timestamp);
      this.avatarCharacterSfx.update(timestamp, timeDiffS);
      this.avatarCharacterFx.update(timestamp, timeDiffS);
      this.characterHitter.update(timestamp, timeDiffS);
      this.avatarFace.update(timestamp, timeDiffS);

      this.updateInterpolation(timestamp);
      avatarsWasmManager.physxWorker.updateInterpolationAnimationAvatar(
        this.avatar.animationAvatarPtr,
        timeDiff
      );

      const mirrors = this.environmentManager.getMirrors();
      applyCharacterToAvatar(this, null, this.avatar, mirrors);

      this.avatar.update(timestamp, timeDiff);
    }
  }

  destroy() {
    super.destroy();
    clearInterval(this.syncRemoteTimestampInterval);
  }
}

export {
  LocalPlayer,
  RemotePlayer,
};
