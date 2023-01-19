#include "hash.h"
#include "util.h"
#include "vector.h"
#include <cmath>
#include <queue>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>
// #include <iostream>

struct CullQueueEntry {
  int x;
  int y;
  int z;
  int enterFace;
};
struct TerrainMapChunkMesh {
  unsigned char *peeks;
  int landStart;
  int landCount;
  int waterStart;
  int waterCount;
  int lavaStart;
  int lavaCount;
  bool visible;
};
struct TerrainMapChunkCoord {
  int x;
  int z;
  int distance;

  bool operator<(const TerrainMapChunkCoord &mapChunkCoord) const {
    return this->distance < mapChunkCoord.distance;
  }
  bool operator==(const TerrainMapChunkCoord &mapChunkCoord) const {
    return this->x == mapChunkCoord.x && this->z == mapChunkCoord.z;
  }
};
namespace std {

  template <>
  struct hash<CullQueueEntry>
  {
    std::size_t operator()(const CullQueueEntry& k) const
    {
      return (k.x & 0xFF) | ((k.y & 0xFF) << 8) | ((k.z & 0xFF) << 16) | ((k.enterFace & 0xFF) << 24);
    }
  };

}
bool operator==(const CullQueueEntry& lhs, const CullQueueEntry& rhs) {
  return lhs.x == rhs.x && lhs.y == rhs.y && lhs.z == rhs.z && lhs.enterFace == rhs.enterFace;
}

struct PeekFace {
  int exitFace;
  int enterFace;
  int x;
  int y;
  int z;
};
PeekFace peekFaceSpecs[] = {
  {(int)PEEK_FACES::BACK, (int)PEEK_FACES::FRONT, 0, 0, -1},
  {(int)PEEK_FACES::FRONT, (int)PEEK_FACES::BACK, 0, 0, 1},
  {(int)PEEK_FACES::LEFT, (int)PEEK_FACES::RIGHT, -1, 0, 0},
  {(int)PEEK_FACES::RIGHT, (int)PEEK_FACES::LEFT, 1, 0, 0},
  {(int)PEEK_FACES::TOP, (int)PEEK_FACES::BOTTOM, 0, 1, 0},
  {(int)PEEK_FACES::BOTTOM, (int)PEEK_FACES::TOP, 0, -1, 0},
};
const unsigned int numPeekFaceSpecs = sizeof(peekFaceSpecs) / sizeof(peekFaceSpecs[0]);

void cullTerrain(float *hmdPosition, float *projectionMatrix, float *matrixWorldInverse, bool frustumCulled, int *mapChunkMeshes, unsigned int numMapChunkMeshes, int *groups, int *groups2, unsigned int &groupIndex, unsigned int &groupIndex2) {
  const int ox = (int)hmdPosition[0] >> 4;
  const int oy = std::min<int>(std::max<int>(std::floor((int)hmdPosition[1] >> 4), 0), NUM_CHUNKS_HEIGHT - 1);
  const int oz = std::floor((int)hmdPosition[2] >> 4);

  std::unordered_map<std::tuple<int, int, int>, TerrainMapChunkMesh> mapChunkMeshMap;
  mapChunkMeshMap.reserve(512 * NUM_CELLS_HEIGHT);
  std::unordered_set<std::pair<int, int>> mapChunkMeshSet;
  mapChunkMeshSet.reserve(512 * NUM_CELLS_HEIGHT);
  for (unsigned int i = 0; i < numMapChunkMeshes; i++) {
    const unsigned int baseIndex = i * 14;
    const bool valid = mapChunkMeshes[baseIndex + 0] > 0;

    if (valid) {
      const int x = mapChunkMeshes[baseIndex + 1];
      const int y = mapChunkMeshes[baseIndex + 2];
      const int z = mapChunkMeshes[baseIndex + 3];
      unsigned char *peeks = (unsigned char *)(mapChunkMeshes + (baseIndex + 4));
      const std::tuple<int, int, int> key(x, y, z);
      mapChunkMeshMap[key] = TerrainMapChunkMesh{
        peeks,
        mapChunkMeshes[baseIndex + 8],
        mapChunkMeshes[baseIndex + 9],
        mapChunkMeshes[baseIndex + 10],
        mapChunkMeshes[baseIndex + 11],
        mapChunkMeshes[baseIndex + 12],
        mapChunkMeshes[baseIndex + 13],
        false
      };
      mapChunkMeshSet.emplace(x, z);
    }
  }

  std::queue<CullQueueEntry> cullQueue;
  std::unordered_set<CullQueueEntry> cullSet;
  cullSet.reserve(256);

  const std::tuple<int, int, int> key(ox, oy, oz);
  const std::unordered_map<std::tuple<int, int, int>, TerrainMapChunkMesh>::iterator trackedMapChunkMesh = mapChunkMeshMap.find(key);
  if (trackedMapChunkMesh != mapChunkMeshMap.end()) {
    const Frustum frustum = Frustum::fromMatrix(Matrix::fromArray(projectionMatrix) *= Matrix::fromArray(matrixWorldInverse));

    cullQueue.push(CullQueueEntry{ox, oy, oz, (unsigned char)PEEK_FACES::NONE});
    while (cullQueue.size() > 0) {
      const CullQueueEntry entry = cullQueue.front();
      cullQueue.pop();

      const int x = entry.x;
      const int y = entry.y;
      const int z = entry.z;
      const unsigned char enterFace = entry.enterFace;

      const std::tuple<int, int, int> key(x, y, z);
      TerrainMapChunkMesh &trackedMapChunkMesh = mapChunkMeshMap[key];
      trackedMapChunkMesh.visible = true;

      for (unsigned int j = 0; j < numPeekFaceSpecs; j++) {
        const PeekFace &peekFaceSpec = peekFaceSpecs[j];
        const int ay = y + peekFaceSpec.y;
        if (ay >= 0 && ay < NUM_CHUNKS_HEIGHT) {
          const int ax = x + peekFaceSpec.x;
          const int az = z + peekFaceSpec.z;

          const CullQueueEntry newEntry{ax, ay, az, peekFaceSpec.enterFace};
          if (cullSet.find(newEntry) == cullSet.end()) {
            cullSet.emplace(newEntry);

            if (
              (ax - ox) * peekFaceSpec.x > 0 ||
              (ay - oy) * peekFaceSpec.y > 0 ||
              (az - oz) * peekFaceSpec.z > 0
            ) {
              if (enterFace == (int)PEEK_FACES::NONE || trackedMapChunkMesh.peeks[PEEK_FACE_INDICES[enterFace << 3 | peekFaceSpec.exitFace]] == 1) {
                Sphere boundingSphere(
                  ax * NUM_CELLS + NUM_CELLS_HALF,
                  ay * NUM_CELLS + NUM_CELLS_HALF,
                  az * NUM_CELLS + NUM_CELLS_HALF,
                  NUM_CELLS_CUBE
                );
                if (!frustumCulled || frustum.intersectsSphere(boundingSphere)) {
                  cullQueue.push(newEntry);
                }
              }
            }
          }
        }
      }
    }
  }

  std::vector<TerrainMapChunkCoord> sortedMapChunkCoords;
  sortedMapChunkCoords.reserve(mapChunkMeshSet.size());
  for (auto const &iter : mapChunkMeshSet) {
    const int x = iter.first;
    const int z = iter.second;
    const int dx = x - ox;
    const int dz = z - oz;
    sortedMapChunkCoords.push_back(TerrainMapChunkCoord{x, z, dx*dx + dz*dz});
  }
  std::sort(sortedMapChunkCoords.begin(), sortedMapChunkCoords.end());

  groupIndex = 0;
  for (auto const &iter : sortedMapChunkCoords) {
    int x = iter.x;
    int z = iter.z;

    groups[groupIndex++] = getChunkIndex(x, z);
    for (int i = 0; i < NUM_RENDER_GROUPS * 2; i++) {
      groups[groupIndex + i] = -1;
    }

    int landGroupIndex = 0;
    int landStart = -1;
    int landCount = 0;

    for (int i = 0; i < NUM_CHUNKS_HEIGHT; i++) {
      const std::tuple<int, int, int> key(x, i, z);
      const TerrainMapChunkMesh &trackedMapChunkMesh = mapChunkMeshMap[key];
      if (trackedMapChunkMesh.visible) {
        if (landStart == -1 && trackedMapChunkMesh.landCount > 0) {
          landStart = trackedMapChunkMesh.landStart;
        }
        landCount += trackedMapChunkMesh.landCount;
      } else {
        if (landStart != -1) {
          const int baseIndex = groupIndex + landGroupIndex * 2;
          groups[baseIndex + 0] = landStart;
          groups[baseIndex + 1] = landCount;
          landGroupIndex++;
          landStart = -1;
          landCount = 0;
        }
      }
    }
    if (landStart != -1) {
      const int baseIndex = groupIndex + landGroupIndex * 2;
      groups[baseIndex + 0] = landStart;
      groups[baseIndex + 1] = landCount;
    }

    groupIndex += NUM_RENDER_GROUPS * 2;
  }

  groupIndex2 = 0;
  for (auto iter = sortedMapChunkCoords.rbegin(); iter != sortedMapChunkCoords.rend(); iter++) {
    int x = iter->x;
    int z = iter->z;

    groups2[groupIndex2++] = getChunkIndex(x, z);
    for (int i = 0; i < NUM_RENDER_GROUPS * 4; i++) {
      groups2[groupIndex2 + i] = -1;
    }

    int waterGroupIndex = 0;
    int waterStart = -1;
    int waterCount = 0;
    int lavaGroupIndex = 0;
    int lavaStart = -1;
    int lavaCount = 0;

    for (int i = 0; i < NUM_CHUNKS_HEIGHT; i++) {
      const std::tuple<int, int, int> key(x, i, z);
      const TerrainMapChunkMesh &trackedMapChunkMesh = mapChunkMeshMap[key];
      if (trackedMapChunkMesh.visible) {
        if (waterStart == -1 && trackedMapChunkMesh.waterCount > 0) {
          waterStart = trackedMapChunkMesh.waterStart;
        }
        waterCount += trackedMapChunkMesh.waterCount;
        if (lavaStart == -1 && trackedMapChunkMesh.lavaCount > 0) {
          lavaStart = trackedMapChunkMesh.lavaStart;
        }
        lavaCount += trackedMapChunkMesh.lavaCount;
      } else {
        if (waterStart != -1) {
          const int baseIndex = groupIndex2 + waterGroupIndex * 4;
          groups2[baseIndex + 0] = waterStart;
          groups2[baseIndex + 1] = waterCount;
          waterGroupIndex++;
          waterStart = -1;
          waterCount = 0;
        }
        if (lavaStart != -1) {
          const int baseIndex = groupIndex2 + lavaGroupIndex * 4;
          groups2[baseIndex + 2] = lavaStart;
          groups2[baseIndex + 3] = lavaCount;
          lavaGroupIndex++;
          lavaStart = -1;
          lavaCount = 0;
        }
      }
    }
    if (waterStart != -1) {
      const int baseIndex = groupIndex2 + waterGroupIndex * 4;
      groups2[baseIndex + 0] = waterStart;
      groups2[baseIndex + 1] = waterCount;
    }
    if (lavaStart != -1) {
      const int baseIndex = groupIndex2 + lavaGroupIndex * 4;
      groups2[baseIndex + 2] = lavaStart;
      groups2[baseIndex + 3] = lavaCount;
    }

    groupIndex2 += NUM_RENDER_GROUPS * 4;
  }
};
unsigned int cullObjects(float *hmdPosition, float *projectionMatrix, float *matrixWorldInverse, bool frustumCulled, int *mapChunkMeshes, unsigned int numMapChunkMeshes, int *groups) {
  const Frustum frustum = Frustum::fromMatrix(Matrix::fromArray(projectionMatrix) *= Matrix::fromArray(matrixWorldInverse));

  unsigned int groupIndex = 0;
  for (unsigned int i = 0; i < numMapChunkMeshes; i++) {
    const unsigned int mapChunkMeshBaseIndex = i * (1 + 2 + NUM_CHUNKS_HEIGHT * 2);
    bool valid = mapChunkMeshes[mapChunkMeshBaseIndex + 0] > 0;

    if (valid) {
      const int x = mapChunkMeshes[mapChunkMeshBaseIndex + 1];
      const int z = mapChunkMeshes[mapChunkMeshBaseIndex + 2];

      groups[groupIndex++] = getChunkIndex(x, z);
      for (int i = 0; i < NUM_RENDER_GROUPS * 2; i++) {
        groups[groupIndex + i] = -1;
      }

      int chunkGroupIndex = 0;
      int start = -1;
      int count = 0;
      for (int j = 0; j < NUM_CHUNKS_HEIGHT; j++) {
        Sphere boundingSphere(
          x * NUM_CELLS + NUM_CELLS_HALF,
          j * NUM_CELLS + NUM_CELLS_HALF,
          z * NUM_CELLS + NUM_CELLS_HALF,
          NUM_CELLS_CUBE
        );
        if (!frustumCulled || frustum.intersectsSphere(boundingSphere)) {
          const int localStart = mapChunkMeshes[mapChunkMeshBaseIndex + 3 + j * 2 + 0];
          const int localCount = mapChunkMeshes[mapChunkMeshBaseIndex + 3 + j * 2 + 1];
          if (start == -1 && localCount > 0) {
            start = localStart;
          }
          count += localCount;
        } else {
          if (start != -1) {
            const int baseIndex = groupIndex + chunkGroupIndex * 2;
            groups[baseIndex + 0] = start;
            groups[baseIndex + 1] = count;
            chunkGroupIndex++;
            start = -1;
            count = 0;
          }
        }
      }
      if (start != -1) {
        const int baseIndex = groupIndex + chunkGroupIndex * 2;
        groups[baseIndex + 0] = start;
        groups[baseIndex + 1] = count;
      }

      groupIndex += NUM_RENDER_GROUPS * 2;
    }
  }

  return groupIndex;
}
