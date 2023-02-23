/*
this file contains the universe/meta-world/scenes/multiplayer code.
responsibilities include loading the world on url change.
*/

import * as THREE from 'three';
// import metaversefile from 'metaversefile';
import {NetworkRealms} from '../../multiplayer/public/network-realms.mjs';
// import WSRTC from 'wsrtc/wsrtc.js';
// import * as Z from 'zjs';

// import {
//   initialPosY,
//   realmSize,
// } from '../constants.js';
import {
  playersMapName,
  appsMapName,
  actionsMapName,
  // partyMapName,
} from '../network-schema/constants.js';
// import {loadOverworld} from './overworld.js';
import physicsManager from '../physics/physics-manager.js';
// import physxWorkerManager from './physics/physx-worker-manager.js';
// import {playersManager} from './players-manager.js';
// import {
//   PlayersManager,
// } from './players-manager.js';
import {makeId, parseQuery} from '../util.js';
import {
  getScnUrl,
} from './realm-utils.js';
// import voiceInput from './voice-input/voice-input.js';
// import {world} from './world.js';
import {scenesBaseUrl, defaultSceneName} from '../endpoints.js';
// import {
//   SpawnManager,
// } from './spawn-manager.js';
// import {
//   SceneManager,
// } from '../scene-manager.js';
import {
  App,
} from '../../app-runtime/app.js';
import {
  AppManager,
} from '../app-manager.js';
// import {rootScene} from './renderer.js';
// import physx from './physics/physx.js';

//

const actionsPrefix = 'actions.';
// const appsPrefix = 'apps.';
// const worldAppsKey = 'worldApps';

//

const getAppJson = app => {
  const transformAndTimestamp = new Float32Array(11);
  app.position.toArray(transformAndTimestamp, 0);
  app.quaternion.toArray(transformAndTimestamp, 3);
  app.scale.toArray(transformAndTimestamp, 7);
  transformAndTimestamp[10] = 0; // timestamp needs to be set by the caller

  return {
    instanceId: app.instanceId,
    contentId: app.contentId,
    transform: transformAndTimestamp,
    components: structuredClone(app.components),
  };
}

//

class ActionCache {
  constructor() {
    this.actions = [];
  }
  push(action) {
    this.actions.push(action);
  }
  flush() {
    const actions = this.actions;
    this.actions = [];
    return actions;
  }
}

//

class AppEntityBinder {
  #appToEntity = new Map();
  #entityToApp = new Map();

  getApp(entity) {
    return this.#entityToApp.get(entity);
  }
  getEntity(app) {
    return this.#appToEntity.get(app);
  }

  bindAppEntity(app, entity) {
    // console.log('bind', {
    //   app,
    //   entity,
    // });
    this.#appToEntity.set(app, entity);
    this.#entityToApp.set(entity, app);
  }
  unbindAppEntity(app) {
    const entity = this.#appToEntity.get(app);
    // console.log('unbind', {
    //   app,
    //   entity,
    // });
    if (entity) {
      this.#appToEntity.delete(app);
      this.#entityToApp.delete(entity);
    } else {
      throw new Error('no entity for app');
    }
  }
}

//

export class Universe extends THREE.Object3D {
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
    this.appManager = new AppManager({
      engine,
    });
    this.add(this.appManager);
    this.appManager.updateMatrixWorld();

    this.multiplayerEnabled = false;
    this.multiplayerConnected = false;
    this.realms = null;
  }

  async setRealmSpec(realmSpec) {
    if (this.multiplayerEnabled) {
      console.warn('already in multiplayer');
      debugger;
      this.disconnectMultiplayer();
    }
    const {room, src} = realmSpec;

    this.multiplayerEnabled = room !== undefined;
    if (this.multiplayerEnabled) {
      await this.connectMultiplayer({
        room,
        src,
      });
    }
  }

  // Enter multiplayer for the current scene - "Create Room" button click.
  async enterMultiplayer() {
    let {src} = parseQuery(window.location.search);
    if (src === undefined) {
      src = scenesBaseUrl + defaultSceneName;
    }
    const sceneName = src.trim();

    this.room = makeId(5);
    const url = `/?src=${encodeURIComponent(sceneName)}&room=${this.room}`;
    history.pushState({}, '', url);
    globalThis.dispatchEvent(new MessageEvent('pushstate'));

    await this.connectMultiplayer(this.room);
  }

  // Called by enterWorld() when a player enables multi-player.
  async connectMultiplayer({
    room,
    src,
  }) {
    // console.log('Connect multiplayer', {
    //   src,
    //   room,
    // });
    if (room === undefined) {
      console.error('Multiplayer room must be defined.')
      return;
    }

    // Set up the network realms.
    const localPlayer = this.playersManager.getLocalPlayer();
    this.realms = new NetworkRealms({
      sceneId: room,
      playerId: localPlayer.playerId,
      audioContext: this.audioManager.audioContext,
    });
    // await this.realms.initAudioContext();

    const virtualWorld = this.realms.getVirtualWorld();
    const virtualPlayers = this.realms.getVirtualPlayers();

    // Initiate network realms connection.
    const onConnect = async () => {
      const realmKey = room;
      // const virtualWorld = this.realms.getVirtualWorld();
      // console.log('got connection', this.realms);
      
      // globalThis.realms = this.realms;
      // globalThis.virtualWorld = virtualWorld;

      globalThis.clearRemoteApps = () => {
        this.realms.tx(() =>{
          const existingApps = virtualWorld.worldApps.needledVirtualEntities;
          // globalThis.existingApps = existingApps;
          // virtualWorld.worldApps.removeEntityAt(collidedVirtualMap.entityMap.arrayIndexId);
  
          const arrayIndexIds = Array.from(existingApps.values())
            .map(entity => entity.entityMap.arrayIndexId);
          console.log('got existing apps', arrayIndexIds);
          for (const arrayIndexId of arrayIndexIds) {
            virtualWorld.worldApps.removeEntityAt(arrayIndexId);
          }
        });
      };

      // const localPlayer = this.playersManager.getLocalPlayer();
      // const virtualWorld = this.realms.getVirtualWorld();
      // const {position} = localPlayer;
      const {audioManager} = localPlayer.voiceInput;
      const {audioContext} = audioManager;
      
      // microphone connection
      const connectRealmsMic = async (mediaStream) => {
        await this.realms.enableMic({
          mediaStream,
          audioContext,
        });
      };
      const disconnectRealmsMic = async () => {
        this.realms.disableMic();
      };

      // Initialize network realms player.
      const _pushInitialPlayer = () => {
        this.realms.localPlayer.initializePlayer({
          realmKey,
        }, {});
        const transformAndTimestamp = new Float32Array(11);
        localPlayer.position.toArray(transformAndTimestamp, 0);
        localPlayer.quaternion.toArray(transformAndTimestamp, 3);
        localPlayer.scale.toArray(transformAndTimestamp, 7);
        const now = performance.now();
        transformAndTimestamp[10] = now;
        this.realms.localPlayer.setKeyValue('transform', transformAndTimestamp);
        this.realms.localPlayer.setKeyValue('velocity', [0, 0, 0, 0]);
        // this.realms.localPlayer.setKeyValue('voiceSpec', localPlayer.playerMap.get('voiceSpec'));
      };
      _pushInitialPlayer();

      const _connectLocalPlayerAppManager = () => {
        localPlayer.appManager.addEventListener('apptransplant', e => {
          console.log('player app transplant', e);
          const {
            app,
            oldAppManager,
            newAppManager,
          } = e.data;
          if (newAppManager === this.appManager) {
            const appJson = getAppJson(app);

            const headRealm = this.realms.getClosestRealm(realmKey);
            console.log('transplant B 1', appJson.instanceId, appJson.components, appJson);
            virtualWorld.worldApps.addEntityAt(
              appJson.instanceId,
              appJson,
              headRealm
            );
            console.log('transplant B 2');
            this.realms.localPlayer.playerApps.removeEntityAt(appJson.instanceId);
            console.log('transplant B 3');
          } else {
            console.warn('transplanting from local player app manager to non-world app manager', {
              app,
              oldAppManager,
              newAppManager,
            });
            debugger;
          }
        });
      };
      _connectLocalPlayerAppManager();

      // // Avatar model.
      // const apps = localPlayer.playerMap.get(appsMapName);
      // const appsArray = Array.from(apps);
      // const avatarInstanceId = localPlayer.getAvatarInstanceId();
      // const avatarApp = appsArray.find(app => app.get('instanceId') === avatarInstanceId);
      // const components = {
      //   contentId: avatarApp.get('contentId'),
      //   instanceId: avatarInstanceId,
      // };
      // this.realms.localPlayer.setKeyValue(this.appsPrefix + avatarInstanceId, components);
      // this.realms.localPlayer.setKeyValue('avatar', avatarInstanceId);

      // Mic state.
      const _connectLocalPlayerMic = () => {
        if (localPlayer.voiceInput.micEnabled()) {
          const {mediaStream} = localPlayer.voiceInput;

          // localPlayer.voiceInput.dispatchEvent(new MessageEvent('speechchange', {
          //   data: {
          //     enabled: true,
          //   },
          // }));

          connectRealmsMic(mediaStream);
        }
        localPlayer.voiceInput.addEventListener('micchange', e => {
          const {data} = e;
          const {enabled} = data;
          if (enabled) {
            const {mediaStream} = localPlayer.voiceInput;
            // console.log('connect network mic', mediaStream);
            connectRealmsMic(mediaStream);
          } else {
            // console.log('disconnect network mic');
            disconnectRealmsMic();
          }
        });
      };
      _connectLocalPlayerMic();

      const appEntityBinder = new AppEntityBinder();

      /* // Load the scene.
      // First player loads scene from src.
      // Second and subsequent players load scene from network realms.
      // TODO: Won't need to load the scene once the multiplayer-do state is used instead of the current Z state.
      if (virtualWorld.worldApps.getSize() === 0) {
        await metaversefile.createAppAsync({
          start_url: src,
        });
      } */
      const cleanupFns = [];
      const _trackLocalPlayer = () => {
        const actionCache = new ActionCache();

        const _trackFrameLoop = () => {
          const _recurse = () => {
            frame = requestAnimationFrame(_recurse);
    
            const _pushLocalPlayerUpdate = () => {
              // timestamp
              const now = performance.now();
              this.realms.localPlayer.setKeyValue('timestamp', now);

              // transform
              const {position, quaternion, scale} = localPlayer;
              const transformAndTimestamp = new Float32Array(11);
              position.toArray(transformAndTimestamp, 0);
              quaternion.toArray(transformAndTimestamp, 3);
              scale.toArray(transformAndTimestamp, 7);
              transformAndTimestamp[10] = now;
              this.realms.localPlayer.setKeyValue('transform', transformAndTimestamp);
              
              // velocity
              const velocity = new Float32Array(4);
              localPlayer.velocity.toArray(velocity);
              velocity[3] = now;
              this.realms.localPlayer.setKeyValue('velocity', velocity);

              // actions
              const actionCacheSpecs = actionCache.flush();
              for (let i = 0; i < actionCacheSpecs.length; i++) {
                const actionCacheSpec = actionCacheSpecs[i];
                const {
                  actionId,
                  action,
                } = actionCacheSpec;
                this.realms.localPlayer.setKeyValue(actionsPrefix + actionId, {
                  action,
                  timestamp: now,
                });
              }
            };
            _pushLocalPlayerUpdate();
          };
          let frame = requestAnimationFrame(_recurse);
          cleanupFns.push(() => {
            cancelAnimationFrame(frame);
          });
        };
        _trackFrameLoop();

        const _trackActionManager = () => {
          const actionadded = e => {
            const {action} = e.data;
            actionCache.push({
              actionId: action.actionId,
              action,
            });
          };
          localPlayer.actionManager.addEventListener('actionadded', actionadded);
          cleanupFns.push(() => {
            localPlayer.actionManager.removeEventListener('actionadded', actionadded);
          });
          const actionremoved = e => {
            const {action} = e.data;
            actionCache.push({
              actionId: action.actionId,
              action: null,
            });
          };
          localPlayer.actionManager.addEventListener('actionremoved', actionremoved);
          cleanupFns.push(() => {
            localPlayer.actionManager.removeEventListener('actionremoved', actionremoved);
          });
        };
        _trackActionManager();

        const _pushInitialActions = () => {
          const actionsArray = localPlayer.actionManager.getActionsArray();
          const timestamp = performance.now();
          for (const action of actionsArray) {
            this.realms.localPlayer.setKeyValue(actionsPrefix + action.actionId, {
              action,
              timestamp,
            });
          }
        };
        _pushInitialActions();
      };
      _trackLocalPlayer();

      const _trackWorld = async () => {
        const _listenWorldEvents = () => {
          // Handle scene updates from network realms.
          const onWorldAppEntityAdd = e => {
            console.log('world entity add', e.data);
            // XXX pause updates and add to the app manager
            // XXX then, bind the app
            debugger;
          };
          this.realms.addEventListener('entityadd', onWorldAppEntityAdd);
          const onWorldAppEntityRemove = e => {
            console.log('world entity remove', e.data);
            // XXX unbind the app
            debugger;
          };
          this.realms.addEventListener('entityremove', onWorldAppEntityRemove);
          
          this.appManager.addEventListener('apptransplant', e => {
            console.log('world app transplant', e);
            const {
              app,
              oldAppManager,
              newAppManager,
            } = e.data;
            if (newAppManager === localPlayer.appManager) {
              const appJson = getAppJson(app);

              const headRealm = this.realms.getClosestRealm(realmKey);
              console.log('transplant A 1', appJson.instanceId, appJson.components, appJson);
              this.realms.localPlayer.playerApps.addEntityAt(
                appJson.instanceId,
                appJson,
                headRealm
              );
              console.log('transplant A 2');
              virtualWorld.worldApps.removeEntityAt(appJson.instanceId);
              console.log('transplant A 3');
            } else {
              console.warn('transplanting from world to non-local player', {
                app,
                oldAppManager,
                newAppManager,
              });
              debugger;
            }
          });
        };
        _listenWorldEvents();

        const _bindAppManager = () => {
          this.appManager.onBeforeAppAdd = (e) => {
            const {
              app,
              contentId,
              position,
              quaternion,
              scale,
              components,
              instanceId,
            } = e;

            // const app = apps[i];
            // const appJson = app.toJSON();
            const transform = new Float32Array(11);
            position.toArray(transform, 0);
            quaternion.toArray(transform, 3);
            scale.toArray(transform, 7);
            const now = performance.now();
            transform[10] = now;
            const appJson = {
              contentId,
              instanceId,
              transform,
              components,
            }
            // console.log('add app json', appJson);

            const headRealm = this.realms.getClosestRealm(realmKey);
            let newRemoteApp;
            this.realms.tx(() => {
              newRemoteApp = virtualWorld.worldApps.addEntityAt(
                appJson.instanceId,
                appJson,
                headRealm,
              );
            });
            const newEntity = virtualWorld.worldApps.getMapEntity(newRemoteApp);
            appEntityBinder.bindAppEntity(app, newEntity);
          };
          this.appManager.onBeforeAppRemove = (e) => {
            // console.log('app manager remove', e);
            const {app} = e;
            const entity = appEntityBinder.getEntity(app);
            if (!entity) {
              debugger;
            }
            console.log('before app remove', {e, app, entity, arrayIndexId: entity?.arrayIndexId});
            
            this.realms.tx(() => {
              virtualWorld.worldApps.removeEntityAt(entity.arrayIndexId);
            });
            
            appEntityBinder.unbindAppEntity(app);
          };
        };
        _bindAppManager();

        const _loadApps = async () => {
          const existingApps = virtualWorld.worldApps.needledVirtualEntities;
          if (existingApps.size === 0) {
            console.log('no world apps so initializing app manager', existingApps, virtualWorld);
            const scnUrl = getScnUrl(src);
            await this.appManager.loadScnFromUrl(scnUrl);
          } else {
            console.log('had world apps so not initializing app manager', existingApps, virtualWorld);

            const appLoadPromises = [];
            this.appManager.tx(() => {
              const existingNeedledEntities = Array.from(existingApps.values());
              for (const needledEntity of existingNeedledEntities) {
                const object = needledEntity.toObject();
                const {
                  contentId,
                  instanceId,
                  transform,
                  components,
                } = object;
                
                const app = new App();
                appEntityBinder.bindAppEntity(app, needledEntity);

                const _loadLocalApp = async () => {
                  const position = new THREE.Vector3().fromArray(transform, 0);
                  const quaternion = new THREE.Quaternion().fromArray(transform, 3);
                  const scale = new THREE.Vector3().fromArray(transform, 7);
                  const timestamp = transform[10];

                  await this.appManager.addAppAsync({
                    contentId,
                    instanceId,
                    app,
                    position,
                    quaternion,
                    scale,
                    components,
                    // position = new THREE.Vector3(),
                    // quaternion = new THREE.Quaternion(),
                    // scale = new THREE.Vector3(1, 1, 1),
                    // components = [],
                    // instanceId = getRandomString(),
                  });
                };
                const p = _loadLocalApp();
                appLoadPromises.push(p);
              }
            });
            await Promise.all(appLoadPromises);
          }
        };
        await _loadApps();
      };
      await _trackWorld();
    };
    const _trackRemotePlayers = () => {
      const playersMap = new Map();

      virtualPlayers.addEventListener('join', async e => {
        const {playerId, player} = e.data;
        console.log('Player joined:', playerId, player);

        const remotePlayer = this.playersManager.addRemotePlayer({
          playerId,
        });
        playersMap.set(playerId, remotePlayer);

        // Handle remote player updates.
        player.addEventListener('update', e => {
          const {key, val} = e.data;

          if (key === 'timestamp') {
            const remoteTimestamp = val;
            const localTimestamp = performance.now();
            remotePlayer.setRemoteTimestampBias(localTimestamp, remoteTimestamp);
          } else if (key === 'transform') {
            // playersArray.doc.transact(() => {
              // playerMap.set('transform', val);
              remotePlayer.setRemoteTransform(val);
            // });
          } else if (key === 'velocity') {
            // playersArray.doc.transact(() => {
              // playerMap.set('velocity', val);
              remotePlayer.setRemoteVelocity(val);
            // });
          } else if (key === 'avatar') {
            // Set new avatar instanceId.
            // playersArray.doc.transact(() => {
              console.log('got val', val);
              // playerMap.set('avatar', val);
            // });
          } else if (key.startsWith(actionsPrefix)) {
            const actionId = key.slice(actionsPrefix.length);
            const {
              action,
              timestamp: remoteTimestamp,
            } = val;
            const localToRemoteTimestampBias = remotePlayer.getLocalToRemoteTimestampBias();
            const timestamp = remoteTimestamp - localToRemoteTimestampBias;

            // console.log('got action update', actionId, val);

            if (action !== null) {
              remotePlayer.actionInterpolant.pushAction({
                actionId,
                action,
              }, timestamp);
            } else {
              remotePlayer.actionInterpolant.pushAction({
                actionId,
                action: null,
              }, timestamp);
            }
          } /* else if (key === 'voiceSpec') {
            // playersArray.doc.transact(() => {
              playerMap.set('voiceSpec', val);
            // });
          } */
        });

        const _initializeRemotePlayerActions = () => {
          const keys = player.getKeys();
          for (const key of keys) {
            if (key.startsWith(actionsPrefix)) {
              const actionSpec = player.getKeyValue(key);
              const {action} = actionSpec;
              if (action) {
                // const type = key.slice(actionsPrefix.length);
                // console.log('got initial action', {
                //   type,
                // });

                remotePlayer.actionManager.addAction(action);
              }
            }
          }
        };
        _initializeRemotePlayerActions();

        const _loadRemotePlayerAvatar = async () => {
          const spec = await this.characterSelectManager.getDefaultSpecAsync();
          await remotePlayer.setPlayerSpec(spec);
        };
        await _loadRemotePlayerAvatar();
      });
      virtualPlayers.addEventListener('leave', e => {
        const {playerId} = e.data;
        // console.log('Player left:', playerId);
        const remotePlayer = playersMap.get(playerId);
        if (remotePlayer) {
          this.playersManager.removeRemotePlayer(remotePlayer);
          playersMap.delete(playerId);
        } else {
          console.warn('remote player not found', playerId);
          debugger;
        }

        /* const playersArray = this.state.getArray(playersMapName);
        for (let i = 0; i < playersArray.length; i++) {
          const playerMap = playersArray.get(i, Z.Map);
          if (playerMap.get('playerId') === playerId) {
            playersArray.delete(i);
            break;
          }
        } */
      });

      // Handle audio routes.
      virtualPlayers.addEventListener('audiostreamstart', e => {
        // console.log('audio stream start', e.data);
        const {playerId, stream} = e.data;

        const remotePlayer = playersMap.get(playerId);
        // console.log('got remote player', remotePlayer);
        if (remotePlayer) {
          remotePlayer.avatar.setAudioEnabled({
            audioContext: this.audioManager.audioContext,
          });
          const audioInput = remotePlayer.avatar.getAudioInput();
          // console.log('audio input connect', [stream.outputNode, audioInput]);
          stream.outputNode.connect(audioInput);
          // stream.outputNode.connect(this.audioManager.audioContext.destination);
          /* const {playerId, stream} = e.data;
          const remotePlayer = playersMap.get(playerId);
          if (remotePlayer) {
            remotePlayer.setRemoteAudioStream(stream);
          } else {
            console.warn('remote player not found', playerId);
            debugger;
          } */
        } else {
          console.warn('remote player not found', {playerId, playersMap});
          debugger;
        }
      });
      virtualPlayers.addEventListener('audiostreamend', e => {
        console.log('audio stream end', e.data);
      });
    };
    _trackRemotePlayers();
    await this.realms.updateRealmsKeys([room], {
      onConnect,
    });

    /* // Handle remote players joining and leaving the set of realms.
    // These events are received both upon starting and during multiplayer.
    const virtualPlayers = this.realms.getVirtualPlayers();
    virtualPlayers.addEventListener('join', async e => {
      const {playerId, player} = e.data;
      console.log('Player joined:', playerId);

      const defaultTransform = new Float32Array([0, 0, 0, 0, 0, 0, 1, 1, 1, 1]);

      const playersArray = this.state.getArray(playersMapName);
      const playerMap = new Z.Map();
      playersArray.doc.transact(() => {
        playerMap.set('playerId', playerId);

        const appsArray = new Z.Array();
        playerMap.set(appsMapName, appsArray);

        const actionsArray = new Z.Array();
        playerMap.set(actionsMapName, actionsArray);

        playersArray.push([playerMap]);
      });

      const getActionsState = () => {
        let actionsArray = playerMap.has(actionsMapName) ? playerMap.get(actionsMapName, Z.Array) : null;
        if (!actionsArray) {
          actionsArray = new Z.Array();
          playerMap.set(actionsMapName, actionsArray);
        }
        return actionsArray;
      };

      // Handle remote player updates.
      player.addEventListener('update', e => {
        const {key, val} = e.data;

        if (key === 'transform') {
          playersArray.doc.transact(() => {
            playerMap.set('transform', val);
          });
        } else if (key === 'velocity') {
          playersArray.doc.transact(() => {
            playerMap.set('velocity', val);
          });
        } else if (key.startsWith(this.actionsPrefix)) {
          const actionType = key.slice(this.actionsPrefix.length);
          playersArray.doc.transact(() => {
            if (val !== null) {
              // Add action to state.
              getActionsState().push([val]);
              const remotePlayer = metaversefile.getRemotePlayerByPlayerId(playerId);
              if (remotePlayer.avatar) {
                physx.physxWorker.addActionAnimationAvatar(remotePlayer.avatar.animationAvatarPtr, val);
              }
            } else {
              // Remove action from state.
              const actionsState = getActionsState();
              const actionsArray = Array.from(actionsState);
              let i = 0;
              for (const action of actionsState) {
                if (action.type === actionType) {
                  actionsState.delete(i);
                  const remotePlayer = metaversefile.getRemotePlayerByPlayerId(playerId);
                  if (remotePlayer.avatar) {
                    physx.physxWorker.removeActionAnimationAvatar(remotePlayer.avatar.animationAvatarPtr, actionsArray[i]);
                  }
                  break;
                }
                i++;
              }
            }
          });
        } else if (key.startsWith(this.appsPrefix)) {
          playersArray.doc.transact(() => {
            const apps = playerMap.get(appsMapName);

            if (val !== null) {
              // Add app to state.
              apps.push([{
                components: [],
                transform: defaultTransform.slice(),
                ...val,
              }]);
            } else {
              // Remove app from state.
              const appKey = key.slice(this.appsPrefix.length);
              let index = 0;
              for (const app of apps) {
                if (app.get('instanceId') === appKey) {
                  apps.delete(index);
                  break;
                }
                index += 1;
              }
            }
          });
        } else if (key === 'avatar') {
          // Set new avatar instanceId.
          playersArray.doc.transact(() => {
            playerMap.set('avatar', val);
          });
        } else if (key === 'voiceSpec') {
          playersArray.doc.transact(() => {
            playerMap.set('voiceSpec', val);
          });
        }
      });

      // Add this player to player map.
      const transform = player.getKeyValue('transform');
      if (transform) {
        playersArray.doc.transact(() => {
          playerMap.set('transform', transform);
          playerMap.set('velocity', [0, 0, 0]);
        });
      }
      const voiceSpec = player.getKeyValue('voiceSpec');
      if (voiceSpec) {
        playersArray.doc.transact(() => {
          playerMap.set('voiceSpec', voiceSpec);
        });
      }
      const avatar = player.getKeyValue('avatar');
      if (avatar) {
        const avatarApp = player.getKeyValue(this.appsPrefix + avatar);
        if (avatarApp) {
          // Add new avatar app.
          playersArray.doc.transact(() => {
            const apps = playerMap.get(appsMapName);
            apps.push([{
              instanceId: avatar,
              contentId: avatarApp.contentId,
              components: [],
              transform: defaultTransform.slice(),
            }]);
          });
        }
        playersArray.doc.transact(() => {
          // Set new avatar instanceId.
          playerMap.set('avatar', avatar);
        });
      }
    });
    virtualPlayers.addEventListener('leave', e => {
      const {playerId} = e.data;
      console.log('Player left:', playerId);

      const playersArray = this.state.getArray(playersMapName);
      for (let i = 0; i < playersArray.length; i++) {
        const playerMap = playersArray.get(i, Z.Map);
        if (playerMap.get('playerId') === playerId) {
          playersArray.delete(i);
          break;
        }
      }
    });

    // Handle scene updates from network realms.
    // In particular, 'entityadd' events for world apps are received by player 2+ when they join a room.
    const onWorldAppEntityAdd = e => {
      const {arrayId, entityId} = e.data;
      const instanceId = entityId;
      if (arrayId === "worldApps" && !world.appManager.hasTrackedApp(instanceId)) {
        const virtualWorld = this.realms.getVirtualWorld();
        const {contentId, transform, components} = virtualWorld.worldApps.getVirtualMap(instanceId).toObject();
        const appsArray = state.getArray(appsMapName);
        appsArray.doc.transact(() => {
          const appMap = new Z.Map();
          appMap.set('instanceId', instanceId);
          appMap.set('contentId', contentId);
          appMap.set('transform', new Float32Array(transform));
          appMap.set('components', components);
          appsArray.push([appMap]);
        });
      }
    };
    this.realms.addEventListener('entityadd', onWorldAppEntityAdd);
    const onWorldAppEntityRemove = e => {
      // TODO
      console.warn('onWorldAppEntityRemove() not implemented');
    };
    this.realms.addEventListener('entityremove', onWorldAppEntityRemove);

    const onConnect = async position => {
      const localPlayer = this.playersManager.getLocalPlayer();
      const virtualWorld = this.realms.getVirtualWorld();

      // World app initialization.
      // 'trackedappadd' events occur when player 1 loads the scene upon entering multiplayer. These apps are added to the
      // realms for other players to obtain when they join via realms 'entityadd' events.
      // TODO: Won't need this once the multiplayer-do state is used instead of current Z state.
      const onTrackedAppAdd = async e => {
        const {trackedApp} = e.data;
        const {instanceId, contentId, transform, components} = trackedApp.toJSON();
        const position = [...transform].slice(0, 3);
        const realm = this.realms.getClosestRealm(position);
        virtualWorld.worldApps.addEntityAt(instanceId, {instanceId, contentId, transform, components}, realm);
      };
      this.world.appManager.addEventListener('trackedappadd', onTrackedAppAdd);
      this.playerCleanupFns.push(() => {
        this.world.appManager.removeEventListener('trackedappadd', onTrackedAppAdd);
      });

      // Player app changes.
      // TODO: Use realms.localPlayer.playerApps collection instead of key values.
      const onAppAdd = e => {
        const app = e.data;
        const components = app.components.reduce((acc, val) => {
          acc[val.key] = val.value;
          return acc;
        }, {});
        this.realms.localPlayer.setKeyValue(this.appsPrefix + app.instanceId, {
          instanceId: app.instanceId,
          ...components,
        });
      };
      localPlayer.appManager.addEventListener('appadd', onAppAdd);
      this.playerCleanupFns.push(() => {
        localPlayer.appManager.removeEventListener('appadd', onAppAdd);
      });
      const onAppRemove = e => {
        const app = e.data;
        this.realms.localPlayer.setKeyValue(this.appsPrefix + app.instanceId, null);
      };
      localPlayer.appManager.addEventListener('appremove', onAppRemove);
      this.playerCleanupFns.push(() => {
        localPlayer.appManager.removeEventListener('appremove', onAppRemove);
      });

      // Player avatar changes.
      const onAvatarChange = e => {
        this.realms.localPlayer.setKeyValue('avatar', localPlayer.getAvatarInstanceId());
      };
      localPlayer.addEventListener('avatarchange', onAvatarChange);
      this.playerCleanupFns.push(() => {
        localPlayer.appManager.removeEventListener('avatarchange', onAvatarChange);
      });
      const onAvatarUpdate = e => {
        // Nothing to do.
      };
      localPlayer.addEventListener('avatarupdate', onAvatarUpdate);
      this.playerCleanupFns.push(() => {
        localPlayer.appManager.removeEventListener('avatarupdate', onAvatarUpdate);
      });

      // Player action changes.
      // TODO: Use realms.localPlayer.playerActions collection instead of key values.
      const onActionAdd = e => {
        this.realms.localPlayer.setKeyValue(this.actionsPrefix + e.action.type, e.action);
      };
      localPlayer.addEventListener('actionadd', onActionAdd);
      this.playerCleanupFns.push(() => {
        localPlayer.removeEventListener('actionadd', onActionAdd);
      });
      const onActionRemove = e => {
        this.realms.localPlayer.setKeyValue(this.actionsPrefix + e.action.type, null);
      };
      localPlayer.addEventListener('actionremove', onActionRemove);
      this.playerCleanupFns.push(() => {
        localPlayer.removeEventListener('actionremove', onActionRemove);
      });

      // Initialize network realms player.
      this.realms.localPlayer.initializePlayer({
        position,
      }, {});
      const transformAndTimestamp = [...localPlayer.transform, performance.now()];
      this.realms.localPlayer.setKeyValue('transform', transformAndTimestamp);
      this.realms.localPlayer.setKeyValue('voiceSpec', localPlayer.playerMap.get('voiceSpec'));

      // Avatar model.
      const apps = localPlayer.playerMap.get(appsMapName);
      const appsArray = Array.from(apps);
      const avatarInstanceId = localPlayer.getAvatarInstanceId();
      const avatarApp = appsArray.find(app => app.get('instanceId') === avatarInstanceId);
      const components = {
        contentId: avatarApp.get('contentId'),
        instanceId: avatarInstanceId,
      };
      this.realms.localPlayer.setKeyValue(this.appsPrefix + avatarInstanceId, components);
      this.realms.localPlayer.setKeyValue('avatar', avatarInstanceId);

      // Mic state.
      if (voiceInput.micEnabled()) {
        this.realms.enableMic();
      }

      // Load the scene.
      // First player loads scene from src.
      // Second and subsequent players load scene from network realms.
      // TODO: Won't need to load the scene once the multiplayer-do state is used instead of the current Z state.
      if (virtualWorld.worldApps.getSize() === 0) {
        await metaversefile.createAppAsync({
          start_url: src,
        });
      }

      console.log('Multiplayer connected');
      this.multiplayerConnected = true;
    };

    // Initiate network realms connection.
    await this.realms.updatePosition(localPlayer.position.toArray(), realmSize, {
      onConnect,
    });


    // Wait for world apps to be loaded so that avatar doesn't fall.
    const TEST_INTERVAL = 100;
    const MAX_TIMEOUT = 20000;
    const startTime = Date.now();
    while (world.appManager.pendingAddPromises.size > 0 && (Date.now() - startTime) < MAX_TIMEOUT) {
      await new Promise(resolve => setTimeout(resolve, TEST_INTERVAL));
    } */
  }

  // Called by enterWorld() to ensure we aren't connected to multi-player.
  disconnectMultiplayer() {
    if (!this.multiplayerConnected) {
      throw new Error('not connected to multiplayer');
      return;
    }

    this.multiplayerConnected = false;

    // for (const cleanupFn of this.playerCleanupFns) {
    //   cleanupFn();
    // }
    // this.playerCleanupFns = [];

    if (this.realms) {
      this.realms.disconnect();
      this.realms = null;
    }

    console.log('Multiplayer disconnected');
  }
}
// const universe = new Universe();
// export default universe;