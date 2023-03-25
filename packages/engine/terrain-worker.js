import Module from "./bin/terrain.js";
import {ScratchStack} from './geometry-util.js';

const w = {};
w.waitForLoad = Module.waitForLoad;

w._getTerrain = (scratchStack, length) => {
  Module._getTerrain(scratchStack, length);
};

let loaded = false;
let scratchStack = null;

const modulePromise = (async () => {
  await w.waitForLoad();
  loaded = true;
  const scratchStackSize = 8 * 1024 * 1024;
  console.log('Module', Module);
  scratchStack = new ScratchStack(Module, scratchStackSize);
})();
const waitForModule = () => modulePromise;


function hashCode(str) {
  var hash = 0;
  if (str.length == 0) {
    return hash;
  }
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}



onmessage = async function(event) {
  await waitForModule();
  const id = event.data.id;
  const size = event.data.size;
  const baseX = event.data.x;
  const baseZ = event.data.z;
  const seed = hashCode(event.data.seed);
  const subdivisions = event.data.subdivisions;
  const lacunarity = event.data.lacunarity;
  const persistence = event.data.persistence;
  const iterations = event.data.iterations;
  const baseFrequency = event.data.baseFrequency;
  const baseAmplitude = event.data.baseAmplitude;
  const power = event.data.power;
  const elevationOffset = event.data.elevationOffset;
  const iterationsOffsets = event.data.iterationsOffsets;

  const maxIterations = event.data.maxIterations;

  const bounding = event.data.bounding;
  const xMin = bounding.xMin;
  const xMax = bounding.xMax;
  const zMin = bounding.zMin;
  const zMax = bounding.zMax;
 
  
  if (loaded) {
    scratchStack.f32[0] = size;
    scratchStack.f32[1] = baseX;
    scratchStack.f32[2] = baseZ;
    scratchStack.f32[3] = seed;
    scratchStack.f32[4] = subdivisions;
    scratchStack.f32[5] = lacunarity;
    scratchStack.f32[6] = persistence;
    scratchStack.f32[7] = iterations;
    scratchStack.f32[8] = baseFrequency;
    scratchStack.f32[9] = baseAmplitude;
    scratchStack.f32[10] = power;
    scratchStack.f32[11] = elevationOffset;
    scratchStack.f32[12] = maxIterations;

    scratchStack.f32[13] = xMin;
    scratchStack.f32[14] = xMax;
    scratchStack.f32[15] = zMin;
    scratchStack.f32[16] = zMax;

    
    let iterationsOffsetsIndex = 0;
    for (let i = 17; i < 17 + maxIterations * 2; i += 2) {
      scratchStack.f32[i] = iterationsOffsets[iterationsOffsetsIndex][0];
      scratchStack.f32[i + 1] = iterationsOffsets[iterationsOffsetsIndex][1];
      iterationsOffsetsIndex ++;
    }

    w._getTerrain(
      scratchStack.ptr,
    )

    const segments = subdivisions + 1;
    const skirtCount = subdivisions * 4 + 4;
    
    const positionsSize = segments * segments * 3 + skirtCount * 3;
    const positionsArray = new Float32Array(positionsSize);
    const positionsStartIndex = 0; 
    const positionsEndIndex = positionsStartIndex + positionsSize; 
    positionsArray.set(scratchStack.f32.subarray(positionsStartIndex, positionsEndIndex), 0);
    
    const normalsSize = segments * segments * 3 + skirtCount * 3;
    const normalsArray = new Float32Array(normalsSize);
    const normalsStartIndex = positionsEndIndex; 
    const normalsEndIndex = normalsStartIndex + normalsSize; 
    normalsArray.set(scratchStack.f32.subarray(normalsStartIndex, normalsEndIndex), 0);


    const indicesNumber = subdivisions * subdivisions;
    const indicesSize = indicesNumber * 6 + subdivisions * 4 * 6 * 4;
    const indicesArray = new Uint32Array(indicesSize);
    const indicesStartIndex = normalsEndIndex; 
    const indicesEndIndex = indicesStartIndex + indicesSize; 
    indicesArray.set(scratchStack.f32.subarray(indicesStartIndex, indicesEndIndex), 0);
    

    const textureSize = segments * segments * 4;
    const textureArray = new Float32Array(textureSize)
    const textureStartIndex = indicesEndIndex; 
    const textureEndIndex = textureStartIndex + textureSize; 
    textureArray.set(scratchStack.f32.subarray(textureStartIndex, textureEndIndex), 0);

    const uvSize = segments * segments * 2 + skirtCount * 2;
    const uvArray = new Float32Array(uvSize);
    const uvStartIndex = textureEndIndex; 
    const uvEndIndex = uvStartIndex + uvSize; 
    uvArray.set(scratchStack.f32.subarray(uvStartIndex, uvEndIndex), 0);


    const biomeWeightSize = segments * segments * 4;
    const biomeWeightArray = new Float32Array(biomeWeightSize);
    const biomeWeightStartIndex = uvEndIndex; 
    const biomeWeightEndIndex = biomeWeightStartIndex + biomeWeightSize; 
    biomeWeightArray.set(scratchStack.f32.subarray(biomeWeightStartIndex, biomeWeightEndIndex), 0);

    const grassPositionsSize = scratchStack.f32[biomeWeightEndIndex];
    const grassPositionsArray = new Float32Array(grassPositionsSize);
    const grassPositionsStartIndex = biomeWeightEndIndex + 1;
    const grassPositionsEndIndex = grassPositionsStartIndex + grassPositionsSize; 
    grassPositionsArray.set(scratchStack.f32.subarray(grassPositionsStartIndex, grassPositionsEndIndex), 0);

    const grassTerrainSlopesSize = scratchStack.f32[grassPositionsEndIndex];
    const grassTerrainSlopesArray = new Float32Array(grassTerrainSlopesSize);
    const grassTerrainSlopesStartIndex = grassPositionsEndIndex + 1;
    const grassTerrainSlopesEndIndex = grassTerrainSlopesStartIndex + grassTerrainSlopesSize; 
    grassTerrainSlopesArray.set(scratchStack.f32.subarray(grassTerrainSlopesStartIndex, grassTerrainSlopesEndIndex), 0);


    const flowerPositionsSize = scratchStack.f32[grassTerrainSlopesEndIndex];
    const flowerPositionsArray = new Float32Array(flowerPositionsSize);
    const flowerPositionsStartIndex = grassTerrainSlopesEndIndex + 1;
    const flowerPositionsEndIndex = flowerPositionsStartIndex + flowerPositionsSize; 
    flowerPositionsArray.set(scratchStack.f32.subarray(flowerPositionsStartIndex, flowerPositionsEndIndex), 0);

    const flowerTerrainSlopesSize = scratchStack.f32[flowerPositionsEndIndex];
    const flowerTerrainSlopesArray = new Float32Array(flowerTerrainSlopesSize);
    const flowerTerrainSlopesStartIndex = flowerPositionsEndIndex + 1;
    const flowerTerrainSlopesEndIndex = flowerTerrainSlopesStartIndex + flowerTerrainSlopesSize; 
    flowerTerrainSlopesArray.set(scratchStack.f32.subarray(flowerTerrainSlopesStartIndex, flowerTerrainSlopesEndIndex), 0);

    const bushPositionsSize = scratchStack.f32[flowerTerrainSlopesEndIndex];
    const bushPositionsArray = new Float32Array(bushPositionsSize);
    const bushPositionsStartIndex = flowerTerrainSlopesEndIndex + 1;
    const bushPositionsEndIndex = bushPositionsStartIndex + bushPositionsSize; 
    bushPositionsArray.set(scratchStack.f32.subarray(bushPositionsStartIndex, bushPositionsEndIndex), 0);

    const bushTerrainSlopesSize = scratchStack.f32[bushPositionsEndIndex];
    const bushTerrainSlopesArray = new Float32Array(bushTerrainSlopesSize);
    const bushTerrainSlopesStartIndex = bushPositionsEndIndex + 1;
    const bushTerrainSlopesEndIndex = bushTerrainSlopesStartIndex + bushTerrainSlopesSize; 
    bushTerrainSlopesArray.set(scratchStack.f32.subarray(bushTerrainSlopesStartIndex, bushTerrainSlopesEndIndex), 0);

    const rockPositionsSize = scratchStack.f32[bushTerrainSlopesEndIndex];
    const rockPositionsArray = new Float32Array(rockPositionsSize);
    const rockPositionsStartIndex = bushTerrainSlopesEndIndex + 1;
    const rockPositionsEndIndex = rockPositionsStartIndex + rockPositionsSize; 
    rockPositionsArray.set(scratchStack.f32.subarray(rockPositionsStartIndex, rockPositionsEndIndex), 0);

    const rockTerrainSlopesSize = scratchStack.f32[rockPositionsEndIndex];
    const rockTerrainSlopesArray = new Float32Array(rockTerrainSlopesSize);
    const rockTerrainSlopesStartIndex = rockPositionsEndIndex + 1;
    const rockTerrainSlopesEndIndex = rockTerrainSlopesStartIndex + rockTerrainSlopesSize; 
    rockTerrainSlopesArray.set(scratchStack.f32.subarray(rockTerrainSlopesStartIndex, rockTerrainSlopesEndIndex), 0);

    const rockInfosSize = scratchStack.f32[rockTerrainSlopesEndIndex];
    const rockInfosArray = new Float32Array(rockInfosSize);
    const rockInfosStartIndex = rockTerrainSlopesEndIndex + 1;
    const rockInfosEndIndex = rockInfosStartIndex + rockInfosSize; 
    rockInfosArray.set(scratchStack.f32.subarray(rockInfosStartIndex, rockInfosEndIndex), 0);


    const treeOnePositionsSize = scratchStack.f32[rockInfosEndIndex];
    const treeOnePositionsArray = new Float32Array(treeOnePositionsSize);
    const treeOnePositionsStartIndex = rockInfosEndIndex + 1;
    const treeOnePositionsEndIndex = treeOnePositionsStartIndex + treeOnePositionsSize; 
    treeOnePositionsArray.set(scratchStack.f32.subarray(treeOnePositionsStartIndex, treeOnePositionsEndIndex), 0);

    const treeOneTerrainSlopesSize = scratchStack.f32[treeOnePositionsEndIndex];
    const treeOneTerrainSlopesArray = new Float32Array(treeOneTerrainSlopesSize);
    const treeOneTerrainSlopesStartIndex = treeOnePositionsEndIndex + 1;
    const treeOneTerrainSlopesEndIndex = treeOneTerrainSlopesStartIndex + treeOneTerrainSlopesSize; 
    treeOneTerrainSlopesArray.set(scratchStack.f32.subarray(treeOneTerrainSlopesStartIndex, treeOneTerrainSlopesEndIndex), 0);

    const treeOneInfosSize = scratchStack.f32[treeOneTerrainSlopesEndIndex];
    const treeOneInfosArray = new Float32Array(treeOneInfosSize);
    const treeOneInfosStartIndex = treeOneTerrainSlopesEndIndex + 1;
    const treeOneInfosEndIndex = treeOneInfosStartIndex + treeOneInfosSize; 
    treeOneInfosArray.set(scratchStack.f32.subarray(treeOneInfosStartIndex, treeOneInfosEndIndex), 0);

    const treeTwoPositionsSize = scratchStack.f32[treeOneInfosEndIndex];
    const treeTwoPositionsArray = new Float32Array(treeTwoPositionsSize);
    const treeTwoPositionsStartIndex = treeOneInfosEndIndex + 1;
    const treeTwoPositionsEndIndex = treeTwoPositionsStartIndex + treeTwoPositionsSize; 
    treeTwoPositionsArray.set(scratchStack.f32.subarray(treeTwoPositionsStartIndex, treeTwoPositionsEndIndex), 0);

    const treeTwoTerrainSlopesSize = scratchStack.f32[treeTwoPositionsEndIndex];
    const treeTwoTerrainSlopesArray = new Float32Array(treeTwoTerrainSlopesSize);
    const treeTwoTerrainSlopesStartIndex = treeTwoPositionsEndIndex + 1;
    const treeTwoTerrainSlopesEndIndex = treeTwoTerrainSlopesStartIndex + treeTwoTerrainSlopesSize; 
    treeTwoTerrainSlopesArray.set(scratchStack.f32.subarray(treeTwoTerrainSlopesStartIndex, treeTwoTerrainSlopesEndIndex), 0);

    const treeTwoInfosSize = scratchStack.f32[treeTwoTerrainSlopesEndIndex];
    const treeTwoInfosArray = new Float32Array(treeTwoInfosSize);
    const treeTwoInfosStartIndex = treeTwoTerrainSlopesEndIndex + 1;
    const treeTwoInfosEndIndex = treeTwoInfosStartIndex + treeTwoInfosSize; 
    treeTwoInfosArray.set(scratchStack.f32.subarray(treeTwoInfosStartIndex, treeTwoInfosEndIndex), 0);

    const treeThreePositionsSize = scratchStack.f32[treeTwoInfosEndIndex];
    const treeThreePositionsArray = new Float32Array(treeThreePositionsSize);
    const treeThreePositionsStartIndex = treeTwoInfosEndIndex + 1;
    const treeThreePositionsEndIndex = treeThreePositionsStartIndex + treeThreePositionsSize; 
    treeThreePositionsArray.set(scratchStack.f32.subarray(treeThreePositionsStartIndex, treeThreePositionsEndIndex), 0);

    const treeThreeTerrainSlopesSize = scratchStack.f32[treeThreePositionsEndIndex];
    const treeThreeTerrainSlopesArray = new Float32Array(treeThreeTerrainSlopesSize);
    const treeThreeTerrainSlopesStartIndex = treeThreePositionsEndIndex + 1;
    const treeThreeTerrainSlopesEndIndex = treeThreeTerrainSlopesStartIndex + treeThreeTerrainSlopesSize; 
    treeThreeTerrainSlopesArray.set(scratchStack.f32.subarray(treeThreeTerrainSlopesStartIndex, treeThreeTerrainSlopesEndIndex), 0);

    const treeThreeInfosSize = scratchStack.f32[treeThreeTerrainSlopesEndIndex];
    const treeThreeInfosArray = new Float32Array(treeThreeInfosSize);
    const treeThreeInfosStartIndex = treeThreeTerrainSlopesEndIndex + 1;
    const treeThreeInfosEndIndex = treeThreeInfosStartIndex + treeThreeInfosSize; 
    treeThreeInfosArray.set(scratchStack.f32.subarray(treeThreeInfosStartIndex, treeThreeInfosEndIndex), 0);

    // console.log(grassPositionsSize, grassPositionsArray, grassTerrainSlopesSize, grassTerrainSlopesArray);


    // Post
    postMessage({
      id: id,
      positions: positionsArray,
      normals: normalsArray,
      indices: indicesArray,
      texture: textureArray,
      uv: uvArray,
      biomeWeight: biomeWeightArray,

      grassPositions: grassPositionsArray,
      grassTerrainSlopes: grassTerrainSlopesArray,

      flowerPositions: flowerPositionsArray,
      flowerTerrainSlopes: flowerTerrainSlopesArray,

      bushPositions: bushPositionsArray,
      bushTerrainSlopes: bushTerrainSlopesArray,

      rockPositions: rockPositionsArray,
      rockTerrainSlopes: rockTerrainSlopesArray,
      rockInfos: rockInfosArray,

      treeOnePositions: treeOnePositionsArray,
      treeOneTerrainSlopes: treeOneTerrainSlopesArray,
      treeOneInfos: treeOneInfosArray,

      treeTwoPositions: treeTwoPositionsArray,
      treeTwoTerrainSlopes: treeTwoTerrainSlopesArray,
      treeTwoInfos: treeTwoInfosArray,

      treeThreePositions: treeThreePositionsArray,
      treeThreeTerrainSlopes: treeThreeTerrainSlopesArray,
      treeThreeInfos: treeThreeInfosArray,
    })
  }

  
  
  
}