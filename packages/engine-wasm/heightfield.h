#ifndef HEIGHTFIELD_H
#define HEIGHTFIELD_H

void genHeightfield(float *positions, unsigned int *indices, unsigned int numIndices, float *staticHeightfield);
void genBlockfield(unsigned int *blocks, unsigned char *blockfield);

#endif
