import * as THREE from 'three';
import easing from '../easing.js';
import {
  playersManager,
} from '../players-manager.js';
import {
  scene,
  // rootScene,
} from '../renderer.js';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();
const localPlane = new THREE.Plane();
const localRay = new THREE.Ray();

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
    // clip camera to near edge
    {
      // compute the edge near z
      const edgeNearZ = Math.min(
        edgeDepths.top.max.z,
        edgeDepths.bottom.max.z,
        edgeDepths.right.max.z,
        edgeDepths.left.max.z,
      );
      // apply near offset
      if (followView && cameraZ > 0) {
        camera.position.add(
          localVector.set(0, 0, edgeNearZ)
            .applyQuaternion(camera.quaternion)
        );
      }
    }
    
    // apply camera wheel offset
    const localPlayer = playersManager.getLocalPlayer();
    {
      localPlane.setFromNormalAndCoplanarPoint(
        localVector.set(0, 0, -1).applyQuaternion(camera.quaternion),
        camera.position
      );
      let cameraOffset;
      if (localPlane.distanceToPoint(localPlayer.position) > 0) { // if the player is in front of the camera
        const f = Math.min(Math.max(cameraZ / 5, 0), 1);
        cameraOffset = localVector.copy(localPlayer.position)
          .sub(camera.position)
          .multiplyScalar(f);
      } else { // else if the player is behind the camera
        cameraOffset = localVector.set(0, 0, 0);
      }
      camera.position.add(cameraOffset);
    }

    // follow view
    if (followView && cameraZ > 0) {
      camera.quaternion.setFromRotationMatrix(
        localMatrix.lookAt(
          // localVector2.set(0, 0, 0),
          // cameraOffset,
          camera.position,
          localPlayer.position,
          localVector3.set(0, 1, 0)
        )
      );

      // edgeDepth
      // const farScale = 1000;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      // XXX do not clip from the center, but the side
      const leftEdgeDepth = edgeDepths.left.min.clone()
        // .multiplyScalar(farScale)
        .applyMatrix4(matrixWorld)
        .sub(camera.position);
      const rightEdgeDepth = edgeDepths.right.min.clone()
        // .multiplyScalar(farScale)
        .applyMatrix4(matrixWorld)
        .sub(camera.position);
      const topEdgeDepth = edgeDepths.top.min.clone()
        // .multiplyScalar(farScale)
        .applyMatrix4(matrixWorld)
        .sub(camera.position);
      const bottomEdgeDepth = edgeDepths.bottom.min.clone()
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

      // globalThis.depths = {
      //   top: edgeDepths.top,
      //   bottom: edgeDepths.bottom,
      //   left: edgeDepths.left,
      //   right: edgeDepths.right,
      //   cameraPosition: camera.position.clone(),
      //   forward: forward.clone(),
      //   topFovDiff,
      //   bottomFovDiff,
      //   leftFovDiff,
      //   rightFovDiff,
      //   leftEdgeDepth,
      //   rightEdgeDepth,
      //   topEdgeDepth,
      //   bottomEdgeDepth,
      // };
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

    const _makeMinMax = () => {
      return {
        min: new THREE.Vector3(),
        max: new THREE.Vector3(),
      };
    };
    this.edgeDepths = {
      top: _makeMinMax(),
      bottom: _makeMinMax(),
      left: _makeMinMax(),
      right: _makeMinMax(),
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
  }

  setEdgeDepths(edgeDepths, matrixWorld) {
    this.edgeDepths.top.min.fromArray(edgeDepths.top.min);
    this.edgeDepths.top.max.fromArray(edgeDepths.top.max);

    this.edgeDepths.bottom.min.fromArray(edgeDepths.bottom.min);
    this.edgeDepths.bottom.max.fromArray(edgeDepths.bottom.max);
    
    this.edgeDepths.left.min.fromArray(edgeDepths.left.min);
    this.edgeDepths.left.max.fromArray(edgeDepths.left.max);

    this.edgeDepths.right.min.fromArray(edgeDepths.right.min);
    this.edgeDepths.right.max.fromArray(edgeDepths.right.max);

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
        if (!setAnimatedCamera(
          this.camera,
          this.lockCamera,
          !!this.options.followView,
          this.cameraZ,
          this.edgeDepths,
          this.edgeMatrixWorld,
          this.lockCameraAnimation
        )) {
          this.lockCameraAnimation = null;
        }

        if (this.options.normalizeView) {
          const aspect = window.innerWidth / window.innerHeight;
          setCameraToContainer(aspect, this.camera);
        }

        function radToDeg(rad) {
          return rad * 180 / Math.PI;
        }
        function degToRad(deg) {
          return deg * Math.PI / 180;
        }
        // given the aspect ratio, set the camera to be contains
        function setCameraToContainer(aspect, camera) {
          // first, decide whether we are clipping horizontally or vertically
          if (aspect > 1) { // horizontal
            // set the fov to be the vertical fov
            camera.fov = radToDeg(Math.atan(Math.tan(degToRad(camera.fov) / 2) / aspect) * 2);
          } else { // vertical
            // set the fov to be the horizontal fov
            camera.fov = radToDeg(Math.atan(Math.tan(degToRad(camera.fov) / 2) * aspect) * 2);
          }
          // fix the aspect ratio
          camera.aspect = aspect;
          // update the camera projection matrix
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