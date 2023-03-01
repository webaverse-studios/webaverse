
const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;
const F4 = (Math.sqrt(5.0) - 1.0) / 4.0;
const G4 = (5.0 - Math.sqrt(5.0)) / 20.0;
const grad3 = new Float32Array([
    1, 1, 0,
    -1, 1, 0,
    1, -1, 0,
    -1, -1, 0,
    1, 0, 1,
    -1, 0, 1,
    1, 0, -1,
    -1, 0, -1,
    0, 1, 1,
    0, -1, 1,
    0, 1, -1,
    0, -1, -1
]);
const grad4 = new Float32Array([
    0, 1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1,
    0, -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1,
    1, 0, 1, 1, 1, 0, 1, -1, 1, 0, -1, 1, 1, 0, -1, -1,
    -1, 0, 1, 1, -1, 0, 1, -1, -1, 0, -1, 1, -1, 0, -1, -1,
    1, 1, 0, 1, 1, 1, 0, -1, 1, -1, 0, 1, 1, -1, 0, -1,
    -1, 1, 0, 1, -1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1,
    1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0,
    -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0
]);
 
class SimplexNoise {
  /**
   * Creates a new `SimplexNoise` instance.
   * This involves some setup. You can save a few cpu cycles by reusing the same instance.
   * @param randomOrSeed A random number generator or a seed (string|number).
   * Defaults to Math.random (random irreproducible initialization).
   */
  constructor(randomOrSeed = Math.random) {
    const random = typeof randomOrSeed == 'function' ? randomOrSeed : alea(randomOrSeed);
    this.p = buildPermutationTable(random);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }
  /**
   * Samples the noise field in 2 dimensions
   * @param x
   * @param y
   * @returns a number in the interval [-1, 1]
   */
  noise2D(x, y) {
    const permMod12 = this.permMod12;
    const perm = this.perm;
    let n0 = 0; // Noise contributions from the three corners
    let n1 = 0;
    let n2 = 0;
    // Skew the input space to determine which simplex cell we're in
    const s = (x + y) * F2; // Hairy factor for 2D
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t; // Unskew the cell origin back to (x,y) space
    const Y0 = j - t;
    const x0 = x - X0; // The x,y distances from the cell origin
    const y0 = y - Y0;
    // For the 2D case, the simplex shape is an equilateral triangle.
    // Determine which simplex we are in.
    let i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
    else {
      i1 = 0;
      j1 = 1;
    } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
    // c = (3-sqrt(3))/6
    const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
    const y2 = y0 - 1.0 + 2.0 * G2;
    // Work out the hashed gradient indices of the three simplex corners
    const ii = i & 255;
    const jj = j & 255;
    // Calculate the contribution from the three corners
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = permMod12[ii + perm[jj]] * 3;
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
    }
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1,1].
    return 70.0 * (n0 + n1 + n2);
  }
  /**
   * Samples the noise field in 3 dimensions
   * @param x
   * @param y
   * @param z
   * @returns a number in the interval [-1, 1]
   */
  noise3D(x, y, z) {
    const permMod12 = this.permMod12;
    const perm = this.perm;
    let n0, n1, n2, n3; // Noise contributions from the four corners
    // Skew the input space to determine which simplex cell we're in
    const s = (x + y + z) * F3; // Very nice and simple skew factor for 3D
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const X0 = i - t; // Unskew the cell origin back to (x,y,z) space
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = x - X0; // The x,y,z distances from the cell origin
    const y0 = y - Y0;
    const z0 = z - Z0;
    // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
    // Determine which simplex we are in.
    let i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
    let i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } // X Y Z order
      else if (x0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } // X Z Y order
      else {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } // Z X Y order
    }
    else { // x0<y0
      if (y0 < z0) {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } // Z Y X order
      else if (x0 < z0) {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } // Y Z X order
      else {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } // Y X Z order
    }
    // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
    // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
    // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
    // c = 1/6.
    const x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;
    // Work out the hashed gradient indices of the four simplex corners
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    // Calculate the contribution from the four corners
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0)
      n0 = 0.0;
    else {
      const gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0)
      n1 = 0.0;
    else {
      const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0)
      n2 = 0.0;
    else {
      const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0)
      n3 = 0.0;
    else {
      const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
      t3 *= t3;
      n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
    }
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to stay just inside [-1,1]
    return 32.0 * (n0 + n1 + n2 + n3);
  }
  /**
   * Samples the noise field in 4 dimensions
   * @param x
   * @param y
   * @param z
   * @returns a number in the interval [-1, 1]
   */
  noise4D(x, y, z, w) {
    const perm = this.perm;
    let n0, n1, n2, n3, n4; // Noise contributions from the five corners
    // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
    const s = (x + y + z + w) * F4; // Factor for 4D skewing
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const l = Math.floor(w + s);
    const t = (i + j + k + l) * G4; // Factor for 4D unskewing
    const X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
    const Y0 = j - t;
    const Z0 = k - t;
    const W0 = l - t;
    const x0 = x - X0; // The x,y,z,w distances from the cell origin
    const y0 = y - Y0;
    const z0 = z - Z0;
    const w0 = w - W0;
    // For the 4D case, the simplex is a 4D shape I won't even try to describe.
    // To find out which of the 24 possible simplices we're in, we need to
    // determine the magnitude ordering of x0, y0, z0 and w0.
    // Six pair-wise comparisons are performed between each possible pair
    // of the four coordinates, and the results are used to rank the numbers.
    let rankx = 0;
    let ranky = 0;
    let rankz = 0;
    let rankw = 0;
    if (x0 > y0)
        rankx++;
    else
        ranky++;
    if (x0 > z0)
        rankx++;
    else
        rankz++;
    if (x0 > w0)
        rankx++;
    else
        rankw++;
    if (y0 > z0)
        ranky++;
    else
        rankz++;
    if (y0 > w0)
        ranky++;
    else
        rankw++;
    if (z0 > w0)
        rankz++;
    else
        rankw++;
    // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
    // Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
    // impossible. Only the 24 indices which have non-zero entries make any sense.
    // We use a thresholding to set the coordinates in turn from the largest magnitude.
    // Rank 3 denotes the largest coordinate.
    // Rank 2 denotes the second largest coordinate.
    // Rank 1 denotes the second smallest coordinate.
    // The integer offsets for the second simplex corner
    const i1 = rankx >= 3 ? 1 : 0;
    const j1 = ranky >= 3 ? 1 : 0;
    const k1 = rankz >= 3 ? 1 : 0;
    const l1 = rankw >= 3 ? 1 : 0;
    // The integer offsets for the third simplex corner
    const i2 = rankx >= 2 ? 1 : 0;
    const j2 = ranky >= 2 ? 1 : 0;
    const k2 = rankz >= 2 ? 1 : 0;
    const l2 = rankw >= 2 ? 1 : 0;
    // The integer offsets for the fourth simplex corner
    const i3 = rankx >= 1 ? 1 : 0;
    const j3 = ranky >= 1 ? 1 : 0;
    const k3 = rankz >= 1 ? 1 : 0;
    const l3 = rankw >= 1 ? 1 : 0;
    // The fifth corner has all coordinate offsets = 1, so no need to compute that.
    const x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
    const y1 = y0 - j1 + G4;
    const z1 = z0 - k1 + G4;
    const w1 = w0 - l1 + G4;
    const x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
    const y2 = y0 - j2 + 2.0 * G4;
    const z2 = z0 - k2 + 2.0 * G4;
    const w2 = w0 - l2 + 2.0 * G4;
    const x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
    const y3 = y0 - j3 + 3.0 * G4;
    const z3 = z0 - k3 + 3.0 * G4;
    const w3 = w0 - l3 + 3.0 * G4;
    const x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
    const y4 = y0 - 1.0 + 4.0 * G4;
    const z4 = z0 - 1.0 + 4.0 * G4;
    const w4 = w0 - 1.0 + 4.0 * G4;
    // Work out the hashed gradient indices of the five simplex corners
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const ll = l & 255;
    // Calculate the contribution from the five corners
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
    if (t0 < 0)
      n0 = 0.0;
    else {
      const gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
      t0 *= t0;
      n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0 + 1] * y0 + grad4[gi0 + 2] * z0 + grad4[gi0 + 3] * w0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
    if (t1 < 0)
      n1 = 0.0;
    else {
      const gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
      t1 *= t1;
      n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1 + 1] * y1 + grad4[gi1 + 2] * z1 + grad4[gi1 + 3] * w1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
    if (t2 < 0)
      n2 = 0.0;
    else {
      const gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
      t2 *= t2;
      n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2 + 1] * y2 + grad4[gi2 + 2] * z2 + grad4[gi2 + 3] * w2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
    if (t3 < 0)
      n3 = 0.0;
    else {
      const gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
      t3 *= t3;
      n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3 + 1] * y3 + grad4[gi3 + 2] * z3 + grad4[gi3 + 3] * w3);
    }
    let t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
    if (t4 < 0)
      n4 = 0.0;
    else {
      const gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
      t4 *= t4;
      n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4 + 1] * y4 + grad4[gi4 + 2] * z4 + grad4[gi4 + 3] * w4);
    }
    // Sum up and scale the result to cover the range [-1,1]
    return 27.0 * (n0 + n1 + n2 + n3 + n4);
  }
}

/**
 * Builds a random permutation table.
 * This is exported only for (internal) testing purposes.
 * Do not rely on this export.
 * @private
 */
function buildPermutationTable(random) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    p[i] = i;
  }
  for (let i = 0; i < 255; i++) {
    const r = i + ~~(random() * (256 - i));
    const aux = p[i];
    p[i] = p[r];
    p[r] = aux;
  }
  return p;
}
/*
The ALEA PRNG and masher code used by simplex-noise.js
is based on code by Johannes Baagøe, modified by Jonas Wagner.
See alea.md for the full license.
*/
function alea(seed) {
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let c = 1;
  const mash = masher();
  s0 = mash(' ');
  s1 = mash(' ');
  s2 = mash(' ');
  s0 -= mash(seed);
  if (s0 < 0) {
    s0 += 1;
  }
  s1 -= mash(seed);
  if (s1 < 0) {
    s1 += 1;
  }
  s2 -= mash(seed);
  if (s2 < 0) {
    s2 += 1;
  }
  return function () {
    const t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
    s0 = s1;
    s1 = s2;
    return s2 = t - (c = t | 0);
  };
}
function masher() {
  let n = 0xefc8249d;
  return function (data) {
    data = data.toString();
    for (let i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        let h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };
}

let elevationRandom = null

const linearStep = (edgeMin, edgeMax, value) => {
  return Math.max(0.0, Math.min(1.0, (value - edgeMin) / (edgeMax - edgeMin)));
}

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

onmessage = function(event) {
  const id = event.data.id;
  const size = event.data.size;
  const baseX = event.data.x;
  const baseZ = event.data.z;
  const seed = event.data.seed;
  const subdivisions = event.data.subdivisions;
  const lacunarity = event.data.lacunarity;
  const persistence = event.data.persistence;
  const iterations = event.data.iterations;
  const baseFrequency = event.data.baseFrequency;
  const baseAmplitude = event.data.baseAmplitude;
  const power = event.data.power;
  const elevationOffset = event.data.elevationOffset;
  const iterationsOffsets = event.data.iterationsOffsets;

  
  const segments = subdivisions + 1;
  elevationRandom = new SimplexNoise(seed);
  const grassRandom = new SimplexNoise(seed);

  /**
   * Elevation
   */
  const overflowElevations = new Float32Array((segments + 1) * (segments + 1)); // Bigger to calculate normals more accurately
  const elevations = new Float32Array(segments * segments);
  
  for(let iX = 0; iX < segments + 1; iX++) {
    const x = baseX + (iX / subdivisions - 0.5) * size;

    for(let iZ = 0; iZ < segments + 1; iZ++) {
      const z = baseZ + (iZ / subdivisions - 0.5) * size;
      const elevation = getElevation(x, z, lacunarity, persistence, iterations, baseFrequency, baseAmplitude, power, elevationOffset, iterationsOffsets);

      const i = iZ * (segments + 1) + iX;
      overflowElevations[i] = elevation;

      if(iX < segments && iZ < segments) {
        const i = iZ * segments + iX;
        elevations[i] = elevation;
      }
    }
  }

  /**
   * Positions
   */
  const skirtCount = subdivisions * 4 + 4;
  const positions = new Float32Array(segments * segments * 3 + skirtCount * 3);

  for(let iZ = 0; iZ < segments; iZ++) {
    const z = baseZ + (iZ / subdivisions - 0.5) * size;
    for(let iX = 0; iX < segments; iX++) {
      const x = baseX + (iX / subdivisions - 0.5) * size;

      const elevation = elevations[iZ * segments + iX];

      const iStride = (iZ * segments + iX) * 3;
      positions[iStride    ] = x;
      positions[iStride + 1] = elevation;
      positions[iStride + 2] = z;
    }
  }
  
  /**
   * Normals
   */
  const normals = new Float32Array(segments * segments * 3 + skirtCount * 3);
  
  const interSegmentX = - size / subdivisions;
  const interSegmentZ = - size / subdivisions;

  for (let iZ = 0; iZ < segments; iZ++) {
    for (let iX = 0; iX < segments; iX++) {
      // Indexes
      const iOverflowStride = iZ * (segments + 1) + iX;

      // Elevations
      const currentElevation = overflowElevations[iOverflowStride];
      const neighbourXElevation = overflowElevations[iOverflowStride + 1];
      const neighbourZElevation = overflowElevations[iOverflowStride + segments + 1];

      // Deltas
      const deltaX = [
          interSegmentX,
          currentElevation - neighbourXElevation,
          0
      ]

      const deltaZ = [
          0,
          currentElevation - neighbourZElevation,
          interSegmentZ
      ]

      // Normal
      let normal = [0, 0, 0];
      function cross(out, a, b) {
        let ax = a[0],
          ay = a[1],
          az = a[2];
        let bx = b[0],
          by = b[1],
          bz = b[2];
      
        out[0] = ay * bz - az * by;
        out[1] = az * bx - ax * bz;
        out[2] = ax * by - ay * bx;
        return out;
      }
      function normalize(out, a) {
        let x = a[0];
        let y = a[1];
        let z = a[2];
        let len = x * x + y * y + z * z;
        if (len > 0) {
          //TODO: evaluate use of glm_invsqrt here?
          len = 1 / Math.sqrt(len);
        }
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
        return out;
      }
      normal = cross(normal, deltaZ, deltaX);
      normal = normalize(normal, normal);

      const iStride = (iZ * segments + iX) * 3;
      normals[iStride    ] = normal[0];
      normals[iStride + 1] = normal[1];
      normals[iStride + 2] = normal[2];
    }
  }

  /**
   * UV
   */
  const uv = new Float32Array(segments * segments * 2 + skirtCount * 2);

  for (let iZ = 0; iZ < segments; iZ++) {
    for (let iX = 0; iX < segments; iX++) {
      const iStride = (iZ * segments + iX) * 2;
      uv[iStride    ] = iX / (segments - 1);
      uv[iStride + 1] = iZ / (segments - 1);
    }
  }

  /**
   * Indices
   */
  const indicesCount = subdivisions * subdivisions;
  const indices = new (indicesCount < 65535 ? Uint16Array : Uint32Array)(indicesCount * 6 + subdivisions * 4 * 6 * 4);
  
  for (let iZ = 0; iZ < subdivisions; iZ++) {
    for (let iX = 0; iX < subdivisions; iX++) {
      const row = subdivisions + 1;
      const a = iZ * row + iX;
      const b = iZ * row + (iX + 1);
      const c = (iZ + 1) * row + iX;
      const d = (iZ + 1) * row + (iX + 1);

      const iStride = (iZ * subdivisions + iX) * 6;
      indices[iStride    ] = a;
      indices[iStride + 1] = d;
      indices[iStride + 2] = b;

      indices[iStride + 3] = d;
      indices[iStride + 4] = a;
      indices[iStride + 5] = c;
    }
  }
  
  /**
   * Skirt
   */
  let skirtIndex = segments * segments;
  let indicesSkirtIndex = segments * segments;

  // North (negative Z)
  for(let iX = 0; iX < segments; iX++) {
    const iZ = 0;
    const iPosition = iZ * segments + iX;
    const iPositionStride = iPosition * 3;

    // Position
    positions[skirtIndex * 3    ] = positions[iPositionStride + 0];
    positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
    positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

    // Normal
    normals[skirtIndex * 3    ] = normals[iPositionStride + 0];
    normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
    normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];
    
    // UV
    uv[skirtIndex * 2    ] = iZ / (segments - 1);
    uv[skirtIndex * 2 + 1] = iX / (segments - 1);

    // Index
    if (iX < segments - 1) {
      const a = iPosition;
      const b = iPosition + 1;
      const c = skirtIndex;
      const d = skirtIndex + 1;

      const iIndexStride = indicesSkirtIndex * 6;
      indices[iIndexStride    ] = b;
      indices[iIndexStride + 1] = d;
      indices[iIndexStride + 2] = a;

      indices[iIndexStride + 3] = c;
      indices[iIndexStride + 4] = a;
      indices[iIndexStride + 5] = d;

      indicesSkirtIndex ++;
    }

    skirtIndex ++;
  }
  
  // South (positive Z)
  for (let iX = 0; iX < segments; iX++) {
    const iZ = segments - 1;
    const iPosition = iZ * segments + iX;
    const iPositionStride = iPosition * 3;

    // Position
    positions[skirtIndex * 3    ] = positions[iPositionStride + 0];
    positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
    positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

    // Normal
    normals[skirtIndex * 3    ] = normals[iPositionStride + 0];
    normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
    normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];
    
    // UV
    uv[skirtIndex * 2    ] = iZ / (segments - 1);
    uv[skirtIndex * 2 + 1] = iX / (segments - 1);

    // Index
    if(iX < segments - 1) {
      const a = iPosition;
      const b = iPosition + 1;
      const c = skirtIndex;
      const d = skirtIndex + 1;

      const iIndexStride = indicesSkirtIndex * 6;
      indices[iIndexStride    ] = a;
      indices[iIndexStride + 1] = c;
      indices[iIndexStride + 2] = b;

      indices[iIndexStride + 3] = d;
      indices[iIndexStride + 4] = b;
      indices[iIndexStride + 5] = c;

      indicesSkirtIndex ++;
    }
    
    skirtIndex ++;
  }

  // West (negative X)
  for (let iZ = 0; iZ < segments; iZ++) {
    const iX = 0;
    const iPosition = (iZ * segments + iX);
    const iPositionStride = iPosition * 3;

    // Position
    positions[skirtIndex * 3    ] = positions[iPositionStride + 0];
    positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
    positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

    // Normal
    normals[skirtIndex * 3    ] = normals[iPositionStride + 0];
    normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
    normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];
    
    // UV
    uv[skirtIndex * 2    ] = iZ / (segments - 1);
    uv[skirtIndex * 2 + 1] = iX;

    // Index
    if(iZ < segments - 1) {
      const a = iPosition;
      const b = iPosition + segments;
      const c = skirtIndex;
      const d = skirtIndex + 1;

      const iIndexStride = indicesSkirtIndex * 6;
      indices[iIndexStride    ] = a;
      indices[iIndexStride + 1] = c;
      indices[iIndexStride + 2] = b;

      indices[iIndexStride + 3] = d;
      indices[iIndexStride + 4] = b;
      indices[iIndexStride + 5] = c;

      indicesSkirtIndex ++;
    }

    skirtIndex ++;
  }

  for (let iZ = 0; iZ < segments; iZ ++) {
    const iX = segments - 1;
    const iPosition = (iZ * segments + iX);
    const iPositionStride = iPosition * 3;

    // Position
    positions[skirtIndex * 3    ] = positions[iPositionStride + 0];
    positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
    positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

    // Normal
    normals[skirtIndex * 3    ] = normals[iPositionStride + 0];
    normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
    normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];
    
    // UV
    uv[skirtIndex * 2    ] = iZ / (segments - 1);
    uv[skirtIndex * 2 + 1] = iX / (segments - 1);

    // Index
    if(iZ < segments - 1) {
      const a = iPosition;
      const b = iPosition + segments;
      const c = skirtIndex;
      const d = skirtIndex + 1;

      const iIndexStride = indicesSkirtIndex * 6;
      indices[iIndexStride    ] = b;
      indices[iIndexStride + 1] = d;
      indices[iIndexStride + 2] = a;

      indices[iIndexStride + 3] = c;
      indices[iIndexStride + 4] = a;
      indices[iIndexStride + 5] = d;

      indicesSkirtIndex ++;
    }

    skirtIndex ++;
  }

  /**
   * Texture
   */
  const texture = new Float32Array(segments * segments * 4)
  const weights = new Float32Array(segments * segments * 3)
  
  // const grassPosition = [];
  for (let iZ = 0; iZ < segments; iZ++) {
    for (let iX = 0; iX < segments; iX++) {
      const iPositionStride = (iZ * segments + iX) * 3
      const position = [
        positions[iPositionStride    ],
        positions[iPositionStride + 1],
        positions[iPositionStride + 2]
      ]

      // Normal
      const iNormalStride = (iZ * segments + iX) * 3
      // const normal = [
      //     normals[iNormalStride    ],
      //     normals[iNormalStride + 1],
      //     normals[iNormalStride + 2]
      // ]

      

      // Weight
      const maxHeight = 15;
      const minHeight = -15;
      const posY = positions[iPositionStride + 1];
      const heightWeight = Math.max(0, Math.min(1, (posY - minHeight) / (maxHeight - minHeight)));

      const slopeWeight = Math.max(0, Math.min(1, 1 - normals[iNormalStride + 1]));

      const isBeach = posY < 1.2;
      const isMountain = posY > 10;
      const grassFrequency = baseFrequency;
      const noiseScale = isBeach || isMountain ? 0.02 : 6;
      let grassNoise = grassRandom.noise2D(position[0] * grassFrequency, position[2] * grassFrequency) 
      

      const grassWeight = Math.max(0, Math.min(1, (1 - slopeWeight) * (heightWeight + grassNoise * noiseScale)));
      const rockWeight = isMountain ? 1 : Math.max(0, Math.min(1, slopeWeight * heightWeight));
      const dirtWeight = isBeach ? 1.0 : Math.max(0, Math.min(1, (1 - heightWeight)));

      const iWeightStride = (iZ * segments + iX) * 3
      weights[iWeightStride    ] = grassWeight;
      weights[iWeightStride + 1] = rockWeight;
      weights[iWeightStride + 2] = dirtWeight;

      // Final texture
      const iTextureStride = (iZ * segments  + iX) * 4
      texture[iTextureStride    ] = normals[iNormalStride    ]
      texture[iTextureStride + 1] = normals[iNormalStride + 1]
      texture[iTextureStride + 2] = normals[iNormalStride + 2]
      texture[iTextureStride + 3] = position[1]
    }
  }
  
  // Post
  postMessage({
    id: id,
    positions: positions,
    normals: normals,
    indices: indices,
    texture: texture,
    uv: uv,
    weight: weights,
  })
}