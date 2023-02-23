import {MULTIPLAYER_PORT} from './constants.js';
import {zbencode, zbdecode} from './encoding.mjs';
import {UPDATE_METHODS} from './update-types.js';

const alignN = n => index => {
  const r = index % n;
  return r === 0 ? index : (index + n - r);
};
const align4 = alignN(4);

const parseUpdateObject = uint8Array => zbdecode(uint8Array);

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
const makeId = () => makeid(10);

function parseMessage(m) {
  const match = m.type.match(/^set\.(.+?)\.(.+?)$/);
  if (match) {
    const arrayId = match[1];
    const arrayIndexId = match[2];
    const {key, epoch, val} = m.data;
    return {
      type: 'set',
      arrayId,
      arrayIndexId,
      key,
      epoch,
      val,
    };
  } else {
    const match = m.type.match(/^add\.(.+?)$/);
    if (match) {
      const arrayId = match[1];
      const {arrayIndexId, val} = m.data;
      return {
        type: 'add',
        arrayId,
        arrayIndexId,
        val,
      };
    } else {
      const match = m.type.match(/^remove\.(.+?)$/);
      if (match) {
        const arrayId = match[1];
        const {arrayIndexId} = m.data;
        return {
          type: 'remove',
          arrayId,
          arrayIndexId,
        };
      } else {
        if (m.type === 'rollback') {
          const {arrayId, arrayIndexId, key, oldEpoch, oldVal} = m.data;
          return {
            type: 'rollback',
            arrayId,
            arrayIndexId,
            key,
            oldEpoch,
            oldVal,
          };
        } else if (m.type === 'import') {
          return {
            type: 'import',
            crdtExport: m.data.crdtExport,
          };
        } else if (m.type === 'networkinit') {
          return {
            type: 'networkinit',
            playerIds: m.data.playerIds,
          };
        } else if (m.type === 'join') {
          return {
            type: 'join',
            playerId: m.data.playerId,
          };
        } else if (m.type === 'leave') {
          return {
            type: 'leave',
            playerId: m.data.playerId,
          };
        } else if (m.type === 'sync') {
          return {
            type: 'sync',
          };
        } else {
          console.warn('failed to parse', m);
          throw new Error('unrecognized message type: ' + m.type);
        }
      }
    }
  }
}

function serializeMessage(m) {
  const parsedMessage = parseMessage(m);
  const {type, arrayId, arrayIndexId} = parsedMessage;
  switch (type) {
    case 'import': {
      const {crdtExport} = parsedMessage;
      return zbencode({
        method: UPDATE_METHODS.IMPORT,
        args: [
          crdtExport,
        ],
      });
    }
    case 'sync': {
      return zbencode({
        method: UPDATE_METHODS.SYNC,
      });
    }
    case 'set': {
      const {key, epoch, val} = m.data;
      return zbencode({
        method: UPDATE_METHODS.SET,
        args: [
          arrayId,
          arrayIndexId,
          key,
          epoch,
          val,
        ],
      });
    }
    case 'add': {
      const {arrayIndexId, val, epoch} = m.data;
      return zbencode({
        method: UPDATE_METHODS.ADD,
        args: [
          arrayId,
          arrayIndexId,
          val,
          epoch,
        ],
      });
    }
    case 'remove': {
      const {arrayIndexId} = m.data;
      return zbencode({
        method: UPDATE_METHODS.REMOVE,
        args: [
          arrayId,
          arrayIndexId,
        ],
      });
    }
    case 'rollback': {
      const {arrayId, arrayIndexId, key, oldEpoch, oldVal} = m.data;
      return zbencode({
        method: UPDATE_METHODS.ROLLBACK,
        args: [
          arrayId,
          arrayIndexId,
          key,
          oldEpoch,
          oldVal,
        ],
      });
    }
    case 'networkinit': {
      const {playerIds} = m.data;
      return zbencode({
        method: UPDATE_METHODS.NETWORK_INIT,
        args: [
          playerIds,
        ],
      });
    }
    case 'join': {
      const {playerId} = m.data;
      return zbencode({
        method: UPDATE_METHODS.JOIN,
        args: [
          playerId,
        ],
      });
    }
    case 'leave': {
      const {playerId} = m.data;
      return zbencode({
        method: UPDATE_METHODS.LEAVE,
        args: [
          playerId,
        ],
      });
    }
    default: {
      console.warn('unrecognized message type', type);
      throw new Error('unrecognized message type: ' + type);
    }
  }
}

const createWs = (roomname, playerId) => {
  // let wss = document.location.protocol === 'http:' ? 'ws://' : 'wss://';
  let wss = 'wss://';
  let hostname = 'multiplayer.webaverse.workers.dev';

  // The local development server's WebSocket is provided at ws://localhost.
  const isDevelopment = location.hostname === 'local.webaverse.com';
  if (isDevelopment) {
    wss = 'ws://';
    hostname = `localhost:${MULTIPLAYER_PORT}`;
  }

  const ws = new WebSocket(`${wss}${hostname}/api/room/${roomname}/websocket?playerId=${playerId}`);
  return ws;
};

const makePromise = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
};

const zstringify = o => {
  let result = '';
  for (const k in o) {
    if (result) {
      result += '\n';
    }

    const v = o[k];
    if (v instanceof Float32Array) {
      result += `${JSON.stringify(k)}: Float32Array(${v.join(',')})`;
    } else {
      const s = JSON.stringify(v);
      if (s.length >= 20 && v instanceof Object && v !== null) {
        result += `${JSON.stringify(k)}:\n${zstringify(v)}`;
      } else {
        result += `${JSON.stringify(k)}: ${s}`;
      }
    }
  }
  return result;
};

export {
  alignN,
  align4,
  parseUpdateObject,
  makeId,
  parseMessage,
  serializeMessage,
  createWs,
  makePromise,
  zstringify,
};
