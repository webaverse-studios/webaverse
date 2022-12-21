import * as THREE from 'three';
import easing from '../easing.js';
import {
  playersManager,
} from '../players-manager.js';
// import {
//   scene,
// } from '../renderer.js';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();
const localPlane = new THREE.Plane();

//

const cubicBezier = easing(0, 1, 0, 1);

//

// const cubeMesh = new THREE.Mesh(
//   new THREE.BoxBufferGeometry(0.2, 0.2, 0.2),
//   new THREE.MeshBasicMaterial({
//     color: 0x0000FF,
//     // wireframe: true,
//     depthTest: false,
//     depthWrite: true,
//   })
// );
// cubeMesh.frustumCulled = false;
// scene.add(cubeMesh);
// globalThis.cubeMesh = cubeMesh;

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
function getRotationFromUp(x, y) {
  let angle = Math.atan2(y, x) - Math.PI / 2;
  while (angle < -Math.PI) {
    angle += Math.PI * 2;
  }
  while (angle > Math.PI) {
    angle -= Math.PI * 2;
  }
  return angle;
}
function getSignedAngle(x1, y1, x2, y2) {
  const angle1 = getRotationFromUp(x1, y1);
  const angle2 = getRotationFromUp(x2, y2)
  return angle2 - angle1;
}
function setAnimatedCamera(
  camera,
  srcCamera,
  followView,
  cameraZ,
  edgeDepths,
  matrixWorld,
  srcCameraAnimation
) {
  const _adjust = () => {
    const localPlayer = playersManager.getLocalPlayer();
    // compute the camera offset
    localPlane.setFromNormalAndCoplanarPoint(
      localVector.set(0, 0, -1).applyQuaternion(camera.quaternion),
      camera.position
    );
    // if the player is in front of the camera
    let cameraOffset;
    if (localPlane.distanceToPoint(localPlayer.position) > 0) {
      const f = Math.min(Math.max(cameraZ / 5, 0), 1);
      cameraOffset = localVector.copy(localPlayer.position)
        .sub(camera.position)
        .multiplyScalar(f);
    } else {
      cameraOffset = localVector.set(0, 0, 0);
    }

    camera.position.add(cameraOffset);
    if (followView && cameraZ > 0) {
      camera.quaternion.setFromRotationMatrix(
        localMatrix.lookAt(
          localVector2.set(0, 0, 0),
          cameraOffset,
          localVector3.set(0, 1, 0)
        )
      );

      // edgeDepth
      // const farScale = 1000;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      // XXX do not clip from the center, but the side
      const leftEdgeDepth = edgeDepths.left.clone()
        // .multiplyScalar(farScale)
        .applyMatrix4(matrixWorld)
        .sub(camera.position);
      const rightEdgeDepth = edgeDepths.right.clone()
        // .multiplyScalar(farScale)
        .applyMatrix4(matrixWorld)
        .sub(camera.position);
      const topEdgeDepth = edgeDepths.top.clone()
        // .multiplyScalar(farScale)
        .applyMatrix4(matrixWorld)
        .sub(camera.position);
      const bottomEdgeDepth = edgeDepths.bottom.clone()
        // .multiplyScalar(farScale)
        .applyMatrix4(matrixWorld)
        .sub(camera.position);
      const leftFovDiff = getSignedAngle(
        forward.x, -forward.z,
        leftEdgeDepth.x, -leftEdgeDepth.z
      );
      const rightFovDiff = getSignedAngle(
        forward.x, -forward.z,
        rightEdgeDepth.x, -rightEdgeDepth.z
      );
      const topFovDiff = getSignedAngle(
        -forward.y, -forward.z,
        -topEdgeDepth.y, -topEdgeDepth.z
      );
      const bottomFovDiff = getSignedAngle(
        -forward.y, -forward.z,
        -bottomEdgeDepth.y, -bottomEdgeDepth.z
      );

      // // XXX debugging
      // cubeMesh.position.copy(edgeDepths.bottom)
      //   .applyMatrix4(matrixWorld);
      // cubeMesh.updateMatrixWorld();

      localEuler.setFromQuaternion(camera.quaternion, 'YXZ');
      // const fovRadians = camera.fov * Math.PI / 180;
      if (leftFovDiff < 0 && leftFovDiff >= -Math.PI / 2) {
        localEuler.y += leftFovDiff;
      } else if (rightFovDiff > 0 && rightFovDiff <= Math.PI / 2) {
        localEuler.y += rightFovDiff;
      }
      if (topFovDiff < 0 && topFovDiff >= -Math.PI / 2) {
        localEuler.x += topFovDiff;
      } else if (bottomFovDiff > 0 && bottomFovDiff <= Math.PI / 2) {
        localEuler.x += bottomFovDiff;
      }
      camera.quaternion.setFromEuler(localEuler);
      // if (localEuler.y ) {
      //   localEuler.y = -fovRadians / 2 - leftFovDiff;
      // }
      globalThis.depths = {
        top: edgeDepths.top,
        bottom: edgeDepths.bottom,
        left: edgeDepths.left,
        right: edgeDepths.right,
        cameraPosition: camera.position.clone(),
        forward: forward.clone(),
        topFovDiff,
        bottomFovDiff,
        leftFovDiff,
        rightFovDiff,
        leftEdgeDepth,
        rightEdgeDepth,
        topEdgeDepth,
        bottomEdgeDepth,
      };
    }
  };

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
      _adjust();
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      return true;
    } else {
      camera.copy(srcCamera);
      _adjust();
      camera.updateMatrixWorld();
      return false;
    }
  } else {
    camera.copy(srcCamera);
    _adjust();
    camera.updateMatrixWorld();
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
    if (options.followView === undefined) {
      options.followView = true;
    }

    this.camera = camera;
    this.options = options;

    this.cameraLocked = false;
    this.lockCamera = new THREE.PerspectiveCamera();
    this.oldCamera = new THREE.PerspectiveCamera();
    this.lockCameraAnimation = null;

    this.edgeDepths = {
      top: new THREE.Vector3(),
      bottom: new THREE.Vector3(),
      left: new THREE.Vector3(),
      right: new THREE.Vector3(),
    };
    this.edgeMatrixWorld = new THREE.Matrix4();

    this.mousePosition = new THREE.Vector2();

    this.cameraZ = 0;
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

  setEdgeDepths(edgeDepths, matrixWorld, scaleArray) {
    // console.log('edge depths 1', this, edgeDepths, scaleArray);
    this.edgeDepths.top.fromArray(edgeDepths.top)
      // .multiply(localVector.fromArray(scaleArray));
    this.edgeDepths.bottom.fromArray(edgeDepths.bottom)
      // .multiply(localVector.fromArray(scaleArray));
    this.edgeDepths.left.fromArray(edgeDepths.left)
      // .multiply(localVector.fromArray(scaleArray));
    this.edgeDepths.right.fromArray(edgeDepths.right)
      // .multiply(localVector.fromArray(scaleArray));
    console.log('set edge depths', edgeDepths, matrixWorld.toArray());
    // debugger;
    this.edgeMatrixWorld.copy(matrixWorld);
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

  handleMouseWheel(e) {
    if (this.cameraLocked) {
      this.cameraZ -= e.deltaY * 0.01;
      this.cameraZ = Math.min(Math.max(this.cameraZ, 0), 5);
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