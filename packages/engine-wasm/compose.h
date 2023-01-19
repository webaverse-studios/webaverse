#ifndef COMPOSE_H
#define COMPOSE_H

void compose(
  void *objectsSrc, void *vegetationsSrc, void *geometries, unsigned int *geometryIndex,
  unsigned int *blocks, unsigned int *blockTypes, int dims[3], unsigned char *transparentVoxels, unsigned char *translucentVoxels, float *faceUvs, float *shift,
  float *positions, float *uvs, unsigned char *ssaos, float *frames, float *objectIndices, unsigned int *indices, unsigned int *objects,
  unsigned int *positionIndex, unsigned int *uvIndex, unsigned int *ssaoIndex, unsigned int *frameIndex, unsigned int *objectIndexIndex, unsigned int *indexIndex, unsigned int *objectIndex
);

#endif
