// #include "DirectXMath.h"
/* #include "PhysX/physx/include/geometry/PxMeshQuery.h"
#include "geometry/PxCapsuleGeometry.h"
#include "foundation/PxTransform.h"
 */
#include "physics.h"
#include <string>
#include <iostream>

using namespace physx;

SimulationEventCallback2::SimulationEventCallback2() {}
SimulationEventCallback2::~SimulationEventCallback2() {}
void SimulationEventCallback2::onConstraintBreak(PxConstraintInfo *constraints, PxU32 count) {}
void SimulationEventCallback2::onWake(PxActor **actors, PxU32 count) {}
void SimulationEventCallback2::onSleep(PxActor **actors, PxU32 count) {}
void SimulationEventCallback2::onContact(const PxContactPairHeader& pairHeader, const PxContactPair* pairs, PxU32 nbPairs) {
  PxRigidActor *actor1 = pairHeader.actors[0];
  PxRigidActor *actor2 = pairHeader.actors[1];

  unsigned int actor1Id = (unsigned int)actor1->userData;
  unsigned int actor2Id = (unsigned int)actor2->userData;

  stateBitfields[actor1Id] |= STATE_BITFIELD::STATE_BITFIELD_COLLIDED;
  stateBitfields[actor2Id] |= STATE_BITFIELD::STATE_BITFIELD_COLLIDED;

  for (uint32_t i = 0; i < nbPairs; i++) {
    const PxContactPair &pair = pairs[i];

    PxContactPairPoint contactPairPoints[32];
    uint32_t numPoints = pair.extractContacts(contactPairPoints, sizeof(contactPairPoints) / sizeof(contactPairPoints[0]));
    
    for (uint32_t j = 0; j < numPoints; j++) {
      PxContactPairPoint &contactPairPoint = contactPairPoints[j];
      if (contactPairPoint.normal.y >= 0.0001) { // from B to A is up
        stateBitfields[actor1Id] |= STATE_BITFIELD::STATE_BITFIELD_GROUNDED;
      }
      if (contactPairPoint.normal.y <= -0.0001) { // from B to A is down
        stateBitfields[actor2Id] |= STATE_BITFIELD::STATE_BITFIELD_GROUNDED;
      }
    }
  }

  /* PxContactPairPoint contactPoints[32];
  auto numPoints = pairs->extractContacts(contactPoints, sizeof(contactPoints)/sizeof(contactPoints[0]));
  for (auto i = 0; i < numPoints; i++) {
    const PxContactPairPoint &contactPint = contactPoints[i];
  } */

  // std::cerr << "on contact" << std::endl;
}
void SimulationEventCallback2::onTrigger(PxTriggerPair *pairs, PxU32 count) {
  this->triggerCount = count;
  for (unsigned int i = 0; i < count; i++) {
    TriggerEventInfo triggerEventInfo;
    triggerEventInfo.status = pairs[i].status;
    triggerEventInfo.triggerActorId = (unsigned int)pairs[i].triggerActor->userData;
    triggerEventInfo.otherActorId = (unsigned int)pairs[i].otherActor->userData;

    triggerEventInfos[i] = triggerEventInfo;
  }
}
void SimulationEventCallback2::onAdvance(const PxRigidBody *const *bodyBuffer, const PxTransform *poseBuffer, const PxU32 count) {}

/*
  CharacterControllerFilterCallback
  This filters collisions for the character capsule and character skeletons
*/
CharacterControllerFilterCallback::CharacterControllerFilterCallback() {}
CharacterControllerFilterCallback::~CharacterControllerFilterCallback() {}
PxQueryHitType::Enum CharacterControllerFilterCallback::preFilter(
  const PxFilterData &filterData,
  const PxShape *shape,
  const PxRigidActor *actor,
  PxHitFlags &queryFlags
) {
  const PxFilterData &filterDataShape = shape->getSimulationFilterData();
  if (
    (filterDataShape.word2 == 2) || // this is an avatar capsule
    (filterDataShape.word3 == 3) // this is a skeleton bone
  ) {
    return PxQueryHitType::eNONE; // do not collide
  } else {
    return PxQueryHitType::eBLOCK; // maybe collide
  }
}
PxQueryHitType::Enum CharacterControllerFilterCallback::postFilter(const PxFilterData &filterData, const PxQueryHit &hit) {
  // should never hit this since we are not using the postFilter flag
  std::cerr << "CharacterControllerFilterCallback::postFilter not implemented!" << std::endl;
  abort();
  return PxQueryHitType::eNONE;
}

PxFilterFlags ccdFilterShader(
  PxFilterObjectAttributes attributes0,
  PxFilterData filterData0,
  PxFilterObjectAttributes attributes1,
  PxFilterData filterData1,
  PxPairFlags& pairFlags,
  const void* constantBlock,
  PxU32 constantBlockSize
) {
  PxFilterFlags result = physx::PxDefaultSimulationFilterShader(
    attributes0,
    filterData0,
    attributes1,
    filterData1,
    pairFlags,
    constantBlock,
    constantBlockSize
  );
  if (
    (filterData0.word2 == 2 || filterData1.word2 == 2) && // one of the objects is an avatar capsule
    (filterData0.word3 == 3 || filterData1.word3 == 3) // one of the objects is a skeleton bone
  ) {
    // do not colide
    pairFlags &= ~PxPairFlag::eSOLVE_CONTACT;
    pairFlags &= ~PxPairFlag::eNOTIFY_TOUCH_FOUND;
    pairFlags &= ~PxPairFlag::eDETECT_DISCRETE_CONTACT;
    pairFlags &= ~PxPairFlag::eDETECT_CCD_CONTACT;
  } else {
    // maybe colide
    pairFlags |= PxPairFlag::eSOLVE_CONTACT;
    pairFlags |= PxPairFlag::eNOTIFY_TOUCH_FOUND;
    pairFlags |= PxPairFlag::eDETECT_DISCRETE_CONTACT;
    pairFlags |= PxPairFlag::eDETECT_CCD_CONTACT;
  }
  /* if (filterData0.word1 == TYPE::TYPE_CAPSULE || filterData1.word1 == TYPE::TYPE_CAPSULE) {
    pairFlags |= PxPairFlag::eNOTIFY_TOUCH_FOUND;
    pairFlags |= PxPairFlag::eNOTIFY_TOUCH_PERSISTS;
    pairFlags |= PxPairFlag::eNOTIFY_CONTACT_POINTS;
  } */
  return result;
}

enum PhysicsObjectFlags {
  NONE = 0,
  ENABLE_PHYSICS = 1,
  ENABLE_CCD = 2,
};

//

constexpr size_t maxNumTouches = 32;
class OverlapCallback : public PxOverlapCallback {
public:
  PxOverlapHit touches[maxNumTouches];
  std::deque<PxOverlapHit> hits;

  OverlapCallback() :
    PxOverlapCallback(touches, maxNumTouches)
    {
      // hits.reserve(maxNumTouches);
    }
  PxAgain processTouches(const PxOverlapHit *buffer, PxU32 nbHits) {
    for (PxU32 i = 0; i < nbHits; i++) {
      hits.push_back(buffer[i]);
    }
    return hits.size() < maxNumTouches;
    // return true;
    // return false; // do not continue
  }
};
class PenetrationDepth {
public:
  PxRigidActor *actor;
  PxVec3 direction;
  float depth;
};

//

PScene::PScene() {
  // tolerancesScale.length = 0.01;
  {
    // PxTolerancesScale tolerancesScale;
    physics = PxCreatePhysics(PX_PHYSICS_VERSION, *(physicsBase->foundation), physicsBase->tolerancesScale);
  }
  {
    simulationEventCallback = new SimulationEventCallback2();
  }
  {
    // PxTolerancesScale tolerancesScale;
    PxSceneDesc sceneDesc = PxSceneDesc(physicsBase->tolerancesScale);
    sceneDesc.gravity = PxVec3(0.0f, -9.8f, 0.0f);
    sceneDesc.flags |= PxSceneFlag::eENABLE_ACTIVE_ACTORS;
    sceneDesc.flags |= PxSceneFlag::eENABLE_CCD;
    sceneDesc.broadPhaseType = PxBroadPhaseType::eABP;
    sceneDesc.simulationEventCallback = simulationEventCallback;
    if (!sceneDesc.cpuDispatcher) {
      physx::PxDefaultCpuDispatcher* mCpuDispatcher = physx::PxDefaultCpuDispatcherCreate(0);
      if (!mCpuDispatcher) {
        std::cerr << "PxDefaultCpuDispatcherCreate failed!" << std::endl;
      }
      sceneDesc.cpuDispatcher = mCpuDispatcher;
    }
    sceneDesc.filterShader = ccdFilterShader;
    scene = physics->createScene(sceneDesc);
    controllerManager = PxCreateControllerManager(*scene);
    controllerManager->setOverlapRecoveryModule(true);
  }
 
  /* {
      PxMaterial *material = physics->createMaterial(0.5f, 0.5f, 0.1f);
      PxTransform transform(PxVec3(0, -10, 0));
      PxCapsuleGeometry geometry(1, 1);
      PxRigidDynamic *capsule = PxCreateDynamic(*physics, transform, geometry, *material, 1);
      capsule->userData = (void *)0x1;
      // capsule->setRigidDynamicFlag(PxRigidDynamicFlag::eKINEMATIC, true);
      PxRigidBodyExt::updateMassAndInertia(*capsule, 1.0f);
      scene->addActor(*capsule);
      actors.push_back(capsule);
  } */
  /* {
      PxMaterial *material = physics->createMaterial(0.5f, 0.5f, 0.1f);
      PxTransform transform(PxVec3(0, -1, 0));
      PxBoxGeometry geometry(30, 1, 30);
      PxRigidStatic *floor = PxCreateStatic(*physics, transform, geometry, *material);
      floor->userData = (void *)0x2;
      scene->addActor(*floor);
      actors.push_back(floor);
  }
  {
      PxMaterial *material = physics->createMaterial(0.5f, 0.5f, 0.1f);
      PxTransform transform(PxVec3(0, 5, 0));
      PxBoxGeometry geometry(0.5, 0.5, 0.5);
      PxRigidDynamic *box = PxCreateDynamic(*physics, transform, geometry, *material, 1);
      box->userData = (void *)0x3;
      PxRigidBodyExt::updateMassAndInertia(*box, 1.0f);
      scene->addActor(*box);
      actors.push_back(box);
  } */
}
PScene::~PScene() {
  std::cout << "scene destructor" << std::endl;
  abort();
}

PxD6Joint *PScene::addJoint(unsigned int id1, unsigned int id2, float *position1, float *position2, float *quaternion1, float *quaternion2) {
  PxRigidActor *actor1;
  PxRigidActor *actor2;
  PxRigidDynamic *body1;
  PxRigidDynamic *body2;

  auto actorIter1 = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id1;
  });
  if (actorIter1 != actors.end()) {
    actor1 = *actorIter1;
    body1 = dynamic_cast<PxRigidDynamic *>(actor1);
    // std::cout << "add joint got id a" << id1 << std::endl;
  } else {
    std::cerr << "add joint unknown actor id a" << id1 << std::endl;
  }

  auto actorIter2 = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id2;
  });
  if (actorIter2 != actors.end()) {
    actor2 = *actorIter2;
    body2 = dynamic_cast<PxRigidDynamic *>(actor2);
    // std::cout << "add joint got id b" << id2 << std::endl;
  } else {
    std::cerr << "add joint unknown actor id b" << id2 << std::endl;
  }

  // if (fixBody1) {
  //   body1->setRigidDynamicLockFlags(
  //     PxRigidDynamicLockFlag::eLOCK_LINEAR_X | 
  //     PxRigidDynamicLockFlag::eLOCK_LINEAR_Y | 
  //     PxRigidDynamicLockFlag::eLOCK_LINEAR_Z | 
  //     PxRigidDynamicLockFlag::eLOCK_ANGULAR_X | 
  //     PxRigidDynamicLockFlag::eLOCK_ANGULAR_Y |
  //     PxRigidDynamicLockFlag::eLOCK_ANGULAR_Z
  //   );
  // }

  PxTransform transform1(
    PxVec3{position1[0], position1[1], position1[2]},
    PxQuat{quaternion1[0], quaternion1[1], quaternion1[2], quaternion1[3]}
  );
  PxTransform transform2(
    PxVec3{position2[0], position2[1], position2[2]},
    PxQuat{quaternion2[0], quaternion2[1], quaternion2[2], quaternion2[3]}
  );

  PxD6Joint *joint = PxD6JointCreate(
    *physics,
    body1, transform1,
    body2, transform2
  );

  return joint;
}

void PScene::setJointMotion(PxD6Joint *joint, PxD6Axis::Enum axis, PxD6Motion::Enum motion) {
  joint->setMotion(axis, motion);
}

void PScene::setJointTwistLimit(PxD6Joint *joint, float lowerLimit, float upperLimit, float contactDist) {
  joint->setTwistLimit(physx::PxJointAngularLimitPair(lowerLimit, upperLimit, contactDist));
}

void PScene::setJointSwingLimit(PxD6Joint *joint, float yLimitAngle, float zLimitAngle, float contactDist) {
  joint->setSwingLimit(physx::PxJointLimitCone(yLimitAngle, zLimitAngle, contactDist));
}

bool PScene::updateMassAndInertia(unsigned int id, float shapeDensities) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    return PxRigidBodyExt::updateMassAndInertia(*(dynamic_cast<PxRigidBody *>(actor)), shapeDensities);
  } else {
    std::cerr << "updateMassAndInertia unknown actor id " << id << std::endl;
    return false;
  }
}

float PScene::getBodyMass(unsigned int id) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    return (dynamic_cast<PxRigidBody *>(actor))->getMass();
  } else {
    std::cerr << "getBodyMass unknown actor id " << id << std::endl;
    return -1;
  }
}

unsigned int PScene::simulate(unsigned int *ids, float *positions, float *quaternions, float *scales, unsigned int *stateBitfields, unsigned int numIds, float elapsedTime, float *velocities) {
  for (unsigned int i = 0; i < numIds; i++) {
    unsigned int id = ids[i];
    //PxTransform transform(PxVec3(positions[i*3], positions[i*3+1], positions[i*3+2]), PxQuat(quaternions[i*4], quaternions[i*4+1], quaternions[i*4+2], quaternions[i*4+3]));
    auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
      return (unsigned int)actor->userData == id;
    });
    if (actorIter != actors.end()) {
      PxRigidActor *actor = *actorIter;
      //actor->setGlobalPose(transform, true);
      PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
      if (body) {
        // std::cout << "reset" << std::endl;
        body->setLinearVelocity(PxVec3(velocities[i*3], velocities[i*3+1], velocities[i*3+2]), true);
        //body->setAngularVelocity(PxVec3(0, 0, 0), true);
        // actor->setActorFlag(PxActorFlag::eDISABLE_GRAVITY, true);
      }
      // actor->wakeUp();
    } else {
      std::cerr << "simulate unknown actor id " << id << std::endl;
    }
  }

  simulationEventCallback->stateBitfields.clear();

  scene->simulate(elapsedTime);
  PxU32 error;
  scene->fetchResults(true, &error);
  if (error) {
    std::cout << "scene simulate error " << error << std::endl;
  }
  
  PxU32 numActors;
  PxRigidActor **actors = (PxRigidActor **)scene->getActiveActors(numActors);
  for (unsigned int i = 0; i < numActors; i++) {
    PxRigidActor *actor = actors[i];
    const PxTransform &actor2World = actor->getGlobalPose();
    const PxVec3 &p = actor2World.p;
    const PxQuat &q = actor2World.q;
    
    const unsigned int id = (unsigned int)actors[i]->userData;
    ids[i] = id;
    
    positions[i*3] = p.x;
    positions[i*3+1] = p.y;
    positions[i*3+2] = p.z;
    
    quaternions[i*4] = q.x;
    quaternions[i*4+1] = q.y;
    quaternions[i*4+2] = q.z;
    quaternions[i*4+3] = q.w;
    
    {
      PxVec3 s(1, 1, 1);
      unsigned int numShapes = actor->getNbShapes();
      if (numShapes == 1) {
        PxShape *shapes[1];
        actor->getShapes(shapes, sizeof(shapes)/sizeof(shapes[0]), 0);
        PxShape *shape = shapes[0];
        PxGeometryHolder geometryHolder = shape->getGeometry();
        PxGeometryType::Enum geometryType = geometryHolder.getType();
        switch (geometryType) {
          case PxGeometryType::Enum::eBOX: {
            const PxBoxGeometry &geometry = geometryHolder.box();
            const PxVec3 &halfExtents = geometry.halfExtents;
            s = halfExtents * 2;
            break;
          }
          case PxGeometryType::Enum::eCONVEXMESH: {
            PxConvexMeshGeometry &geometry = geometryHolder.convexMesh();
            s = geometry.scale.scale;
            break;
          }
          case PxGeometryType::Enum::eTRIANGLEMESH: {
            PxTriangleMeshGeometry &geometry = geometryHolder.triangleMesh();
            s = geometry.scale.scale;
            break;
          }
          case PxGeometryType::Enum::eCAPSULE: {
            PxCapsuleGeometry &geometry = geometryHolder.capsule();
            s = PxVec3(geometry.radius * 2.0);
            break;
          }
          default: {
            std::cerr << "unknown geometry type for actor id " << id << " : " << (unsigned int)geometryType << std::endl;
            break;
          }
        }
      } else {
        std::cerr << "no shapes for actor id " << id << " : " << numShapes << std::endl;
      }
      
      scales[i*3] = s.x;
      scales[i*3+1] = s.y;
      scales[i*3+2] = s.z;

      // std::cout << "check bitfields 1" << std::endl;
      stateBitfields[i] = simulationEventCallback->stateBitfields[id];
      // std::cout << "check bitfields 2" << std::endl;
    }
  }
  return numActors;
}

float PScene::setTrigger(unsigned int id) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxShape* shape;
    actor->getShapes(&shape, 1);
    shape->setFlag(PxShapeFlag::eSIMULATION_SHAPE, false);
    shape->setFlag(PxShapeFlag::eSCENE_QUERY_SHAPE, false);
    shape->setFlag(PxShapeFlag::eTRIGGER_SHAPE, true);

    return 1;
  } else {
    std::cerr << "setTrigger unknown actor id " << id << std::endl;
    return -1;
  }
}

unsigned int PScene::getTriggerEvents(unsigned int *scratchStack) {
  unsigned int triggerCount = this->simulationEventCallback->triggerCount;
  for (unsigned int i = 0; i < triggerCount; i++) {
    scratchStack[i * 3 + 0] = this->simulationEventCallback->triggerEventInfos[i].status;
    scratchStack[i * 3 + 1] = this->simulationEventCallback->triggerEventInfos[i].triggerActorId;
    scratchStack[i * 3 + 2] = this->simulationEventCallback->triggerEventInfos[i].otherActorId;
  }

  // reset
  this->simulationEventCallback->triggerCount = 0;

  return triggerCount;
}

void PScene::addCapsuleGeometry(
  float *position,
  float *quaternion,
  float radius,
  float halfHeight,
  unsigned int id,
  PxMaterial *material,
  unsigned int dynamic,
  unsigned int flags
) {
  PxTransform transform(PxVec3(position[0], position[1], position[2]), PxQuat(quaternion[0], quaternion[1], quaternion[2], quaternion[3]));
  PxTransform relativePose(PxQuat(PxHalfPi, PxVec3(0,0,1)));
  PxCapsuleGeometry geometry(radius, halfHeight);
  
  // const bool physicsEnabled = (bool)(flags & PhysicsObjectFlags::ENABLE_PHYSICS);
  const bool ccdEnabled = (bool)(flags & PhysicsObjectFlags::ENABLE_CCD);

  PxRigidActor *actor;
  if (dynamic) {
    PxRigidDynamic *body = PxCreateDynamic(*physics, transform, geometry, *material, 1);
    PxRigidBodyExt::updateMassAndInertia(*body, 1.0f);
    if (ccdEnabled) {
      body->setRigidBodyFlag(PxRigidBodyFlag::eENABLE_CCD, true);
    }
    actor = body;
  } else {
    PxRigidStatic *body = PxCreateStatic(*physics, transform, geometry, *material);
    actor = body;
  }

  actor->userData = (void *)id;
  scene->addActor(*actor);
  actors.push_back(actor);
}

void PScene::addPlaneGeometry(float *position, float *quaternion, unsigned int id, PxMaterial *material, unsigned int dynamic) {
  PxTransform transform(PxVec3(position[0], position[1], position[2]), PxQuat(quaternion[0], quaternion[1], quaternion[2], quaternion[3]));
  PxPlaneGeometry geometry;
  
  PxRigidActor *actor;
  if (dynamic) {
    PxRigidDynamic *plane = PxCreateDynamic(*physics, transform, geometry, *material, 1);
    actor = plane;
  } else {
    PxRigidStatic *plane = PxCreateStatic(*physics, transform, geometry, *material);
    actor = plane;
  }

  actor->userData = (void *)id;
  scene->addActor(*actor);
  actors.push_back(actor);
}
void PScene::addBoxGeometry(float *position, float *quaternion, float *size, unsigned int id, PxMaterial *material, unsigned int dynamic, int groupId) {
  PxTransform transform(PxVec3(position[0], position[1], position[2]), PxQuat(quaternion[0], quaternion[1], quaternion[2], quaternion[3]));
  PxBoxGeometry geometry(size[0], size[1], size[2]);
  
  PxRigidActor *actor;
  if (dynamic) {
    PxRigidDynamic *box = PxCreateDynamic(*physics, transform, geometry, *material, 1);
    PxRigidBodyExt::updateMassAndInertia(*box, 1.0f);
    actor = box;
    if (groupId != -1) {
      // collision filter
      unsigned int numShapes = box->getNbShapes();
      if (numShapes == 1) {
        PxShape *shapes[1];
        box->getShapes(shapes, sizeof(shapes)/sizeof(shapes[0]), 0);
        PxShape *shape = shapes[0];
        PxFilterData filterData{};
        filterData.word0 = groupId; // character id
        filterData.word1 = groupId; // the unique bone id in the character
        filterData.word3 = 3; // signal this is a character skeleton bone; used during filtering
        shape->setSimulationFilterData(filterData); 
      } else {
        std::cerr << "unexpected number of shapes: " << numShapes << std::endl;
      }
    }
  } else {
    PxRigidStatic *box = PxCreateStatic(*physics, transform, geometry, *material);
    actor = box;
  }

  actor->userData = (void *)id;
  scene->addActor(*actor);
  actors.push_back(actor);
}

PxTriangleMesh *PScene::createShape(uint8_t *data, unsigned int length, PxDefaultMemoryOutputStream *releaseWriteStream) {
  PxDefaultMemoryInputData readBuffer(data, length);
  PxTriangleMesh *triangleMesh = physics->createTriangleMesh(readBuffer);

  if (releaseWriteStream) {
    delete releaseWriteStream;
  }

  return triangleMesh;
}
void PScene::destroyShape(PxTriangleMesh *triangleMesh) {
  triangleMesh->release();
}
PxConvexMesh *PScene::createConvexShape(uint8_t *data, unsigned int length, PxDefaultMemoryOutputStream *releaseWriteStream) {
  PxDefaultMemoryInputData readBuffer(data, length);
  PxConvexMesh *convexMesh = physics->createConvexMesh(readBuffer);

  if (releaseWriteStream) {
    delete releaseWriteStream;
  }

  return convexMesh;
}
void PScene::destroyConvexShape(PxConvexMesh *convexMesh) {
  convexMesh->release();
}

PxHeightField *PScene::createHeightField(uint8_t *data, unsigned int length, PxDefaultMemoryOutputStream *releaseWriteStream) {
  PxDefaultMemoryInputData readBuffer(data, length);
  PxHeightField *heightfield = physics->createHeightField(readBuffer);

  if (releaseWriteStream) {
    delete releaseWriteStream;
  }

  return heightfield;
}

PxMaterial *PScene::createMaterial(float *mat) {
  PxMaterial *material = physics->createMaterial(mat[0], mat[1], mat[2]);
  return material;
}
void PScene::destroyMaterial(PxMaterial *material) {
  material->release();
}

void PScene::addGeometry(PxTriangleMesh *triangleMesh, float *position, float *quaternion, float *scale, unsigned int id, PxMaterial *material, unsigned int external, PxTriangleMesh *relaseTriangleMesh) {
  // have acquire and unacquire arg here to avoid the memory leak
  // the argument can be called "external" because it is not owned by the scene
  
  PxTransform transform(PxVec3(position[0], position[1], position[2]), PxQuat(quaternion[0], quaternion[1], quaternion[2], quaternion[3]));
  PxMeshScale scaleObject(PxVec3(scale[0], scale[1], scale[2]));
  if (external != 0) {
    triangleMesh->acquireReference();
  }
  PxTriangleMeshGeometry geometry(triangleMesh, scaleObject);
  PxRigidStatic *mesh = PxCreateStatic(*physics, transform, geometry, *material);
  mesh->userData = (void *)id;
  scene->addActor(*mesh);
  actors.push_back(mesh);
 
  if (relaseTriangleMesh != nullptr) {
    relaseTriangleMesh->release();
  }
}
void PScene::addConvexGeometry(PxConvexMesh *convexMesh, float *position, float *quaternion, float *scale, unsigned int id, PxMaterial *material, unsigned int dynamic, unsigned int external, PxConvexMesh *releaseConvexMesh) {
  PxTransform transform(PxVec3(position[0], position[1], position[2]), PxQuat(quaternion[0], quaternion[1], quaternion[2], quaternion[3]));
  PxMeshScale scaleObject(PxVec3(scale[0], scale[1], scale[2]));
  if (external != 0) {
    convexMesh->acquireReference();
  }
  PxConvexMeshGeometry geometry(convexMesh, scaleObject);

  PxRigidActor *mesh;
  if (dynamic) {
    mesh = PxCreateDynamic(*physics, transform, geometry, *material, 1);
  } else {
    mesh = PxCreateStatic(*physics, transform, geometry, *material);
  }
  mesh->userData = (void *)id;
  scene->addActor(*mesh);
  actors.push_back(mesh);

  if (releaseConvexMesh != nullptr) {
    releaseConvexMesh->release();
  }
}

void PScene::addHeightFieldGeometry(
  PxHeightField *heightField,
  float *position,
  float *quaternion,
  float *scale,
  float heightScale,
  float rowScale,
  float columnScale,
  unsigned int id,
  PxMaterial *material,
  unsigned int dynamic,
  unsigned int external,
  PxHeightField *releaseHeightField
) {
  PxTransform transform(
    PxVec3(position[0], position[1], position[2]),
    PxQuat(quaternion[0], quaternion[1], quaternion[2], quaternion[3])
  );
  PxHeightFieldGeometry geometry(
    heightField,
    PxMeshGeometryFlags(),
    heightScale * scale[1],
    rowScale * scale[0],
    columnScale * scale[2]
  );

  PxRigidActor *mesh;
  if (dynamic) {
    mesh = PxCreateDynamic(*physics, transform, geometry, *material, 1);
  } else {
    mesh = PxCreateStatic(*physics, transform, geometry, *material);
  }
  mesh->userData = (void *)id;
  scene->addActor(*mesh);
  actors.push_back(mesh);
}

void PScene::enableActor(unsigned int id) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    PxScene *actorScene = actor->getScene();
    if (actorScene == nullptr) {
      scene->addActor(*actor);
    } else {
      std::cerr << "enable physics actor already had a scene " << id << std::endl;
    }
  } else {
    std::cerr << "enable unknown actor id " << id << std::endl;
  }
}
void PScene::disableActor(unsigned int id) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    PxScene *actorScene = actor->getScene();
    if (actorScene != nullptr) {
      actorScene->removeActor(*actor);
    } else {
      std::cerr << "disable physics actor id had no scene " << id << std::endl;
    }
  } else {
    std::cerr << "disable physics actor id " << id << std::endl;
  }
}
void PScene::disableGeometry(unsigned int id) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    // actor->setActorFlag(PxActorFlag::eDISABLE_GRAVITY, true);

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    /* if (body) {
      body->setLinearVelocity(PxVec3(0, 0, 0), false);
      body->setAngularVelocity(PxVec3(0, 0, 0), false);
    } */

    PxShape *shapes[32];
    for (int j = 0;; j++) {
      memset(shapes, 0, sizeof(shapes));
      if (actor->getShapes(shapes, 32, j * 32) == 0) {
        break;
      }
      for (int i = 0; i < 32; ++i) {
        if (shapes[i] == nullptr) {
          break;
        }

        PxShape *rigidShape = shapes[i];
        rigidShape->setFlag(PxShapeFlag::eSIMULATION_SHAPE, false);
      }
    }
  } else {
    std::cerr << "disable unknown actor id " << id << std::endl;
  }
}
void PScene::enableGeometry(unsigned int id) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    
    // actor->setActorFlag(PxActorFlag::eDISABLE_GRAVITY, false);

    PxShape *shapes[32];
    for (int j = 0; ; j++) {
      memset(shapes, 0, sizeof(shapes));
      if (actor->getShapes(shapes, 32, j * 32) == 0) {
        break;
      }
      for (int i = 0; i < 32; ++i) {
        if (shapes[i] == nullptr) {
          break;
        }

        PxShape *rigidShape = shapes[i];
        rigidShape->setFlag(PxShapeFlag::eSIMULATION_SHAPE, true);
      }
    }
  } else {
    std::cerr << "enable unknown actor id " << id << std::endl;
  }
}
void PScene::disableGeometryQueries(unsigned int id) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    constexpr int numShapes = 32;
    PxShape *shapes[numShapes];
    for (int j = 0; ; j++) {
      memset(shapes, 0, sizeof(shapes));
      if (actor->getShapes(shapes, numShapes, j * numShapes) == 0) {
        break;
      }
      for (int i = 0; i < numShapes; ++i) {
        if (shapes[i] == nullptr) {
          break;
        }

        PxShape *rigidShape = shapes[i];
        rigidShape->setFlag(PxShapeFlag::eSCENE_QUERY_SHAPE, false);
      
        // std::cout << "disable queries for shape " << (unsigned int)actor->userData << " " << (uint32_t)rigidShape << " " << rigidShape->getFlags().isSet(PxShapeFlag::eSCENE_QUERY_SHAPE) << std::endl; // XXX
      }
    }
  } else {
    std::cerr << "disable queries unknown actor id " << id << std::endl;
  }
}
void PScene::enableGeometryQueries(unsigned int id) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    constexpr int numShapes = 32;
    PxShape *shapes[numShapes];
    for (int j = 0; ; j++) {
      memset(shapes, 0, sizeof(shapes));
      if (actor->getShapes(shapes, numShapes, j * numShapes) == 0) {
        break;
      }
      for (int i = 0; i < numShapes; ++i) {
        if (shapes[i] == nullptr) {
          break;
        }

        PxShape *rigidShape = shapes[i];
        rigidShape->setFlag(PxShapeFlag::eSCENE_QUERY_SHAPE, true);
      }
    }
  } else {
    std::cerr << "enable queries unknown actor id " << id << std::endl;
  }
}
void PScene::setTransform(unsigned int id, float *positions, float *quaternions, float *scales, bool autoWake) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxTransform transform(
      PxVec3(positions[0], positions[1], positions[2]),
      PxQuat(quaternions[0], quaternions[1], quaternions[2], quaternions[3])
    );
    actor->setGlobalPose(transform, autoWake);
  } else {
    std::cerr << "set transform unknown actor id " << id << std::endl;
  }
}
void PScene::setGeometryScale(unsigned int id, float *scale, PxDefaultMemoryOutputStream *writeStream) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });

  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    PxShape *shape;
    actor->getShapes(&shape, 1);

    if (shape->getFlags().isSet(PxShapeFlag::eSCENE_QUERY_SHAPE)) {

      PxGeometryHolder geometryHolder = shape->getGeometry();
      PxGeometryType::Enum geometryType = geometryHolder.getType();
      switch (geometryType) {
        case PxGeometryType::Enum::eBOX: {
          PxBoxGeometry &geometry = geometryHolder.box();
          geometry.halfExtents = PxVec3( scale[0], scale[1], scale[2] ) / 2;
          shape->setGeometry( geometryHolder.any() );
          break;
        }
        case PxGeometryType::Enum::eCAPSULE: {
          PxCapsuleGeometry &geometry = geometryHolder.capsule();
          geometry.radius = (std::max)( (std::max)( scale[0], scale[1] ), scale[2] ) / 2;
          shape->setGeometry( geometryHolder.any() );
          break;
        }
        case PxGeometryType::Enum::eCONVEXMESH: {
          PxConvexMeshGeometry &geometry = geometryHolder.convexMesh();
          geometry.scale.scale = PxVec3( scale[0], scale[1], scale[2] );
          shape->setGeometry( geometryHolder.any() );
          break;
        }
        case PxGeometryType::Enum::eTRIANGLEMESH: {
          geometryHolder.triangleMesh().triangleMesh->acquireReference();
          geometryHolder.triangleMesh().scale.scale = PxVec3( scale[0], scale[1], scale[2] );
          shape->setGeometry( geometryHolder.any() );
          geometryHolder.triangleMesh().triangleMesh->release();
          break;
        }
        case PxGeometryType::Enum::eINVALID:
        case PxGeometryType::Enum::eSPHERE:
        case PxGeometryType::Enum::ePLANE:
        case PxGeometryType::Enum::eHEIGHTFIELD:
        case PxGeometryType::Enum::eGEOMETRY_COUNT: {
          break;
        }
      }

    }

  }

  if (writeStream) {
    delete writeStream;
  }
}
void PScene::getGlobalPosition(unsigned int id, float *positions) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body) {
      PxVec3 position = actor->getGlobalPose().p;
      positions[0]  = position[0]; 
      positions[1]  = position[1]; 
      positions[2]  = position[2]; 
    }
  } else {
    std::cerr << "get position unknown actor id " << id << std::endl;
    positions[0] = 0;
    positions[1] = 0;
    positions[2] = 0;
  }
}
void PScene::getLinearVelocity(unsigned int id, float *velocities) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body) {
      PxVec3 linearVelocity = body->getLinearVelocity();
      velocities[0] = linearVelocity.x;
      velocities[1] = linearVelocity.y;
      velocities[2] = linearVelocity.z;
    }
  } else {
    std::cerr << "get linearVelocity unknown actor id " << id << std::endl;
    velocities[0] = 0;
    velocities[1] = 0;
    velocities[2] = 0;
  }
}
void PScene::getAngularVelocity(unsigned int id, float *velocities) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body) {
      PxVec3 angularVelocity = body->getAngularVelocity();
      velocities[0] = angularVelocity.x;
      velocities[1] = angularVelocity.y;
      velocities[2] = angularVelocity.z;
    }
  } else {
    std::cerr << "get angularVelocity unknown actor id " << id << std::endl;
    velocities[0] = 0;
    velocities[1] = 0;
    velocities[2] = 0;
  }
}
void PScene::addForceAtPos(unsigned int id, float *velocity, float *position, bool autoWake) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body) {
      PxRigidBodyExt::addForceAtPos(*body, PxVec3(velocity[0], velocity[1], velocity[2]), 
           PxVec3(position[0], position[1], position[2]), PxForceMode::eIMPULSE, autoWake);
    }
  } else {
    std::cerr << "addForceAtPos unknown actor id " << id << std::endl;
  }
}
void PScene::addForceAtLocalPos(unsigned int id, float *velocity, float *position, bool autoWake) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body) {
      PxRigidBodyExt::addForceAtLocalPos(*body, PxVec3(velocity[0], velocity[1], velocity[2]), 
           PxVec3(position[0], position[1], position[2]), PxForceMode::eIMPULSE, autoWake);
    }
  } else {
    std::cerr << "addForceAtLocalPos unknown actor id " << id << std::endl;
  }
}
void PScene::addLocalForceAtPos(unsigned int id, float *velocity, float *position, bool autoWake) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body) {
      PxRigidBodyExt::addLocalForceAtPos(*body, PxVec3(velocity[0], velocity[1], velocity[2]), 
           PxVec3(position[0], position[1], position[2]), PxForceMode::eIMPULSE, autoWake);
    }
  } else {
    std::cerr << "addLocalForceAtPos unknown actor id " << id << std::endl;
  }
}
void PScene::addLocalForceAtLocalPos(unsigned int id, float *velocity, float *position, bool autoWake) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body) {
      PxRigidBodyExt::addLocalForceAtLocalPos(*body, PxVec3(velocity[0], velocity[1], velocity[2]), 
           PxVec3(position[0], position[1], position[2]), PxForceMode::eIMPULSE, autoWake);
    }
  } else {
    std::cerr << "addLocalForceAtLocalPos unknown actor id " << id << std::endl;
  }
}
void PScene::addForce(unsigned int id, float *velocities, bool autoWake) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body) {
      body->addForce(PxVec3(velocities[0], velocities[1], velocities[2]), PxForceMode::eFORCE, autoWake);
    }
  } else {
    std::cerr << "addForce unknown actor id " << id << std::endl;
  }
}
void PScene::addTorque(unsigned int id, float *velocities, bool autoWake) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body) {
      body->addTorque(PxVec3(velocities[0], velocities[1], velocities[2]), PxForceMode::eFORCE, autoWake);
    }
  } else {
    std::cerr << "addTorque unknown actor id " << id << std::endl;
  }
}
void PScene::setVelocity(unsigned int id, float *velocities, bool autoWake) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body) {
      body->setLinearVelocity(PxVec3(velocities[0], velocities[1], velocities[2]), autoWake);
    }
  } else {
    std::cerr << "set linear velocity unknown actor id " << id << std::endl;
  }
}
void PScene::setAngularVel(unsigned int id, float *velocities, bool autoWake) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body) {
      body->setAngularVelocity(PxVec3(velocities[0], velocities[1], velocities[2]), autoWake);
    }
  } else {
    std::cerr << "set angular velocity unknown actor id " << id << std::endl;
  }
}
void PScene::setLinearLockFlags(unsigned int id, bool x, bool y, bool z) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    PxRigidDynamic *actorDynamic = dynamic_cast<PxRigidDynamic *>(actor);
    if (actorDynamic != nullptr) {
      PxRigidDynamicLockFlags flags = actorDynamic->getRigidDynamicLockFlags();
      flags &= ~PxRigidDynamicLockFlag::eLOCK_LINEAR_X;
      flags &= ~PxRigidDynamicLockFlag::eLOCK_LINEAR_Y;
      flags &= ~PxRigidDynamicLockFlag::eLOCK_LINEAR_Z;
      
      if (!x) {
        flags |= PxRigidDynamicLockFlag::eLOCK_LINEAR_X;
      }
      if (!y) {
        flags |= PxRigidDynamicLockFlag::eLOCK_LINEAR_Y;
      }
      if (!z) {
        flags |= PxRigidDynamicLockFlag::eLOCK_LINEAR_Z;
      }

      actorDynamic->setRigidDynamicLockFlags(flags);
    } else {
      std::cerr << "set linear lock flags non-dynamic actor id " << id << std::endl;
    }
  } else {
    std::cerr << "set linear lock flags unknown actor id " << id << std::endl;
  }
}
void PScene::setAngularLockFlags(unsigned int id, bool x, bool y, bool z) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    PxRigidDynamic *actorDynamic = dynamic_cast<PxRigidDynamic *>(actor);
    if (actorDynamic != nullptr) {
      PxRigidDynamicLockFlags flags = actorDynamic->getRigidDynamicLockFlags();
      flags &= ~PxRigidDynamicLockFlag::eLOCK_ANGULAR_X;
      flags &= ~PxRigidDynamicLockFlag::eLOCK_ANGULAR_Y;
      flags &= ~PxRigidDynamicLockFlag::eLOCK_ANGULAR_Z;

      if (!x) {
        flags |= PxRigidDynamicLockFlag::eLOCK_ANGULAR_X;
      }
      if (!y) {
        flags |= PxRigidDynamicLockFlag::eLOCK_ANGULAR_Y;
      }
      if (!z) {
        flags |= PxRigidDynamicLockFlag::eLOCK_ANGULAR_Z;
      }

      actorDynamic->setRigidDynamicLockFlags(flags);
    } else {
      std::cerr << "set angular lock flags non-dynamic actor id " << id << std::endl;
    }
  } else {
    std::cerr << "set angular lock flags unknown actor id " << id << std::endl;
  }
}
void PScene::setMassAndInertia(unsigned int id, float mass, float *inertia) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    PxRigidBody *body = dynamic_cast<PxRigidBody *>(actor);
    if (body != nullptr) {
      body->setMass(mass);
      body->setMassSpaceInertiaTensor(PxVec3{inertia[0], inertia[1], inertia[2]});
    } else {
      std::cerr << "set mass and inertia non-rigid body actor id " << id << std::endl;
    }
  } else {
    std::cerr << "set mass and inertia unknown actor id " << id << std::endl;
  }
}
void PScene::setGravityEnabled(unsigned int id, bool enabled) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    actor->setActorFlag(PxActorFlag::eDISABLE_GRAVITY, !enabled);
  } else {
    std::cerr << "set gravity enabled unknown actor id " << id << std::endl;
  }
}
void PScene::removeGeometry(unsigned int id) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;

    PxScene *scene = actor->getScene();
    if (scene != nullptr) {
      scene->removeActor(*actor);
    }
    actor->release();
    actors.erase(actorIter);
    simulationEventCallback->stateBitfields.erase(id);
  } else {
    std::cerr << "remove unknown actor id " << id << std::endl;
  }
}
PxController *PScene::createCharacterController(float radius, float height, float contactOffset, float stepOffset, float *position, PxMaterial *material, unsigned int id) {
  PxCapsuleControllerDesc desc{};
  desc.radius = radius;
  desc.height = height;
  desc.upDirection = PxVec3{0, 1, 0};
  desc.contactOffset = contactOffset;
  desc.stepOffset = stepOffset;
  // desc.climbingMode = PxCapsuleClimbingMode::eCONSTRAINED;
  desc.material = material;
  PxController *characterController = controllerManager->createController(desc);
  characterController->setPosition(PxExtendedVec3{position[0], position[1], position[2]});

  PxRigidDynamic *actor = characterController->getActor();
  
  unsigned int numShapes = actor->getNbShapes();
  if (numShapes == 1) {
    PxShape *shapes[1];
    actor->getShapes(shapes, sizeof(shapes)/sizeof(shapes[0]), 0);
    PxShape *shape = shapes[0];
    PxFilterData filterData{};
    filterData.word0 = id; // character id
    filterData.word2 = 2; // signal this is a character capsule; used during filtering
    shape->setSimulationFilterData(filterData); 
  } else {
    std::cerr << "unexpected number of shapes: " << numShapes << std::endl;
  }

  // if (id != 0) {
    actor->userData = (void *)id;
    actors.push_back(actor);
  // }

  /* {
    PxShape *shapes[32];
    for (int j = 0;; j++) {
      memset(shapes, 0, sizeof(shapes));
      if (actor->getShapes(shapes, 32, j * 32) == 0) {
        break;
      }
      for (int i = 0; i < 32; ++i) {
        if (shapes[i] == nullptr) {
          break;
        }

        PxShape *rigidShape = shapes[i];
        rigidShape->setFlag(PxShapeFlag::eSCENE_QUERY_SHAPE, true);
      }
    }
  } */

  return characterController;
}
void PScene::destroyCharacterController(PxController *characterController) {
  PxRigidDynamic *actor = characterController->getActor();
  auto actorIter = std::find(actors.begin(), actors.end(), actor);
  actors.erase(actorIter);

  characterController->release();
}
unsigned int PScene::moveCharacterController(PxController *characterController, float *displacement, float minDist, float elapsedTime, float *positionOut) {
  PxVec3 disp{
    displacement[0],
    displacement[1],
    displacement[2]
  };
  PxFilterData filterData{};
  CharacterControllerFilterCallback cb;

  PxControllerFilters controllerFilters(&filterData, &cb);
  controllerFilters.mFilterFlags |= PxQueryFlag::ePREFILTER;
  PxObstacleContext *obstacles = nullptr;
  PxControllerCollisionFlags collisionFlags = characterController->move(
    disp,
    minDist,
    elapsedTime,
    controllerFilters,
    obstacles
  );

  const PxExtendedVec3 &pos = characterController->getPosition();
  positionOut[0] = pos.x;
  positionOut[1] = pos.y;
  positionOut[2] = pos.z;

  unsigned int flags = 0;
  if (collisionFlags & PxControllerCollisionFlag::eCOLLISION_DOWN) {
    flags |= (1 << 0);
    // characterController->setPosition(characterController->getPosition() + PxVec3(0, -0.01, 0));
  }
  if (collisionFlags & PxControllerCollisionFlag::eCOLLISION_SIDES) {
    flags |= (1 << 1);
    // characterController->setPosition(characterController->getPosition() + PxVec3(0, -0.01, 0));
  }
  if (collisionFlags & PxControllerCollisionFlag::eCOLLISION_UP) {
    flags |= (1 << 2);
    // characterController->setPosition(characterController->getPosition() + PxVec3(0, -0.01, 0));
  }
  return flags;
}
void PScene::setCharacterControllerPosition(PxController *characterController, float *position) {
  characterController->setPosition(PxExtendedVec3{position[0], position[1], position[2]});
}

const float boxPositions[] = {0.5,0.5,0.5,0.5,0.5,-0.5,0.5,-0.5,0.5,0.5,-0.5,-0.5,-0.5,0.5,-0.5,-0.5,0.5,0.5,-0.5,-0.5,-0.5,-0.5,-0.5,0.5,-0.5,0.5,-0.5,0.5,0.5,-0.5,-0.5,0.5,0.5,0.5,0.5,0.5,-0.5,-0.5,0.5,0.5,-0.5,0.5,-0.5,-0.5,-0.5,0.5,-0.5,-0.5,-0.5,0.5,0.5,0.5,0.5,0.5,-0.5,-0.5,0.5,0.5,-0.5,0.5,0.5,0.5,-0.5,-0.5,0.5,-0.5,0.5,-0.5,-0.5,-0.5,-0.5,-0.5};
const unsigned int boxIndices[] = {0,2,1,2,3,1,4,6,5,6,7,5,8,10,9,10,11,9,12,14,13,14,15,13,16,18,17,18,19,17,20,22,21,22,23,21};

bool PScene::getGeometry(unsigned int id, float *positions, unsigned int &numPositions, unsigned int *indices, unsigned int &numIndices, float *bounds) {
  numPositions = 0;
  numIndices = 0;

  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    unsigned int numShapes = actor->getNbShapes();
    if (numShapes == 1) {
      PxShape *shapes[1];
      actor->getShapes(shapes, sizeof(shapes)/sizeof(shapes[0]), 0);
      PxShape *shape = shapes[0];
      PxGeometryHolder geometryHolder = shape->getGeometry();
      PxGeometryType::Enum geometryType = geometryHolder.getType();
      switch (geometryType) {
        case PxGeometryType::Enum::eBOX: {
          // std::cout << "physics type 1.1" << std::endl;

          // const PxBoxGeometry &geometry = geometryHolder.box();
          // const PxVec3 &halfExtents = geometry.halfExtents;

          for (unsigned int i = 0; i < sizeof(boxPositions)/sizeof(boxPositions[0]); i += 3) {
            positions[numPositions++] = boxPositions[i] * 2;
            positions[numPositions++] = boxPositions[i+1] * 2;
            positions[numPositions++] = boxPositions[i+2] * 2;
          }

          memcpy(indices, boxIndices, sizeof(boxIndices));
          numIndices = sizeof(boxIndices)/sizeof(boxIndices[0]);

          {
            PxBoxGeometry &geometry = geometryHolder.box();
            PxTransform actorPose = actor->getGlobalPose();
            PxBounds3 actorBounds = PxGeometryQuery::getWorldBounds(geometry, actorPose, 1.0f);
            bounds[0] = actorBounds.minimum.x;
            bounds[1] = actorBounds.minimum.y;
            bounds[2] = actorBounds.minimum.z;
            bounds[3] = actorBounds.maximum.x;
            bounds[4] = actorBounds.maximum.y;
            bounds[5] = actorBounds.maximum.z;
          }

          return true;
        }
        case PxGeometryType::Enum::eCAPSULE: {
          // std::cout << "physics type 1.2" << std::endl;

          // XXX get the capsule geometry, and fill in the positions and indices
          /* const PxCapsuleGeometry &geometry = geometryHolder.capsule();
          const PxReal radius = geometry.radius;
          const PxReal halfHeight = geometry.halfHeight; */

          {
            PxCapsuleGeometry &geometry = geometryHolder.capsule();
            PxTransform actorPose = actor->getGlobalPose();
            PxBounds3 actorBounds = PxGeometryQuery::getWorldBounds(geometry, actorPose, 1.0f);
            bounds[0] = actorBounds.minimum.x;
            bounds[1] = actorBounds.minimum.y;
            bounds[2] = actorBounds.minimum.z;
            bounds[3] = actorBounds.maximum.x;
            bounds[4] = actorBounds.maximum.y;
            bounds[5] = actorBounds.maximum.z;
          }

          return true;
        }
        // extract the PhysX geometry out of a (PxConvexMesh *) and return it in the positions/index buffer
        case PxGeometryType::Enum::eCONVEXMESH: {
          PxConvexMeshGeometry &geometry = geometryHolder.convexMesh();
          PxConvexMesh *convexMesh = geometry.convexMesh;

          PxU32 nbVerts = convexMesh->getNbVertices();
          const PxVec3* convexVerts = convexMesh->getVertices();
          const PxU8* indexBuffer = convexMesh->getIndexBuffer();

          PxVec3 *vertices = (PxVec3 *)positions;
          unsigned int *triangles = (unsigned int *)indices;

          PxU32 offset = 0;
          PxU32 nbPolygons = convexMesh->getNbPolygons();
          for(PxU32 i=0;i<nbPolygons;i++)
          {
              PxHullPolygon face;
              bool status = convexMesh->getPolygonData(i, face);
              // PX_ASSERT(status);

              const PxU8* faceIndices = indexBuffer + face.mIndexBase;
              for(PxU32 j=0;j<face.mNbVerts;j++)
              {
                  vertices[offset+j] = convexVerts[faceIndices[j]];
                  numPositions += 3;
                  // normals[offset+j] = PxVec3(face.mPlane[0], face.mPlane[1], face.mPlane[2]);
              }

              for(PxU32 j=2;j<face.mNbVerts;j++)
              {
                  *triangles++ = PxU16(offset);
                  *triangles++ = PxU16(offset+j-1);
                  *triangles++ = PxU16(offset+j);
                  numIndices += 3;
              }

              offset += face.mNbVerts;
          }

          {
            PxBounds3 actorBounds = PxGeometryQuery::getWorldBounds(geometry, actor->getGlobalPose(), 1.0f);
            bounds[0] = actorBounds.minimum.x;
            bounds[1] = actorBounds.minimum.y;
            bounds[2] = actorBounds.minimum.z;
            bounds[3] = actorBounds.maximum.x;
            bounds[4] = actorBounds.maximum.y;
            bounds[5] = actorBounds.maximum.z;
          }
          
          return true;
        }
        case PxGeometryType::Enum::eTRIANGLEMESH: {
          // std::cout << "physics type 3" << std::endl;

          PxTriangleMeshGeometry &geometry = geometryHolder.triangleMesh();
          PxTriangleMesh *triangleMesh = geometry.triangleMesh;
          const unsigned int numVertices = triangleMesh->getNbVertices();
          const PxVec3 *vertices = triangleMesh->getVertices();
          const unsigned int nbTris = triangleMesh->getNbTriangles();
          const void *triangles = triangleMesh->getTriangles();
          const PxTriangleMeshFlags &flags = triangleMesh->getTriangleMeshFlags();
          const bool has16BitIndices = flags & PxTriangleMeshFlag::e16_BIT_INDICES ? true : false;

          memcpy(positions, vertices, numVertices * sizeof(vertices[0]));
          numPositions = numVertices * 3;

          if (has16BitIndices) {
            // std::cout << "physics type 3.1" << std::endl;
            unsigned short *triangles16 = (unsigned short *)triangles;
            for (unsigned int i = 0; i < nbTris; i++) {
              indices[numIndices++] = triangles16[i*3+0];
              indices[numIndices++] = triangles16[i*3+1];
              indices[numIndices++] = triangles16[i*3+2];
            }
          } else {
            // std::cout << "physics type 3.2" << std::endl;
            unsigned int *triangles32 = (unsigned int *)triangles;
            for (unsigned int i = 0; i < nbTris; i++) {
              indices[numIndices++] = triangles32[i*3+0];
              indices[numIndices++] = triangles32[i*3+1];
              indices[numIndices++] = triangles32[i*3+2];
            }
          }

          {
            PxTriangleMeshGeometry &geometry = geometryHolder.triangleMesh();
            PxTransform actorPose = actor->getGlobalPose();
            PxBounds3 actorBounds = PxGeometryQuery::getWorldBounds(geometry, actorPose, 1.0f);
            bounds[0] = actorBounds.minimum.x;
            bounds[1] = actorBounds.minimum.y;
            bounds[2] = actorBounds.minimum.z;
            bounds[3] = actorBounds.maximum.x;
            bounds[4] = actorBounds.maximum.y;
            bounds[5] = actorBounds.maximum.z;
          }

          return true;
        }
        default: {
          std::cerr << "unknown geometry type for actor id " << id << " : " << (unsigned int)geometryType << std::endl;
          return false;
        }
      }
    } else {
      std::cerr << "no shapes for actor id " << id << std::endl;
      return false;
    }
  } else {
    std::cerr << "get geometry unknown actor id " << id << std::endl;
    return false;
  }
}

PxBounds3 getActorBounds(PxRigidActor *actor) {
  PxShape *shapes[1];
  actor->getShapes(shapes, sizeof(shapes)/sizeof(shapes[0]), 0);
  PxShape *shape = shapes[0];
  PxGeometryHolder geometryHolder = shape->getGeometry();
  PxGeometryType::Enum geometryType = geometryHolder.getType();
  switch (geometryType) {
    case PxGeometryType::Enum::eBOX: {
      PxBoxGeometry &geometry = geometryHolder.box();
      PxTransform actorPose = actor->getGlobalPose();
      PxBounds3 actorBounds = PxGeometryQuery::getWorldBounds(geometry, actorPose, 1.0f);
      return actorBounds;
    }
    case PxGeometryType::Enum::eCAPSULE: {
      // std::cout << "physics type 1.2" << std::endl;

      // XXX get the capsule geometry, and fill in the positions and indices
      /* const PxCapsuleGeometry &geometry = geometryHolder.capsule();
      const PxReal radius = geometry.radius;
      const PxReal halfHeight = geometry.halfHeight; */

      PxCapsuleGeometry &geometry = geometryHolder.capsule();
      PxTransform actorPose = actor->getGlobalPose();
      PxBounds3 actorBounds = PxGeometryQuery::getWorldBounds(geometry, actorPose, 1.0f);
      return actorBounds;
    }
    case PxGeometryType::Enum::eCONVEXMESH: {
      // std::cout << "physics type 2" << std::endl;

      PxConvexMeshGeometry &geometry = geometryHolder.convexMesh();
      PxTransform actorPose = actor->getGlobalPose();
      PxBounds3 actorBounds = PxGeometryQuery::getWorldBounds(geometry, actorPose, 1.0f);
      return actorBounds;
    }
    case PxGeometryType::Enum::eTRIANGLEMESH: {
      // std::cout << "physics type 3" << std::endl;

      PxTriangleMeshGeometry &geometry = geometryHolder.triangleMesh();
      PxTransform actorPose = actor->getGlobalPose();
      PxBounds3 actorBounds = PxGeometryQuery::getWorldBounds(geometry, actorPose, 1.0f);
      return actorBounds;
    }
    case PxGeometryType::Enum::eINVALID:
    case PxGeometryType::Enum::eSPHERE:
    case PxGeometryType::Enum::ePLANE:
    case PxGeometryType::Enum::eHEIGHTFIELD:
    case PxGeometryType::Enum::eGEOMETRY_COUNT:
    {
      break;
    }
  }
  return PxBounds3();
}

bool PScene::getBounds(unsigned int id, float *bounds) {
  auto actorIter = std::find_if(actors.begin(), actors.end(), [&](PxRigidActor *actor) -> bool {
    return (unsigned int)actor->userData == id;
  });
  if (actorIter != actors.end()) {
    PxRigidActor *actor = *actorIter;
    unsigned int numShapes = actor->getNbShapes();
    if (numShapes == 1) {
      PxBounds3 actorBounds = getActorBounds(actor);

      bounds[0] = actorBounds.minimum.x;
      bounds[1] = actorBounds.minimum.y;
      bounds[2] = actorBounds.minimum.z;
      bounds[3] = actorBounds.maximum.x;
      bounds[4] = actorBounds.maximum.y;
      bounds[5] = actorBounds.maximum.z;

      return true;
    } else {
      std::cerr << "get bounds no shapes for actor id " << id << std::endl;
      return false;
    }
  } else {
    std::cerr << "get bounds get geometry unknown actor id " << id << std::endl;
    return false;
  }
}

/* std::shared_ptr<PhysicsObject> doMakeGeometry(Physicer *physicer, PxGeometry *geometry, unsigned int objectId, float *meshPosition, float *meshQuaternion) {
  Vec p(meshPosition[0], meshPosition[1], meshPosition[2]);
  Quat q(meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]);
  std::shared_ptr<PhysicsGeometry> geometrySpec(new PhysicsGeometry(nullptr, nullptr, geometry));
  std::shared_ptr<PhysicsObject> geometryObject(new PhysicsObject(objectId, p, q, std::move(geometrySpec), p, q, physicer));
  return std::move(geometryObject);
} */

void PScene::raycast(
  float *origin,
  float *direction,
  float maxDist,
  unsigned int &hit,
  float *position,
  float *normal,
  float &distance,
  unsigned int &objectId,
  unsigned int &faceIndex
) {
  PxVec3 originVec{origin[0], origin[1], origin[2]};
  PxVec3 directionVec{direction[0], direction[1], direction[2]};
  Ray ray(Vec{origin[0], origin[1], origin[2]}, Vec{direction[0], direction[1], direction[2]});

  // PxRaycastHit hitInfo;
  // constexpr float maxDist = 1000.0;
  const PxHitFlags hitFlags = PxHitFlag::eDEFAULT;
  constexpr PxU32 maxHits = 1;

  PxRaycastBuffer hitBuffer;
  bool status = this->scene->raycast(originVec, directionVec, maxDist, hitBuffer);
  if (status) {
    unsigned int numHits = hitBuffer.getNbAnyHits();
    for (unsigned int i = 0; i < numHits; i++) {
      const PxRaycastHit &hitInfo = hitBuffer.getAnyHit(i);
      PxRigidActor *actor = hitInfo.actor;

      hit = 1;
      position[0] = hitInfo.position.x;
      position[1] = hitInfo.position.y;
      position[2] = hitInfo.position.z;
      normal[0] = hitInfo.normal.x;
      normal[1] = hitInfo.normal.y;
      normal[2] = hitInfo.normal.z;
      distance = hitInfo.distance;
      objectId = actor != nullptr ? (unsigned int)actor->userData : 0;
      faceIndex = hitInfo.faceIndex;
    }
  } else {
    hit = 0;
  }
}

constexpr size_t hitBufferSize = 256;
void PScene::sweepBox(
  float *origin,
  float *quaternion,
  float *halfExtents,
  float *direction,
  float sweepDistance,
  unsigned int maxHits,
  unsigned int &numHits,
  float *position,
  float *normal,
  float *distance,
  unsigned int *objectId,
  unsigned int *faceIndex
) {
  numHits = 0;

  PxSweepBufferN<hitBufferSize> hitBuffer;              // [out] Sweep results
  PxBoxGeometry sweepShape(halfExtents[0], halfExtents[1], halfExtents[2]); // [in] swept shape
  PxTransform initialPose(
    PxVec3{origin[0], origin[1], origin[2]},
    PxQuat{quaternion[0], quaternion[1], quaternion[2], quaternion[3]}
  );
  PxVec3 sweepDirection{direction[0], direction[1], direction[2]}; // [in] normalized sweep direction
  PxHitFlags hitFlags; // = PxHitFlag::ePOSITION|PxHitFlag::eNORMAL;
  PxQueryFilterData filterData; // (PxQueryFlag::eSTATIC);
  bool status = scene->sweep(sweepShape, initialPose, sweepDirection, sweepDistance, hitBuffer, hitFlags, filterData);
  if (status) {
    numHits = std::min(hitBuffer.getNbAnyHits(), maxHits);
    for (unsigned int i = 0; i < numHits; i++) {
      const PxSweepHit &hitInfo = hitBuffer.getAnyHit(i);
      PxRigidActor *actor = hitInfo.actor;

      position[i*3 + 0] = hitInfo.position.x;
      position[i*3 + 1] = hitInfo.position.y;
      position[i*3 + 2] = hitInfo.position.z;
      normal[i*3 + 0] = hitInfo.normal.x;
      normal[i*3 + 1] = hitInfo.normal.y;
      normal[i*3 + 2] = hitInfo.normal.z;
      distance[i] = hitInfo.distance;
      objectId[i] = actor != nullptr ? (unsigned int)actor->userData : 0;
      faceIndex[i] = hitInfo.faceIndex;
    }
  }
}

void PScene::sweepConvexShape(
  PxConvexMesh *convexMesh,
  float *origin,
  float *quaternion,
  float *direction,
  float sweepDistance,
  unsigned int maxHits,
  unsigned int &numHits,
  float *position,
  float *normal,
  float *distance,
  unsigned int *objectId,
  unsigned int *faceIndex
) {
  numHits = 0;

  PxSweepBufferN<hitBufferSize> hitBuffer;              // [out] Sweep results
  PxMeshScale scaleObject;
  PxConvexMeshGeometry sweepShape(convexMesh, scaleObject); // [in] swept shape
  PxTransform initialPose(
    PxVec3{origin[0], origin[1], origin[2]},
    PxQuat{quaternion[0], quaternion[1], quaternion[2], quaternion[3]}
  );
  PxVec3 sweepDirection{direction[0], direction[1], direction[2]}; // [in] normalized sweep direction
  PxHitFlags hitFlags; // = PxHitFlag::ePOSITION|PxHitFlag::eNORMAL;
  PxQueryFilterData filterData; // (PxQueryFlag::eSTATIC);
  // filterData.flags |= PxQueryFlag::eNO_BLOCK;
  bool status = scene->sweep(sweepShape, initialPose, sweepDirection, sweepDistance, hitBuffer, hitFlags, filterData);
  if (status) {
    numHits = std::min(hitBuffer.getNbAnyHits(), maxHits);
    for (unsigned int i = 0; i < numHits; i++) {
      const PxSweepHit &hitInfo = hitBuffer.getAnyHit(i);
      PxRigidActor *actor = hitInfo.actor;

      position[i*3 + 0] = hitInfo.position.x;
      position[i*3 + 1] = hitInfo.position.y;
      position[i*3 + 2] = hitInfo.position.z;
      normal[i*3 + 0] = hitInfo.normal.x;
      normal[i*3 + 1] = hitInfo.normal.y;
      normal[i*3 + 2] = hitInfo.normal.z;
      distance[i] = hitInfo.distance;
      objectId[i] = actor != nullptr ? (unsigned int)actor->userData : 0;
      faceIndex[i] = hitInfo.faceIndex;
    }
  }
}

float *PScene::getPath(float *_start, float *_dest, bool _isWalk, float _hy, float _heightTolerance, unsigned int _maxIterdetect, unsigned int _maxIterStep, unsigned int _numIgnorePhysicsIds, unsigned int *_ignorePhysicsIds) {
  
  PathFinder pathFinder(actors, _hy, _heightTolerance, _maxIterdetect, _maxIterStep, _numIgnorePhysicsIds, _ignorePhysicsIds);
  Vec start(_start[0], _start[1], _start[2]);
  Vec dest(_dest[0], _dest[1], _dest[2]);
  std::vector<Voxel *> waypointResult = pathFinder.getPath(start, dest, _isWalk);

  float *outputBuffer = (float *)malloc((
    1 + waypointResult.size() * 3
  ) * sizeof(float));

  outputBuffer[0] = waypointResult.size();
  for (int i = 0; i < waypointResult.size(); i++) {
    outputBuffer[i*3+1] = waypointResult[i]->position.x;
    outputBuffer[i*3+2] = waypointResult[i]->position.y;
    outputBuffer[i*3+3] = waypointResult[i]->position.z;
  }

  return outputBuffer;
}

float *PScene::overlap(PxGeometry *geom, float *position, float *quaternion) {
  PxTransform geomPose(
    PxVec3{position[0], position[1], position[2]},
    PxQuat{quaternion[0], quaternion[1], quaternion[2], quaternion[3]}
  );
  /* PxTransform meshPose{
    PxVec3{meshPosition[0], meshPosition[1], meshPosition[2]},
    PxQuat{meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]}
  };

  Vec p(meshPosition[0], meshPosition[1], meshPosition[2]);
  Quat q(meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]); */
  
  OverlapCallback hitCallback;
  bool overlapped = scene->overlap(
    *geom,
    geomPose,
    hitCallback
  );
  std::vector<float> outIds;
  if (overlapped) {
    for (size_t i = 0; i < hitCallback.hits.size(); i++) {
      auto &localHit = hitCallback.hits[i];
      PxRigidActor *actor = localHit.actor;
      PxShape *shape = localHit.shape;

      // if (shape->getFlags().isSet(PxShapeFlag::eSCENE_QUERY_SHAPE)) {
        PxGeometryHolder holder = shape->getGeometry();
        PxGeometry &geometry = holder.any();

        PxTransform meshPose = actor->getGlobalPose();
        // PxTransform meshPose3 = meshPose * meshPose2;

        PxVec3 directionVec;
        PxReal depthFloat;
        bool result = PxGeometryQuery::overlap(*geom, geomPose, geometry, meshPose);
        if (result) {
          const unsigned int id = (unsigned int)actor->userData;
          outIds.push_back(id);
        }
      // }
    }
  }

  float *outputBuffer = (float *)malloc((
    1 + // numOutIds
    outIds.size()
  ) * sizeof(float));

  outputBuffer[0] = outIds.size();
  if (outIds.size() > 0) {
    memcpy(outputBuffer+1, &outIds[0], outIds.size()*sizeof(float));
  }

  return outputBuffer;
}

float *PScene::overlapBox(float hx, float hy, float hz, float *position, float *quaternion) {
  PxBoxGeometry geom(hx, hy, hz);
  return PScene::overlap(&geom, position, quaternion);
}

float *PScene::overlapCapsule(float radius, float halfHeight, float *position, float *quaternion) {
  PxCapsuleGeometry geom(radius, halfHeight);
  return PScene::overlap(&geom, position, quaternion);
}

void PScene::collide(PxGeometry *geom, float *position, float *quaternion, unsigned int maxIter, unsigned int &hit, float *direction, unsigned int &grounded, unsigned int &id) {
  PxTransform geomPose(
    PxVec3{position[0], position[1], position[2]},
    PxQuat{quaternion[0], quaternion[1], quaternion[2], quaternion[3]}
  );
  /* PxTransform meshPose{
    PxVec3{meshPosition[0], meshPosition[1], meshPosition[2]},
    PxQuat{meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]}
  };

  Vec p(meshPosition[0], meshPosition[1], meshPosition[2]);
  Quat q(meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]); */

  Vec offset(0, 0, 0);
  bool anyHadHit = false;
  bool anyHadGrounded = false;
  unsigned int localId = 0;
  {
    for (unsigned int i = 0; i < maxIter; i++) {
      bool hadHit = false;

      OverlapCallback hitCallback;
      bool overlapped = scene->overlap(
        *geom,
        geomPose,
        hitCallback
      );

      PxVec3 largestDirectionVec;
      unsigned int largestId = 0;
      for (size_t i = 0; i < hitCallback.hits.size(); i++) {
        auto &localHit = hitCallback.hits[i];
        PxRigidActor *actor = localHit.actor;
        PxShape *shape = localHit.shape;
        // actor->getShapes(&shape, 1);

        // if (shape->getFlags().isSet(PxShapeFlag::eSCENE_QUERY_SHAPE)) {
          PxGeometryHolder holder = shape->getGeometry();
          PxGeometry &geometry = holder.any();

          PxTransform meshPose = actor->getGlobalPose();
          // PxTransform meshPose3 = meshPose * meshPose2;

          PxVec3 directionVec;
          PxReal depthFloat;
          bool result = PxGeometryQuery::computePenetration(
            directionVec,
            depthFloat,
            *geom,
            geomPose,
            geometry,
            meshPose
          );
          if (result) {
            // std::cout << "collide shape " << (unsigned int)actor->userData << " " << (uint32_t)shape << " " << shape->getFlags().isSet(PxShapeFlag::eSCENE_QUERY_SHAPE) << std::endl; // XXX
            
            anyHadHit = true;
            hadHit = true;
            anyHadGrounded = anyHadGrounded || directionVec.y > 0;

            directionVec *= depthFloat;
            if (largestId == 0 || directionVec.magnitudeSquared() > largestDirectionVec.magnitudeSquared()) {
              largestDirectionVec = directionVec;
              largestId = (unsigned int)actor->userData;
            }
          }
        // }
      }
      if (hadHit) {
        offset += Vec(largestDirectionVec.x, largestDirectionVec.y, largestDirectionVec.z);
        geomPose.p += largestDirectionVec;
        localId = largestId;
        
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
    id = localId;
  } else {
    hit = 0;
  }
}

void PScene::collideBox(float hx, float hy, float hz, float *position, float *quaternion, unsigned int maxIter, unsigned int &hit, float *direction, unsigned int &grounded, unsigned int &id) {
  PxBoxGeometry geom(hx, hy, hz);
  PScene::collide(&geom, position, quaternion, maxIter, hit, direction, grounded, id);
}

void PScene::collideCapsule(float radius, float halfHeight, float *position, float *quaternion, unsigned int maxIter, unsigned int &hit, float *direction, unsigned int &grounded, unsigned int &id) {
  PxCapsuleGeometry geom(radius, halfHeight);
  PScene::collide(&geom, position, quaternion, maxIter, hit, direction, grounded, id);
}

void PScene::getCollisionObject(float radius, float halfHeight, float *position, float *quaternion, float *direction, unsigned int &hit, unsigned int &id) {
  hit = 0;
  
  PxCapsuleGeometry geom(radius, halfHeight);
  PxTransform geomPose(
    PxVec3{position[0], position[1], position[2]},
    PxQuat{quaternion[0], quaternion[1], quaternion[2], quaternion[3]}
  );
  /* PxTransform meshPose{
    PxVec3{meshPosition[0], meshPosition[1], meshPosition[2]},
    PxQuat{meshQuaternion[0], meshQuaternion[1], meshQuaternion[2], meshQuaternion[3]}
  }; */

  OverlapCallback hitCallback;
  bool overlapped = scene->overlap(
    geom,
    geomPose,
    hitCallback
    /* PxOverlapCallback &hitCall,
    const PxQueryFilterData &filterData=PxQueryFilterData(),
    PxQueryFilterCallback *filterCall=NULL */
  );
  if (overlapped && hitCallback.hits.size() > 0) {
    std::vector<PenetrationDepth> penetrationDepths;

    for (size_t i = 0; i < hitCallback.hits.size(); i++) {
      auto &localHit = hitCallback.hits[i];
      PxRigidActor *actor = localHit.actor;
      PxShape *shape = localHit.shape;
      PxU32 &faceIndex = localHit.faceIndex;

      PxGeometryHolder holder = shape->getGeometry();
      PxGeometry &geometry = holder.any();

      PxTransform geometryPose = actor->getGlobalPose();

      PxVec3 directionVec;
      PxReal depthFloat;
      bool result = PxGeometryQuery::computePenetration(
        directionVec,
        depthFloat,
        geom,
        geomPose,
        geometry,
        geometryPose
      );
      if (result) {
        PenetrationDepth penetrationDepth{
          actor,
          directionVec,
          depthFloat
        };
        penetrationDepths.push_back(penetrationDepth);
      } /* else {
        std::cout << "was not actually penetrated..." << std::endl;
        abort();
      } */
      /* if (hit.shape->getFlags().isSet(PxShapeFlag::eSCENE_QUERY_SHAPE)) {
        id = (unsigned int)hit.actor->userData;
        hit = 1;
        return;
      } */
    }

    if (penetrationDepths.size() > 0) {
      // sort by highest penetration depth first
      std::sort(penetrationDepths.begin(), penetrationDepths.end(), [](const PenetrationDepth &a, const PenetrationDepth &b) {
        return a.depth > b.depth;
      });

      // get the first penetration depth
      PenetrationDepth &penetrationDepth = penetrationDepths[0];
    
      // set output
      direction[0] = penetrationDepth.direction.x * penetrationDepth.depth;
      direction[1] = penetrationDepth.direction.y * penetrationDepth.depth;
      direction[2] = penetrationDepth.direction.z * penetrationDepth.depth;
      id = (unsigned int)penetrationDepth.actor->userData;
      hit = 1;
    }
  }

  /* PxVec3 smallestSizeVec;
  unsigned int largestId = 0;
  for (unsigned int i = 0; i < actors.size(); i++) {
    PxRigidActor *actor = actors[i];
    PxShape *shape;
    unsigned int numShapes = actor->getShapes(&shape, 1);

    if (numShapes > 0 && shape->getFlags().isSet(PxShapeFlag::eSCENE_QUERY_SHAPE)) {
      PxGeometryHolder holder = shape->getGeometry();
      PxGeometry &geometry = holder.any();

      PxTransform meshPose2 = actor->getGlobalPose();
      PxTransform meshPose3 = meshPose * meshPose2;

      bool result = PxGeometryQuery::overlap(geom, geomPose, geometry, meshPose3);
      if (result) {
        hit = 1;

        const PxBounds3 &bounds = getActorBounds(actor);
        PxVec3 sizeVec{
          bounds.maximum.x - bounds.minimum.x,
          bounds.maximum.y - bounds.minimum.y,
          bounds.maximum.z - bounds.minimum.z
        };
        if (largestId == 0 || sizeVec.magnitudeSquared() < smallestSizeVec.magnitudeSquared()) {
          smallestSizeVec = sizeVec;
          id = (unsigned int)actor->userData;
        }
      }
    }
  } */
}