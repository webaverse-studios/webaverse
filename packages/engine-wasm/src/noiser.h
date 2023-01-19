#ifndef NOISER_H
#define NOISER_H

#include "noise.h"
#include "cachedNoise.h"
#include "hash.h"
#include <random>
#include <unordered_map>

class Noiser {
  public:
    std::mt19937 rng;
    Noise elevationNoise1;
    Noise elevationNoise2;
    Noise elevationNoise3;
    Noise nestNoise;
    Noise nestNoiseX;
    Noise nestNoiseY;
    Noise nestNoiseZ;
    Noise wormNoise;
    Noise caveLengthNoise;
    Noise caveRadiusNoise;
    Noise caveThetaNoise;
    Noise cavePhiNoise;
    Noise caveDeltaThetaNoise;
    Noise caveDeltaPhiNoise;
    Noise caveFillNoise;
    Noise caveCenterNoiseX;
    Noise caveCenterNoiseY;
    Noise caveCenterNoiseZ;
    CachedNoise oceanNoise;
    CachedNoise riverNoise;
    CachedNoise temperatureNoise;
    CachedNoise humidityNoise;
    CachedNoise lavaNoise;

    std::unordered_map<std::pair<int, int>, unsigned char> biomeCache;
    std::unordered_map<std::tuple<unsigned char, int, int>, float> biomeHeightCache;
    std::unordered_map<std::pair<int, int>, float> elevationCache;

    explicit Noiser(int seed);

    unsigned char getBiome(int x, int z);
    float getBiomeHeight(unsigned char b, int x, int z);
    float getElevation(int x, int z);
    double getTemperature(double x, double z);
    double getHumidity(double x, double z);
    void fillBiomes(int ox, int oz, unsigned char *biomes, unsigned char *temperature, unsigned char *humidity);
    void fillElevations(int ox, int oz, float *elevations);
    void fillEther(int ox, int oz, float *elevations, float *ether);
    void fillLiquid(int ox, int oz, float *ether, float *elevations, float *water, float *lava);
    void applyEther(float *newEther, unsigned int numNewEthers, float *ether);
    void makeGeometries(int ox, int oy, float *ether, float *water, float *lava, float *positions, unsigned int *indices, unsigned int *attributeRanges, unsigned int *indexRanges);
    void postProcessGeometry(int ox, int oz, unsigned int *attributeRanges, float *positions, float *colors, unsigned char *biomes);

    void apply(int ox, int oz, unsigned char *biomes, unsigned char *temperature, unsigned char *humidity, bool fillBiomes, float *elevations, bool fillElevations, float *ethers, bool fillEther, float *water, float *lava, bool fillLiquid, float *newEther, unsigned int numNewEthers);
    void fill(int ox, int oz, unsigned char *biomes, float *elevations, float *ethers, float *water, float *lava, float *positions, unsigned int *indices, unsigned int *attributeRanges, unsigned int *indexRanges, float *staticHeightfield, float *colors, unsigned char *peeks);
};

#endif
