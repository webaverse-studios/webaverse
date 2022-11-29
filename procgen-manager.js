/* this file implements the top-level world procedural generation context.
it starts the workers and routes calls for the procgen system. */

import {murmurhash3} from './procgen/procgen.js';
import {PGWorkerManager} from './pg-worker-manager.js';
import {LodChunkTracker} from './lod.js';
import {defaultChunkSize} from './constants.js';

//

const localArray2D = Array(2);

//

const GenerateFlags = {
  terrain: 1 << 0,
  water: 1 << 1,
  vegetation: 1 << 2,
  rock: 1 << 3,
  grass: 1 << 4,
  poi: 1 << 5,
  heightfield: 1 << 6,
};
const _generateFlagsToInt = generateFlags => {
  let result = 0;
  generateFlags.terrain && (result |= GenerateFlags.terrain);
  generateFlags.water && (result |= GenerateFlags.water);
  generateFlags.vegetation && (result |= GenerateFlags.vegetation);
  generateFlags.rock && (result |= GenerateFlags.rock);
  generateFlags.grass && (result |= GenerateFlags.grass);
  generateFlags.poi && (result |= GenerateFlags.poi);
  generateFlags.heightfield && (result |= GenerateFlags.heightfield);
  return result;
};

//

class ProcGenInstance {
  constructor(instance, {
    chunkSize,
  }) {
    this.chunkSize = chunkSize;

    const seed = typeof instance === 'string' ? murmurhash3(instance) : Math.floor(Math.random() * 0xFFFFFF);
    this.pgWorkerManager = new PGWorkerManager({
      chunkSize,
      seed,
      instance,
    });
  }

  setCamera(worldPosition, cameraPosition, cameraQuaternion, projectionMatrix) {
    this.pgWorkerManager.setCamera(worldPosition, cameraPosition, cameraQuaternion, projectionMatrix);
  }

  setClipRange(range) {
    this.pgWorkerManager.setClipRange(range);
  }

  async createLodChunkTracker(opts = {}) {
    await this.pgWorkerManager.waitForLoad();

    const opts2 = structuredClone(opts);
    const {chunkSize} = this;
    opts2.chunkSize = chunkSize;
    // opts2.range = range;
    opts2.pgWorkerManager = this.pgWorkerManager;

    const tracker = new LodChunkTracker(opts2);
    return tracker;
  }

  async generateChunk(
    position,
    lod,
    lodArray,
    generateFlags,
    numVegetationInstances,
    numRockInstances,
    numGrassInstances,
    numPoiInstances,
    {
      signal = null,
    } = {},
  ) {
    await this.pgWorkerManager.waitForLoad();

    const {chunkSize} = this;

    position.toArray(localArray2D);
    const generateFlagsInt = _generateFlagsToInt(generateFlags);
    const result = await this.pgWorkerManager.generateChunk(
      localArray2D,
      lod,
      lodArray,
      chunkSize,
      generateFlagsInt,
      numVegetationInstances,
      numRockInstances,
      numGrassInstances,
      numPoiInstances,
      {
        signal,
      },
    );
    return result;
  }

  async generateBarrier(
    position,
    minLod,
    maxLod,
    {
      signal = null,
    } = {},
  ) {
    await this.pgWorkerManager.waitForLoad();

    position.toArray(localArray2D);
    const result = await this.pgWorkerManager.generateBarrier(
      localArray2D,
      minLod,
      maxLod,
      {
        signal,
      },
    );
    return result;
  }

  async destroy() {
    await this.pgWorkerManager.destroy();
  }
}

export class ProcGenManager {
  constructor({
    chunkSize,
  } = {}) {
    this.instances = new Map();
    this.chunkSize = chunkSize;
  }

  getInstance(key) {
    let instance = this.instances.get(key);
    if (!instance) {
      const {chunkSize} = this;
      instance = new ProcGenInstance(key, {
        chunkSize,
      });
      this.instances.set(key, instance);
    }
    return instance;
  }

  deleteInstance(key) {
    let instance = this.instances.get(key);
    if (instance) {
      instance.destroy();
      this.instances.delete(key);
    }
  }

  getNodeHash(node) {
    return ((node.min.x & 0xFFF) << 20) |
      ((node.min.y & 0xFFF) << 8) |
      (node.lod & 0xFF);
  }
}
const procGenManager = new ProcGenManager({
  chunkSize: defaultChunkSize,
});
export default procGenManager;