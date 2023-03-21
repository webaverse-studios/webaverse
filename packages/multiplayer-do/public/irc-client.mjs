import {zbencode} from './encoding.mjs';
import {UPDATE_METHODS} from './update-types.js';
import {parseUpdateObject, makeId} from './util.mjs';

export class NetworkedIrcClient extends EventTarget {
  constructor(playerId = makeId()) {
    super();

    this.playerId = playerId;
    this.playerIds = [];

    this.ws = null;
  }

  static handlesMethod(method) {
    return [
      UPDATE_METHODS.NETWORK_INIT,
      UPDATE_METHODS.JOIN,
      UPDATE_METHODS.LEAVE,
      UPDATE_METHODS.REGISTER,
      UPDATE_METHODS.CHAT,
    ].includes(method);
  }

  async connect(ws) {
    this.ws = ws;

    await new Promise((resolve, reject) => {
      resolve = (resolve => () => {
        resolve();
        _cleanup();
      })(resolve);
      reject = (reject => () => {
        reject();
        _cleanup();
      })(reject);

      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);

      const _cleanup = () => {
        this.ws.removeEventListener('open', resolve);
        this.ws.removeEventListener('error', reject);
      };
    });

    const _waitForInitialImport = async () => {
      await new Promise((resolve, reject) => {
        const initialMessage = e => {
          // console.log('got message', e.data);
          if (e.data instanceof ArrayBuffer && e.data.byteLength > 0) {
            const updateBuffer = e.data;
            const uint8Array = new Uint8Array(updateBuffer);
            const updateObject = parseUpdateObject(uint8Array);

            const {method/*, args */} = updateObject;
            if (method === UPDATE_METHODS.NETWORK_INIT) {
              this.handleUpdateObject(updateObject);

              resolve();

              this.ws.removeEventListener('message', initialMessage);
            }
          }
        };
        this.ws.addEventListener('message', initialMessage);
      });
    };
    await _waitForInitialImport();

    // console.log('irc listen');
    this.ws.addEventListener('message', e => {
      // if some other listener hasn't consumed the message already
      if (e?.data?.byteLength > 0) {
        const updateBuffer = e.data;
        // console.log('irc data', e.data);
        const uint8Array = new Uint8Array(updateBuffer);
        const updateObject = parseUpdateObject(uint8Array);

        const {method/*, args */} = updateObject;
        if (NetworkedIrcClient.handlesMethod(method)) {
          this.handleUpdateObject(updateObject);
        }
      } else {
        // debugger;
      }
    });
  }

  handleUpdateObject(updateObject) {
    const {method, args} = updateObject;
    // console.log('got irc event', {method, args});
    if (method === UPDATE_METHODS.NETWORK_INIT) {
      const [playerIds] = args;
      this.playerIds = playerIds;

      for (let i = 0; i < playerIds.length; i++) {
        const playerId = playerIds[i];
        // console.log('dispatch join', playerId);
        this.dispatchEvent(new MessageEvent('join', {
          data: {
            playerId,
          },
        }));
      }
    } else if (method === UPDATE_METHODS.CHAT) {
      // console.log('got irc chat', {method, args});
      const [playerId, message] = args;
      const chatMessage = new MessageEvent('chat', {
        data: {
          playerId,
          message,
        },
      });
      this.dispatchEvent(chatMessage);
    } else if (method === UPDATE_METHODS.JOIN) {
      const [playerId] = args;
      this.playerIds.push(playerId);
      this.dispatchEvent(new MessageEvent('join', {
        data: {
          playerId,
        },
      }));
    } else if (method === UPDATE_METHODS.LEAVE) {
      const [playerId] = args;
      const index = this.playerIds.indexOf(playerId);
      this.playerIds.splice(index, 1);
      this.dispatchEvent(new MessageEvent('leave', {
        data: {
          playerId,
        },
      }));
    } else if (method === UPDATE_METHODS.REGISTER) {
      const [playerId] = args;
      const index = this.playerIds.indexOf(playerId);
      this.playerIds.splice(index, 1);
      this.dispatchEvent(new MessageEvent('register', {
        data: {
          playerId,
        },
      }));
    } else {
      console.warn('unhandled irc method', {method, args});
    }
  }

  sendRegisterMessage() {
    const buffer = zbencode({
      method: UPDATE_METHODS.REGISTER,
      args: [
        this.playerId,
      ],
    });
    this.ws.send(buffer);
  }

  sendChatMessage(message) {
    const buffer = zbencode({
      method: UPDATE_METHODS.CHAT,
      args: [
        this.playerId,
        message,
      ],
    });
    this.ws.send(buffer);
  }
}
