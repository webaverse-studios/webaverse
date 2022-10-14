import EngineWorker from './engine-worker.js?worker';
import {getRandomString} from '../util.js';
// import {inappPreviewHost} from '../constants.js';

class OffscreenEngineProxy {
  constructor() {
    this.worker = null;
    this.port = null;

    this.loadPromise = null;
  }
  async waitForLoad() {
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        const worker = new EngineWorker();
        this.worker = worker;
        /* const iframe = document.createElement('iframe');
        iframe.width = '0px';
        iframe.height = '0px';
        iframe.style.cssText = `\
          border: 0;
        `; */
    
        // this.live = true;
    
        const messageChannel = new MessageChannel();
        const {port1, port2} = messageChannel;
    
        /* const iframeLoadPromise = new Promise((resolve, reject) => {
          iframe.onload = () => {
            resolve();
            iframe.onload = null;
            iframe.onerror = null;
          };
          iframe.onerror = reject;
        }); */
  
        // iframe.allow = 'cross-origin-isolated';
        // iframe.src = `${inappPreviewHost}/engine.html`;
        // document.body.appendChild(iframe);
  
        // await iframeLoadPromise;
  
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
  
        return port1;
      })();
    }
    const port = await this.loadPromise;
    this.port = port;
    return port;
  }
  async request(funcName, args = [], {
    signal = null,
  } = {}) {
    await this.waitForLoad();

    const id = getRandomString();
    const _postMessage = () => {
      try {
        this.port.postMessage({
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
      this.port.addEventListener('message', message);
      cleanups.push(() => {
        this.port.removeEventListener('message', message);
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
  destroy() {
    // this.live = false;
    
    /* if (this.iframe) {
      this.iframe.parentElement.removeChild(this.iframe);
      this.iframe = null;
    } */
    if (this.port) {
      this.port.close();
      this.port = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export {
  OffscreenEngineProxy,
};
