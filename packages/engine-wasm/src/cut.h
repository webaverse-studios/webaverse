// #define CSGJS_HEADER_ONLY
// #include "csgjs.cpp"
// #include "earcut.hpp"
// #include "TriangleMesh.hpp"
// #include "./threepp/math/Vector3.hpp"

float *cut(
  float *positions,
  unsigned int numPositions,
  float *normals,
  unsigned int numNormals,
  float *uvs,
  unsigned int numUvs,
  unsigned int *faces,
  unsigned int numFaces,

  float *planeNormal,
  float planeDistance
);