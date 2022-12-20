import * as THREE from 'three';
import easing from '../easing.js';
// import {
//   camera,
// } from '../renderer.js';

//

const cubicBezier = easing(0, 1, 0, 1);

//

function makeCameraAnimation(oldCamera, newCamera, timeMs) {
  const _getCameraSpec = camera => ({
    position: camera.position.clone(),
    quaternion: camera.quaternion.clone(),
    near: camera.near,
    far: camera.far,
    fov: camera.fov,
    aspect: camera.aspect,
  });
  const startTime = performance.now();
  const endTime = startTime + timeMs;
  return {
    start: _getCameraSpec(oldCamera),
    end: _getCameraSpec(newCamera),
    startTime,
    endTime,
  };
}
function lerpScalar(a, b, t) {
  return a + (b - a) * t;
}
function setAnimatedCamera(camera, srcCamera, srcCameraAnimation) {
  if (srcCameraAnimation) {
    const {start, end, startTime, endTime} = srcCameraAnimation;

    const now = performance.now();
    const f = (now - startTime) / (endTime - startTime);

    if (f < 1) {
      const t = cubicBezier(f);
      camera.position.lerpVectors(start.position, end.position, t);
      camera.quaternion.slerpQuaternions(start.quaternion, end.quaternion, t);
      camera.near = lerpScalar(start.near, end.near, t);
      camera.far = lerpScalar(start.far, end.far, t);
      camera.fov = lerpScalar(start.fov, end.fov, t);
      camera.aspect = lerpScalar(start.aspect, end.aspect, t);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      return true;
    } else {
      camera.copy(srcCamera);
      return false;
    }
  } else {
    camera.copy(srcCamera);
    return false;
  }
}

//

export class ZineCameraManager extends EventTarget {
  constructor(camera, options = {}) {
    super();

    if (options.normalizeView === undefined) {
      options.normalizeView = true;
    }

    this.camera = camera;
    this.options = options;

    this.cameraLocked = false;
    this.lockCamera = new THREE.PerspectiveCamera();
    this.oldCamera = new THREE.PerspectiveCamera();
    this.lockCameraAnimation = null;

    this.mousePosition = new THREE.Vector2();
  }

  setLockCamera(camera) {
    this.lockCamera.copy(camera);
  }
  toggleCameraLock() {
    this.cameraLocked = !this.cameraLocked;

    if (this.cameraLocked) {
      this.oldCamera.copy(this.camera);
    } else {
      this.camera.copy(this.oldCamera);
    }
  }
  transitionLockCamera(newCamera, timeMs) {
    const oldCamera = this.lockCamera;
    this.lockCameraAnimation = makeCameraAnimation(oldCamera, newCamera, timeMs);
    // console.log('lock camera animation', this.lockCameraAnimation);
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
      const _setLocked = () => {
        if (!setAnimatedCamera(this.camera, this.lockCamera, this.lockCameraAnimation)) {
          this.lockCameraAnimation = null;
        }

        if (this.options.normalizeView) {
          const aspect = window.innerWidth / window.innerHeight;
          setCameraToSquareFovAspect(this.lockCamera.fov, aspect, this.camera);
        }

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
}