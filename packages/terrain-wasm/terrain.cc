#include "terrain.h"
#include "SimplexNoise.h"
#include <iostream>

#include <vector>
#include <array>
#include <cmath>

using namespace std;

const float mountainHeight = 40.f;

double clamp(double x, double lower, double upper) {
    return std::max(lower, std::min(x, upper));
}

float lerp(float start, float end, float t) {
    return start + (end - start) * t;
}

// Generate 2D ridge noise value at (x, y)
double ridge_noise(double x, double y)
{
    double value = 0.0;
    double frequency = 1.0;
    double amplitude = 50.0;
    double gain = 0.45;
    double lacunarity = 2.0;
    int octaves = 1;
    
    for (int i = 0; i < octaves; i++)
    {
        double n = SimplexNoise::noise(x * frequency, y * frequency);
        n = pow(n, 2.0);
        value += n * amplitude;

        frequency *= lacunarity;
        amplitude *= gain;
    }

    return fabs(value);
}

double getElevation(double x, double y, double lacunarity, double persistence, int iterations,
                    double baseFrequency, double baseAmplitude, double power,
                    double elevationOffset, const vector<pair<double, double>>& iterationsOffsets) {
    double elevation = 0;
    double frequency = baseFrequency;
    double amplitude = 1;
    double normalisation = 0;

    for (int i = 0; i < iterations; i++) {
      double noise = SimplexNoise::noise(x * frequency + iterationsOffsets[i].first, y * frequency + iterationsOffsets[i].second);
      elevation += noise * amplitude;

      normalisation += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    // terrace
    double tnoise = (SimplexNoise::noise(x * 0.01, y * 0.01) + 1) * 0.5;
    float terrace = clamp(elevation, -1, 0.8);
    elevation = lerp(elevation, terrace, tnoise);
    elevation = fabs(elevation);

    elevation /= normalisation;
    elevation = pow(fabs(elevation), power) * (elevation >= 0 ? 1 : -1);
    elevation *= baseAmplitude;

    double elevationOffsetNoise = SimplexNoise::noise(x * 0.001, y * 0.001) * mountainHeight; // add noise for elevation;
    elevation += elevationOffset + elevationOffsetNoise;

    return elevation;
}

std::array<float, 4> getPlantInfo(float targetX, float targetZ, int subdivisions, float size, float x, float z, float* positions, float* normals, float* weights) {
    const int segments = subdivisions + 1;
    const float subSize = size / subdivisions;

    // Relative position
    const float halfSize = size * 0.5;
    const float relativeX = targetX - x + halfSize;
    const float relativeZ = targetZ - z + halfSize;

    // Ratio
    const float xRatio = std::fmod(relativeX / subSize, 1.0f);
    const float zRatio = std::fmod(relativeZ / subSize, 1.0f);

    // Indexes
    const int aIndexX = std::floor(relativeX / subSize);
    const int aIndexZ = std::floor(relativeZ / subSize);

    const int cIndexX = aIndexX + 1;
    const int cIndexZ = aIndexZ + 1;

    const int bIndexX = xRatio < zRatio ? aIndexX : aIndexX + 1;
    const int bIndexZ = xRatio < zRatio ? aIndexZ + 1 : aIndexZ;

    const int aStrideIndex = (aIndexZ * segments + aIndexX) * 3;
    const int bStrideIndex = (bIndexZ * segments + bIndexX) * 3;
    const int cStrideIndex = (cIndexZ * segments + cIndexX) * 3;

    const int aWeightIndex = (aIndexZ * segments + aIndexX) * 4;
    const int bWeightIndex = (bIndexZ * segments + bIndexX) * 4;
    const int cWeightIndex = (cIndexZ * segments + cIndexX) * 4;

    // Weights
    const float weight1 = xRatio < zRatio ? 1 - zRatio : 1 - xRatio;
    const float weight2 = xRatio < zRatio ? - (xRatio - zRatio) : xRatio - zRatio;
    const float weight3 = 1 - weight1 - weight2;

    if (aWeightIndex >= segments * segments * 4 || bWeightIndex >= segments * segments * 4 || cWeightIndex >= segments * segments * 4) {
        return {false, false, false, false};
    }

    // Normal
    const float aNormal = normals[aStrideIndex + 1];
    const float bNormal = normals[bStrideIndex + 1];
    const float cNormal = normals[cStrideIndex + 1];
    const float normalY = aNormal * weight1 + bNormal * weight2 + cNormal * weight3;

    // Weight
    const float aGrassWeight = weights[aWeightIndex + 0];
    const float bGrassWeight = weights[bWeightIndex + 0];
    const float cGrassWeight = weights[cWeightIndex + 0];
    const float grassWeight = aGrassWeight * weight1 + bGrassWeight * weight2 + cGrassWeight * weight3;

    const float aRockWeight = weights[aWeightIndex + 1];
    const float bRockWeight = weights[bWeightIndex + 1];
    const float cRockWeight = weights[cWeightIndex + 1];
    const float rockWeight = aRockWeight * weight1 + bRockWeight * weight2 + cRockWeight * weight3;

    const float aDirtWeight = weights[aWeightIndex + 2];
    const float bDirtWeight = weights[bWeightIndex + 2];
    const float cDirtWeight = weights[cWeightIndex + 2];
    const float dirtWeight = aDirtWeight * weight1 + bDirtWeight * weight2 + cDirtWeight * weight3;

    const float aSandWeight = weights[aWeightIndex + 3];
    const float bSandWeight = weights[bWeightIndex + 3];
    const float cSandWeight = weights[cWeightIndex + 3];
    const float sandWeight = aSandWeight * weight1 + bSandWeight * weight2 + cSandWeight * weight3;

    const float thresHoldOfGrass = 0.1;
    if (
      normalY > 0.1 
      // && grassWeight > 0.9
      && grassWeight - rockWeight > thresHoldOfGrass 
      && grassWeight - dirtWeight > thresHoldOfGrass
      && grassWeight - sandWeight > thresHoldOfGrass
    ) {
        // Elevation
        const float aElevation = positions[aStrideIndex + 1];
        const float bElevation = positions[bStrideIndex + 1];
        const float cElevation = positions[cStrideIndex + 1];
        const float elevation = aElevation * weight1 + bElevation * weight2 + cElevation * weight3;

        const float aNormalX = normals[aStrideIndex];
        const float bNormalX = normals[bStrideIndex];
        const float cNormalX = normals[cStrideIndex];
        const float normalX = aNormalX * weight1 + bNormalX * weight2 + cNormalX * weight3;

        const float aNormalZ = normals[aStrideIndex + 2];
        const float bNormalZ = normals[bStrideIndex + 2];
        const float cNormalZ = normals[cStrideIndex + 2];
        const float normalZ = aNormalZ * weight1 + bNormalZ * weight2 + cNormalZ * weight3;

        return {normalX, normalY, normalZ, elevation};
    }
    else {
        return {false, false, false, false};
    }
}

void Terrain::getTerrain(
  float *scratchStack
) {

  float size = scratchStack[0];
  float baseX = scratchStack[1];
  float baseZ = scratchStack[2];
  float seed = scratchStack[3];
  int subdivisions = scratchStack[4];
  float lacunarity = scratchStack[5];
  float persistence = scratchStack[6];
  float iterations = scratchStack[7];
  float baseFrequency = scratchStack[8];
  float baseAmplitude = scratchStack[9];
  float power = scratchStack[10];
  float elevationOffset = scratchStack[11];
  const int maxIterations = scratchStack[12];
  const int segments =  (int)subdivisions + 1;

  float xMin = scratchStack[13];
  float xMax = scratchStack[14];
  float zMin = scratchStack[15];
  float zMax = scratchStack[16];

  // std::cout << size << std::endl;
  // std::cout << baseX << std::endl;
  // std::cout << baseZ << std::endl;
  // std::cout << seed << std::endl;
  // std::cout << subdivisions << std::endl;
  // std::cout << lacunarity << std::endl;
  // std::cout << persistence << std::endl;
  // std::cout << iterations << std::endl;
  // std::cout << baseFrequency << std::endl;
  // std::cout << baseAmplitude << std::endl;
  // std::cout << power << std::endl;
  // std::cout << elevationOffset << std::endl;
  
  // std::cout << segments << std::endl;

  vector<pair<double, double>> iterationsOffsets;

  for (int i = 0; i < maxIterations * 2; i += 2) {
    double x = scratchStack[17 + i];
    double y = scratchStack[17 + i + 1];
    iterationsOffsets.push_back(make_pair(x, y));
  }


  /**
   * Elevation
   */
  
  std::vector<float> overflowElevations((segments + 1) * (segments + 1)); // Bigger to calculate normals more accurately
  std::vector<float> elevations(segments * segments);

  for (int iX = 0; iX < segments + 1; iX++) {
    const float x = baseX + (static_cast<float>(iX) / subdivisions - 0.5f) * size;

    for (int iZ = 0; iZ < segments + 1; iZ++) {
      const float z = baseZ + (static_cast<float>(iZ) / subdivisions - 0.5f) * size;
      const float elevation = getElevation(x, z, lacunarity, persistence, iterations, baseFrequency, baseAmplitude, power, elevationOffset, iterationsOffsets);
      // const float elevation = SimplexNoise::noise(x, z);

      const int i = iZ * (segments + 1) + iX;
      overflowElevations[i] = elevation;

      if (iX < segments && iZ < segments) {
        const int j = iZ * segments + iX;
        elevations[j] = elevation;
      }
    }
  }


  /**
   * Positions
   */

  const int skirtCount = subdivisions * 4 + 4;
  std::vector<float> positions(segments * segments * 3 + skirtCount * 3);

  for (int iZ = 0; iZ < segments; iZ++) {
    const float z = baseZ + (static_cast<float>(iZ) / subdivisions - 0.5f) * size;
    for (int iX = 0; iX < segments; iX++) {
      const float x = baseX + (static_cast<float>(iX) / subdivisions - 0.5f) * size;

      const float elevation = elevations[iZ * segments + iX];

      const int iStride = (iZ * segments + iX) * 3;
      positions[iStride    ] = x;
      positions[iStride + 1] = elevation;
      positions[iStride + 2] = z;
    }
  }


  /**
   * Normals
  */

  const float interSegmentX = - static_cast<float>(size) / subdivisions;
  const float interSegmentZ = - static_cast<float>(size) / subdivisions;

  std::vector<float> normals(segments * segments * 3 + skirtCount * 3);

  for (int iZ = 0; iZ < segments; iZ++) {
    for (int iX = 0; iX < segments; iX++) {
      // Indexes
      const int iOverflowStride = iZ * (segments + 1) + iX;

      // Elevations
      const float currentElevation = overflowElevations[iOverflowStride];
      const float neighbourXElevation = overflowElevations[iOverflowStride + 1];
      const float neighbourZElevation = overflowElevations[iOverflowStride + segments + 1];

      // Deltas
      const float deltaX[3] = {
        interSegmentX,
        currentElevation - neighbourXElevation,
        0
      };

      const float deltaZ[3] = {
        0,
        currentElevation - neighbourZElevation,
        interSegmentZ
      };

      // Normal
      float normal[3] = {0, 0, 0};
      auto cross = [](float out[3], const float a[3], const float b[3]) {
        const float ax = a[0], ay = a[1], az = a[2];
        const float bx = b[0], by = b[1], bz = b[2];
        
        out[0] = ay * bz - az * by;
        out[1] = az * bx - ax * bz;
        out[2] = ax * by - ay * bx;
        return out;
      };
      auto normalize = [](float out[3], const float a[3]) {
        const float x = a[0], y = a[1], z = a[2];
        float len = x * x + y * y + z * z;
        if (len > 0) {
          // TODO: evaluate use of glm_invsqrt here?
          len = 1 / std::sqrt(len);
        }
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
        return out;
      };
      cross(normal, deltaZ, deltaX);
      normalize(normal, normal);

      const int iStride = (iZ * segments + iX) * 3;
      normals[iStride    ] = normal[0];
      normals[iStride + 1] = normal[1];
      normals[iStride + 2] = normal[2];
    }
  }


  /**
   * UV
   */

  std::vector<float> uv(segments * segments * 2 + skirtCount * 2);

  for (int iZ = 0; iZ < segments; iZ++) {
    for (int iX = 0; iX < segments; iX++) {
      const int iStride = (iZ * segments + iX) * 2;
      uv[iStride] = static_cast<float>(iX) / static_cast<float>(segments - 1);
      uv[iStride + 1] = static_cast<float>(iZ) / static_cast<float>(segments - 1);
    }
  }


  /**
   * Indices
   */

  int indicesCount = subdivisions * subdivisions;
  vector<float> indices(indicesCount * 6 + subdivisions * 4 * 6 * 4);

  for (int iZ = 0; iZ < subdivisions; iZ++) {
    for (int iX = 0; iX < subdivisions; iX++) {
      const int row = subdivisions + 1;
      const int a = iZ * row + iX;
      const int b = iZ * row + (iX + 1);
      const int c = (iZ + 1) * row + iX;
      const int d = (iZ + 1) * row + (iX + 1);

      const int iStride = (iZ * subdivisions + iX) * 6;
      indices[iStride] = a;
      indices[iStride + 1] = d;
      indices[iStride + 2] = b;

      indices[iStride + 3] = d;
      indices[iStride + 4] = a;
      indices[iStride + 5] = c;
    }
  }



  /**
   * Skirt
   */
  int skirtIndex = segments * segments;
  int indicesSkirtIndex = segments * segments;

  // North (negative Z)
  for (int iX = 0; iX < segments; iX++) {
    const int iZ = 0;
    const int iPosition = iZ * segments + iX;
    const int iPositionStride = iPosition * 3;

    // Position
    positions[skirtIndex * 3] = positions[iPositionStride];
    positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
    positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

    // Normal
    normals[skirtIndex * 3] = normals[iPositionStride];
    normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
    normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];

    // UV
    uv[skirtIndex * 2] = static_cast<float>(iZ) / static_cast<float>(segments - 1);
    uv[skirtIndex * 2 + 1] = static_cast<float>(iX) / static_cast<float>(segments - 1);

    // Index
    if (iX < segments - 1) {
      const int a = iPosition;
      const int b = iPosition + 1;
      const int c = skirtIndex;
      const int d = skirtIndex + 1;

      const int iIndexStride = indicesSkirtIndex * 6;
      indices[iIndexStride] = b;
      indices[iIndexStride + 1] = d;
      indices[iIndexStride + 2] = a;

      indices[iIndexStride + 3] = c;
      indices[iIndexStride + 4] = a;
      indices[iIndexStride + 5] = d;

      indicesSkirtIndex++;
    }

    skirtIndex++;
  }

  // South (positive Z)
  for (int iX = 0; iX < segments; iX++) {
    const int iZ = segments - 1;
    const int iPosition = iZ * segments + iX;
    const int iPositionStride = iPosition * 3;

    // Position
    positions[skirtIndex * 3] = positions[iPositionStride];
    positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
    positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

    // Normal
    normals[skirtIndex * 3] = normals[iPositionStride];
    normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
    normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];

    // UV
    uv[skirtIndex * 2] = static_cast<float>(iZ) / static_cast<float>(segments - 1);
    uv[skirtIndex * 2 + 1] = static_cast<float>(iX) / static_cast<float>(segments - 1);

    // Index
    if (iX < segments - 1) {
      const int a = iPosition;
      const int b = iPosition + 1;
      const int c = skirtIndex;
      const int d = skirtIndex + 1;

      const int iIndexStride = indicesSkirtIndex * 6;
      indices[iIndexStride] = a;
      indices[iIndexStride + 1] = c;
      indices[iIndexStride + 2] = b;

      indices[iIndexStride + 3] = d;
      indices[iIndexStride + 4] = b;
      indices[iIndexStride + 5] = c;

      indicesSkirtIndex++;
    }

    skirtIndex++;
  }

  // West (negative X)
  for (int iZ = 0; iZ < segments; iZ++) {
    const int iX = 0;
    const int iPosition = iZ * segments + iX;
    const int iPositionStride = iPosition * 3;

    // Position
    positions[skirtIndex * 3] = positions[iPositionStride];
    positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
    positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

    // Normal
    normals[skirtIndex * 3] = normals[iPositionStride];
    normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
    normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];

    // UV
    uv[skirtIndex * 2] = static_cast<float>(iZ) / static_cast<float>(segments - 1);
    uv[skirtIndex * 2 + 1] = static_cast<float>(iX);

    // Index
    if (iZ < segments - 1) {
      const int a = iPosition;
      const int b = iPosition + segments;
      const int c = skirtIndex;
      const int d = skirtIndex + 1;

      const int iIndexStride = indicesSkirtIndex * 6;
      indices[iIndexStride] = a;
      indices[iIndexStride + 1] = c;
      indices[iIndexStride + 2] = b;

      indices[iIndexStride + 3] = d;
      indices[iIndexStride + 4] = b;
      indices[iIndexStride + 5] = c;

      indicesSkirtIndex++;
    }

    skirtIndex++;
  }

  for (int iZ = 0; iZ < segments; iZ++) {
    const int iX = segments - 1;
    const int iPosition = iZ * segments + iX;
    const int iPositionStride = iPosition * 3;

    // Position
    positions[skirtIndex * 3] = positions[iPositionStride];
    positions[skirtIndex * 3 + 1] = positions[iPositionStride + 1] - 15;
    positions[skirtIndex * 3 + 2] = positions[iPositionStride + 2];

    // Normal
    normals[skirtIndex * 3] = normals[iPositionStride];
    normals[skirtIndex * 3 + 1] = normals[iPositionStride + 1];
    normals[skirtIndex * 3 + 2] = normals[iPositionStride + 2];

    // UV
    uv[skirtIndex * 2] = static_cast<float>(iZ) / static_cast<float>(segments - 1);
    uv[skirtIndex * 2 + 1] = static_cast<float>(iX) / static_cast<float>(segments - 1);

    // Index
    if (iZ < segments - 1) {
      const int a = iPosition;
      const int b = iPosition + segments;
      const int c = skirtIndex;
      const int d = skirtIndex + 1;

      const int iIndexStride = indicesSkirtIndex * 6;
      indices[iIndexStride] = b;
      indices[iIndexStride + 1] = d;
      indices[iIndexStride + 2] = a;

      indices[iIndexStride + 3] = c;
      indices[iIndexStride + 4] = a;
      indices[iIndexStride + 5] = d;

      indicesSkirtIndex++;
    }

    skirtIndex++;
  }

  /**
   * Texture
   */
  const int textureCount = segments * segments * 4;
  vector<float> texture(textureCount);

  const int biomeWeightCount = segments * segments * 4;
  vector<float> biomeWeight(biomeWeightCount);

  for (int iZ = 0; iZ < segments; iZ++) {
    for (int iX = 0; iX < segments; iX++) {
      const int iPositionStride = (iZ * segments + iX) * 3;
      const float position[] = {
        positions[iPositionStride],
        positions[iPositionStride + 1],
        positions[iPositionStride + 2]
      };

      const int iNormalStride = (iZ * segments + iX) * 3;

      const float maxHeight = 15.0f;
      const float minHeight = -15.0f;
      float posY = positions[iPositionStride + 1];
      float heightWeight = std::max(0.0f, std::min(1.0f, (posY - minHeight) / (maxHeight - minHeight)));
      float slopeWeight = std::max(0.0f, std::min(1.0f, 1.0f - normals[iNormalStride + 1]));

      bool isBeach = posY < 1.2;
      bool isMountain = posY > mountainHeight;
      

      float grassWeight = 0.0f;
      float rockWeight = 0.0f;
      float dirtWeight = 0.0f;
      float sandWeight = 0.0f;

      if (isBeach) {
        sandWeight = 1.0f * heightWeight;
      }
      else {
        // if (normals[iNormalStride + 1] < 0.9) {
        //   rockWeight = 1.0f;
        // }
        // else {
          
          if (isMountain) {
            if (normals[iNormalStride + 1] < 0.9) {
              float normalLerp = pow(slopeWeight, 0.3f);

              grassWeight = std::max(0.0f, std::min(1.0f, (1.0f - normalLerp)));
              rockWeight = std::max(0.0f, std::min(1.0f, normalLerp));
            }
            else {
              float normalLerp = pow(slopeWeight, 0.9f);
              
              float grassFrequency = 0.01f;
              float grassNoiseScale = 0.1f;
              float grassNoise = SimplexNoise::noise(position[0] * grassFrequency, position[2] * grassFrequency);
              grassNoise = grassNoise * grassNoiseScale;

              dirtWeight = std::max(0.0f, std::min(1.0f, (1.0f - normalLerp) * grassNoise));
              grassWeight = std::max(0.0f, std::min(1.0f, (1.0f - normalLerp) * (1.0f - grassNoise)));
              rockWeight = std::max(0.0f, std::min(1.0f, normalLerp));
            }
          }
          else {

            float dirtNoise = ridge_noise(position[0] * 0.005, position[2] * 0.005);
            // dirtWeight = (1.0f - dirtNoise);
            // grassWeight = dirtNoise;

            dirtWeight = std::max(0.0f, std::min(1.0f, (1.0f - dirtNoise)));
            grassWeight = std::max(0.0f, std::min(1.0f, dirtNoise));
            
            // grassWeight = normalLerp * (heightWeight + grassNoise * noiseScale);
            // dirtWeight = (1. - normalLerp) * (1. - heightWeight);
          }
          
        // }
      }

      // float grassWeight = std::max(0.0f, std::min(1.0f, (1.0f - slopeWeight) * heightWeight));
      // float rockWeight = std::max(0.0f, std::min(1.0f, slopeWeight * heightWeight));
      // float dirtWeight = isBeach ? 1.0f : std::max(0.0f, std::min(1.0f, (1.0f - heightWeight)));
      // float sandWeight = 0.0f;

      int iWeightStride = (iZ * segments + iX) * 4;
      biomeWeight[iWeightStride    ] = grassWeight;
      biomeWeight[iWeightStride + 1] = rockWeight;
      biomeWeight[iWeightStride + 2] = dirtWeight;
      biomeWeight[iWeightStride + 3] = sandWeight;

      // Final texture
      const int iTextureStride = (iZ * segments + iX) * 4;
      texture[iTextureStride] = normals[iNormalStride];
      texture[iTextureStride + 1] = normals[iNormalStride + 1];
      texture[iTextureStride + 2] = normals[iNormalStride + 2];
      texture[iTextureStride + 3] = position[1];
    }
  }


  std::vector<float> grassPositions;
  std::vector<float> grassTerrainSlopes;

  std::vector<float> flowerPositions;
  std::vector<float> flowerTerrainSlopes;

  std::vector<float> treeOnePositions;
  std::vector<float> treeOneTerrainSlopes;

  std::vector<float> treeTwoPositions;
  std::vector<float> treeTwoTerrainSlopes;

  std::vector<float> treeThreePositions;
  std::vector<float> treeThreeTerrainSlopes;

  int maxGrassPerChunk = 4096;
  int maxFlowersPerChunk = 1024;
  int maxTreesPerChunk = 8;

  const float grassOffset = 0.5f;

  for (float x = xMin; x < xMax && maxGrassPerChunk > 0; x += grassOffset) {
    for (float z = zMin; z < zMax && maxGrassPerChunk > 0; z += grassOffset) {
      const float grassPosNoise = SimplexNoise::noise(x * 1.0f, z * 1.0f);
      const bool hasGrass = (grassPosNoise + 1) * 0.5f > 0.67f;
      if (hasGrass) {
        std::array<float, 4> plantInfo = getPlantInfo(x, z, subdivisions, size, baseX, baseZ, positions.data(), normals.data(), biomeWeight.data());
        const float plantElevation = plantInfo[3];

        if (plantElevation != false) {
          grassPositions.push_back(x);
          grassPositions.push_back(plantElevation);
          grassPositions.push_back(z);

          grassTerrainSlopes.push_back(plantInfo[0]);
          grassTerrainSlopes.push_back(plantInfo[1]);
          grassTerrainSlopes.push_back(plantInfo[2]);

          maxGrassPerChunk--;

          // only set the flower if there is the grasses
          const bool hasFlower = (grassPosNoise + 1) * 0.5f > 0.9f;
          if (hasFlower && maxFlowersPerChunk > 0) {
            flowerPositions.push_back(x);
            flowerPositions.push_back(plantElevation);
            flowerPositions.push_back(z);

            flowerTerrainSlopes.push_back(plantInfo[0]);
            flowerTerrainSlopes.push_back(plantInfo[1]);
            flowerTerrainSlopes.push_back(plantInfo[2]);
            maxFlowersPerChunk --;
          }

          // only set the tree when there is the grass
          const bool hasTree = (grassPosNoise + 1) * 0.5f > 0.998f && plantInfo[1] > 0.9;
          if (hasTree && maxTreesPerChunk > 0) {

            const float treeTypeNoise = (SimplexNoise::noise(x * 0.5f, z * 0.5f) + 1) * 0.5;
            if (treeTypeNoise < 0.35) {
              treeOnePositions.push_back(x);
              treeOnePositions.push_back(plantElevation);
              treeOnePositions.push_back(z);

              treeOneTerrainSlopes.push_back(plantInfo[0]);
              treeOneTerrainSlopes.push_back(plantInfo[1]);
              treeOneTerrainSlopes.push_back(plantInfo[2]);
            }
            else if (treeTypeNoise < 0.7){
              treeTwoPositions.push_back(x);
              treeTwoPositions.push_back(plantElevation);
              treeTwoPositions.push_back(z);

              treeTwoTerrainSlopes.push_back(plantInfo[0]);
              treeTwoTerrainSlopes.push_back(plantInfo[1]);
              treeTwoTerrainSlopes.push_back(plantInfo[2]);
            }
            else {
              treeThreePositions.push_back(x);
              treeThreePositions.push_back(plantElevation);
              treeThreePositions.push_back(z);

              treeThreeTerrainSlopes.push_back(plantInfo[0]);
              treeThreeTerrainSlopes.push_back(plantInfo[1]);
              treeThreeTerrainSlopes.push_back(plantInfo[2]);
            }

            
            maxTreesPerChunk --;
          }
        }
      }
    }
  }

  int resultIndex = 0;
  for (int i = 0; i < positions.size(); i++) {
    scratchStack[resultIndex] = positions[i];
    resultIndex ++;
  }

  for (int i = 0; i < normals.size(); i++) {
    scratchStack[resultIndex] = normals[i];
    resultIndex ++;
  }

  for (int i = 0; i < indices.size(); i++) {
    scratchStack[resultIndex] = indices[i];
    resultIndex ++;
  }

  for (int i = 0; i < texture.size(); i++) {
    scratchStack[resultIndex] = texture[i];
    resultIndex ++;
  }

  for (int i = 0; i < uv.size(); i++) {
    scratchStack[resultIndex] = uv[i];
    resultIndex ++;
  }

  for (int i = 0; i < biomeWeight.size(); i++) {
    scratchStack[resultIndex] = biomeWeight[i];
    resultIndex ++;
  }

  scratchStack[resultIndex] = grassPositions.size();
  resultIndex ++;
  for (int i = 0; i < grassPositions.size(); i++) {
    scratchStack[resultIndex] = grassPositions[i];
    resultIndex ++;
  }

  scratchStack[resultIndex] = grassTerrainSlopes.size();
  resultIndex ++;
  for (int i = 0; i < grassTerrainSlopes.size(); i++) {
    scratchStack[resultIndex] = grassTerrainSlopes[i];
    resultIndex ++;
  }

  scratchStack[resultIndex] = flowerPositions.size();
  resultIndex ++;
  for (int i = 0; i < flowerPositions.size(); i++) {
    scratchStack[resultIndex] = flowerPositions[i];
    resultIndex ++;
  }

  scratchStack[resultIndex] = flowerTerrainSlopes.size();
  resultIndex ++;
  for (int i = 0; i < flowerTerrainSlopes.size(); i++) {
    scratchStack[resultIndex] = flowerTerrainSlopes[i];
    resultIndex ++;
  }

  scratchStack[resultIndex] = treeOnePositions.size();
  resultIndex ++;
  for (int i = 0; i < treeOnePositions.size(); i++) {
    scratchStack[resultIndex] = treeOnePositions[i];
    resultIndex ++;
  }

  scratchStack[resultIndex] = treeOneTerrainSlopes.size();
  resultIndex ++;
  for (int i = 0; i < treeOneTerrainSlopes.size(); i++) {
    scratchStack[resultIndex] = treeOneTerrainSlopes[i];
    resultIndex ++;
  }

  scratchStack[resultIndex] = treeTwoPositions.size();
  resultIndex ++;
  for (int i = 0; i < treeTwoPositions.size(); i++) {
    scratchStack[resultIndex] = treeTwoPositions[i];
    resultIndex ++;
  }

  scratchStack[resultIndex] = treeTwoTerrainSlopes.size();
  resultIndex ++;
  for (int i = 0; i < treeTwoTerrainSlopes.size(); i++) {
    scratchStack[resultIndex] = treeTwoTerrainSlopes[i];
    resultIndex ++;
  }

  scratchStack[resultIndex] = treeThreePositions.size();
  resultIndex ++;
  for (int i = 0; i < treeThreePositions.size(); i++) {
    scratchStack[resultIndex] = treeThreePositions[i];
    resultIndex ++;
  }

  scratchStack[resultIndex] = treeThreeTerrainSlopes.size();
  resultIndex ++;
  for (int i = 0; i < treeThreeTerrainSlopes.size(); i++) {
    scratchStack[resultIndex] = treeThreeTerrainSlopes[i];
    resultIndex ++;
  }
  
}
