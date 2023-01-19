import EngineWorker from './engine-worker.js?worker';
import {getRandomString} from '../util.js';

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