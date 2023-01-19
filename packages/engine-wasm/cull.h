#ifndef CULL_H
#define CULL_H

void cullTerrain(float *hmdPosition, float *projectionMatrix, float *matrixWorldInverse, bool frustumCulled, int *mapChunkMeshes, unsigned int numMapChunkMeshes, int *groups, int *groups2, unsigned int &groupIndex, unsigned int &groupIndex2);
unsigned int cullObjects(float *hmdPosition, float *projectionMatrix, float *matrixWorldInverse, bool frustumCulled, int *mapChunkMeshes, unsigned int numMapChunkMeshes, int *groups);

#endif
