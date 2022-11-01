import PgWorker from './pg-worker.js?worker';
import {abortError} from './lock-manager.js';

//

const localArray3D = Array(3);
const localArray3D2 = Array(3);
const localArray4D = Array(4);
const localArray16D = Array(16);

//

const TASK_PRIORITIES = {
  tracker: -10,
  splat: -1,
};

//

let taskIds = 0;

//

export class PGWorkerManager {
  constructor({
    chunkSize,
    seed,
    instance,
  } = {}) {
    this.chunkSize = chunkSize;
    this.seed = seed;
    this.instance = instance;

    this.worker = null;
    this.loadPromise = null;

    // trigger load
    this.waitForLoad();
  }
  waitForLoad() {
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        /* const worker = new Worker(workerUrl, {
          type: 'module',
        }); */
        const worker = new PgWorker();
        const cbs = new Map();
        worker.onmessage = (e) => {
          const {taskId} = e.data;
          const cb = cbs.get(taskId);
          if (cb) {
            cbs.delete(taskId);
            cb(e.data);
          } else {
            // console.warn('dropped canceled message', e.data);
            // debugger;
          }
        };
        worker.onerror = (err) => {
          console.log('pg worker load error', err);
        };
        worker.request = (method, args, {signal} = {}) => {
          return new Promise((resolve, reject) => {
            const {instance} = this;
            const taskId = ++taskIds;

            const onabort = e => {
              worker.request('cancelTask', {
                taskId,
              });

              reject(abortError);
              cbs.delete(taskId);
            };
            signal && signal.addEventListener('abort', onabort);

            cbs.set(taskId, (data) => {
              signal && signal.removeEventListener('abort', onabort);

              const {error, result} = data;
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            });
            worker.postMessage({
              method,
              args,
              instance,
              taskId,
            });
          });
        };

        // initialize
        // note: deliberately don't wait for this; let it start in the background
        await Promise.all([
          worker.request('initialize'),
          worker.request('ensureInstance', {
            instance: this.instance,
            seed: this.seed,
            chunkSize: this.chunkSize,
          }),
        ]);

        this.worker = worker;
      })();
    }
    return this.loadPromise;
  }
  setCamera(worldPosition, cameraPosition, cameraQuaternion, projectionMatrix) {
    const worldPositionArray = worldPosition.toArray(localArray3D);
    const cameraPositionArray = cameraPosition.toArray(localArray3D2);
    const cameraQuaternionArray = cameraQuaternion.toArray(localArray4D);
    const projectionMatrixArray = projectionMatrix.toArray(localArray16D);

    this.worker.request('setCamera', {
      instance: this.instance,
      worldPosition: worldPositionArray,
      cameraPosition: cameraPositionArray,
      cameraQuaternion: cameraQuaternionArray,
      projectionMatrix: projectionMatrixArray,
    });
  }
  setClipRange(range) {
    const rangeArray = [range.min.toArray(), range.max.toArray()];
    
    this.worker.request('setClipRange', {
      instance: this.instance,
      range: rangeArray,
    });
  }

  async createTracker({signal} = {}) {
    const result = await this.worker.request('createTracker', {
      instance: this.instance,
    }, {signal});
    return result;
  }
  async destroyTracker(tracker, {signal} = {}) {
    const result = await this.worker.request('destroyTracker', {
      instance: this.instance,
      tracker,
    }, {signal});
    return result;
  }
  async trackerUpdate(tracker, position, minLod, maxLod, lod1Range, {signal} = {}) {
    const result = await this.worker.request('trackerUpdate', {
      instance: this.instance,
      tracker,
      position: position.toArray(),
      minLod,
      maxLod,
      lod1Range,
      priority: TASK_PRIORITIES.tracker,
    }, {signal});
    return result;
  }

  //

  async generateChunk(
    chunkPosition,
    lod,
    lodArray,
    chunkSize,
    generateFlagsInt,
    numVegetationInstances,
    numGrassInstances,
    numPoiInstances,
    {
      signal = null,
    } = {},
  ) {
    const result = await this.worker.request('generateChunk', {
      instance: this.instance,
      chunkPosition,
      lod,
      lodArray,
      chunkSize,
      generateFlagsInt,
      numVegetationInstances,
      numGrassInstances,
      numPoiInstances,
    }, {signal});
    // signal.throwIfAborted();
    return result;
  }
  async generateBarrier(
    chunkPosition,
    minLod,
    maxLod,
    {
      signal = null,
    } = {},
  ) {
    const result = await this.worker.request('generateBarrier', {
      instance: this.instance,
      chunkPosition,
      minLod,
      maxLod,
    }, {signal});
    // signal.throwIfAborted();
    return result;
  }
  async destroy() {
    await this.worker.request('destroyInstance', {instance: this.instance})
  }

  //

  /* async createMobSplat(x, z, lod, {signal} = {}) {
    const result = await this.worker.request('createMobSplat', {
      instance: this.instance,
      x,
      z,
      lod,
      priority: TASK_PRIORITIES.splat,
    }, {signal});
    return result;
  } */
}
