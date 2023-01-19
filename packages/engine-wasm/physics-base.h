#ifndef _PHYSICS_BASE_H_
#define _PHYSICS_BASE_H_

#include "physics.h"
#include "physx.h"
// #include <string>
// #include <iostream>

using namespace physx;

class PBase {
public:
  PBase();
  ~PBase();

  PxTolerancesScale tolerancesScale;
  PxDefaultAllocator *allocator = nullptr;
  PxDefaultErrorCallback *errorCallback = nullptr;
  PxFoundation *foundation = nullptr;
  PxCooking *cooking = nullptr;

  void cookGeometry(float *positions, unsigned int *indices, unsigned int numPositions, unsigned int numIndices, uint8_t **data, unsigned int *length, PxDefaultMemoryOutputStream **writeStream);
  void cookConvexGeometry(float *positions, unsigned int *indices, unsigned int numPositions, unsigned int numIndices, uint8_t **data, unsigned int *length, PxDefaultMemoryOutputStream **writeStream);
  void cookHeightFieldGeometry(unsigned int numRows, unsigned int numColumns, int16_t *scratchStack, uint8_t **data, unsigned int *length, PxDefaultMemoryOutputStream **writeStream);
};

extern PBase *physicsBase;

#endif // _PHYSICS_BASE_H_