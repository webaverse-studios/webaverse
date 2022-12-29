/*
this file contains the universe/meta-world/scenes/multiplayer code.
responsibilities include loading the world on url change.
*/

import metaversefile from 'metaversefile';
import {NetworkRealms} from 'multiplayer-do/public/network-realms.mjs';
import WSRTC from 'wsrtc/wsrtc.js';
import * as Z from 'zjs';

import {actionsMapName, appsMapName, partyMapName, initialPosY, playersMapName, realmSize} from './constants.js';
import {characterSelectManager} from './characterselect-manager.js';
import {loadOverworld} from './overworld.js';
import {partyManager} from './party-manager.js';
import physicsManager from './physics-manager.js';
import physxWorkerManager from './physx-worker-manager.js';
import {playersManager} from './players-manager.js';
import {makeId, parseQuery} from './util.js';
import voiceInput from './voice-input/voice-input.js';
import {world} from './world.js';
import {sceneManager} from './scene-manager.js';
import physx from './physx.js';

class Universe extends EventTarget {
  constructor() {
    super();
    this.wsrtc = null;

    this.currentWorld = null;
    this.sceneLoadedPromise = null;

    this.multiplayerEnabled = false;
    this.multiplayerConnected = false;
    this.realms = null;
    this.actionsPrefix = 'actions.';
    this.appsPrefix = 'apps.';
    this.playerCleanupFns = [];
  }

  getWorldsHost() {
    return window.location.protocol + '//' + window.location.hostname + ':' +
      ((window.location.port ? parseInt(window.location.port, 10) : (window.location.protocol === 'https:' ? 443 : 80)) + 1) + '/worlds/';
  }

  async enterWorld(worldSpec, locationSpec) {
    this.disconnectSingleplayer();
    this.disconnectMultiplayer();
    // this.disconnectRoom();
    
    const localPlayer = metaversefile.useLocalPlayer();
    /* localPlayer.teleportTo(new THREE.Vector3(0, 1.5, 0), camera.quaternion, {
      relation: 'float',
    }); */
    if (locationSpec) {
      localPlayer.position.copy(locationSpec.position);
    } else {
      localPlayer.position.set(0, initialPosY, 0);
    }
    localPlayer.characterPhysics.setPosition(localPlayer.position);
    localPlayer.characterPhysics.reset();
    localPlayer.updateMatrixWorld();
    // physicsManager.setPhysicsEnabled(true);
    // localPlayer.updatePhysics(0, 0);
    const physicsScene = physicsManager.getScene();
    physicsScene.setPhysicsEnabled(false);

    const _doLoad = async () => {
      // world.clear();

      const promises = [];
      const {src, room} = worldSpec;
      this.multiplayerEnabled = room !== undefined;
      if (!this.multiplayerEnabled) {
        await this.connectSinglePlayer();

        let match;
        if (src === undefined) {
          const sceneNames = await sceneManager.getSceneNamesAsync();
          // const sceneUrl = sceneManager.getSceneUrl(sceneNames[0]);
          const sceneUrl = sceneManager.getSceneUrl('block.scn');
          worldSpec = {src: sceneUrl};
          promises.push(metaversefile.createAppAsync({
            start_url: sceneUrl,
          }));
        } else if (src === '') {
          // nothing
        } else if (match = src.match(/^weba:\/\/(-?[0-9\.]+),(-?[0-9\.]+)(?:\/|$)/i)) {
          const [, x, y] = match;
          const [x1, y1] = [parseFloat(x), parseFloat(y)];
          const p = loadOverworld(x1, y1);
          promises.push(p);
        } else {
          const p = metaversefile.createAppAsync({
            start_url: src,
          });
          promises.push(p);
        }
      } else {
        const p = (async () => {
          await this.connectMultiplayer(src, room);
        })();
        promises.push(p);
      // } else {
      //  const p = (async () => {
      //    const roomUrl = this.getWorldsHost() + room;
      //    await this.connectRoom(roomUrl);
      //  })();
      //  promises.push(p);
      }
      
      this.sceneLoadedPromise = Promise.all(promises)
        .then(() => {});
      await this.sceneLoadedPromise;
      this.sceneLoadedPromise = null;
    };
    await _doLoad();

    localPlayer.characterPhysics.reset();
    physicsScene.setPhysicsEnabled(true);
    localPlayer.updatePhysics(0, 0);

    this.currentWorld = worldSpec;

    this.dispatchEvent(new MessageEvent('worldload'));
  }

  async reload() {
    await this.enterWorld(this.currentWorld);
  }

  async pushUrl(u) {
    history.pushState({}, '', u);
    window.dispatchEvent(new MessageEvent('pushstate'));
    await this.handleUrlUpdate();
  }

  async handleUrlUpdate() {
    const q = parseQuery(location.search);
    await this.enterWorld(q);
  }

  async enterMultiplayer(url) {
    history.pushState({}, '', url);
    window.dispatchEvent(new MessageEvent('pushstate'));
    const worldSpec = parseQuery(location.search);
    const locationSpec = {
      position: playersManager.getLocalPlayer().position,
    };
    await this.enterWorld(worldSpec, locationSpec);
  }

  isSceneLoaded() {
    return !this.sceneLoadedPromise;
  }

  async waitForSceneLoaded() {
    if (this.sceneLoadedPromise) {
      await this.sceneLoadedPromise;
    } else {
      if (this.currentWorld) {
        // nothing
      } else {
        await new Promise((accept, reject) => {
          this.addEventListener('worldload', e => {
            accept();
          }, {once: true});
        });
      }
    }
  }

  isConnected() { return !!this.wsrtc; }

  getConnection() { return this.wsrtc; }

  connectState(state) {
    this.state = state;
    state.setResolvePriority(1);

    playersManager.clearRemotePlayers();
    playersManager.bindState(state.getArray(playersMapName));

    world.appManager.unbindState();
    world.appManager.clear();
    const appsArray = state.get(appsMapName, Z.Array);
    world.appManager.bindState(appsArray);

    const partyMap = state.get(partyMapName, Z.Map);
    partyManager.bindState(partyMap);

    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.bindState(state.getArray(playersMapName));
  }

  // Called by enterWorld() when a player connects as single-player.
  async connectSinglePlayer(state = new Z.Doc()) {
    this.connectState(state);
  }

  // Called by enterWorld() to ensure we aren't connected as single player.
  disconnectSingleplayer() {
    // Nothing to do at present.
  }

  // Called by enterWorld() when a player enables multi-player.
  async connectMultiplayer(src, room, state = new Z.Doc()) {
    console.log("Connect multiplayer");
    this.connectState(state);

    // Use default scene if none specified.
    if (src === undefined) {
      const sceneNames = await sceneManager.getSceneNamesAsync();
      src = sceneManager.getSceneUrl(sceneNames[0]);
    }

    // Set up the network realms.
    const localPlayer = playersManager.getLocalPlayer();
    this.realms = new NetworkRealms(room, localPlayer.playerId);
    await this.realms.initAudioContext();

    // Handle remote players joining and leaving the set of realms.
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
    const onWorldAppEntityAdd = e => {
      const { arrayId, entityId } = e.data;
      const instanceId = entityId;
      if (arrayId === "worldApps" && !world.appManager.hasTrackedApp(instanceId)) {
        const virtualWorld = this.realms.getVirtualWorld();
        const { contentId, transform, components } = virtualWorld.worldApps.getVirtualMap(instanceId).toObject();
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
      const localPlayer = playersManager.getLocalPlayer();

      // World app changes.
      const virtualWorld = this.realms.getVirtualWorld();
      const onTrackedAppAdd = async e => {
        // An app has been added to the world.
        const {trackedApp} = e.data;
        const {instanceId, contentId, transform, components} = trackedApp.toJSON();
        const position = [...transform].slice(0, 3);
        const realm = this.realms.getClosestRealm(position);
        virtualWorld.worldApps.addEntityAt(instanceId, {instanceId, contentId, transform, components}, realm);
      };
      world.appManager.addEventListener('trackedappadd', onTrackedAppAdd);
      this.playerCleanupFns.push(() => {
        world.appManager.removeEventListener('trackedappadd', onTrackedAppAdd);
      });
      const onTrackedAppRemove = async e => {
        // An app has been removed from the world.
        const {instanceId, app} = e.data;
        // TODO
        console.warn('onTrackedAppRemove() not implemented');
      };
      world.appManager.addEventListener('trackedappremove', onTrackedAppRemove);
      this.playerCleanupFns.push(() => {
        world.appManager.removeEventListener('trackedappremove', onTrackedAppRemove);
      });

      // Player app changes.
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
      const onActionAdd = e => {
        universe.realms.localPlayer.setKeyValue(this.actionsPrefix + e.action.type, e.action);
      };
      localPlayer.addEventListener('actionadd', onActionAdd);
      this.playerCleanupFns.push(() => {
        localPlayer.removeEventListener('actionadd', onActionAdd);
      });
      const onActionRemove = e => {
        universe.realms.localPlayer.setKeyValue(this.actionsPrefix + e.action.type, null);
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

      // Load the scene if not already loaded in the multiplayer realms.
      // TODO: Won't need to load the scene once multiplayer "rooms" are used.
      if (virtualWorld.worldApps.getSize() === 0) {
        await metaversefile.createAppAsync({
          start_url: src,
        });
      }

      console.log('Multiplayer connected');
      this.multiplayerConnected = true;
    };

    await this.realms.updatePosition(localPlayer.position.toArray(), realmSize, {
      onConnect,
    });

    // Wait for world apps to be loaded so that avatar doesn't fall.
    await new Promise(async resolve => {
      const TEST_INTERVAL = 100;
      const MAX_TIMEOUT = 20000;
      const startTime = Date.now();
      while (world.appManager.pendingAddPromises.size > 0 && (Date.now() - startTime) < MAX_TIMEOUT) {
        await new Promise(resolve => setTimeout(resolve, TEST_INTERVAL));
      }
      resolve();
    });
  }

  // Called by enterWorld() to ensure we aren't connected to multi-player.
  disconnectMultiplayer() {
    if (!this.multiplayerConnected) {
      return;
    }

    this.multiplayerConnected = false;

    for (const cleanupFn of this.playerCleanupFns) {
      cleanupFn();
    }
    this.playerCleanupFns = [];

    if (this.realms) {
      this.realms.disconnect();
      this.realms = null;
    }

    console.log('Multiplayer disconnected');
  }

  // called by enterWorld() in universe.js
  // This is called when a user joins a multiplayer room
  // either from single player or directly from a link
  async connectRoom(u, state = new Z.Doc()) {
    this.state = state;
    // Players cannot be initialized until the physx worker is loaded
    // Otherwise you will receive allocation errors because the module instance is undefined
    await physxWorkerManager.waitForLoad();
    const localPlayer = playersManager.getLocalPlayer();

    state.setResolvePriority(1);

    // Create a new instance of the websocket rtc client
    // This comes from webaverse/wsrtc/wsrtc.js
    this.wsrtc = new WSRTC(u, {
      localPlayer,
      crdtState: state,
    });

    // This is called when the websocket connection opens, i.e. server is connectedw
    const open = e => {
      playersManager.clearRemotePlayers();
      this.wsrtc.removeEventListener('open', open);
      // Clear the last world state
      const appsArray = state.get(appsMapName, Z.Array);

      playersManager.bindState(state.getArray(playersMapName));

      // Unbind the world state to clear existing apps
      world.appManager.unbindState();
      world.appManager.clear();
      // Bind the new state
      world.appManager.bindState(appsArray);

      // Called by WSRTC when the connection is initialized
      const init = e => {
        this.wsrtc.removeEventListener('init', init);

        const partyMap = state.get(partyMapName, Z.Map);
        partyManager.bindState(partyMap);
        localPlayer.bindState(state.getArray(playersMapName));

        this.wsrtc.addEventListener('audio', e => {
          const player = playersManager.remotePlayersByInteger.get(e.data.playerId);
          player.processAudioData(e.data);
        });

        world.appManager.loadApps().then(() => {
          this.dispatchEvent(new MessageEvent('roomconnect'))
        });
      };

      this.wsrtc.addEventListener('init', init);
    };

    this.wsrtc.addEventListener('open', open);

    await new Promise((accept, reject) => {
      this.addEventListener('roomconnect', e => {
        accept();
      }, {once: true});
    });

    return this.wsrtc;
  }

  // called by enterWorld() in universe.js, to make sure we aren't already connected
  disconnectRoom() {
    if (this.wsrtc && this.wsrtc.state === 'open') this.wsrtc.close();
    this.wsrtc = null;
  }
}
const universe = new Universe();

export default universe;