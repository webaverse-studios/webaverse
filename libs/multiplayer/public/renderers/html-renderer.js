import {frameSize, realmSize, inventoryFrameSize} from '../constants.js';
import {zstringify} from '../util.mjs';

//

const rockImg = new Image();
rockImg.src = '/public/images/rock.png';

//

/* export class LocalPlayerHtmlRenderer {
  constructor(localPlayerId, virtualPlayer) {
    this.localPlayerId = localPlayerId;
    this.virtualPlayer = virtualPlayer;

    const div = document.createElement('div');
    div.id = 'inventory';
    document.body.appendChild(div);

    // const playerAppsEntityAdd = e => {
    //   console.log('html renderer got player apps add', e.data);
    // };
    // virtualPlayer.playerApps.addEventListener('entityadd', playerAppsEntityAdd);

    // const playerActionsEntityAdd = e => {
    //   console.log('html renderer got player actions add', e.data);
    // };
    // virtualPlayer.playerActions.addEventListener('entityadd', playerActionsEntityAdd);

    this.cleanupFn = () => {
      document.body.removeChild(div);

      // virtualPlayer.removeEventListener('entityadd', playerAppsEntityAdd);
      // virtualPlayer.removeEventListener('entityadd', playerActionsEntityAdd);
    };
  }
  destroy() {
    this.cleanupFn();
  }
} */

export class RemotePlayerCursorHtmlRenderer {
  constructor(remotePlayerId, localPlayerId, virtualPlayer) {
    this.remotePlayerId = remotePlayerId;
    this.localPlayerId = localPlayerId;
    this.virtualPlayer = virtualPlayer;

    const div = document.createElement('div');
    div.className = 'player-cursor';
    div.style.cssText = `\
      background-color: ${this.remotePlayerId === this.localPlayerId ? 'blue' : 'red'};
    `;
    document.body.appendChild(div);

    // console.log('new cursor');

    // const map = this.dataClient.getArrayMap('players', this.remotePlayerId);
    // console.log('virtual player update listen');
    const update = e => {
      // console.log('html renderer got player map update', e.data);

      const {key, val} = e.data;
      // console.log('got key', key);
      if (key === 'cursorPosition') {
        const [x, y, z] = val;
        div.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };
    virtualPlayer.addEventListener('update', update);

    this.cleanupFn = () => {
      document.body.removeChild(div);

      virtualPlayer.removeEventListener('update', update);
    };
  }

  destroy() {
    this.cleanupFn();
  }
}

//

export class AppsHtmlRenderer {
  constructor(realms) {
    const _render = () => {
      const worldAppsEl = document.getElementById('world-apps');

      let worldAppIndex = 0;
      const playerAppIndexes = new Map();
      const _makeAppEl = () => {
        const appEl = rockImg.cloneNode();
        appEl.classList.add('world-app');
        return appEl;
      };
      const _pushWorldApp = needledEntity => {
        const wearSpec = _getWearSpec(needledEntity);
        if (wearSpec) {
          // console.log('got wear spec', wearSpec);
          const {
            wearPlayerId,
            wearNeedledEntity,
          } = wearSpec;
          // if (wearPlayerId !== realms.playerId) {
          //   debugger;
          //   throw new Error('only local player is supported');
          // }

          const playerAppIndex = playerAppIndexes.get(wearPlayerId) ?? 0;
          playerAppIndexes.set(wearPlayerId, playerAppIndex + 1);

          const playerEl = document.getElementById(`player-${wearPlayerId}`);
          const playerApps = playerEl.querySelector('.player-apps');
          const had = !!playerApps.childNodes[playerAppIndex];
          const appEl = playerApps.childNodes[playerAppIndex] || _makeAppEl();

          // appEl.style.left = `${playerAppIndex * inventoryFrameSize}px`;
          // appEl.style.top = null;
          appEl.style.transform = `translate3d(${playerAppIndex * inventoryFrameSize}px, 0, 0)`;

          // console.log('append child', wearPlayerId, needledEntity.arrayIndexId);

          !had && playerApps.appendChild(appEl);

          // debugger;
        } else {
          // console.log('world app');

          const had = !!worldAppsEl.childNodes[worldAppIndex];
          const appEl = worldAppsEl.childNodes[worldAppIndex] || _makeAppEl();
          
          const app = needledEntity.toObject();
          const position = app.position ?? [0, 0, 0];
          // appEl.style.left = `${position[0]}px`;
          // appEl.style.top = `${position[2]}px`;
          appEl.style.transform = `translate3d(${position[0]}px, ${position[2]}px, 0)`;
          
          !had && worldAppsEl.appendChild(appEl);

          worldAppIndex++;
        }
      };
      const _finalizeWorldApps = () => {
        while (worldAppsEl.children.length > worldAppIndex) {
          worldAppsEl.removeChild(worldAppsEl.lastChild);
        }

        const playersEl = document.getElementById('players');
        for (const playerEl of playersEl.childNodes) {
          const playerApps = playerEl.querySelector('.player-apps');
          const playerId = playerEl.id.slice('player-'.length);
          const playerAppIndex = playerAppIndexes.get(playerId) ?? 0;
          while (playerApps.children.length > playerAppIndex) {
            playerApps.removeChild(playerApps.lastChild);
          }
        }
      };

      for (const needledEntity of worldAppEntities.values()) {
        _pushWorldApp(needledEntity);
      }
      _finalizeWorldApps();
    };
    const update = () => {
      _render();
    };
    const _getWearSpec = virtualEntity => {
      const playerActionIdsMap = new Map();
      const allPlayerActions = Array.from(playerActions.values()).concat(
        Array.from(remotePlayerActions.values())
          .flatMap(set => Array.from(set)),
      );
      /* const allPlayerActions = realms.localPlayer.playerActions.getValues()
        .concat(
          realms.players.getValues()
            .flatMap(player => player.playerActions.getValues())
        ); */
      allPlayerActions.forEach(playerAction => {
        const match = playerAction.arrayId.match(/^([^:]+?):([^:]+?)$/);
        if (match) {
          const playerId = match[2];
          playerActionIdsMap.set(playerAction.entityMap.arrayIndexId, playerId);
        } else {
          debugger;
        }
      });

      const actionIds = allPlayerActions.map(a => a.arrayIndexId);
      const actions = Array.from(allPlayerActions.values()).map(playerAction => playerAction.toObject());
      const wearActionIndex = actions.findIndex(action => action.action === 'wear' && action.appId === virtualEntity.entityMap.arrayIndexId);
      const wearAction = actions[wearActionIndex];
      const wearActionId = actionIds[wearActionIndex]; // XXX wrong

      if (wearAction) {
        const wearPlayerId = playerActionIdsMap.get(wearActionId);
        const wearNeedledEntity = playerApps.get(wearAction.appId);
        return {
          wearPlayerId,
          wearNeedledEntity,
        };
      } else {
        return null;
      }
    };

    // local players
    const playerApps = new Map();
    const playerActions = new Map();
    realms.localPlayer.playerApps.addEventListener('needledentityadd', e => {
      // console.log('got app', e.data);
      const {needledEntity} = e.data;
      playerApps.set(needledEntity.entityMap.arrayIndexId, needledEntity);

      needledEntity.addEventListener('update', update);
    });
    realms.localPlayer.playerApps.addEventListener('needledentityremove', e => {
      // console.log('remove app', e.data);
      const {needledEntity} = e.data;

      needledEntity.removeEventListener('update', update);

      playerApps.delete(needledEntity.entityMap.arrayIndexId);
    });
    realms.localPlayer.playerActions.addEventListener('needledentityadd', e => {
      const {needledEntity} = e.data;
      playerActions.set(needledEntity.entityMap.arrayIndexId, needledEntity);

      update();
    });
    realms.localPlayer.playerActions.addEventListener('needledentityremove', e => {
      const {needledEntity} = e.data;
      playerActions.delete(needledEntity.entityMap.arrayIndexId);

      update();
    });

    // remote players
    const remotePlayerActions = new Map();
    const remotePlayersCleanupFns = new Map();
    realms.players.addEventListener('join', e => {
      // console.log('remote player join', e.data);
      const {playerId, player} = e.data;

      const localRemotePlayerActions = new Set();
      remotePlayerActions.set(playerId, localRemotePlayerActions);
      const onappadd = e => {
        const {entityId, needledEntity} = e.data;
        localRemotePlayerActions.add(needledEntity);

        update();
      };
      player.playerActions.addEventListener('needledentityadd', onappadd);
      const onappremove = e => {
        const {entityId, needledEntity} = e.data;
        // if (!needledEntity) {
        //   debugger;
        // }
        localRemotePlayerActions.delete(needledEntity);

        update();
      };
      player.playerActions.addEventListener('needledentityremove', onappremove);

      // intialize starting actions
      for (const playerActionId of player.playerActions.getKeys()) {
        const needledEntity = player.playerActions.getVirtualMap(playerActionId);
        localRemotePlayerActions.add(needledEntity);
      }

      remotePlayersCleanupFns.set(playerId, () => {
        player.playerApps.removeEventListener('needledentityadd', onappadd);
        player.playerApps.removeEventListener('needledentityremove', onappremove);

        remotePlayerActions.delete(playerId);
      });

      update();
    });
    realms.players.addEventListener('leave', e => {
      // console.log('remote player leave', e.data);
      const {playerId} = e.data;
      remotePlayersCleanupFns.get(playerId)();
      remotePlayersCleanupFns.delete(playerId);

      update();
    });

    // world apps
    const worldAppEntities = new Map();
    const virtualWorld = realms.getVirtualWorld();
    virtualWorld.worldApps.addEventListener('needledentityadd', e => {
      const {needledEntity} = e.data;

      worldAppEntities.set(needledEntity.entityMap.arrayIndexId, needledEntity);
    
      // needledEntity.addEventListener('update', update);

      update();
    });
    virtualWorld.worldApps.addEventListener('needledentityremove', e => {
      const {needledEntity} = e.data;
      // const realm = needledEntity.headTracker.getHeadRealm();

      worldAppEntities.delete(needledEntity.entityMap.arrayIndexId);

      // needledEntity.removeEventListener('update', update);

      update();
    });

    window.realms = realms;
    window.playerApps = playerApps;
    window.playerActions = playerActions;
    window.worldAppEntities = worldAppEntities;
    window.sanityCheck = () => {
      Array.from(playerActions.values()).map(playerAction => playerAction.toObject());
    };
  }
}

//

const spriteUrl = '/public/images/fire-mage.png';
export class GamePlayerCanvas {
  constructor(virtualPlayer, {
    local = true,
  } = {}) {
    this.virtualPlayer = virtualPlayer;
    this.local = local;

    this.element = document.createElement('div');
    this.element.id = `player-${virtualPlayer.arrayIndexId}`;
    // this.element.className = 'game-player';
    this.element.classList.add('player-sprite');

    this.element.tabIndex = -1;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = frameSize;
    this.canvas.height = frameSize;
    this.ctx = this.canvas.getContext('2d');
    this.element.appendChild(this.canvas);
    
    const playerAppsEl = document.createElement('div');
    playerAppsEl.className = 'player-apps';
    this.element.appendChild(playerAppsEl);

    this.velocity = [0, 0, 0];
    this.cancelFn = null;

    const update = e => {
      const {key, val} = e.data;
      if (['position', 'direction'].includes(key)) {
        this.draw();
      }
      if (key === 'position') {
        // console.log('position update event', key, val, new Error().stack);
      }
    };
    virtualPlayer.addEventListener('update', update);

    this.destroy = () => {
      virtualPlayer.removeEventListener('update', update);
    };
  }

  move() {
    const oldPosition = this.virtualPlayer.getKeyValue('position');
    const oldDirection = this.virtualPlayer.getKeyValue('direction');
    
    const speed = 5;

    const _updatePosition = () => {
      const position = [
        oldPosition[0],
        oldPosition[1],
        oldPosition[2],
      ];
      if (this.velocity[0] !== 0 || this.velocity[2] !== 0) {
        position[0] += this.velocity[0] * speed;
        position[2] += this.velocity[2] * speed;
        
        this.virtualPlayer.setKeyValue('position', position);
      }
    };
    _updatePosition();
    const _updateDirection = () => {
      const direction = [
        oldDirection[0],
        oldDirection[1],
        oldDirection[2],
      ];
      let directionChanged = false;
      if (this.velocity[2] < 0) {
        direction[0] = 0;
        direction[2] = -1;
        directionChanged = true;
      } else if (this.velocity[0] < 0) {
        direction[0] = -1;
        direction[2] = 0;
        directionChanged = true;
      } else if (this.velocity[0] > 0) {
        direction[0] = 1;
        direction[2] = 0;
        directionChanged = true;
      } else if (this.velocity[2] > 0) {
        direction[0] = 0;
        direction[2] = 1;
        directionChanged = true;
      } else {
        // nothing
      }
      if (directionChanged) {
        this.virtualPlayer.setKeyValue('direction', direction);
      }
    };
    _updateDirection();
  }

  draw() {
    if (GamePlayerCanvas.#spriteImg) {
      const direction = this.virtualPlayer.getKeyValue('direction');

      let row;
      if (direction[0] === -1) {
        row = 1;
      } else if (direction[0] === 1) {
        row = 2;
      } else if (direction[2] === -1) {
        row = 3;
      } else {
        row = 0;
      }
      const timestamp = performance.now();
      const frameLoopTime = 200;
      const col = Math.floor(timestamp / frameLoopTime) % 3;

      this.ctx.clearRect(0, 0, frameSize, frameSize);
      this.ctx.drawImage(GamePlayerCanvas.#spriteImg, col * frameSize, row * frameSize, frameSize, frameSize, 0, 0, frameSize, frameSize);
    
      if (!this.local) {
        const remotePlayerPosition = this.virtualPlayer.getKeyValue('position');
        // const localPlayerPosition = realms.localPlayer.getKeyValue('position');

        this.element.style.transform = `translate3d(${remotePlayerPosition[0]}px, ${remotePlayerPosition[2]}px, 0)`;
      }
    }
  }

  static #spriteImg = null;
  static async waitForLoad() {
    this.#spriteImg = await new Promise((accept, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        // replace the color #24886d with transparent
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        const _isInRange = (v, base, range) => v >= (base - range) && v <= (base + range);
        const _isInRangeN = (v, base) => _isInRange(v, base, 5);
        for (let i = 0; i < data.length; i += 4) {
          if (_isInRangeN(data[i], 0x24) && _isInRangeN(data[i+1], 0x88) && _isInRangeN(data[i+2], 0x6d)) {
            data[i+3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);

        accept(canvas);
      };
      img.onerror = err => {
        reject(err);
      };
      img.src = spriteUrl;
    });
  }
  /* destroy() {
    // nothing
  } */
}

//

const _drawRectangle = (ctx, color) => {
  const innerBorder = 3;
  const borderWidth = 3;
  ctx.fillStyle = color;
  ctx.fillRect(innerBorder, innerBorder, realmSize - innerBorder * 2, borderWidth); // top
  ctx.fillRect(innerBorder, realmSize - borderWidth - innerBorder, realmSize - innerBorder * 2, borderWidth); // bottom
  ctx.fillRect(innerBorder, innerBorder, borderWidth, realmSize - innerBorder * 2); // left
  ctx.fillRect(realmSize - borderWidth - innerBorder, innerBorder, borderWidth, realmSize - innerBorder * 2); // right
};
export class GameRealmsCanvases {
  constructor(realms) {
    // realm sections
    this.element = document.createElement('div');
    this.element.id = 'network-realms';
    this.element.className = 'network-realms';
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const canvas = document.createElement('canvas');
        canvas.className = 'canvas';
        canvas.width = realmSize;
        canvas.height = realmSize;
        const ctx = canvas.getContext('2d');
        _drawRectangle(ctx, '#CCC');
        
        const x = dx + 1;
        const z = dz + 1;

        const text = document.createElement('div');
        text.className = 'text';
        const text1 = document.createElement('div');
        text1.textContent = `${x}:${z}`;
        text.appendChild(text1);
        const text2 = document.createElement('div');
        text.appendChild(text2);

        const div = document.createElement('div');
        div.className = 'network-realm';
        // div.style.transform = `translate3d(${x * realmSize}px, ${z * realmSize}px, 0)`;
        div.style.left = `${x * realmSize}px`;
        div.style.top = `${z * realmSize}px`;
        div.appendChild(canvas);
        div.appendChild(text);
        div.min = [x * realmSize, 0, z * realmSize];
        div.size = realmSize;
        div.setColor = color => {
          _drawRectangle(ctx, color);
        };
        div.setText = text => {
          text2.innerText = text;
          // console.log('update text', div.min.join(','));
        };
        let needsTextUpdate = '';
        div.updateText = dataClient => {
          const playersArray = dataClient.getArray('players', {
            listen: false,
          });
          const worldApps = dataClient.getArray('worldApps', {
            listen: false,
          });

          const _formatArray = array => {
            array = array.getKeys().map(arrayIndexId => {
              const playerApp = array.getMap(arrayIndexId, {
                listen: false,
              });
              const playerAppJson = playerApp.toObject();
              return playerAppJson;
            });
            return zstringify(array);
          };
          const _updateText = () => {
            let playersString = '';
            if (playersArray.getSize() > 0) {
              playersString = `players: [\n${zstringify(playersArray.toArray())}\n]`;
            } else {
              playersString = `players: []`;
            }

            for (const arrayIndexId of playersArray.getKeys()) {
              // player apps
              let playerAppsString = '';
              const playerAppsArray = dataClient.getArray('playerApps:' + arrayIndexId, {
                listen: false,
              });
              if (playerAppsArray.getSize() > 0) {
                playerAppsString = `  playerApps: [\n${_formatArray(playerAppsArray)}\n]`;
              } else {
                playerAppsString = `  playerApps: []`;
              }
              playersString += '\n' + playerAppsString;
              
              // player actions
              let playerActionsString = '';
              const playerActionsArray = dataClient.getArray('playerActions:' + arrayIndexId, {
                listen: false,
              });
              if (playerActionsArray.getSize()) {
                playerActionsString = `  playerActions: [\n${_formatArray(playerActionsArray)}\n]`;
              } else {
                playerActionsString = `  playerActions: []`;
              }
              playersString += '\n' + playerActionsString;
            }

            let worldAppsString = '';
            if (worldApps.getSize() > 0) {
              worldAppsString = `worldApps: [\n${zstringify(worldApps.toArray())}\n]`;
            } else {
              worldAppsString = `worldApps: []`;
            }

            const s = [
              playersString,
              worldAppsString,
            ].join('\n');
            needsTextUpdate = s;
          };
          _updateText();
        };
        div.update = () => {
          if (needsTextUpdate) {
            div.setText(needsTextUpdate);
            needsTextUpdate = '';
          }
        };
        
        this.element.appendChild(div);
      }
    }
  }

  update() {
    for (const div of this.element.childNodes) {
      div.update();
    }
  }
}