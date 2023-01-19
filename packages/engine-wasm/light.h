#ifndef LIGHT_H
#define LIGHT_H

bool light(int ox, int oz, int minX, int maxX, int minY, int maxY, int minZ, int maxZ, bool relight, float **lavaArray, float **objectLightsArray, float **etherArray, unsigned int **blocksArray, unsigned char **lightsArray);

void lightmap(int ox, int oz, float *positions, unsigned int numPositions, float *staticHeightfield, unsigned char *lights, unsigned char *skyLightmaps, unsigned char *torchLightmaps);

#endif
