#ifndef _PHYSICS_H
#define _PHYSICS_H

#include "physics-base.h"
#include "vector.h"
#include "march.h"
#include "physx.h"
#include <list>
#include <map>
#include <set>
#include <deque>
#include <algorithm>
#include <iostream>
#include "PathFinder.h"

using namespace physx;

enum TYPE {
  TYPE_NONE = 0,
  TYPE_CAPSULE = 1,
};
enum STATE_BITFIELD {
  STATE_BITFIELD_NONE = 0x0,
  STATE_BITFIELD_COLLIDED = 0x1,
  STATE_BITFIELD_GROUNDED = 0x2,
};

struct TriggerEventInfo {
  unsigned int status;
  unsigned int triggerActorId;
  unsigned int otherActorId;
};

class SimulationEventCallback2 : public PxSimulationEventCallback {
public:
  std::map<unsigned int, unsigned int> stateBitfields;
  unsigned int triggerCount = 0;
  std::vector<TriggerEventInfo> triggerEventInfos;

  SimulationEventCallback2();
  virtual ~SimulationEventCallback2();
  virtual void onConstraintBreak(PxConstraintInfo *constraints, PxU32 count);
  virtual void onWake(PxActor **actors, PxU32 count);
  virtual void onSleep(PxActor **actors, PxU32 count);
  virtual void onContact(const PxContactPairHeader& pairHeader, const PxContactPair* pairs, PxU32 nbPairs);
  virtual void onTrigger(PxTriggerPair *pairs, PxU32 count);
  virtual void onAdvance(const PxRigidBody *const *bodyBuffer, const PxTransform *poseBuffer, const PxU32 count);
};

class CharacterControllerFilterCallback : public PxQueryFilterCallback {
public:
  CharacterControllerFilterCallback();
  virtual ~CharacterControllerFilterCallback();
  virtual PxQueryHitType::Enum preFilter(const PxFilterData &filterData, const PxShape *shape, const PxRigidActor *actor, PxHitFlags &queryFlags);
  virtual PxQueryHitType::Enum postFilter(const PxFilterData &filterData, const PxQueryHit &hit);
};

class PScene {
public:
  PScene();
  ~PScene();

  PxD6Joint *addJoint(unsigned int id1, unsigned int id2, float *position1, float *position2, float *quaternion1, float *quaternion2);
  void setJointMotion(PxD6Joint *joint, PxD6Axis::Enum axis, PxD6Motion::Enum motion);
  void setJointTwistLimit(PxD6Joint *joint, float lowerLimit, float upperLimit, float contactDist = -1.0f);
  void setJointSwingLimit(PxD6Joint *joint, float yLimitAngle, float zLimitAngle, float contactDist = -1.0f);
  bool updateMassAndInertia(unsigned int id, float shapeDensities);
  float getBodyMass(unsigned int id);
  unsigned int simulate(unsigned int *ids, float *positions, float *quaternions, float *scales, unsigned int *bitfields, unsigned int numIds, float elapsedTime, float *velocities);
  float setTrigger(unsigned int id);
  unsigned int getTriggerEvents(unsigned int *scratchStack);
  void raycast(float *origin, float *direction, float maxDist, unsigned int &hit, float *position, float *normal, float &distance, unsigned int &objectId, unsigned int &faceIndex);
  void sweepBox(
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
  );
  void sweepConvexShape(
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
  );
  float *getPath(float *_start, float *_dest, bool _isWalk, float _hy, float _heightTolerance, unsigned int _maxIterdetect, unsigned int _maxIterStep, unsigned int _numIgnorePhysicsIds, unsigned int *_ignorePhysicsIds);
  float *overlap(PxGeometry *geom, float *position, float *quaternion);
  float *overlapBox(float hx, float hy, float hz, float *position, float *quaternion);
  float *overlapCapsule(float radius, float halfHeight, float *position, float *quaternion);
  void collide(PxGeometry *geom, float *position, float *quaternion, unsigned int maxIter, unsigned int &hit, float *direction, unsigned int &grounded, unsigned int &id);
  void collideBox(float hx, float hy, float hz, float *position, float *quaternion, unsigned int maxIter, unsigned int &hit, float *direction, unsigned int &grounded, unsigned int &id);
  void collideCapsule(float radius, float halfHeight, float *position, float *quaternion, unsigned int maxIter, unsigned int &hit, float *direction, unsigned int &grounded, unsigned int &id);
  void getCollisionObject(float radius, float halfHeight, float *position, float *quaternion, float *direction, unsigned int &hit, unsigned int &id);
  
  void addCapsuleGeometry(float *position, float *quaternion, float radius, float halfHeight, unsigned int id, PxMaterial *material, unsigned int dynamic, unsigned int flags);
  void addPlaneGeometry(float *position, float *quaternion, unsigned int id, PxMaterial *material, unsigned int dynamic);
  void addBoxGeometry(float *position, float *quaternion, float *size, unsigned int id, PxMaterial *material, unsigned int dynamic, int groupId);
  
  PxTriangleMesh *createShape(uint8_t *data, unsigned int length, PxDefaultMemoryOutputStream *releaseWriteStream);
  void destroyShape(PxTriangleMesh *triangleMesh);

  PxConvexMesh *createConvexShape(uint8_t *data, unsigned int length, PxDefaultMemoryOutputStream *releaseWriteStream);
  void destroyConvexShape(PxConvexMesh *convexMesh);
  
  PxHeightField *createHeightField(uint8_t *data, unsigned int length, PxDefaultMemoryOutputStream *releaseWriteStream);

  PxMaterial *createMaterial(float *mat);
  void destroyMaterial(PxMaterial *material);

  void addGeometry(PxTriangleMesh *triangleMesh, float *position, float *quaternion, float *scale, unsigned int id, PxMaterial *material, unsigned int external, PxTriangleMesh *releaseTriangleMesh);
  void addConvexGeometry(PxConvexMesh *convexMesh, float *position, float *quaternion, float *scale, unsigned int id, PxMaterial *material, unsigned int dynamic, unsigned int external, PxConvexMesh *releaseConvexMesh);
  void addHeightFieldGeometry(
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
  );
  
  void setMassAndInertia(unsigned int id, float mass, float *inertia);
  void setGravityEnabled(unsigned int id, bool enabled);
  void removeGeometry(unsigned int id);
  bool getGeometry(unsigned int id, float *positions, unsigned int &numPositions, unsigned int *indices, unsigned int &numIndices, float *bounds);
  bool getBounds(unsigned int id, float *bounds);
  void enableActor(unsigned int id);
  void disableActor(unsigned int id);
  void disableGeometry(unsigned int id);
  void enableGeometry(unsigned int id);
  void disableGeometryQueries(unsigned int id);
  void enableGeometryQueries(unsigned int id);
  void setTransform(unsigned int id, float *position, float *quaternion, float *scale, bool autoWake);
  void setGeometryScale(unsigned int id, float *scale, PxDefaultMemoryOutputStream *writeStream);
  void getGlobalPosition(unsigned int id, float *position);
  void getLinearVelocity(unsigned int id, float *velocity);
  void getAngularVelocity(unsigned int id, float *velocity);
  void addForceAtPos(unsigned int id, float *velocity, float *position, bool autoWake);
  void addForceAtLocalPos(unsigned int id, float *velocity, float *position, bool autoWake);
  void addLocalForceAtLocalPos(unsigned int id, float *velocity, float *position, bool autoWake);
  void addLocalForceAtPos(unsigned int id, float *velocity, float *position, bool autoWake);
  void addForce(unsigned int id, float *velocity, bool autoWake);
  void addTorque(unsigned int id, float *velocity, bool autoWake);
  void setVelocity(unsigned int id, float *velocity, bool autoWake);
  void setAngularVel(unsigned int id, float *velocity, bool autoWake);
  void setLinearLockFlags(unsigned int id, bool x, bool y, bool z);
  void setAngularLockFlags(unsigned int id, bool x, bool y, bool z);
  PxController *createCharacterController(float radius, float height, float contactOffset, float stepOffset, float *position, PxMaterial *material, unsigned int id);
  void destroyCharacterController(PxController *characterController);
  unsigned int moveCharacterController(PxController *characterController, float *displacement, float minDist, float elapsedTime, float *positionOut);
  void setCharacterControllerPosition(PxController *characterController, float *position);

  PxPhysics *physics = nullptr;
  PxScene *scene = nullptr;
  PxControllerManager *controllerManager = nullptr;
  std::vector<PxRigidActor *> actors;
  SimulationEventCallback2 *simulationEventCallback = nullptr;
};

#endif