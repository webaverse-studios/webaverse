#include "flod.h"
#include "util.h"
#include <memory>
// #include <iostream>

inline void _floodFill(int x, int y, int z, int startFace, float *ether, int minX, int maxX, int minY, int maxY, int minZ, int maxZ, unsigned char *peeks, unsigned char *seenPeeks) {
  std::unique_ptr<int[]> queue(new int[NUM_CELLS_OVERSCAN * NUM_CELLS_OVERSCAN * NUM_CELLS_OVERSCAN * 4]);
  unsigned int queueEnd = 0;

  const int index = getEtherIndex(x, y, z);
  queue[queueEnd * 4 + 0] = x;
  queue[queueEnd * 4 + 1] = y;
  queue[queueEnd * 4 + 2] = z;
  queue[queueEnd * 4 + 3] = index;
  queueEnd++;
  seenPeeks[index] = 1;

  for (unsigned int queueStart = 0; queueStart < queueEnd; queueStart++) {
    const int x = queue[queueStart * 4 + 0];
    const int y = queue[queueStart * 4 + 1];
    const int z = queue[queueStart * 4 + 2];
    const int index = queue[queueStart * 4 + 3];

    if (ether[index] >= 0) { // if empty space
      if (z == minZ && startFace != (int)PEEK_FACES::BACK) {
        peeks[PEEK_FACE_INDICES[startFace << 3 | (int)PEEK_FACES::BACK]] = 1;
      }
      if (z == maxZ && startFace != (int)PEEK_FACES::FRONT) {
        peeks[PEEK_FACE_INDICES[startFace << 3 | (int)PEEK_FACES::FRONT]] = 1;
      }
      if (x == minX && startFace != (int)PEEK_FACES::LEFT) {
        peeks[PEEK_FACE_INDICES[startFace << 3 | (int)PEEK_FACES::LEFT]] = 1;
      }
      if (x == maxX && startFace != (int)PEEK_FACES::RIGHT) {
        peeks[PEEK_FACE_INDICES[startFace << 3 | (int)PEEK_FACES::RIGHT]] = 1;
      }
      if (y == maxY && startFace != (int)PEEK_FACES::TOP) {
        peeks[PEEK_FACE_INDICES[startFace << 3 | (int)PEEK_FACES::TOP]] = 1;
      }
      if (y == minY && startFace != (int)PEEK_FACES::BOTTOM) {
        peeks[PEEK_FACE_INDICES[startFace << 3 | (int)PEEK_FACES::BOTTOM]] = 1;
      }

      for (int dx = -1; dx <= 1; dx++) {
        const int ax = x + dx;
        if (ax >= minX && ax <= maxX) {
          for (int dz = -1; dz <= 1; dz++) {
            const int az = z + dz;
            if (az >= minZ && az <= maxZ) {
              for (int dy = -1; dy <= 1; dy++) {
                const int ay = y + dy;
                if (ay >= minY && ay <= maxY) {
                  const int index = getEtherIndex(ax, ay, az);
                  if (!seenPeeks[index]) {
                    queue[queueEnd * 4 + 0] = ax;
                    queue[queueEnd * 4 + 1] = ay;
                    queue[queueEnd * 4 + 2] = az;
                    queue[queueEnd * 4 + 3] = index;
                    queueEnd++;
                    seenPeeks[index] = 1;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

void flod(float *ether, int *shift, unsigned char *peeks) {
  const int minX = shift[0] + 0;
  const int maxX = shift[0] + NUM_CELLS;
  const int minY = shift[1] + 0;
  const int maxY = shift[1] + NUM_CELLS;
  const int minZ = shift[2] + 0;
  const int maxZ = shift[2] + NUM_CELLS;

  // std::cout << "limits " << minX << ":" << maxX << ":" << minY << ":" << maxY << ":" << minZ << ":" << maxZ << "\n";

  // const geometry = geometries[i];
  // const peeks = new Uint8Array(16);
  unsigned char seenPeeks[NUM_CELLS_OVERSCAN * (NUM_CELLS_HEIGHT + 1) * NUM_CELLS_OVERSCAN];
  // const minY = i * NUM_CELLS;
  // const maxY = (i + 1) * NUM_CELLS;
  for (int x = minX; x <= maxX; x++) {
    for (int y = minY; y <= maxY; y++) {
      _floodFill(x, y, maxZ, (int)PEEK_FACES::FRONT, ether, minX, maxX, minY, maxY, minZ, maxZ, peeks, seenPeeks);
    }
  }
  for (int x = minX; x <= maxX; x++) {
    for (int y = minY; y <= maxY; y++) {
      _floodFill(x, y, minZ, (int)PEEK_FACES::BACK, ether, minX, maxX, minY, maxY, minZ, maxZ, peeks, seenPeeks);
    }
  }
  for (int z = minZ; z <= maxZ; z++) {
    for (int y = minY; y <= maxY; y++) {
      _floodFill(minX, y, z, (int)PEEK_FACES::LEFT, ether, minX, maxX, minY, maxY, minZ, maxZ, peeks, seenPeeks);
    }
  }
  for (int z = minZ; z <= maxZ; z++) {
    for (int y = minY; y <= maxY; y++) {
      _floodFill(maxX, y, z, (int)PEEK_FACES::RIGHT, ether, minX, maxX, minY, maxY, minZ, maxZ, peeks, seenPeeks);
    }
  }
  for (int x = minX; x <= maxX; x++) {
    for (int z = minZ; z <= maxZ; z++) {
      _floodFill(x, maxY, z, (int)PEEK_FACES::TOP, ether, minX, maxX, minY, maxY, minZ, maxZ, peeks, seenPeeks);
    }
  }
  for (int x = minX; x <= maxX; x++) {
    for (int z = minZ; z <= maxZ; z++) {
      _floodFill(x, minY, z, (int)PEEK_FACES::BOTTOM, ether, minX, maxX, minY, maxY, minZ, maxZ, peeks, seenPeeks);
    }
  }

  for (int startFace = 0; startFace < 6; startFace++) {
    for (int endFace = 0; endFace < 6; endFace++) {
      if (endFace != startFace) {
        if (peeks[PEEK_FACE_INDICES[startFace << 3 | endFace]] == 1) {
          peeks[PEEK_FACE_INDICES[endFace << 3 | startFace]] = 1;

          for (int crossFace = 0; crossFace < 6; crossFace++) {
            if (crossFace != startFace && crossFace != endFace) {
              if (peeks[PEEK_FACE_INDICES[startFace << 3 | crossFace]] == 1) {
                peeks[PEEK_FACE_INDICES[crossFace << 3 | startFace]] = 1;
                peeks[PEEK_FACE_INDICES[crossFace << 3 | endFace]] = 1;
                peeks[PEEK_FACE_INDICES[endFace << 3 | crossFace]] = 1;
              } else if (peeks[PEEK_FACE_INDICES[endFace << 3 | crossFace]] == 1) {
                peeks[PEEK_FACE_INDICES[crossFace << 3 | startFace]] = 1;
                peeks[PEEK_FACE_INDICES[crossFace << 3 | endFace]] = 1;
                peeks[PEEK_FACE_INDICES[startFace << 3 | crossFace]] = 1;
              }
            }
          }
        }
      }
    }
  }
}
