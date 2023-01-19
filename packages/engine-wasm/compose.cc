#include "compose.h"
#include "util.h"
#include "tssl.h"
#include "heightfield.h"
#include <string.h>
#include <cmath>
#include <vector>
#include <algorithm>
#include <memory>
#include "vector.h"
// #include <iostream>

unsigned int _align(unsigned int n, unsigned int alignment) {
  unsigned int alignDiff = n % alignment;
  if (alignDiff > 0) {
    n += alignment - alignDiff;
  }
  return n;
}

class Geometry {
  public:

  float positions[GEOMETRY_BUFFER_SIZE];
  float uvs[GEOMETRY_BUFFER_SIZE];
  unsigned char ssaos[GEOMETRY_BUFFER_SIZE];
  float frames[GEOMETRY_BUFFER_SIZE];
  float objectIndices[GEOMETRY_BUFFER_SIZE];
  unsigned int indices[GEOMETRY_BUFFER_SIZE];
  unsigned int objects[GEOMETRY_BUFFER_SIZE];
  unsigned int positionIndex;
  unsigned int uvIndex;
  unsigned int ssaoIndex;
  unsigned int frameIndex;
  unsigned int objectIndexIndex;
  unsigned int indexIndex;
  unsigned int objectIndex;
  unsigned int numPositions;
  unsigned int numUvs;
  unsigned int numSsaos;
  unsigned int numFrames;
  unsigned int numObjectIndices;
  unsigned int numIndices;
  unsigned int numObjects;

  Geometry(void *geometries, int i, unsigned int positionIndex, unsigned int uvIndex, unsigned int ssaoIndex, unsigned int frameIndex, unsigned int objectIndexIndex, unsigned int indexIndex, unsigned int objectIndex) :
    positionIndex(positionIndex),
    uvIndex(uvIndex),
    ssaoIndex(ssaoIndex),
    frameIndex(frameIndex),
    objectIndexIndex(objectIndexIndex),
    indexIndex(indexIndex),
    objectIndex(objectIndex)
  {
    unsigned int byteOffset = 0;

    unsigned int *headerBuffer = (unsigned int *)geometries;
    unsigned int index = 0;
    numPositions = headerBuffer[index++];
    numUvs = headerBuffer[index++];
    numSsaos = headerBuffer[index++];
    numFrames = headerBuffer[index++];
    numIndices = headerBuffer[index++];
    byteOffset += 5 * 4;

    float *positionsBuffer = (float *)((char *)geometries + byteOffset);
    memcpy(positions, positionsBuffer, numPositions * 4);
    byteOffset += 4 * numPositions;

    float *uvsBuffer = (float *)((char *)geometries + byteOffset);
    for (unsigned int j = 0; j < numUvs / 2; j++) {
      unsigned int baseIndex = j * 2;
      uvs[baseIndex + 0] = uvsBuffer[baseIndex + 0];
      uvs[baseIndex + 1] = 1.0f - uvsBuffer[baseIndex + 1];
    }
    byteOffset += 4 * numUvs;

    unsigned char *ssaosBuffer = (unsigned char *)((char *)geometries + byteOffset);
    memcpy(ssaos, ssaosBuffer, numSsaos);
    byteOffset += 1 * numSsaos;
    byteOffset = _align(byteOffset, 4);

    float *framesBuffer = (float *)((char *)geometries + byteOffset);
    memcpy(frames, framesBuffer, numFrames * 4);
    byteOffset += 4 * numFrames;

    numObjectIndices = numPositions / 3;
    for (unsigned int j = 0; j < numObjectIndices; j++) {
      objectIndices[j] = (float)i;
    }

    unsigned int *indicesBuffer = (unsigned int *)((char *)geometries + byteOffset);
    for (unsigned int j = 0; j < numIndices; j++) {
      indices[j] = indicesBuffer[j] + positionIndex / 3;
    }
    byteOffset += 4 * numIndices;

    numObjects = 7;
    float *boundingBoxBuffer = (float *)((char *)geometries + byteOffset);
    objects[0] = i;
    memcpy(objects + 1, boundingBoxBuffer, 6 * 4);
    byteOffset += 4 * 7;
  }

  void applyTranslation(const Vec &v) {
    for (unsigned int i = 0; i < numPositions / 3; i++) {
      unsigned int baseIndex = i * 3;
      positions[baseIndex + 0] += v.x;
      positions[baseIndex + 1] += v.y;
      positions[baseIndex + 2] += v.z;
    }
  }

  void applyRotation(const Quat &q) {
    const Vec u(q.x, q.y, q.z);

    for (unsigned int i = 0; i < numPositions / 3; i++) {
      unsigned int baseIndex = i * 3;
      const Vec v(positions[baseIndex + 0], positions[baseIndex + 1], positions[baseIndex + 2]);

      const Vec u(q.x, q.y, q.z);
      const float s = q.w;

      const Vec result = (u * (2.0f * (u * v))) +
        (v * (s*s - (u * u))) + 
        ((u ^ v) * (2.0f * s));

      positions[baseIndex + 0] = result.x;
      positions[baseIndex + 1] = result.y;
      positions[baseIndex + 2] = result.z;
    }
  }

  void write(float *positions, float *uvs, unsigned char *ssaos, float *frames, float *objectIndices, unsigned int *indices, unsigned int *objects, unsigned int &positionIndex, unsigned int &uvIndex, unsigned int &ssaoIndex, unsigned int &frameIndex, unsigned int &objectIndexIndex, unsigned int &indexIndex, unsigned int &objectIndex) const {
    memcpy(positions + this->positionIndex, this->positions, this->numPositions * 4);
    memcpy(uvs + this->uvIndex, this->uvs, this->numUvs * 4);
    memcpy(ssaos + this->ssaoIndex, this->ssaos, this->numSsaos * 1);
    memcpy(frames + this->frameIndex, this->frames, this->numFrames * 4);
    memcpy(objectIndices + this->objectIndexIndex, this->objectIndices, this->numObjectIndices * 4);
    memcpy(indices + this->indexIndex, this->indices, this->numIndices * 4);
    memcpy(objects + this->objectIndex, this->objects, this->numObjects * 4);

    positionIndex += this->numPositions;
    uvIndex += this->numUvs;
    ssaoIndex += this->numSsaos;
    frameIndex += this->numFrames;
    objectIndexIndex += this->numObjectIndices;
    indexIndex += this->numIndices;
    objectIndex += this->numObjects;
  }
};

inline unsigned int findGeometryIndex(unsigned int n, unsigned int *geometryIndex) {
  for (unsigned int i = 0; i < 4096 / 2; i++) {
    if (geometryIndex[i * 2 + 0] == n) {
      return geometryIndex[i * 2 + 1];
    }
  }
  return 0;
}

void compose(
  void *objectsSrc, void *vegetationsSrc, void *geometries, unsigned int *geometryIndex,
  unsigned int *blocks, unsigned int *blockTypes, int dims[3], unsigned char *transparentVoxels, unsigned char *translucentVoxels, float *faceUvs, float *shift,
  float *positions, float *uvs, unsigned char *ssaos, float *frames, float *objectIndices, unsigned int *indices, unsigned int *objects,
  unsigned int *positionIndex, unsigned int *uvIndex, unsigned int *ssaoIndex, unsigned int *frameIndex, unsigned int *objectIndexIndex, unsigned int *indexIndex, unsigned int *objectIndex
) {

  std::vector<int> objectsArray[NUM_CHUNKS_HEIGHT];
  unsigned int objectsSrcOffset = 0;
  for (int i = 0; i < OBJECT_SLOTS; i++) {
    const unsigned int n = *((unsigned int *)((char *)objectsSrc + objectsSrcOffset));
    objectsSrcOffset += 4;

    if (n != 0) {
      float *positionBuffer = (float *)((char *)objectsSrc + objectsSrcOffset);
      const float y = positionBuffer[1];
      const int chunkIndex = std::min<int>(std::max<int>(y, 0), NUM_CELLS_HEIGHT - 1) >> 4;
      objectsArray[chunkIndex].push_back(i);
    }

    objectsSrcOffset += 4 * 11;
  }
  std::vector<int> vegetationsArray[NUM_CHUNKS_HEIGHT];
  unsigned int vegetationsSrcOffset = 0;
  for (int i = 0; i < OBJECT_SLOTS; i++) {
    const unsigned int n = *((unsigned int *)((char *)vegetationsSrc + vegetationsSrcOffset));
    vegetationsSrcOffset += 4;

    if (n != 0) {
      float *positionBuffer = (float *)((char *)vegetationsSrc + vegetationsSrcOffset);
      const float y = positionBuffer[1];
      const int chunkIndex = std::min<int>(std::max<int>(y, 0), NUM_CELLS_HEIGHT - 1) >> 4;
      vegetationsArray[chunkIndex].push_back(i);
    }

    vegetationsSrcOffset += 4 * 10;
  }

  for (unsigned int chunkIndex = 0; chunkIndex < NUM_CHUNKS_HEIGHT; chunkIndex++) {
    if (chunkIndex == 0) {
      positionIndex[chunkIndex] = 0;
      uvIndex[chunkIndex] = 0;
      ssaoIndex[chunkIndex] = 0;
      frameIndex[chunkIndex] = 0;
      objectIndexIndex[chunkIndex] = 0;
      indexIndex[chunkIndex] = 0;
      objectIndex[chunkIndex] = 0;
    } else {
      positionIndex[chunkIndex] = positionIndex[chunkIndex - 1];
      uvIndex[chunkIndex] = uvIndex[chunkIndex - 1];
      ssaoIndex[chunkIndex] = ssaoIndex[chunkIndex - 1];
      frameIndex[chunkIndex] = frameIndex[chunkIndex - 1];
      objectIndexIndex[chunkIndex] = objectIndexIndex[chunkIndex - 1];
      indexIndex[chunkIndex] = indexIndex[chunkIndex - 1];
      objectIndex[chunkIndex] = objectIndex[chunkIndex - 1];
    }

    std::vector<int> &objectsVector = objectsArray[chunkIndex];
    for (const int &i : objectsVector) {
      int offset = i * 4 * 12;

      const unsigned int n = *((unsigned int *)((char *)objectsSrc + offset));
      offset += 4;

      float *positionBuffer = (float *)((char *)objectsSrc + offset);
      const Vec position(
        positionBuffer[0],
        positionBuffer[1],
        positionBuffer[2]
      );
      offset += 4 * 3;

      float *rotationBuffer = (float *)((char *)objectsSrc + offset);
      const Quat rotation(
        rotationBuffer[0],
        rotationBuffer[1],
        rotationBuffer[2],
        rotationBuffer[3]
      );
      offset += 4 * 4;

      std::unique_ptr<Geometry> geometry(
        new Geometry(
          (char *)geometries + findGeometryIndex(n, geometryIndex),
          i,
          positionIndex[chunkIndex],
          uvIndex[chunkIndex],
          ssaoIndex[chunkIndex],
          frameIndex[chunkIndex],
          objectIndexIndex[chunkIndex],
          indexIndex[chunkIndex],
          objectIndex[chunkIndex]
        )
      );
      geometry->applyRotation(rotation);
      geometry->applyTranslation(position);
      geometry->write(
        positions,
        uvs,
        ssaos,
        frames,
        objectIndices,
        indices,
        objects,
        positionIndex[chunkIndex],
        uvIndex[chunkIndex],
        ssaoIndex[chunkIndex],
        frameIndex[chunkIndex],
        objectIndexIndex[chunkIndex],
        indexIndex[chunkIndex],
        objectIndex[chunkIndex]
      );
    }

    std::vector<int> &vegetationsVector = vegetationsArray[chunkIndex];
    for (const int &i : vegetationsVector) {
      int offset = i * 4 * 11;

      const unsigned int n = *((unsigned int *)((char *)vegetationsSrc + offset));
      offset += 4;

      float *positionBuffer = (float *)((char *)vegetationsSrc + offset);
      const Vec position(
        positionBuffer[0],
        positionBuffer[1],
        positionBuffer[2]
      );
      offset += 4 * 3;

      float *rotationBuffer = (float *)((char *)vegetationsSrc + offset);
      const Quat rotation(
        rotationBuffer[0],
        rotationBuffer[1],
        rotationBuffer[2],
        rotationBuffer[3]
      );
      offset += 4 * 4;

      std::unique_ptr<Geometry> geometry(
        new Geometry(
          (char *)geometries + findGeometryIndex(n, geometryIndex),
          -2,
          positionIndex[chunkIndex],
          uvIndex[chunkIndex],
          ssaoIndex[chunkIndex],
          frameIndex[chunkIndex],
          objectIndexIndex[chunkIndex],
          indexIndex[chunkIndex],
          objectIndex[chunkIndex]
        )
      );
      geometry->applyRotation(rotation);
      geometry->applyTranslation(position);
      geometry->write(
        positions,
        uvs,
        ssaos,
        frames,
        objectIndices,
        indices,
        objects,
        positionIndex[chunkIndex],
        uvIndex[chunkIndex],
        ssaoIndex[chunkIndex],
        frameIndex[chunkIndex],
        objectIndexIndex[chunkIndex],
        indexIndex[chunkIndex],
        objectIndex[chunkIndex]
      );
    }

    unsigned int *voxels = blocks + (chunkIndex * NUM_VOXELS_CHUNKS_HEIGHT);
    shift[1] = chunkIndex * NUM_CELLS; // XXX clean this up
    const unsigned int numPositions = positionIndex[chunkIndex];
    tesselate(
      voxels,
      blockTypes,
      dims,
      transparentVoxels,
      translucentVoxels,
      faceUvs,
      shift,
      numPositions,
      positions + positionIndex[chunkIndex],
      uvs + uvIndex[chunkIndex],
      ssaos + ssaoIndex[chunkIndex],
      frames + frameIndex[chunkIndex],
      objectIndices + objectIndexIndex[chunkIndex],
      indices + indexIndex[chunkIndex],
      positionIndex[chunkIndex],
      uvIndex[chunkIndex],
      ssaoIndex[chunkIndex],
      frameIndex[chunkIndex],
      objectIndexIndex[chunkIndex],
      indexIndex[chunkIndex]
    );
  }
}
