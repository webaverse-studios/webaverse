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
  }

  getWorldsHost() {
    return window.location.protocol + '//' + window.location.hostname + ':' +
      ((window.location.port ? parseInt(window.location.port, 10) : (window.location.protocol === 'https:' ? 443 : 80)) + 1) + '/worlds/';
  }

  async enterWorld(worldSpec) {
    this.disconnectMultiplayer();
    this.disconnectRoom();
    
    const localPlayer = metaversefile.useLocalPlayer();
    /* localPlayer.teleportTo(new THREE.Vector3(0, 1.5, 0), camera.quaternion, {
      relation: 'float',
    }); */
    localPlayer.position.set(0, initialPosY, 0);
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
      if (!this.multiplayerEnabled && !room) {
        const state = new Z.Doc();
        this.connectState(state);

        let match;
        if (src === undefined) {
          const sceneNames = await sceneManager.getSceneNamesAsync();
          const sceneUrl = sceneManager.getSceneUrl(sceneNames[0]);
          worldSpec = { src: sceneUrl };
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
      } else if (this.multiplayerEnabled) {
        const p = (async () => {
          await this.connectMultiplayer(src);
        })();
        promises.push(p);
      } else {
        const p = (async () => {
          const roomUrl = this.getWorldsHost() + room;
          await this.connectRoom(roomUrl);
        })();
        promises.push(p);
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

  toggleMultiplayer() {
    this.multiplayerEnabled = !this.multiplayerEnabled;
    console.log(this.multiplayerEnabled ? 'Enter multiplayer' : 'Exit multiplayer');
    this.reload();
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

  // called by enterWorld() in universe.js
  // This is called in single player mode instead of connectRoom
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

  // Called by enterWorld() when a player enables multi-player.
  async connectMultiplayer(src, state = new Z.Doc()) {
    this.connectState(state);

    // Set up the network realms.
    // https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
    const hashCode = s => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0);
    const sceneId = hashCode(src).toString();
    const localPlayer = playersManager.getLocalPlayer();
    this.realms = new NetworkRealms(sceneId, localPlayer.playerId);
    this.realmsCleanupFns = new Map();

    this.realms.addEventListener('realmjoin', e => {
      const {realm} = e.data;
      const {dataClient, networkedDataClient} = realm;

      const onsyn = e => {
        const {synId} = e.data;
        const synAckMessage = dataClient.getSynAckMessage(synId);
        networkedDataClient.emitUpdate(synAckMessage);
      };
      dataClient.addEventListener('syn', onsyn);

      const cleanupFns = [
        () => {
          dataClient.removeEventListener('syn', onsyn);
        },
      ];

      this.realmsCleanupFns.set(realm, () => {
        for (const cleanupFn of cleanupFns) {
          cleanupFn();
        }
      });
    });

    this.realms.addEventListener('realmleave', e => {
      const {realm} = e.data;

      this.realmsCleanupFns.get(realm)();
      this.realmsCleanupFns.delete(realm);
    });

    // Handle remote players joining and leaving the set of realms.
    // These events are received both upon starting and during multiplayer.
    const virtualPlayers = this.realms.getVirtualPlayers();
    virtualPlayers.addEventListener('join', async e => {
      const {playerId, player} = e.data;
      console.log('Player joined:', playerId);

      const defaultPlayerSpec = await characterSelectManager.getDefaultSpecAsync();
      const defaultTransform = new Float32Array([0, 0, 0, 0, 0, 0, 1, 1, 1, 1]);

      const playersArray = this.state.getArray(playersMapName);
      const playerMap = new Z.Map();
      playersArray.doc.transact(() => {
        playerMap.set('playerId', playerId);

        const appId = makeId(5);

        const appsArray = new Z.Array();
        const avatarApp = {
          instanceId: appId,
          contentId: defaultPlayerSpec.avatarUrl,
          transform: defaultTransform,
          components: [],
        };
        appsArray.push([avatarApp]);
        playerMap.set(appsMapName, appsArray);

        const actionsArray = new Z.Array();
        // TODO: Add landAction?
        playerMap.set(actionsMapName, actionsArray);

        playerMap.set('avatar', appId);
        // TODO: Add voiceSpec?

        playersArray.push([playerMap]);
      });

      const getActionsState = () => {
        let actionsArray = playerMap.has(actionsMapName) ? playerMap.get(actionsMapName, Z.Array) : null;
        if (!actionsArray) {
          actionsArray = new Z.Array();
          playerMap.set(actionsMapName, actionsArray);
        }
        return actionsArray;
      }

      // Handle remote player updates.
      player.addEventListener('update', e => {
        const {key, val} = e.data;

        if (key === 'transform') {
          playersArray.doc.transact(() => {
            playerMap.set('transform', val);
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
        }
      });

      const position = player.getKeyValue('position');
      // TODO: Remote player initial position;
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

    // Use default scene if none specified.
    if (src === undefined) {
      const sceneNames = await sceneManager.getSceneNamesAsync();
      src = sceneManager.getSceneUrl(sceneNames[0]);
    }

    // Load the scene.
    await metaversefile.createAppAsync({
      start_url: src,
    });

    const onConnect = (position) => {

      // Default player apps and actions can be included here.

      // Player actions.
      const localPlayer = playersManager.getLocalPlayer();
      localPlayer.addEventListener('actionadd', (e, origin) => {
        universe.realms.localPlayer.setKeyValue(this.actionsPrefix + e.action.type, e.action);
      });
      localPlayer.addEventListener('actionremove', (e, origin) => {
        universe.realms.localPlayer.setKeyValue(this.actionsPrefix + e.action.type, null);
      });

      this.realms.localPlayer.initializePlayer({
        position,
      }, {});
      this.realms.localPlayer.setKeyValue('position', position);

      console.log('Multiplayer connected');
      this.multiplayerConnected = true;
    };

    const initialPosition = [
      localPlayer.position.x,
      localPlayer.position.y,
      localPlayer.position.z
    ];

    this.realms.updatePosition(initialPosition, realmSize, {
      onConnect
    });
  }

  // Called by enterWorld() to ensure we aren't connected to multi-player.
  disconnectMultiplayer() {
    console.log('Multiplayer disconnected');
    this.multiplayerConnected = false;

    if (this.realms) {
      this.realms.disconnect();
      this.realms = null;
    }
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