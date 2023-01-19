#include "tssl.h"
#include <string.h>
#include <memory>
#include <limits>
#include <unordered_map>
#include "vector.h"
// #include <iostream>

const unsigned int NUM_POSITIONS_CHUNK = 100 * 1024;
const unsigned int MASK_SIZE = 4096;

unsigned int colors[MASK_SIZE];
unsigned int invColors[MASK_SIZE];
bool mask[MASK_SIZE];
bool invMask[MASK_SIZE];

inline int _getBlockIndex(int x, int y, int z) {
  return x + y * 16 + z * 16 * 16;
}

// Generate mesh for mask using lexicographic ordering
void generateMesh(unsigned int *colors, bool *mask, int d, int u, int v, int dimsU, int dimsV, int *x, float *vertices, unsigned int &vertexIndex, unsigned int *faces, unsigned int &faceIndex, float *tVertices, unsigned int &tVertexIndex, unsigned int *tFaces, unsigned int &tFaceIndex, bool clockwise) {
  int n = 0;
  int du[3] = {0,0,0};
  int dv[3] = {0,0,0};
  for (int j=0; j < dimsV; ++j) {
    for (int i=0; i < dimsU; ) {
      unsigned int c = colors[n];
      if (!c) {
        i++;  n++; continue;
      }
      bool t = mask[n];

      //Compute width
      int w = 1;
      while (c == colors[n+w] && i+w < dimsU) w++;

      //Compute height (this is slightly awkward)
      int h;
      for (h=1; j+h < dimsV; ++h) {
        int k = 0;
        while (k < w && c == colors[n+k+h*dimsU]) k++;
        if (k < w) break;
      }

      // Add quad
      // The du/dv arrays are reused/reset
      // for each iteration.
      du[d] = 0; dv[d] = 0;
      x[u]  = i;  x[v] = j;

      if (clockwise) {
      // if (c > 0) {
        dv[v] = h; dv[u] = 0;
        du[u] = w; du[v] = 0;
      } else {
        // c = -c;
        du[v] = h; du[u] = 0;
        dv[u] = w; dv[v] = 0;
      }

      // ## enable code to ensure that transparent faces are last in the list
      if (!t) {
        vertices[vertexIndex++] = x[0];             vertices[vertexIndex++] = x[1];             vertices[vertexIndex++] = x[2];
        vertices[vertexIndex++] = x[0]+du[0];       vertices[vertexIndex++] = x[1]+du[1];       vertices[vertexIndex++] = x[2]+du[2];
        vertices[vertexIndex++] = x[0]+du[0]+dv[0]; vertices[vertexIndex++] = x[1]+du[1]+dv[1]; vertices[vertexIndex++] = x[2]+du[2]+dv[2];
        vertices[vertexIndex++] = x[0]      +dv[0]; vertices[vertexIndex++] = x[1]      +dv[1]; vertices[vertexIndex++] = x[2]      +dv[2];

        faces[faceIndex++] = c;
      } else {
        tVertices[tVertexIndex++] = x[0];             tVertices[tVertexIndex++] = x[1];             tVertices[tVertexIndex++] = x[2];
        tVertices[tVertexIndex++] = x[0]+du[0];       tVertices[tVertexIndex++] = x[1]+du[1];       tVertices[tVertexIndex++] = x[2]+du[2];
        tVertices[tVertexIndex++] = x[0]+du[0]+dv[0]; tVertices[tVertexIndex++] = x[1]+du[1]+dv[1]; tVertices[tVertexIndex++] = x[2]+du[2]+dv[2];
        tVertices[tVertexIndex++] = x[0]      +dv[0]; tVertices[tVertexIndex++] = x[1]      +dv[1]; tVertices[tVertexIndex++] = x[2]      +dv[2];

        tFaces[tFaceIndex++] = c;
      }

      //Zero-out mask
      int W = n + w;
      for(int l=0; l<h; ++l) {
        for(int k=n; k<W; ++k) {
          const int index = k+l*dimsU;
          colors[index] = 0;
          mask[index] = 0;
        }
      }

      //Increment counters and continue
      i += w; n += w;
    }
  }
}

inline unsigned int findBlockType(unsigned int n, unsigned int *blockTypes, std::unordered_map<unsigned int, unsigned int> &blockTypesCache) {
  std::unordered_map<unsigned int, unsigned int>::iterator iter = blockTypesCache.find(n);
  if (iter != blockTypesCache.end()) {
    return iter->second;
  } else {
    unsigned int blockType = 1;
    for (unsigned int i = 0; i < 4096; i++) {
      if (blockTypes[i] == n) {
        blockType = i;
        break;
      }
    }
    blockTypesCache[n] = blockType;
    return blockType;
  }
}

void getMeshData(unsigned int *voxels, unsigned int *blockTypes, int dims[3], unsigned char *transparentVoxels, unsigned char *translucentVoxels, float *verticesResult, unsigned int &vertexIndexResult, unsigned int *facesResult, unsigned int &faceIndexResult) {
  std::unique_ptr<float[]> vertices(new float[NUM_POSITIONS_CHUNK]);
  unsigned int vertexIndex = 0;
  std::unique_ptr<unsigned int[]> faces(new unsigned int[NUM_POSITIONS_CHUNK]);
  unsigned int faceIndex = 0;
  std::unique_ptr<float[]> tVertices(new float[NUM_POSITIONS_CHUNK]);
  unsigned int tVertexIndex = 0;
  std::unique_ptr<unsigned int[]> tFaces(new unsigned int[NUM_POSITIONS_CHUNK]);
  unsigned int tFaceIndex = 0;

  std::unordered_map<unsigned int, unsigned int> blockTypesCache;
  blockTypesCache.reserve(256);

  const int dimsX = dims[0];
  const int dimsY = dims[1];
  const int dimsXY = dimsX * dimsY;

  //Sweep over 3-axes
  for(int d=0; d<3; ++d) {
    int u = (d+1)%3;
    int v = (d+2)%3;
    int x[3] = {0,0,0};
    int q[3] = {0,0,0};
    // int du[3] = {0,0,0};
    // int dv[3] = {0,0,0};
    int dimsD = dims[d];
    int dimsU = dims[u];
    int dimsV = dims[v];

    q[d] =  1;
    x[d] = -1;

    int qdimsX  = dimsX  * q[1];
    int qdimsXY = dimsXY * q[2];

    /* if (MASK_SIZE < dimsU * dimsV) {
      throw new Error('mask buffer not big enough');
    } */

    // Compute mask
    while (x[d] < dimsD) {
      int xd = x[d];
      int n = 0;

      for(x[v] = 0; x[v] < dimsV; ++x[v]) {
        for(x[u] = 0; x[u] < dimsU; ++x[u], ++n) {
          unsigned int a, b;
          if (xd >= 0) {
            const unsigned int aOffset = x[0]      + dimsX * x[1]          + dimsXY * x[2];
            a = voxels[aOffset];
            if (a != 0) {
              a = findBlockType(a, blockTypes, blockTypesCache);
            }
          } else {
            a = 0;
          }
          if (xd < dimsD-1) {
            const unsigned int bOffset = x[0]+q[0] + dimsX * x[1] + qdimsX + dimsXY * x[2] + qdimsXY;
            b = voxels[bOffset];
            if (b != 0) {
              b = findBlockType(b, blockTypes, blockTypesCache);
            }
          } else {
            b = 0;
          }

          bool aMask = false;
          bool bMask = false;
          if (a != b || translucentVoxels[a] != 0 || translucentVoxels[b] != 0) {
            const bool aT = transparentVoxels[a];
            const bool bT = transparentVoxels[b];

            aMask = (aMask || aT);
            bMask = (bMask || bT);

            // both are transparent, add to both directions
            if (aT && bT) {
              // nothing
            // if a is solid and b is not there or transparent
            } else if (a && (!b || bT)) {
              b = 0;
              bMask = false;
            // if b is solid and node a model and a is not there or transparent or a model
            } else if (b && (!a || aT)) {
              a = 0;
              aMask = false;
            // dont draw this face
            } else {
              a = 0;
              b = 0;
              aMask = false;
              bMask = false;
            }
          } else {
            a = 0;
            b = 0;
            aMask = false;
            bMask = false;
          }

          colors[n] = a;
          invColors[n] = b;
          mask[n] = aMask;
          invMask[n] = bMask;
        }
      }

      ++x[d];

      generateMesh(colors, mask, d, u, v, dimsU, dimsV, x, vertices.get(), vertexIndex, faces.get(), faceIndex, tVertices.get(), tVertexIndex, tFaces.get(), tFaceIndex, true);
      generateMesh(invColors, invMask, d, u, v, dimsU, dimsV, x, vertices.get(), vertexIndex, faces.get(), faceIndex, tVertices.get(), tVertexIndex, tFaces.get(), tFaceIndex, false);
    }
  }

  memcpy(verticesResult, vertices.get(), vertexIndex * 4);
  memcpy(verticesResult + vertexIndex, tVertices.get(), tVertexIndex * 4);
  memcpy(facesResult, faces.get(), faceIndex * 4);
  memcpy(facesResult + faceIndex, tFaces.get(), tFaceIndex * 4);

  vertexIndexResult = vertexIndex + tVertexIndex;
  faceIndexResult = faceIndex + tFaceIndex;
}

void getPositions(float *vertices, unsigned int numVertices, float *positions, unsigned int &positionIndex) {
  const unsigned int numFaces = numVertices / (4 * 3);
  positionIndex = 0;
  // const result = new Float32Array(numFaces * 18);

  for (unsigned int i = 0; i < numFaces; i++) {
    // const faceVertices = verticesData.subarray(i * 4 * 3, (i + 1) * 4 * 3);
    const unsigned int baseIndex = i * 4 * 3;

    // abd
    positions[positionIndex++] = vertices[baseIndex + 0 * 3 + 0];
    positions[positionIndex++] = vertices[baseIndex + 0 * 3 + 1];
    positions[positionIndex++] = vertices[baseIndex + 0 * 3 + 2];

    positions[positionIndex++] = vertices[baseIndex + 1 * 3 + 0];
    positions[positionIndex++] = vertices[baseIndex + 1 * 3 + 1];
    positions[positionIndex++] = vertices[baseIndex + 1 * 3 + 2];

    positions[positionIndex++] = vertices[baseIndex + 3 * 3 + 0];
    positions[positionIndex++] = vertices[baseIndex + 3 * 3 + 1];
    positions[positionIndex++] = vertices[baseIndex + 3 * 3 + 2];

    // bcd
    positions[positionIndex++] = vertices[baseIndex + 1 * 3 + 0];
    positions[positionIndex++] = vertices[baseIndex + 1 * 3 + 1];
    positions[positionIndex++] = vertices[baseIndex + 1 * 3 + 2];

    positions[positionIndex++] = vertices[baseIndex + 2 * 3 + 0];
    positions[positionIndex++] = vertices[baseIndex + 2 * 3 + 1];
    positions[positionIndex++] = vertices[baseIndex + 2 * 3 + 2];

    positions[positionIndex++] = vertices[baseIndex + 3 * 3 + 0];
    positions[positionIndex++] = vertices[baseIndex + 3 * 3 + 1];
    positions[positionIndex++] = vertices[baseIndex + 3 * 3 + 2];
  }

  // return result;
}

void getNormals(float *positions, unsigned int numPositions, float *normals, unsigned int &numNormals) {
  for (unsigned int i = 0; i < numPositions; i += 9) {
    Vec pA(positions[i + 0], positions[i + 1], positions[i + 2]);
    Vec pB(positions[i + 3], positions[i + 4], positions[i + 5]);
    Vec pC(positions[i + 6], positions[i + 7], positions[i + 8]);

    Vec cb(pC);
    cb -= pB;

    Vec ab(pA);
    ab -= pB;

    cb ^= ab;
    cb.normalize();

    normals[ i ] = cb.x;
    normals[ i + 1 ] = cb.y;
    normals[ i + 2 ] = cb.z;

    normals[ i + 3 ] = cb.x;
    normals[ i + 4 ] = cb.y;
    normals[ i + 5 ] = cb.z;

    normals[ i + 6 ] = cb.x;
    normals[ i + 7 ] = cb.y;
    normals[ i + 8 ] = cb.z;
  }
  numNormals = numPositions;
}

inline unsigned int _getNormalDirection(unsigned int i, float *normals) {
  const unsigned int normalIndex = i * 18;
  if      (normals[normalIndex + 0] == -1) return 0;
  else if (normals[normalIndex + 0] == 1)  return 1;
  else if (normals[normalIndex + 1] == 1)  return 2;
  else if (normals[normalIndex + 1] == -1) return 3;
  else if (normals[normalIndex + 2] == -1) return 4;
  else if (normals[normalIndex + 2] == 1)  return 5;
  else                                     return 0; // can't happen
}

inline unsigned int _getFaceUvIndex(unsigned int c, unsigned int d) {
  return c * 6 * 4 + d * 4;
}

void getUvs(unsigned int *faces, unsigned int numFaces, float *normals, unsigned int numNormals, float *faceUvs, float *uvs, unsigned int &numUvs) {
  // const numFaces = facesData.length;
  // const result = new Float32Array(numFaces * 6 * 2);
  numUvs = 0;

  for (unsigned int i = 0; i < numFaces; i++) {
    unsigned int color = faces[i];
    unsigned int normalDirection = _getNormalDirection(i, normals); // XXX
    float *fuvs = faceUvs + _getFaceUvIndex(color, normalDirection);

    // abd
    uvs[numUvs++] = fuvs[0];
    uvs[numUvs++] = 1 - fuvs[1];

    uvs[numUvs++] = fuvs[2];
    uvs[numUvs++] = 1 - fuvs[1];

    uvs[numUvs++] = fuvs[0];
    uvs[numUvs++] = 1 - fuvs[3];

    // bcd
    uvs[numUvs++] = fuvs[2];
    uvs[numUvs++] = 1 - fuvs[1];

    uvs[numUvs++] = fuvs[2];
    uvs[numUvs++] = 1 - fuvs[3];

    uvs[numUvs++] = fuvs[0];
    uvs[numUvs++] = 1 - fuvs[3];
  }
}

unsigned int OCCLUSIONS_MAP[3][2][4] = {
  {
    {
      0,
      1,
      2,
      3,
    },
    {
      0,
      3,
      2,
      1,
    }
  },
  {
    {
      0,
      1,
      2,
      3,
    },
    {
      0,
      3,
      2,
      1,
    }
  },
  {
   {
      0,
      3,
      2,
      1,
   },
   {
      0,
      1,
      2,
      3,
    }
  }
};

inline bool _isOccluded(const Vec &p, unsigned int *voxels) {
  return voxels[_getBlockIndex(p.x, p.y, p.z)] > 0;
}

/* const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localCoord = new THREE.Vector2();
const localTriangle = new THREE.Triangle(); */
void getSsaos(float *vertices, unsigned int numVertices, unsigned int *voxels, unsigned char *ssaos, unsigned int &numSsaos) {
  const unsigned int numFaces = numVertices / (4 * 3);
  // const result = new Uint8Array(numFaces * 6);

  numSsaos = 0;

  for (unsigned int i = 0; i < numFaces; i++) {
    const unsigned int faceVerticesOffsetIndex = i * 4 * 3;
    // const faceVertices = verticesData.subarray(i * 4 * 3, (i + 1) * 4 * 3);
    Vec minPoint(
      std::numeric_limits<float>::infinity(),
      std::numeric_limits<float>::infinity(),
      std::numeric_limits<float>::infinity()
    );

    Vec a;
    Vec b;
    Vec c;
    for (unsigned int j = 0; j < 4; j++) {
      const unsigned int faceVertexOffsetIndex = j * 3;
      Vec faceVertex(
        vertices[faceVerticesOffsetIndex + faceVertexOffsetIndex + 0],
        vertices[faceVerticesOffsetIndex + faceVertexOffsetIndex + 1],
        vertices[faceVerticesOffsetIndex + faceVertexOffsetIndex + 2]
      );

      minPoint.min(faceVertex);

      if (j == 0) {
        a = faceVertex;
      } else if (j == 1) {
        b = faceVertex;
      } else if (j == 2) {
        c = faceVertex;
      }
    }
    const Vec normal = Tri(a, b, c).normal();

    unsigned int normalAxis;
    unsigned int normalSign;
    unsigned int uAxis;
    unsigned int vAxis;
    // const directions = (() => {
      if (normal.x != 0) {
        normalAxis = 0;
        normalSign = (unsigned int)(normal.x > 0);
        uAxis = 2;
        vAxis = 1;
        // return {normal: 0, normalSign: normal.x > 0, u: 2, v: 1};
      } else if (normal.y != 0) {
        normalAxis = 1;
        normalSign = (unsigned int)(normal.y > 0);
        uAxis = 0;
        vAxis = 2;
        // return {normal: 1, normalSign: normal.y > 0, u: 0, v: 2};
      } else if (normal.z != 0) {
        normalAxis = 2;
        normalSign = (unsigned int)(normal.z > 0);
        uAxis = 0;
        vAxis = 1;
        // return {normal: 2, normalSign: normal.z > 0, u: 0, v: 1};
      } else { // can't happen
        normalAxis = 0;
        normalSign = (unsigned int)(normal.x > 0);
        uAxis = 2;
        vAxis = 1;
      }
    // })();

    // XXX occlusion tests need to be merged across multiple adjacent meshes

    unsigned char occlusions[4];
    unsigned int *occlusionsMap = OCCLUSIONS_MAP[normalAxis][normalSign];
    for (unsigned int j = 0; j < 4; j++) {
      const unsigned int faceVertexOffsetIndex = j * 3;
      Vec faceVertex(
        vertices[faceVerticesOffsetIndex + faceVertexOffsetIndex + 0],
        vertices[faceVerticesOffsetIndex + faceVertexOffsetIndex + 1],
        vertices[faceVerticesOffsetIndex + faceVertexOffsetIndex + 2]
      );
      Vec faceVertexOffset(faceVertex);
      faceVertexOffset -= minPoint;
      const float faceVertexUv[2] = {
        faceVertexOffset.data[uAxis],
        faceVertexOffset.data[vAxis]
      };

      unsigned char numOcclusions = 0;

      Vec xu(minPoint);
      xu.data[normalAxis] += normalSign ? 0 : -1;
      xu.data[uAxis] += faceVertexUv[0] == 0 ? -1 : faceVertexUv[0];
      numOcclusions += _isOccluded(xu, voxels);

      Vec xv(minPoint);
      xv.data[normalAxis] += normalSign ? 0 : -1;
      xv.data[vAxis] += faceVertexUv[1] == 0 ? -1 : faceVertexUv[1];
      numOcclusions += _isOccluded(xv, voxels);

      Vec xuv(minPoint);
      xuv.data[normalAxis] += normalSign ? 0 : -1;
      xuv.data[uAxis] += faceVertexUv[0] == 0 ? -1 : faceVertexUv[0];
      xuv.data[vAxis] += faceVertexUv[1] == 0 ? -1 : faceVertexUv[1];
      numOcclusions += _isOccluded(xuv, voxels);

      // unsigned int occlusionIndex = -1;
      unsigned int occlusionIndex = 0;
      if (faceVertexUv[0] == 0 && faceVertexUv[1] == 0) {
        occlusionIndex = 0;
      } else if (faceVertexUv[0] > 0 && faceVertexUv[1] == 0) {
        occlusionIndex = 1;
      } else if (faceVertexUv[0] > 0 && faceVertexUv[1] > 0) {
        occlusionIndex = 2;
      } else if (faceVertexUv[0] == 0 && faceVertexUv[1] > 0) {
        occlusionIndex = 3;
      }
      occlusions[occlusionsMap[occlusionIndex]] = numOcclusions;
    }

    // abd
    ssaos[numSsaos++] = occlusions[0];
    ssaos[numSsaos++] = occlusions[1];
    ssaos[numSsaos++] = occlusions[3];

    // bcd
    ssaos[numSsaos++] = occlusions[1];
    ssaos[numSsaos++] = occlusions[2];
    ssaos[numSsaos++] = occlusions[3];
  }
}

void shiftPositions(float *positions, unsigned int numPositions, float *shift) {
  unsigned int index = 0;
  for (unsigned int i = 0; i < numPositions / 3; i++) {
    positions[index++] += shift[0];
    positions[index++] += shift[1];
    positions[index++] += shift[2];
  }
}

void tesselate(unsigned int *voxels, unsigned int *blockTypes, int dims[3], unsigned char *transparentVoxels, unsigned char *translucentVoxels, float *faceUvs, float *shift, unsigned int oldPositionIndex, float *positions, float *uvs, unsigned char *ssaos, float *frames, float *objectIndices, unsigned int *indices, unsigned int &positionIndex, unsigned int &uvIndex, unsigned int &ssaoIndex, unsigned int &frameIndex, unsigned int &objectIndexIndex, unsigned int &indexIndex) {

  std::unique_ptr<float[]> vertices(new float[NUM_POSITIONS_CHUNK]);
  unsigned int vertexIndex;
  std::unique_ptr<unsigned int[]> faces(new unsigned int[NUM_POSITIONS_CHUNK]);
  unsigned int facesIndex;
  getMeshData(voxels, blockTypes, dims, transparentVoxels, translucentVoxels, vertices.get(), vertexIndex, faces.get(), facesIndex);

  unsigned int numNewPositions;
  getPositions(vertices.get(), vertexIndex, positions, numNewPositions);
  positionIndex += numNewPositions;

  float normals[NUM_POSITIONS_CHUNK];
  unsigned int numNewNormals;
  getNormals(positions, numNewPositions, normals, numNewNormals);

  unsigned int numNewUvs;
  getUvs(faces.get(), facesIndex, normals, numNewNormals, faceUvs, uvs, numNewUvs);
  uvIndex += numNewUvs;

  unsigned int numNewSsaos;
  getSsaos(vertices.get(), vertexIndex, voxels, ssaos, numNewSsaos);
  ssaoIndex += numNewSsaos;

  for (unsigned int i = 0; i < numNewPositions; i++) {
    frames[i] = 0;
  }
  frameIndex += numNewPositions;

  for (unsigned int i = 0; i < numNewPositions / 3; i++) {
    objectIndices[i] = -2.0;
  }
  objectIndexIndex += numNewPositions / 3;

  for (unsigned int i = 0; i < numNewPositions / 3; i++) {
    indices[i] = (oldPositionIndex / 3) + i;
  }
  indexIndex += numNewPositions / 3;

  shiftPositions(positions, numNewPositions, shift);
}
