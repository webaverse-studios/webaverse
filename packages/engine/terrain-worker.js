import SimplexNoise from "./simplex-noise";
import Module from "./bin/terrain.js";
import {ScratchStack} from './geometry-util.js';

let elevationRandom = null;

const w = {};
w.waitForLoad = Module.waitForLoad;

w._printMessage = message => {
  Module._printMessage(message);
};

w._printArray = (scratchStack, length) => {
  Module._printArray(scratchStack, length);
};

let loaded = false;
let scratchStack = null;

(async () => {
  await w.waitForLoad();
  loaded = true;
  const scratchStackSize = 8 * 1024 * 1024;
  console.log('Module', Module);
  scratchStack = new ScratchStack(Module, scratchStackSize);
  console.log('hi world loaded ******************************************');
})();

const getElevation = (x, y, lacunarity, persistence, iterations, baseFrequency, baseAmplitude, power, elevationOffset, iterationsOffsets) => {
  let elevation = 0;
  let frequency = baseFrequency;
  let amplitude = 1;
  let normalisation = 0;

  for(let i = 0; i < iterations; i++) {
    const noise = elevationRandom.noise2D(x * frequency + iterationsOffsets[i][0], y * frequency + iterationsOffsets[i][1]);
    elevation += noise * amplitude;

    normalisation += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  elevation /= normalisation;
  elevation = Math.pow(Math.abs(elevation), power) * Math.sign(elevation);
  elevation *= baseAmplitude;
  elevation += elevationOffset;

  return elevation;
}

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



onmessage = function(event) {
  
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
  
  if (loaded) {
    // w._printMessage(id)
    // w._printMessage(size)
    // w._printMessage(baseX)
    // w._printMessage(seed)
    // w._printMessage(subdivisions)
    // w._printMessage(lacunarity)
    // w._printMessage(persistence)
    // w._printMessage(iterations)
    // w._printMessage(baseFrequency)
    // w._printMessage(baseAmplitude)
    // w._printMessage(power)
    // w._printMessage(elevationOffset)
    // w._printMessage(iterationsOffsets)

    // console.log(
    //   size,
    //   baseX,
    //   baseZ,
    //   seed,
    //   subdivisions,
    //   lacunarity,
    //   persistence,
    //   iterations,
    //   baseFrequency,
    //   baseAmplitude,
    //   power,
    //   elevationOffset,
    //   maxIterations
    // )

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

    
    let iterationsOffsetsIndex = 0;
    for (let i = 13; i < 13 + maxIterations * 2; i += 2) {
      scratchStack.f32[i] = iterationsOffsets[iterationsOffsetsIndex][0];
      scratchStack.f32[i + 1] = iterationsOffsets[iterationsOffsetsIndex][1];
      iterationsOffsetsIndex ++;
    }

    const newArrayLength = w._printArray(
      scratchStack.ptr,
    )
    // console.log(newArrayLength, scratchStack);
  }

  
  
  const segments = subdivisions + 1;
  // elevationRandom = new SimplexNoise(seed);
  // const grassRandom = new SimplexNoise(seed);

  // /**
  //  * Elevation
  //  */
  // const overflowElevations = new Float32Array((segments + 1) * (segments + 1)); // Bigger to calculate normals more accurately
  // const elevations = new Float32Array(segments * segments);
  
  // for(let iX = 0; iX < segments + 1; iX++) {
  //   const x = baseX + (iX / subdivisions - 0.5) * size;

  //   for(let iZ = 0; iZ < segments + 1; iZ++) {
  //     const z = baseZ + (iZ / subdivisions - 0.5) * size;
  //     const elevation = getElevation(x, z, lacunarity, persistence, iterations, baseFrequency, baseAmplitude, power, elevationOffset, iterationsOffsets);

  //     const i = iZ * (segments + 1) + iX;
  //     overflowElevations[i] = elevation;

  //     if(iX < segments && iZ < segments) {
  //       const i = iZ * segments + iX;
  //       elevations[i] = elevation;
  //     }
  //   }
  // }

  // // /**
  // //  * Positions
  // //  */
  const skirtCount = subdivisions * 4 + 4;
  // const positions = new Float32Array(segments * segments * 3 + skirtCount * 3);

  // for(let iZ = 0; iZ < segments; iZ++) {
  //   const z = baseZ + (iZ / subdivisions - 0.5) * size;
  //   for(let iX = 0; iX < segments; iX++) {
  //     const x = baseX + (iX / subdivisions - 0.5) * size;

  //     const elevation = elevations[iZ * segments + iX];

  //     const iStride = (iZ * segments + iX) * 3;
  //     positions[iStride    ] = x;
  //     positions[iStride + 1] = elevation;
  //     positions[iStride + 2] = z;
  //   }
  // }
  
  // /**
  //  * Normals
  //  */
  // const normals = new Float32Array(segments * segments * 3 + skirtCount * 3);
  
  // const interSegmentX = - size / subdivisions;
  // const interSegmentZ = - size / subdivisions;

  // for (let iZ = 0; iZ < segments; iZ++) {
  //   for (let iX = 0; iX < segments; iX++) {
  //     // Indexes
  //     const iOverflowStride = iZ * (segments + 1) + iX;

  //     // Elevations
  //     const currentElevation = overflowElevations[iOverflowStride];
  //     const neighbourXElevation = overflowElevations[iOverflowStride + 1];
  //     const neighbourZElevation = overflowElevations[iOverflowStride + segments + 1];

  //     // Deltas
  //     const deltaX = [
  //         interSegmentX,
  //         currentElevation - neighbourXElevation,
  //         0
  //     ]

  //     const deltaZ = [
  //         0,
  //         currentElevation - neighbourZElevation,
  //         interSegmentZ
  //     ]

  //     // Normal
  //     let normal = [0, 0, 0];
  //     function cross(out, a, b) {
  //       let ax = a[0],
  //         ay = a[1],
  //         az = a[2];
  //       let bx = b[0],
  //         by = b[1],
  //         bz = b[2];
      
  //       out[0] = ay * bz - az * by;
  //       out[1] = az * bx - ax * bz;
  //       out[2] = ax * by - ay * bx;
  //       return out;
  //     }
  //     function normalize(out, a) {
  //       let x = a[0];
  //       let y = a[1];
  //       let z = a[2];
  //       let len = x * x + y * y + z * z;
  //       if (len > 0) {
  //         //TODO: evaluate use of glm_invsqrt here?
  //         len = 1 / Math.sqrt(len);
  //       }
  //       out[0] = a[0] * len;
  //       out[1] = a[1] * len;
  //       out[2] = a[2] * len;
  //       return out;
  //     }
  //     normal = cross(normal, deltaZ, deltaX);
  //     normal = normalize(normal, normal);

  //     const iStride = (iZ * segments + iX) * 3;
  //     normals[iStride    ] = normal[0];
  //     normals[iStride + 1] = normal[1];
  //     normals[iStride + 2] = normal[2];
  //   }
  // }

  // /**
  //  * UV
  //  */
  // const uv = new Float32Array(segments * segments * 2 + skirtCount * 2);

  // for (let iZ = 0; iZ < segments; iZ++) {
  //   for (let iX = 0; iX < segments; iX++) {
  //     const iStride = (iZ * segments + iX) * 2;
  //     uv[iStride    ] = iX / (segments - 1);
  //     uv[iStride + 1] = iZ / (segments - 1);
  //   }
  // }

  // /**
  //  * Indices
  //  */
  // const indicesCount = subdivisions * subdivisions;
  // // const indices = new Float32Array(indicesCount * 6 + subdivisions * 4 * 6 * 4);
  // const indices = new (indicesCount < 65535 ? Uint16Array : Uint32Array)(indicesCount * 6 + subdivisions * 4 * 6 * 4);
  
  // for (let iZ = 0; iZ < subdivisions; iZ++) {
  //   for (let iX = 0; iX < subdivisions; iX++) {
  //     const row = subdivisions + 1;
  //     const a = iZ * row + iX;
  //     const b = iZ * row + (iX + 1);
  //     const c = (iZ + 1) * row + iX;
  //     const d = (iZ + 1) * row + (iX + 1);

  //     const iStride = (iZ * subdivisions + iX) * 6;
  //     indices[iStride    ] = a;
  //     indices[iStride + 1] = d;
  //     indices[iStride + 2] = b;

  //     indices[iStride + 3] = d;
  //     indices[iStride + 4] = a;
  //     indices[iStride + 5] = c;
  //   }
  // }
  
  // /**
  //  * Skirt
  //  */
  // let skirtIndex = segments * segments;
  // let indicesSkirtIndex = segments * segments;

  // // North (negative Z)
  // for(let iX = 0; iX < segments; iX++) {
  //   const iZ = 0;
  //   const iPosition = iZ * segments + iX;
  //   const iPositionStride = iPosition * 3;

  //   // Position
  //   positions[skirtIndex * 3    ] = positions[iPositionStride + 0];
  //   positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
  //   positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

  //   // Normal
  //   normals[skirtIndex * 3    ] = normals[iPositionStride + 0];
  //   normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
  //   normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];
    
  //   // UV
  //   uv[skirtIndex * 2    ] = iZ / (segments - 1);
  //   uv[skirtIndex * 2 + 1] = iX / (segments - 1);

  //   // Index
  //   if (iX < segments - 1) {
  //     const a = iPosition;
  //     const b = iPosition + 1;
  //     const c = skirtIndex;
  //     const d = skirtIndex + 1;

  //     const iIndexStride = indicesSkirtIndex * 6;
  //     indices[iIndexStride    ] = b;
  //     indices[iIndexStride + 1] = d;
  //     indices[iIndexStride + 2] = a;

  //     indices[iIndexStride + 3] = c;
  //     indices[iIndexStride + 4] = a;
  //     indices[iIndexStride + 5] = d;

  //     indicesSkirtIndex ++;
  //   }

  //   skirtIndex ++;
  // }
  
  // // South (positive Z)
  // for (let iX = 0; iX < segments; iX++) {
  //   const iZ = segments - 1;
  //   const iPosition = iZ * segments + iX;
  //   const iPositionStride = iPosition * 3;

  //   // Position
  //   positions[skirtIndex * 3    ] = positions[iPositionStride + 0];
  //   positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
  //   positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

  //   // Normal
  //   normals[skirtIndex * 3    ] = normals[iPositionStride + 0];
  //   normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
  //   normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];
    
  //   // UV
  //   uv[skirtIndex * 2    ] = iZ / (segments - 1);
  //   uv[skirtIndex * 2 + 1] = iX / (segments - 1);

  //   // Index
  //   if(iX < segments - 1) {
  //     const a = iPosition;
  //     const b = iPosition + 1;
  //     const c = skirtIndex;
  //     const d = skirtIndex + 1;

  //     const iIndexStride = indicesSkirtIndex * 6;
  //     indices[iIndexStride    ] = a;
  //     indices[iIndexStride + 1] = c;
  //     indices[iIndexStride + 2] = b;

  //     indices[iIndexStride + 3] = d;
  //     indices[iIndexStride + 4] = b;
  //     indices[iIndexStride + 5] = c;

  //     indicesSkirtIndex ++;
  //   }
    
  //   skirtIndex ++;
  // }

  // // West (negative X)
  // for (let iZ = 0; iZ < segments; iZ++) {
  //   const iX = 0;
  //   const iPosition = (iZ * segments + iX);
  //   const iPositionStride = iPosition * 3;

  //   // Position
  //   positions[skirtIndex * 3    ] = positions[iPositionStride + 0];
  //   positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
  //   positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

  //   // Normal
  //   normals[skirtIndex * 3    ] = normals[iPositionStride + 0];
  //   normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
  //   normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];
    
  //   // UV
  //   uv[skirtIndex * 2    ] = iZ / (segments - 1);
  //   uv[skirtIndex * 2 + 1] = iX;

  //   // Index
  //   if(iZ < segments - 1) {
  //     const a = iPosition;
  //     const b = iPosition + segments;
  //     const c = skirtIndex;
  //     const d = skirtIndex + 1;

  //     const iIndexStride = indicesSkirtIndex * 6;
  //     indices[iIndexStride    ] = a;
  //     indices[iIndexStride + 1] = c;
  //     indices[iIndexStride + 2] = b;

  //     indices[iIndexStride + 3] = d;
  //     indices[iIndexStride + 4] = b;
  //     indices[iIndexStride + 5] = c;

  //     indicesSkirtIndex ++;
  //   }

  //   skirtIndex ++;
  // }

  // for (let iZ = 0; iZ < segments; iZ ++) {
  //   const iX = segments - 1;
  //   const iPosition = (iZ * segments + iX);
  //   const iPositionStride = iPosition * 3;

  //   // Position
  //   positions[skirtIndex * 3    ] = positions[iPositionStride + 0];
  //   positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
  //   positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

  //   // Normal
  //   normals[skirtIndex * 3    ] = normals[iPositionStride + 0];
  //   normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
  //   normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];
    
  //   // UV
  //   uv[skirtIndex * 2    ] = iZ / (segments - 1);
  //   uv[skirtIndex * 2 + 1] = iX / (segments - 1);

  //   // Index
  //   if(iZ < segments - 1) {
  //     const a = iPosition;
  //     const b = iPosition + segments;
  //     const c = skirtIndex;
  //     const d = skirtIndex + 1;

  //     const iIndexStride = indicesSkirtIndex * 6;
  //     indices[iIndexStride    ] = b;
  //     indices[iIndexStride + 1] = d;
  //     indices[iIndexStride + 2] = a;

  //     indices[iIndexStride + 3] = c;
  //     indices[iIndexStride + 4] = a;
  //     indices[iIndexStride + 5] = d;

  //     indicesSkirtIndex ++;
  //   }

  //   skirtIndex ++;
  // }

  // /**
  //  * Texture
  //  */
  // const texture = new Float32Array(segments * segments * 4)
  
  // // const grassPosition = [];
  // for (let iZ = 0; iZ < segments; iZ++) {
  //   for (let iX = 0; iX < segments; iX++) {
  //     const iPositionStride = (iZ * segments + iX) * 3
  //     const position = [
  //       positions[iPositionStride    ],
  //       positions[iPositionStride + 1],
  //       positions[iPositionStride + 2]
  //     ]

  //     const iNormalStride = (iZ * segments + iX) * 3
     
  //     // Final texture
  //     const iTextureStride = (iZ * segments  + iX) * 4
  //     texture[iTextureStride    ] = normals[iNormalStride    ]
  //     texture[iTextureStride + 1] = normals[iNormalStride + 1]
  //     texture[iTextureStride + 2] = normals[iNormalStride + 2]
  //     texture[iTextureStride + 3] = position[1]
  //   }
  // }


  const positionsSize = segments * segments * 3 + skirtCount * 3;
  const positionsArray = new Float32Array(positionsSize);
  const positionsStartIndex = 0; 
  const positionsEndIndex = positionsSize; 
  positionsArray.set(scratchStack.f32.subarray(positionsStartIndex, positionsEndIndex), 0);
  
  const normalsSize = segments * segments * 3 + skirtCount * 3;
  const normalsArray = new Float32Array(normalsSize);
  const normalsStartIndex = positionsEndIndex; 
  const normalsEndIndex = positionsEndIndex + normalsSize; 
  normalsArray.set(scratchStack.f32.subarray(normalsStartIndex, normalsEndIndex), 0);


  const indicesNumber = subdivisions * subdivisions;
  const indicesSize = indicesNumber * 6 + subdivisions * 4 * 6 * 4;
  const indicesArray = new Uint32Array(indicesSize);
  const indicesStartIndex = normalsEndIndex; 
  const indicesEndIndex = normalsEndIndex + indicesSize; 
  indicesArray.set(scratchStack.f32.subarray(indicesStartIndex, indicesEndIndex), 0);
  

  const textureSize = segments * segments * 4;
  const textureArray = new Float32Array(textureSize)
  const textureStartIndex = indicesEndIndex; 
  const textureEndIndex = indicesEndIndex + textureSize; 
  textureArray.set(scratchStack.f32.subarray(textureStartIndex, textureEndIndex), 0);

  const uvSize = segments * segments * 2 + skirtCount * 2;
  const uvArray = new Float32Array(uvSize);
  const uvStartIndex = textureEndIndex; 
  const uvEndIndex = textureEndIndex + uvSize; 
  uvArray.set(scratchStack.f32.subarray(uvStartIndex, uvEndIndex), 0);

  // const unitIndicesArray = new Uint32Array(indicesSize);
  // for (let i = 0; i < indicesSize; i++) {
  //   unitIndicesArray[i] = indicesArray[i];
  // }
 
  
  
  // console.log(positionsArray, positions)
  // console.log(normalsArray, normals)
  // console.log(indicesArray, indices)
  // console.log(textureArray, texture)
  // console.log(uvArray, uv)
  // Post
  postMessage({
    id: id,
    positions: positionsArray,
    normals: normalsArray,
    indices: indicesArray,
    texture: textureArray,
    uv: uvArray,
  })
}