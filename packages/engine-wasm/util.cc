#include "util.h"

int mod(int value, int divisor) {
  int n = value % divisor;
  return n < 0 ? (divisor + n) : n;
}
int getCoordOverscanIndex(int x, int z) {
  return x + z * NUM_CELLS_OVERSCAN;
}
int getChunkIndex(int x, int z) {
  return (mod(x, 0xFFFF) << 16) | mod(z, 0xFFFF);
}
int getEtherIndex(int x, int y, int z) {
  return x + (z * NUM_CELLS_OVERSCAN) + (y * NUM_CELLS_OVERSCAN * NUM_CELLS_OVERSCAN);
}
int getBlockIndex(int x, int y, int z) {
  const int ay = y / 16;
  y = y - ay * 16;
  return (ay * (BLOCK_BUFFER_SIZE / 4 / (128 / 16))) + x + y * 16 + z * 16 * 16;
}
int getLightsArrayIndex(int x, int z) {
  return x + z * 3;
}
int getLightsIndex(int x, int y, int z) {
  return x + y * NUM_CELLS_OVERSCAN + z * NUM_CELLS_OVERSCAN * (NUM_CELLS_HEIGHT + 1);
}
int getTopHeightfieldIndex(int x, int z) {
  return (x + (z * NUM_CELLS_OVERSCAN)) * HEIGHTFIELD_DEPTH;
}
int getStaticHeightfieldIndex(int x, int z) {
  return x + (z * NUM_CELLS_OVERSCAN);
}

int PEEK_FACE_INDICES[8 * 8];

void initUtil() {
  for (int i = 0; i < 8 * 8; i++) {
    PEEK_FACE_INDICES[i] = 0xFF;
  }

  int peekIndex = 0;
  for (int i = 0; i < 6; i++) {
    for (int j = 0; j < 6; j++) {
      if (i != j) {
        int otherEntry = PEEK_FACE_INDICES[j << 3 | i];
        PEEK_FACE_INDICES[i << 3 | j] = otherEntry != 0xFF ? otherEntry : peekIndex++;
      }
    }
  }
}
