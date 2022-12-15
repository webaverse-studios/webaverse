import * as THREE from 'three';
// import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  ZineStoryboard,
  zineMagicBytes,
} from 'zine/zine-format.js';
import {
  ZineRenderer,
} from 'zine/zine-renderer.js';
import {
  panelSize,
  floorNetWorldSize,
  floorNetWorldDepth,
  floorNetResolution,
  floorNetPixelSize,
} from 'zine/zine-constants.js';
import {
  setPerspectiveCameraFromJson,
  setOrthographicCameraFromJson,
} from 'zine/zine-camera-utils.js';
import {
  setCameraViewPositionFromOrthographicViewZ,
  getDepthFloatsFromPointCloud,
  depthFloat32ArrayToOrthographicGeometry,
  getDepthFloat32ArrayWorldPosition,
} from 'zine/zine-geometry-utils.js';
import storyCameraManager from '../story-camera-manager.js';
import {
  playersManager,
} from '../players-manager.js';

import {
  getCapsuleIntersectionIndex,
} from './zine-runtime-utils.js';
import {
  StoryTargetMesh,
} from './meshes/story-target-mesh.js';
import {
  EntranceExitMesh,
} from './meshes/entrance-exit-mesh.js';

import {heightfieldScale} from '../constants.js'
import {world} from '../world.js';

// locals

// const localVector = new THREE.Vector3();
const localOrthographicCamera = new THREE.OrthographicCamera();

// utils
    
const getGeometryHeights = (geometry, width, height) => {
  const heights = new Int16Array(geometry.attributes.position.array.length / 3);
  let writeIndex = 0;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const ax = dx;
      const ay = height - 1 - dy;
      // XXX this is WRONG!
      // we should index by ay * width + ax
      // however, because of a bug which computes this wrong, we have to do it this way
      const readIndex = ax * width + ay;

      const y = geometry.attributes.position.array[readIndex * 3 + 1];
      heights[writeIndex] = Math.round(y / heightfieldScale);

      writeIndex++;
    }
  }
  return heights;
};

// main class

class ZineManager {
  MAGIC_STRING = zineMagicBytes;
  async #loadUrl(u) {
    const response = await fetch(u);
    const arrayBuffer = await response.arrayBuffer();

    // const textEncoder = new TextEncoder();
    // const zineMagicBytesUint8Array = textEncoder.encode(zineMagicBytes);
    // const uint8Array = new Uint8Array(arrayBuffer, zineMagicBytesUint8Array.byteLength);
    const uint8Array = new Uint8Array(arrayBuffer, 4);
    const zineStoryboard = new ZineStoryboard();
    zineStoryboard.load(uint8Array);
    return zineStoryboard;
  }

  #createRenderer(panel) {
    const zineRenderer = new ZineRenderer({
      panel,
    });

    const floorInverseQuaternion = new THREE.Quaternion()
      .fromArray(zineRenderer.metadata.floorPlaneLocation.quaternion)
      .invert();

    // console.log('floor inverse quaternion', floorInverseQuaternion.toArray());
    zineRenderer.scene.quaternion.copy(floorInverseQuaternion);
    zineRenderer.scene.updateMatrixWorld();
    
    zineRenderer.camera.quaternion.copy(floorInverseQuaternion);
    zineRenderer.camera.updateMatrixWorld();

    return zineRenderer;
  }

  async createInstanceAsync({
    start_url,
    physics,
  }) {
    const instance = new THREE.Object3D();

    const storyboard = await this.#loadUrl(start_url);

    // panel
    const panel0 = storyboard.getPanel(0);
    const layer0 = panel0.getLayer(0);
    const layer1 = panel0.getLayer(1);
    const cameraJson = layer1.getData('cameraJson');
    const floorResolution = layer1.getData('floorResolution');
    const floorNetDepths = layer1.getData('floorNetDepths');
    const floorNetCameraJson = layer1.getData('floorNetCameraJson');
    
    // zine renderer
    const zineRenderer = this.#createRenderer(panel0);
    const {
      sceneMesh,
      scenePhysicsMesh,
      floorNetMesh,
    } = zineRenderer;
    const {
      entranceExitLocations,
    } = zineRenderer.metadata;

    // camera
    const floorNetCamera = setOrthographicCameraFromJson(localOrthographicCamera, floorNetCameraJson);
    storyCameraManager.setLockCamera(zineRenderer.camera);

    // lights
    {
      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(0, 1, 2);
      instance.add(light);
      light.updateMatrixWorld();
    }

    // scene meshes
    {
      instance.add(zineRenderer.scene);
    }

    // extra meshes
    let entranceExitMesh;
    {
      entranceExitMesh = new EntranceExitMesh({
        entranceExitLocations,
      });
      zineRenderer.transformScene.add(entranceExitMesh);
    }

    // story target mesh
    const storyTargetMesh = new StoryTargetMesh();
    storyTargetMesh.frustumCulled = false;
    storyTargetMesh.visible = false;
    instance.add(storyTargetMesh);

    // physics
    const physicsIds = [];
    instance.physicsIds = physicsIds;

    // object physics
    {
      const geometry2 = scenePhysicsMesh.geometry.clone();
      // double-side the geometry
      const indices = geometry2.index.array;
      const newIndices = new indices.constructor(indices.length * 2);
      newIndices.set(indices);
      // the second set of indices is flipped
      for (let i = 0; i < indices.length; i += 3) {
        newIndices[indices.length + i + 0] = indices[i + 2];
        newIndices[indices.length + i + 1] = indices[i + 1];
        newIndices[indices.length + i + 2] = indices[i + 0];
      }
      geometry2.setIndex(new THREE.BufferAttribute(newIndices, 1));

      const material2 = scenePhysicsMesh.material.clone();
      const scenePhysicsMesh2 = new THREE.Mesh(geometry2, material2);
      scenePhysicsMesh.matrixWorld.decompose(
        scenePhysicsMesh2.position,
        scenePhysicsMesh2.quaternion,
        scenePhysicsMesh2.scale
      );
      scenePhysicsMesh2.updateMatrixWorld();

      const physicsId = physics.addGeometry(scenePhysicsMesh2);
      physicsIds.push(physicsId);
    }

    // floor physics
    {
      const [width, height] = floorResolution;

      const floorNetPhysicsMesh = (() => {
        const geometry = depthFloat32ArrayToOrthographicGeometry(
          floorNetDepths,
          floorNetPixelSize,
          floorNetPixelSize,
          floorNetCamera,
        );
        geometry.computeVertexNormals();

        // shift geometry by half a floorNetWorldSize
        geometry.translate(floorNetWorldSize/2, 0, floorNetWorldSize/2);
        // ...but also shift the mesh to compensate
        // this centering is required for the physics to work and render correctly
        const material = new THREE.MeshPhongMaterial({
          color: 0xFF0000,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.5,
        });
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
      })();
      floorNetPhysicsMesh.position.set(-floorNetWorldSize/2, 0, -floorNetWorldSize/2);
      zineRenderer.transformScene.add(floorNetPhysicsMesh);

      const numRows = width;
      const numColumns = height;
      // if (floorNetDepths.length !== width * height) {
      //   throw new Error('floorNetDepths length mismatch');
      // }
      const heights = getGeometryHeights(
        floorNetPhysicsMesh.geometry,
        width,
        height
      );
      const heightfieldPhysicsObject = physics.addHeightFieldGeometry(
        floorNetPhysicsMesh,
        numRows,
        numColumns,
        heights,
        heightfieldScale,
        floorNetResolution,
        floorNetResolution
      );
      physicsIds.push(heightfieldPhysicsObject);
    }

    // mouse tracking
    const mousePosition = new THREE.Vector2();

    // methods
    instance.link = () => {
      const panel1 = storyboard.getPanel(1);
      const zineRenderer2 = this.#createRenderer(panel1);
      // console.log('link instance', zineRenderer, zineRenderer2);
      
      zineRenderer.connect(zineRenderer2);
      
      // scene mesh
      {
        instance.add(zineRenderer2.scene);
      }

      // extra meshes
      {
        const entranceExitMesh2 = new EntranceExitMesh({
          entranceExitLocations,
        });
        zineRenderer2.transformScene.add(entranceExitMesh2);
      }

      instance.updateMatrixWorld();
    };

    // update matrix world
    instance.updateMatrixWorld();

    // precompute
    const pointCloudArrayBuffer = layer1.getData('pointCloud');
    const depthFloat32Array = getDepthFloatsFromPointCloud(
      pointCloudArrayBuffer,
      panelSize,
      panelSize
    );
    const scaleArray = layer1.getData('scale');
    const scale = new THREE.Vector3().fromArray(scaleArray);

    // update listeners
    world.appManager.addEventListener('frame', e => {
      const _updateEntranceExitHighlights = () => {
        const localPlayer = playersManager.getLocalPlayer();
        const {
          capsuleWidth: capsuleRadius,
          capsuleHeight,
        } = localPlayer.characterPhysics;
        const capsulePosition = localPlayer.position;
        const intersectionIndex = getCapsuleIntersectionIndex(
          entranceExitLocations,
          zineRenderer.transformScene.matrixWorld,
          capsulePosition,
          capsuleRadius,
          capsuleHeight
        );
        const highlights = new Uint8Array(entranceExitLocations.length);
        if (intersectionIndex !== -1) {
          highlights[intersectionIndex] = 1;
        }
        entranceExitMesh.setHighlights(highlights);
      };
      _updateEntranceExitHighlights();

      const _updateStoryTargetMesh = () => {
        storyTargetMesh.visible = false;
        
        if (storyCameraManager.cameraLocked) {
          const x = (mousePosition.x + 1) / 2;
          const y = (mousePosition.y + 1) / 2;
          const camera = storyCameraManager.lockCamera;
          
          getDepthFloat32ArrayWorldPosition(
            depthFloat32Array,
            x,
            y,
            panelSize,
            panelSize,
            camera,
            scale,
            storyTargetMesh.position
          );

          storyTargetMesh.updateMatrixWorld();

          storyTargetMesh.visible = true;
        }
      };
      _updateStoryTargetMesh();
    });
    storyCameraManager.addEventListener('mousemove', e => {
      const {movementX, movementY} = e.data;
      const rate = 0.002;
      mousePosition.x += movementX * rate;
      mousePosition.y += movementY * rate;

      mousePosition.x = Math.min(Math.max(mousePosition.x, -1), 1);
      mousePosition.y = Math.min(Math.max(mousePosition.y, -1), 1);
    });

    // return
    return instance;
  }
}
const zineManager = new ZineManager();
export default zineManager;