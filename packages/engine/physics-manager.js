/*
physics manager is the interface to the physics engine.
it contains code for character capsules and world simulation.
*/

import * as THREE from 'three'
import physx from './physx.js'
import metaversefileApi from 'metaversefile'
import {getNextPhysicsId, freePhysicsId, convertMeshToPhysicsMesh} from './util.js'
import {CapsuleGeometry} from './geometries.js'
import physxWorkerManager from '../../packages/engine/physx-worker-manager.js';
import {BoxGeometry} from 'three';
import {GET, GET_NORMALIZED, GET_INVERSE} from './constants.js'

const localVector = new THREE.Vector3()

// fake shared material to prevent shader instantiation
const redMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
});

const redAlphaMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  opacity: 0.5,
  transparent: true
});

const _makePhysicsObject = (physicsId, position, quaternion, scale) => {
  const physicsObject = new THREE.Object3D()
  physicsObject.position.copy(position)
  physicsObject.quaternion.copy(quaternion)
  physicsObject.scale.copy(scale)
  physicsObject.updateMatrixWorld()
  physicsObject.physicsId = physicsId
  physicsObject.detached = false // detached physics objects do not get updated when the owning app moves
  physicsObject.collided = true
  physicsObject.grounded = true
  return physicsObject
};
const _updatePhysicsObjects = updatesOut => {
  for (const updateOut of updatesOut) {
    const {id, position, quaternion, collided, grounded} = updateOut
    const physicsObject = metaversefileApi.getPhysicsObjectByPhysicsId(id)
    if (physicsObject) {
      // console.log('update physics object', id);

      physicsObject.position.copy(position)
      physicsObject.quaternion.copy(quaternion)
      physicsObject.updateMatrixWorld()

      physicsObject.collided = collided
      physicsObject.grounded = grounded
    } /* else {
      console.warn('failed to update unknown physics id', id);
    } */
  }
};

const physicsUpdates = [];
const gravity = new THREE.Vector3(0, -9.8, 0);
class PhysicsScene extends EventTarget {
  constructor(opts) {
    super();

    if (!opts) {
      this.scene = physx.physxWorker.makeScene();
      this.physicsEnabled = true;
    } else {
      this.scene = opts.scene;
      this.physicsEnabled = opts.physicsEnabled;
    }
  }

  clone() {
    return new PhysicsScene({
      scene: this.scene,
      physicsEnabled: this.physicsEnabled,
    });
  }

  addCapsuleGeometry(
    position,
    quaternion,
    radius,
    halfHeight,
    material,
    dynamic,
    flags = {}
  ) {
    const physicsId = getNextPhysicsId()
    physx.physxWorker.addCapsuleGeometryPhysics(
      this.scene,
      position,
      quaternion,
      radius,
      halfHeight,
      physicsId,
      material,
      dynamic,
      flags
    )
  
    const physicsObject = _makePhysicsObject(
      physicsId,
      position,
      quaternion,
      localVector.set(1, 1, 1)
    )
    const physicsMesh = new THREE.Mesh(
      new CapsuleGeometry(radius, radius, halfHeight * 2),
      redMaterial
    )
    physicsMesh.visible = false
    physicsObject.add(physicsMesh)
    physicsMesh.updateMatrixWorld()
    const {bounds} = this.getGeometryForPhysicsId(physicsId)
    physicsMesh.geometry.boundingBox = new THREE.Box3(
      new THREE.Vector3().fromArray(bounds, 0),
      new THREE.Vector3().fromArray(bounds, 3)
    )
    physicsObject.physicsMesh = physicsMesh
    return physicsObject
  }

  addPlaneGeometry(position, quaternion, dynamic) {
    const physicsId = getNextPhysicsId()
    physx.physxWorker.addPlaneGeometryPhysics(
      this.scene,
      position,
      quaternion,
      physicsId,
      dynamic,
    )
  
    const physicsObject = _makePhysicsObject(
      physicsId,
      position,
      quaternion,
      localVector.set(1, 1, 1)
    )
    const physicsMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), redMaterial)
    physicsMesh.visible = false
    physicsObject.add(physicsMesh)
    physicsObject.updateMatrixWorld()
    physicsObject.physicsMesh = physicsMesh
    return physicsObject
  }

  addBoxGeometry(position, quaternion, size, dynamic,
    groupId = -1 // if not equal to -1, this BoxGeometry will not collide with CharacterController.
  ) {
    const physicsId = getNextPhysicsId()
    physx.physxWorker.addBoxGeometryPhysics(
      this.scene,
      position,
      quaternion,
      size,
      physicsId,
      dynamic,
      groupId
    )
  
    const physicsObject = _makePhysicsObject(
      physicsId,
      position,
      quaternion,
      localVector.set(1, 1, 1)
    )
    const physicsMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), redMaterial)
    physicsMesh.scale.copy(size)
    physicsMesh.visible = false
    physicsObject.add(physicsMesh)
    physicsObject.updateMatrixWorld()
    const {bounds} = this.getGeometryForPhysicsId(physicsId)
    physicsMesh.geometry.boundingBox = new THREE.Box3(
      new THREE.Vector3().fromArray(bounds, 0),
      new THREE.Vector3().fromArray(bounds, 3)
    )
    physicsObject.physicsMesh = physicsMesh
    return physicsObject
  }

  extractPhysicsGeometryForId(physicsId) {
    const physicsGeometry = this.getGeometryForPhysicsId(physicsId)
    const {positions, indices, bounds} = physicsGeometry
    let geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry = geometry.toNonIndexed()
    geometry.computeVertexNormals()
    geometry.boundingBox = new THREE.Box3(
      new THREE.Vector3().fromArray(bounds, 0),
      new THREE.Vector3().fromArray(bounds, 3)
    );
    return geometry
  }

  addGeometry(mesh) {
    const physicsMesh = convertMeshToPhysicsMesh(mesh)
  
    const physicsId = getNextPhysicsId()
    physx.physxWorker.addGeometryPhysics(
      this.scene,
      physicsMesh,
      physicsId
    )
    physicsMesh.geometry = this.extractPhysicsGeometryForId(physicsId)
  
    const physicsObject = _makePhysicsObject(
      physicsId,
      physicsMesh.position,
      physicsMesh.quaternion,
      physicsMesh.scale
    )
    physicsObject.add(physicsMesh)
    physicsMesh.position.set(0, 0, 0)
    physicsMesh.quaternion.set(0, 0, 0, 1)
    physicsMesh.scale.set(1, 1, 1)
    physicsMesh.updateMatrixWorld()
    physicsObject.physicsMesh = physicsMesh
    return physicsObject
  }

  createMaterial(physicsMaterial) {
    return physx.physxWorker.createMaterial(this.scene, physicsMaterial)
  }

  destroyMaterial(materialAddress) {
    physx.physxWorker.destroyMaterial(this.scene, materialAddress);
  }

  async meshoptSimplify(mesh, targetRatio, targetError) {
    const indices = await physxWorkerManager.meshoptSimplify(mesh, targetRatio, targetError);
    
    const geometry2 = new THREE.BufferGeometry();
    for (const key in mesh.geometry.attributes) {
      const attribute = mesh.geometry.attributes[key];
      geometry2.setAttribute(key, attribute);
    }
    geometry2.setIndex(new THREE.BufferAttribute(indices, 1));
    
    const mesh2 = new THREE.Mesh(geometry2, mesh.material);
    mesh2.name = mesh.name;
    mesh2.position.copy(mesh.position);
    mesh2.quaternion.copy(mesh.quaternion);
    mesh2.scale.copy(mesh.scale);
    mesh2.matrix.copy(mesh.matrix);
    mesh2.matrixWorld.copy(mesh.matrixWorld);
    // console.log('compare geometries', mesh.geometry, geometry2, mesh.geometry.attributes.position === geometry2.attributes.position);
    // return indices;
    return mesh2;
    // return indices;
  }

  async meshoptSimplifySloppy(mesh, targetRatio, targetError) {
    const indices = await physxWorkerManager.meshoptSimplifySloppy(mesh, targetRatio, targetError);
    
    const geometry2 = new THREE.BufferGeometry();
    for (const key in mesh.geometry.attributes) {
      const attribute = mesh.geometry.attributes[key];
      geometry2.setAttribute(key, attribute);
    }
    geometry2.setIndex(new THREE.BufferAttribute(indices, 1));
    
    const mesh2 = new THREE.Mesh(geometry2, mesh.material);
    mesh2.name = mesh.name;
    mesh2.position.copy(mesh.position);
    mesh2.quaternion.copy(mesh.quaternion);
    mesh2.scale.copy(mesh.scale);
    mesh2.matrix.copy(mesh.matrix);
    mesh2.matrixWorld.copy(mesh.matrixWorld);
    // console.log('compare geometries', mesh.geometry, geometry2, mesh.geometry.attributes.position === geometry2.attributes.position);
    // return indices;
    return mesh2;
  }

  cookGeometry(mesh) {
    const physicsMesh = convertMeshToPhysicsMesh(mesh);
    const buffer = physx.physxWorker.cookGeometryPhysics(physicsMesh);
    return buffer;
  }

  async cookGeometryAsync(mesh, {
    signal = null,
  } = {}) {
    const physicsMesh = convertMeshToPhysicsMesh(mesh);
    const buffer = await physxWorkerManager.cookGeometry(physicsMesh);
    signal && signal.throwIfAborted();
    return buffer;
  }

  addCookedGeometry(buffer, position, quaternion, scale) {
    const physicsId = getNextPhysicsId()
    physx.physxWorker.addCookedGeometryPhysics(
      this.scene,
      buffer,
      position,
      quaternion,
      scale,
      physicsId
    )
  
    const physicsObject = _makePhysicsObject(
      physicsId,
      position,
      quaternion,
      scale
    )
    const physicsMesh = new THREE.Mesh(this.extractPhysicsGeometryForId(physicsId), redMaterial)
    physicsMesh.visible = false
    physicsObject.add(physicsMesh)
    physicsObject.physicsMesh = physicsMesh
    physicsMesh.updateMatrixWorld()
    return physicsObject
  }

  addConvexGeometry(mesh, dynamic = false, external = false) {
    const physicsMesh = convertMeshToPhysicsMesh(mesh)
  
    const physicsId = getNextPhysicsId()
    physx.physxWorker.addConvexGeometryPhysics(
      this.scene,
      physicsMesh,
      dynamic,
      external,
      physicsId
    )
    physicsMesh.geometry = this.extractPhysicsGeometryForId(physicsId)
  
    const physicsObject = _makePhysicsObject(
      physicsId,
      mesh.position,
      mesh.quaternion,
      mesh.scale
    )
    physicsObject.add(physicsMesh)
    physicsMesh.position.set(0, 0, 0)
    physicsMesh.quaternion.set(0, 0, 0, 1)
    physicsMesh.scale.set(1, 1, 1)
    physicsMesh.updateMatrixWorld()
    physicsObject.physicsMesh = physicsMesh
    return physicsObject
  }

  cookConvexGeometry(mesh) {
    const physicsMesh = convertMeshToPhysicsMesh(mesh);
    const buffer = physx.physxWorker.cookConvexGeometryPhysics(this.scene, physicsMesh);
    return buffer;
  }

  async cookConvexGeometryAsync(mesh, {
    signal = null,
  } = {}) {
    const physicsMesh = convertMeshToPhysicsMesh(mesh);
    const buffer = await physxWorkerManager.cookConvexGeometry(physicsMesh);
    signal && signal.throwIfAborted();
    return buffer;
  }

  addCookedConvexGeometry(
    buffer,
    position,
    quaternion,
    scale,
    dynamic = false,
    external = false,
  ) {
    const physicsId = getNextPhysicsId()
    physx.physxWorker.addCookedConvexGeometryPhysics(
      this.scene,
      buffer,
      position,
      quaternion,
      scale,
      dynamic,
      external,
      physicsId
    )
  
    const physicsObject = _makePhysicsObject(
      physicsId,
      position,
      quaternion,
      scale
    )
    const physicsMesh = new THREE.Mesh(this.extractPhysicsGeometryForId(physicsId), redMaterial)
    physicsMesh.visible = false
    physicsObject.add(physicsMesh)
    physicsObject.physicsMesh = physicsMesh
    physicsMesh.updateMatrixWorld()
    return physicsObject
  }

  cookHeightfieldGeometry(numRows, numColumns, heights) {
    const buffer = physx.physxWorker.cookHeightfieldGeometryPhysics(numRows, numColumns, heights);
    return buffer;
  }

  async cookHeightfieldGeometryAsync(numRows, numColumns, heights, {
    signal = null,
  } = {}) {
    const buffer = await physxWorkerManager.cookHeightfieldGeometry(numRows, numColumns, heights);
    signal && signal.throwIfAborted();
    return buffer;
  }

  addCookedHeightfieldGeometry(
    buffer,
    heightScale,
    rowScale,
    columnScale,
    dynamic = false,
    external = false,
  ) {
    const physicsId = getNextPhysicsId()
    physx.physxWorker.addCookedHeightfieldGeometryPhysics(
      this.scene,
      buffer,
      heightScale,
      rowScale,
      columnScale,
      dynamic,
      external,
      physicsId
    )
  
    const physicsObject = _makePhysicsObject(
      physicsId,
      new THREE.Vector3(),
      new THREE.Quaternion(),
      new THREE.Vector3(1, 1, 1)
    )
    const physicsMesh = new THREE.Mesh(this.extractPhysicsGeometryForId(physicsId), redMaterial)
    physicsMesh.visible = false
    physicsObject.add(physicsMesh)
    physicsObject.physicsMesh = physicsMesh
    physicsMesh.updateMatrixWorld()
    return physicsObject
  }

  addShape(shapeAddress, position, quaternion, scale, external) {
    const physicsId = getNextPhysicsId()
  
    physx.physxWorker.addShapePhysics(
      this.scene,
      shapeAddress,
      position,
      quaternion,
      scale,
      external,
      physicsId
    );
  
    const physicsObject = _makePhysicsObject(
      physicsId,
      position,
      quaternion,
      scale
    )
    const physicsMesh = new THREE.Mesh(this.extractPhysicsGeometryForId(physicsId), redMaterial)
    physicsMesh.visible = false
    physicsObject.add(physicsMesh)
    physicsObject.physicsMesh = physicsMesh;
    physicsMesh.updateMatrixWorld()
    return physicsObject
  }

  addConvexShape(shapeAddress, position, quaternion, scale, dynamic = false, external = false, physicsGeometry = null) {
    const physicsId = getNextPhysicsId()
  
    physx.physxWorker.addConvexShapePhysics(
      this.scene,
      shapeAddress,
      position,
      quaternion,
      scale,
      dynamic,
      external,
      physicsId
    );
  
    const physicsObject = _makePhysicsObject(
      physicsId,
      position,
      quaternion,
      scale
    )

    if (!physicsGeometry)
      physicsGeometry = this.extractPhysicsGeometryForId(physicsId);

    const physicsMesh = new THREE.Mesh(physicsGeometry, redMaterial);
  
    physicsMesh.visible = false
    physicsObject.add(physicsMesh)
    physicsObject.physicsMesh = physicsMesh;
    physicsMesh.updateMatrixWorld();
    return physicsObject
  }

  addHeightFieldGeometry(mesh, numRows, numColumns, heights, heightScale, rowScale, columnScale, dynamic = false, external = false) {
    const physicsMesh = convertMeshToPhysicsMesh(mesh)

    const physicsId = getNextPhysicsId()
    const heightField = physx.physxWorker.addHeightFieldGeometryPhysics(
      this.scene,
      mesh,
      numRows,
      numColumns,
      heights,
      heightScale,
      rowScale,
      columnScale,
      dynamic,
      external,
      physicsId
    )
    // for now, we assume what came in was an accurate heightfield plane for visualization...
    // physicsMesh.geometry = this.extractPhysicsGeometryForId(physicsId)

    const physicsObject = _makePhysicsObject(
      physicsId,
      mesh.position,
      mesh.quaternion,
      mesh.scale
    )
    physicsObject.add(physicsMesh)
    physicsMesh.position.set(0, 0, 0)
    physicsMesh.quaternion.set(0, 0, 0, 1)
    physicsMesh.scale.set(1, 1, 1)
    physicsMesh.updateMatrixWorld()
    physicsObject.physicsMesh = physicsMesh
    return physicsObject
  }

  getGeometryForPhysicsId(physicsId) {
    return physx.physxWorker.getGeometryPhysics(this.scene, physicsId);
  }

  getBoundingBoxForPhysicsId(physicsId, box) {
    return physx.physxWorker.getBoundsPhysics(this.scene, physicsId, box);
  }

  enableActor(physicsObject) {
    physx.physxWorker.enableActorPhysics(this.scene, physicsObject.physicsId)
  }

  disableActor(physicsObject) {
    physx.physxWorker.disableActorPhysics(this.scene, physicsObject.physicsId)
  }

  enableAppPhysics(app){
    const physicsObjects = app.getPhysicsObjects();
    for (let i = 0; i < physicsObjects.length; i++) {
      const physicsObject = physicsObjects[i]
      this.enableActor(physicsObject);
    } 
  }

  disableAppPhysics(app){
    const physicsObjects = app.getPhysicsObjects();
    for (let i = 0; i < physicsObjects.length; i++) {
      const physicsObject = physicsObjects[i]
      this.disableActor(physicsObject);
    } 
  }

  disableGeometry(physicsObject) {
    physx.physxWorker.disableGeometryPhysics(
      this.scene,
      physicsObject.physicsId
    )
  }

  enableGeometry(physicsObject) {
    physx.physxWorker.enableGeometryPhysics(
      this.scene,
      physicsObject.physicsId
    )
  }

  disableGeometryQueries(physicsObject) {
    physx.physxWorker.disableGeometryQueriesPhysics(
      this.scene,
      physicsObject.physicsId
    )
  }

  enableGeometryQueries(physicsObject) {
    physx.physxWorker.enableGeometryQueriesPhysics(
      this.scene,
      physicsObject.physicsId
    )
  }

  setMassAndInertia(physicsObject, mass, inertia) {
    physx.physxWorker.setMassAndInertiaPhysics(
      this.scene,
      physicsObject.physicsId,
      mass,
      inertia
    )
  }

  setGravityEnabled(physicsObject, enabled) {
    physx.physxWorker.setGravityEnabledPhysics(
      this.scene,
      physicsObject.physicsId,
      enabled
    )
  }

  removeGeometry(physicsObject) {
    physx.physxWorker.removeGeometryPhysics(
      this.scene,
      physicsObject.physicsId
    )
  
    freePhysicsId(physicsObject.physicsId)
  }

  getLinearVelocity(physicsObject, velocity) {
    physx.physxWorker.getLinearVelocityPhysics(this.scene, physicsObject.physicsId, velocity);
  }

  getAngularVelocity(physicsObject, velocity) {
    physx.physxWorker.getAngularVelocityPhysics(this.scene, physicsObject.physicsId, velocity);
  }

  getGlobalPosition(physicsObject, position) {
    physx.physxWorker.getGlobalPositionPhysics(
      this.scene,
      physicsObject.physicsId,
      position
    )
  }

  addForceAtPos(physicsObject, velocity, position, autoWake) {
    physx.physxWorker.addForceAtPosPhysics(this.scene, physicsObject.physicsId, velocity, position, autoWake);
  }

  addLocalForceAtPos(physicsObject, velocity, position, autoWake) {
    physx.physxWorker.addLocalForceAtPosPhysics(this.scene, physicsObject.physicsId, velocity, position, autoWake);
  }

  addForceAtLocalPos(physicsObject, velocity, position, autoWake) {
    physx.physxWorker.addForceAtLocalPosPhysics(this.scene, physicsObject.physicsId, velocity, position, autoWake);
  }

  addLocalForceAtLocalPos(physicsObject, velocity, position, autoWake) {
    physx.physxWorker.addLocalForceAtLocalPosPhysics(this.scene, physicsObject.physicsId, velocity, position, autoWake);
  }

  addForce(physicsObject, velocity, autoWake) {
    physx.physxWorker.addForcePhysics(this.scene, physicsObject.physicsId, velocity, autoWake);
  }

  addTorque(physicsObject, velocity, autoWake) {
    physx.physxWorker.addTorquePhysics(this.scene, physicsObject.physicsId, velocity, autoWake);
  }

  setVelocity(physicsObject, velocity, autoWake) {
    physx.physxWorker.setVelocityPhysics(
      this.scene,
      physicsObject.physicsId,
      velocity,
      autoWake
    )
  }

  setAngularVelocity(physicsObject, velocity, autoWake) {
    physx.physxWorker.setAngularVelocityPhysics(
      this.scene,
      physicsObject.physicsId,
      velocity,
      autoWake
    )
  }

  setTransform(physicsObject, autoWake) {
    physx.physxWorker.setTransformPhysics(
      this.scene,
      physicsObject.physicsId,
      physicsObject.position,
      physicsObject.quaternion,
      physicsObject.scale,
      autoWake
    )
  }

  setGeometryScale(physicsId, newScale) {
    physx.physxWorker.setGeometryScale(this.scene, physicsId, newScale)
  }

  getPath(
    start,
    dest,
    isWalk,
    hy,
    heightTolerance,
    maxIterDetect,
    maxIterStep,
    ignorePhysicsIds
  ) {
    return physx.physxWorker.getPathPhysics(
      this.scene,
      start,
      dest,
      isWalk,
      hy,
      heightTolerance,
      maxIterDetect,
      maxIterStep,
      ignorePhysicsIds
    )
  }

  overlapBox(hx, hy, hz, p, q) {
    return physx.physxWorker.overlapBoxPhysics(this.scene, hx, hy, hz, p, q)
  }

  overlapCapsule(radius, halfHeight, p, q) {
    return physx.physxWorker.overlapCapsulePhysics(
      this.scene,
      radius,
      halfHeight,
      p,
      q
    )
  }

  collideBox(hx, hy, hz, p, q, maxIter) {
    return physx.physxWorker.collideBoxPhysics(
      this.scene,
      hx,
      hy,
      hz,
      p,
      q,
      maxIter
    )
  }

  collideCapsule(radius, halfHeight, p, q, maxIter) {
    return physx.physxWorker.collideCapsulePhysics(
      this.scene,
      radius,
      halfHeight,
      p,
      q,
      maxIter
    )
  }

  getCollisionObject(radius, halfHeight, p, q) {
    return physx.physxWorker.getCollisionObjectPhysics(
      this.scene,
      radius,
      halfHeight,
      p,
      q
    )
  }

  createCharacterController(
    radius,
    height,
    contactOffset,
    stepOffset,
    position
  ) {
    const physicsId = getNextPhysicsId()
    const characterControllerId =
      physx.physxWorker.createCharacterControllerPhysics(
        this.scene,
        radius,
        height,
        contactOffset,
        stepOffset,
        position,
        physicsId
      )

    const characterHeight = height + radius * 2;
    const physicsObject = new THREE.Object3D()
    const {bounds} = this.getGeometryForPhysicsId(physicsId)
    const box = new THREE.Box3(
      new THREE.Vector3().fromArray(bounds, 0),
      new THREE.Vector3().fromArray(bounds, 3)
    );
    const dimensions = new THREE.Vector3().subVectors(box.max, box.min);
    const physicsMesh = new THREE.Mesh(
      // new CapsuleGeometry(radius, radius, characterHeight),
      new BoxGeometry(dimensions.x, dimensions.y, dimensions.z),
      redAlphaMaterial
    )
    physicsMesh.visible = false
    physicsObject.add(physicsMesh)
    physicsMesh.updateMatrixWorld();
    physicsMesh.geometry.boundingBox = box;
    // console.log('character controller bounds', physicsId, physicsMesh.geometry.boundingBox);
    physicsObject.physicsMesh = physicsMesh
    physicsObject.characterControllerId = characterControllerId
    physicsObject.physicsId = physicsId
  
    /* const physicsObject = _makePhysicsObject(physicsId, mesh.position, mesh.quaternion, mesh.scale);
    physicsObject.add(physicsMesh);
    physicsMesh.position.set(0, 0, 0);
    physicsMesh.quaternion.set(0, 0, 0, 1);
    physicsMesh.scale.set(1, 1, 1);
    physicsMesh.updateMatrixWorld();
    physicsObject.physicsMesh = physicsMesh;
    characterController.physicsObject = physicsObject;
    console.log('character controller id', physicsObject); */
  
    return physicsObject
  }

  destroyCharacterController(characterController) {
    physx.physxWorker.destroyCharacterControllerPhysics(
      this.scene,
      characterController.characterControllerId
    )
  }

  moveCharacterController(
    characterController,
    displacement,
    minDist,
    elapsedTime,
    position
  ) {
    const result = physx.physxWorker.moveCharacterControllerPhysics(
      this.scene,
      characterController.characterControllerId,
      displacement,
      minDist,
      elapsedTime,
      position
    )
    return result
  }

  setCharacterControllerPosition(
    characterController,
    position
  ) {
    const result = physx.physxWorker.setCharacterControllerPositionPhysics(
      this.scene,
      characterController.characterControllerId,
      position
    )
    return result
  }

  raycast(position, quaternion) {
    return physx.physxWorker.raycastPhysics(this.scene, position, quaternion)
  }

  raycastArray(position, quaternion, n) {
    return physx.physxWorker.raycastPhysicsArray(this.scene, position, quaternion, n)
  }

  cutMesh(
    positions,
    numPositions,
    normals,
    numNormals,
    uvs,
    numUvs,
    faces, // Set to falsy to indicate that this is an non-indexed geometry
    numFaces,
  
    planeNormal, // normalized vector3 array
    planeDistance // number
  ) {
    return physx.physxWorker.doCut(
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

  setLinearLockFlags(physicsId, x, y, z) {
    physx.physxWorker.setLinearLockFlags(this.scene, physicsId, x, y, z)
  }

  setAngularLockFlags(physicsId, x, y, z) {
    physx.physxWorker.setAngularLockFlags(this.scene, physicsId, x, y, z)
  }

  sweepBox(
    origin,
    quaternion,
    halfExtents,
    direction,
    sweepDistance,
    maxHits
  ) {
    return physx.physxWorker.sweepBox(
      this.scene,
      origin,
      quaternion,
      halfExtents,
      direction,
      sweepDistance,
      maxHits
    )
  }

  sweepConvexShape(
    shapeAddress,
    origin,
    quaternion,
    direction,
    sweepDistance,
    maxHits,
  ) {
    return physx.physxWorker.sweepConvexShape(
      this.scene,
      shapeAddress,
      origin,
      quaternion,
      direction,
      sweepDistance,
      maxHits,
    )
  }

  simulatePhysics(timeDiff) {
    if (this.physicsEnabled) {
      const t = timeDiff / 1000
      const updatesOut = physx.physxWorker.simulatePhysics(
        this.scene,
        physicsUpdates,
        t
      )
      // physicsUpdates.length = 0
      _updatePhysicsObjects(updatesOut);
    }
  }

  //
  marchingCubes(dims, potential, shift, scale) {
    return physx.physxWorker.marchingCubes(dims, potential, shift, scale);
  }

  //
  createShape(buffer) {
    return physx.physxWorker.createShapePhysics(this.scene, buffer);
  }

  createConvexShape(buffer) {
    return physx.physxWorker.createConvexShapePhysics(this.scene, buffer);
  }

  getPhysicsEnabled() {
    return this.physicsEnabled;
  }

  setPhysicsEnabled(newPhysicsEnabled) {
    this.physicsEnabled = newPhysicsEnabled;
  }

  getGravity() {
    return gravity;
  }

  setTrigger(id) {
    return physx.physxWorker.setTriggerPhysics(
      this.scene, id,
    )
  }

  getTriggerEvents() {
    const triggerEvents = physx.physxWorker.getTriggerEventsPhysics(
      this.scene,
    )
    triggerEvents.forEach(triggerEvent => {
      const {status, triggerPhysicsId, otherPhysicsId} = triggerEvent;
      const triggerApp = metaversefileApi.getAppByPhysicsId(triggerPhysicsId);
      const otherApp = metaversefileApi.getAppByPhysicsId(otherPhysicsId);
      if (triggerApp) {
        if (status === 4) {
          triggerApp.dispatchEvent({type: 'triggerin', oppositePhysicsId: otherPhysicsId});
        } else if (status === 16) {
          triggerApp.dispatchEvent({type: 'triggerout', oppositePhysicsId: otherPhysicsId});
        }
      }
      if (otherApp) {
        if (status === 4) {
          otherApp.dispatchEvent({type: 'triggerin', oppositePhysicsId: triggerPhysicsId});
        } else if (status === 16) {
          otherApp.dispatchEvent({type: 'triggerout', oppositePhysicsId: triggerPhysicsId});
        }
      }
    })
    return triggerEvents;
  }

  getActionInterpolant(character, actionName, type = GET) { // note: type consts: GET, GET_NORMALIZED, GET_INVERSE.
    const interpolantValue = physx.physxWorker.getActionInterpolantAnimationAvatar(character.avatar.animationAvatarPtr, actionName, type);
    return interpolantValue;
  }

  //

  /*
    console_test:
      physicsManager.getScene().testPring('az')
    output:
      Printed directly from wasm: az
      newStringByteLength: 35
      newTestString: new test string created in wasm, az
  */
  testPrint(testString) {
    const newTestString = physx.physxWorker.testPrintPhysics(this.scene, testString)
    return newTestString;
  }
}

const physicsManager = {
  scenes: new Map(),
  getScene(instance = null) {
    let scene = this.scenes.get(instance);
    if (!scene) {
      scene = new PhysicsScene();
      this.scenes.set(instance, scene);
    }
    return scene;
  },
};

globalThis.physicsManager = physicsManager;

export default physicsManager;