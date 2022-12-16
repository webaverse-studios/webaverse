import Module from "./public/pg.module.js";
import {Allocator} from "./geometry-util.js";
import {makePromise} from "./util.js";

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
    const min = new Int32Array(
      Module.HEAPU8.buffer,
      bufferAddress + index,
      2,
    ).slice();
    index += Int32Array.BYTES_PER_ELEMENT * 2;

    const lod = dataView.getInt32(index, true);
    index += Int32Array.BYTES_PER_ELEMENT;

    const lodArray = new Int32Array(
      dataView.buffer,
      dataView.byteOffset + index,
      2,
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
    bufferAddress,
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
w.trackerUpdateAsync = async (
  inst,
  taskId,
  tracker,
  position,
  minLod,
  maxLod,
  lod1Range,
  priority,
) => {
  const allocator = new Allocator(Module);

  const positionArray = allocator.alloc(Float32Array, 3);
  positionArray.set(position);

  Module._trackerUpdateAsync(
    inst,
    taskId,
    tracker,
    positionArray.byteOffset,
    minLod,
    maxLod,
    lod1Range,
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

w.setClipRange = function (inst, range) {
  Module._setClipRange(
    inst,
    range[0][0],
    range[0][1],
    range[1][0],
    range[1][1],
  );
};

//
class BufferView {
  constructor(arrayBuffer, bufferAddress) {
    this.dataView = new DataView(arrayBuffer, bufferAddress);
    this.index = 0;
  }
}

const _parseChunkResult = (arrayBuffer, bufferAddress) => {
  const freeList = [];
  freeList.push(bufferAddress);

  const chunkResultBufferView = new BufferView(arrayBuffer, bufferAddress);

  const _parseTerrainVertexBuffer = bufferView => {
    const bufferAddress = bufferView.dataView.getUint32(bufferView.index, true);
    bufferView.index += Uint32Array.BYTES_PER_ELEMENT;

    freeList.push(bufferAddress);

    if (bufferAddress) {
      const bufferViewer = new BufferView(
        arrayBuffer,
        bufferAddress,
      );

      // positions
      const numPositions = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const positions = new Float32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numPositions * 3,
      );
      bufferViewer.index +=
        Float32Array.BYTES_PER_ELEMENT * numPositions * 3;

      // normals
      const numNormals = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const normals = new Float32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numNormals * 3,
      );
      bufferViewer.index +=
        Float32Array.BYTES_PER_ELEMENT * numNormals * 3;

      // biomes
      const numBiomes = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const biomes = new Int32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numBiomes * 4,
      );
      bufferViewer.index +=
        Int32Array.BYTES_PER_ELEMENT * numBiomes * 4;

      // biomes weights
      const numBiomesWeights = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const biomesWeights = new Float32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numBiomesWeights * 4,
      );
      bufferViewer.index +=
        Float32Array.BYTES_PER_ELEMENT * numBiomesWeights * 4;

      // biomes uvs 1
      const numBiomesUvs1 = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const biomesUvs1 = new Float32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numBiomesUvs1 * 4,
      );
      bufferViewer.index +=
        Float32Array.BYTES_PER_ELEMENT * numBiomesUvs1 * 4;

      // biomes uvs 2
      const numBiomesUvs2 = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const biomesUvs2 = new Float32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numBiomesUvs2 * 4,
      );
      bufferViewer.index +=
        Float32Array.BYTES_PER_ELEMENT * numBiomesUvs2 * 4;

      // materials
      const numMaterials = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const materials = new Int32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numMaterials * 4,
      );
      bufferViewer.index +=
        Int32Array.BYTES_PER_ELEMENT * numMaterials * 4;

      // materials weights
      const numMaterialsWeights = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const materialsWeights = new Float32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numMaterialsWeights * 4,
      );
      bufferViewer.index +=
        Float32Array.BYTES_PER_ELEMENT * numMaterialsWeights * 4;
      // seeds
      // const numSeeds = terrainVertexBufferView.dataView.getUint32(terrainVertexBufferView.index, true);
      // terrainVertexBufferView.index += Uint32Array.BYTES_PER_ELEMENT;
      // const seeds = new Float32Array(arrayBuffer, bufferAddress + terrainVertexBufferView.index, numSeeds);
      // terrainVertexBufferView.index += Float32Array.BYTES_PER_ELEMENT * numSeeds;

      // indices
      const numIndices = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const indices = new Uint32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numIndices,
      );
      bufferViewer.index +=
        Uint32Array.BYTES_PER_ELEMENT * numIndices;

      // skylights
      // const numSkylights = terrainVertexBufferView.dataView.getUint32(terrainVertexBufferView.index, true);
      // terrainVertexBufferView.index += Uint32Array.BYTES_PER_ELEMENT;
      // const skylights = new Uint8Array(arrayBuffer, bufferAddress + terrainVertexBufferView.index, numSkylights);
      // terrainVertexBufferView.index += Uint8Array.BYTES_PER_ELEMENT * numSkylights;
      // terrainVertexBufferView.index = align4(terrainVertexBufferView.index);

      // // aos
      // const numAos = terrainVertexBufferView.dataView.getUint32(terrainVertexBufferView.index, true);
      // terrainVertexBufferView.index += Uint32Array.BYTES_PER_ELEMENT;
      // const aos = new Uint8Array(arrayBuffer, bufferAddress + terrainVertexBufferView.index, numAos);
      // terrainVertexBufferView.index += Uint8Array.BYTES_PER_ELEMENT * numAos;
      // terrainVertexBufferView.index = align4(terrainVertexBufferView.index);

      // const numPeeks = terrainVertexBufferView.dataView.getUint32(terrainVertexBufferView.index, true);
      // terrainVertexBufferView.index += Uint32Array.BYTES_PER_ELEMENT;
      // const peeks = new Uint8Array(arrayBuffer, bufferAddress + terrainVertexBufferView.index, numPeeks);
      // terrainVertexBufferView.index += Uint32Array.BYTES_PER_ELEMENT * numPeeks;

      return {
        freeList,
        positions,
        normals,
        biomes,
        biomesWeights,
        biomesUvs1,
        biomesUvs2,
        materials,
        materialsWeights,
        // seeds,
        indices,
        // skylights,
        // aos,
        // peeks,
      };
    } else {
      return null;
    }
  };
  const _parseWaterVertexBuffer = bufferView => {
    const bufferAddress = bufferView.dataView.getUint32(bufferView.index, true);
    bufferView.index += Uint32Array.BYTES_PER_ELEMENT;
    freeList.push(bufferAddress);

    if (bufferAddress) {
      const bufferViewer = new BufferView(arrayBuffer, bufferAddress);

      // positions
      const numPositions = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const positions = new Float32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numPositions * 3,
      );
      bufferViewer.index += Float32Array.BYTES_PER_ELEMENT * numPositions * 3;

      // normals
      const numNormals = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const normals = new Float32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numNormals * 3,
      );
      bufferViewer.index += Float32Array.BYTES_PER_ELEMENT * numNormals * 3;

      // factors
      const numFactors = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const factors = new Float32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numFactors,
      );
      bufferViewer.index += Int32Array.BYTES_PER_ELEMENT * numFactors;

      // liquids
      const numLiquids = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const liquids = new Int32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numLiquids * 4,
      );
      bufferViewer.index +=
        Int32Array.BYTES_PER_ELEMENT * numLiquids * 4;

      // liquids weights
      const numLiquidsWeights = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const liquidsWeights = new Float32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numLiquidsWeights * 4,
      );
      bufferViewer.index +=
        Float32Array.BYTES_PER_ELEMENT * numLiquidsWeights * 4;

      // indices
      const numIndices = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const indices = new Uint32Array(
        arrayBuffer,
        bufferAddress + bufferViewer.index,
        numIndices,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT * numIndices;

      return {
        bufferAddress,
        positions,
        normals,
        factors,
        liquids,
        liquidsWeights,
        indices,
      };
    } else {
      return null;
    }
  };
  const _parsePQIInstances = bufferView => {
    const bufferAddress = bufferView.dataView.getUint32(bufferView.index, true);
    bufferView.index += Uint32Array.BYTES_PER_ELEMENT;
    freeList.push(bufferAddress);

    if (bufferAddress) {
      const bufferViewer = new BufferView(arrayBuffer, bufferAddress);
      const numInstances = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;

      const instances = Array(numInstances);
      for (let i = 0; i < numInstances; i++) {
        const instanceId = bufferViewer.dataView.getInt32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Int32Array.BYTES_PER_ELEMENT;

        const psSize = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const ps = new Float32Array(
          bufferViewer.dataView.buffer,
          bufferViewer.dataView.byteOffset + bufferViewer.index,
          psSize,
        );
        bufferViewer.index += psSize * Float32Array.BYTES_PER_ELEMENT;

        const qsSize = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const qs = new Float32Array(
          bufferViewer.dataView.buffer,
          bufferViewer.dataView.byteOffset + bufferViewer.index,
          qsSize,
        );
        bufferViewer.index += qsSize * Float32Array.BYTES_PER_ELEMENT;

        const scalesSize = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const scales = new Float32Array(
          bufferViewer.dataView.buffer,
          bufferViewer.dataView.byteOffset + bufferViewer.index,
          scalesSize,
        );
        bufferViewer.index += scalesSize * Float32Array.BYTES_PER_ELEMENT;

        instances[i] = {
          instanceId,
          ps,
          qs,
          scales
        };
      }

      return {
        bufferAddress,
        instances,
      };
    } else {
      return null;
    }
  };

  const _parseVegetationInstances = bufferView => {
    const bufferAddress = bufferView.dataView.getUint32(bufferView.index, true);
    bufferView.index += Uint32Array.BYTES_PER_ELEMENT;
    freeList.push(bufferAddress);

    if (bufferAddress) {
      const bufferViewer = new BufferView(arrayBuffer, bufferAddress);

      const numGeometries = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;

      const geometries = Array(numGeometries);
      for (let i = 0; i < numGeometries; i++) {
        const instances = _parsePQIInstances(bufferViewer);

        geometries[i] = {
          instances,
        };
      }

      return {
        bufferAddress,
        geometries,
      };
    } else {
      return null;
    }
  };

  const _parsePQMIInstances = bufferView => {
    const bufferAddress = bufferView.dataView.getUint32(bufferView.index, true);
    bufferView.index += Uint32Array.BYTES_PER_ELEMENT;
    freeList.push(bufferAddress);

    if (bufferAddress) {
      const bufferViewer = new BufferView(arrayBuffer, bufferAddress);

      const numInstances = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;

      const instances = Array(numInstances);
      for (let i = 0; i < numInstances; i++) {
        const instanceId = bufferViewer.dataView.getInt32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Int32Array.BYTES_PER_ELEMENT;

        const psSize = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const ps = new Float32Array(
          bufferViewer.dataView.buffer,
          bufferViewer.dataView.byteOffset + bufferViewer.index,
          psSize,
        );
        bufferViewer.index += psSize * Float32Array.BYTES_PER_ELEMENT;

        const qsSize = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const qs = new Float32Array(
          bufferViewer.dataView.buffer,
          bufferViewer.dataView.byteOffset + bufferViewer.index,
          qsSize,
        );
        bufferViewer.index += qsSize * Float32Array.BYTES_PER_ELEMENT;

        // materials
        const numMaterials = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const materials = new Float32Array(
          arrayBuffer,
          bufferAddress + bufferViewer.index,
          numMaterials * 4,
        );
        bufferViewer.index += Float32Array.BYTES_PER_ELEMENT * numMaterials * 4;

        const numMaterialsWeights = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const materialsWeights = new Float32Array(
          arrayBuffer,
          bufferAddress + bufferViewer.index,
          numMaterialsWeights * 4,
        );
        bufferViewer.index +=
          Float32Array.BYTES_PER_ELEMENT * numMaterialsWeights * 4;

        instances[i] = {
          instanceId,
          ps,
          qs,
          materials,
          materialsWeights,
        };
      }

      return {
        bufferAddress,
        instances,
      };
    } else {
      return null;
    }
  };

  const _parseGrassInstances = bufferView => {
    const bufferAddress = bufferView.dataView.getUint32(bufferView.index, true);
    bufferView.index += Uint32Array.BYTES_PER_ELEMENT;
    freeList.push(bufferAddress);

    if (bufferAddress) {
      const bufferViewer = new BufferView(arrayBuffer, bufferAddress);

      const numInstances = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;

      const instances = Array(numInstances);
      for (let i = 0; i < numInstances; i++) {
        const instanceId = bufferViewer.dataView.getInt32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Int32Array.BYTES_PER_ELEMENT;

        const psSize = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const ps = new Float32Array(
          bufferViewer.dataView.buffer,
          bufferViewer.dataView.byteOffset + bufferViewer.index,
          psSize,
        );
        bufferViewer.index += psSize * Float32Array.BYTES_PER_ELEMENT;

        const qsSize = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const qs = new Float32Array(
          bufferViewer.dataView.buffer,
          bufferViewer.dataView.byteOffset + bufferViewer.index,
          qsSize,
        );
        bufferViewer.index += qsSize * Float32Array.BYTES_PER_ELEMENT;

        const scalesSize = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const scales = new Float32Array(
          bufferViewer.dataView.buffer,
          bufferViewer.dataView.byteOffset + bufferViewer.index,
          scalesSize,
        );
        bufferViewer.index += scalesSize * Float32Array.BYTES_PER_ELEMENT;

        // materials
        const numMaterials = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const materials = new Float32Array(
          arrayBuffer,
          bufferAddress + bufferViewer.index,
          numMaterials * 4,
        );
        bufferViewer.index += Float32Array.BYTES_PER_ELEMENT * numMaterials * 4;

        const numMaterialsWeights = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const materialsWeights = new Float32Array(
          arrayBuffer,
          bufferAddress + bufferViewer.index,
          numMaterialsWeights * 4,
        );
        bufferViewer.index +=
          Float32Array.BYTES_PER_ELEMENT * numMaterialsWeights * 4;

        const numGrassProps = bufferViewer.dataView.getUint32(
          bufferViewer.index,
          true,
        );
        bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
        const grassProps = new Float32Array(
          arrayBuffer,
          bufferAddress + bufferViewer.index,
          numGrassProps * 4,
        );
        bufferViewer.index +=
          Float32Array.BYTES_PER_ELEMENT * numGrassProps * 4;

        instances[i] = {
          instanceId,
          ps,
          qs,
          scales,
          materials,
          materialsWeights,
          grassProps,
        };
      }

      return {
        bufferAddress,
        instances,
      };
    } else {
      return null;
    }
  };
  const _parsePIInstances = bufferView => {
    const bufferAddress = bufferView.dataView.getUint32(bufferView.index, true);
    bufferView.index += Uint32Array.BYTES_PER_ELEMENT;
    freeList.push(bufferAddress);

    if (bufferAddress) {
      const bufferViewer = new BufferView(arrayBuffer, bufferAddress);

      const psSize = bufferViewer.dataView.getUint32(bufferViewer.index, true);
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const ps = new Float32Array(
        bufferViewer.dataView.buffer,
        bufferViewer.dataView.byteOffset + bufferViewer.index,
        psSize,
      );
      bufferViewer.index += psSize * Float32Array.BYTES_PER_ELEMENT;

      const instancesSize = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;
      const instances = new Int32Array(
        bufferViewer.dataView.buffer,
        bufferViewer.dataView.byteOffset + bufferViewer.index,
        instancesSize,
      );
      bufferViewer.index += instancesSize * Int32Array.BYTES_PER_ELEMENT;

      return {
        bufferAddress,
        ps,
        instances,
      };
    } else {
      return null;
    }
  };
  const _parseHeightfields = bufferView => {
    const bufferAddress = bufferView.dataView.getUint32(bufferView.index, true);
    bufferView.index += Uint32Array.BYTES_PER_ELEMENT;
    freeList.push(bufferAddress);

    // console.log('buffer address', bufferAddress);

    if (bufferAddress) {
      const bufferViewer = new BufferView(arrayBuffer, bufferAddress);

      const numPixels = bufferViewer.dataView.getUint32(
        bufferViewer.index,
        true,
      );
      bufferViewer.index += Uint32Array.BYTES_PER_ELEMENT;

      // console.log('num pixels', numPixels);

      const pixels = new Float32Array(
        bufferViewer.dataView.buffer,
        bufferViewer.dataView.byteOffset + bufferViewer.index,
        numPixels * 4,
      );
      bufferViewer.index += numPixels * 4 * Float32Array.BYTES_PER_ELEMENT;

      return {
        bufferAddress,
        pixels,
      };
    } else {
      return null;
    }
  };

  const terrainGeometry = _parseTerrainVertexBuffer(chunkResultBufferView);
  const waterGeometry = _parseWaterVertexBuffer(chunkResultBufferView);
  // const treeInstances = _parsePQIInstances(chunkResultBufferView);
  const treeInstances = _parseVegetationInstances(chunkResultBufferView);
  const flowerInstances = _parseVegetationInstances(chunkResultBufferView);
  const bushInstances = _parsePQIInstances(chunkResultBufferView);
  const rockInstances = _parsePQIInstances(chunkResultBufferView);
  const stoneInstances = _parsePQIInstances(chunkResultBufferView);
  const grassInstances = _parseGrassInstances(chunkResultBufferView);
  const poiInstances = _parsePIInstances(chunkResultBufferView);
  const heightfields = _parseHeightfields(chunkResultBufferView);

  return {
    freeList,
    terrainGeometry,
    waterGeometry,
    treeInstances,
    flowerInstances,
    bushInstances,
    rockInstances,
    stoneInstances,
    grassInstances,
    poiInstances,
    heightfields,
  };
};

w.createChunkMeshAsync = async (
  inst,
  taskId,
  x,
  z,
  lod,
  lodArray,
  generateFlagsInt,
  numVegetationInstances,
  numRockInstances,
  numGrassInstances,
  numPoiInstances,
) => {
  const allocator = new Allocator(Module);

  const lodArray2 = allocator.alloc(Int32Array, 2);
  lodArray2.set(lodArray);

  Module._createChunkMeshAsync(
    inst,
    taskId,
    x,
    z,
    lod,
    lodArray2.byteOffset,
    generateFlagsInt,
    numVegetationInstances,
    numRockInstances,
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
      Module.HEAP8.byteOffset + outputBufferOffset,
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
    // positions
    const numPositions = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;
    const positions = new Float32Array(
      arrayBuffer,
      bufferAddress + index,
      numPositions * 3,
    );
    index += Float32Array.BYTES_PER_ELEMENT * numPositions * 3;

    // normals
    const numNormals = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;
    const normals = new Float32Array(
      arrayBuffer,
      bufferAddress + index,
      numNormals * 3,
    );
    index += Float32Array.BYTES_PER_ELEMENT * numNormals * 3;

    // uvs
    const numUvs = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;
    const uvs = new Float32Array(
      arrayBuffer,
      bufferAddress + index,
      numUvs * 2,
    );
    index += Float32Array.BYTES_PER_ELEMENT * numUvs * 2;

    // positions2D
    const numPositions2D = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;
    const positions2D = new Int32Array(
      arrayBuffer,
      bufferAddress + index,
      numPositions2D * 2,
    );
    index += Int32Array.BYTES_PER_ELEMENT * numPositions2D * 2;

    // indices
    const numIndices = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;
    const indices = new Uint32Array(
      arrayBuffer,
      bufferAddress + index,
      numIndices,
    );
    index += Uint32Array.BYTES_PER_ELEMENT * numIndices;

    return {
      positions,
      normals,
      uvs,
      positions2D,
      indices,
    };
  };

  const _parseLeafNodes = () => {
    const numLeafNodes = dataView.getUint32(index, true);
    index += Uint32Array.BYTES_PER_ELEMENT;

    const leafNodes = Array(numLeafNodes);
    for (let i = 0; i < numLeafNodes; i++) {
      const min = new Int32Array(arrayBuffer, bufferAddress + index, 2);
      index += Int32Array.BYTES_PER_ELEMENT * 2;

      const lod = dataView.getInt32(index, true);
      index += Int32Array.BYTES_PER_ELEMENT;

      leafNodes[i] = {
        min,
        lod,
      };
    }

    const leafNodesMin = new Int32Array(arrayBuffer, bufferAddress + index, 2);
    index += Int32Array.BYTES_PER_ELEMENT * 2;

    const leafNodesMax = new Int32Array(arrayBuffer, bufferAddress + index, 2);
    index += Int32Array.BYTES_PER_ELEMENT * 2;

    const w = leafNodesMax[0] - leafNodesMin[0];
    const h = leafNodesMax[1] - leafNodesMin[1];

    const leafNodesIndex = new Int32Array(
      arrayBuffer,
      bufferAddress + index,
      w * h,
    );
    index += Int32Array.BYTES_PER_ELEMENT * w * h;

    return {
      leafNodes,
      leafNodesMin,
      leafNodesMax,
      leafNodesIndex,
    };
  };

  const barrierGeometry = _parseBarrierVertexBuffer();
  const {leafNodes, leafNodesMin, leafNodesMax, leafNodesIndex} =
    _parseLeafNodes();

  return {
    bufferAddress,
    barrierGeometry,
    leafNodes,
    leafNodesMin,
    leafNodesMax,
    leafNodesIndex,
  };
};
w.createBarrierMeshAsync = async (inst, taskId, x, z, minLod, maxLod) => {
  Module._createBarrierMeshAsync(inst, taskId, x, z, minLod, maxLod);
  const p = makePromise();
  cbs.set(taskId, p);

  const outputBufferOffset = await p;

  if (outputBufferOffset) {
    const result = _parseBarrierResult(
      Module.HEAP8.buffer,
      Module.HEAP8.byteOffset + outputBufferOffset,
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
  projectionMatrix,
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
    projectionMatrixArray.byteOffset,
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
    console.warn("failed to find promise for id", id, result);
  }
};

export default w;