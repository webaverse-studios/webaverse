import * as THREE from 'three';
import ioManager from './io-manager.js';
import {playersManager} from './players-manager.js';
import physicsManager from './physics-manager.js';
import metaversefileApi from './metaversefile-api.js';
import {maxGrabDistance} from './constants.js';
import {getRenderer, sceneLowPriority, camera} from './renderer.js';
import cameraManager from './camera-manager.js';
import gameManager from './game.js';
import {world} from './world.js';
import {snapPosition} from './util.js';
import {buildMaterial} from './shaders.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector6 = new THREE.Vector3();
const localVector7 = new THREE.Vector3();
const localVector8 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localMatrix3 = new THREE.Matrix4();
const localBox = new THREE.Box3();

const rotationSnap = Math.PI / 6;
const maxGridSnap = 32;
const minGridSnap = 0
let highlightedPhysicsObject = null;
let highlightedPhysicsId = 0;
let transformIndicators = null;


const getPhysicalPosition = box => {
  return localVector7.set(
    (box.min.x + box.max.x) / 2,
    box.min.y,
    (box.min.z + box.max.z) / 2
  );
}

const _updateGrabbedObject = (
  o,
  grabMatrix,
  offsetMatrix,
  physicsScene,
  {collisionEnabled, handSnapEnabled, gridSnap}
) => {
  grabMatrix.decompose(localVector, localQuaternion, localVector2);
  offsetMatrix.decompose(localVector3, localQuaternion2, localVector4);

  const offset = localVector3.length();

  localMatrix
    .multiplyMatrices(grabMatrix, offsetMatrix)
    .decompose(localVector5, localQuaternion3, localVector6);

  let physicalOffset = null;
  const grabbedPhysicsObjects = o.getPhysicsObjects();

  // Compute physical local bounding box and it's position offset from app.position.
  // THREE.Box3.getCenter() has a console error, so I calculate manually.
  if(grabbedPhysicsObjects) {
    localBox.makeEmpty();
    for(const physicsObject of grabbedPhysicsObjects) {
      const geometry = physicsObject.physicsMesh.geometry;
      geometry.computeBoundingBox();
      localBox.union(geometry.boundingBox);
    }
    transformIndicators.bb = localBox;
    physicalOffset = getPhysicalPosition(localBox);
  }

  // raycast from localPlayer in direction of camera angle
  const collision = collisionEnabled && physicsScene.raycast(localVector, localQuaternion);

  // raycast from grabbed object down perpendicularly
  localQuaternion2.setFromAxisAngle(localVector2.set(1, 0, 0), -Math.PI * 0.5);
  const downCollision = collisionEnabled && physicsScene.raycast(localVector5, localQuaternion2);

  if (collision) {
    const {point} = collision;
    localVector6.fromArray(point);
  }

  if (downCollision) {
    const {point} = downCollision;
    localVector4.fromArray(point);
  }

  const collisionIsWithinOffset = localVector.distanceTo(localVector6) < offset;
  const collisionIsAboveGround = localVector4.y < localVector6.y;

  // Did the ray collide with any other object than the grabbed object? Need this check because on the first frame
  // it collides with the grabbed object, although physical actors are being disabled. This caused teleport issue.
  const collNonGrabbedObj = !!collision && !o.physicsObjects.some(obj => obj.physicsId === collision.objectId);

  // if collision point is closer to the player than the grab offset and collisionDown point
  // is below collision point then place the object at collision point
  if (collNonGrabbedObj && !!downCollision && collisionIsWithinOffset && collisionIsAboveGround) {
    localVector5.copy(localVector6).sub(physicalOffset);
  }

  const objectOverlapsVertically = localVector8.copy(localVector5).add(physicalOffset).y < localVector4.y;

  // if grabbed object would overlap vertically then place object at downCollision point
  if (!!downCollision && objectOverlapsVertically) {
    localVector5.setY(localVector4.sub(physicalOffset).y);
  }

  o.position.copy(localVector5);

  const handSnap =
    !handSnapEnabled ||
    offset >= maxGrabDistance ||
    !!collision ||
    !!downCollision;
  if (handSnap) {
    snapPosition(o, gridSnap);
    o.quaternion.setFromEuler(o.savedRotation);
  } else {
    o.quaternion.copy(localQuaternion3);
  }

  o.updateMatrixWorld();

  return {
    handSnap,
  };
}

const _delete = () => {
  const grabbedObject = grabManager.getGrabbedObject(0);
  const mouseSelectedObject = gameManager.getMouseSelectedObject();
  const mouseHoverObject = gameManager.getMouseHoverObject();
  if (grabbedObject) {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.ungrab();
    world.appManager.removeTrackedApp(grabbedObject.instanceId);
  } else if (highlightedPhysicsObject) {
    world.appManager.removeTrackedApp(highlightedPhysicsObject.instanceId);
    highlightedPhysicsObject = null;
  } else if (mouseSelectedObject) {
    world.appManager.removeTrackedApp(mouseSelectedObject.instanceId);
    if (mouseHoverObject === mouseSelectedObject) {
      gameManager.setMouseHoverObject(null);
    }
    gameManager.setMouseSelectedObject(null);
  }
};

const _click = (e) => {
  if (grabManager.getGrabbedObject(0)) {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.ungrab();

    transformIndicators.targetApp = null;
    grabManager.undrawPhone();
    grabManager.hideUi();
    grabManager.setGridSnap(minGridSnap);
  } else {
    if (highlightedPhysicsObject) {
      grabManager.grab(highlightedPhysicsObject);
    }
  }
};

const _createTransformIndicators = () => {
  transformIndicators = metaversefileApi.createApp();
  (async () => {
    const {importModule} = metaversefileApi.useDefaultModules();
    const m = await importModule('transformIndicators');
    await transformIndicators.addModule(m);
  })();
  transformIndicators.targetApp = null;
  sceneLowPriority.add(transformIndicators);
}

class Grabmanager extends EventTarget {
  constructor() {
    super();
    this.gridSnap = minGridSnap;
    this.editMode = false;
    Promise.resolve()
      .then(_createTransformIndicators);
  }

  grab(object) {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.grab(object);
    transformIndicators.targetApp = object;
    this.gridSnap = minGridSnap;
    this.editMode = false;
  }

  getGrabAction(i) {
    const targetHand = i === 0 ? 'left' : 'right';
    const localPlayer = playersManager.getLocalPlayer();
    const grabAction = localPlayer.findAction(
      (action) => action.type === 'grab' && action.hand === targetHand
    );
    return grabAction;
  }

  getGrabbedObject(i) {
    const grabAction = this.getGrabAction(i);
    const grabbedObjectInstanceId = grabAction?.instanceId;
    const result = grabbedObjectInstanceId
      ? metaversefileApi.getAppByInstanceId(grabbedObjectInstanceId)
      : null;
    return result;
  }

  async toggleEditMode() {
    this.editMode = !this.editMode;
    this.setGridSnap(minGridSnap);
    transformIndicators.targetApp = null;
    if (this.editMode) {
      if (!cameraManager.pointerLockElement) {
        await cameraManager.requestPointerLock();
      }
      if (gameManager.getMouseSelectedObject()) {
        gameManager.setMouseSelectedObject(null);
      }
      if (this.getGrabbedObject(0)) {
        const localPlayer = playersManager.getLocalPlayer();
        localPlayer.ungrab();
      }
      this.showUi();
      this.drawPhone();
    } else {
      this.hideUi();
      this.undrawPhone();
    }
  }

  setHighlightPhysicsMesh(mesh) {
    this.highlightPhysicsMesh = mesh;
    this.highlightPhysicsMesh.visible = false;
    sceneLowPriority.add(this.highlightPhysicsMesh);
  }

  showUi() {
    this.dispatchEvent(new MessageEvent('showui'));
  }

  hideUi() {
    this.dispatchEvent(new MessageEvent('hideui'));
  }

  drawPhone() {
    const localPlayer = playersManager.getLocalPlayer();
    if (!localPlayer.hasAction('readyGrab')) {
      localPlayer.addAction({
        type: 'readyGrab'
      });
    }
  }

  undrawPhone() {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.removeAction('readyGrab');
  }

  menuClick(e) {
    _click(e);
  }

  menuDelete() {
    _delete();
  }

  menuGridSnap() {
    if (this.gridSnap === minGridSnap) {
      this.setGridSnap(maxGridSnap);
    } else if (this.gridSnap > 1) {
      this.setGridSnap(this.gridSnap / 2);
    } else {
      this.setGridSnap(minGridSnap);
    }
    this.dispatchEvent(
      new MessageEvent('setgridsnap', {
        data: {gridSnap: this.gridSnap},
      })
    );
  }

  setGridSnap(gridSnap) {
    this.gridSnap = gridSnap;
    this.dispatchEvent(
      new MessageEvent('setgridsnap', {
        data: {gridSnap: this.gridSnap},
      })
    );
  }

  getGridSnap() {
    if (this.gridSnap === 0) {
      return 0;
    } else {
      return 4 / this.gridSnap;
    }
  }

  canRotate() {
    return !!this.getGrabbedObject(0);
  }

  menuRotate(direction) {
    const object = this.getGrabbedObject(0);
    object.savedRotation.y -= direction * rotationSnap;
  }

  canPush() {
    return !!this.getGrabbedObject(0);
  }

  menuPush(direction) {
    const localPlayer = playersManager.getLocalPlayer();
    const grabAction = localPlayer.findAction(
      (action) => action.type === 'grab' && action.hand === 'left'
    );
    if (grabAction) {
      const matrix = localMatrix.fromArray(grabAction.matrix);
      matrix.decompose(localVector, localQuaternion, localVector2);
      localVector.z += direction * 0.1;
      matrix
        .compose(localVector, localQuaternion, localVector2)
        .toArray(grabAction.matrix);
    } else {
      console.warn('trying to push with no grab object');
    }
  }

  update(timestamp, timeDiff) {
    const renderer = getRenderer();
    const localPlayer = playersManager.getLocalPlayer();
    const physicsScene = physicsManager.getScene();

    const _updateGrab = () => {
      const _isWear = (o) =>
        localPlayer.findAction(
          action => action.type === 'wear' && action.instanceId === o.instanceId);

      for (let i = 0; i < 2; i++) {
        const grabAction = this.getGrabAction(i);
        const grabbedObject = this.getGrabbedObject(i);
        if (grabbedObject && !_isWear(grabbedObject)) {
          let position = null;
          let quaternion = null;
          if (renderer.xr.getSession()) {
            const h = localPlayer[grabAction.hand === 'left' ? 'leftHand' : 'rightHand'];
            position = h.position;
            quaternion = h.quaternion;
          } else {
            position = localVector2.copy(localPlayer.position);
            quaternion = camera.quaternion;
          }

          localMatrix.compose(position, quaternion, localVector.set(1, 1, 1));

          _updateGrabbedObject(
            grabbedObject,
            localMatrix,
            localMatrix3.fromArray(grabAction.matrix),
            physicsScene,
            {
              collisionEnabled: true,
              handSnapEnabled: true,
              gridSnap: this.getGridSnap(),
            }
          );
        }
      }
    };
    _updateGrab();

    const _handlePush = () => {
      if (this.canPush()) {
        if (ioManager.keys.forward) {
          this.menuPush(-1);
        } else if (ioManager.keys.backward) {
          this.menuPush(1);
        }
      }
    };
    _handlePush();

    const _handlePhysicsHighlight = physicsScene => {
      highlightedPhysicsObject = null;

      if (this.editMode) {
        const {position, quaternion} = renderer.xr.getSession()
          ? localPlayer.leftHand
          : localPlayer;
        const collision = physicsScene.raycast(position, quaternion);
        if (collision) {
          const physicsId = collision.objectId;
          const app = metaversefileApi.getAppByPhysicsId(physicsId);
          if(app && !app.getComponent('invincible')) {
            highlightedPhysicsObject = app;
            highlightedPhysicsId = physicsId;
          }
        }
      }
    };
    _handlePhysicsHighlight(physicsScene);

    const _updatePhysicsHighlight = () => {
      this.highlightPhysicsMesh.visible = false;

      if (highlightedPhysicsObject) {
        const physicsId = highlightedPhysicsId;

        highlightedPhysicsObject.updateMatrixWorld();

        const physicsObject = metaversefileApi.getPhysicsObjectByPhysicsId(physicsId);
        if (physicsObject) {
          const {physicsMesh} = physicsObject;
          this.highlightPhysicsMesh.geometry = physicsMesh.geometry;
          this.highlightPhysicsMesh.matrixWorld
            .copy(physicsMesh.matrixWorld)
            .decompose(
              this.highlightPhysicsMesh.position,
              this.highlightPhysicsMesh.quaternion,
              this.highlightPhysicsMesh.scale
            );

          this.highlightPhysicsMesh.material.uniforms.uTime.value = (timestamp % 1500) / 1500;
          this.highlightPhysicsMesh.material.uniforms.uTime.needsUpdate = true;
          this.highlightPhysicsMesh.material.uniforms.uColor.value.setHex(
            buildMaterial.uniforms.uColor.value.getHex()
          );
          this.highlightPhysicsMesh.material.uniforms.uColor.needsUpdate = true;
          this.highlightPhysicsMesh.visible = true;
          this.highlightPhysicsMesh.updateMatrixWorld();
        }
      }
    };
    _updatePhysicsHighlight();

    const _handleCellphoneUndraw = () => {
      if(localPlayer.avatar?.cellphoneUndrawTime >= 1000) {
        localPlayer.removeAction('readyGrab');
      }
    };
    _handleCellphoneUndraw();
  }
}

const grabManager = new Grabmanager();
export default grabManager;