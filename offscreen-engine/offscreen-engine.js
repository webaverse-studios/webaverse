import EngineWorker from './engine-worker.js?worker';
import {getRandomString} from '../util.js';
import {zbencode, zbdecode} from 'zjs';

//

const rendererHost = `https://local-renderer.webaverse.com`;
const localhost = `https://local.webaverse.com`;

//

export const makeLocalWorker = () => {
  const worker = new LocalEngineWorker();

  const messageChannel = new MessageChannel();
  const {port1, port2} = messageChannel;
  worker.port1 = port1;
  worker.port2 = port2;
  const loadPromise = (async () => {
    worker.postMessage({
      method: 'initializeEngine',
      port: port2,
    }, [port2]);

    let resolveFn;
    const message = e => {
      const {method} = e.data;
      if (method === 'initialized') {
        port1.removeEventListener('message', message);
        resolveFn();
      }
    };
    port1.start();
    port1.addEventListener('message', message);
    await new Promise((resolve, reject) =>{
      resolveFn = resolve;
    });
  })();
  worker.waitForLoad = () => loadPromise;
  worker.destroy = () => {
    port1.close();
    worker.terminate();
  };

  return worker;
};
export const makeRemoteWorker = () => {
  return new RemoteEngineWorker();
};

//

class RemoteEngineWorker {
  constructor() {
    // nothing
  }
  async waitForLoad() {
    // nothing
  }
  async request(funcName, args = [], {
    signal = null,
  } = {}) {
    console.log('remote engine request', {
      funcName,
      args,
    });

    const u = new URL(`${rendererHost}/api`);
    const start_url = `${localhost}/engine.html`;
    u.searchParams.set('start_url', start_url);
    u.searchParams.set('funcName', funcName);
    // u.searchParams.set('args', JSON.stringify(args));
    // cache ?? u.searchParams.set('cache', cache);
    
    const body = zbencode(args);

    const res = await fetch(u, {
      method: 'POST',
      body,
    });
    // console.log('got res', res);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      // console.log('got uint8Array', uint8Array);
      try {
        const result = zbdecode(uint8Array);
        // console.log('got result', result);
        return result;
      } catch(err) {
        // console.warn(err);
        const textDecoder = new TextDecoder();
        const text = textDecoder.decode(uint8Array);
        console.warn('offscreen engine error', err, text);
      }
    } else {
      throw new Error('failed to fetch: ' + res.status);
    }
  }
  destroy() {
    // nothing
  }
}

//

class LocalEngineWorker {
  constructor() {
    this.worker = new EngineWorker();
  }
  postMessage() {
    return this.worker.postMessage.apply(this.worker, arguments);
  }
  async request(funcName, args = [], {
    signal = null,
  } = {}) {
    const {port1} = this;

    const id = getRandomString();
    const _postMessage = () => {
      try {
        port1.postMessage({
          method: 'callHandler',
          funcName,
          id,
          args,
        });
      } catch(err) {
        console.warn('post message error', err);
        throw err;
      }
    };
    _postMessage();
    const result = await new Promise((accept, reject) => {
      const cleanups = [];
      const _cleanup = () => {
        for (const cleanupFn of cleanups) {
          cleanupFn();
        }
      };

      const message = e => {
        const {method, id: localId} = e.data;
        if (method === 'response' && localId === id) {
          const {error, result} = e.data;
          if (!error) {
            accept(result);
          } else {
            reject(error);
          }
          _cleanup();
        }
      };
      port1.addEventListener('message', message);
      cleanups.push(() => {
        port1.removeEventListener('message', message);
      });

      if (signal) {
        const abort = () => {
          // XXX we can post the abort to the worker process to make it stop faster
          reject(signal.reason);
          _cleanup();
        };
        signal.addEventListener('abort', abort);
        cleanups.push(() => {
          signal.removeEventListener('abort', abort);
        });
      }
    });
    return result;
  }
}

//

class OffscreenEngineProxy {
  constructor() {
    this.worker = null;

    this.loadPromise = null;
  }

  async waitForLoad() {
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        const worker = makeLocalWorker();
        // const worker = makeRemoteWorker();
        this.worker = worker;
        return worker.port1;
      })();
    }
    return await this.loadPromise;
  }

  async request(funcName, args, opts) {
    await this.waitForLoad();
    return await this.worker.request(funcName, args, opts);
  }

  destroy() {
    if (this.worker) {
      this.worker.destroy();
      this.worker = null;
    }
  }
}

export {
  OffscreenEngineProxy,
};