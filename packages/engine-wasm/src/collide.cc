// #include "DirectXMath.h"
/* #include "PhysX/physx/include/geometry/PxMeshQuery.h"
#include "geometry/PxCapsuleGeometry.h"
#include "foundation/PxTransform.h"
 */
#include "collide.h"
#include "subparcel.h"
#include "geometry.h"

using namespace physx;

// const float subparcelRadius = std::sqrt(((float)SUBPARCEL_SIZE/2.0f)*((float)SUBPARCEL_SIZE/2.0f)*3.0f);

Physicer::Physicer() {
  gAllocator = new PxDefaultAllocator();
  gErrorCallback = new PxDefaultErrorCallback();
  gFoundation = PxCreateFoundation(PX_PHYSICS_VERSION, *gAllocator, *gErrorCallback);
  PxTolerancesScale tolerancesScale;
  physics = PxCreatePhysics(PX_PHYSICS_VERSION, *gFoundation, tolerancesScale);
  PxCookingParams cookingParams(tolerancesScale);
  // cookingParams.midphaseDesc = PxMeshMidPhase::eBVH34;
  cooking = PxCreateCooking(PX_PHYSICS_VERSION, *gFoundation, cookingParams);
}

PhysicsGeometry::PhysicsGeometry(PxTriangleMesh *triangleMesh, PxConvexMesh *convexMesh, PxGeometry *geometry) : triangleMesh(triangleMesh), convexMesh(convexMesh), geometry(geometry) {}
PhysicsGeometry::~PhysicsGeometry() {
  delete geometry;
  if (triangleMesh) {
    triangleMesh->release();
  }
  if (convexMesh) {
    convexMesh->release();
  }
}

PhysicsObject::PhysicsObject(unsigned int objectId, Vec objectPosition, Quat objectQuaternion, std::shared_ptr<PhysicsGeometry> physicsGeometry, Vec position, Quat quaternion, Physicer *physicer) :
  objectId(objectId), objectPosition(objectPosition), objectQuaternion(objectQuaternion), physicsGeometry(physicsGeometry), position(position), quaternion(quaternion), physicer(physicer) {}
PhysicsObject::~PhysicsObject() {}

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

std::shared_ptr<PhysicsGeometry> doMakeBakedGeometryRaw(Physicer *physicer, PxDefaultMemoryOutputStream *writeStream) {
  PxDefaultMemoryInputData readBuffer(writeStream->getData(), writeStream->getSize());
  PxTriangleMesh *triangleMesh = physicer->physics->createTriangleMesh(readBuffer);
  delete writeStream;

  PxTriangleMeshGeometry *triangleMeshGeom = new PxTriangleMeshGeometry(triangleMesh);
  return std::shared_ptr<PhysicsGeometry>(new PhysicsGeometry(triangleMesh, nullptr, triangleMeshGeom));
}
std::shared_ptr<PhysicsGeometry> doMakeBakedConvexGeometryRaw(Physicer *physicer, PxDefaultMemoryOutputStream *writeStream) {
  PxDefaultMemoryInputData readBuffer(writeStream->getData(), writeStream->getSize());
  PxConvexMesh *convexMesh = physicer->physics->createConvexMesh(readBuffer);
  delete writeStream;

  PxConvexMeshGeometry *convexMeshGeom = new PxConvexMeshGeometry(convexMesh);
  return std::shared_ptr<PhysicsGeometry>(new PhysicsGeometry(nullptr, convexMesh, convexMeshGeom));
}

std::shared_ptr<PhysicsObject> doMakeBakedGeometry(Physicer *physicer, PxDefaultMemoryOutputStream *writeStream, unsigned int objectId, float *meshPosition, float *meshQuaternion) {
  std::shared_ptr<PhysicsGeometry> geometrySpec = doMakeBakedGeometryRaw(physicer, writeStream);
  Vec p(meshPosition[0], meshPosition[1], meshPosition[2]);
  Quat q(meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]);

  std::shared_ptr<PhysicsObject> geometryObject(new PhysicsObject(objectId, p, q, std::move(geometrySpec), p, q, physicer));
  return std::move(geometryObject);
}
std::shared_ptr<PhysicsObject> doMakeBakedConvexGeometry(Physicer *physicer, PxDefaultMemoryOutputStream *writeStream, unsigned int objectId, float *meshPosition, float *meshQuaternion) {
  std::shared_ptr<PhysicsGeometry> geometrySpec = doMakeBakedConvexGeometryRaw(physicer, writeStream);

  Vec p(meshPosition[0], meshPosition[1], meshPosition[2]);
  Quat q(meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]);

  std::shared_ptr<PhysicsObject> geometryObject(new PhysicsObject(objectId, p, q, std::move(geometrySpec), p, q, physicer));
  return std::move(geometryObject);
}
std::shared_ptr<PhysicsObject> doMakeGeometry(Physicer *physicer, PxGeometry *geometry, unsigned int objectId, float *meshPosition, float *meshQuaternion) {
  Vec p(meshPosition[0], meshPosition[1], meshPosition[2]);
  Quat q(meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]);
  std::shared_ptr<PhysicsGeometry> geometrySpec(new PhysicsGeometry(nullptr, nullptr, geometry));
  std::shared_ptr<PhysicsObject> geometryObject(new PhysicsObject(objectId, p, q, std::move(geometrySpec), p, q, physicer));
  return std::move(geometryObject);
}

std::shared_ptr<PhysicsObject> doMakeBoxGeometry(Physicer *physicer, unsigned int objectId, float *objectPosition, float *objectQuaternion, float *position, float *quaternion, float w, float h, float d) {
  Vec op(objectPosition[0], objectPosition[1], objectPosition[2]);
  Quat oq(objectQuaternion[0], objectQuaternion[1], objectQuaternion[2], objectQuaternion[3]);
  Vec p(position[0], position[1], position[2]);
  Quat q(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
  Vec halfScale(w/2.0f, h/2.0f, d/2.0f);
  PxBoxGeometry *meshGeom = new PxBoxGeometry(halfScale.x, halfScale.y, halfScale.z);
  // Sphere boundingSphere(0, 0, 0, halfScale.magnitude());
  std::shared_ptr<PhysicsGeometry> geometrySpec(new PhysicsGeometry(nullptr, nullptr, meshGeom));
  std::shared_ptr<PhysicsObject> geometryObject(new PhysicsObject(objectId, op, oq, std::move(geometrySpec), p, q, /*boundingSphere,*/ physicer));
 return std::move(geometryObject);
}

std::shared_ptr<PhysicsObject> doMakeCapsuleGeometry(Physicer *physicer, unsigned int objectId, float *objectPosition, float *objectQuaternion, float *position, float *quaternion, float radius, float halfHeight) {
  Vec op(objectPosition[0], objectPosition[1], objectPosition[2]);
  Quat oq(objectQuaternion[0], objectQuaternion[1], objectQuaternion[2], objectQuaternion[3]);
  Vec p(position[0], position[1], position[2]);
  Quat q(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
  PxCapsuleGeometry *meshGeom = new PxCapsuleGeometry(radius, halfHeight);
  // Sphere boundingSphere(0, 0, 0, radius + halfHeight);
  std::shared_ptr<PhysicsGeometry> geometrySpec(new PhysicsGeometry(nullptr, nullptr, meshGeom));
  std::shared_ptr<PhysicsObject> geometryObject(new PhysicsObject(objectId, op, oq, std::move(geometrySpec), p, q, /*boundingSphere,*/ physicer));
  return std::move(geometryObject);
}

PxDefaultMemoryOutputStream *doBakeGeometry(Physicer *physicer, float *positions, unsigned int *indices, unsigned int numPositions, unsigned int numIndices) {
  PxVec3 *verts = (PxVec3 *)positions;
  PxU32 nbVerts = numPositions/3;
  PxU32 *indices32 = (PxU32 *)indices;
  PxU32 triCount = numIndices/3;

  PxTriangleMeshDesc meshDesc{};
  meshDesc.points.count           = nbVerts;
  meshDesc.points.stride          = sizeof(PxVec3);
  meshDesc.points.data            = verts;

  meshDesc.triangles.count        = triCount;
  meshDesc.triangles.stride       = 3*sizeof(PxU32);
  meshDesc.triangles.data         = indices32;

  PxDefaultMemoryOutputStream *writeBuffer = new PxDefaultMemoryOutputStream();
  bool status = physicer->cooking->cookTriangleMesh(meshDesc, *writeBuffer);
  if (status) {
    return writeBuffer;
  } else {
    delete writeBuffer;
    return nullptr;
  }
}

PxDefaultMemoryOutputStream *doBakeConvexGeometry(Physicer *physicer, float *positions, unsigned int *indices, unsigned int numPositions, unsigned int numIndices) {
  PxVec3 *verts = (PxVec3 *)positions;
  PxU32 nbVerts = numPositions/3;
  PxU32 *indices32 = (PxU32 *)indices;
  PxU32 triCount = numIndices/3;

  PxConvexMeshDesc meshDesc{};
  meshDesc.points.count           = nbVerts;
  meshDesc.points.stride          = sizeof(PxVec3);
  meshDesc.points.data            = verts;

  meshDesc.indices.count        = triCount;
  meshDesc.indices.stride       = 3*sizeof(PxU32);
  meshDesc.indices.data         = indices32;

  meshDesc.flags            = PxConvexFlag::eCOMPUTE_CONVEX;
  // meshDesc.maxVerts         = 10;

  PxDefaultMemoryOutputStream *writeBuffer = new PxDefaultMemoryOutputStream();
  bool status = physicer->cooking->cookConvexMesh(meshDesc, *writeBuffer);
  if (status) {
    return writeBuffer;
  } else {
    delete writeBuffer;
    return nullptr;
  }
}

std::map<std::string, Shape> PHYSICS_SHAPES = {
  {
    "wood_ramp",
    {
      {0, 1, 0},
      Quat(Vec{1, 0, 0}, -PI/4.0f),
      {2, 2*SQRT2, 0.1},
    },
  },
  {
    "wood_floor",
    {
      {0, 0, 0},
      Quat(),
      {2, 0.1, 2},
    },
  },
  {
    "wood_wall",
    {
      {0, 1, -1},
      Quat(),
      {2, 2, 0.1},
    },
  },
  {
    "stone_ramp",
    {
      {0, 1, 0},
      Quat(Vec{1, 0, 0}, -PI/4.0f),
      {2, 2*SQRT2, 0.1},
    },
  },
  {
    "stone_floor",
    {
      {0, 0, 0},
      Quat(),
      {2, 0.1, 2},
    },
  },
  {
    "stone_wall",
    {
      {0, 1, -1},
      Quat(),
      {2, 2, 0.1},
    },
  },
  {
    "metal_ramp",
    {
      {0, 1, 0},
      Quat(Vec{1, 0, 0}, -PI/4.0f),
      {2, 2*SQRT2, 0.1},
    },
  },
  {
    "metal_floor",
    {
      {0, 0, 0},
      Quat(),
      {2, 0.1, 2},
    },
  },
  {
    "metal_wall",
    {
      {0, 1, -1},
      Quat(),
      {2, 2, 0.1},
    },
  },
};

void doLandPhysics(Tracker *tracker, Subparcel *subparcel, float *landPositions, unsigned int numLandPositions) {
  if (numLandPositions > 0) {
    PxDefaultMemoryOutputStream *writeStream = doBakeGeometry(&tracker->physicer, landPositions, nullptr, numLandPositions, 0);
    float meshPosition[3] = {
      0,
      0,
      0,
      /* (float)subparcel->coord.x*(float)SUBPARCEL_SIZE + (float)SUBPARCEL_SIZE/2.0f,
      (float)subparcel->coord.y*(float)SUBPARCEL_SIZE + (float)SUBPARCEL_SIZE/2.0f,
      (float)subparcel->coord.z*(float)SUBPARCEL_SIZE + (float)SUBPARCEL_SIZE/2.0f, */
    };
    float meshQuaternion[4] = {
      0,
      0,
      0,
      1,
    };
    subparcel->landPhysxObject = doMakeBakedGeometry(&tracker->physicer, writeStream, 0, meshPosition, meshQuaternion);
  } else {
    subparcel->landPhysxObject = nullptr;
  }
}

void doObjectPhysics(Tracker *tracker, GeometrySet *geometrySet, Subparcel *subparcel) {
  subparcel->vegetationPhysxObjects.clear();
  subparcel->vegetationPhysxObjects.reserve(subparcel->numObjects);
  for (unsigned int i = 0; i < subparcel->numObjects; i++) {
    Object &object = subparcel->objects[i];
    if (strcmp(object.name, "spawner") != 0) {
      std::shared_ptr<PhysicsObject> physxObject;
      auto shapeIter = PHYSICS_SHAPES.find(object.name);
      if (shapeIter != PHYSICS_SHAPES.end()) {
        const Shape &shape = shapeIter->second;

        Matrix matrix;
        matrix.compose(shape.position, shape.quaternion, Vec{1, 1, 1});
        matrix.premultiply(Matrix().compose(object.position, object.quaternion, Vec{1, 1, 1}));

        Vec position;
        Quat quaternion;
        Vec scale;
        matrix.decompose(position, quaternion, scale);
        physxObject = doMakeBoxGeometry(&tracker->physicer, object.id, position.data, quaternion.data, position.data, quaternion.data, shape.scale.x, shape.scale.y, shape.scale.z);
      } else {
        Vec position = object.position;
        position += Vec{0, (2.0f+0.5f)/2.0f, 0};
        Quat quaternion = object.quaternion;
        quaternion.multiply(Quat(Vec{0, 0, 1}, PI/2.0f));
        physxObject = doMakeCapsuleGeometry(&tracker->physicer, object.id, object.position.data, object.quaternion.data, position.data, quaternion.data, 0.5, 2);
      }
      subparcel->vegetationPhysxObjects.push_back(std::move(physxObject));
    }
  }
}
void doThingPhysics(Tracker *tracker, GeometrySet *geometrySet, Subparcel *subparcel) {
  subparcel->thingPhysxObjects.clear();
  subparcel->thingPhysxObjects.reserve(subparcel->numThings);
  for (unsigned int i = 0; i < subparcel->numThings; i++) {
    Thing &thing = subparcel->things[i];
    std::string name(thing.name);

    auto iter = geometrySet->geometryMap.find(name);
    if (iter != geometrySet->geometryMap.end()) {
      Geometry *geometry = iter->second;
      PxGeometry *physxGeometrySrc = geometry->physicsGeometry->geometry;
      if (physxGeometrySrc) {
        std::shared_ptr<PhysicsObject> physxGeometry = doMakeGeometry(&tracker->physicer, physxGeometrySrc, thing.id, thing.position.data, thing.quaternion.data);
        subparcel->thingPhysxObjects.push_back(std::move(physxGeometry));
      } else {
        std::cout << "no physx geometry for " << name << std::endl;
        abort();
      }
    } else {
      std::cout << "no base geometry for " << name << std::endl;
      abort();
    }
  }
}

/* void doUnregisterGeometry(PhysicsGeometry * geometrySpec) {
  {
    std::lock_guard<std::mutex> lock(gPhysicsMutex);
    for (std::set<PhysicsGeometry *> *geometrySpecSet : geometrySpecSets) {
      geometrySpecSet->erase(geometrySpec);
    }
  }

  delete geometrySpec;
} */

void doRaycast(Tracker *tracker, float *origin, float *direction, float *meshPosition, float *meshQuaternion, unsigned int &hit, float *position, float *normal, float &distance, unsigned int &objectId, unsigned int &faceIndex, Vec &outPosition, Quat &outQuaternion) {
  PxVec3 originVec{origin[0], origin[1], origin[2]};
  PxVec3 directionVec{direction[0], direction[1], direction[2]};
  Ray ray(Vec{origin[0], origin[1], origin[2]}, Vec{direction[0], direction[1], direction[2]});
  PxTransform meshPose(
    PxVec3{meshPosition[0], meshPosition[1], meshPosition[2]},
    PxQuat{meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]}
  );
  Vec p(meshPosition[0], meshPosition[1], meshPosition[2]);
  Quat q(meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]);

  PxRaycastHit hitInfo;
  constexpr float maxDist = 1000.0;
  const PxHitFlags hitFlags = PxHitFlag::eDEFAULT;
  constexpr PxU32 maxHits = 1;

  std::vector<std::shared_ptr<PhysicsObject>> sortedGeometrySpecs;
  sortedGeometrySpecs.reserve(256);
  {
    std::lock_guard<std::mutex> lock(tracker->subparcelsMutex);

    for (auto &iter : tracker->subparcels) {
      std::shared_ptr<Subparcel> &subparcel = iter.second;
      {
        std::shared_ptr<PhysicsObject> &geometrySpec = subparcel->landPhysxObject;
        if (geometrySpec) {
          /* Sphere sphere(
            (geometrySpec->boundingSphere.center.clone().applyQuaternion(geometrySpec->quaternion) + geometrySpec->position)
              .applyQuaternion(q) + p,
            geometrySpec->boundingSphere.radius
          );
          if (ray.intersectsSphere(sphere)) { */
            sortedGeometrySpecs.push_back(geometrySpec);
          // }
        }
      }
      for (std::shared_ptr<PhysicsObject> &geometrySpec : subparcel->vegetationPhysxObjects) {
        /*  Sphere sphere(
          (geometrySpec->boundingSphere.center.clone().applyQuaternion(geometrySpec->quaternion) + geometrySpec->position)
            .applyQuaternion(q) + p,
          geometrySpec->boundingSphere.radius
        );
        if (ray.intersectsSphere(sphere)) { */
          sortedGeometrySpecs.push_back(geometrySpec);
        // }
      }
      for (std::shared_ptr<PhysicsObject> &geometrySpec : subparcel->thingPhysxObjects) {
        sortedGeometrySpecs.push_back(geometrySpec);
        /* Sphere sphere(
          (geometrySpec->boundingSphere.center.clone().applyQuaternion(geometrySpec->quaternion) + geometrySpec->position)
            .applyQuaternion(q) + p,
          geometrySpec->boundingSphere.radius
        );
        if (ray.intersectsSphere(sphere)) {
          sortedGeometrySpecs.push_back(geometrySpec);
        } */
      }
    }
    for (std::shared_ptr<PhysicsObject> &geometrySpec : tracker->thingPhysxObjects) {
      sortedGeometrySpecs.push_back(geometrySpec);
    }
    /* std::sort(sortedGeometrySpecs.begin(), sortedGeometrySpecs.end(), [](const std::pair<float, GeometrySpec *> &a, const std::pair<float, GeometrySpec *> &b) -> bool {
      return a.first < b.first;
    }); */
  }
  {
    hit = 0;
    for (std::shared_ptr<PhysicsObject> &geometrySpec : sortedGeometrySpecs) {
      // doRaycastSingle(geometrySpec, meshPose);

      PxGeometry *geometry = geometrySpec->physicsGeometry->geometry;
      PxTransform meshPose2{
        PxVec3{geometrySpec->position.x, geometrySpec->position.y, geometrySpec->position.z},
        PxQuat{geometrySpec->quaternion.x, geometrySpec->quaternion.y, geometrySpec->quaternion.z, geometrySpec->quaternion.w}
      };
      PxTransform meshPose3 = meshPose * meshPose2;
      // PxTransform meshPose4 = meshPose2 * meshPose;

      PxU32 hitCount = PxGeometryQuery::raycast(originVec, directionVec,
                                                *geometry,
                                                meshPose3,
                                                maxDist,
                                                hitFlags,
                                                maxHits, &hitInfo);

      if (hitCount > 0 && (!hit || hitInfo.distance < distance)) {
        hit = 1;
        position[0] = hitInfo.position.x;
        position[1] = hitInfo.position.y;
        position[2] = hitInfo.position.z;
        normal[0] = hitInfo.normal.x;
        normal[1] = hitInfo.normal.y;
        normal[2] = hitInfo.normal.z;
        distance = hitInfo.distance;
        objectId = geometrySpec->objectId;
        outPosition = geometrySpec->objectPosition;
        outQuaternion = geometrySpec->objectQuaternion;
        faceIndex = hitInfo.faceIndex;
      }
    }
  }
}

void doCollide(Tracker *tracker, float radius, float halfHeight, float *position, float *quaternion, float *meshPosition, float *meshQuaternion, unsigned int maxIter, unsigned int &hit, float *direction, unsigned int &grounded) {
  PxCapsuleGeometry geom(radius, halfHeight);
  PxTransform geomPose(
    PxVec3{position[0], position[1], position[2]},
    PxQuat{quaternion[0], quaternion[1], quaternion[2], quaternion[3]}
  );
  PxTransform meshPose{
    PxVec3{meshPosition[0], meshPosition[1], meshPosition[2]},
    PxQuat{meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]}
  };

  Vec p(meshPosition[0], meshPosition[1], meshPosition[2]);
  Quat q(meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]);
  
  // std::set<PhysicsObject *> &staticGeometrySpecs = physicer->staticGeometrySpecs;
  // std::vector<std::set<PhysicsObject *> *> &geometrySpecSets = physicer->geometrySpecSets;
  std::vector<std::tuple<bool, std::shared_ptr<PhysicsObject>>> sortedGeometrySpecs;
  sortedGeometrySpecs.reserve(256);
  Vec offset(0, 0, 0);
  bool anyHadHit = false;
  bool anyHadGrounded = false;
  {
    for (unsigned int i = 0; i < maxIter; i++) {
      // Vec capsulePosition(geomPose.p.x, geomPose.p.y, geomPose.p.z);
      // sortedGeometrySpecs.clear();

      {
        std::lock_guard<std::mutex> lock(tracker->subparcelsMutex);

        for (auto &iter : tracker->subparcels) {
          std::shared_ptr<Subparcel> &subparcel = iter.second;
          {
            std::shared_ptr<PhysicsObject> &geometrySpec = subparcel->landPhysxObject;
            if (geometrySpec) {
              /* Vec spherePosition = (geometrySpec->boundingSphere.center.clone().applyQuaternion(geometrySpec->quaternion) + geometrySpec->position)
                .applyQuaternion(q) + p;
              float distance = spherePosition.distanceTo(capsulePosition);
              if (distance < (geometrySpec->boundingSphere.radius + halfHeight + radius)) { */
                sortedGeometrySpecs.push_back(std::tuple<bool, std::shared_ptr<PhysicsObject>>(true, geometrySpec));
              // }
            }
          }
          for (std::shared_ptr<PhysicsObject> &geometrySpec : subparcel->vegetationPhysxObjects) {
            /* Vec spherePosition = (geometrySpec->boundingSphere.center.clone().applyQuaternion(geometrySpec->quaternion) + geometrySpec->position)
              .applyQuaternion(q) + p;
            float distance = spherePosition.distanceTo(capsulePosition);
            if (distance < (geometrySpec->boundingSphere.radius + halfHeight + radius)) { */
              sortedGeometrySpecs.push_back(std::tuple<bool, std::shared_ptr<PhysicsObject>>(false, geometrySpec));
            // }
          }
          for (std::shared_ptr<PhysicsObject> &geometrySpec : subparcel->thingPhysxObjects) {
            /* Vec spherePosition = (geometrySpec->boundingSphere.center.clone().applyQuaternion(geometrySpec->quaternion) + geometrySpec->position)
              .applyQuaternion(q) + p;
            float distance = spherePosition.distanceTo(capsulePosition);
            if (distance < (geometrySpec->boundingSphere.radius + halfHeight + radius)) { */
              sortedGeometrySpecs.push_back(std::tuple<bool, std::shared_ptr<PhysicsObject>>(false, geometrySpec));
            // }
          }
        }
        for (std::shared_ptr<PhysicsObject> &geometrySpec : tracker->thingPhysxObjects) {
          sortedGeometrySpecs.push_back(std::tuple<bool, std::shared_ptr<PhysicsObject>>(false, geometrySpec));
        }
      }
      std::sort(sortedGeometrySpecs.begin(), sortedGeometrySpecs.end(), [](const std::tuple<bool, std::shared_ptr<PhysicsObject>> &a, const std::tuple<bool, std::shared_ptr<PhysicsObject>> &b) -> bool {
        const bool &aStatic = std::get<0>(a);
        const bool &bStatic = std::get<0>(b);
        return aStatic > bStatic;
        /* if (aStatic != bStatic) {
          return aStatic > bStatic;
        } else {
          const float &aDistance = std::get<1>(a);
          const float &bDistance = std::get<1>(b);
          return aDistance < bDistance;
        } */
      });

      bool hadHit = false;
      for (const std::tuple<bool, std::shared_ptr<PhysicsObject>> &t : sortedGeometrySpecs) {
        const std::shared_ptr<PhysicsObject> &geometrySpec = std::get<1>(t);
        PxGeometry *geometry = geometrySpec->physicsGeometry->geometry;
        PxTransform meshPose2{
          PxVec3{geometrySpec->position.x, geometrySpec->position.y, geometrySpec->position.z},
          PxQuat{geometrySpec->quaternion.x, geometrySpec->quaternion.y, geometrySpec->quaternion.z, geometrySpec->quaternion.w}
        };
        PxTransform meshPose3 = meshPose * meshPose2;

        PxVec3 directionVec;
        PxReal depthFloat;
        bool result = PxGeometryQuery::computePenetration(directionVec, depthFloat, geom, geomPose, *geometry, meshPose3);
        if (result) {
          anyHadHit = true;
          hadHit = true;
          offset += Vec(directionVec.x, directionVec.y, directionVec.z)*depthFloat;
          geomPose.p.x += directionVec.x*depthFloat;
          geomPose.p.y += directionVec.y*depthFloat;
          geomPose.p.z += directionVec.z*depthFloat;
          anyHadGrounded = anyHadGrounded || directionVec.y > 0;
          // break;
        }
      }
      if (hadHit) {
        continue;
      } else {
        break;
      }
    }
  }
  if (anyHadHit) {
    hit = 1;
    direction[0] = offset.x;
    direction[1] = offset.y;
    direction[2] = offset.z;
    grounded = +anyHadGrounded;
  } else {
    hit = 0;
  }
}
int PEEK_FACE_OPPOSITES[] = {
  0, // NONE
  (int)PEEK_FACES::BACK, // FRONT -> BACK
  (int)PEEK_FACES::FRONT, // BACK -> FRONT
  (int)PEEK_FACES::RIGHT, // LEFT -> RIGHT
  (int)PEEK_FACES::LEFT, // RIGHT -> LEFT
  (int)PEEK_FACES::BOTTOM, // TOP -> BOTTOM
  (int)PEEK_FACES::TOP, // BOTTOM -> TOP
};
int PEEK_FACE_INDICES[] = {255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,0,1,2,3,4,255,255,255,255,255,255,255,255,255,255,0,255,5,6,7,8,255,255,255,255,255,255,255,255,255,255,1,5,255,9,10,11,255,255,255,255,255,255,255,255,255,255,2,6,9,255,12,13,255,255,255,255,255,255,255,255,255,255,3,7,10,12,255,14,255,255,255,255,255,255,255,255,255,255,4,8,11,13,14,255};

/* GroupSet::GroupSet(int x, int y, int z, int index, const Sphere &boundingSphere, unsigned char *peeks, Group *groups, unsigned int numGroups) :
  x(x), y(y), z(z), index(index), boundingSphere(boundingSphere)
{
  memcpy(this->peeks, peeks, 15);
  this->groups.reserve(numGroups);
  for (unsigned int i = 0; i < numGroups; i++) {
    this->groups.push_back(groups[i]);
  }
} */
PeekDirection PEEK_DIRECTIONS[6] = {
  {{0, 0, 1}, {0, 0, 1}, PEEK_FACES::FRONT},
  {{0, 0, -1}, {0, 0, -1}, PEEK_FACES::BACK},
  {{-1, 0, 0}, {-1, 0, 0}, PEEK_FACES::LEFT},
  {{1, 0, 0}, {1, 0, 0}, PEEK_FACES::RIGHT},
  {{0, 1, 0}, {0, 1, 0}, PEEK_FACES::TOP},
  {{0, -1, 0}, {0, -1, 0}, PEEK_FACES::BOTTOM},
};

/* Culler::Culler() {
  groupSets.reserve(512);
}
CullResult::CullResult(unsigned int start, unsigned int count, unsigned int materialIndex) : start(start), count(count), materialIndex(materialIndex) {}
Culler *doMakeCuller() {
  return new Culler();
}
GroupSet *doRegisterGroupSet(Culler *culler, int x, int y, int z, float r, unsigned char *peeks, Group *groups, unsigned int numGroups) {
  GroupSet *groupSet = new GroupSet(
    x,
    y,
    z,
    getSubparcelIndex(x, y, z),
    Sphere(x*SUBPARCEL_SIZE + SUBPARCEL_SIZE/2, y*SUBPARCEL_SIZE + SUBPARCEL_SIZE/2, z*SUBPARCEL_SIZE + SUBPARCEL_SIZE/2, r),
    peeks,
    groups,
    numGroups
  );
  culler->groupSets.push_back(groupSet);
  return groupSet;
}
void doUnregisterGroupSet(Culler *culler, GroupSet *groupSet) {
  auto groupSetIter = std::find(culler->groupSets.begin(), culler->groupSets.end(), groupSet);
  culler->groupSets.erase(groupSetIter);
  delete groupSet;
}
void doCull(Culler *culler, float *positionData, float *matrixData, float slabRadius, CullResult *cullResults, unsigned int &numCullResults) {
  Vec position(positionData[0], positionData[1], positionData[2]);
  Frustum frustum;
  frustum.setFromMatrix(matrixData);
  std::vector<GroupSet *> &groupSets = culler->groupSets;

  // frustum cull
  std::vector<GroupSet *> frustumGroupSets;
  frustumGroupSets.reserve(groupSets.size());
  for (int i = 0; i < groupSets.size(); i++) {
    if (frustum.intersectsSphere(groupSets[i]->boundingSphere)) {
      frustumGroupSets.push_back(groupSets[i]);
    }
  }
  std::sort(frustumGroupSets.begin(), frustumGroupSets.end(), [&](GroupSet *a, GroupSet *b) -> bool {
    return a->boundingSphere.center.distanceTo(position) < b->boundingSphere.center.distanceTo(position);
  });

  // intialize queue
  std::deque<GroupSet *> queue;
  std::set<GroupSet *> seenQueue;
  for (int i = 0; i < frustumGroupSets.size(); i++) {
    GroupSet *groupSet = frustumGroupSets[i];
    if (groupSet->boundingSphere.center.distanceTo(position) < slabRadius*2.0f) {
      queue.push_back(groupSet);
      seenQueue.insert(groupSet);
    }
  }

  // run queue
  numCullResults = 0;
  while (queue.size() > 0) {
    GroupSet *groupSet = queue.front();
    queue.pop_front();

    for (const Group &group : groupSet->groups) {
      CullResult &cullResult = cullResults[numCullResults++];
      cullResult.start = group.start;
      cullResult.count = group.count;
      cullResult.materialIndex = group.materialIndex;
    }

    for (const PeekDirection &enterPeekDirection : PEEK_DIRECTIONS) {
      const Vec &enterNormal = enterPeekDirection.normal;
      const int *enterINormal = enterPeekDirection.inormal;
      const PEEK_FACES &enterFace = enterPeekDirection.face;
      const Vec direction = groupSet->boundingSphere.center
        + (enterNormal * (float)SUBPARCEL_SIZE/2.0f)
        - position;
      if (direction.dot(enterNormal) <= 0) {
        for (const PeekDirection &exitPeekDirection : PEEK_DIRECTIONS) {
          const Vec &exitNormal = exitPeekDirection.normal;
          const PEEK_FACES &exitFace = exitPeekDirection.face;
          const int *exitINormal = exitPeekDirection.inormal;
          const Vec direction = groupSet->boundingSphere.center
            + (exitNormal * (float)SUBPARCEL_SIZE/2.0f)
            - position;
          if (direction.dot(exitNormal) >= 0 && groupSet->peeks[PEEK_FACE_INDICES[(int)enterFace << 4 | (int)exitFace]]) {
            int index = getSubparcelIndex(groupSet->x + exitINormal[0], groupSet->y + exitINormal[1], groupSet->z + exitINormal[2]);
            auto nextGroupSetIter = std::find_if(frustumGroupSets.begin(), frustumGroupSets.end(), [&](GroupSet *groupSet) -> bool {
              return groupSet->index == index;
            });
            if (nextGroupSetIter != frustumGroupSets.end()) {
              GroupSet *nextGroupSet = *nextGroupSetIter;
              if (nextGroupSet != nullptr && seenQueue.find(nextGroupSet) == seenQueue.end()) {
                queue.push_back(nextGroupSet);
                seenQueue.insert(nextGroupSet);
              }
            }
          }
        }
      }
    }
  }
  std::sort(cullResults, cullResults + numCullResults, [&](const CullResult &a, const CullResult &b) -> bool {
    return a.materialIndex < b.materialIndex;
  });
} */
inline void collapseGroups(CullResult *cullResults, unsigned int &numCullResults) {
  unsigned int srcNumCullResults = numCullResults;
  unsigned int &dstIndex = numCullResults;
  dstIndex = 0;
  for (unsigned int srcIndex = 0; srcIndex < srcNumCullResults;) {
    CullResult &startGroup = cullResults[srcIndex];

    unsigned int endIndex = srcIndex;
    for (unsigned int j = srcIndex+1; j < srcNumCullResults; j++) {
      CullResult &endGroup = cullResults[j];
      if (startGroup.start + startGroup.count == endGroup.start) {
        startGroup.count += endGroup.count;
        endIndex = j;
      } else {
        break;
      }
    }

    cullResults[dstIndex++] = cullResults[srcIndex];
    srcIndex = endIndex + 1;
  }
}
void doTickCull(Tracker *tracker, float *positionData, float *matrixData, CullResult *landCullResults, unsigned int &numLandCullResults, CullResult *vegetationCullResults, unsigned int &numVegetationCullResults, CullResult *thingCullResults, unsigned int &numThingCullResults) {
  Vec position(positionData[0], positionData[1], positionData[2]);
  Frustum frustum;
  frustum.setFromMatrix(matrixData);

  // std::cout << "direction 1" << direction.x << " " << direction.y << " " << direction.z << std::endl;

  tracker->currentCullSubparcels.clear();

  // frustum cull
  std::map<int, std::shared_ptr<Subparcel>> subparcels;
  // std::vector<std::shared_ptr<Subparcel>> frustumSubparcels;
  {
    std::lock_guard<std::mutex> lock(tracker->subparcelsMutex);
    subparcels = tracker->subparcels;
    /* frustumSubparcels.reserve(tracker->subparcels.size());
    for (auto &iter : tracker->subparcels) {
      std::shared_ptr<Subparcel> &subparcel = iter.second;
      subparcels.push_back(subparcel);
      if (frustum.intersectsSphere(subparcel->boundingSphere)) {
        frustumSubparcels.push_back(subparcel);
      }
    } */
  }
  // std::cout << "direction 2 " << subparcels.size() << std::endl;
  /* std::sort(frustumSubparcels.begin(), frustumSubparcels.end(), [&](std::shared_ptr<Subparcel> &a, std::shared_ptr<Subparcel> &b) -> bool {
    return a->boundingSphere.center.distanceTo(position) < b->boundingSphere.center.distanceTo(position);
  }); */

  // intialize queue
  std::deque<std::tuple<PEEK_FACES, float, std::shared_ptr<Subparcel>>> queue;
  // std::set<Subparcel *> seenQueue;
  int sx = (int)std::floor(position.x/(float)SUBPARCEL_SIZE);
  int sy = (int)std::floor(position.y/(float)SUBPARCEL_SIZE);
  int sz = (int)std::floor(position.z/(float)SUBPARCEL_SIZE);
  int index = getSubparcelIndex(sx, sy, sz);
  auto startIter = subparcels.find(index);
  if (startIter != subparcels.end()) {
    std::shared_ptr<Subparcel> &subparcel = startIter->second;
    queue.push_back(std::tuple<PEEK_FACES, float, std::shared_ptr<Subparcel>>(PEEK_FACES::NONE, 0, subparcel));
    // seenQueue.insert(subparcel.get());
  }

  // std::cout << "direction 3 " << queue.size() << std::endl;

  // run queue
  while (queue.size() > 0) {
    // std::cout << "tick queue " << queue.size() << std::endl;
    std::tuple<PEEK_FACES, float, std::shared_ptr<Subparcel>> &spec = queue.front();
    PEEK_FACES &enterFace = std::get<0>(spec);
    float &distance = std::get<1>(spec);
    std::shared_ptr<Subparcel> &subparcel = std::get<2>(spec);

    // seenQueue.insert(subparcel.get());

    for (const PeekDirection &exitPeekDirection : PEEK_DIRECTIONS) {
      const Vec &exitNormal = exitPeekDirection.normal;
      const PEEK_FACES &exitFace = exitPeekDirection.face;
      const int *exitINormal = exitPeekDirection.inormal;
      const Vec direction = subparcel->boundingSphere.center
        + (exitNormal * (float)SUBPARCEL_SIZE/2.0f)
        - position;
      if (enterFace == PEEK_FACES::NONE || (direction.dot(exitNormal) > 0 && subparcel->peeks[PEEK_FACE_INDICES[(int)enterFace << 4 | (int)exitFace]])) {
        int index = getSubparcelIndex(subparcel->coord.x + exitINormal[0], subparcel->coord.y + exitINormal[1], subparcel->coord.z + exitINormal[2]);
        auto nextSubparcelIter = subparcels.find(index);
        if (nextSubparcelIter != subparcels.end()) {
          std::shared_ptr<Subparcel> &nextSubparcel = nextSubparcelIter->second;
          // if (seenQueue.find(nextSubparcel) == seenQueue.end()) {
          if (frustum.intersectsSphere(nextSubparcel->boundingSphere)) {
            queue.push_back(std::tuple<PEEK_FACES, float, std::shared_ptr<Subparcel>>((PEEK_FACES)PEEK_FACE_OPPOSITES[(int)exitFace], 0, nextSubparcel));
            // seenQueue.insert(nextSubparcel.get());
          }
        }
      }
    }

    tracker->currentCullSubparcels.insert(std::move(subparcel));
    queue.pop_front();
  }

  // collect groups
  numLandCullResults = 0;
  numVegetationCullResults = 0;
  numThingCullResults = 0;
  for (const std::shared_ptr<Subparcel> &subparcel : tracker->currentCullSubparcels) {
    for (const Group &group : subparcel->landGroups) {
      if (group.count > 0) {
        CullResult &cullResult = landCullResults[numLandCullResults++];
        cullResult.start = group.start;
        cullResult.count = group.count;
        cullResult.materialIndex = group.materialIndex;
      }
    }
    for (const Group &group : subparcel->vegetationGroups) {
      if (group.count > 0) {
        CullResult &cullResult = vegetationCullResults[numVegetationCullResults++];
        cullResult.start = group.start;
        cullResult.count = group.count;
        cullResult.materialIndex = group.materialIndex;
      }
    }
    for (const Group &group : subparcel->thingGroups) {
      if (group.count > 0) {
        CullResult &cullResult = thingCullResults[numThingCullResults++];
        cullResult.start = group.start;
        cullResult.count = group.count;
        cullResult.materialIndex = group.materialIndex;
      }
    }
  }
  // collapse groups
  if (numLandCullResults >= 2) {
    std::sort(landCullResults, landCullResults + numLandCullResults, [&](const CullResult &a, const CullResult &b) -> bool {
      if (a.materialIndex != b.materialIndex) {
        return a.materialIndex < b.materialIndex;
      } else {
        return a.start < b.start;
      }
    });
    collapseGroups(landCullResults, numLandCullResults);
  }
  if (numVegetationCullResults >= 2) {
    std::sort(vegetationCullResults, vegetationCullResults + numVegetationCullResults, [&](const CullResult &a, const CullResult &b) -> bool {
      return a.start < b.start;
    });
    collapseGroups(vegetationCullResults, numVegetationCullResults);
  }
  if (numThingCullResults >= 2) {
    std::sort(thingCullResults, thingCullResults + numThingCullResults, [&](const CullResult &a, const CullResult &b) -> bool {
      return a.start < b.start;
    });
    collapseGroups(thingCullResults, numThingCullResults);
  }
}