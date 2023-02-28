/*
npc manager tracks instances of all npcs.
npcs includes,
  - characters in party system
  - world npcs
  - detached npcs for character select preview
*/

import * as THREE from 'three';
// import Avatar from './avatars/avatars.js';
// import {LocalPlayer} from './character-controller.js';
import {NpcPlayer} from './character-controller.js';
// import * as voices from './voices.js';
// import {world} from './world.js';
// import {chatManager} from './chat-manager.js';
import {makeId, createRelativeUrl} from './util.js';
// import {characterSelectManager} from './characterselect-manager.js';
// import {idleFn} from './npc-behavior.js';
// import {
//   createAppAsync,
// } from '../metaversefile/apps';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();

// const updatePhysicsFnMap = new WeakMap();
// const updateAvatarsFnMap = new WeakMap();
// const cancelFnsMap = new WeakMap();
// let targetSpec = null;

//

// const BehaviorType = {
//   IDLE: 0,
//   FOLLOW: 1,
// };

//

export class NpcManager extends THREE.Object3D {
  constructor({
    engine,
    physicsTracker,
    environmentManager,
    audioManager,
    chatManager,
    sounds,
    characterSelectManager,
    hitManager,
    npcRenderManager,
  }) {
    super();

    // members
    if (!engine || !physicsTracker || !environmentManager || !audioManager || !chatManager || !sounds || !characterSelectManager || !hitManager) {
      throw new Error('missing required arguments');
    }
    this.engine = engine;
    this.physicsTracker = physicsTracker;
    this.environmentManager = environmentManager;
    this.audioManager = audioManager;
    this.chatManager = chatManager;
    this.sounds = sounds;
    this.characterSelectManager = characterSelectManager;
    this.hitManager = hitManager;
    this.npcRenderManager = npcRenderManager;

    // locals
    this.npcPlayers = new Set();
    this.smartNpcs = new Set(); // smart npcs are npcs with additional AI logic (e.g. own visual cortex)

    // this.npcs = [];
    // this.detachedNpcs = [];
    // this.npcAppMap = new WeakMap();
    // this.targetMap = new WeakMap();
  }

  /* getAppByNpc(npc) {
    return this.npcAppMap.get(npc);
  }

  getNpcByApp(app) {
    return this.npcs.find(npc => this.getAppByNpc(npc) === app);
  }

  getNpcByAppInstanceId(instanceId) {
    return this.npcs.find(npc => this.getAppByNpc(npc).instanceId === instanceId);
  }

  getDetachedNpcByApp(app) {
    return this.detachedNpcs.find(npc => this.getAppByNpc(npc) === app);
  }

  async initDefaultPlayer() {
    const spec = await characterSelectManager.getDefaultSpecAsync();
    // const player = metaversefile.useLocalPlayer();
    const player = this.playersManager.getLocalPlayer();
    // console.log('set player spec', spec);
    await player.setPlayerSpec(spec);

    const createPlayerApp = () => {
      const app = createAppAsync();
      app.instanceId = makeId(5);
      app.name = 'player';
      app.contentId = spec.avatarUrl;
      return app;
    };
    const app = createPlayerApp();

    app.addEventListener('destroy', () => {
      this.removeNpcApp(app);
    });
  } */

  async addNpcApp(app, srcUrl) {
    // const mode = app.getComponent('mode') ?? 'attached';

    // console.log('add npc app', app, srcUrl);

    // load
    // if (mode === 'attached') {
      // load json
      const res = await fetch(srcUrl);
      const json = await res.json();

      // console.log('got npc json', json);

      // npc pameters
      const name = json.name;
      const avatarUrl = createRelativeUrl(json.avatarUrl, srcUrl);
      // const detached = !!json.detached;
      const {voice, voicePack} = json;

      const position = localVector.setFromMatrixPosition(app.matrixWorld)
        .add(localVector2.set(0, 1, 0));
      const quaternion = app.quaternion;
      const scale = app.scale;
      // const norenderer = app.getComponent('norenderer');
      // const components = [{
      //   key: 'quality',
      //   value: app.getComponent('quality'),
      // }];
      const components = [];

      // create npc
      const npcPlayer = await this.#createNpcAsync({
        ownerApp: app,
        name,
        avatarUrl,
        voice,
        voicePack,
        position,
        quaternion,
        scale,
        // detached,
        // norenderer,
        components,
      });

      {
        const hitTracker = this.hitManager.createHitTracker({
          app,
        });
        hitTracker.addEventListener('hit', e => {
          const e2 = {...e};
          npcPlayer.dispatchEvent(e2);
        });
        this.hitManager.addAppHitTracker(app, hitTracker);
      }

      return npcPlayer;

      // await this.#setNpcApp({
      //   npc,
      //   app,
      //   json,
      // });
    // }
  }

  removeNpcApp(app) {
    this.hitManager.removeAppHitTracker(app);

    // const fn = cancelFnsMap.get(app);
    // if (fn) {
    //   cancelFnsMap.delete(app);
    //   fn();
    // }
  }

  /* updatePhysics(timestamp, timeDiff) {
    const allNpcs = [].concat(this.npcs, this.detachedNpcs);
    for (const npc of allNpcs) {
      const fn = updatePhysicsFnMap.get(this.getAppByNpc(npc));
      if (fn) {
        fn(npc, timestamp, timeDiff);
      }
    }
  }

  updateAvatar(timestamp, timeDiff) {
    const allNpcs = [].concat(this.npcs, this.detachedNpcs);
    for (const npc of allNpcs) {
      const fn = updateAvatarsFnMap.get(this.getAppByNpc(npc));
      if (fn) {
        fn(timestamp, timeDiff);
      }
    }
  }

  setPartyTarget(player, target) {
    this.targetMap.set(player, target);
  }

  getPartyTarget(player) {
    return this.targetMap.get(player);
  } */

  async #createNpcAsync({
    ownerApp,
    name,
    avatarUrl,
    voice,
    voicePack,
    position,
    quaternion,
    scale,
    detached,
    // norenderer,
    components,
    render=true,
  }) {
    const playerId = makeId(5);
    const npcPlayer = new NpcPlayer({
      playerId,
      engine: this.engine,
      physicsTracker: this.physicsTracker,
      environmentManager: this.environmentManager,
      audioManager: this.audioManager,
      chatManager: this.chatManager,
      sounds: this.sounds,
    });
    npcPlayer.name = name ?? 'npc';

    // update transform
    let matrixNeedsUpdate = false;
    if (position) {
      npcPlayer.position.copy(position);
      matrixNeedsUpdate = true;
    }
    if (quaternion) {
      npcPlayer.quaternion.copy(quaternion);
      matrixNeedsUpdate = true;
    }
    if (scale) {
      npcPlayer.scale.copy(scale);
      matrixNeedsUpdate = true;
    }
    if (matrixNeedsUpdate) {
      npcPlayer.updateMatrixWorld();
    }

    npcPlayer.appManager.setOwnerApp(ownerApp); // for physics parent app resolution

    const spec = await this.characterSelectManager.getDefaultSpecAsync();
    // const player = this.playersManager.getLocalPlayer();
    // console.log('got spec', npcPlayer, spec, {
    //   avatarUrl,
    // });
    const npcSpec = {
      avatarUrl,
      voice,
      voicePack,
    };
    await npcPlayer.setPlayerSpec(npcSpec);

    this.add(npcPlayer.appManager);
    npcPlayer.appManager.updateMatrixWorld();
    this.npcPlayers.add(npcPlayer);

    if (render) {
      this.npcRenderManager.addNpc(npcPlayer);
      this.smartNpcs.add(npcPlayer);
    }

    // if (!norenderer) {
    //   await player.loadAvatar(avatarUrl, {
    //     components,
    //   });
    //   player.updateAvatar(0, 0);
    // }

    return npcPlayer;
  }

  updateAvatars(timestamp, timeDiff) {
    for (const npcPlayer of this.npcPlayers) {
      npcPlayer.updateAvatar(timestamp, timeDiff);
    }
  }

  /* async #setNpcApp({
    npc,
    app,
    json,
  }) {
    // cleanFns
    npc.cancelFns = [
      () => {
        npc.destroy();
      },
    ];

    cancelFnsMap.set(app, () => {
      for (const cancelFn of npc.cancelFns) {
        cancelFn();
      }
    });

    // npcs list
    const detached = !!json.detached;
    if (!detached) {
      this.npcs.push(npc);
      npc.cancelFns.push(() => {
        const removeIndex = this.npcs.indexOf(npc);
        this.npcs.splice(removeIndex, 1);
      });
    } else {
      this.detachedNpcs.push(npc);
      npc.cancelFns.push(() => {
        const removeIndex = this.detachedNpcs.indexOf(npc);
        this.detachedNpcs.splice(removeIndex, 1);
      });
    }

    // npcApp map
    this.npcAppMap.set(npc, app);
    npc.cancelFns.push(() => {
      this.npcAppMap.delete(npc);
    });

    // playeradd/playerremove events
    const player = npc;
    this.dispatchEvent(new MessageEvent('playeradd', {
      data: {
        player,
      }
    }));
    npc.cancelFns.push(() => {
      this.dispatchEvent(new MessageEvent('playerremove', {
        data: {
          player,
        }
      }));
    });

    // physics object tracking
    app.setPhysicsObject(player.characterPhysics.characterController);
    const avatarupdate = e => {
      app.setPhysicsObject(player.characterPhysics.characterController);
    };
    player.addEventListener('avatarupdate', avatarupdate);
    npc.cancelFns.push(() => {
      player.removeEventListener('avatarupdate', avatarupdate);
    });

    // events

    const _listenEvents = () => {
      const animations = Avatar.getAnimations();
      const hurtAnimation = animations.find(a => a.isHurt);
      const hurtAnimationDuration = hurtAnimation.duration;
      const hittrackeradd = e => {
        app.hitTracker.addEventListener('hit', e => {
          if (!player.hasAction('hurt')) {
            const newAction = {
              type: 'hurt',
              animation: 'pain_back',
            };
            player.addAction(newAction);

            setTimeout(() => {
              player.removeAction('hurt');
            }, hurtAnimationDuration * 1000);
          }
        });
      };
      app.addEventListener('hittrackeradded', hittrackeradd);
      npc.cancelFns.push(() => {
        app.removeEventListener('hittrackeradded', hittrackeradd);
      });

      const activate = () => {
        // check if the npc is a guest giver
        startConversation(app);
      };
      app.addEventListener('activate', activate);
      npc.cancelFns.push(() => {
        app.removeEventListener('activate', activate);
      });

      this.setBehaviorFn(app, idleFn);

      const updateAvatarFn = (timestamp, timeDiff) => {
        player.updateAvatar(timestamp, timeDiff);
      };
      updateAvatarsFnMap.set(app, updateAvatarFn);
      npc.cancelFns.push(() => {
        updateAvatarsFnMap.delete(app);
      });
    };
    _listenEvents();

    // load
    const npcName = json.name;
    const npcVoiceName = json.voice;
    const npcBio = json.bio;
    let npcWear = json.wear ?? [];
    if (!Array.isArray(npcWear)) {
      npcWear = [npcWear];
    }

    // ai scene
    const _addToAiScene = () => {
      const character = world.loreAIScene.addCharacter({
        name: npcName,
        bio: npcBio,
      });
      npc.cancelFns.push(() => {
        world.loreAIScene.removeCharacter(character);
      });
      character.addEventListener('say', e => {
        const localPlayer = playersManager.getLocalPlayer();

        const {message, emote, action, object, target} = e.data;
        const chatId = makeId(5);

        const m = {
          type: 'chat',
          chatId,
          playerId: localPlayer.playerId,
          playerName: localPlayer.name,
          message,
        };

        chatManager.addPlayerMessage(player, m);

        const _triggerEmotes = () => {
          const fuzzyEmotionName = getFuzzyEmotionMapping(emote);
          if (fuzzyEmotionName) {
            this.emoteManager.triggerEmote(fuzzyEmotionName, player);
          }
        };
        _triggerEmotes();

        const _triggerActions = () => {
          if (emote === 'supersaiyan' || action === 'supersaiyan' || /supersaiyan/i.test(object) || /supersaiyan/i.test(target)) {
            const newSssAction = {
              type: 'sss',
            };
            player.addAction(newSssAction);
          } else if (action === 'follow' || (object === 'none' && target === localPlayer.name)) { // follow player
            app.setComponent('state', {behavior: BehaviorType.FOLLOW, target: npcManager.getAppByNpc(localPlayer).instanceId});
          } else if (action === 'stop') { // stop
            app.setComponent('state', {behavior: BehaviorType.IDLE, target: null});
          } else if (action === 'moveto' || (object !== 'none' && target === 'none')) { // move to object
            console.log('move to object', object);
          } else if (action === 'moveto' || (object === 'none' && target !== 'none')) { // move to player
            targetSpec = {
              type: 'moveto',
              object: localPlayer,
            };
          } else if (['pickup', 'grab', 'take', 'get'].includes(action)) { // pick up object
            console.log('pickup', action, object, target);
          } else if (['use', 'activate'].includes(action)) { // use object
            console.log('use', action, object, target);
          }
        };
        _triggerActions();
      });
    };
    _addToAiScene();

    // attach to scene
    const _addPlayerAvatarToApp = () => {
      app.position.set(0, 0, 0);
      app.quaternion.identity();
      app.scale.set(1, 1, 1);

      // app.add(vrmApp);
      app.updateMatrixWorld();
    };
    _addPlayerAvatarToApp();

    // voice endpoint setup
    const _setVoiceEndpoint = () => {
      const voice = voices.voiceEndpoints.find(v => v.name.toLowerCase().replaceAll(' ', '') === npcVoiceName.toLowerCase().replaceAll(' ', ''));
      if (voice) {
        player.setVoiceEndpoint(voice.drive_id);
      } else {
        console.error('*** unknown voice name', npcVoiceName, voices.voiceEndpoints);
      }
    };
    _setVoiceEndpoint();
    // wearables
    const _updateWearables = async () => {
      const wearablePromises = npcWear.map(wear => (async () => {
        const {start_url, components} = wear;
        const app = await player.appManager.addTrackedApp(
          start_url,
          undefined,
          undefined,
          undefined,
          components,
        );

        player.wear(app);
      })());
      await wearablePromises;
    };
    await _updateWearables();
  }

  setBehaviorFn(app, behaviorFn) {
    const npc = this.getNpcByApp(app);
    updatePhysicsFnMap.set(app, behaviorFn);
    npc.cancelFns.push(() => updatePhysicsFnMap.delete(app));
  } */
}
