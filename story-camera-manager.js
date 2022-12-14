import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {camera, rootScene} from './renderer.js';
import easing from './easing.js';

//

const cubicBezier = easing(0, 1, 0, 1);

//

class StoryTargetMesh extends THREE.Mesh {
  constructor() {
    const baseHeight = 0.2;
    const baseWidth = 0.03;
    const centerSpacing = baseWidth;
    
    const _addYs = geometry => {
      const ys = new Float32Array(geometry.attributes.position.array.length / 3);
      for (let i = 0; i < ys.length; i++) {
        ys[i] = 1 - geometry.attributes.position.array[i * 3 + 1] / baseHeight;
      }
      geometry.setAttribute('y', new THREE.BufferAttribute(ys, 1));
    };
    const _addDirection = (geometry, direction) => {
      const directions = new Float32Array(geometry.attributes.position.array.length);
      for (let i = 0; i < directions.length / 3; i++) {
        directions[i + 0] = direction.x;
        directions[i + 1] = direction.y;
        directions[i + 2] = direction.z;
      }
      geometry.setAttribute('direction', new THREE.BufferAttribute(directions, 3));
    };

    // top geometry
    const topGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseWidth)
      .translate(0, baseHeight / 2 + centerSpacing, 0);
    _addYs(topGeometry);
    _addDirection(topGeometry, new THREE.Vector3(0, 1, 0));
    // other geometries
    const leftGeometry = topGeometry.clone()
      .rotateZ(Math.PI / 2);
    _addDirection(leftGeometry, new THREE.Vector3(-1, 0, 0));
    const bottomGeometry = topGeometry.clone()
      .rotateZ(Math.PI);
    _addDirection(bottomGeometry, new THREE.Vector3(0, -1, 0));
    const rightGeometry = topGeometry.clone()
      .rotateZ(-Math.PI / 2);
    _addDirection(bottomGeometry, new THREE.Vector3(1, 0, 0));
    const forwardGeometry = topGeometry.clone()
      .rotateX(-Math.PI / 2);
    _addDirection(bottomGeometry, new THREE.Vector3(0, 0, -1));
    const backGeometry = topGeometry.clone()
      .rotateX(Math.PI / 2);
    _addDirection(bottomGeometry, new THREE.Vector3(0, 0, 1));
    // merged geometry
    const geometries = [
      topGeometry,
      leftGeometry,
      bottomGeometry,
      rightGeometry,
      forwardGeometry,
      backGeometry,
    ];
    const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
    
    // const material = new THREE.MeshBasicMaterial({
    //   color: 0x333333,
    // });
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          value: 0,
          needsUpdate: true,
        },
        uPress: {
          value: 0,
          needsUpdate: true,
        },
      },
      vertexShader: `\
        uniform float uTime;
        uniform float uPress;
        attribute float y;
        attribute vec3 direction;
        varying float vY;
        varying vec2 vUv;
        varying vec3 vDirection;

        void main() {
          vUv = uv;
          vY = y;
          vDirection = direction; // XXX offset by direction and time
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `\
        varying vec2 vUv;
        varying float vY;
        varying vec3 vDirection;

        void main() {
          vec3 c = vec3(0.1, 0.1, 0.1);
          gl_FragColor = vec4(c, 1.);
          gl_FragColor.rgb += vY * 0.15;
          // gl_FragColor.rg += vUv * 0.2;
        }
      `,
      transparent: true,
    });

    super(geometry, material);

    this.name = 'storyTargetMesh';
  }
}

//

class StoryCameraManager extends EventTarget {
  constructor() {
    super();

    this.cameraLocked = false;
    this.lockCamera = new THREE.PerspectiveCamera();
    this.oldCamera = new THREE.PerspectiveCamera();

    this.storyTargetMesh = new StoryTargetMesh();
    this.storyTargetMesh.visible = false;
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
      const {movementX, movementY} = e;

      // camera.position.add(localVector.copy(this.getCameraOffset()).applyQuaternion(camera.quaternion));
    
      // camera.rotation.y -= movementX * Math.PI * 2 * 0.0005;
      // camera.rotation.x -= movementY * Math.PI * 2 * 0.0005;
      // camera.rotation.x = Math.min(Math.max(camera.rotation.x, -Math.PI * 0.35), Math.PI / 2);
      // camera.quaternion.setFromEuler(camera.rotation);

      // camera.position.sub(localVector.copy(this.getCameraOffset()).applyQuaternion(camera.quaternion));

      // camera.updateMatrixWorld();

      // if (!this.target) {
      //   this.targetQuaternion.copy(camera.quaternion);
      // }
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
rootScene.add(storyCameraManager.storyTargetMesh);
export default storyCameraManager;