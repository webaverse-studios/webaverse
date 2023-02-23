import * as THREE from 'three';
// import physicsManager from '../physics/physics-manager.js';
// import {shakeAnimationSpeed, minFov, maxFov, midFov} from '../constants.js';
// import Simplex from '../simplex-noise.js';
// import easing from '../easing.js';
// import {isWorker} from '../env.js';

// const cubicBezier = easing(0, 1, 0, 1);
// const cubicBezier2 = easing(0.5, 0, 0.5, 1);

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

export class PointerLockManager extends EventTarget {
  constructor({
    engine,
  }) {
    super();

    // members
    if (!engine) {
      console.warn('missing required arguments', {
        engine,
      });
      throw new Error('missing required arguments');
    }
    this.engine = engine;

    // locals
    this.pointerLockElement = null;

    // initialize
    this.#listen();
  }

  #listen() {
    document.addEventListener('pointerlockchange', e => {
      let pointerLockElement = document.pointerLockElement;
      // const renderer = getRenderer();
      const {dstCanvas: canvas} = this.engine;
      if (pointerLockElement !== null && pointerLockElement !== canvas) {
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

  async requestPointerLock() {
    // const localPointerLockEpoch = ++this.pointerLockEpoch;
    for (const options of [
      {
        unadjustedMovement: true,
      },
      undefined
    ]) {
      try {
        await new Promise((accept, reject) => {
          // const renderer = getRenderer();
          const {dstCanvas: canvas} = this.engine;
          if (document.pointerLockElement !== canvas) {
            if (document.activeElement) {
              document.activeElement.blur();
            }

            const _pointerlockchange = e => {
              // if (localPointerLockEpoch === this.pointerLockEpoch) {
                accept();
              // }
              _cleanup();
            };
            document.addEventListener('pointerlockchange', _pointerlockchange);
            const _pointerlockerror = err => {
              reject(err);
              _cleanup();
            };
            document.addEventListener('pointerlockerror', _pointerlockerror);
            const _cleanup = () => {
              document.removeEventListener('pointerlockchange', _pointerlockchange);
              document.removeEventListener('pointerlockerror', _pointerlockerror);
            };
            const {dstCanvas: canvas} = this.engine;
            canvas.requestPointerLock(options)
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
}
// const cameraManager = new CameraManager();
// export default cameraManager;