#include "util.h"
#include "vector.h"
#include <cmath>
// #include <iostream>

void handleHeightfieldPoint(const Vec &point, float *staticHeightfield) {
  const int x = (int)std::floor(point.x);
  const float y = point.y;
  const int z = (int)std::floor(point.z);

  const unsigned int staticheightfieldIndex = getStaticHeightfieldIndex(x, z);
  if (y > staticHeightfield[staticheightfieldIndex]) {
    staticHeightfield[staticheightfieldIndex] = y;
  }
}

void genHeightfield(float *positions, unsigned int *indices, unsigned int numIndices, float *staticHeightfield) {
  for (unsigned int i = 0; i < NUM_CELLS_OVERSCAN * NUM_CELLS_OVERSCAN; i++) {
    staticHeightfield[i] = -1024.0f;
  }

  for (unsigned int baseIndex = 0; baseIndex < numIndices; baseIndex += 3) {
    const unsigned int ia = indices[baseIndex + 0] * 3;
    const unsigned int ib = indices[baseIndex + 1] * 3;
    const unsigned int ic = indices[baseIndex + 2] * 3;
    Tri localTriangle(
      Vec(positions[ia + 0], positions[ia + 1], positions[ia + 2]),
      Vec(positions[ib + 0], positions[ib + 1], positions[ib + 2]),
      Vec(positions[ic + 0], positions[ic + 1], positions[ic + 2])
    );
    if (localTriangle.normal().y > 0) {
      handleHeightfieldPoint(localTriangle.a, staticHeightfield);
      handleHeightfieldPoint(localTriangle.b, staticHeightfield);
      handleHeightfieldPoint(localTriangle.c, staticHeightfield);
    }
  }
}

void genBlockfield(unsigned int *blocks, unsigned char *blockfield) {
  for (unsigned int chunkIndex = 0; chunkIndex < NUM_CHUNKS_HEIGHT; chunkIndex++) {
    unsigned int *voxels = blocks + (chunkIndex * NUM_VOXELS_CHUNKS_HEIGHT);
    unsigned char *voxelsField = blockfield + (chunkIndex * NUM_VOXELS_CHUNKS_HEIGHT);

    unsigned int index = 0;
    for (unsigned int z = 0; z < NUM_CELLS; z++) {
      for (unsigned int y = 0; y < NUM_CELLS; y++) {
        for (unsigned int x = 0; x < NUM_CELLS; x++) {
          voxelsField[index] = (unsigned char)(voxels[index] != 0);
          index++;
        }
      }
    }
  }
}
