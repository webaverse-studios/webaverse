#ifndef TSSL_H
#define TSSL_H

void tesselate(unsigned int *voxels, unsigned int *blockTypes, int dims[3], unsigned char *transparentVoxels, unsigned char *translucentVoxels, float *faceUvs, float *shift, unsigned int numPositions, float *positions, float *uvs, unsigned char *ssaos, float *frames, float *objectIndices, unsigned int *indices, unsigned int &positionIndex, unsigned int &uvIndex, unsigned int &ssaoIndex, unsigned int &frameIndex, unsigned int &objectIndexIndex, unsigned int &indexIndex);

#endif
