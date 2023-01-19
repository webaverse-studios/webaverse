#include "noise.h"
#include <string.h>
#include <iostream>
#include <vector>
#include <array>
#define _USE_MATH_DEFINES
#include <cmath>
#include "biomes.h"
#include "subparcel.h"

#define PI M_PI
constexpr int FILL_BOTTOM = 1<<0;
constexpr int FILL_TOP = 1<<1;
constexpr int FILL_LEFT = 1<<2;
constexpr int FILL_RIGHT = 1<<3;
constexpr int FILL_FRONT = 1<<4;
constexpr int FILL_BACK = 1<<5;
constexpr int FILL_LOCAL = 1<<6;
constexpr int FILL_BASE = 1<<7;

Noise::Noise(int s, double frequency, int octaves) : fastNoise(s) {
  fastNoise.SetFrequency(frequency);
  fastNoise.SetFractalOctaves(octaves);
}
Noise::Noise(const Noise &noise) : fastNoise(noise.fastNoise) {}
Noise::~Noise() {}
Noise &Noise::operator=(const Noise &noise) {
  fastNoise = noise.fastNoise;
  return *this;
}
double Noise::in2D(float x, float y) {
  return (1.0 + fastNoise.GetSimplexFractal(x, y)) / 2.0;
}
double Noise::in3D(float x, float y, float z) {
  return (1.0 + fastNoise.GetSimplexFractal(x, y, z)) / 2.0;
}

/* void noise2(int seed, double frequency, int octaves, int dims[3], float shifts[3], float offset, float *potential) {
  memset(potential, 0, dims[0]*dims[1]*dims[2]*sizeof(float));
  Noise noise(seed, frequency, octaves);
  for (int x = 0; x < dims[0]; x++) {
    for (int y = 0; y < dims[1]; y++) {
      for (int z = 0; z < dims[2]; z++) {
        int index = (x) +
          (z * dims[0]) +
          (y * dims[0] * dims[1]);
        potential[index] = offset + noise.in3D(x + shifts[0], y + shifts[1], z + shifts[2]);
      }
    }
  }
} */

inline unsigned char getBiome(float x, float z, Noise &temperatureNoise, Noise &humidityNoise, Noise &oceanNoise, Noise &riverNoise) {
  // const std::pair<int, int> key(x, z);
  // std::unordered_map<std::pair<int, int>, unsigned char>::iterator entryIter = biomeCache.find(key);

  /* if (entryIter != biomeCache.end()) {
    return entryIter->second;
  } else { */
    // unsigned char &biome = biomeCache[key];
    unsigned char biome = 0xFF;
    if (oceanNoise.in2D(x, z) < (80.0 / 255.0)) {
      biome = (unsigned char)BIOME::biOcean;
    } else {
      const double n = riverNoise.in2D(x, z);
      const double range = 0.022;
      if (n > 0.5 - range && n < 0.5 + range) {
        biome = (unsigned char)BIOME::biRiver;
      }
    }
    if (biome == 0xFF) {
      const int t = (int)std::floor(std::pow(temperatureNoise.in2D(x, z), 1.3) * 16.0);
      const int h = (int)std::floor(std::pow(humidityNoise.in2D(x, z), 1.3) * 16.0);
      biome = (unsigned char)BIOMES_TEMPERATURE_HUMIDITY[t + 16 * h];
    } else {
      if (std::pow(temperatureNoise.in2D(x, z), 1.3) < ((4.0 * 16.0) / 255.0)) {
        if (biome == (unsigned char)BIOME::biOcean) {
          biome = (unsigned char)BIOME::biFrozenOcean;
        } else /* if (biome == (unsigned char)BIOME::biRiver) */ {
          biome = (unsigned char)BIOME::biFrozenRiver;
        }
      }
    }
    return biome;
  // }
}
inline float getBiomeHeight(unsigned char b, float x, float z, Noise &elevationNoise1, Noise &elevationNoise2, Noise &elevationNoise3) {
  // const std::tuple<unsigned char, int, int> key(b, x, z);
  // std::unordered_map<std::tuple<unsigned char, int, int>, float>::iterator entryIter = biomeHeightCache.find(key);

  /* if (entryIter != biomeHeightCache.end()) {
    return entryIter->second;
  } else { */
    // float &biomeHeight = biomeHeightCache[key];

    const Biome &biome = BIOMES[b];
    float biomeHeight = biome.baseHeight - 64.0f +
      elevationNoise1.in2D(x * biome.amps[0][0], z * biome.amps[0][0]) * biome.amps[0][1] +
      elevationNoise2.in2D(x * biome.amps[1][0], z * biome.amps[1][0]) * biome.amps[1][1] +
      elevationNoise3.in2D(x * biome.amps[2][0], z * biome.amps[2][0]) * biome.amps[2][1];
    return biomeHeight;
  // }
}

template <typename T>
inline void _fillOblateSpheroid(float centerX, float centerY, float centerZ, int shiftX, int shiftY, int shiftZ, int minX, int minY, int minZ, int maxX, int maxY, int maxZ, float radius, int *dimsP3, T *ether, std::function<T(T, float)> fn) {
  const int radiusCeil = (int)std::ceil(radius);
  for (int z = -radiusCeil; z <= radiusCeil; z++) {
    const float lz = centerZ + z;
    if (lz >= minZ && lz < maxZ) {
      for (int x = -radiusCeil; x <= radiusCeil; x++) {
        const float lx = centerX + x;
        if (lx >= minX && lx < maxX) {
          for (int y = -radiusCeil; y <= radiusCeil; y++) {
            const float ly = centerY + y;
            if (ly >= minY && ly < maxY) {
              const float distance = x*x + 2 * y*y + z*z;
              if (distance < radius*radius) {
                const int index = std::floor(lx + shiftX + - minX) +
                  (std::floor(lz + shiftY - minZ) * dimsP3[0]) +
                  (std::floor(ly + shiftZ - minY) * dimsP3[0] * dimsP3[1]);
                ether[index] = fn(ether[index], distance);
              }
            }
          }
        }
      }
    }
  }
}

constexpr float thFreq = 0.001;
constexpr int thOctaves = 4;
constexpr float elevationFreq = 2;
constexpr int elevationOctaves = 1;
class TemperatureHumidityNoise {
public:
  TemperatureHumidityNoise(int &seed) {
    noises = std::array<Noise, 7>{
      Noise(seed++, thFreq, thOctaves),
      Noise(seed++, thFreq, thOctaves),
      Noise(seed++, thFreq, thOctaves),
      Noise(seed++, thFreq, thOctaves),
      Noise(seed++, elevationFreq, elevationOctaves),
      Noise(seed++, elevationFreq, elevationOctaves),
      Noise(seed++, elevationFreq, elevationOctaves),
    };
  }
  std::array<Noise, 7> noises;
};

float getHeight(int seed, float ax, float ay, float az, float baseHeight) {
  // float cx = ax - (float)(limits[0])/2.0f;
  // float cy = ay - (float)(limits[1])/2.0f;
  // float cz = az - (float)(limits[2])/2.0f;

  TemperatureHumidityNoise thNoises(seed);

  float u, v, w;
  u = ax;
  v = az;
  w = ay;
  /* if (std::abs(cx) >= std::abs(cy) && std::abs(cx) >= std::abs(cz)) {
    if (cx >= 0) {
      thNoise = &thNoises.noises[0];
      u = az;
      v = ay;
      w = cx;
    } else {
      thNoise = &thNoises.noises[1];
      u = az;
      v = ay;
      w = -cx;
    }
  } else if (std::abs(cy) >= std::abs(cx) && std::abs(cy) >= std::abs(cz)) {
    if (cy >= 0) {
      thNoise = &thNoises.noises[2];
      u = ax;
      v = az;
      w = cy;
    } else {
      thNoise = &thNoises.noises[3];
      u = ax;
      v = az;
      w = -cy;
    }
  } else {
    if (cz >= 0) {
      thNoise = &thNoises.noises[4];
      u = ax;
      v = ay;
      w = cz;
    } else {
      thNoise = &thNoises.noises[5];
      u = ax;
      v = ay;
      w = -cz;
    }
  } */
  std::array<Noise, 7> &thNoiseRef = thNoises.noises;

  float totalHeight = 0;
  for (int dz = -4; dz <= 4; dz++) {
    for (int dx = -4; dx <= 4; dx++) {
      unsigned char biome = getBiome(u + dx, v + dz, thNoiseRef[0], thNoiseRef[1], thNoiseRef[2], thNoiseRef[3]);
      float biomeHeight = getBiomeHeight(biome, u + dx, v + dz, thNoiseRef[4], thNoiseRef[5], thNoiseRef[6]);
      totalHeight += biomeHeight;
    }
  }
  return totalHeight/(float)((4+1+4)*(4+1+4));
}

void noise3(int seed, int x, int y, int z, float baseHeight, float wormRate, float wormRadiusBase, float wormRadiusRate, float objectsRate, float potentialDefault, void *subparcelByteOffset) {
  // std::cout << "wasm subparcel size " << sizeof(Subparcel) << std::endl;

  int dims[3] = {
    SUBPARCEL_SIZE,
    SUBPARCEL_SIZE,
    SUBPARCEL_SIZE,
  };
  float shifts[3] = {
    (float)(x*SUBPARCEL_SIZE),
    (float)(y*SUBPARCEL_SIZE),
    (float)(z*SUBPARCEL_SIZE),
  };
  int dimsP1[3] = {
    dims[0]+1,
    dims[1]+1,
    dims[2]+1,
  };
  int dimsP2[3] = {
    dims[0]+2,
    dims[1]+2,
    dims[2]+2,
  };
  int dimsP3[3] = {
    dims[0]+3,
    dims[1]+3,
    dims[2]+3,
  };
  int dimsP12[3] = {
    dims[0]+12,
    dims[1]+12,
    dims[2]+12,
  };

  Subparcel *subparcel = (Subparcel *)subparcelByteOffset;
  float *potential = subparcel->potentials;
  unsigned char *biomes = subparcel->biomes;
  char *heightfield = subparcel->heightfield;
  unsigned char *lightfield = subparcel->lightfield;
  unsigned int &numObjects = subparcel->numObjects;
  Object *objects = subparcel->objects;

  subparcel->coord.x = x;
  subparcel->coord.y = y;
  subparcel->coord.z = z;
  memset(potential, 0, sizeof(subparcel->potentials));
  memset(biomes, 0, sizeof(subparcel->biomes));
  memset(heightfield, 0, sizeof(subparcel->heightfield));
  memset(lightfield, 0, sizeof(subparcel->lightfield));

  TemperatureHumidityNoise thNoises(seed);
  // Noise oceanNoise(seed++, 0.001, 4);
  // Noise riverNoise(seed++, 0.001, 4);
  // Noise temperatureNoise(seed++, 0.001, 4);
  // Noise humidityNoise(seed++, 0.001, 4);
  // Noise lavaNoise(seed+5, 0.01, 4);
  Noise nestNoise(seed++, 2, 1);
  Noise nestNoiseX(seed++, 2, 1);
  Noise nestNoiseY(seed++, 2, 1);
  Noise nestNoiseZ(seed++, 2, 1);
  Noise numWormsNoise(seed++, 0.1, 1);
  Noise caveLengthNoise(seed++, 2, 1);
  Noise caveRadiusNoise(seed++, 2, 1);
  Noise caveThetaNoise(seed++, 2, 1);
  Noise cavePhiNoise(seed++, 2, 1);
  Noise caveDeltaThetaNoise(seed++, 2, 1);
  Noise caveDeltaPhiNoise(seed++, 2, 1);
  Noise caveFillNoise(seed++, 2, 1);
  Noise caveCenterNoiseX(seed++, 2, 1);
  Noise caveCenterNoiseY(seed++, 2, 1);
  Noise caveCenterNoiseZ(seed++, 2, 1);
  Noise numObjectsNoise(seed++, 10, 1);
  Noise objectsNoiseX(seed++, 10, 1);
  Noise objectsNoiseZ(seed++, 10, 1);
  Noise objectsTypeNoise(seed++, 10, 1);

  std::vector<unsigned char> fills(dimsP3[0]*dimsP3[1]*dimsP3[2]);
  std::vector<unsigned char> biomesAux(dimsP12[0]*dimsP12[2]);
  std::vector<float> biomesAuxHeight(dimsP12[0]*dimsP12[2]);
  {
    std::array<Noise, 7> &thNoiseRef = thNoises.noises;
    int biomeAuxHeightIndex = 0;
    for (int dz = -4 - 1; dz < dimsP3[2] + 4; dz++) {
      for (int dx = -4 - 1; dx < dimsP3[0] + 4; dx++) {
        int index = biomeAuxHeightIndex++;
        /* int biomeSrcIndex = (1 + 4 + dx) +
          (1 + 4 + dz) * dimsP12[0];
        if (index != biomeSrcIndex) {
          std::cout << "fail " << index << " " << biomeSrcIndex << std::endl;
        } */
        unsigned char biome = getBiome(shifts[0] + dx, shifts[2] + dz, thNoiseRef[0], thNoiseRef[1], thNoiseRef[2], thNoiseRef[3]);
        biomesAux[index] = biome;
        float biomeHeight = getBiomeHeight(biome, shifts[0] + dx, shifts[2] + dz, thNoiseRef[4], thNoiseRef[5], thNoiseRef[6]);
        biomesAuxHeight[index] = biomeHeight;
      }
    }
  }

  for (int x = -1; x < dimsP3[0]; x++) {
    float ax = shifts[0] + x;
    // float cx = ax - (float)(limits[0])/2.0f;
    for (int z = -1; z < dimsP3[2]; z++) {
      float az = shifts[2] + z;
      // float cz = az - (float)(limits[2])/2.0f;
      for (int y = -1; y < dimsP3[1]; y++) {
        float ay = shifts[1] + y;
        // float cy = ay - (float)(limits[1])/2.0f;

        float u, v, w;
        u = ax;
        v = az;
        w = ay;
        /* if (std::abs(cx) >= std::abs(cy) && std::abs(cx) >= std::abs(cz)) {
          if (cx >= 0) {
            thNoise = &thNoises.noises[0];
            u = az;
            v = ay;
            w = cx;
          } else {
            thNoise = &thNoises.noises[1];
            u = az;
            v = ay;
            w = -cx;
          }
        } else if (std::abs(cy) >= std::abs(cx) && std::abs(cy) >= std::abs(cz)) {
          if (cy >= 0) {
            thNoise = &thNoises.noises[2];
            u = ax;
            v = az;
            w = cy;
          } else {
            thNoise = &thNoises.noises[3];
            u = ax;
            v = az;
            w = -cy;
          }
        } else {
          if (cz >= 0) {
            thNoise = &thNoises.noises[4];
            u = ax;
            v = ay;
            w = cz;
          } else {
            thNoise = &thNoises.noises[5];
            u = ax;
            v = ay;
            w = -cz;
          }
        } */
        std::array<Noise, 7> &thNoiseRef = thNoises.noises;

        int biomeSrcIndex = (x + 1 + 4) +
          (z + 1 + 4) * dimsP12[0];
        unsigned char biome = biomesAux[biomeSrcIndex];

        float totalHeight = 0;
        for (int dz = -4; dz <= 4; dz++) {
          for (int dx = -4; dx <= 4; dx++) {
            int biomeSrcIndex = (x + 1 + 4 + dx) +
              (z + 1 + 4 + dz) * dimsP12[0];
            float biomeHeight = biomesAuxHeight[biomeSrcIndex];
            totalHeight += biomeHeight;
          }
        }
        float height = totalHeight/(float)((4+1+4)*(4+1+4));

        if (x < dimsP2[0] && y < dimsP2[1] && z < dimsP2[2]) {
          int potentialIndex = (x + 1) +
            ((z + 1) * dimsP3[0]) +
            ((y + 1) * dimsP3[0] * dimsP3[1]);
          potential[potentialIndex] = (w < height) ? -potentialDefault : potentialDefault;
        }
        if (x >= 0 && y >= 0 && z >= 0) {
          if (x < dimsP1[0] && y < dimsP1[1] && z < dimsP1[2]) {
            int heightfieldIndex = x +
              (z * dimsP1[0]) +
              (y * dimsP1[0] * dimsP1[1]);
            if (ay >= (float)waterLevel) {
              heightfield[heightfieldIndex] = (char)std::min<float>(std::max<float>(8.0f + 0.5f - (height - w), 0.0f), 8.0f);
            } else {
              heightfield[heightfieldIndex] = (char)-1;
            }

            int biomeIndex = x +
              (z * dimsP1[0]);
            biomes[biomeIndex] = biome;
          }
          if (w < height) {
            int fillIndex = x +
              (z * dimsP3[0]) +
              (y * dimsP3[0] * dimsP3[1]);
            fills[fillIndex] = FILL_LOCAL;
          }
        }
      }
    }
  }

  const int ox = (int)(shifts[0]/dims[0]);
  const int oy = (int)(shifts[1]/dims[1]);
  const int oz = (int)(shifts[2]/dims[2]);
  for (int doz = -4; doz <= 4; doz++) {
    for (int doy = -4; doy <= 4; doy++) {
      for (int dox = -4; dox <= 4; dox++) {
        const int aox = ox + dox;
        const int aoy = oy + doy;
        const int aoz = oz + doz;

        const int nx = aox * dims[0];
        const int ny = aoy * dims[1];
        const int nz = aoz * dims[2];
        const float n = nestNoise.in3D(nx, ny, nz);
        const int numNests = (int)std::floor(n * 2);

        for (int i = 0; i < numNests; i++) {
          const int nx = aox * dims[0] + i * 1000;
          const int ny = aoy * dims[1] + i * 1000;
          const int nz = aoz * dims[2] + i * 1000;
          const float nestX = (float)(aox * dims[0]) + nestNoiseX.in2D(ny, nz) * dims[0];
          const float nestY = (float)(aoy * dims[1]) + nestNoiseY.in2D(nx, nz) * dims[1];
          const float nestZ = (float)(aoz * dims[2]) + nestNoiseZ.in2D(nx, ny) * dims[2];

          const int numWorms = (int)std::floor(numWormsNoise.in3D(nx, ny, nz) * wormRate);
          for (int j = 0; j < numWorms; j++) {
            float cavePosX = nestX;
            float cavePosY = nestY;
            float cavePosZ = nestZ;
            const int caveLength = (int)((0.75 + caveLengthNoise.in3D(nx, ny, nz) * 0.25) * dims[0] * 2);

            float theta = caveThetaNoise.in2D(nx, nz) * PI * 2;
            float deltaTheta = 0;
            float phi = cavePhiNoise.in2D(nx, nz) * PI * 2;
            float deltaPhi = 0;

            const float caveRadius = caveRadiusNoise.in3D(nx, ny, nz);

            for (int len = 0; len < caveLength; len++) {
              const int nx = aox * dims[0] + i + len;
              const int nz = aoz * dims[2] + i + len;

              cavePosX += sin(theta) * cos(phi);
              cavePosY += cos(theta) * cos(phi);
              cavePosZ += sin(phi);

              theta += deltaTheta * 0.2;
              deltaTheta = (deltaTheta * 0.9) + (-0.5 + caveDeltaThetaNoise.in3D(nx, ny, nz));
              phi = phi/2 + deltaPhi/4;
              deltaPhi = (deltaPhi * 0.75) + (-0.5 + caveDeltaPhiNoise.in3D(nx, ny, nz));

              if (caveFillNoise.in3D(nx, ny, nz) >= 0.25) {
                const float centerPosX = cavePosX + (caveCenterNoiseX.in2D(ny, nz) * 4 - 2) * 0.2;
                const float centerPosY = cavePosY + (caveCenterNoiseY.in2D(nx, nz) * 4 - 2) * 0.2;
                const float centerPosZ = cavePosZ + (caveCenterNoiseZ.in2D(nx, ny) * 4 - 2) * 0.2;

                const float radius = wormRadiusBase + wormRadiusRate * caveRadius * sin(len * PI / caveLength);
                _fillOblateSpheroid<float>(centerPosX, centerPosY, centerPosZ, 1, 1, 1, ox * dims[0], oy * dims[1], oz * dims[2], (ox + 1) * dims[0] + 1, (oy + 1) * dims[1] + 1, (oz + 1) * dims[2] + 1, radius, dimsP3, potential, [&](float oldVal, float distance) -> float {
                  return oldVal - (1 + ((radius - std::sqrt(distance)) / radius));
                });
                _fillOblateSpheroid<unsigned char>(centerPosX, centerPosY, centerPosZ, 0, 0, 0, ox * dims[0], oy * dims[1], oz * dims[2], (ox + 1) * dims[0] + 3, (oy + 1) * dims[1] + 3, (oz + 1) * dims[2] + 3, radius, dimsP3, fills.data(), [&](unsigned char oldVal, float distance) -> float {
                  return 0;
                });
              }
            }
          }
        }
      }
    }
  }

  for (int x = 0; x < dims[0]; x++) {
    for (int z = 0; z < dims[2]; z++) {
      for (int y = 0; y < dims[1]; y++) {
        int fillIndex = x +
          (z * dimsP3[0]) +
          (y * dimsP3[0] * dimsP3[1]);
        bool topEmpty = true;
        {
          int dy = 2;
          int ay = y + dy;
          for (int dx = 0; dx < 3; dx++) {
            int ax = x + dx;
            for (int dz = 0; dz < 3; dz++) {
              int az = z + dz;
              int fillIndex = x +
                (z * dimsP3[0]) +
                (y * dimsP3[0] * dimsP3[1]);
              if (fills[fillIndex]&FILL_LOCAL) {
                topEmpty = false;
              }
            }
          }
        }
        if (!topEmpty) {
          fills[fillIndex] |= FILL_TOP;
        }
        bool bottomEmpty = true;
        {
          int dy = 0;
          int ay = y + dy;
          for (int dx = 0; dx < 3; dx++) {
            int ax = x + dx;
            for (int dz = 0; dz < 3; dz++) {
              int az = z + dz;
              int fillIndex = x +
                (z * dimsP3[0]) +
                (y * dimsP3[0] * dimsP3[1]);
              if (fills[fillIndex]&FILL_LOCAL) {
                bottomEmpty = false;
              }
            }
          }
        }
        if (!bottomEmpty) {
          fills[fillIndex] |= FILL_BOTTOM;
        }
        bool leftEmpty = true;
        {
          int dx = 0;
          int ax = x + dx;
          for (int dy = 0; dy < 3; dy++) {
            int ay = y + dy;
            for (int dz = 0; dz < 3; dz++) {
              int az = z + dz;
              int fillIndex = x +
                (z * dimsP3[0]) +
                (y * dimsP3[0] * dimsP3[1]);
              if (fills[fillIndex]&FILL_LOCAL) {
                leftEmpty = false;
              }
            }
          }
        }
        if (!leftEmpty) {
          fills[fillIndex] |= FILL_LEFT;
        }
        bool rightEmpty = true;
        {
          int dx = 2;
          int ax = x + dx;
          for (int dy = 0; dy < 3; dy++) {
            int ay = y + dy;
            for (int dz = 0; dz < 3; dz++) {
              int az = z + dz;
              int fillIndex = x +
                (z * dimsP3[0]) +
                (y * dimsP3[0] * dimsP3[1]);
              if (fills[fillIndex]&FILL_LOCAL) {
                rightEmpty = false;
              }
            }
          }
        }
        if (!rightEmpty) {
          fills[fillIndex] |= FILL_RIGHT;
        }
        bool frontEmpty = true;
        {
          int dz = 2;
          int az = z + dz;
          for (int dx = 0; dx < 3; dx++) {
            int ax = x + dx;
            for (int dz = 0; dz < 3; dz++) {
              int az = z + dz;
              int fillIndex = x +
                (z * dimsP3[0]) +
                (y * dimsP3[0] * dimsP3[1]);
              if (fills[fillIndex]&FILL_LOCAL) {
                frontEmpty = false;
              }
            }
          }
        }
        if (!frontEmpty) {
          fills[fillIndex] |= FILL_FRONT;
        }
        bool backEmpty = true;
        {
          int dz = 0;
          int az = z + dz;
          for (int dx = 0; dx < 3; dx++) {
            int ax = x + dx;
            for (int dy = 0; dy < 3; dy++) {
              int ay = y + dy;
              int fillIndex = x +
                (z * dimsP3[0]) +
                (y * dimsP3[0] * dimsP3[1]);
              if (fills[fillIndex]&FILL_LOCAL) {
                backEmpty = false;
              }
            }
          }
        }
        if (!backEmpty) {
          fills[fillIndex] |= FILL_BACK;
        }

        int fillIndexUpRightForward = (x+1) +
          ((z+1) * dimsP3[0]) +
          ((y+1) * dimsP3[0] * dimsP3[1]);
        if (!(fills[fillIndexUpRightForward]&FILL_LOCAL) && !bottomEmpty) {
          fills[fillIndexUpRightForward] |= FILL_BASE;
        }
      }
    }
  }

  unsigned int &i = numObjects;
  i = 0;
  for (int x = 0; x < dims[0] && i < PLANET_OBJECT_SLOTS; x++) {
    float ax = shifts[0] + x;
    // float cx = ax - (float)(limits[0])/2.0f;
    for (int z = 0; z < dims[2] && i < PLANET_OBJECT_SLOTS; z++) {
      float az = shifts[2] + z;
      // float cz = az - (float)(limits[2])/2.0f;
      for (int y = 0; y < dims[1] && i < PLANET_OBJECT_SLOTS; y++) {
        float ay = shifts[1] + y;
        // float cy = ay - (float)(limits[1])/2.0f;

        int fillIndex = x +
          (z * dimsP3[0]) +
          (y * dimsP3[0] * dimsP3[1]);
        if ((bool)(fills[fillIndex]&FILL_BASE)) {
          if (numObjectsNoise.in3D(ax, ay, az) < 0.1) {
            Object &object = objects[i];

            object.id = (unsigned int)rand();
            object.type = OBJECT_TYPE::VEGETATION;
            float nameNoise = objectsTypeNoise.in3D(ax + i * 1000.0f, ay + i * 1000.0f, az + i * 1000.0f);
            if (nameNoise < SPAWNER_RATE) {
              strcpy(object.name, "spawner");
            } else {
              strcpy(object.name, "tree1");
            }

            object.position.x = ax;
            object.position.y = ay;
            object.position.z = az;

            object.quaternion.x = 0;
            object.quaternion.y = 0;
            object.quaternion.z = 0;
            object.quaternion.w = 1;

            i++;
          }
        }
      }
    }
  }
}