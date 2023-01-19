#ifndef UTIL_H
#define UTIL_H

#include <cmath>

const int NUM_CELLS = 16;
const int OVERSCAN = 1;
const int NUM_CELLS_OVERSCAN = NUM_CELLS + OVERSCAN;
const int NUM_CELLS_HEIGHT = 128;
const int NUM_CHUNKS_HEIGHT = NUM_CELLS_HEIGHT / NUM_CELLS;
const int NUM_CELLS_HALF = NUM_CELLS / 2;
const float NUM_CELLS_CUBE = sqrt((float)NUM_CELLS_HALF * (float)NUM_CELLS_HALF * 3.0f);
const int NUM_CELLS_OVERSCAN_Y = NUM_CELLS_HEIGHT + OVERSCAN;
const int NUM_RENDER_GROUPS = NUM_CHUNKS_HEIGHT / 2;
const int HEIGHTFIELD_DEPTH = 8;
const int HOLE_SIZE = 2;
const int NUM_SLOTS = 64 * 64;
const int BLOCK_BUFFER_SIZE = 16 * 128 * 16 * 4;
const int GEOMETRY_BUFFER_SIZE = 100 * 1024;
const int OBJECT_SLOTS = 64 * 64;
const int NUM_VOXELS_CHUNKS_HEIGHT = BLOCK_BUFFER_SIZE / 4 / NUM_CHUNKS_HEIGHT;

int mod(int value, int divisor);
int getCoordOverscanIndex(int x, int z);
int getChunkIndex(int x, int z);
int getEtherIndex(int x, int y, int z);
int getBlockIndex(int x, int y, int z);
int getLightsArrayIndex(int x, int z);
int getLightsIndex(int x, int y, int z);
int getTopHeightfieldIndex(int x, int z);
int getStaticHeightfieldIndex(int x, int z);

enum class PEEK_FACES : int {
  FRONT = 0,
  BACK,
  LEFT,
  RIGHT,
  TOP,
  BOTTOM,
  NONE
};
extern int PEEK_FACE_INDICES[8 * 8];

void initUtil();

#endif
