import TerrainWorker from './terrain-worker.js?worker';

class TerrainWorkerManager {
  constructor() {
    this.worker = null;
    this.loadPromise = null;

    // trigger load
    this.waitForLoad();
  }

  waitForLoad() {
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        const worker = new TerrainWorker();
        this.worker = worker;
      })();
    }
    return this.loadPromise;
  }
}

const terrainWorkerManager = new TerrainWorkerManager();
export default terrainWorkerManager;