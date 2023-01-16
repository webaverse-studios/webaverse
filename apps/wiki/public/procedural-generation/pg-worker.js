// import * as THREE from 'three';
// import {defaultChunkSize} from './constants.js';
import pg from './pg-binding.js';
import {makePromise} from '../utils/async-utils.js';

//

// const chunkSize = defaultChunkSize;

//

const _cloneChunkResult = chunkResult => {
  const {
    terrainGeometry,
    waterGeometry,
    vegetationInstances,
    grassInstances,
    poiInstances,
    heightfields,
  } = chunkResult;

  const _getTerrainGeometrySize = () => {
    if (terrainGeometry) {
      let size = terrainGeometry.positions.length * terrainGeometry.positions.constructor.BYTES_PER_ELEMENT +
        terrainGeometry.normals.length * terrainGeometry.normals.constructor.BYTES_PER_ELEMENT +
        terrainGeometry.biomesWeights.length * terrainGeometry.biomesWeights.constructor.BYTES_PER_ELEMENT +
        terrainGeometry.biomesUvs1.length * terrainGeometry.biomesUvs1.constructor.BYTES_PER_ELEMENT +
        terrainGeometry.biomesUvs2.length * terrainGeometry.biomesUvs2.constructor.BYTES_PER_ELEMENT +
        terrainGeometry.indices.length * terrainGeometry.indices.constructor.BYTES_PER_ELEMENT;
      return size;
    } else {
      return 0;
    }
  };
  const _getWaterGeometrySize = () => {
    if (waterGeometry) {
      let size = waterGeometry.positions.length * waterGeometry.positions.constructor.BYTES_PER_ELEMENT +
        waterGeometry.normals.length * waterGeometry.normals.constructor.BYTES_PER_ELEMENT +
        waterGeometry.factors.length * waterGeometry.factors.constructor.BYTES_PER_ELEMENT +
        waterGeometry.indices.length * waterGeometry.indices.constructor.BYTES_PER_ELEMENT;
      return size;
    } else {
      return 0;
    }
  };
  /* const _getBarrierGeometrySize = () => {
    if (barrierGeometry) {
      let size = barrierGeometry.positions.length * barrierGeometry.positions.constructor.BYTES_PER_ELEMENT +
        barrierGeometry.normals.length * barrierGeometry.normals.constructor.BYTES_PER_ELEMENT +
        barrierGeometry.uvs.length * barrierGeometry.uvs.constructor.BYTES_PER_ELEMENT +
        barrierGeometry.positions2D.length * barrierGeometry.positions2D.constructor.BYTES_PER_ELEMENT +
        barrierGeometry.indices.length * barrierGeometry.indices.constructor.BYTES_PER_ELEMENT;
      return size;
    } else {
      return 0;
    }
  }; */
  const _getPQIInstancesSize = instancesResult => {
    if (instancesResult) {
      const {instances} = instancesResult;
      let size = 0;
      for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];
        const {ps, qs} = instance;
        size += ps.length * ps.constructor.BYTES_PER_ELEMENT;
        size += qs.length * qs.constructor.BYTES_PER_ELEMENT;
      }
      return size;
    } else {
      return 0;
    }
  };
  const _getPIInstancesSize = instancesResult => {
    if (instancesResult) {
      const {ps, instances} = instancesResult;
      let size =
        ps.length * ps.constructor.BYTES_PER_ELEMENT +
        instances.length * instances.constructor.BYTES_PER_ELEMENT;
      return size;
    } else {
      return 0;
    }
  };
  const _getHeightfieldsSize = () => {
    if (heightfields) {
      let size = heightfields.pixels.length * heightfields.pixels.constructor.BYTES_PER_ELEMENT;
      return size;
    } else {
      return 0;
    }
  };

  const terrainGeometrySize = _getTerrainGeometrySize();
  const waterGeometrySize = _getWaterGeometrySize();
  // const barrierGeometrySize = _getBarrierGeometrySize();
  const vegetationInstancesSize = _getPQIInstancesSize(vegetationInstances);
  const grassInstancesSize = _getPQIInstancesSize(grassInstances);
  const poiInstancesSize = _getPIInstancesSize(poiInstances);
  const heightfieldsSize = _getHeightfieldsSize();
  const arrayBuffer = new ArrayBuffer(
    terrainGeometrySize +
    waterGeometrySize +
    // barrierGeometrySize +
    vegetationInstancesSize +
    grassInstancesSize +
    poiInstancesSize +
    heightfieldsSize
  );
  let index = 0;

  const _cloneTerrainGeometry = () => {
    if (terrainGeometry) {
      const positions = new terrainGeometry.positions.constructor(arrayBuffer, index, terrainGeometry.positions.length);
      positions.set(terrainGeometry.positions);
      index += terrainGeometry.positions.length * terrainGeometry.positions.constructor.BYTES_PER_ELEMENT;
      
      const normals = new terrainGeometry.normals.constructor(arrayBuffer, index, terrainGeometry.normals.length);
      normals.set(terrainGeometry.normals);
      index += terrainGeometry.normals.length * terrainGeometry.normals.constructor.BYTES_PER_ELEMENT;

      const biomes = new terrainGeometry.biomes.constructor(arrayBuffer, index, terrainGeometry.biomes.length);
      biomes.set(terrainGeometry.biomes);
      index += terrainGeometry.biomes.length * terrainGeometry.biomes.constructor.BYTES_PER_ELEMENT;

      const biomesWeights = new terrainGeometry.biomesWeights.constructor(arrayBuffer, index, terrainGeometry.biomesWeights.length);
      biomesWeights.set(terrainGeometry.biomesWeights);
      index += terrainGeometry.biomesWeights.length * terrainGeometry.biomesWeights.constructor.BYTES_PER_ELEMENT;
      
      const biomesUvs1 = new terrainGeometry.biomesUvs1.constructor(arrayBuffer, index, terrainGeometry.biomesUvs1.length);
      biomesUvs1.set(terrainGeometry.biomesUvs1);
      index += terrainGeometry.biomesUvs1.length * terrainGeometry.biomesUvs1.constructor.BYTES_PER_ELEMENT;

      const biomesUvs2 = new terrainGeometry.biomesUvs2.constructor(arrayBuffer, index, terrainGeometry.biomesUvs2.length);
      biomesUvs2.set(terrainGeometry.biomesUvs2);
      index += terrainGeometry.biomesUvs2.length * terrainGeometry.biomesUvs2.constructor.BYTES_PER_ELEMENT;

      // const seeds = new terrainGeometry.seeds.constructor(arrayBuffer, index, terrainGeometry.seeds.length);
      // seeds.set(terrainGeometry.seeds);
      // index += terrainGeometry.seeds.length * terrainGeometry.seeds.constructor.BYTES_PER_ELEMENT;

      const indices = new terrainGeometry.indices.constructor(arrayBuffer, index, terrainGeometry.indices.length);
      indices.set(terrainGeometry.indices);
      index += terrainGeometry.indices.length * terrainGeometry.indices.constructor.BYTES_PER_ELEMENT;

      /* const skylights = new terrainGeometry.skylights.constructor(arrayBuffer, index, terrainGeometry.skylights.length);
      skylights.set(terrainGeometry.skylights);
      index += terrainGeometry.skylights.length * terrainGeometry.skylights.constructor.BYTES_PER_ELEMENT;

      const aos = new terrainGeometry.aos.constructor(arrayBuffer, index, terrainGeometry.aos.length);
      aos.set(terrainGeometry.aos);
      index += terrainGeometry.aos.length * terrainGeometry.aos.constructor.BYTES_PER_ELEMENT;
      
      const peeks = new terrainGeometry.peeks.constructor(arrayBuffer, index, terrainGeometry.peeks.length);
      peeks.set(terrainGeometry.peeks);
      index += terrainGeometry.peeks.length * terrainGeometry.peeks.constructor.BYTES_PER_ELEMENT; */

      return {
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
        // peeks
      };
    } else {
      return null;
    }
  };
  const _cloneWaterGeometry = () => {
    if (waterGeometry) {
      const positions = new waterGeometry.positions.constructor(arrayBuffer, index, waterGeometry.positions.length);
      positions.set(waterGeometry.positions);
      index += waterGeometry.positions.length * waterGeometry.positions.constructor.BYTES_PER_ELEMENT;
      
      const normals = new waterGeometry.normals.constructor(arrayBuffer, index, waterGeometry.normals.length);
      normals.set(waterGeometry.normals);
      index += waterGeometry.normals.length * waterGeometry.normals.constructor.BYTES_PER_ELEMENT;

      const factors = new waterGeometry.factors.constructor(arrayBuffer, index, waterGeometry.factors.length);
      factors.set(waterGeometry.factors);
      index += waterGeometry.factors.length * waterGeometry.factors.constructor.BYTES_PER_ELEMENT;

      const indices = new waterGeometry.indices.constructor(arrayBuffer, index, waterGeometry.indices.length);
      indices.set(waterGeometry.indices);
      index += waterGeometry.indices.length * waterGeometry.indices.constructor.BYTES_PER_ELEMENT;

      return {
        positions,
        normals,
        factors,
        indices,
      };
    } else {
      return null;
    }
  };
  /* const _cloneBarrierGeometry = () => {
    if (barrierGeometry) {
      const positions = new barrierGeometry.positions.constructor(arrayBuffer, index, barrierGeometry.positions.length);
      positions.set(barrierGeometry.positions);
      index += barrierGeometry.positions.length * barrierGeometry.positions.constructor.BYTES_PER_ELEMENT;
      
      const normals = new barrierGeometry.normals.constructor(arrayBuffer, index, barrierGeometry.normals.length);
      normals.set(barrierGeometry.normals);
      index += barrierGeometry.normals.length * barrierGeometry.normals.constructor.BYTES_PER_ELEMENT;

      const uvs = new barrierGeometry.uvs.constructor(arrayBuffer, index, barrierGeometry.uvs.length);
      uvs.set(barrierGeometry.uvs);
      index += barrierGeometry.uvs.length * barrierGeometry.uvs.constructor.BYTES_PER_ELEMENT;

      const positions2D = new barrierGeometry.positions2D.constructor(arrayBuffer, index, barrierGeometry.positions2D.length);
      positions2D.set(barrierGeometry.positions2D);
      index += barrierGeometry.positions2D.length * barrierGeometry.positions2D.constructor.BYTES_PER_ELEMENT;

      const indices = new barrierGeometry.indices.constructor(arrayBuffer, index, barrierGeometry.indices.length);
      indices.set(barrierGeometry.indices);
      index += barrierGeometry.indices.length * barrierGeometry.indices.constructor.BYTES_PER_ELEMENT;

      return {
        positions,
        normals,
        uvs,
        positions2D,
        indices,
      };
    } else {
      return null;
    }
  }; */
  const _clonePQIInstances = instancesResult => {
    if (instancesResult) {
      const {instances} = instancesResult;
      const instances2 = Array(instances.length);
      for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];
        const {instanceId, ps, qs} = instance;

        const ps2 = new ps.constructor(arrayBuffer, index, ps.length);
        ps2.set(ps);
        index += ps.length * ps.constructor.BYTES_PER_ELEMENT;

        const qs2 = new qs.constructor(arrayBuffer, index, qs.length);
        qs2.set(qs);
        index += qs.length * qs.constructor.BYTES_PER_ELEMENT;

        instances2[i] = {
          instanceId,
          ps: ps2,
          qs: qs2,
        };
      }
      return instances2;
    } else {
      return null;
    }
  };
  const _clonePIInstances = instancesResult => {
    if (instancesResult) {
      const ps = new instancesResult.ps.constructor(arrayBuffer, index, instancesResult.ps.length);
      ps.set(instancesResult.ps);
      index += instancesResult.ps.length * instancesResult.ps.constructor.BYTES_PER_ELEMENT;
      
      const instances = new instancesResult.instances.constructor(arrayBuffer, index, instancesResult.instances.length);
      instances.set(instancesResult.instances);
      index += instancesResult.instances.length * instancesResult.instances.constructor.BYTES_PER_ELEMENT;

      return {
        ps,
        instances,
      };
    } else {
      return null;
    }
  };
  const _cloneHeightfields = () => {
    if (heightfields) {
      const pixels = new heightfields.pixels.constructor(arrayBuffer, index, heightfields.pixels.length);
      pixels.set(heightfields.pixels);
      index += pixels.length * pixels.constructor.BYTES_PER_ELEMENT;

      return {
        pixels,
      };
    } else {
      return null;
    }
  };

  const terrainGeometry2 = _cloneTerrainGeometry();
  const waterGeometry2 = _cloneWaterGeometry();
  const vegetationInstances2 = _clonePQIInstances(vegetationInstances);
  const grassInstances2 = _clonePQIInstances(grassInstances);
  const poiInstances2 = _clonePIInstances(poiInstances);
  const heightfields2 = _cloneHeightfields();

  /* // sanity check
  if (arrayBuffer.byteLength !== index) {
    throw new Error('arrayBuffer byteLength mismatch during clone');
  } */

  return {
    arrayBuffer,
    terrainGeometry: terrainGeometry2,
    waterGeometry: waterGeometry2,
    vegetationInstances: vegetationInstances2,
    grassInstances: grassInstances2,
    poiInstances: poiInstances2,
    heightfields: heightfields2,
  };
};
const _cloneBarrierResult = barrierResult => {
  const {
    barrierGeometry,
    leafNodes,
    leafNodesMin,
    leafNodesMax,
    leafNodesIndex,
  } = barrierResult;

  const _getBarrierGeometrySize = () => {
    let size = barrierGeometry.positions.length * barrierGeometry.positions.constructor.BYTES_PER_ELEMENT +
      barrierGeometry.normals.length * barrierGeometry.normals.constructor.BYTES_PER_ELEMENT +
      barrierGeometry.uvs.length * barrierGeometry.uvs.constructor.BYTES_PER_ELEMENT +
      barrierGeometry.positions2D.length * barrierGeometry.positions2D.constructor.BYTES_PER_ELEMENT +
      barrierGeometry.indices.length * barrierGeometry.indices.constructor.BYTES_PER_ELEMENT;
    return size;
  };
  const _getLeafNodesSize = () => {
    if (leafNodes.length > 0) {
      const leafNode0 = leafNodes[0];
      let size = leafNodes.length * (
        leafNode0.min.constructor.BYTES_PER_ELEMENT + // x, z
        Int32Array.BYTES_PER_ELEMENT // lod
      );
      return size;
    } else {
      return 0;
    }
  };
  const _getLeafNodesMinSize = () => {
    let size = leafNodesMin.length * leafNodesMin.constructor.BYTES_PER_ELEMENT;
    return size;
  };
  const _getLeafNodesMaxSize = () => {
    let size = leafNodesMax.length * leafNodesMax.constructor.BYTES_PER_ELEMENT;
    return size;
  };
  const _getLeafNodesIndexSize = () => {
    let size = leafNodesIndex.length * leafNodesIndex.constructor.BYTES_PER_ELEMENT;
    return size;
  };

  const barrierGeometrySize = _getBarrierGeometrySize();
  const leafNodesSize = _getLeafNodesSize();
  const leafNodesMinSize = _getLeafNodesMinSize();
  const leafNodesMaxSize = _getLeafNodesMaxSize();
  const leafNodesIndexSize = _getLeafNodesIndexSize();
  const arrayBuffer = new ArrayBuffer(
    barrierGeometrySize +
    leafNodesSize +
    leafNodesMinSize +
    leafNodesMaxSize +
    leafNodesIndexSize
  );
  let index = 0;

  const _cloneBarrierGeometry = () => {
    const positions = new barrierGeometry.positions.constructor(arrayBuffer, index, barrierGeometry.positions.length);
    positions.set(barrierGeometry.positions);
    index += barrierGeometry.positions.length * barrierGeometry.positions.constructor.BYTES_PER_ELEMENT;
    
    const normals = new barrierGeometry.normals.constructor(arrayBuffer, index, barrierGeometry.normals.length);
    normals.set(barrierGeometry.normals);
    index += barrierGeometry.normals.length * barrierGeometry.normals.constructor.BYTES_PER_ELEMENT;

    const uvs = new barrierGeometry.uvs.constructor(arrayBuffer, index, barrierGeometry.uvs.length);
    uvs.set(barrierGeometry.uvs);
    index += barrierGeometry.uvs.length * barrierGeometry.uvs.constructor.BYTES_PER_ELEMENT;

    const positions2D = new barrierGeometry.positions2D.constructor(arrayBuffer, index, barrierGeometry.positions2D.length);
    positions2D.set(barrierGeometry.positions2D);
    index += barrierGeometry.positions2D.length * barrierGeometry.positions2D.constructor.BYTES_PER_ELEMENT;

    const indices = new barrierGeometry.indices.constructor(arrayBuffer, index, barrierGeometry.indices.length);
    indices.set(barrierGeometry.indices);
    index += barrierGeometry.indices.length * barrierGeometry.indices.constructor.BYTES_PER_ELEMENT;

    return {
      positions,
      normals,
      uvs,
      positions2D,
      indices,
    };
  };
  const _cloneLeafNodes = () => {
    const leafNode0 = leafNodes[0];
    const leafNodesMins = new leafNode0.min.constructor(
      arrayBuffer,
      index,
      leafNodes.length * leafNode0.min.length
    );
    
    const leafNodes2 = Array(leafNodes.length);
    for (let i = 0; i < leafNodes.length; i++) {
      const leafNode = leafNodes[i];
      leafNodesMins[i * 2] = leafNode.min[0];
      leafNodesMins[i * 2 + 1] = leafNode.min[1];
      leafNodes2[i] = {
        min: leafNodesMins.subarray(i * 2, i * 2 + 2),
        lod: leafNode.lod,
      };
    }

    index += leafNodes.length * leafNode0.min.length * leafNode0.min.constructor.BYTES_PER_ELEMENT;

    return leafNodes2;
  };
  const _cloneLeafNodesMin = () => {
    if (leafNodes.length > 0) {
      const leafNodesMin2 = new leafNodesMin.constructor(arrayBuffer, index, leafNodesMin.length);
      leafNodesMin2.set(leafNodesMin);
      index += leafNodesMin.length * leafNodesMin.constructor.BYTES_PER_ELEMENT;
      return leafNodesMin2;
    }
  };
  const _cloneLeafNodesMax = () => {
    const leafNodesMax2 = new leafNodesMax.constructor(arrayBuffer, index, leafNodesMax.length);
    leafNodesMax2.set(leafNodesMax);
    index += leafNodesMax.length * leafNodesMax.constructor.BYTES_PER_ELEMENT;
    return leafNodesMax2;
  };
  const _cloneLeafNodesIndex = () => {
    const leafNodesIndex2 = new leafNodesIndex.constructor(arrayBuffer, index, leafNodesIndex.length);
    leafNodesIndex2.set(leafNodesIndex);
    index += leafNodesIndex.length * leafNodesIndex.constructor.BYTES_PER_ELEMENT;
    return leafNodesIndex2;
  };

  const barrierGeometry2 = _cloneBarrierGeometry();
  const leafNodes2 = _cloneLeafNodes();
  const leafNodesMin2 = _cloneLeafNodesMin();
  const leafNodesMax2 = _cloneLeafNodesMax();
  const leafNodesIndex2 = _cloneLeafNodesIndex();

  return {
    arrayBuffer,
    barrierGeometry: barrierGeometry2,
    leafNodes: leafNodes2,
    leafNodesMin: leafNodesMin2,
    leafNodesMax: leafNodesMax2,
    leafNodesIndex: leafNodesIndex2,
  };
};

const instances = new Map();

const _cloneNode = node => {
  return {
    min: node.min.slice(),
    lod: node.lod,
    lodArray: node.lodArray.slice(),
  };
};
const _cloneTrackerUpdate = trackerUpdate => {
  return {
    leafNodes: trackerUpdate.leafNodes.map(_cloneNode),
    newDataRequests: trackerUpdate.newDataRequests.map(_cloneNode),
    keepDataRequests: trackerUpdate.keepDataRequests.map(_cloneNode),
    cancelDataRequests: trackerUpdate.cancelDataRequests.map(_cloneNode),
  };
};

let loaded = false;
let queue = [];
const _handleMethod = async ({method, args, instance: instanceKey, taskId}) => {
  switch (method) {
    case 'initialize': {
      return pg.initialize();
    }
    case 'ensureInstance': {
      // console.log('ensure instance', args);
      const {instance: instanceKey, seed, chunkSize} = args;
      let instance = instances.get(instanceKey);
      if (!instance) {
        instance = pg.createInstance(seed, chunkSize);
        instances.set(instanceKey, instance);
      }
      return true;
    }
    case 'deleteInstance': {
      const {instance: instanceKey} = args;
      const instance = instances.get(instanceKey);
      if (instance) {
        pg.deleteInstance(instance);
        instances.delete(instanceKey);
        return true;
      } else {
        return false;
      }
    }
    case 'setCamera': {
      const {instance: instanceKey, worldPosition, cameraPosition, cameraQuaternion, projectionMatrix} = args;
      const instance = instances.get(instanceKey);
      pg.setCamera(instance, worldPosition, cameraPosition, cameraQuaternion, projectionMatrix);
      return true;
    }
    case 'setClipRange': {
      const {instance: instanceKey, range} = args;
      const instance = instances.get(instanceKey);
      pg.setClipRange(instance, range);
      return true;
    }
    case 'createTracker': {
      const {instance: instanceKey} = args;
      const instance = instances.get(instanceKey);
      const tracker = pg.createTracker(instance);
      const spec = {
        result: tracker,
        transfers: [],
      };
      return spec;
    }
    case 'destroyTracker': {
      const {instance: instanceKey, tracker} = args;
      const instance = instances.get(instanceKey);
      pg.destroyTracker(instance, tracker);
      return true;
    }
    case 'trackerUpdate': {
      const {instance: instanceKey, tracker, position, minLod, maxLod, lod1Range, priority} = args;
      const instance = instances.get(instanceKey);
      const trackerUpdate = await pg.trackerUpdateAsync(
        instance,
        taskId,
        tracker,
        position,
        minLod,
        maxLod,
        lod1Range,
        priority
      );
      const trackerUpdate2 = _cloneTrackerUpdate(trackerUpdate);
      const spec = {
        result: trackerUpdate2,
        transfers: [],
      };
      return spec;
    }
    case 'generateChunk': {
      const {
        chunkPosition,
        lod,
        lodArray,
        chunkSize,
        generateFlagsInt,
        numVegetationInstances,
        numGrassInstances,
        numPoiInstances,
      } = args;
      const instance = instances.get(instanceKey);
      if (!instance) throw new Error('generateChunk : instance not found');

      const positionX = chunkPosition[0] * chunkSize;
      const positionZ = chunkPosition[1] * chunkSize;
      const chunkResult = await pg.createChunkMeshAsync(
        instance,
        taskId,
        positionX,
        positionZ,
        lod,
        lodArray,
        generateFlagsInt,
        numVegetationInstances,
        numGrassInstances,
        numPoiInstances,
      );
      const chunkResult2 = _cloneChunkResult(chunkResult);

      const _freeChunkResult = chunkResult => {
        chunkResult.terrainGeometry && pg.free(chunkResult.terrainGeometry.bufferAddress);
        chunkResult.waterGeometry && pg.free(chunkResult.waterGeometry.bufferAddress);
        chunkResult.grassInstances && pg.free(chunkResult.grassInstances.bufferAddress);
        chunkResult.poiInstances && pg.free(chunkResult.poiInstances.bufferAddress);
        chunkResult.heightfields && pg.free(chunkResult.heightfields.bufferAddress);
        pg.free(chunkResult.bufferAddress);
      };
      _freeChunkResult(chunkResult);

      return {
        result: chunkResult2,
        transfers: [
          chunkResult2.arrayBuffer,
        ],
      };
    }
    case 'generateBarrier': {
      const {
        chunkPosition,
        minLod,
        maxLod,
        chunkSize,
      } = args;
      const instance = instances.get(instanceKey);
      if (!instance) throw new Error('generateBarrier : instance not found');

      const positionX = chunkPosition[0] * chunkSize;
      const positionZ = chunkPosition[1] * chunkSize;
      const barrierResult = await pg.createBarrierMeshAsync(
        instance,
        taskId,
        positionX,
        positionZ,
        minLod,
        maxLod,
      );
      const barrierResult2 = _cloneBarrierResult(barrierResult);

      const _freeBarrierResult = barrierResult => {
        pg.free(barrierResult.bufferAddress);
      };
      _freeBarrierResult(barrierResult);

      return {
        result: barrierResult2,
        transfers: [
          barrierResult2.arrayBuffer,
        ],
      };
    }
    /* case 'createMobSplat': {
      const {x, z, lod, priority} = args;
      const instance = instances.get(instanceKey);
      if (!instance) throw new Error('createMobSplat : instance not found');
      
      const {
        ps,
        qs,
        instances: instancesResult,
      } = await pg.createMobSplatAsync(instance, taskId, x, z, lod, priority);

      const spec = {
        result: {
          ps,
          qs,
          instances: instancesResult,
        },
        transfers: [ps.buffer, qs.buffer, instancesResult.buffer],
      };
      return spec;
    } */
    case 'cancelTask': {
      const {taskId} = args;
      const instance = instances.get(instanceKey);
      if (!instance) throw new Error('cancelTask : instance not found');

      await pg.cancelTask(instance, taskId);
      const spec = {
        result: null,
        transfers: [],
      };
      return spec;
    }
    default: {
      throw new Error(`unknown method: ${method}`);
    }
  }
};
const _handleMessage = async m => {
  const {data, port} = m;
  const {taskId} = data;
  const p = makePromise();
  // try {
    const spec = await _handleMethod(data);
    p.accept(spec);
  // } catch (err) {
  //   p.reject(err);
  // }

  if (taskId) {
    p.then(
      (spec) => {
        const { result = null, transfers = [] } = spec ?? {};
        port.postMessage(
          {
            method: 'response',
            taskId,
            result,
          },
          transfers
        );
      },
      (err) => {
        port.postMessage({
          method: 'response',
          taskId,
          error: err.message,
        });
      }
    );
  }
};
self.onmessage = (e) => {
  const m = {
    data: e.data,
    port: self,
  };
  if (loaded) {
    _handleMessage(m);
  } else {
    queue.push(m);
  }
};

(async () => {
  await pg.waitForLoad();

  loaded = true;
  for (let i = 0; i < queue.length; i++) {
    _handleMessage(queue[i]);
  }
  queue.length = 0;
})();
