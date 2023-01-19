#include <emscripten.h>
// #include "geometry.h"
// #include "compose.h"
// #include "noise.h"
#include "march.h"
#include "occlusionCull/occlusionCull.h"
// #include "DualContouring/main.h"
#include "AnimationSystem/AnimationSystem.h"
// #include "collide.h"
#include "physics.h"
// #include "convex.h"
// #include "earcut.h"
// #include <iostream>
#include "cut.h"
#include <deque>
#include <map>

extern "C" {

// memory

EMSCRIPTEN_KEEPALIVE void *doMalloc(size_t size) {
  return malloc(size);
}

EMSCRIPTEN_KEEPALIVE void doFree(void *ptr) {
  free(ptr);
}

//

EMSCRIPTEN_KEEPALIVE void initialize() {
  physicsBase = new PBase();
}

//

EMSCRIPTEN_KEEPALIVE PScene *makePhysics() {
  return new PScene();
}

//

EMSCRIPTEN_KEEPALIVE PxD6Joint *addJointPhysics(PScene *scene, unsigned int id1, unsigned int id2, float *position1, float *position2, float *quaternion1, float *quaternion2) {
  return scene->addJoint(id1, id2, position1, position2, quaternion1, quaternion2);
}
EMSCRIPTEN_KEEPALIVE void setJointMotionPhysics(PScene *scene, PxD6Joint *joint, PxD6Axis::Enum axis, PxD6Motion::Enum motion) {
  return scene->setJointMotion(joint, axis, motion);
}
EMSCRIPTEN_KEEPALIVE void setJointTwistLimitPhysics(PScene *scene, PxD6Joint *joint, float lowerLimit, float upperLimit, float contactDist = -1.0f) {
  return scene->setJointTwistLimit(joint, lowerLimit, upperLimit, contactDist);
}
EMSCRIPTEN_KEEPALIVE void setJointSwingLimitPhysics(PScene *scene, PxD6Joint *joint, float yLimitAngle, float zLimitAngle, float contactDist = -1.0f) {
  return scene->setJointSwingLimit(joint, yLimitAngle, zLimitAngle, contactDist);
}
EMSCRIPTEN_KEEPALIVE bool updateMassAndInertiaPhysics(PScene *scene, unsigned int id, float shapeDensities) {
  return scene->updateMassAndInertia(id, shapeDensities);
}
EMSCRIPTEN_KEEPALIVE float getBodyMassPhysics(PScene *scene, unsigned int id) {
  return scene->getBodyMass(id);
}

// AnimationSystem

EMSCRIPTEN_KEEPALIVE AnimationSystem::Avatar *createAnimationAvatar(AnimationSystem::AnimationMixer *mixer) {
  return AnimationSystem::createAnimationAvatar(mixer);
}
EMSCRIPTEN_KEEPALIVE void updateInterpolationAnimationAvatar(AnimationSystem::Avatar *avatar, float timeDiff) {
  return avatar->updateInterpolation(timeDiff);
}
EMSCRIPTEN_KEEPALIVE void updateAnimationAvatar(AnimationSystem::Avatar *avatar, float *scratchStack) {
  return avatar->update(scratchStack);
}
EMSCRIPTEN_KEEPALIVE void addActionAnimationAvatar(AnimationSystem::Avatar *avatar, char *scratchStack, unsigned int stringByteLength) {
  return avatar->addAction(scratchStack, stringByteLength);
}
EMSCRIPTEN_KEEPALIVE void removeActionAnimationAvatar(AnimationSystem::Avatar *avatar, char *scratchStack, unsigned int stringByteLength) {
  return avatar->removeAction(scratchStack, stringByteLength);
}
EMSCRIPTEN_KEEPALIVE float getActionInterpolantAnimationAvatar(AnimationSystem::Avatar *avatar, char *scratchStack, unsigned int stringByteLength, unsigned int type) {
  return avatar->getActionInterpolant(scratchStack, stringByteLength, type);
}
EMSCRIPTEN_KEEPALIVE AnimationSystem::AnimationMixer *createAnimationMixer() {
  return AnimationSystem::createAnimationMixer();
}
EMSCRIPTEN_KEEPALIVE float *updateAnimationMixer(AnimationSystem::AnimationMixer *mixer, float now, float nowS) {
  return mixer->update(now, nowS);
}
EMSCRIPTEN_KEEPALIVE void createAnimationMapping(bool isPosition, unsigned int index, bool isTop, bool isArm, char *scratchStack, unsigned int nameByteLength) {
  return AnimationSystem::createAnimationMapping(isPosition, index, isTop, isArm, scratchStack, nameByteLength);
}
EMSCRIPTEN_KEEPALIVE AnimationSystem::Animation *createAnimation(char *scratchStack, unsigned int nameByteLength, float duration) {
  return AnimationSystem::createAnimation(scratchStack, nameByteLength, duration);
}
EMSCRIPTEN_KEEPALIVE unsigned int initAnimationSystem(char *scratchStack) {
  return AnimationSystem::initAnimationSystem(scratchStack);
}
EMSCRIPTEN_KEEPALIVE void createAnimationInterpolant(AnimationSystem::Animation *animation, unsigned int numParameterPositions, float *parameterPositions, unsigned int numSampleValues, float *sampleValues, unsigned int valueSize) {
  return AnimationSystem::createAnimationInterpolant(animation, numParameterPositions, parameterPositions, numSampleValues, sampleValues, valueSize);
}

// End AnimationSystem

EMSCRIPTEN_KEEPALIVE unsigned int simulatePhysics(PScene *scene, unsigned int *ids, float *positions, float *quaternions, float *scales, unsigned int *bitfields, unsigned int numIds, float elapsedTime, float *velocities) {
  return scene->simulate(ids, positions, quaternions, scales, bitfields, numIds, elapsedTime, velocities);
}
EMSCRIPTEN_KEEPALIVE float setTriggerPhysics(PScene *scene, unsigned int id) {
  return scene->setTrigger(id);
}
EMSCRIPTEN_KEEPALIVE unsigned int getTriggerEventsPhysics(PScene *scene, unsigned int *scratchStack) {
  return scene->getTriggerEvents(scratchStack);
}

EMSCRIPTEN_KEEPALIVE void raycastPhysics(PScene *scene, float *origin, float *direction, float maxDist, unsigned int *hit, float *position, float *normal, float *distance, unsigned int *objectId, unsigned int *faceIndex) {
  scene->raycast(origin, direction, maxDist, *hit, position, normal, *distance, *objectId, *faceIndex);
}

EMSCRIPTEN_KEEPALIVE void raycastPhysicsArray(unsigned int rayCount, PScene *scene, float *origin, float *direction, float maxDist, unsigned int *hit, float *position, float *normal, float *distance, unsigned int *objectId, unsigned int *faceIndex) {
  for (unsigned int i = 0; i < rayCount; i++) {
    scene->raycast(origin, direction, maxDist, *hit, position, normal, *distance, *objectId, *faceIndex);

    origin += 3;
    direction += 3;
    hit += 1;
    position += 3;
    normal += 3;
    distance += 1;
    objectId += 1;
    faceIndex += 1;
  }
}

EMSCRIPTEN_KEEPALIVE void sweepBox(
  PScene *scene,
  float *origin,
  float *quaternion,
  float *halfExtents,
  float *direction,
  float sweepDistance,
  unsigned int maxHits,
  unsigned int *numHits,
  float *position,
  float *normal,
  float *distance,
  unsigned int *objectId,
  unsigned int *faceIndex
) {
  scene->sweepBox(
    origin,
    quaternion,
    halfExtents,
    direction,
    sweepDistance,
    maxHits,
    *numHits,
    position,
    normal,
    distance,
    objectId,
    faceIndex
  );
}
EMSCRIPTEN_KEEPALIVE void sweepConvexShape(
  PScene *scene,
  PxConvexMesh *convexMesh,
  float *origin,
  float *quaternion,
  float *direction,
  float sweepDistance,
  unsigned int maxHits,
  unsigned int *numHits,
  float *position,
  float *normal,
  float *distance,
  unsigned int *objectId,
  unsigned int *faceIndex
) {
  scene->sweepConvexShape(
    convexMesh,
    origin,
    quaternion,
    direction,
    sweepDistance,
    maxHits,
    *numHits,
    position,
    normal,
    distance,
    objectId,
    faceIndex
  );
}
EMSCRIPTEN_KEEPALIVE float *getPathPhysics(PScene *scene, float *_start, float *_dest, bool _isWalk, float _hy, float _heightTolerance, unsigned int _maxIterdetect, unsigned int _maxIterStep, unsigned int _numIgnorePhysicsIds, unsigned int *_ignorePhysicsIds) {
  return scene->getPath(_start, _dest, _isWalk, _hy, _heightTolerance, _maxIterdetect, _maxIterStep, _numIgnorePhysicsIds, _ignorePhysicsIds);
}

EMSCRIPTEN_KEEPALIVE float *overlapBoxPhysics(PScene *scene, float hx, float hy, float hz, float *position, float *quaternion) {
  return scene->overlapBox(hx, hy, hz, position, quaternion);
}
EMSCRIPTEN_KEEPALIVE float *overlapCapsulePhysics(PScene *scene, float radius, float halfHeight, float *position, float *quaternion) {
  return scene->overlapCapsule(radius, halfHeight, position, quaternion);
}
EMSCRIPTEN_KEEPALIVE void collideBoxPhysics(PScene *scene, float hx, float hy, float hz, float *position, float *quaternion, unsigned int maxIter, unsigned int *hit, float *direction, unsigned int *grounded, unsigned int *id) {
  scene->collideBox(hx, hy, hz, position, quaternion, maxIter, *hit, direction, *grounded, *id);
}
EMSCRIPTEN_KEEPALIVE void collideCapsulePhysics(PScene *scene, float radius, float halfHeight, float *position, float *quaternion, unsigned int maxIter, unsigned int *hit, float *direction, unsigned int *grounded, unsigned int *id) {
  scene->collideCapsule(radius, halfHeight, position, quaternion, maxIter, *hit, direction, *grounded, *id);
}
EMSCRIPTEN_KEEPALIVE void getCollisionObjectPhysics(PScene *scene, float radius, float halfHeight, float *position, float *quaternion, float *direction, unsigned int *hit, unsigned int *id) {
  scene->getCollisionObject(radius, halfHeight, position, quaternion, direction, *hit, *id);
}
EMSCRIPTEN_KEEPALIVE void addCapsuleGeometryPhysics(PScene *scene, float *position, float *quaternion, float radius, float halfHeight, unsigned int id, PxMaterial *material, unsigned int dynamic, unsigned int flags) {
  scene->addCapsuleGeometry(position, quaternion, radius, halfHeight, id, material, dynamic, flags);
}

EMSCRIPTEN_KEEPALIVE void addPlaneGeometryPhysics(PScene *scene, float *position, float *quaternion, unsigned int id, PxMaterial *material, unsigned int dynamic) {
  scene->addPlaneGeometry(position, quaternion, id, material, dynamic);
}
EMSCRIPTEN_KEEPALIVE void addBoxGeometryPhysics(PScene *scene, float *position, float *quaternion, float *size, unsigned int id, PxMaterial *material, unsigned int dynamic, int groupId) {
  scene->addBoxGeometry(position, quaternion, size, id, material, dynamic, groupId);
}

//

EMSCRIPTEN_KEEPALIVE void cookGeometryPhysics(float *positions, unsigned int *indices, unsigned int numPositions, unsigned int numIndices, uint8_t **data, unsigned int *length, PxDefaultMemoryOutputStream **writeStream) {
  physicsBase->cookGeometry(positions, indices, numPositions, numIndices, data, length, writeStream);
}
EMSCRIPTEN_KEEPALIVE void cookConvexGeometryPhysics(float *positions, unsigned int *indices, unsigned int numPositions, unsigned int numIndices, uint8_t **data, unsigned int *length, PxDefaultMemoryOutputStream **writeStream) {
  physicsBase->cookConvexGeometry(positions, indices, numPositions, numIndices, data, length, writeStream);
}
EMSCRIPTEN_KEEPALIVE void cookHeightFieldGeometryPhysics(unsigned int numRows, unsigned int numColumns, int16_t *scratchStack, uint8_t **data, unsigned int *length, PxDefaultMemoryOutputStream **writeStream) {
  physicsBase->cookHeightFieldGeometry(numRows, numColumns, scratchStack, data, length, writeStream);
}

//

EMSCRIPTEN_KEEPALIVE PxTriangleMesh *createShapePhysics(PScene *scene, uint8_t *data, unsigned int length, PxDefaultMemoryOutputStream *releaseWriteStream) {
  return scene->createShape(data, length, releaseWriteStream);
}
EMSCRIPTEN_KEEPALIVE void destroyShapePhysics(PScene *scene, PxTriangleMesh *triangleMesh) {
  scene->destroyShape(triangleMesh);
}

EMSCRIPTEN_KEEPALIVE PxConvexMesh *createConvexShapePhysics(PScene *scene, uint8_t *data, unsigned int length, PxDefaultMemoryOutputStream *releaseWriteStream) {
  return scene->createConvexShape(data, length, releaseWriteStream);
}
EMSCRIPTEN_KEEPALIVE void destroyConvexShapePhysics(PScene *scene, PxConvexMesh *convexMesh) {
  scene->destroyConvexShape(convexMesh);
}

EMSCRIPTEN_KEEPALIVE PxHeightField *createHeightFieldPhysics(PScene *scene, uint8_t *data, unsigned int length, PxDefaultMemoryOutputStream *releaseWriteStream) {
  return scene->createHeightField(data, length, releaseWriteStream);
}

EMSCRIPTEN_KEEPALIVE PxMaterial *createMaterialPhysics(PScene *scene, float *mat) {
  return scene->createMaterial(mat);
}
EMSCRIPTEN_KEEPALIVE void destroyMaterialPhysics(PScene *scene, PxMaterial *material) {
  scene->destroyMaterial(material);
}

EMSCRIPTEN_KEEPALIVE void addGeometryPhysics(PScene *scene, PxTriangleMesh *triangleMesh, float *position, float *quaternion, float *scale, unsigned int id, PxMaterial *material, unsigned int external, PxTriangleMesh *releaseTriangleMesh) {
  scene->addGeometry(triangleMesh, position, quaternion, scale, id, material, external, releaseTriangleMesh);
}
EMSCRIPTEN_KEEPALIVE void addConvexGeometryPhysics(PScene *scene, PxConvexMesh *convexMesh, float *position, float *quaternion, float *scale, unsigned int id, PxMaterial *material, unsigned int dynamic, unsigned int external, PxConvexMesh *releaseConvexMesh) {
  scene->addConvexGeometry(convexMesh, position, quaternion, scale, id, material, dynamic, external, releaseConvexMesh);
}
EMSCRIPTEN_KEEPALIVE void addHeightFieldGeometryPhysics(PScene *scene, PxHeightField *convexMesh, float *position, float *quaternion, float *scale, float heightScale, float rowScale, float columnScale, unsigned int id, PxMaterial *material, unsigned int dynamic, unsigned int external, PxHeightField *releaseHeightField) {
  scene->addHeightFieldGeometry(convexMesh, position, quaternion, scale, heightScale, rowScale, columnScale, id, material, dynamic, external, releaseHeightField);
}

EMSCRIPTEN_KEEPALIVE void setGeometryScalePhysics(PScene *scene, unsigned int id, float *scale, PxDefaultMemoryOutputStream *writeStream) {
  scene->setGeometryScale(id, scale, writeStream);
}

EMSCRIPTEN_KEEPALIVE bool getGeometryPhysics(PScene *scene, unsigned int id, float *positions, unsigned int *numPositions, unsigned int *indices, unsigned int *numIndices, float *bounds) {
  return scene->getGeometry(id, positions, *numPositions, indices, *numIndices, bounds);
}
EMSCRIPTEN_KEEPALIVE bool getBoundsPhysics(PScene *scene, unsigned int id, float *bounds) {
  return scene->getBounds(id, bounds);
}

EMSCRIPTEN_KEEPALIVE void enableActorPhysics(PScene *scene, unsigned int id) {
  scene->enableActor(id);
}
EMSCRIPTEN_KEEPALIVE void disableActorPhysics(PScene *scene, unsigned int id) {
  scene->disableActor(id);
}
EMSCRIPTEN_KEEPALIVE void disableGeometryPhysics(PScene *scene, unsigned int id) {
  scene->disableGeometry(id);
}
EMSCRIPTEN_KEEPALIVE void enableGeometryQueriesPhysics(PScene *scene, unsigned int id) {
  scene->enableGeometryQueries(id);
}
EMSCRIPTEN_KEEPALIVE void disableGeometryQueriesPhysics(PScene *scene, unsigned int id) {
  scene->disableGeometryQueries(id);
}
EMSCRIPTEN_KEEPALIVE void enableGeometryPhysics(PScene *scene, unsigned int id) {
  scene->enableGeometry(id);
}
EMSCRIPTEN_KEEPALIVE void setMassAndInertiaPhysics(PScene *scene, unsigned int id, float mass, float *inertia) {
  scene->setMassAndInertia(id, mass, inertia);
}
EMSCRIPTEN_KEEPALIVE void setGravityEnabledPhysics(PScene *scene, unsigned int id, bool enabled) {
  scene->setGravityEnabled(id, enabled);
}
EMSCRIPTEN_KEEPALIVE void removeGeometryPhysics(PScene *scene, unsigned int id) {
  scene->removeGeometry(id);
}
EMSCRIPTEN_KEEPALIVE void setTransformPhysics(PScene *scene, unsigned int id, float *position, float *quaternion, float *scale, bool autoWake) {
  scene->setTransform(id, position, quaternion, scale, autoWake);
}
EMSCRIPTEN_KEEPALIVE void getGlobalPositionPhysics(PScene *scene, unsigned int id, float *position) {
  scene->getGlobalPosition(id, position);
}
EMSCRIPTEN_KEEPALIVE void getLinearVelocityPhysics(PScene *scene, unsigned int id, float *velocity) {
  scene->getLinearVelocity(id, velocity);
}
EMSCRIPTEN_KEEPALIVE void getAngularVelocityPhysics(PScene *scene, unsigned int id, float *velocity) {
  scene->getAngularVelocity(id, velocity);
}
EMSCRIPTEN_KEEPALIVE void addForceAtPosPhysics(PScene *scene, unsigned int id, float *velocity, float *position, bool autoWake) {
  scene->addForceAtPos(id, velocity, position, autoWake);
}
EMSCRIPTEN_KEEPALIVE void addForceAtLocalPosPhysics(PScene *scene, unsigned int id, float *velocity, float *position, bool autoWake) {
  scene->addForceAtLocalPos(id, velocity, position, autoWake);
}
EMSCRIPTEN_KEEPALIVE void addLocalForceAtPosPhysics(PScene *scene, unsigned int id, float *velocity, float *position, bool autoWake) {
  scene->addLocalForceAtPos(id, velocity, position, autoWake);
}
EMSCRIPTEN_KEEPALIVE void addLocalForceAtLocalPosPhysics(PScene *scene, unsigned int id, float *velocity, float *position, bool autoWake) {
  scene->addLocalForceAtLocalPos(id, velocity, position, autoWake);
}
EMSCRIPTEN_KEEPALIVE void addForcePhysics(PScene *scene, unsigned int id, float *velocity, bool autoWake) {
  scene->addForce(id, velocity, autoWake);
}
EMSCRIPTEN_KEEPALIVE void addTorquePhysics(PScene *scene, unsigned int id, float *velocity, bool autoWake) {
  scene->addTorque(id, velocity, autoWake);
}
EMSCRIPTEN_KEEPALIVE void setVelocityPhysics(PScene *scene, unsigned int id, float *velocity, bool autoWake) {
  scene->setVelocity(id, velocity, autoWake);
}
EMSCRIPTEN_KEEPALIVE void setAngularVelocityPhysics(PScene *scene, unsigned int id, float *velocity, bool autoWake) {
  scene->setAngularVel(id, velocity, autoWake);
}
EMSCRIPTEN_KEEPALIVE void setLinearLockFlagsPhysics(PScene *scene, unsigned int id, bool x, bool y, bool z) {
  scene->setLinearLockFlags(id, x, y, z);
}
EMSCRIPTEN_KEEPALIVE void setAngularLockFlagsPhysics(PScene *scene, unsigned int id, bool x, bool y, bool z) {
  scene->setAngularLockFlags(id, x, y, z);
}
EMSCRIPTEN_KEEPALIVE PxController *createCharacterControllerPhysics(PScene *scene, float radius, float height, float contactOffset, float stepOffset, float *position, PxMaterial *material, unsigned int id) {
  return scene->createCharacterController(radius, height, contactOffset, stepOffset, position, material, id);
}
EMSCRIPTEN_KEEPALIVE void destroyCharacterControllerPhysics(PScene *scene, PxController *characterController) {
  scene->destroyCharacterController(characterController);
}
EMSCRIPTEN_KEEPALIVE unsigned int moveCharacterControllerPhysics(PScene *scene, PxController *characterController, float *displacement, float minDist, float elapsedTime, float *positionOut) {
  return scene->moveCharacterController(characterController, displacement, minDist, elapsedTime, positionOut);
}
EMSCRIPTEN_KEEPALIVE void setCharacterControllerPositionPhysics(PScene *scene, PxController *characterController, float *position) {
  return scene->setCharacterControllerPosition(characterController, position);
}

EMSCRIPTEN_KEEPALIVE float *doCut(
  float *positions,
  unsigned int numPositions,
  float *normals,
  unsigned int numNormals,
  float *uvs,
  unsigned int numUvs,
  unsigned int *faces,
  unsigned int numFaces,

  float *planeNormal,
  float planeDistance
) {
  return cut(
    positions,
    numPositions,
    normals,
    numNormals,
    uvs,
    numUvs,
    faces,
    numFaces,

    planeNormal,
    planeDistance
  );
}

// EMSCRIPTEN_KEEPALIVE void doMarchingingCubes(
//   int dims[3],
//   float *potential,
//   uint8_t *brush,
//   float shift[3],
//   float scale[3],
//   float *positions,
//   float *colors,
//   unsigned int *faces,
//   unsigned int *positionIndex,
//   unsigned int *colorIndex,
//   unsigned int *faceIndex)
// {
//   marchingCubes(dims, potential, brush, shift, scale, positions, colors, faces, *positionIndex, *colorIndex, *faceIndex);
// }

EMSCRIPTEN_KEEPALIVE uint8_t *doMarchingCubes(int dims[3], float *potential, float shift[3], float scale[3]) {
  return marchingCubes(dims, potential, shift, scale);
}

EMSCRIPTEN_KEEPALIVE OcclusionCulling *initOcclusionCulling()
{
  return Culling::init();
}

EMSCRIPTEN_KEEPALIVE uint8_t *cullOcclusionCulling(OcclusionCulling *inst,
                                                   uint8_t *chunksBuffer,
                                                   int id,
                                                   int minX, int minY, int minZ,
                                                   int maxX, int maxY, int maxZ,
                                                   float cameraX, float cameraY, float cameraZ,
                                                   float cameraViewX, float cameraViewY, float cameraViewZ,
                                                   int numDraws)
{
  return Culling::cull(inst,
                       chunksBuffer, id,
                       ivec3{minX, minY, minZ},
                       ivec3{maxX, maxY, maxZ},
                       vec3{cameraX, cameraY, cameraZ},
                       vec3{cameraViewX, cameraViewY, cameraViewZ},
                       numDraws);
}

/* EMSCRIPTEN_KEEPALIVE void generateChunkDataDualContouring(float x, float y, float z){
    return DualContouring::generateChunkData(x, y, z);
}

EMSCRIPTEN_KEEPALIVE void setChunkLodDualContouring(float x, float y, float z, int lod){
    return DualContouring::setChunkLod(x, y, z, lod);
}

EMSCRIPTEN_KEEPALIVE void clearTemporaryChunkDataDualContouring(){
    return DualContouring::clearTemporaryChunkData();
}

EMSCRIPTEN_KEEPALIVE void clearChunkRootDualContouring(float x, float y, float z){
    return DualContouring::clearChunkRoot(x, y, z);
}

EMSCRIPTEN_KEEPALIVE uint8_t *createChunkMeshDualContouring(float x, float y, float z){
    return DualContouring::createChunkMesh(x, y, z);
} */

/* EMSCRIPTEN_KEEPALIVE bool drawDamage(float x, float y, float z, float radius, float value) {
    return DualContouring::drawDamage(x, y, z, radius, value);
} */

} // extern "C"