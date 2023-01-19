#include <emscripten.h>
// #include "geometry.h"
// #include "compose.h"
// #include "noise.h"
// #include "march.h"
// #include "collide.h"
#include "physics.h"
#include "meshoptimizer/meshoptimizer.h"
#include "vector.h"
// #include "convex.h"
// #include "earcut.h"
// #include <iostream>
// #include "cut.h"
#include <deque>
#include <map>

extern "C" {

// memory

EMSCRIPTEN_KEEPALIVE void *doMalloc(size_t size) {
  return malloc(size);
}

EMSCRIPTEN_KEEPALIVE void doFree(void *ptr) {
  free(ptr);
}

//

EMSCRIPTEN_KEEPALIVE void initialize() {
  physicsBase = new PBase();
}

//

EMSCRIPTEN_KEEPALIVE PBase *makePhysicsBase() {
  return new PBase();
}

EMSCRIPTEN_KEEPALIVE void cookGeometryPhysics(float *positions, unsigned int *indices, unsigned int numPositions, unsigned int numIndices, uint8_t **data, unsigned int *length, PxDefaultMemoryOutputStream **writeStream) {
  physicsBase->cookGeometry(positions, indices, numPositions, numIndices, data, length, writeStream);
}
EMSCRIPTEN_KEEPALIVE void cookConvexGeometryPhysics(float *positions, unsigned int *indices, unsigned int numPositions, unsigned int numIndices, uint8_t **data, unsigned int *length, PxDefaultMemoryOutputStream **writeStream) {
  physicsBase->cookConvexGeometry(positions, indices, numPositions, numIndices, data, length, writeStream);
}
EMSCRIPTEN_KEEPALIVE void cookHeightFieldGeometryPhysics(unsigned int numRows, unsigned int numColumns, int16_t *scratchStack, uint8_t **data, unsigned int *length, PxDefaultMemoryOutputStream **writeStream) {
  physicsBase->cookHeightFieldGeometry(numRows, numColumns, scratchStack, data, length, writeStream);
}

EMSCRIPTEN_KEEPALIVE void deleteMemoryOutputStream(PxDefaultMemoryOutputStream *writeStream) {
  delete writeStream;
}

//

/* class PositionUV {
public:
  Vec position;
  Vec2 uv;
}; */

//

// MESHOPTIMIZER_API size_t meshopt_simplify(unsigned int* destination, const unsigned int* indices, size_t index_count, const float* vertex_positions, size_t vertex_count, size_t vertex_positions_stride, size_t target_index_count, float target_error, unsigned int options, float* result_error);
EMSCRIPTEN_KEEPALIVE void meshoptSimplify(
  const unsigned int* indices,
  size_t index_count,
  const float* vertex_positions,
  size_t vertex_count,
  // const float* uvs,
  size_t target_index_count,
  float target_error,
  unsigned int **destination,
  unsigned int *numDestinations
) {
  /* std::vector<PositionUV> positionUvs(vertex_count);
  for (size_t i = 0; i < vertex_count; i++) {
    positionUvs[i].position = Vec{vertex_positions[i * 3], vertex_positions[i * 3 + 1], vertex_positions[i * 3 + 2]};
    positionUvs[i].uv = Vec2{uvs[i * 2], uvs[i * 2 + 1]};
  } */
  
  *destination = (unsigned int *)malloc(sizeof(unsigned int) * index_count);
  
  const size_t vertex_positions_stride = 3 * sizeof(float);
  constexpr unsigned int options = 0;
  float result_error;
  *numDestinations = meshopt_simplify(*destination, indices, index_count, vertex_positions, vertex_count, vertex_positions_stride, target_index_count, target_error, options, &result_error);
}

// MESHOPTIMIZER_EXPERIMENTAL size_t meshopt_simplifySloppy(unsigned int* destination, const unsigned int* indices, size_t index_count, const float* vertex_positions, size_t vertex_count, size_t vertex_positions_stride, size_t target_index_count, float target_error, float* result_error);

// indices.byteOffset,
// indices.length,
// positions.byteOffset,
// positions.length,
// target_index_count,
// scratchStack.u32.byteOffset,
// scratchStack.u32.byteOffset + Uint32Array.BYTES_PER_ELEMENT

EMSCRIPTEN_KEEPALIVE void meshoptSimplifySloppy(
  const unsigned int* indices,
  size_t index_count,
  const float* vertex_positions,
  size_t vertex_count,
  // const float* uvs,
  size_t target_index_count,
  float target_error,
  unsigned int **destination,
  unsigned int *numDestinations
) {
  /* std::vector<PositionUV> positionUvs(vertex_count);
  for (size_t i = 0; i < vertex_count; i++) {
    positionUvs[i].position = Vec{vertex_positions[i * 3], vertex_positions[i * 3 + 1], vertex_positions[i * 3 + 2]};
    positionUvs[i].uv = Vec2{uvs[i * 2], uvs[i * 2 + 1]};
  } */

  *destination = (unsigned int *)malloc(sizeof(unsigned int) * index_count);
  
  const size_t vertex_positions_stride = 3 * sizeof(float);
  float result_error;
  *numDestinations = meshopt_simplifySloppy(*destination, indices, index_count, vertex_positions, vertex_count, vertex_positions_stride, target_index_count, target_error, &result_error);
}

} // extern "C"