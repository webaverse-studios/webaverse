#include <earcut.hpp>
#include <RectBinPack/MaxRects.hpp>

class EarcutResult {
public:
  float *positions;
  unsigned int numPositions;
  float *uvs;
  unsigned int numUvs;
  uint32_t *indices;
  unsigned int numIndices;
  PhysicsObject *trianglePhysicsObjectPtr;
  PhysicsObject *convexPhysicsObjectPtr;
  std::shared_ptr<PhysicsObject> trianglePhysicsObject;
  std::shared_ptr<PhysicsObject> convexPhysicsObject;
};

struct CustomRect {
  CustomRect() : x(0), y(0), w(1), h(1), packed(false) {}
  CustomRect(float w, float h) : x(0), y(0), w(w), h(h), packed(false) {}
  float x, y, w, h;
  bool packed;
};
constexpr unsigned int size = 4096;
float sizeScale = 1;
inline RectBinPack::Rect toRect(const CustomRect& value) {
  return {
    (unsigned int)(value.x * (float)size),
    (unsigned int)(value.y * (float)size),
    (unsigned int)(value.w * (float)size * sizeScale),
    (unsigned int)(value.h * (float)size * sizeScale),
  };
}
inline void fromBinRect(CustomRect& value, RectBinPack::BinRect rect) {
  value.x = (float)rect.rect.x/((float)size);
  value.y = (float)rect.rect.y/((float)size);
  value.w = (float)rect.rect.width/((float)size);
  value.h = (float)rect.rect.height/((float)size);

  // If bin is not set, set rectangle to unpacked
  value.packed = rect.bin != RectBinPack::InvalidBin;
}
EarcutResult *doEarcut(Tracker *tracker, float *positions, unsigned int numPositions, float *holes, unsigned int *holeCounts, unsigned int numHoleCounts, float *points, unsigned int numPoints, float z, float *zs, unsigned int id, float *position, float *quaternion) {
  Vec p(position[0], position[1], position[2]);
  Quat q(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);

  std::vector<std::vector<std::array<float, 2>>> polygon;
  std::map<unsigned int, std::vector<unsigned int>> connectivity;
  std::vector<unsigned int> islandIndices;
  std::vector<float> islandVs;
  std::vector<float> islandHeights(1 + numHoleCounts + numPoints);
  std::vector<float> islandV(1 + numHoleCounts + numPoints);

  // add regular points
  unsigned int numCoreVertices = 0;
  unsigned int numVertices = 0;
  unsigned int numIndices = 0;
  {
    // for (unsigned int i = 0; i < numCounts; i++) {
      const unsigned int i = 0;
      const unsigned int count = numPositions;
      std::vector<std::array<float, 2>> points;
      points.reserve(count);
      for (unsigned int j = 0; j < count; j++) {
        points.push_back(std::array<float, 2>{positions[numIndices*2], positions[numIndices*2+1]});

        unsigned int nextIndex = (j+1 < count) ? (numIndices+1) : (numIndices+1-count);
        connectivity[numIndices].push_back(nextIndex);
        connectivity[nextIndex].push_back(numIndices);

        islandIndices.push_back(i);
        islandVs.push_back(islandHeights[i]);
        float dx = positions[numIndices*2] - positions[nextIndex*2];
        float dy = positions[numIndices*2+1] - positions[nextIndex*2+1];
        islandHeights[i] += (float)std::sqrt(dx*dx + dy*dy);

        numCoreVertices += 3;
        numVertices += 3;
        numIndices++;
      }
      polygon.push_back(std::move(points));
    // }
  }
  {
    unsigned int baseNumIndices = 0;
    for (unsigned int i = 0; i < numHoleCounts; i++) {
      unsigned int count = holeCounts[i];
      std::vector<std::array<float, 2>> points;
      points.reserve(count);
      for (unsigned int j = 0; j < count; j++) {
        points.push_back(std::array<float, 2>{holes[baseNumIndices*2], holes[baseNumIndices*2+1]});

        unsigned int nextIndex = (j+1 < count) ? (numIndices+1) : (numIndices+1-count);
        connectivity[numIndices].push_back(nextIndex);
        connectivity[nextIndex].push_back(numIndices);

        unsigned int baseNextIndex = (j+1 < count) ? (baseNumIndices+1) : (baseNumIndices+1-count);

        islandIndices.push_back(1 + i);
        islandVs.push_back(islandHeights[1 + i]);
        float dx = holes[baseNumIndices*2] - holes[baseNextIndex*2];
        float dy = holes[baseNumIndices*2+1] - holes[baseNextIndex*2+1];
        islandHeights[i] += (float)std::sqrt(dx*dx + dy*dy);

        numCoreVertices += 3;
        numVertices += 3;
        numIndices++;
        baseNumIndices++;
      }
      polygon.push_back(std::move(points));
    }
  }
  // add hole points
  {
    for (unsigned int i = 0; i < numPoints; i++) {
      float srcPoint[2] = {
        points[i*2],
        points[i*2+1],
      };
      std::vector<std::array<float, 2>> points{
        {
          srcPoint[0],
          srcPoint[1] + 0.01f,
        },
        {
          srcPoint[0] - 0.01f,
          srcPoint[1] - 0.01f,
        },
        {
          srcPoint[0] + 0.01f,
          srcPoint[1] - 0.01f,
        },
      };
      polygon.push_back(std::move(points));

      connectivity[numIndices] = {
        numIndices + 1,
        numIndices + 2,
      };
      connectivity[numIndices+1] = {
        numIndices,
        numIndices + 2,
      };
      connectivity[numIndices+2] = {
        numIndices,
        numIndices + 1,
      };

      islandIndices.push_back(1 + numHoleCounts + i);
      islandVs.push_back(islandHeights[1 + numHoleCounts + i]);
      islandHeights[1 + numHoleCounts + i] = 1;

      numVertices += 9;
      numIndices += 3;
    }
  }

  // Run tessellation
  // Returns array of indices that refer to the vertices of the input polygon.
  // e.g: the index 6 would refer to {25, 75} in this example.
  // Three subsequent indices form a triangle. Output triangles are clockwise.
  std::vector<uint32_t> *indicesPtr = new std::vector<uint32_t>();
  std::vector<uint32_t> &indices = *indicesPtr;
  mapbox::earcut<uint32_t>(polygon, indices);

  // compute flat min max
  float min[2] = {std::numeric_limits<float>::infinity(), std::numeric_limits<float>::infinity()};
  float max[2] = {-std::numeric_limits<float>::infinity(), -std::numeric_limits<float>::infinity()};
  for (unsigned int i = 0; i < numPositions; i += 3) {
    float x = positions[i];
    float y = positions[i+1];
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
  }
  float width = max[0] - min[0];
  float height = max[1] - min[1];

  // compute connections min max
  CustomRect flatRect = width < height ? CustomRect(width/height, 1) : CustomRect(1, height/width);
  std::vector<CustomRect> rects{
    flatRect,
    flatRect,
  };
  for (unsigned int i = 0; i < islandHeights.size(); i++) {
    float h = islandHeights[i];
    rects.push_back(h > 0 ? (z < h ? CustomRect(z/h, 1) : CustomRect(1, h/z)) : CustomRect(0, 0));
  }
  for (sizeScale = 1;; sizeScale /= 2.0f) {
    // Initialize configuration (size x size, 1 bin, no flipping, BestAreaFit)
    RectBinPack::MaxRectsConfiguration config{
      size, size, 1, 1, false, RectBinPack::MaxRectsHeuristic::BestAreaFit
    };
    RectBinPack::packMaxRects(config, rects);

    for (CustomRect &rect : rects) {
      // std::cout << "rect " << rect.x << " " << rect.y << " " << rect.w << " " << rect.h << " " << sizeScale << std::endl;
      if (!rect.packed) {
        // std::cout << "retry " << sizeScale << std::endl;
        continue; // retry
      }
    }
    break;
  }

  // collapse hole points
  {
    unsigned int offset = 0;
    for (unsigned int i = 0; i < numPoints; i++) {
      float srcPoint[2] = {
        points[i*2],
        points[i*2+1],
      };
      auto &line = polygon[polygon.size() - numPoints + i];
      for (auto &point : line) {
        point[0] = srcPoint[0];
        point[1] = srcPoint[1];
      }
    }
  }
  for (unsigned int i = 0; i < indices.size(); i++) {
    if (indices[i] > numCoreVertices/3) {
      indices[i] = (indices[i]/3)*3;
    }
  }

  std::vector<float> *outPositionsPtr = new std::vector<float>(numVertices*2);
  std::vector<float> &outPositions = *outPositionsPtr;
  std::vector<float> *uvsPtr = new std::vector<float>(outPositions.size());
  std::vector<float> &uvs = *uvsPtr;
  {
    float dz = 0;
    float fi = 0;
    unsigned int index = 0;
    for (unsigned int i = 0; i < 2; dz += z, i++, fi++) {
      CustomRect &rect = rects[i];
      unsigned int index2 = 0;
      for (auto &line : polygon) {
        for (auto &point : line) {
          outPositions[index*3] = point[0];
          outPositions[index*3+1] = point[1];
          outPositions[index*3+2] = dz + zs[index2];

          float u = (point[0] - min[0])/width;
          float v = (point[1] - min[1])/height;
          uvs[index*3] = rect.x + u * rect.w;
          uvs[index*3+1] = rect.y + v * rect.h;
          uvs[index*3+2] = fi;

          index++;
          index2++;
        }
      }
    }
  }

  // double-layer points
  unsigned int halfSize = indices.size();
  indices.resize(halfSize*2);
  for (unsigned int i = 0; i < halfSize; i++) {
    indices[halfSize + i] = indices[i] + numVertices/3;
  }

  // std::list<std::set<unsigned int>> islands;
  if (z > 0) {
    // connect layers and deduplicate
    std::map<unsigned int, unsigned int> duplicatedIndices;
    for (unsigned int i = 0; i < halfSize; i += 3) {
      unsigned int ai = indices[i];
      unsigned int bi = indices[i+1];
      unsigned int ci = indices[i+2];
      unsigned int dai = indices[halfSize + i];
      unsigned int dbi = indices[halfSize + i+1];
      unsigned int dci = indices[halfSize + i+2];

      auto &aConnectivity = connectivity[ai];
      auto &bConnectivity = connectivity[bi];
      auto &cConnectivity = connectivity[ci];

      if (std::find(aConnectivity.begin(), aConnectivity.end(), bi) != aConnectivity.end()) {
        unsigned int islandIndex = islandIndices[ai];
        CustomRect &rect = rects[2 + islandIndex];

        unsigned int dupeAIndex;
        unsigned int dupeBIndex;
        unsigned int dupeDAIndex;
        unsigned int dupeDBIndex;
        auto dupeAIter = duplicatedIndices.find(ai);
        if (dupeAIter == duplicatedIndices.end()) {
          dupeAIndex = duplicatedIndices[ai] = outPositions.size()/3;
          outPositions.push_back(outPositions[ai*3]);
          outPositions.push_back(outPositions[ai*3+1]);
          outPositions.push_back(outPositions[ai*3+2]);

          uvs.push_back(rect.x);
          uvs.push_back(rect.y + islandVs[ai]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);

          dupeDAIndex = duplicatedIndices[dai] = outPositions.size()/3;
          outPositions.push_back(outPositions[dai*3]);
          outPositions.push_back(outPositions[dai*3+1]);
          outPositions.push_back(outPositions[dai*3+2]);

          uvs.push_back(rect.x + rect.w);
          uvs.push_back(rect.y + islandVs[ai]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);
        } else {
          dupeAIndex = dupeAIter->second;
          dupeDAIndex = duplicatedIndices[dai];
        }
        auto dupeBIter = duplicatedIndices.find(bi);
        if (dupeBIter == duplicatedIndices.end()) {
          dupeBIndex = duplicatedIndices[bi] = outPositions.size()/3;
          outPositions.push_back(outPositions[bi*3]);
          outPositions.push_back(outPositions[bi*3+1]);
          outPositions.push_back(outPositions[bi*3+2]);

          uvs.push_back(rect.x);
          uvs.push_back(rect.y + islandVs[bi]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);

          dupeDBIndex = duplicatedIndices[dbi] = outPositions.size()/3;
          outPositions.push_back(outPositions[dbi*3]);
          outPositions.push_back(outPositions[dbi*3+1]);
          outPositions.push_back(outPositions[dbi*3+2]);

          uvs.push_back(rect.x + rect.w);
          uvs.push_back(rect.y + islandVs[bi]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);
        } else {
          dupeBIndex = dupeBIter->second;
          dupeDBIndex = duplicatedIndices[dbi];
        }

        indices.push_back(dupeAIndex);
        indices.push_back(dupeBIndex);
        indices.push_back(dupeDAIndex);
        indices.push_back(dupeBIndex);
        indices.push_back(dupeDBIndex);
        indices.push_back(dupeDAIndex);
      }
      if (std::find(bConnectivity.begin(), bConnectivity.end(), ci) != bConnectivity.end()) {
        unsigned int islandIndex = islandIndices[bi];
        CustomRect &rect = rects[2 + islandIndex];

        unsigned int dupeBIndex;
        unsigned int dupeCIndex;
        unsigned int dupeDBIndex;
        unsigned int dupeDCIndex;
        auto dupeBIter = duplicatedIndices.find(bi);
        if (dupeBIter == duplicatedIndices.end()) {
          dupeBIndex = duplicatedIndices[bi] = outPositions.size()/3;
          outPositions.push_back(outPositions[bi*3]);
          outPositions.push_back(outPositions[bi*3+1]);
          outPositions.push_back(outPositions[bi*3+2]);

          uvs.push_back(rect.x);
          uvs.push_back(rect.y + islandVs[bi]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);

          dupeDBIndex = duplicatedIndices[dbi] = outPositions.size()/3;
          outPositions.push_back(outPositions[dbi*3]);
          outPositions.push_back(outPositions[dbi*3+1]);
          outPositions.push_back(outPositions[dbi*3+2]);

          uvs.push_back(rect.x + rect.w);
          uvs.push_back(rect.y + islandVs[bi]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);
        } else {
          dupeBIndex = dupeBIter->second;
          dupeDBIndex = duplicatedIndices[dbi];
        }
        auto dupeCIter = duplicatedIndices.find(ci);
        if (dupeCIter == duplicatedIndices.end()) {
          dupeCIndex = duplicatedIndices[ci] = outPositions.size()/3;
          outPositions.push_back(outPositions[ci*3]);
          outPositions.push_back(outPositions[ci*3+1]);
          outPositions.push_back(outPositions[ci*3+2]);

          uvs.push_back(rect.x);
          uvs.push_back(rect.y + islandVs[ci]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);

          dupeDCIndex = duplicatedIndices[dci] = outPositions.size()/3;
          outPositions.push_back(outPositions[dci*3]);
          outPositions.push_back(outPositions[dci*3+1]);
          outPositions.push_back(outPositions[dci*3+2]);

          uvs.push_back(rect.x + rect.w);
          uvs.push_back(rect.y + islandVs[ci]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);
        } else {
          dupeCIndex = dupeCIter->second;
          dupeDCIndex = duplicatedIndices[dci];
        }

        indices.push_back(dupeBIndex);
        indices.push_back(dupeCIndex);
        indices.push_back(dupeDBIndex);
        indices.push_back(dupeCIndex);
        indices.push_back(dupeDCIndex);
        indices.push_back(dupeDBIndex);
      }
      if (std::find(cConnectivity.begin(), cConnectivity.end(), ai) != cConnectivity.end()) {
        unsigned int islandIndex = islandIndices[ci];
        CustomRect &rect = rects[2 + islandIndex];

        unsigned int dupeCIndex;
        unsigned int dupeAIndex;
        unsigned int dupeDCIndex;
        unsigned int dupeDAIndex;
        auto dupeCIter = duplicatedIndices.find(bi);
        if (dupeCIter == duplicatedIndices.end()) {
          dupeCIndex = duplicatedIndices[ci] = outPositions.size()/3;
          outPositions.push_back(outPositions[ci*3]);
          outPositions.push_back(outPositions[ci*3+1]);
          outPositions.push_back(outPositions[ci*3+2]);

          uvs.push_back(rect.x);
          uvs.push_back(rect.y + islandVs[ci]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);

          dupeDCIndex = duplicatedIndices[dci] = outPositions.size()/3;
          outPositions.push_back(outPositions[dci*3]);
          outPositions.push_back(outPositions[dci*3+1]);
          outPositions.push_back(outPositions[dci*3+2]);

          uvs.push_back(rect.x + rect.w);
          uvs.push_back(rect.y + islandVs[ci]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);
        } else {
          dupeCIndex = dupeCIter->second;
          dupeDCIndex = duplicatedIndices[dci];
        }
        auto dupeAIter = duplicatedIndices.find(ai);
        if (dupeAIter == duplicatedIndices.end()) {
          dupeAIndex = duplicatedIndices[ai] = outPositions.size()/3;
          outPositions.push_back(outPositions[ai*3]);
          outPositions.push_back(outPositions[ai*3+1]);
          outPositions.push_back(outPositions[ai*3+2]);

          uvs.push_back(rect.x);
          uvs.push_back(rect.y + islandVs[ai]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);

          dupeDAIndex = duplicatedIndices[dai] = outPositions.size()/3;
          outPositions.push_back(outPositions[dai*3]);
          outPositions.push_back(outPositions[dai*3+1]);
          outPositions.push_back(outPositions[dai*3+2]);

          uvs.push_back(rect.x + rect.w);
          uvs.push_back(rect.y + islandVs[ai]/islandHeights[islandIndex] * rect.h);
          uvs.push_back((float)islandIndex);
        } else {
          dupeAIndex = dupeAIter->second;
          dupeDAIndex = duplicatedIndices[dai];
        }

        indices.push_back(dupeCIndex);
        indices.push_back(dupeAIndex);
        indices.push_back(dupeDCIndex);
        indices.push_back(dupeAIndex);
        indices.push_back(dupeDAIndex);
        indices.push_back(dupeDCIndex);
      }
    }

    /* // collect connection islands
    for (unsigned int i = halfSize*2; i < indices.size(); i += 3) {
      unsigned int a = indices[i];
      unsigned int b = indices[i+1];
      unsigned int c = indices[i+2];

      auto aIter = std::find_if(islands.begin(), islands.end(), [&](std::set<unsigned int> &island) -> bool {
        return island.find(a) != island.end();
      });
      auto bIter = std::find_if(islands.begin(), islands.end(), [&](std::set<unsigned int> &island) -> bool {
        return island.find(b) != island.end();
      });
      auto cIter = std::find_if(islands.begin(), islands.end(), [&](std::set<unsigned int> &island) -> bool {
        return island.find(c) != island.end();
      });
      decltype(aIter) iter;
      if (aIter != islands.end()) {
        iter = aIter;
      } else if (bIter != islands.end()) {
        iter = bIter;
      } else if (cIter != islands.end()) {
        iter = cIter;
      } else {
        iter = islands.end();
      }
      if (
        (aIter != islands.end())
      ) {
        if (bIter != islands.end() && bIter != aIter) {
          iter->insert(bIter->begin(), bIter->end());
          islands.erase(bIter);
          bIter = islands.end();
        }
        if (cIter != islands.end() && cIter != aIter) {
          iter->insert(cIter->begin(), cIter->end());
          islands.erase(cIter);
          cIter = islands.end();
        }
      }
      if (
        (bIter != islands.end())
      ) {
        if (aIter != islands.end() && aIter != bIter) {
          iter->insert(aIter->begin(), aIter->end());
          islands.erase(aIter);
          aIter = islands.end();
        }
        if (cIter != islands.end() && cIter != bIter) {
          iter->insert(cIter->begin(), cIter->end());
          islands.erase(cIter);
          cIter = islands.end();
        }
      }
      if (
        (cIter != islands.end())
      ) {
        if (aIter != islands.end() && aIter != cIter) {
          iter->insert(aIter->begin(), aIter->end());
          islands.erase(aIter);
          aIter = islands.end();
        }
        if (bIter != islands.end() && bIter != cIter) {
          iter->insert(bIter->begin(), bIter->end());
          islands.erase(bIter);
          bIter = islands.end();
        }
      }
      if (iter != islands.end()) {
        std::set<unsigned int> &island = *iter;
        island.insert(a);
        island.insert(b);
        island.insert(c);
      } else {
        std::set<unsigned int> island{a, b, c};
        islands.push_back(std::move(island));
      }
    } */
    // std::cout << "num islands " << islands.size() << std::endl;
  }

  // flip back points
  for (unsigned int i = 0; i < halfSize; i += 3) {
    std::swap(indices[i + 1], indices[i + 2]);
  }

  std::shared_ptr<PhysicsObject> trianglePhysicsObject;
  {
    PxDefaultMemoryOutputStream *dataStream = doBakeGeometry(&tracker->physicer, outPositions.data(), indices.data(), outPositions.size(), indices.size());
    trianglePhysicsObject = doMakeBakedGeometry(&tracker->physicer, dataStream, id, position, quaternion);
    // delete dataStream;
  }
  std::shared_ptr<PhysicsObject> convexPhysicsObject;
  {
    PxDefaultMemoryOutputStream *dataStream = doBakeConvexGeometry(&tracker->physicer, outPositions.data(), indices.data(), outPositions.size(), indices.size());
    convexPhysicsObject = doMakeBakedConvexGeometry(&tracker->physicer, dataStream, id, position, quaternion);
    // delete dataStream;
  }

  tracker->thingPhysxObjects.push_back(trianglePhysicsObject);

  EarcutResult *result = new EarcutResult();
  result->positions = outPositions.data();
  result->numPositions = outPositions.size();
  result->uvs = uvs.data();
  result->numUvs = uvs.size();
  result->indices = indices.data();
  result->numIndices = indices.size();
  result->trianglePhysicsObject = std::move(trianglePhysicsObject);
  result->trianglePhysicsObjectPtr = result->trianglePhysicsObject.get();
  result->convexPhysicsObject = std::move(convexPhysicsObject);
  result->convexPhysicsObjectPtr = result->convexPhysicsObject.get();
  return result;
}
void doDeleteEarcutResult(Tracker *tracker, EarcutResult *result) {
  auto iter = std::find(tracker->thingPhysxObjects.begin(), tracker->thingPhysxObjects.end(), result->trianglePhysicsObject);
  tracker->thingPhysxObjects.erase(iter);
  delete result;
}