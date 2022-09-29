import Module from './public/pg.module.js'
import {Allocator} from './geometry-util.js';
import {makePromise} from './util.js';

//

const cbs = new Map();

//

const w = {};

w.waitForLoad = Module.waitForLoad;

w.free = address => {
  Module._doFree(address);
};

w.initialize = () => {
  Module._initialize();
};
w.createInstance = (seed, chunkSize) => Module._createInstance(seed, chunkSize);
w.destroyInstance = instance => Module._destroyInstance(instance);

//

const _parseTrackerUpdate = bufferAddress => {
  const dataView = new DataView(Module.HEAPU8.buffer, bufferAddress);
  let index = 0;

  const _parseNode = () => {
    const min = new Int32Array(Module.HEAPU8.buffer, bufferAddress + index, 2).slice();
    index += Int32Array.BYTES_PER_ELEMENT * 2;
    
    const lod = dataView.getInt32(index, true);
    index += Int32Array.BYTES_PER_ELEMENT;

    const lodArray = new Int32Array(
      dataView.buffer,
      dataView.byteOffset + index,
      2
    );
    index += Int32Array.BYTES_PER_ELEMENT * 2;

    return {
      min,
      lod,
      lodArray,
    };
  };
  const _parseNodes = () => {
    const numNodes = dataView.getInt32(index, true);
    index += Int32Array.BYTES_PER_ELEMENT;

    const nodes = Array(numNodes);
    for (let i = 0; i < numNodes; i++) {
      nodes[i] = _parseNode();
    }
    return nodes;
  };

  const leafNodes = _parseNodes();
  const newDataRequests = _parseNodes();
  const keepDataRequests = _parseNodes();
  const cancelDataRequests = _parseNodes();

  return {
    leafNodes,
    newDataRequests,
    keepDataRequests,
    cancelDataRequests,
  };
};
w.createTracker = (inst, lod, lod1Range) => {
  const result = Module._createTracker(inst, lod, lod1Range);
  return result;
};
w.destroyTracker = (inst, tracker) => Module._destroyTracker(inst, tracker);
w.trackerUpdateAsync = async (inst, taskId, tracker, position, priority) => {
  const allocator = new Allocator(Module);

  const positionArray = allocator.alloc(Float32Array, 3);
  positionArray.set(position);

  Module._trackerUpdateAsync(
    inst,
    taskId,
    tracker,
    positionArray.byteOffset,
    priority,
  );
  const p = makePromise();
  cbs.set(taskId, p);

  allocator.freeAll();

  const outputBufferOffset = await p;
  const result = _parseTrackerUpdate(outputBufferOffset);
  return result;
};

//

w.setClipRange = function(inst, range) {
  Module._setClipRange(
    inst,
    range[0][0], range[0][1],
    range[1][0], range[1][1],
  );
};

//

const _parseChunkResult = (arrayBuffer, bufferAddress) => {
  const dataView = new DataView(arrayBuffer, bufferAddress);
  let index = 0;

  const _parseTerrainVertexBuffer = () => {
    const bufferAddress = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;

    const dataView2 = new DataView(arrayBuffer, bufferAddress);
    let index2 = 0;

    // positions
    const numPositions = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const positions = new Float32Array(arrayBuffer, bufferAddress + index2, numPositions * 3);
    index2 += Float32Array.BYTES_PER_ELEMENT * numPositions * 3;
  
    // normals
    const numNormals = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const normals = new Float32Array(arrayBuffer, bufferAddress + index2, numNormals * 3);
    index2 += Float32Array.BYTES_PER_ELEMENT * numNormals * 3;
  
    // biomes
    const numBiomes = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const biomes = new Int32Array(arrayBuffer, bufferAddress + index2, numBiomes * 4);
    index2 += Int32Array.BYTES_PER_ELEMENT * numBiomes * 4;
  
    // biomes weights
    const numBiomesWeights = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const biomesWeights = new Float32Array(arrayBuffer, bufferAddress + index2, numBiomesWeights * 4);
    index2 += Float32Array.BYTES_PER_ELEMENT * numBiomesWeights * 4;
  
    // biomes uvs 1
    const numBiomesUvs1 = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const biomesUvs1 = new Float32Array(arrayBuffer, bufferAddress + index2, numBiomesUvs1 * 4);
    index2 += Float32Array.BYTES_PER_ELEMENT * numBiomesUvs1 * 4;
  
    // biomes uvs 2
    const numBiomesUvs2 = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const biomesUvs2 = new Float32Array(arrayBuffer, bufferAddress + index2, numBiomesUvs2 * 4);
    index2 += Float32Array.BYTES_PER_ELEMENT * numBiomesUvs2 * 4;

    // seeds
    // const numSeeds = dataView2.getUint32(index2, true);
    // index2 += Uint32Array.BYTES_PER_ELEMENT;
    // const seeds = new Float32Array(arrayBuffer, bufferAddress + index2, numSeeds);
    // index2 += Float32Array.BYTES_PER_ELEMENT * numSeeds;
  
    // indices
    const numIndices = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const indices = new Uint32Array(arrayBuffer, bufferAddress + index2, numIndices);
    index2 += Uint32Array.BYTES_PER_ELEMENT * numIndices;
  
    // skylights
    // const numSkylights = dataView2.getUint32(index2, true);
    // index2 += Uint32Array.BYTES_PER_ELEMENT;
    // const skylights = new Uint8Array(arrayBuffer, bufferAddress + index2, numSkylights);
    // index2 += Uint8Array.BYTES_PER_ELEMENT * numSkylights;
    // index2 = align4(index2);
  
    // // aos
    // const numAos = dataView2.getUint32(index2, true);
    // index2 += Uint32Array.BYTES_PER_ELEMENT;
    // const aos = new Uint8Array(arrayBuffer, bufferAddress + index2, numAos);
    // index2 += Uint8Array.BYTES_PER_ELEMENT * numAos;
    // index2 = align4(index2);
  
    // const numPeeks = dataView2.getUint32(index2, true);
    // index2 += Uint32Array.BYTES_PER_ELEMENT;
    // const peeks = new Uint8Array(arrayBuffer, bufferAddress + index2, numPeeks);
    // index2 += Uint32Array.BYTES_PER_ELEMENT * numPeeks;
  
    return {
      bufferAddress,
      positions,
      normals,
      biomes,
      biomesWeights,
      biomesUvs1,
      biomesUvs2,
      // seeds,
      indices,
      // skylights,
      // aos,
      // peeks,
    };
  };
  const _parseWaterVertexBuffer = () => {
    const bufferAddress = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;

    const dataView2 = new DataView(arrayBuffer, bufferAddress);
    let index2 = 0;

    // positions
    const numPositions = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const positions = new Float32Array(arrayBuffer, bufferAddress + index2, numPositions * 3);
    index2 += Float32Array.BYTES_PER_ELEMENT * numPositions * 3;
  
    // normals
    const numNormals = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const normals = new Float32Array(arrayBuffer, bufferAddress + index2, numNormals * 3);
    index2 += Float32Array.BYTES_PER_ELEMENT * numNormals * 3;
  
    // factors
    const numFactors = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const factors = new Float32Array(arrayBuffer, bufferAddress + index2, numFactors);
    index2 += Int32Array.BYTES_PER_ELEMENT * numFactors;
  
    // indices
    const numIndices = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const indices = new Uint32Array(arrayBuffer, bufferAddress + index2, numIndices);
    index2 += Uint32Array.BYTES_PER_ELEMENT * numIndices;
  
    return {
      bufferAddress,
      positions,
      normals,
      factors,
      indices,
    };
  };
  const _parsePQIInstances = () => {
    const bufferAddress = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;

    const dataView2 = new DataView(arrayBuffer, bufferAddress);
    let index2 = 0;
    
    const numInstances = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    
    const instances = Array(numInstances);
    for (let i = 0; i < numInstances; i++) {
      const instanceId = dataView2.getInt32(index2, true);
      index2 += Int32Array.BYTES_PER_ELEMENT;
  
      const psSize = dataView2.getUint32(index2, true);
      index2 += Uint32Array.BYTES_PER_ELEMENT;
      const ps = new Float32Array(dataView2.buffer, dataView2.byteOffset + index2, psSize);
      index2 += psSize * Float32Array.BYTES_PER_ELEMENT;
  
      const qsSize = dataView2.getUint32(index2, true);
      index2 += Uint32Array.BYTES_PER_ELEMENT;
      const qs = new Float32Array(dataView2.buffer, dataView2.byteOffset + index2, qsSize);
      index2 += qsSize * Float32Array.BYTES_PER_ELEMENT;
  
      instances[i] = {
        instanceId,
        ps,
        qs,
      };
    }
  
    return {
      bufferAddress,
      instances,
    };
  };
  const _parsePIInstances = () => {
    const bufferAddress = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;

    const dataView2 = new DataView(arrayBuffer, bufferAddress);
    let index2 = 0;
    
    const psSize = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const ps = new Float32Array(dataView2.buffer, dataView2.byteOffset + index2, psSize);
    index2 += psSize * Float32Array.BYTES_PER_ELEMENT;

    const instancesSize = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const instances = new Int32Array(dataView2.buffer, dataView2.byteOffset + index2, instancesSize);
    index2 += instancesSize * Int32Array.BYTES_PER_ELEMENT;
  
    return {
      bufferAddress,
      ps,
      instances,
    };
  };

  const terrainGeometry = _parseTerrainVertexBuffer();
  const waterGeometry = _parseWaterVertexBuffer();
  const vegetationInstances = _parsePQIInstances();
  const grassInstances = _parsePQIInstances();
  const poiInstances = _parsePIInstances();

  return {
    bufferAddress,
    terrainGeometry,
    waterGeometry,
    vegetationInstances,
    grassInstances,
    poiInstances,
  };
};
w.createChunkMeshAsync = async (
  inst,
  taskId,
  x, z,
  lod,
  lodArray,
  generateFlagsInt,
  numVegetationInstances,
  numGrassInstances,
  numPoiInstances,
) => {
  const allocator = new Allocator(Module);

  const lodArray2 = allocator.alloc(Int32Array, 2);
  lodArray2.set(lodArray);

  Module._createChunkMeshAsync(
    inst,
    taskId,
    x, z,
    lod,
    lodArray2.byteOffset,
    generateFlagsInt,
    numVegetationInstances,
    numGrassInstances,
    numPoiInstances,
  );
  const p = makePromise();
  cbs.set(taskId, p);

  allocator.freeAll();

  const outputBufferOffset = await p;

  if (outputBufferOffset) {
    const result = _parseChunkResult(
      Module.HEAP8.buffer,
      Module.HEAP8.byteOffset + outputBufferOffset
    );
    return result;
  } else {
    return null;
  }
};

//

const _parseBarrierResult = (arrayBuffer, bufferAddress) => {
  const dataView = new DataView(arrayBuffer, bufferAddress);
  let index = 0;

  const _parseBarrierVertexBuffer = () => {
    const bufferAddress = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;

    const dataView2 = new DataView(arrayBuffer, bufferAddress);
    let index2 = 0;

    // positions
    const numPositions = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const positions = new Float32Array(arrayBuffer, bufferAddress + index2, numPositions * 3);
    index2 += Float32Array.BYTES_PER_ELEMENT * numPositions * 3;
  
    // normals
    const numNormals = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const normals = new Float32Array(arrayBuffer, bufferAddress + index2, numNormals * 3);
    index2 += Float32Array.BYTES_PER_ELEMENT * numNormals * 3;
  
    // uvs
    const numUvs = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const uvs = new Float32Array(arrayBuffer, bufferAddress + index2, numUvs * 2);
    index2 += Float32Array.BYTES_PER_ELEMENT * numUvs * 2;

    // positions2D
    const numPositions2D = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const positions2D = new Int32Array(arrayBuffer, bufferAddress + index2, numPositions2D * 2);
    index2 += Int32Array.BYTES_PER_ELEMENT * numPositions2D * 2;
  
    // indices
    const numIndices = dataView2.getUint32(index2, true);
    index2 += Uint32Array.BYTES_PER_ELEMENT;
    const indices = new Uint32Array(arrayBuffer, bufferAddress + index2, numIndices);
    index2 += Uint32Array.BYTES_PER_ELEMENT * numIndices;
  
    return {
      bufferAddress,
      positions,
      normals,
      uvs,
      positions2D,
      indices,
    };
  };

  const barrierGeometry = _parseBarrierVertexBuffer();

  return {
    bufferAddress,
    barrierGeometry,
  };
};
w.createBarrierMeshAsync = async (
  inst,
  taskId,
  x, z,
  minLod,
  maxLod,
) => {
  Module._createBarrierMeshAsync(
    inst,
    taskId,
    x, z,
    minLod,
    maxLod
  );
  const p = makePromise();
  cbs.set(taskId, p);

  const outputBufferOffset = await p;

  if (outputBufferOffset) {
    const result = _parseBarrierResult(
      Module.HEAP8.buffer,
      Module.HEAP8.byteOffset + outputBufferOffset
    );
    return result;
  } else {
    return null;
  }
};

//

w.setCamera = (
  inst,
  worldPosition,
  cameraPosition,
  cameraQuaternion,
  projectionMatrix
) => {
  const allocator = new Allocator(Module);

  const worldPositionArray = allocator.alloc(Float32Array, 3);
  worldPositionArray.set(worldPosition);

  const cameraPositionArray = allocator.alloc(Float32Array, 3);
  cameraPositionArray.set(cameraPosition);

  const cameraQuaternionArray = allocator.alloc(Float32Array, 4);
  cameraQuaternionArray.set(cameraQuaternion);

  const projectionMatrixArray = allocator.alloc(Float32Array, 16);
  projectionMatrixArray.set(projectionMatrix);

  Module._setCamera(
    inst,
    worldPositionArray.byteOffset,
    cameraPositionArray.byteOffset,
    cameraQuaternionArray.byteOffset,
    projectionMatrixArray.byteOffset
  );

  allocator.freeAll();
};

//

w.cancelTask = async (inst, taskId) => {
  Module._cancelTask(inst, taskId);
};

globalThis.handleResult = (id, result) => {
  const p = cbs.get(id);
  if (p) {
    cbs.delete(id);
    p.accept(result);
  } else {
    console.warn('failed to find promise for id', id, result);
  }
};

export default w;