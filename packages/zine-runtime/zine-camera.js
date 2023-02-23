import * as THREE from 'three';
import easing from './easing.js';
// import {
//   playersManager,
// } from '../players-manager.js';
// import {
//   scene,
// } from '../renderer.js';

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

/* // XXX debugging

const _makeCubeMesh = ({
  color = 0x00FF00,
} = {}) => {
  return new THREE.Mesh(
    new THREE.BoxBufferGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({
      color,
      // wireframe: true,
      // depthTest: false,
      // depthWrite: true,
    })
  );
}
const cubeMesh = _makeCubeMesh({
  color: 0x00FF00, // green
});
cubeMesh.frustumCulled = false;
scene.add(cubeMesh);
globalThis.cubeMesh = cubeMesh;
const cubeMesh2 = _makeCubeMesh({
  color: 0x00FFFF, // cyan
});
cubeMesh2.frustumCulled = false;
scene.add(cubeMesh2);
{
  const cubeMesh22 = _makeCubeMesh({
    color: 0xFF00FF, // magenta
  });
  cubeMesh22.scale.set(0.1, 2, 0.1);
  // cubeMesh2.position.y += 0.05;
  cubeMesh2.add(cubeMesh22);
  cubeMesh22.updateMatrixWorld();
}
globalThis.cubeMesh2 = cubeMesh2;
const cubeMesh3 = _makeCubeMesh({
  color: 0xFFFF00, // yellow
});
cubeMesh3.frustumCulled = false;
scene.add(cubeMesh3);
globalThis.cubeMesh3 = cubeMesh3;

const planeMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshBasicMaterial({
    color: 0x00FFFF,
    // wireframe: true,
    // depthTest: false,
    // depthWrite: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  })
);
planeMesh.frustumCulled = false;
scene.add(planeMesh);
globalThis.planeMesh = planeMesh; */

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
  localPlayer,
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
            .applyQuaternion(srcCamera.quaternion)
        );
      }
    }
    
    // apply camera wheel offset
    // const localPlayer = playersManager.getLocalPlayer();
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
      const localVector = new THREE.Vector3();
      const localVector2 = new THREE.Vector3();
      const localVector3 = new THREE.Vector3();
      const localVector4 = new THREE.Vector3();
      const localQuaternion = new THREE.Quaternion();
      const localMatrix = new THREE.Matrix4();

      // look at the player
      camera.quaternion.setFromRotationMatrix(
        localMatrix.lookAt(
          camera.position,
          localPlayer.position,
          localVector3.set(0, 1, 0)
        )
      );
      camera.updateMatrixWorld();

      // clip camera position
      const _pushByCameraPositionDistance = d => {
        const delta = normal.clone().multiplyScalar(-d);
        camera.position.add(delta);
      };
      const _clipCameraPosition = () => {
        const d = pushPlane.distanceToPoint(camera.position);
        if (d < 0) {
          _pushByCameraPositionDistance(d);
          camera.updateMatrixWorld();
        }
      };
      // _clipCameraPosition();

      // clip frustum planes using corner points
      const _clipPlane = (direction, up, worldMinPoint) => {
        // edge point
        localMatrix.makeTranslation(worldMinPoint.x, worldMinPoint.y, worldMinPoint.z)
          .premultiply(matrixWorld)
          .decompose(localVector, localQuaternion, localVector2);
        const edgeDepth = localVector;

        // edge direction
        const edgeDirection = localVector2.copy(edgeDepth)
          .sub(camera.position)
          .normalize();

        // push plane
        const normal = localVector3.copy(edgeDirection)
          .cross(
            localVector4.copy(up).applyQuaternion(srcCamera.quaternion)
          )
          .normalize();
        const pushPlane = localPlane.setFromNormalAndCoplanarPoint(normal, edgeDepth);

        // XXX debug meshes
        // planeMesh.position.copy(edgeDepth);
        // planeMesh.quaternion.setFromRotationMatrix(
        //   localMatrix.lookAt(
        //     new THREE.Vector3(0, 0, 0),
        //     normal,
        //     localVector4.copy(up).applyQuaternion(srcCamera.quaternion)
        //   )
        // );
        // planeMesh.updateMatrixWorld();

        const _pushByCameraCornerClipPoint = (clipPoint, clipPointNdc) => {
          const correctionPoint = localPlane.projectPoint(
            clipPoint,
            localVector4
          );

          // get the correction point by raycasting in the opposite direction, applied by the camera
          // localRay.set(
          //   clipPoint,
          //   direction.clone()
          //     .multiplyScalar(-1)
          //     .applyQuaternion(camera.quaternion)
          // );
          // const correctionPoint = localRay.intersectPlane(pushPlane, localVector4);

          if (correctionPoint) {
            // cubeMesh3.position.copy(correctionPoint);
            // cubeMesh3.quaternion.copy(camera.quaternion);
            // cubeMesh3.updateMatrixWorld();




            // shift the camera by the correction point
            // const delta = localVector5.copy(correctionPoint)
            //   .sub(clipPoint);
            // camera.position.add(delta);
            // camera.updateMatrixWorld();
            // console.log('delta', delta.length());



            
            // project the correction point onto the camera
            // const correctionPointCameraSpace = correctionPoint.clone().project(camera);

            // // compute the x rotation angle between two points in ndc space
            // function computeNdcAngleX(point1, point2) {
            //   const angle1 = getRotationFromUp(point1.x, point1.y);
            //   const angle2 = getRotationFromUp(point2.x, point2.y);
            //   return angle2 - angle1;
            // }
            // const angle = computeNdcAngleX(clipPointNdc, correctionPointCameraSpace);



            const clipPointSubCamera = clipPoint.clone().sub(camera.position);
            const correctionPointSubCamera = correctionPoint.clone().sub(camera.position);
            const angle = clipPointSubCamera.angleTo(correctionPointSubCamera);
            console.log('clip corner', direction.toArray().join(','), angle / (Math.PI * 2));

            const correctionQuaternion = new THREE.Quaternion().setFromAxisAngle(
              // up.clone().applyQuaternion(camera.quaternion),
              up.clone().applyQuaternion(camera.quaternion),
              // up,
              -angle
            )
            camera.quaternion.premultiply(correctionQuaternion);
          }
        };
        {
          const clipArmLength = 10;

          let clipIndex = -1;
          let clipDistance = Infinity;
          const axis = up.clone();
          axis.x = Math.abs(axis.x);
          axis.y = Math.abs(axis.y);
          axis.z = Math.abs(axis.z);
          const cameraCornerPointNdcs = [
            new THREE.Vector3(direction.x, direction.y, (clipArmLength - camera.near) / (camera.far - camera.near))
              .add(axis),
            new THREE.Vector3(direction.x, direction.y, (clipArmLength - camera.near) / (camera.far - camera.near))
              .sub(axis),
            // new THREE.Vector3(-direction.x, -direction.y, 0).add(axis),
            // new THREE.Vector3(-direction.x, -direction.y, 0).sub(axis),
          ];
          const cameraCornerPoints = cameraCornerPointNdcs.map(p => {
            return p.clone().unproject(camera);
          });

          // cubeMesh.position.copy(new THREE.Vector3(direction.x, direction.y, 1).sub(axis).unproject(camera));
          // cubeMesh.quaternion.copy(camera.quaternion);
          // cubeMesh.updateMatrixWorld();

          for (let i = 0; i < cameraCornerPoints.length; i++) {
            const cameraCornerPoint = cameraCornerPoints[i];
            const d = pushPlane.distanceToPoint(cameraCornerPoint);
            if (d < 0 && d < clipDistance) {
              clipIndex = i;
              clipDistance = d;
            }
          }
          if (clipIndex !== -1) { // if any point clipped the plane
            // get the clip point and correction point
            const clipPoint = cameraCornerPoints[clipIndex];
            const clipPointNdc = cameraCornerPointNdcs[clipIndex];
            _pushByCameraCornerClipPoint(clipPoint, clipPointNdc);
            camera.updateMatrixWorld();

            // cubeMesh2.position.copy(new THREE.Vector3(direction.x, direction.y, 0).sub(axis).unproject(camera));
            // cubeMesh2.quaternion.copy(camera.quaternion);
            // cubeMesh2.updateMatrixWorld();
          }
        }
      };
      // _clipPlane(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), edgeDepths.left.min);
      // _clipPlane(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0), edgeDepths.right.min);
      // _clipPlane(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), edgeDepths.top.min);
      // _clipPlane(new THREE.Vector3(0, -1, 0), new THREE.Vector3(-1, 0, 0), edgeDepths.bottom.min);
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
  constructor({
    camera,
    localPlayer,
  }, options = {}) {
    super();

    if (options.normalizeView === undefined) {
      options.normalizeView = true;
    }
    if (options.followView === undefined) {
      options.followView = true;
    }

    this.camera = camera;
    this.localPlayer = localPlayer;
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
      const {movementX, movementY} = e;
      const rate = 0.002;
      this.mousePosition.x += movementX * rate;
      this.mousePosition.y += movementY * rate;

      this.mousePosition.x = Math.min(Math.max(this.mousePosition.x, -1), 1);
      this.mousePosition.y = Math.min(Math.max(this.mousePosition.y, -1), 1);
      return true;
    } else {
      return false;
    }
  }

  handleMouseWheel(e) {
    if (this.cameraLocked) {
      this.cameraZ -= e.deltaY * 0.01;
      this.cameraZ = Math.min(Math.max(this.cameraZ, 0), 5);
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
          this.localPlayer,
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