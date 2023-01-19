import * as THREE from 'three';
import {getRenderer, camera} from './renderer.js';
import physicsManager from './physics-manager.js';
import {shakeAnimationSpeed, minFov, maxFov, midFov} from './constants.js';
import Simplex from './simplex-noise.js';
import {playersManager} from './players-manager.js';
import easing from './easing.js';
import {isWorker} from './env.js';

const cubicBezier = easing(0, 1, 0, 1);
const cubicBezier2 = easing(0.5, 0, 0.5, 1);

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector6 = new THREE.Vector3();
const localVector7 = new THREE.Vector3();
const localVector8 = new THREE.Vector3();
const localVector9 = new THREE.Vector3();
const localVector10 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localQuaternion4 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();

/*
Anon: "Hey man, can I get your autograph?"
Drake: "Depends. What's it worth to you?"
Anon: "Your first born child"
Drake: "No thanks. I don't think your child would be worth very much."
*/

const zeroVector = new THREE.Vector3(0, 0, 0);
const upVector = new THREE.Vector3(0, 1, 0);
const cameraOffsetDefault = 0.65;
const maxFocusTime = 300;

const cameraOffset = new THREE.Vector3();
let cameraOffsetTargetZ = cameraOffset.z;
let cameraOffsetLimitZ = Infinity;

// let cameraOffsetZ = cameraOffset.z;
const rayVectorZero = new THREE.Vector3(0,0,0);
// const rayVectorUp = new THREE.Vector3(0,1,0);
// const rayStartPos = new THREE.Vector3(0,0,0);
// const rayDirection = new THREE.Vector3(0,0,0);
// const rayOffsetPoint = new THREE.Vector3(0,0,0);
// const rayMatrix = new THREE.Matrix4();
// const rayQuaternion = new THREE.Quaternion();
// const rayOriginArray = [new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,0)]; // 6 elements
// const rayDirectionArray = [new THREE.Quaternion(),new THREE.Quaternion(),new THREE.Quaternion(),new THREE.Quaternion(),new THREE.Quaternion(),new THREE.Quaternion()]; // 6 elements

/* function getNormal(u, v) {
  return localPlane.setFromCoplanarPoints(zeroVector, u, v).normal;
} */
/* function signedAngleTo(u, v) {
  // Get the signed angle between u and v, in the range [-pi, pi]
  const angle = u.angleTo(v);
  console.log('signed angle to', angle, u.dot(v));
  return (u.dot(v) >= 0 ? 1 : -1) * angle;
} */
/* function signedAngleTo(a, b, v) {
  const s = v.crossVectors(a, b).length();
  // s = length(cross_product(a, b))
  const c = a.dot(b);
  const angle = Math.atan2(s, c);
  console.log('get signed angle', s, c, angle);
  return angle;
} */

const getSideOfY = (() => {
  const localVector = new THREE.Vector3();
  const localVector2 = new THREE.Vector3();
  const localQuaternion = new THREE.Quaternion();
  const localPlane = new THREE.Plane();

  function getSideOfY(a, b) {
    localQuaternion.setFromRotationMatrix(
      localMatrix.lookAt(
        zeroVector,
        a,
        upVector
      )
    );
    const rightVector = localVector.set(1, 0, 0).applyQuaternion(localQuaternion);
    localPlane.setFromNormalAndCoplanarPoint(rightVector, a);
    const distance = localPlane.distanceToPoint(b, localVector2);
    return distance >= 0 ? 1 : -1;
  }
  return getSideOfY;
})();

// const lastCameraQuaternion = new THREE.Quaternion();
// let lastCameraZ = 0;
// let lastCameraValidZ = 0;

const seed = 'camera';
const shakeNoise = new Simplex(seed);

class Shake extends THREE.Object3D {
  constructor(intensity, startTime, radius, decay) {
    super();

    this.intensity = intensity;
    this.startTime = startTime;
    this.radius = radius;
    this.decay = decay;
  }
}

/* function lerpNum(value1, value2, amount) {
  amount = amount < 0 ? 0 : amount;
  amount = amount > 1 ? 1 : amount;
  return value1 + (value2 - value1) * amount;
}
// Raycast from player to camera corner
function initCameraRayParams(arrayIndex,originPoint) {
  rayDirection.subVectors(localPlayer.position, originPoint).normalize();

  rayMatrix.lookAt(rayDirection,rayVectorZero,rayVectorUp);
  rayQuaternion.setFromRotationMatrix(rayMatrix);

  // Slightly move ray start position towards camera (to avoid hair,hat)
  rayStartPos.copy(localPlayer.position);
  rayStartPos.add( rayDirection.multiplyScalar(0.1) );

  rayOriginArray[arrayIndex].copy(rayStartPos);
  rayDirectionArray[arrayIndex].copy(rayQuaternion);

}
// Raycast from player postition with small offset
function initOffsetRayParams(arrayIndex,originPoint) {
  rayDirection.subVectors(localPlayer.position, camera.position).normalize();

  rayMatrix.lookAt(rayDirection,rayVectorZero,rayVectorUp);
  rayQuaternion.setFromRotationMatrix(rayMatrix);

  rayOriginArray[arrayIndex].copy(originPoint);
  rayDirectionArray[arrayIndex].copy(rayQuaternion);
} */

//

const _applyMouseMove = (position, quaternion, offset, e) => {
  const {movementX, movementY} = e;

  position.add(
    localVector.copy(offset)
      .applyQuaternion(quaternion)
  );

  localEuler.setFromQuaternion(quaternion, 'YXZ');
  localEuler.y -= movementX * Math.PI * 2 * 0.0005;
  localEuler.x -= movementY * Math.PI * 2 * 0.0005;
  localEuler.x = Math.min(Math.max(localEuler.x, -Math.PI * 0.35), Math.PI / 2);
  quaternion.setFromEuler(localEuler);

  position.sub(
    localVector.copy(offset)
      .applyQuaternion(quaternion)
  );
};

//

class CameraTarget extends EventTarget {
  constructor() {
    super();

    this.isCameraTarget = true;

    this.targetPosition = new THREE.Vector3(0, 0, 0);
    this.targetQuaternion = new THREE.Quaternion();
    this.targetFov = camera.fov;

    this.sourcePosition = new THREE.Vector3();
    this.sourceQuaternion = new THREE.Quaternion();
    this.sourceFov = camera.fov;
    
    this.lerpStartTime = 0;
    this.lastTimestamp = 0;
  }

  update(timestamp, timeDiff) {
    const {position, quaternion} = camera;

    const lerpTime = 2000;
    const currentTimeFactor = Math.min(Math.max(cubicBezier((timestamp - this.lerpStartTime) / lerpTime), 0), 1);
    position.lerpVectors(this.sourcePosition, this.targetPosition, currentTimeFactor);
    quaternion.slerpQuaternions(this.sourceQuaternion, this.targetQuaternion, currentTimeFactor);

    this.lastTimestamp = timestamp;

    return currentTimeFactor >= 1;
  }

  updateFov(timestamp, timeDiff) {
    const focusTime = Math.min((timestamp - this.lerpStartTime) / maxFocusTime, 1);
    let newFov;
    if (focusTime < 1) {
      const a = this.sourceFov;
      const b = this.targetFov;
      newFov = a * (1 - focusTime) + focusTime * b;
    } else if (this.focus) {
      newFov = midFov;
    } else {
      newFov = camera.fov;
    }

    if (newFov !== camera.fov) {
      camera.fov = newFov;
      camera.updateProjectionMatrix();
    }
  }

  handleMouseMove(e) {
    _applyMouseMove(this.targetPosition, this.targetQuaternion, cameraOffset, e);
  }
}

//

class CameraTargetDynamic extends CameraTarget {
  constructor(target, target2, first) {
    super();

    this.isCameraTargetDynamic = true;

    this.target = target;
    this.target2 = target2;
    this.first = first;

    const _setCameraToDynamicTarget = () => {
      this.target.matrixWorld.decompose(localVector, localQuaternion, localVector2);
      const position1 = localVector;
      const quaternion1 = localQuaternion;
      const scale1 = localVector2;

      if (this.target2) {
        this.target2.matrixWorld.decompose(localVector3, localQuaternion2, localVector4);
        const position2 = localVector3;
        const quaternion2 = localQuaternion2;
        const scale2 = localVector4;

        // where the character is facing
        const faceDirection1 = localVector5.set(0, 0, 1).applyQuaternion(quaternion1);
        // look direction from target1 to target2
        const lookQuaternion = localQuaternion3.setFromRotationMatrix(
          localMatrix.lookAt(
            position1,
            position2,
            upVector,
          )
        );
        const lookDirection = localVector6.set(0, 0, -1).applyQuaternion(lookQuaternion);
        // which side of the character is the camera on
        const sideOfY = getSideOfY(faceDirection1, lookDirection);
        // whether the look is facing along the character (> 0) or away (< 0)
        const face = faceDirection1.dot(lookDirection) >= 0 ? 1 : -1;

        // dolly control point is between the targets, offset to the side of y
        const dollyPosition = localVector7.copy(position1)
          .add(position2)
          .multiplyScalar(0.5)
          .add(
            localVector8.set(sideOfY * -0.3, 0, 0)
              .applyQuaternion(lookQuaternion)
          );

        // set the target position to 1m in the direction of the dolly
        const lookToDollyDirection = localVector9.copy(dollyPosition).sub(position1).normalize();
        this.targetPosition.copy(position1)
          .add(lookToDollyDirection);
        // look from the dolly to the target
        this.targetQuaternion.setFromRotationMatrix(
          localMatrix.lookAt(
            lookToDollyDirection,
            zeroVector,
            upVector
          )
        );

        if (face < 0) { // if looking from the front
          // look at the character's face
          this.targetPosition.add(
            localVector10.set(0, 0, -0.8)
              .applyQuaternion(this.targetQuaternion)
          );
          this.targetQuaternion.multiply(
            localQuaternion4.setFromAxisAngle(upVector, Math.PI)
          );
          this.targetPosition.add(
            localVector10.set(0, 0, 0.8)
              .applyQuaternion(this.targetQuaternion)
          );
        } else if (first) { // if there was no previous target
          // look from the back
          this.targetPosition.add(
            localVector10.set(0, 0, -cameraOffsetDefault)
              .applyQuaternion(this.targetQuaternion)
          );
          this.targetQuaternion.multiply(
            localQuaternion4.setFromAxisAngle(upVector, sideOfY * -Math.PI * 0.87)
          );
          this.targetPosition.add(
            localVector10.set(0, 0, cameraOffsetDefault)
              .applyQuaternion(this.targetQuaternion)
          );
        }
      } else {
        debugger; // never used; we always trigger two targets
        this.targetPosition.copy(localVector)
          .add(localVector2.set(0, 0, 1).applyQuaternion(localQuaternion));
        this.targetQuaternion.copy(localQuaternion);
      }

      this.sourceFov = camera.fov;
      this.targetFov = minFov;

      this.sourcePosition.copy(camera.position);
      this.sourceQuaternion.copy(camera.quaternion);
      
      const timestamp = performance.now();
      this.lerpStartTime = timestamp;
      this.lastTimestamp = timestamp;

      // cameraOffsetZ = -cameraOffsetDefault;
      cameraOffset.z = -cameraOffsetDefault;
    };
    _setCameraToDynamicTarget();
  }
}

//

class CameraTargetStatic extends CameraTarget {
  constructor(target) {
    super();

    this.isCameraTargetStatic = true;

    this.target = target;

    const _setCameraToStaticTarget = () => {
      cameraOffsetTargetZ = -1;
      cameraOffset.z = cameraOffsetTargetZ;

      const localPlayer = playersManager.getLocalPlayer();
      const targetPosition = localVector.copy(localPlayer.position)
        .add(localVector2.set(0, 0, -cameraOffsetTargetZ).applyQuaternion(localPlayer.quaternion));
      const targetQuaternion = localPlayer.quaternion;

      // set
      this.sourcePosition.copy(camera.position);
      this.sourceQuaternion.copy(camera.quaternion);
      this.sourceFov = camera.fov;
      
      this.targetPosition.copy(targetPosition);
      this.targetQuaternion.copy(targetQuaternion);
      this.targetFov = midFov;

      const timestamp = performance.now();
      this.lerpStartTime = timestamp;
      this.lastTimestamp = timestamp;
    };
    _setCameraToStaticTarget();
  }
}

//

class CameraTargetNull extends CameraTarget {
  constructor({
    transformFn,
    clearFn,
  }) {
    super();

    this.isCameraTargetNull = true;

    this.transformFn = transformFn;
    this.clearFn = clearFn;

    this.sourcePosition.copy(camera.position);
    this.sourceQuaternion.copy(camera.quaternion);
    this.sourceFov = camera.fov;

    this.targetFov = minFov;
    
    const timestamp = performance.now();
    this.lerpStartTime = timestamp;
    this.lastTimestamp = timestamp;
  }

  update(timestamp, timeDiff) {
    this.transformFn(this.targetPosition, this.targetQuaternion);

    const done = super.update(timestamp, timeDiff);
    done && this.clearFn();
  }

  handleMouseMove(e) {
    _applyMouseMove(camera.position, camera.quaternion, cameraOffset, e);
  }
}

//

class CameraTargetCinematic extends CameraTarget {
  constructor({
    cinematicScript,
    clearFn,
  }) {
    super();

    this.cinematicScript = cinematicScript;
    this.clearFn = clearFn;

    this.cinematicScriptStartTime = performance.now();
  }

  update(timestamp/*, timeDiff */) {
    const timeDiff = timestamp - this.cinematicScriptStartTime;
    // find the line in the script that we are currently on
    let currentDuration = 0;
    const currentLineIndex = (() => {
      let i;
      for (i = 0; i < this.cinematicScript.length; i++) {
        const currentLine = this.cinematicScript[i];

        if (currentDuration + currentLine.duration > timeDiff) {
          break;
        } else {
          currentDuration += currentLine.duration;
        }
      }
      return i < this.cinematicScript.length ? i : -1;
    })();

    if (currentLineIndex !== -1) {
      // calculate how far into the line we are, in 0..1
      const currentLine = this.cinematicScript[currentLineIndex];
      const {type} = currentLine;
      switch (type) {
        case 'set': {
          camera.position.copy(currentLine.position);
          camera.quaternion.copy(currentLine.quaternion);
          camera.updateMatrixWorld();
          break;
        }
        case 'move': {
          let factor = Math.min(Math.max((timeDiff - currentDuration) / currentLine.duration, 0), 1);
          if (factor < 1) {
            factor = cubicBezier2(factor);
            const previousLine = this.cinematicScript[currentLineIndex - 1];
            
            camera.position.copy(previousLine.position).lerp(currentLine.position, factor);
            camera.quaternion.copy(previousLine.quaternion).slerp(currentLine.quaternion, factor);
            camera.updateMatrixWorld();

            // console.log('previous line', previousLine, camera.position.toArray().join(','), camera.quaternion.toArray().join(','), factor);
            /* if (isNaN(camera.position.x)) {
              debugger;
            } */
          } else {
            this.clearFn();
          }
          break;
        }
        default: {
          throw new Error('unknown cinematic script line type: ' + type);
        }
      }
    } else {
      // console.log('no line', timeDiff, this.cinematicScript.slice());
      this.clearFn();
    }
  }
}

//

class CameraManager extends EventTarget {
  constructor() {
    super();

    this.pointerLockElement = null;
    this.shakes = [];
    this.focus = false;
    this.fovFactor = 0;
    this.lastNonzeroDirectionVector = new THREE.Vector3(0, 0, -1);

    this.cameraTarget = null;

    this.bindEvents();
  }

  bindEvents() {
    if (!isWorker) {
      document.addEventListener('pointerlockchange', e => {
        let pointerLockElement = document.pointerLockElement;
        const renderer = getRenderer();
        if (pointerLockElement !== null && pointerLockElement !== renderer.domElement) {
          pointerLockElement = null;
        }

        this.pointerLockElement = pointerLockElement;
        this.dispatchEvent(new MessageEvent('pointerlockchange', {
          data: {
            pointerLockElement,
          },
        }));
      });
    }
  }

  focusCamera(position) {
    camera.lookAt(position);
    camera.updateMatrixWorld();
  }

  async requestPointerLock() {
    for (const options of [
      {
        unadjustedMovement: true,
      },
      undefined
    ]) {
      try {
        await new Promise((accept, reject) => {
          const renderer = getRenderer();
          if (document.pointerLockElement !== renderer.domElement) {
            if (document.activeElement) {
              document.activeElement.blur();
            }

            const _pointerlockchange = e => {
              accept();
              _cleanup();
            };
            document.addEventListener('pointerlockchange', _pointerlockchange);
            const _pointerlockerror = err => {
              reject(err);
              _cleanup();
              
              /* notifications.addNotification(`\
                <i class="icon fa fa-mouse-pointer"></i>
                <div class=wrap>
                  <div class=label>Whoa there!</div>
                  <div class=text>
                    Hold up champ! The browser wants you to slow down.
                  </div>
                  <div class=close-button>✕</div>
                </div>
              `, {
                timeout: 3000,
              }); */
            };
            document.addEventListener('pointerlockerror', _pointerlockerror);
            const _cleanup = () => {
              document.removeEventListener('pointerlockchange', _pointerlockchange);
              document.removeEventListener('pointerlockerror', _pointerlockerror);
            };
            renderer.domElement.requestPointerLock(options)
              .catch(_pointerlockerror);
          } else {
            accept();
          }
        });
        break;
      } catch (err) {
        console.warn(err);
        continue;
      }
    }
  }

  exitPointerLock() {
    document.exitPointerLock();
  }

  getMode() {
    if (this.cameraTarget) {
      return 'isometric';
    } else {
      return cameraOffset.z > -0.5 ? 'firstperson' : 'isometric';
    }
  }

  getCameraOffset() {
    return cameraOffset;
  }

  handleMouseMove(e) {
    if (this.cameraTarget) {
      this.cameraTarget.handleMouseMove(e);
    } else {
      _applyMouseMove(camera.position, camera.quaternion, this.getCameraOffset(), e);
      camera.updateMatrixWorld();
    }
  }

  handleWheelEvent(e) {
    // if (!this.cameraTarget) {
      cameraOffsetTargetZ = Math.min(cameraOffset.z - e.deltaY * 0.01, 0);
    // }
  }

  addShake(position, intensity, radius, decay) {
    const startTime = performance.now();
    const shake = new Shake(intensity, startTime, radius, decay);
    shake.position.copy(position);
    this.shakes.push(shake);
    return shake;
  }

  flushShakes() {
    if (this.shakes.length > 0) {
      const now = performance.now();
      this.shakes = this.shakes.filter(shake => now < shake.startTime + shake.decay);
    }
  }

  getShakeFactor() {
    let result = 0;
    if (this.shakes.length > 0) {
      const now = performance.now();
      for (const shake of this.shakes) {
        const distanceFactor = Math.min(Math.max((shake.radius - shake.position.distanceTo(camera.position))/shake.radius, 0), 1);
        const timeFactor = Math.min(Math.max(1 - (now - shake.startTime) / shake.decay, 0), 1);
        // console.log('get shake factor', shake.intensity * distanceFactor * timeFactor, shake.intensity, distanceFactor, timeFactor);
        result += shake.intensity * distanceFactor * timeFactor;
      }
    }
    return result;
  }

  setFocus(focus) {
    if (focus !== this.focus) {
      this.focus = focus;

      this.dispatchEvent(new MessageEvent('focuschange', {
        data: {
          focus,
        },
      }));
    }
  }

  setTarget(cameraTarget) {
    this.cameraTarget = cameraTarget;
    
    // if (cameraTarget) {
    //   [
    //     'fovchange',
    //   ].forEach(eventName => {
    //     cameraTarget.addEventListener(eventName, e => {
    //       this.dispatchEvent(new MessageEvent(eventName, {
    //         data: e.data,
    //       }));
    //     });
    //   });
    // }
  }

  setDynamicTarget(
    target = null,
    target2 = null,
    first = true,
  ) {
    if (target) {
      const cameraTarget = new CameraTargetDynamic(target, target2, first);
      this.setTarget(cameraTarget);
    } else {
      this.setCameraToNullTarget();
    }
  }

  setStaticTarget(target = null) {
    if (target) {
      const cameraTarget = new CameraTargetStatic(target);
      this.setTarget(cameraTarget);
    } else {
      this.setCameraToNullTarget();
    }
  }

  setCameraToNullTarget() {
    const cameraTarget = new CameraTargetNull({
      transformFn: (targetPosition, targetQuaternion) => {
        this.#getFreeCameraTarget(targetPosition, targetQuaternion);
      },
      clearFn: () => {
        this.clearTarget(); // done with smoothing
      },
    });
    this.setTarget(cameraTarget);
  }

  clearTarget() {
    this.setTarget(null);
  }

  startCinematicScript(cinematicScript) {
    const cameraTarget = new CameraTargetCinematic({
      cinematicScript,
      clearFn: () => {
        this.setDynamicTarget(); // smooth camera back
      },
    });
    this.setTarget(cameraTarget);
  }

  #getFreeCameraTarget(targetPosition, targetQuaternion) {
    // locals
    const renderer = getRenderer();
    
    const session = renderer.xr.getSession();
    const localPlayer = playersManager.getLocalPlayer();

    // quaternion
    targetQuaternion.copy(camera.quaternion);
    localEuler.setFromQuaternion(targetQuaternion, 'YXZ');
    localEuler.z = 0;
    targetQuaternion.setFromEuler(localEuler);

    // position
    const avatarCameraOffset = session ? rayVectorZero : this.getCameraOffset();
    const avatarHeight = localPlayer.avatar ? localPlayer.avatar.height : 0;
    const crouchOffset = avatarHeight * (1 - localPlayer.getCrouchFactor()) * 0.5;

    switch (this.getMode()) {
      case 'firstperson': {
        if (localPlayer.avatar) {
          const boneNeck = localPlayer.avatar.foundModelBones.Neck;
          const boneEyeL = localPlayer.avatar.foundModelBones.Eye_L;
          const boneEyeR = localPlayer.avatar.foundModelBones.Eye_R;
          const boneHead = localPlayer.avatar.foundModelBones.Head;

          boneNeck.quaternion.setFromEuler(localEuler.set(Math.min(camera.rotation.x * -0.5, 0.6), 0, 0, 'XYZ'));
          boneNeck.updateMatrixWorld();
    
          if (boneEyeL && boneEyeR) {
            boneEyeL.matrixWorld.decompose(localVector2, localQuaternion2, localVector4);
            boneEyeR.matrixWorld.decompose(localVector3, localQuaternion2, localVector4);
            localVector4.copy(localVector2.add(localVector3).multiplyScalar(0.5));
          } else {
            boneHead.matrixWorld.decompose(localVector2, localQuaternion2, localVector4);
            localVector2.add(localVector3.set(0, 0, 0.1).applyQuaternion(localQuaternion2));
            localVector4.copy(localVector2);
          }
        } else {
          localVector4.copy(localPlayer.position);
        }

        targetPosition.copy(localVector4)
          .sub(
            localVector2.copy(avatarCameraOffset)
              .applyQuaternion(targetQuaternion)
          );

        break;
      }
      case 'isometric': {
        targetPosition.copy(localPlayer.position)
          .sub(
            localVector2.copy(avatarCameraOffset)
              .applyQuaternion(targetQuaternion)
          );
  
        break;
      }
      default: {
        throw new Error('invalid camera mode: ' + this.getMode());
      }
    }
    targetPosition.y -= crouchOffset;
  }

  updatePost(timestamp, timeDiff) {
    const _bumpCamera = () => {
      const direction = localVector.set(0, 0, 1)
        .applyQuaternion(camera.quaternion);
      const backOffset = 1;
      // const cameraBackThickness = 0.5;

      const sweepDistance = Math.max(-cameraOffsetTargetZ, 0);

      // console.log('offset', cameraOffsetTargetZ);

      cameraOffsetLimitZ = -Infinity;

      if (sweepDistance > 0) {
        const halfExtents = localVector2.set(0.5, 0.5, 0.1);
        const maxHits = 1;

        const physicsScene = physicsManager.getScene();
        const localPlayer = playersManager.getLocalPlayer();
        const result = physicsScene.sweepBox(
          localVector3.copy(localPlayer.position)
            .add(localVector4.copy(direction).multiplyScalar(backOffset)),
          camera.quaternion,
          halfExtents,
          direction,
          sweepDistance,
          maxHits,
        );
        if (result.length > 0) {
          const distance = result[0].distance;
          cameraOffsetLimitZ = distance < 0.5 ? 0 : -distance;
        }
      }
    };
    const _lerpCameraOffset = () => {
      const lerpFactor = 0.15;
      let cameraOffsetZ = Math.max(cameraOffsetTargetZ, cameraOffsetLimitZ);
      if (cameraOffsetZ > -0.5) {
        cameraOffsetZ = 0;
      }
      cameraOffset.z = cameraOffset.z * (1-lerpFactor) + cameraOffsetZ*lerpFactor;
    };

    if (this.cameraTarget) {
      if (this.cameraTarget.isCameraTargetNull) {
        // if it's a null target lerping out, make sure to bump the camera along the way
        _bumpCamera();
      }
      _lerpCameraOffset();
      this.cameraTarget.update(timestamp, timeDiff);
    } else {
      _bumpCamera();
      _lerpCameraOffset();

      const _setFreeCamera = () => {
        // const targetPosition = localVector;
        // const targetQuaternion = localQuaternion;
        this.#getFreeCameraTarget(camera.position, camera.quaternion);

        // if (this.cameraTarget instanceof CameraTargetNull) {
        //   // XXX move this to the null camera target update loop
        //   const factor = 1; // Math.min((timestamp - this.lerpStartTime) / maxFocusTime, 1);
        //   camera.position.copy(this.cameraTarget.sourcePosition)
        //     .lerp(targetPosition, factor);
        //   camera.quaternion.copy(this.cameraTarget.sourceQuaternion)
        //     .slerp(target, factor);
        // }
      };
      _setFreeCamera();
    };
    const _setCameraFov = () => {
      const _updateSpeedFov = (timestamp, timeDiff) => {
        const fovInTime = 3;
        const fovOutTime = 0.3;
        
        const localPlayer = playersManager.getLocalPlayer();
        const narutoRun = localPlayer.getAction('narutoRun');
        if (narutoRun) {
          if (this.lastNonzeroDirectionVector.z < 0) {    
            this.fovFactor += timeDiff / 1000 / fovInTime;
          } else {
            this.fovFactor -= timeDiff / 1000 / fovInTime;
          }
        } else {
          this.fovFactor -= timeDiff / 1000 / fovOutTime;
        }
        this.fovFactor = Math.min(Math.max(this.fovFactor, 0), 1);

        const newFov = minFov + Math.pow(this.fovFactor, 0.75) * (maxFov - minFov);
        if (newFov !== camera.fov) {
          camera.fov = newFov;
          camera.updateProjectionMatrix();
        }
      };

      const renderer = getRenderer();
      if (!renderer.xr.getSession()) {
        const oldFov = camera.fov;
        if (this.cameraTarget) {
          this.cameraTarget.updateFov(timestamp, timeDiff);
          this.fovFactor = 0;
        } else {
          _updateSpeedFov(timestamp, timeDiff);
        }
        if (camera.fov !== oldFov) {
          this.dispatchEvent(new MessageEvent('fovchange', {
            data: {
              fov: camera.fov,
            },
          }));
        }
      }
    };
    _setCameraFov();

    const _shakeCamera = () => {
      this.flushShakes();
      const shakeFactor = this.getShakeFactor();
      if (shakeFactor > 0) {
        const baseTime = timestamp/1000 * shakeAnimationSpeed;
        const timeOffset = 1000;
        const ndc = f => (-0.5 + f) * 2;
        let index = 0;
        const randomValue = () => ndc(shakeNoise.noise1D(baseTime + timeOffset * index++));
        localVector.set(
          randomValue(),
          randomValue(),
          randomValue()
        )
          .normalize()
          .multiplyScalar(shakeFactor * randomValue());
        camera.position.add(localVector);
      }
    };
    _shakeCamera();

    camera.updateMatrixWorld();
  }
};
const cameraManager = new CameraManager();
export default cameraManager;