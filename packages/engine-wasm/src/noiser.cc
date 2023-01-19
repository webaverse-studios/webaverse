#include "noiser.h"
#include "util.h"
#include "biomes.h"
#include "noise.h"
#include "cachedNoise.h"
#include "march.h"
#include "heightfield.h"
#include "flod.h"
#define _USE_MATH_DEFINES
#include <math.h>
#include <cmath>
#include <random>
#include <algorithm>
#include <unordered_map>
#include <vector>
#include <functional>
#include <iostream>

#define PI M_PI

Noiser::Noiser(int seed) :
  rng(seed),
  elevationNoise1(rng(), 2, 1),
  elevationNoise2(rng(), 2, 1),
  elevationNoise3(rng(), 2, 1),
  nestNoise(rng(), 2, 1),
  nestNoiseX(rng(), 2, 1),
  nestNoiseY(rng(), 2, 1),
  nestNoiseZ(rng(), 2, 1),
  wormNoise(rng(), 2, 1),
  caveLengthNoise(rng(), 2, 1),
  caveRadiusNoise(rng(), 2, 1),
  caveThetaNoise(rng(), 2, 1),
  cavePhiNoise(rng(), 2, 1),
  caveDeltaThetaNoise(rng(), 2, 1),
  caveDeltaPhiNoise(rng(), 2, 1),
  caveFillNoise(rng(), 2, 1),
  caveCenterNoiseX(rng(), 2, 1),
  caveCenterNoiseY(rng(), 2, 1),
  caveCenterNoiseZ(rng(), 2, 1),
  oceanNoise(rng(), 0.001, 4),
  riverNoise(rng(), 0.001, 4),
  temperatureNoise(rng(), 0.001, 4),
  humidityNoise(rng(), 0.001, 4),
  lavaNoise(rng(), 0.01, 4)
{}

unsigned char Noiser::getBiome(int x, int z) {
  const std::pair<int, int> key(x, z);
  std::unordered_map<std::pair<int, int>, unsigned char>::iterator entryIter = biomeCache.find(key);

  if (entryIter != biomeCache.end()) {
    return entryIter->second;
  } else {
    unsigned char &biome = biomeCache[key];

    biome = 0xFF;
    if (oceanNoise.in2D(x + 1000, z + 1000) < (80.0 / 255.0)) {
      biome = (unsigned char)BIOME::biOcean;
    }
    if (biome == 0xFF) {
      const double n = riverNoise.in2D(x + 1000, z + 1000);
      const double range = 0.022;
      if (n > 0.5 - range && n < 0.5 + range) {
        biome = (unsigned char)BIOME::biRiver;
      }
    }
    if (std::pow(temperatureNoise.in2D(x + 1000, z + 1000), 1.3) < ((4.0 * 16.0) / 255.0)) {
      if (biome == (unsigned char)BIOME::biOcean) {
        biome = (unsigned char)BIOME::biFrozenOcean;
      } else if (biome == (unsigned char)BIOME::biRiver) {
        biome = (unsigned char)BIOME::biFrozenRiver;
      }
    }
    if (biome == 0xFF) {
      const int t = (int)std::floor(std::pow(temperatureNoise.in2D(x + 1000, z + 1000), 1.3) * 16.0);
      const int h = (int)std::floor(std::pow(humidityNoise.in2D(x + 1000, z + 1000), 1.3) * 16.0);
      biome = (unsigned char)BIOMES_TEMPERATURE_HUMIDITY[t + 16 * h];
    }

    return biome;
  }
}

float Noiser::getBiomeHeight(unsigned char b, int x, int z) {
  const std::tuple<unsigned char, int, int> key(b, x, z);
  std::unordered_map<std::tuple<unsigned char, int, int>, float>::iterator entryIter = biomeHeightCache.find(key);

  if (entryIter != biomeHeightCache.end()) {
    return entryIter->second;
  } else {
    float &biomeHeight = biomeHeightCache[key];

    const Biome &biome = BIOMES[b];
    biomeHeight = std::min<float>(biome.baseHeight +
      elevationNoise1.in2D(x * biome.amps[0][0], z * biome.amps[0][0]) * biome.amps[0][1] +
      elevationNoise2.in2D(x * biome.amps[1][0], z * biome.amps[1][0]) * biome.amps[1][1] +
      elevationNoise3.in2D(x * biome.amps[2][0], z * biome.amps[2][0]) * biome.amps[2][1], 128 - 0.1);

    return biomeHeight;
  }
}

float Noiser::getElevation(int x, int z) {
  const std::pair<int, int> key(x, z);
  std::unordered_map<std::pair<int, int>, float>::iterator entryIter = elevationCache.find(key);

  if (entryIter != elevationCache.end()) {
    return entryIter->second;
  } else {
    float &elevation = elevationCache[key];

    std::unordered_map<unsigned char, unsigned int> biomeCounts;
    for (int dz = -8; dz <= 8; dz++) {
      for (int dx = -8; dx <= 8; dx++) {
        biomeCounts[getBiome(x + dx, z + dz)]++;
      }
    }

    float elevationSum = 0;
    for (auto const &iter : biomeCounts) {
      elevationSum += iter.second * getBiomeHeight(iter.first, x, z);
    }
    elevation = elevationSum / ((8 * 2 + 1) * (8 * 2 + 1));

    return elevation;
  }
}

double Noiser::getTemperature(double x, double z) {
  return temperatureNoise.in2D(x + 1000, z + 1000);
}

double Noiser::getHumidity(double x, double z) {
  return humidityNoise.in2D(x + 1000, z + 1000);
}

void Noiser::fillBiomes(int ox, int oz, unsigned char *biomes, unsigned char *temperature, unsigned char *humidity) {
  float totalTemperature = 0;
  float totalHumidity = 0;

  unsigned int index = 0;
  for (int z = 0; z < NUM_CELLS_OVERSCAN; z++) {
    for (int x = 0; x < NUM_CELLS_OVERSCAN; x++) {
      int ax = (ox * NUM_CELLS) + x;
      int az = (oz * NUM_CELLS) + z;
      biomes[index++] = getBiome(ax, az);
      totalTemperature += this->getTemperature(ax, az);
      totalHumidity += this->getHumidity(ax, az);
    }
  }

  totalTemperature /= (NUM_CELLS_OVERSCAN * NUM_CELLS_OVERSCAN);
  totalHumidity /= (NUM_CELLS_OVERSCAN * NUM_CELLS_OVERSCAN);

  *temperature = (unsigned char)(std::min<float>(totalTemperature, 1.0) * 255.0);
  *humidity = (unsigned char)(std::min<float>(totalHumidity, 1.0) * 255.0);
}

void Noiser::fillElevations(int ox, int oz, float *elevations) {
  unsigned int index = 0;
  for (int z = 0; z < NUM_CELLS_OVERSCAN; z++) {
    for (int x = 0; x < NUM_CELLS_OVERSCAN; x++) {
      elevations[index++] = getElevation((ox * NUM_CELLS) + x, (oz * NUM_CELLS) + z);
    }
  }
}

void _fillOblateSpheroid(float centerX, float centerY, float centerZ, int minX, int minZ, int maxX, int maxZ, float radius, float *ether) {
  const int radiusCeil = (int)std::ceil(radius);
  for (int z = -radiusCeil; z <= radiusCeil; z++) {
    const float lz = centerZ + z;
    if (lz >= minZ && lz < (maxZ + 1)) {
      for (int x = -radiusCeil; x <= radiusCeil; x++) {
        const float lx = centerX + x;
        if (lx >= minX && lx < (maxX + 1)) {
          for (int y = -radiusCeil; y <= radiusCeil; y++) {
            const float ly = centerY + y;
            if (ly >= 0 && ly < NUM_CELLS_OVERSCAN_Y) {
              const float distance = x*x + 2 * y*y + z*z;
              if (distance < radius*radius) {
                const int index = getEtherIndex(std::floor(lx - minX), std::floor(ly), std::floor(lz - minZ));
                const float distance2 = std::sqrt(distance);
                ether[index] += 1 + ((radius - distance2) / radius);
              }
            }
          }
        }
      }
    }
  }
}

void Noiser::fillEther(int ox, int oz, float *elevations, float *ether) {
  unsigned int index = 0;
  for (int y = 0; y < NUM_CELLS_OVERSCAN_Y; y++) {
    for (int z = 0; z < NUM_CELLS_OVERSCAN; z++) {
      for (int x = 0; x < NUM_CELLS_OVERSCAN; x++) {
        const float elevation = elevations[x + z * NUM_CELLS_OVERSCAN];
        ether[index++] = std::min<float>(std::max<float>((float)y - elevation, -1.0), 1.0);
      }
    }
  }

  for (int doz = -4; doz <= 4; doz++) {
    for (int dox = -4; dox <= 4; dox++) {
      const int aox = ox + dox;
      const int aoz = oz + doz;
      const int nx = aox * NUM_CELLS + 1000;
      const int nz = aoz * NUM_CELLS + 1000;
      const float n = nestNoise.in2D(nx, nz);
      const int numNests = (int)std::floor(std::max<float>(n * 2, 0));

      for (int i = 0; i < numNests; i++) {
        const int nx = aox * NUM_CELLS + 1000 + i * 1000;
        const int nz = aoz * NUM_CELLS + 1000 + i * 1000;
        const float nestX = (float)(aox * NUM_CELLS) + nestNoiseX.in2D(nx, nz) * NUM_CELLS;
        const float nestY = nestNoiseY.in2D(nx, nz) * NUM_CELLS_HEIGHT;
        const float nestZ = (float)(aoz * NUM_CELLS) + nestNoiseZ.in2D(nx, nz) * NUM_CELLS;

        const int numWorms = 1 + (int)std::floor(std::max<float>(wormNoise.in2D(nx, nz) * 3, 0));
        for (int j = 0; j < numWorms; j++) {
          float cavePosX = nestX;
          float cavePosY = nestY;
          float cavePosZ = nestZ;
          const int caveLength = (int)((0.75 + caveLengthNoise.in2D(nx, nz) * 0.25) * NUM_CELLS * 4);

          float theta = caveThetaNoise.in2D(nx, nz) * PI * 2;
          float deltaTheta = 0;
          float phi = cavePhiNoise.in2D(nx, nz) * PI * 2;
          float deltaPhi = 0;

          const float caveRadius = caveRadiusNoise.in2D(nx, nz);

          for (int len = 0; len < caveLength; len++) {
            const int nx = aox * NUM_CELLS + 1000 + i * 1000 + len * 1000;
            const int nz = aoz * NUM_CELLS + 1000 + i * 1000 + len * 1000;

            cavePosX += sin(theta) * cos(phi);
            cavePosY += cos(theta) * cos(phi);
            cavePosZ += sin(phi);

            theta += deltaTheta * 0.2;
            deltaTheta = (deltaTheta * 0.9) + (-0.5 + caveDeltaThetaNoise.in2D(nx, nz));
            phi = phi/2 + deltaPhi/4;
            deltaPhi = (deltaPhi * 0.75) + (-0.5 + caveDeltaPhiNoise.in2D(nx, nz));

            if (caveFillNoise.in2D(nx, nz) >= 0.25) {
              const float centerPosX = cavePosX + (caveCenterNoiseX.in2D(nx, nz) * 4 - 2) * 0.2;
              const float centerPosY = cavePosY + (caveCenterNoiseY.in2D(nx, nz) * 4 - 2) * 0.2;
              const float centerPosZ = cavePosZ + (caveCenterNoiseZ.in2D(nx, nz) * 4 - 2) * 0.2;

              // const height = (1 - 0.3 + Math.pow(_random.elevationNoise.in2D(centerPosX + 1000, centerPosZ + 1000), 0.5)) * 64;
              // let radius = (height - centerPosY) / height;
              // radius = 1.3 + (radius * 3.5 + 1) * caveRadius;
              const float radius = 2 + 3.5 * caveRadius * sin(len * PI / caveLength);

              _fillOblateSpheroid(centerPosX, centerPosY, centerPosZ, ox * NUM_CELLS, oz * NUM_CELLS, (ox + 1) * NUM_CELLS, (oz + 1) * NUM_CELLS, radius, ether);
            }
          }
        }
      }
    }
  }
}

inline void setLiquid(int ox, int oz, int x, int y, int z, float *liquid) {
  x -= ox * NUM_CELLS;
  z -= oz * NUM_CELLS;

  const float factor = sqrt(3.0) * 0.8;

  for (int dz = -1; dz <= 1; dz++) {
    const int az = z + dz;
    if (az >= 0 && az <= NUM_CELLS) {
      for (int dx = -1; dx <= 1; dx++) {
        const int ax = x + dx;
        if (ax >= 0 && ax <= NUM_CELLS) {
          for (int dy = -1; dy <= 1; dy++) {
            const int ay = y + dy;
            if (ay >= 0 && ay < (NUM_CELLS_HEIGHT + 1)) {
              const int index = getEtherIndex(ax, ay, az);
              liquid[index] = std::min<float>(-1.0 * (1.0 - (sqrt((float)dx*(float)dx + (float)dy*(float)dy + (float)dz*(float)dz) / factor)), liquid[index]);
            }
          }
        }
      }
    }
  }
}

void Noiser::fillLiquid(int ox, int oz, float *ether, float *elevations, float *water, float *lava) {
  for (unsigned int i = 0; i < (NUM_CELLS + 1) * (NUM_CELLS_HEIGHT + 1) * (NUM_CELLS + 1); i++) {
    water[i] = 1.0;
    lava[i] = 1.0;
  }

  // water
  unsigned int index = 0;
  for (int z = 0; z <= NUM_CELLS; z++) {
    for (int x = 0; x <= NUM_CELLS; x++) {
      const float elevation = elevations[index++];
      for (int y = elevation; y < 64; y++) {
        if (y >= elevation) {
          const int index = getEtherIndex(x, y, z);
          water[index] = ether[index] * -1;
        }
      }
    }
  }

  // lava
  for (int doz = -1; doz <= 1; doz++) {
    for (int dox = -1; dox <= 1; dox++) {
      for (int z = 0; z <= NUM_CELLS; z++) {
        for (int x = 0; x <= NUM_CELLS; x++) {
          const int ax = ((ox + dox) * NUM_CELLS) + x;
          const int az = ((oz + doz) * NUM_CELLS) + z;
          const float elevation = getElevation(ax, az);

          if (elevation >= 80 && lavaNoise.in2D(ax + 1000, az + 1000) > 0.8) {
            setLiquid(ox, oz, ax, (int)std::floor(elevation + 1.0), az, lava);
          }
        }
      }
    }
  }
}

void Noiser::applyEther(float *newEther, unsigned int numNewEthers, float *ether) {
  unsigned int baseIndex = 0;
  for (unsigned int i = 0; i < numNewEthers; i++) {
    const float x = newEther[baseIndex + 0];
    const float y = newEther[baseIndex + 1];
    const float z = newEther[baseIndex + 2];
    const float v = newEther[baseIndex + 3];
    for (int dz = -HOLE_SIZE; dz <= HOLE_SIZE; dz++) {
      const int az = z + dz;
      if (az >= 0 && az < (NUM_CELLS + 1)) {
        for (int dx = -HOLE_SIZE; dx <= HOLE_SIZE; dx++) {
          const int ax = x + dx;
          if (ax >= 0 && ax < (NUM_CELLS + 1)) {
            for (int dy = -HOLE_SIZE; dy <= HOLE_SIZE; dy++) {
              const int ay = y + dy;
              if (ay >= 0 && ay < (NUM_CELLS_HEIGHT + 1)) {
                ether[getEtherIndex(ax, ay, az)] += v * std::max<float>((float)HOLE_SIZE - std::sqrt((float)dx * (float)dx + (float)dy * (float)dy + (float)dz * (float)dz), 0) / std::sqrt((float)HOLE_SIZE * (float)HOLE_SIZE * 3.0);
              }
            }
          }
        }
      }
    }
    baseIndex += 4;
  }
}

void remap(float *positionsBuffer, unsigned int *indicesBuffer, int startAttributeIndex, int startIndexIndex, int endAttributeIndex, int endIndexIndex) {
  int ii = startIndexIndex;
  for (; ii < endIndexIndex;) {
    const float &x = positionsBuffer[indicesBuffer[ii]*3];
    const float &y = positionsBuffer[indicesBuffer[ii]*3+1];
    const float &z = positionsBuffer[indicesBuffer[ii]*3+2];

    int ii2 = ii+1;
    for (; ii2 < endIndexIndex;) {
      const float &x2 = positionsBuffer[indicesBuffer[ii2]*3];
      const float &y2 = positionsBuffer[indicesBuffer[ii2]*3+1];
      const float &z2 = positionsBuffer[indicesBuffer[ii2]*3+2];

      if (x == x2 && y == y2 && z == z2) {
        indicesBuffer[ii2] = indicesBuffer[ii];
      }

      ii2++;
    }

    ii++;
  }
}

void Noiser::makeGeometries(int ox, int oy, float *ether, float *water, float *lava, float *positionsBuffer, unsigned int *indicesBuffer, unsigned int *attributeRanges, unsigned int *indexRanges) {
  int attributeIndex = 0;
  int indexIndex = 0;

  // land
  for (int i = 0; i < NUM_CHUNKS_HEIGHT; i++) {
    unsigned int positionIndex;
    unsigned int faceIndex;

    int dims[3] = {
      NUM_CELLS + 1,
      NUM_CELLS + 1,
      NUM_CELLS + 1
    };
    int shift[3] = {
      0,
      NUM_CELLS * i,
      0
    };
    float *potential = ether + (shift[1] * dims[0] * dims[1]);
    int indexOffset = attributeIndex / 3;
    float *positions = (float *)((char *)positionsBuffer + attributeIndex * 4);
    unsigned int *faces = (unsigned int *)((char *)indicesBuffer + indexIndex * 4);

    marchingCubes(dims, potential, shift, indexOffset, positions, faces, positionIndex, faceIndex);

    attributeRanges[i * 6 + 0] = attributeIndex;
    attributeRanges[i * 6 + 1] = positionIndex;
    indexRanges[i * 6 + 0] = indexIndex;
    indexRanges[i * 6 + 1] = faceIndex,

    // remap(positionsBuffer, indicesBuffer, attributeIndex, indexIndex, attributeIndex + positionIndex, indexIndex + faceIndex);

    attributeIndex += positionIndex;
    indexIndex += faceIndex;
  }

  for (int i = 0; i < NUM_CHUNKS_HEIGHT; i++) {
    {
      unsigned int positionIndex;
      unsigned int faceIndex;

      // water
      int dims[3] = {
        NUM_CELLS + 1,
        NUM_CELLS + 1,
        NUM_CELLS + 1
      };
      int shift[3] = {
        0,
        NUM_CELLS * i,
        0
      };
      float *potential = water + (shift[1] * dims[0] * dims[1]);
      int indexOffset = attributeIndex / 3;
      float *positions = (float *)((char *)positionsBuffer + attributeIndex * 4);
      unsigned int *faces = (unsigned int *)((char *)indicesBuffer + indexIndex * 4);

      marchingCubes(dims, potential, shift, indexOffset, positions, faces, positionIndex, faceIndex);

      attributeRanges[i * 6 + 2] = attributeIndex;
      attributeRanges[i * 6 + 3] = positionIndex;
      indexRanges[i * 6 + 2] = indexIndex;
      indexRanges[i * 6 + 3] = faceIndex;

      // remap(positionsBuffer, indicesBuffer, attributeIndex, indexIndex, attributeIndex + positionIndex, indexIndex + faceIndex);

      attributeIndex += positionIndex;
      indexIndex += faceIndex;
    }
    {
      unsigned int positionIndex;
      unsigned int faceIndex;

      // lava
      int dims[3] = {
        NUM_CELLS + 1,
        NUM_CELLS + 1,
        NUM_CELLS + 1
      };
      int shift[3] = {
        0,
        NUM_CELLS * i,
        0
      };
      float *potential = lava + (shift[1] * dims[0] * dims[1]);
      int indexOffset = attributeIndex / 3;
      float *positions = (float *)((char *)positionsBuffer + attributeIndex * 4);
      unsigned int *faces = (unsigned int *)((char *)indicesBuffer + indexIndex * 4);

      marchingCubes(dims, potential, shift, indexOffset, positions, faces, positionIndex, faceIndex);

      attributeRanges[i * 6 + 4] = attributeIndex;
      attributeRanges[i * 6 + 5] = positionIndex;
      indexRanges[i * 6 + 4] = indexIndex;
      indexRanges[i * 6 + 5] = faceIndex;

      // remap(positionsBuffer, indicesBuffer, attributeIndex, indexIndex, attributeIndex + positionIndex, indexIndex + faceIndex);

      attributeIndex += positionIndex;
      indexIndex += faceIndex;
    }
  }
}

inline void postProcessGeometryRange(int ox, int oz, unsigned int start, unsigned int count, float *positions, float *colors, const std::function<void(const float,const float,const float,const float,const float,float &,float &,float &)>& getColor) {
  float *geometryPositions = positions + start;
  float *geometryColors = colors + start;

  unsigned int baseIndex = 0;
  for (unsigned int i = 0; i < count / 3; i++) {
    const float x = geometryPositions[baseIndex + 0];
    const float y = geometryPositions[baseIndex + 1];
    const float z = geometryPositions[baseIndex + 2];

    const float ax = x + (ox * NUM_CELLS);
    const float ay = y;
    const float az = z + (oz * NUM_CELLS);

    geometryPositions[baseIndex + 0] = ax;
    geometryPositions[baseIndex + 2] = az;

    getColor(ox, oz, ax, ay, az, geometryColors[baseIndex + 0], geometryColors[baseIndex + 1], geometryColors[baseIndex + 2]);

    baseIndex += 3;
  }
};

void Noiser::postProcessGeometry(int ox, int oz, unsigned int *attributeRanges, float *positions, float *colors, unsigned char *biomes) {
  for (int i = 0; i < NUM_CHUNKS_HEIGHT; i++) {
    unsigned int landStart = attributeRanges[i * 6 + 0];
    unsigned int landCount = attributeRanges[i * 6 + 1];
    postProcessGeometryRange(ox, oz, landStart, landCount, positions, colors, [&](const float ox, const float oz, const float x, const float y, const float z, float &r, float &g, float &b)->void {
      const Biome &biome = BIOMES[biomes[getCoordOverscanIndex((int)x - ox * NUM_CELLS, (int)z - oz * NUM_CELLS)]];
      const unsigned int color = biome.color;
      r = ((color >> (8 * 2)) & 0xFF) / 255.0;
      g = ((color >> (8 * 1)) & 0xFF) / 255.0;
      b = ((color >> (8 * 0)) & 0xFF) / 255.0;
    });

    unsigned int waterStart = attributeRanges[i * 6 + 2];
    unsigned int waterCount = attributeRanges[i * 6 + 3];
    postProcessGeometryRange(ox, oz, waterStart, waterCount, positions, colors, [&](const float ox, const float oz, const float x, const float y, const float z, float &r, float &g, float &b)->void {
      r = 0.0;
      g = 0.0;
      b = 1.0;
    });

    unsigned int lavaStart = attributeRanges[i * 6 + 4];
    unsigned int lavaCount = attributeRanges[i * 6 + 5];
    postProcessGeometryRange(ox, oz, lavaStart, lavaCount, positions, colors, [&](const float ox, const float oz, const float x, const float y, const float z, float &r, float &g, float &b)->void {
      r = 0.5;
      g = 0.0;
      b = 2.0;
    });
  }
}

void Noiser::apply(int ox, int oz, unsigned char *biomes, unsigned char *temperature, unsigned char *humidity, bool fillBiomes, float *elevations, bool fillElevations, float *ethers, bool fillEther, float *water, float *lava, bool fillLiquid, float *newEther, unsigned int numNewEthers) {
  if (fillBiomes) {
    this->fillBiomes(ox, oz, biomes, temperature, humidity);
  }
  if (fillElevations) {
    this->fillElevations(ox, oz, elevations);
  }
  if (fillEther) {
    this->fillEther(ox, oz, elevations, ethers);
  }
  if (fillLiquid) {
    this->fillLiquid(ox, oz, ethers, elevations, water, lava);
  }
  if (numNewEthers > 0) {
    this->applyEther(newEther, numNewEthers, ethers);
  }
}

void Noiser::fill(int ox, int oz, unsigned char *biomes, float *elevations, float *ethers, float *water, float *lava, float *positions, unsigned int *indices, unsigned int *attributeRanges, unsigned int *indexRanges, float *staticHeightfield, float *colors, unsigned char *peeks) {
  this->makeGeometries(ox, oz, ethers, water, lava, positions, indices, attributeRanges, indexRanges);

  unsigned int numIndices = indexRanges[5 * 6 + 4] + indexRanges[5 * 6 + 5];
  // genHeightfield(positions, indices, numIndices, staticHeightfield); // XXX can be optimized out, allowing single-pass offsetted geometry tesselation

  this->postProcessGeometry(ox, oz, attributeRanges, positions, colors, biomes);

  for (int i = 0; i < NUM_CHUNKS_HEIGHT; i++) {
    int shift[3] = {
      0,
      NUM_CELLS * i,
      0
    };
    flod(ethers, shift, peeks + i * 16);
  }
}
