#ifndef CACHED_NOISE_H
#define CACHED_NOISE_H

#include "noise.h"
#include "hash.h"
#include <random>
#include <unordered_map>
#include <vector>

class CachedNoise : public Noise {
  public:
    std::unordered_map<std::pair<int, int>, std::vector<double>> cache;

    explicit CachedNoise(int s, double frequency, int octaves);

    double in2D(int x, int z);
};

#endif
