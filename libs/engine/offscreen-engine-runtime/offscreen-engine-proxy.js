import {
  makeLocalWorker,
} from './local-engine-worker.js';

//

export class OffscreenEngineProxy {
  constructor() {
    this.worker = null;

    this.loadPromise = null;
  }

  async waitForLoad() {
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        const worker = makeLocalWorker();
        
        // const startUrl = new URL('/engine.html', location.href);
        // const worker = makeRemoteWorker(startUrl);

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