#include "cachedNoise.h"
#include "util.h"
#include <cmath>
#include <random>
#include <unordered_map>
#include <vector>
// #include <iostream>

CachedNoise::CachedNoise(int s, double frequency, int octaves) : Noise(s, frequency, octaves) {}

double CachedNoise::in2D(int x, int z) {
  const int ox = x >> 4;
  const int oz = z >> 4;
  const int ax = x - (x & 0xFFFFFFF0);
  const int az = z - (z & 0xFFFFFFF0);
  const int index = ax + az * NUM_CELLS;

  const std::pair<int, int> key(ox, oz);
  std::unordered_map<std::pair<int, int>, std::vector<double>>::iterator entryIter = cache.find(key);

  if (entryIter != cache.end()) {
    return entryIter->second[index];
  } else {
    std::vector<double> &entry = cache[key];
    entry.reserve(NUM_CELLS * NUM_CELLS);

    for (unsigned int dz = 0; dz < NUM_CELLS; dz++) {
      for (unsigned int dx = 0; dx < NUM_CELLS; dx++) {
        entry[dx + dz * NUM_CELLS] = Noise::in2D(ox * NUM_CELLS + dx, oz * NUM_CELLS + dz);
      }
    }

    return entry[index];
  }
}
