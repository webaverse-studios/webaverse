#ifndef COLLIDE_H
#define COLLIDE_H

#include "vector.h"
#include "march.h"
#include "PxPhysicsVersion.h"
#include "PxPhysics.h"
#include "extensions/PxDefaultStreams.h"
#include "extensions/PxDefaultAllocator.h"
#include "extensions/PxDefaultErrorCallback.h"
#include "geometry/PxTriangleMeshGeometry.h"
#include "cooking/PxTriangleMeshDesc.h"
#include "cooking/PxCooking.h"
#include "extensions/PxTriangleMeshExt.h"
#include "PxQueryReport.h"
#include "geometry/PxGeometryQuery.h"
#include <list>
#include <map>
#include <set>
#include <deque>
#include <algorithm>
#include <iostream>

using namespace physx;

class Physicer;
class Object;
class GeometrySet;
class PhysicsGeometry {
public:
  PhysicsGeometry(PxTriangleMesh *triangleMesh, PxConvexMesh *convexMesh, PxGeometry *geometry);
  ~PhysicsGeometry();

  PxTriangleMesh *triangleMesh;
  PxConvexMesh *convexMesh;
  PxGeometry *geometry;
};
class PhysicsObject {
public:
  PhysicsObject(unsigned int objectId, Vec objectPosition, Quat objectQuaternion, std::shared_ptr<PhysicsGeometry> physicsGeometry, Vec position, Quat quaternion, Physicer *physicer);
  ~PhysicsObject();

  unsigned int objectId;
  Vec objectPosition;
  Quat objectQuaternion;
  std::shared_ptr<PhysicsGeometry> physicsGeometry;
  Vec position;
  Quat quaternion;
  Physicer *physicer;
};
class Physicer {
public:
  Physicer();
  
  PxDefaultAllocator *gAllocator = nullptr;
  PxDefaultErrorCallback *gErrorCallback = nullptr;
  PxFoundation *gFoundation = nullptr;
  PxPhysics *physics = nullptr;
  PxCooking *cooking = nullptr;
};

/* void doInitPhysx() {
  gAllocator = new PxDefaultAllocator();
  gErrorCallback = new PxDefaultErrorCallback();
  gFoundation = PxCreateFoundation(PX_PHYSICS_VERSION, *gAllocator, *gErrorCallback);
  PxTolerancesScale tolerancesScale;
  physics = PxCreatePhysics(PX_PHYSICS_VERSION, *gFoundation, tolerancesScale);
  PxCookingParams cookingParams(tolerancesScale);
  // cookingParams.midphaseDesc = PxMeshMidPhase::eBVH34;
  cooking = PxCreateCooking(PX_PHYSICS_VERSION, *gFoundation, cookingParams);
} */

std::shared_ptr<PhysicsGeometry> doMakeBakedGeometryRaw(Physicer *physicer, PxDefaultMemoryOutputStream *writeStream);
std::shared_ptr<PhysicsGeometry> doMakeBakedConvexGeometryRaw(Physicer *physicer, PxDefaultMemoryOutputStream *writeStream);

std::shared_ptr<PhysicsObject> doMakeBakedGeometry(Physicer *physicer, PxDefaultMemoryOutputStream *writeStream, unsigned int objectId, float *meshPosition, float *meshQuaternion);
std::shared_ptr<PhysicsObject> doMakeBakedConvexGeometry(Physicer *physicer, PxDefaultMemoryOutputStream *writeStream, unsigned int objectId, float *meshPosition, float *meshQuaternion);
std::shared_ptr<PhysicsObject> doMakeGeometry(Physicer *physicer, PxGeometry *geometry, unsigned int objectId, float *meshPosition, float *meshQuaternion);

std::shared_ptr<PhysicsObject> doMakeBoxGeometry(Physicer *physicer, unsigned int objectId, float *objectPosition, float *objectQuaternion, float *position, float *quaternion, float w, float h, float d);
std::shared_ptr<PhysicsObject> doMakeCapsuleGeometry(Physicer *physicer, unsigned int objectId, float *objectPosition, float *objectQuaternion, float *position, float *quaternion, float radius, float halfHeight);

PxDefaultMemoryOutputStream *doBakeGeometry(Physicer *physicer, float *positions, unsigned int *indices, unsigned int numPositions, unsigned int numIndices);
PxDefaultMemoryOutputStream *doBakeConvexGeometry(Physicer *physicer, float *positions, unsigned int *indices, unsigned int numPositions, unsigned int numIndices);
/* void doUnregisterGeometry(PhysicsGeometry * geometrySpec) {
  {
    std::lock_guard<std::mutex> lock(gPhysicsMutex);
    for (std::set<PhysicsGeometry *> *geometrySpecSet : geometrySpecSets) {
      geometrySpecSet->erase(PhysicsGeometry);
    }
  }

  delete geometrySpec;
} */

class Shape {
public:
  Vec position;
  Quat quaternion;
  Vec scale;
};
extern std::map<std::string, Shape> PHYSICS_SHAPES;

void doLandPhysics(Tracker *tracker, Subparcel *subparcel, float *landPositions, unsigned int numLandPositions);
void doObjectPhysics(Tracker *tracker, GeometrySet *geometrySet, Subparcel *subparcel);
void doThingPhysics(Tracker *tracker, GeometrySet *geometrySet, Subparcel *subparcel);

void doRaycast(Tracker *tracker, float *origin, float *direction, float *meshPosition, float *meshQuaternion, unsigned int &hit, float *position, float *normal, float &distance, unsigned int &objectId, unsigned int &faceIndex, Vec &outPosition, Quat &outQuaternion);
void doCollide(Tracker *tracker, float radius, float halfHeight, float *position, float *quaternion, float *meshPosition, float *meshQuaternion, unsigned int maxIter, unsigned int &hit, float *direction, unsigned int &grounded);
extern int PEEK_FACE_INDICES[];
/* (() => {
  const directionsLookup = {
    1: 'FRONT',
    2: 'BACK',
    3: 'LEFT',
    4: 'RIGHT',
    5: 'TOP',
    6: 'BOTTOM',
  };
  const indexDirections = [];

  const PEEK_FACE_INDICES = Array((6<<4|6)+1);

  for (let i = 0; i < (6<<4|6)+1; i++) {
    PEEK_FACE_INDICES[i] = 0xFF;
  }

  let peekIndex = 0;
  for (let i = 1; i <= 6; i++) {
    for (let j = 1; j <= 6; j++) {
      if (i != j) {
        const otherEntry = PEEK_FACE_INDICES[j << 4 | i];
        PEEK_FACE_INDICES[i << 4 | j] = otherEntry != 0xFF ? otherEntry : (() => {
          const newIndex = peekIndex++;
          indexDirections[newIndex] = directionsLookup[i] + ' -> ' + directionsLookup[j];
          return newIndex;
        })();
      }
    }
  }

  x = PEEK_FACE_INDICES;
  y = indexDirections;
})(); */
class PeekDirection {
public:
  Vec normal;
  int inormal[3];
  PEEK_FACES face;
};
extern PeekDirection PEEK_DIRECTIONS[6];

/* class GroupSet {
public:
  GroupSet(int x, int y, int z, int index, const Sphere &boundingSphere, unsigned char *peeks, Group *groups, unsigned int numGroups);

  int x;
  int y;
  int z;
  int index;
  Sphere boundingSphere;
  unsigned char peeks[15];
  std::vector<Group> groups;
};
class Culler {
public:
  Culler();

  std::vector<GroupSet *> groupSets;
}; */
class CullResult {
public:
  CullResult(unsigned int start, unsigned int count, unsigned int materialIndex);

  unsigned int start;
  unsigned int count;
  unsigned int materialIndex;
};
/* Culler *doMakeCuller();
GroupSet *doRegisterGroupSet(Culler *culler, int x, int y, int z, float r, unsigned char *peeks, Group *groups, unsigned int numGroups);
void doUnregisterGroupSet(Culler *culler, GroupSet *groupSet);
void doCull(Culler *culler, float *positionData, float *matrixData, float slabRadius, CullResult *cullResults, unsigned int &numCullResults); */
void doTickCull(Tracker *tracker, float *positionData, float *matrixData, CullResult *landCullResults, unsigned int &numLandCullResults, CullResult *vegetationCullResults, unsigned int &numVegetationCullResults, CullResult *thingCullResults, unsigned int &numThingCullResults);

#endif