/* player manager manages local and remote players
player manager binds y.js data to player objects
player objects load their own avatar and apps using this binding */

// import * as Z from 'zjs';
import * as THREE from 'three';
import {LocalPlayer, RemotePlayer} from './character-controller.js';
import {makeId} from './util.js';
import {initialPosY} from './constants.js';

export class PlayersManager extends THREE.Object3D {
  #localPlayer = null;
  #remotePlayers = new Map();

  constructor({
    engine,
    physicsTracker,
    environmentManager,
    audioManager,
    chatManager,
    sounds,
  }) {
    super();

    if (!engine || !physicsTracker || !environmentManager || !audioManager || !chatManager || !sounds) {
      throw new Error('missing required arguments');
    }
    this.engine = engine;
    this.physicsTracker = physicsTracker;
    this.environmentManager = environmentManager;
    this.audioManager = audioManager;
    this.chatManager = chatManager;
    this.sounds = sounds;

    // this.playersArray = null;
    this.setLocalPlayer(this.#addLocalPlayer());

    // this.remotePlayers = new Map();
    // this.remotePlayersByInteger = new Map();
    // this.unbindStateFn = null;
    // this.removeListenerFn = null;
  }

  // XXX debugging
  get playersArray() {
    debugger;
  }
  set playersArray(playersArray) {
    debugger;
  }

  #addLocalPlayer({
    playerId = makeId(5),
  } = {}) {
    const localPlayer = new LocalPlayer({
      playerId,
      engine: this.engine,
      physicsTracker: this.physicsTracker,
      environmentManager: this.environmentManager,
      audioManager: this.audioManager,
      chatManager: this.chatManager,
      sounds: this.sounds,
    });
    localPlayer.position.y = initialPosY;
    this.add(localPlayer.appManager);
    localPlayer.appManager.updateMatrixWorld();
    return localPlayer;
  }

  getLocalPlayer() {
    return this.#localPlayer;
  }

  setLocalPlayer(newLocalPlayer) {
    const oldPlayer = this.localPlayer;
    this.#localPlayer = newLocalPlayer;

    this.dispatchEvent({
      type: 'playerchange',
      // data: {
        oldPlayer: oldPlayer,
        player: this.localPlayer,
      // }
    });
  }

  addRemotePlayer({
    playerId = makeId(5),
  }) {
    const remotePlayer = new RemotePlayer({
      playerId,
      engine: this.engine,
      physicsTracker: this.physicsTracker,
      environmentManager: this.environmentManager,
      audioManager: this.audioManager,
      chatManager: this.chatManager,
      sounds: this.sounds,
    });
    // remotePlayer.position.y = initialPosY;
    this.add(remotePlayer.appManager);
    remotePlayer.appManager.updateMatrixWorld();
    this.#remotePlayers.set(playerId, remotePlayer);
    return remotePlayer;
  }

  removeRemotePlayer(player) {
    if (player.appManager.parent === this) {
      this.remove(player.appManager);
      this.#remotePlayers.delete(player.playerId);
      player.destroy();
    } else {
      throw new Error('player app manager not a child of this players manager');
    }
  }

  getRemotePlayers() {
    return Array.from(this.#remotePlayers.values());
  }

  /* clearRemotePlayers() {
    const lastPlayers = this.playersArray;
    if (lastPlayers) {
      const playerSpecs = lastPlayers.toJSON();
      const nonLocalPlayerSpecs = playerSpecs.filter(p => {
        return p.playerId !== this.getLocalPlayer().playerId;
      });
      for (const nonLocalPlayer of nonLocalPlayerSpecs) {
        const remotePlayer = this.remotePlayers.get(nonLocalPlayer.playerId);
        remotePlayer.destroy();
        this.remotePlayers.delete(nonLocalPlayer.playerId);
        this.remotePlayersByInteger.delete(nonLocalPlayer.playerIdInt);
      }
    }
  } */

  getPlayersState() {
    return this.playersArray;
  }

  updateAvatars(timestamp, timeDiff) {
    const localPlayer = this.getLocalPlayer();
    localPlayer.updateAvatar(timestamp, timeDiff);

    for (const remotePlayer of this.#remotePlayers.values()) {
      remotePlayer.updateAvatar(timestamp, timeDiff);
    }
  }
  /* updateAppManagers(timestamp, timeDiff) {
    // XXX all app updates happen in the frameTracker now
    debugger;

    const localPlayer = this.getLocalPlayer();
    localPlayer.appManager.update(timestamp, timeDiff);

    for (const remotePlayer of this.#remotePlayers.values()) {
      remotePlayer.appManager.update(timestamp, timeDiff);
    }
  } */

  /* unbindState() {
    if(this.unbindStateFn != null) {
      this.unbindStateFn();
    }
    if (this.removeListenerFn) {
      this.removeListenerFn();
    }
    this.playersArray = null;
    this.unbindStateFn = null;
    this.removeListenerFn = null;
  }

  bindState(nextPlayersArray) {
    this.unbindState();

    this.playersArray = nextPlayersArray;
    
    if (this.playersArray) {
      const playerSelectedFn = e => {
        const {
          player,
        } = e.data;
        player.bindState(this.playersArray);
      };

      this.addEventListener('playerchange', playerSelectedFn);
      this.removeListenerFn = () => {
        this.removeEventListener('playerchange', playerSelectedFn);
      }
      
      const playersObserveFn = e => {
        const localPlayer = this.localPlayer;
        const {added, deleted, delta, keys} = e.changes;
        for (const item of added.values()) {
          let playerMap = item.content.type;
          if (playerMap.constructor === Object) {
            for (let i = 0; i < this.playersArray.length; i++) {
              const localPlayerMap = this.playersArray.get(i, Z.Map); // force to be a map
              if (localPlayerMap.binding === item.content.type) {
                playerMap = localPlayerMap;
                break;
              }
            }
          }

          const playerId = playerMap.get('playerId');
          
          if (playerId !== localPlayer.playerId) {
            // console.log('add player', playerId, this.playersArray.toJSON());
            
            const remotePlayer = new RemotePlayer({
              playerId,
              playersArray: this.playersArray,
            });
            this.remotePlayers.set(playerId, remotePlayer);
            this.remotePlayersByInteger.set(remotePlayer.playerIdInt, remotePlayer);
            this.dispatchEvent(new MessageEvent('playeradded', {data: {player: remotePlayer}}));
          }
        }
        // console.log('players observe', added, deleted);
        for (const item of deleted.values()) {
          // console.log('player remove 1', item);
          const playerId = item.content.type._map.get('playerId').content.arr[0]; // needed to get the old data
          // console.log('player remove 2', playerId, localPlayer.playerId);

          if (playerId !== localPlayer.playerId) {
            // console.log('remove player', playerId);
            
            const remotePlayer = this.remotePlayers.get(playerId);
            this.remotePlayers.delete(playerId);
            this.remotePlayersByInteger.delete(remotePlayer.playerIdInt);
            remotePlayer.destroy();
            this.dispatchEvent(new MessageEvent('playerremoved', {data: {player: remotePlayer}}));
          }
        }
      };
      this.playersArray.observe(playersObserveFn);
      this.unbindStateFn = this.playersArray.unobserve.bind(this.playersArray, playersObserveFn);
    }
  }

  updateRemotePlayers(timestamp, timeDiff) {
    for (const remotePlayer of this.remotePlayers.values()) {
      remotePlayer.update(timestamp, timeDiff);
    }
  } */
}
// const playersManager = new PlayersManager();
// export {
//   playersManager,
// };