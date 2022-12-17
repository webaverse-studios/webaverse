import * as THREE from 'three';
// import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  camera,
  getRenderer,
} from '../renderer.js';
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
import zineCameraManager from './zine-camera-manager.js';
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
import {
  PanelRuntimeItems,
} from './actors/zine-item-actors.js';
import {
  PanelRuntimeOres,
} from './actors/zine-ore-actors.js';
import {
  PanelRuntimeNpcs,
} from './actors/zine-npc-actors.js';
import {
  PanelRuntimeMobs,
} from './actors/zine-mob-actors.js';

import {heightfieldScale} from '../constants.js'
import {world} from '../world.js';
import {makePromise} from '../util.js';

// constants

const cameraTransitionTime = 3000;
const oneVector = new THREE.Vector3(1, 1, 1);

// locals

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localPlane = new THREE.Plane();
const localOrthographicCamera = new THREE.OrthographicCamera();

// classes

class PanelRuntimeInstance extends THREE.Object3D {
  constructor(panel, {
    physics,
  }) {
    super();

    this.name = 'panelInstance';

    this.panel = panel;
    this.physics = physics;

    this.loaded = false;
    this.selected = false;

    this.#init();
  }
  #init() {
    // panel
    const {panel} = this;
    const layer0 = panel.getLayer(0);
    const layer1 = panel.getLayer(1);
    const cameraJson = layer1.getData('cameraJson');
    const floorResolution = layer1.getData('floorResolution');
    const floorNetDepths = layer1.getData('floorNetDepths');
    const floorNetCameraJson = layer1.getData('floorNetCameraJson');

    // zine renderer
    const zineRenderer = this.#createRenderer();
    const {
      sceneMesh,
      scenePhysicsMesh,
      floorNetMesh,
    } = zineRenderer;
    const {
      entranceExitLocations,
    } = zineRenderer.metadata;
    zineRenderer.addEventListener('load', e => {
      this.dispatchEvent({
        type: 'load',
      });
    }, {
      once: true,
    });
    this.zineRenderer = zineRenderer;

    // camera
    const floorNetCamera = setOrthographicCameraFromJson(localOrthographicCamera, floorNetCameraJson);

    // scene meshes
    {
      this.add(zineRenderer.scene);
    }

    // extra meshes
    let entranceExitMesh;
    {
      entranceExitMesh = new EntranceExitMesh({
        entranceExitLocations,
      });
      // entranceExitMesh.visible = false;
      zineRenderer.transformScene.add(entranceExitMesh);
    }
    this.entranceExitMesh = entranceExitMesh;

    // physics
    const physicsIds = [];
    this.physicsIds = physicsIds;

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
      scenePhysicsMesh2.name = 'scenePhysicsMesh';
      // scenePhysicsMesh.position.copy(scenePhysicsMesh.position);
      // scenePhysicsMesh.quaternion.copy(scenePhysicsMesh.quaternion);
      // scenePhysicsMesh.scale.copy(scenePhysicsMesh.scale);
      scenePhysicsMesh2.visible = false;
      zineRenderer.transformScene.add(scenePhysicsMesh2);
      this.scenePhysicsMesh = scenePhysicsMesh2;

      const scenePhysicsObject = this.physics.addGeometry(scenePhysicsMesh2);
      physicsIds.push(scenePhysicsObject);
      this.scenePhysicsObject = scenePhysicsObject;
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
      floorNetPhysicsMesh.name = 'floorNetPhysicsMesh';
      floorNetPhysicsMesh.position.set(-floorNetWorldSize/2, 0, -floorNetWorldSize/2);
      floorNetPhysicsMesh.visible = false;
      zineRenderer.transformScene.add(floorNetPhysicsMesh);
      this.floorNetPhysicsMesh = floorNetPhysicsMesh;

      const numRows = width;
      const numColumns = height;
      const heights = getGeometryHeights(
        floorNetPhysicsMesh.geometry,
        width,
        height
      );
      const floorNetPhysicsObject = this.physics.addHeightFieldGeometry(
        floorNetPhysicsMesh,
        numRows,
        numColumns,
        heights,
        heightfieldScale,
        floorNetResolution,
        floorNetResolution
      );
      physicsIds.push(floorNetPhysicsObject);
      this.floorNetPhysicsObject = floorNetPhysicsObject;
    }

    // hide to start
    this.visible = false;
    // disable physics to start
    this.setPhysicsEnabled(false);

    // precompute cache
    const pointCloudArrayBuffer = layer1.getData('pointCloud');
    const depthFloat32Array = getDepthFloatsFromPointCloud(
      pointCloudArrayBuffer,
      panelSize,
      panelSize
    );
    const scaleArray = layer1.getData('scale');
    const scale = new THREE.Vector3().fromArray(scaleArray);
    this.precomputedCache = {
      depthFloat32Array,
      scale,
    };
  }
  #createRenderer() {
    const {panel} = this;
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
  async waitForLoad() {
    if (!this.loaded) {
      const p = makePromise();
      const onload = () => {
        cleanup();
        p.accept();
      };
      const cleanup = () => {
        this.removeEventListener('load', onload);
      };
      this.addEventListener('load', onload);
      await p;
    }
  }
  setPhysicsEnabled(enabled = true) {
    const fn = enabled ? physicsObject => {
      this.physics.enableActor(physicsObject);
    } : physicsObject => {
      this.physics.disableActor(physicsObject);
    };
    for (const physicsObject of this.physicsIds) {
      fn(physicsObject);
    }
  }
  setSelected(selected = true) {
    if (selected !== this.selected) {
      this.selected = selected;
      this.visible = selected;

      this.setPhysicsEnabled(selected);

      if (this.selected) {
        zineCameraManager.setLockCamera(this.zineRenderer.camera);
      }
    }
  }
  update() {
    if (this.selected) {
      const {zineRenderer} = this;
      const {
        entranceExitLocations,
      } = zineRenderer.metadata;

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
        this.entranceExitMesh.setHighlights(highlights);

        if (intersectionIndex !== -1) {
          this.dispatchEvent({
            type: 'transition',
            entranceExitIndex: intersectionIndex,
            panelIndexDelta: intersectionIndex === 0 ? -1 : 1,
          });
        }
      };
      _updateEntranceExitHighlights();
    }
  }
}

//

class PanelInstanceManager extends THREE.Object3D {
  constructor(storyboard, {
    physics,
  }) {
    super();

    this.name = 'panelInstanceManager';

    this.storyboard = storyboard;
    this.physics = physics;

    this.panelIndex = 0;
    this.panelInstances = [];

    // story target mesh
    const storyTargetMesh = new StoryTargetMesh();
    storyTargetMesh.frustumCulled = false;
    storyTargetMesh.visible = false;
    this.add(storyTargetMesh);
    this.storyTargetMesh = storyTargetMesh;

    this.#init();
  }
  #init() {
    const {physics} = this;
    const panelOpts = {
      physics,
    };

    // create panel instances
    const panels = this.storyboard.getPanels();
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const panelInstance = new PanelRuntimeInstance(panel, panelOpts);
      this.add(panelInstance);
      this.panelInstances.push(panelInstance);
    }

    // wait for load
    (async () => {
      const panelInstances = this.panelInstances.slice();
      await Promise.all(panelInstances.map(panelInstance => panelInstance.waitForLoad()));

      this.dispatchEvent({
        type: 'load',
      });
    })();

    // connect panels
    // console.log('connect panels', this.panelInstances.length)
    for (let i = 0; i < this.panelInstances.length - 1; i++) {
      // connect panels
      const panelInstance = this.panelInstances[i];
      const nextPanelInstance = this.panelInstances[i + 1];
      panelInstance.zineRenderer.connect(nextPanelInstance.zineRenderer);
      // update physics
      // update scene mesh physics
      nextPanelInstance.scenePhysicsMesh.matrixWorld.decompose(
        nextPanelInstance.scenePhysicsObject.position,
        nextPanelInstance.scenePhysicsObject.quaternion,
        nextPanelInstance.scenePhysicsObject.scale
      );
      this.physics.setTransform(nextPanelInstance.scenePhysicsObject, false);
      // update floor net physics
      nextPanelInstance.floorNetPhysicsMesh.matrixWorld.decompose(
        nextPanelInstance.floorNetPhysicsObject.position,
        nextPanelInstance.floorNetPhysicsObject.quaternion,
        nextPanelInstance.floorNetPhysicsObject.scale
      );
      this.physics.setTransform(nextPanelInstance.floorNetPhysicsObject, false);
    }

    // event listeners
    for (const panelInstance of this.panelInstances) {
      panelInstance.addEventListener('transition', e => {
        // attempt to transition panels
        const {
          entranceExitIndex,
          panelIndexDelta,
        } = e;
        let nextPanelIndex = this.panelIndex + panelIndexDelta;
        if (nextPanelIndex >= 0 && nextPanelIndex < panels.length) { // if it leads to a valid panel
          // check that we are on the opposite side of the exit plane
          // this is to prevent glitching back and forth between panels

          const currentPanelInstance = this.panelInstances[this.panelIndex];
          const {entranceExitLocations} = currentPanelInstance.zineRenderer.metadata;
          const entranceLocation = entranceExitLocations[entranceExitIndex];
          
          localMatrix.compose(
            localVector.fromArray(entranceLocation.position),
            localQuaternion.fromArray(entranceLocation.quaternion),
            oneVector
          ).premultiply(currentPanelInstance.zineRenderer.transformScene.matrixWorld).decompose(
            localVector,
            localQuaternion,
            localVector2
          );
          localPlane.setFromNormalAndCoplanarPoint(
            localVector2.set(0, 0, -1)
              .applyQuaternion(localQuaternion),
            localVector
          );

          const localPlayer = playersManager.getLocalPlayer();
          const capsulePosition = localPlayer.position;
          const signedDistance = localPlane.distanceToPoint(capsulePosition);

          // if we are on the opposite side of the entrance plane
          if (signedDistance < 0) {
            // deselect old panel
            currentPanelInstance.setSelected(false);

            // perform the transition animation in the story camera manager
            // note that we have to do this before setting the new panel,
            // so that the old camera start point can be snappshotted
            const newPanelInstance = this.panelInstances[nextPanelIndex];
            zineCameraManager.transitionLockCamera(newPanelInstance.zineRenderer.camera, cameraTransitionTime);

            // select new panel
            this.panelIndex = nextPanelIndex;
            newPanelInstance.setSelected(true);
          }
        }
      });
    }

    // select first panel
    const firstPanel = this.panelInstances[this.panelIndex];
    firstPanel.setSelected(true);
  }
  update({
    mousePosition,
  }) {
    // update for entrance/exit transitions
    const _updatePanelInstances = () => {
      for (const panelInstance of this.panelInstances) {
        panelInstance.update();
      }
    };
    _updatePanelInstances();

    // update camera animation
    const _updateCameraAnimation = () => {
      if (this.cameraAnimation) {
        const {start, end, startTime, endTime} = this.cameraAnimation;
        
        const now = performance.now();
        const f = (now - startTime) / (endTime - startTime);

        if (f < 1) {
          const startPosition = start.position;
          const endPosition = end.position;
        } else {
          
        }
      }
    };
    _updateCameraAnimation();

    // update cursor
    const _updateStoryTargetMesh = () => {
      this.storyTargetMesh.visible = false;
      
      if (zineCameraManager.cameraLocked) {
        const x = (mousePosition.x + 1) / 2;
        const y = (mousePosition.y + 1) / 2;
        const camera = zineCameraManager.lockCamera;

        const selectedPanelInstance = this.panelInstances[this.panelIndex];
        const {
          depthFloat32Array,
          scale,
        } = selectedPanelInstance.precomputedCache;
        
        getDepthFloat32ArrayWorldPosition(
          depthFloat32Array,
          x,
          y,
          panelSize,
          panelSize,
          camera,
          scale,
          this.storyTargetMesh.position
        );

        this.storyTargetMesh.updateMatrixWorld();

        this.storyTargetMesh.visible = true;
      }
    };
    _updateStoryTargetMesh();
  }
}

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
  async createStoryboardInstanceAsync({
    start_url,
    physics,
  }) {
    const instance = new THREE.Scene();
    instance.autoUpdate = false;

    // lights
    {
      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(0, 1, 2);
      instance.add(light);
      light.updateMatrixWorld();
    }

    // storyboard
    const storyboard = await this.#loadUrl(start_url);
    
    // panel instance manager
    const panelInstanceManager = new PanelInstanceManager(storyboard, {
      physics,
    });
    {
      const onload = e => {
        cleanup();

        const _compile = () => {
          const {panelInstances} = panelInstanceManager;
          const renderer = getRenderer();
          for (let i = 0; i < panelInstances.length; i++) {
            const panelInstance = panelInstances[i];
            panelInstance.visible = true;
          }
          renderer.render(instance, camera);
          for (let i = 0; i < panelInstances.length; i++) {
            const panelInstance = panelInstances[i];
            panelInstance.visible = i === panelInstanceManager.panelIndex;
          }
        };
        _compile();
        // globalThis.compile = _compile;
        // globalThis.instance1 = panelInstanceManager.panelInstances[1];
      };
      const cleanup = () => {
        panelInstanceManager.removeEventListener('load', onload);
      };
      panelInstanceManager.addEventListener('load', onload);
    }
    instance.add(panelInstanceManager);

    /* // methods
    instance.link = () => {
      // XXX this needs to happen automatically during panel instance manager initiailization
      console.log('linking needs to happen in the panel instance manager');
      debugger;

      const panel1 = storyboard.getPanel(1);
      const zineRenderer2 = this.createRenderer(panel1);
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
    }; */

    // update matrix world
    instance.updateMatrixWorld();

    // update listeners
    const {mousePosition} = zineCameraManager;
    world.appManager.addEventListener('frame', e => {
      panelInstanceManager.update({
        mousePosition,
      });
    });
    zineCameraManager.addEventListener('mousemove', e => {
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