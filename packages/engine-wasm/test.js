const tssl = require('./build/Release/tssl');

// void tesselate(unsigned int *voxels, int dims[3], unsigned char *transparentVoxels, unsigned char *translucentVoxels, float *faceUvs, float *positions, float *uvs, unsigned char *ssaos, unsigned int &positionIndex, unsigned int &uvIndex, unsigned int &ssaoIndex);

const NUM_CELLS = 16;
// const NUM_CELLS_OVERSCAN = NUM_CELLS + 1;

const _getBlockIndex = (x, y, z) => x + (y * NUM_CELLS) + (z * NUM_CELLS * NUM_CELLS);

const voxels = new Uint32Array(NUM_CELLS * NUM_CELLS * NUM_CELLS);
const dims = [NUM_CELLS, NUM_CELLS, NUM_CELLS];
const transparentVoxels = new Uint8Array(NUM_CELLS * NUM_CELLS * NUM_CELLS);
const translucentVoxels = new Uint8Array(NUM_CELLS * NUM_CELLS * NUM_CELLS);
const faceUvs = new Uint8Array(256 * 6 * 4);
const positions = new Float32Array(500 * 1024);
const uvs = new Float32Array(500 * 1024);
const ssaos = new Uint8Array(500 * 1024);

voxels[_getBlockIndex(4, 4, 4)] = 1;

/* const ether = new Float32Array(NUM_CELLS_OVERSCAN * NUM_CELLS_OVERSCAN * NUM_CELLS_OVERSCAN);
ether.fill(1);
ether[100] = -1; */

const result = tssl(voxels, dims, transparentVoxels, translucentVoxels, faceUvs, positions, uvs, ssaos);

console.log(result);
