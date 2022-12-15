import * as THREE from 'three';
import {camera, rootScene} from './renderer.js';
import easing from './easing.js';

//

const cubicBezier = easing(0, 1, 0, 1);

//

class StoryCameraManager extends EventTarget {
  constructor() {
    super();

    this.cameraLocked = false;
    this.lockCamera = new THREE.PerspectiveCamera();
    this.oldCamera = new THREE.PerspectiveCamera();
  }

  setLockCamera(camera) {
    this.lockCamera.copy(camera);
  }
  toggleCameraLock() {
    this.cameraLocked = !this.cameraLocked;

    if (this.cameraLocked) {
      this.oldCamera.copy(camera);
    } else {
      camera.copy(this.oldCamera);
    }
  }

  handleMouseMove(e) {
    if (this.cameraLocked) {
      this.dispatchEvent(new MessageEvent('mousemove', {
        data: {
          movementX: e.movementX,
          movementY: e.movementY,
        },
      }));
      return true;
    } else {
      return false;
    }
  }

  handleWheelEvent(e) {
    if (this.cameraLocked) {
      // if (!this.target) {
      //   cameraOffsetTargetZ = Math.min(cameraOffset.z - e.deltaY * 0.01, 0);
      // }
      return true;
    } else {
      return false;
    }
  }

  updatePost(timestamp, timeDiff) {
    if (this.cameraLocked) {
      // const _shakeCamera = () => {
      //   this.flushShakes();
      //   const shakeFactor = this.getShakeFactor();
      //   if (shakeFactor > 0) {
      //     const baseTime = timestamp/1000 * shakeAnimationSpeed;
      //     const timeOffset = 1000;
      //     const ndc = f => (-0.5 + f) * 2;
      //     let index = 0;
      //     const randomValue = () => ndc(shakeNoise.noise1D(baseTime + timeOffset * index++));
      //     localVector.set(
      //       randomValue(),
      //       randomValue(),
      //       randomValue()
      //     )
      //       .normalize()
      //       .multiplyScalar(shakeFactor * randomValue());
      //     camera.position.add(localVector);
      //   }
      // };
      // _shakeCamera();

      const _setLocked = () => {
        camera.copy(this.lockCamera);
        const aspect = window.innerWidth / window.innerHeight;
        setCameraToSquareFovAspect(this.lockCamera.fov, aspect, camera);

        function radToDeg(rad) {
          return rad * 180 / Math.PI;
        }
        function degToRad(deg) {
          return deg * Math.PI / 180;
        }
        // given an ideal square fov (in degrees) and new aspect ratio,
        // set the camera to be contained within the the original square fov
        // calculate a new fov and aspect ratio that will fit the original square fov
        // this requires zooming in and clipping
        // camera is a THREE.PerspectiveCamera
        function setCameraToSquareFovAspect(squareFov, aspect, camera) {
          // first, calculate the new min fov of vertical/horizontal
          const fovH = radToDeg(2 * Math.atan(Math.tan(degToRad(squareFov) / 2) * aspect));
          const fovV = radToDeg(2 * Math.atan(Math.tan(degToRad(squareFov) / 2) / aspect));
          const newFov = Math.min(fovH, fovV);
          const newAspect = Math.max(fovH, fovV) / Math.min(fovH, fovV);

          camera.fov = newFov;
          camera.aspect = newAspect;
          camera.updateProjectionMatrix();
        }
      };
      _setLocked();

      return true;
    } else {
      return false;
    }
  }
};
const storyCameraManager = new StoryCameraManager();
export default storyCameraManager;