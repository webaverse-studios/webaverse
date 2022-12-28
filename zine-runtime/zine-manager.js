import * as THREE from 'three';
// import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  camera,
  getRenderer,
  scene,
} from '../renderer.js';
import spawnManager from '../spawn-manager.js';
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
  reconstructPointCloudFromDepthField,
  setCameraViewPositionFromOrthographicViewZ,
  getDepthFloatsFromPointCloud,
  depthFloat32ArrayToOrthographicGeometry,
  getDepthFloat32ArrayWorldPosition,
  getDoubleSidedGeometry,
  getGeometryHeights,
} from 'zine/zine-geometry-utils.js';
import {
  getFloorNetPhysicsMesh,
} from 'zine/zine-mesh-utils.js';
import zineCameraManagerGlobal from './zine-camera-manager.js';
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
const downQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const seed = '';

// locals

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localPlane = new THREE.Plane();
const localFrustum = new THREE.Frustum();
const localRaycaster = new THREE.Raycaster();
const localCamera = new THREE.PerspectiveCamera();
const localOrthographicCamera = new THREE.OrthographicCamera();

const zeroVector = new THREE.Vector3(0, 0, 0);
const upVector = new THREE.Vector3(0, 1, 0);

const planeGeometryNormalizeQuaternion = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2);

// XXX debugging

const _makePlaneMesh = ({
  color,
}) => {
  const geometry = new THREE.PlaneGeometry(10, 10)
    .rotateY(Math.PI / 2) // because physx has planes normals in +x direction
    // .rotateY(Math.PI); // face forward
  const material = new THREE.MeshPhongMaterial({
    color,
    // side: THREE.DoubleSide,
    // transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
};
const planeMesh1 = _makePlaneMesh({
  color: 0xFF0000,
});
globalThis.planeMesh1 = planeMesh1;
scene.add(planeMesh1);
const planeMesh2 = _makePlaneMesh({
  color: 0x00FF00,
});
globalThis.planeMesh2 = planeMesh2;
scene.add(planeMesh2);
const planeMesh3 = _makePlaneMesh({
  color: 0x0000FF,
});
globalThis.planeMesh3 = planeMesh3;
scene.add(planeMesh3);

// classes

class PanelRuntimeInstance extends THREE.Object3D {
  constructor(panel, {
    zineCameraManager,
    physics,
  }) {
    super();

    this.name = 'panelInstance';

    this.zineCameraManager = zineCameraManager;
    this.panel = panel;
    this.physics = physics;

    this.loaded = false;
    this.selected = false;
    this.actors = {
      item: null,
      ore: null,
      npc: null,
      mob: null,
    };

    this.#init();
  }
  #init() {
    // panel
    const {panel} = this;
    const layer0 = panel.getLayer(0);
    const layer1 = panel.getLayer(1);
    const resolution = layer1.getData('resolution');
    const depthField = layer1.getData('depthField');
    const cameraJson = layer1.getData('cameraJson');
    const scaleArray = layer1.getData('scale');
    const floorResolution = layer1.getData('floorResolution');
    const floorNetDepths = layer1.getData('floorNetDepths');
    const floorNetCameraJson = layer1.getData('floorNetCameraJson');
    const edgeDepths = layer1.getData('edgeDepths');

    const [
      width,
      height,
    ] = resolution;

    // zine renderer
    const zineRenderer = this.#createRenderer();
    const {
      sceneMesh,
      capSceneMesh,
      scenePhysicsMesh,
      floorNetMesh,
      wallPlaneMeshes,
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
    const camera = setPerspectiveCameraFromJson(localCamera, cameraJson);
    const floorNetCamera = setOrthographicCameraFromJson(localOrthographicCamera, floorNetCameraJson);

    // attach scene
    {
      this.add(zineRenderer.scene);
    }

    // cap scene mesh
    {
      capSceneMesh.visible = true;
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

    // scene physics
    {
      const geometry2 = getDoubleSidedGeometry(scenePhysicsMesh.geometry);

      const scenePhysicsMesh2 = new THREE.Mesh(geometry2, scenePhysicsMesh.material);
      scenePhysicsMesh2.name = 'scenePhysicsMesh';
      scenePhysicsMesh2.visible = false;
      zineRenderer.transformScene.add(scenePhysicsMesh2);
      this.scenePhysicsMesh = scenePhysicsMesh2;

      const scenePhysicsObject = this.physics.addGeometry(scenePhysicsMesh2);
      scenePhysicsObject.update = () => {
        scenePhysicsMesh2.matrixWorld.decompose(
          scenePhysicsObject.position,
          scenePhysicsObject.quaternion,
          scenePhysicsObject.scale
        );
        this.physics.setTransform(scenePhysicsObject, false);
      };
      physicsIds.push(scenePhysicsObject);
      this.scenePhysicsObject = scenePhysicsObject;
    }

    // floor net physics
    {
      const [
        floorWidth,
        floorHeight,
      ] = floorResolution;

      const floorNetPhysicsMaterial = new THREE.MeshPhongMaterial({
        color: 0xFF0000,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.5,
      });
      const floorNetPhysicsMesh = getFloorNetPhysicsMesh({
        floorNetDepths,
        floorNetCamera,
        material: floorNetPhysicsMaterial,
      });
      floorNetPhysicsMesh.name = 'floorNetPhysicsMesh';
      floorNetPhysicsMesh.visible = false;
      zineRenderer.transformScene.add(floorNetPhysicsMesh);
      this.floorNetPhysicsMesh = floorNetPhysicsMesh;

      const numRows = floorWidth;
      const numColumns = floorHeight;
      const heights = getGeometryHeights(
        floorNetPhysicsMesh.geometry,
        floorWidth,
        floorHeight,
        heightfieldScale
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
      floorNetPhysicsObject.update = () => {
        floorNetPhysicsMesh.matrixWorld.decompose(
          floorNetPhysicsObject.position,
          floorNetPhysicsObject.quaternion,
          floorNetPhysicsObject.scale
        );
        this.physics.setTransform(floorNetPhysicsObject, false);
      };
      physicsIds.push(floorNetPhysicsObject);
      this.floorNetPhysicsObject = floorNetPhysicsObject;
      console.log('zine create floor net physics object', floorNetPhysicsObject);
    }

    // wall plane meshes
    // planes[0] = right
    // planes[1] = left
    // planes[2] = bottom
    // planes[3] = top
    // planes[4] = far
    // planes[5] = near
    this.wallPhysicsObjects = [];
    {
      for (let i = 0; i < wallPlaneMeshes.length; i++) {
        const wallPlaneMesh = wallPlaneMeshes[i];
        wallPlaneMesh.visible = true;

        const _getTransform = () => {
          const position = new THREE.Vector3();
          const quaternion = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          wallPlaneMesh.matrixWorld.decompose(position, quaternion, scale);
          return {
            position,
            quaternion,
            // scale,
          };
        };

        const {
          position: centerPoint,
          quaternion: planeQuaternion,
        } = _getTransform();
        const dynamic = false;
        const planePhysicsObject = this.physics.addPlaneGeometry(
          centerPoint,
          planeQuaternion,
          dynamic
        );
        planePhysicsObject.update = () => {
          const {
            position: centerPoint,
            quaternion: planeQuaternion,
          } = _getTransform();
          planePhysicsObject.position.copy(centerPoint);
          planePhysicsObject.quaternion.copy(planeQuaternion);

          this.physics.setTransform(planePhysicsObject, false);
        };
        physicsIds.push(planePhysicsObject);
        this.wallPhysicsObjects.push(planePhysicsObject);
      }
    }

    // hide to start
    this.visible = false;
    // disable physics to start
    this.setPhysicsEnabled(false);

    // precompute cache
    const pointCloudFloat32Array = reconstructPointCloudFromDepthField(
      depthField,
      width,
      height,
      camera.fov,
    );
    const pointCloudArrayBuffer = pointCloudFloat32Array.buffer;
    const depthFloat32Array = getDepthFloatsFromPointCloud(
      pointCloudArrayBuffer,
      panelSize,
      panelSize
    );
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
      alignFloor: true,
    });
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
  #getUnusedCandidateLocations() {
    const {panel, zineRenderer} = this;
    const layer1 = panel.getLayer(1);
    const candidateLocations = layer1.getData('candidateLocations');
    return candidateLocations.map(cl => {
      localMatrix.compose(
        localVector.fromArray(cl.position),
        localQuaternion.fromArray(cl.quaternion),
        oneVector,
      ).premultiply(zineRenderer.transformScene.matrixWorld).decompose(
        localVector,
        localQuaternion,
        localVector2
      );
      return {
        position: localVector.toArray(),
        quaternion: localQuaternion.toArray(),
      };
    });
  }
  setActorsEnabled(enabled = true) {
    if (enabled) {
      const layer0 = this.panel.getLayer(0);
      const id = layer0.getData('id');
      const localSeed = id + seed;

      const candidateLocations = this.#getUnusedCandidateLocations();
      if (!this.actors.item && candidateLocations.length > 0) {
        this.actors.item = new PanelRuntimeItems({
          candidateLocations,
          n: 1,
          seed: localSeed,
        });
        this.add(this.actors.item);
      }
      if (!this.actors.ore && candidateLocations.length > 0) {
        this.actors.ore = new PanelRuntimeOres({
          candidateLocations,
          n: 1,
          seed: localSeed,
        });
        this.add(this.actors.ore);
      }
      if (!this.actors.npc && candidateLocations.length > 0) {
        this.actors.npc = new PanelRuntimeNpcs({
          candidateLocations,
          n: 1,
          seed: localSeed,
        });
        this.add(this.actors.npc);
      }
      if (!this.actors.mob && candidateLocations.length > 0) {
        this.actors.mob = new PanelRuntimeMobs({
          candidateLocations,
          n: 1,
          seed: localSeed,
        });
        this.add(this.actors.mob);
      }
    }
  }
  setSelected(selected = true) {
    if (selected !== this.selected) {
      this.selected = selected;
      this.visible = selected;

      this.setPhysicsEnabled(selected);
      this.setActorsEnabled(selected)

      if (this.selected) {
        this.zineCameraManager.setLockCamera(this.zineRenderer.camera);

        // const {panel} = this;
        // const layer1 = panel.getLayer(1);
        // const scale = layer1.getData('scale');
        this.zineCameraManager.setEdgeDepths(
          this.zineRenderer.metadata.edgeDepths,
          this.zineRenderer.transformScene.matrixWorld,
          // scale
        );
      }
    }
  }
  alignEntranceToFloor(floorPosition, exitWorldLocation, entranceLocalLocation) {
    // transform the zine renderer
    this.zineRenderer.alignEntranceToFloorPosition(floorPosition, exitWorldLocation, entranceLocalLocation);

    // call update() on all physics objects
    // XXX aligning is only supported for disabled actors!
    // XXX because we need to add + remove them to set their transform
    // XXX this can be fixed by tracking physics id lookups independently of scene children in the C++ code
    for (let i = 0; i < this.physicsIds.length; i++) {
      const physicsObject = this.physicsIds[i];
      this.physics.enableActor(physicsObject);
    }
    for (let i = 0; i < this.physicsIds.length; i++) {
      const physicsObject = this.physicsIds[i];
      physicsObject.update();
    }
    for (let i = 0; i < this.physicsIds.length; i++) {
      const physicsObject = this.physicsIds[i];
      this.physics.disableActor(physicsObject);
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
    zineCameraManager,
    physics,
  }) {
    super();

    this.name = 'panelInstanceManager';

    this.storyboard = storyboard;
    
    this.zineCameraManager = zineCameraManager;
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
    const {
      zineCameraManager,
      physics,
    } = this;
    const panelOpts = {
      zineCameraManager,
      physics,
    };

    // create panel instances
    const panels = this.storyboard.getPanels();
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      { // XXX hack: this should be set at generation time so it can serve as the panel seed
        const id = 'panel_' + i;
        const layer0 = panel.getLayer(0);
        layer0.setData('id', id);
      }
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
          const exitLocation = entranceExitLocations[entranceExitIndex];
          
          // compute exitWorldLocation
          localMatrix.compose(
            localVector.fromArray(exitLocation.position),
            localQuaternion.fromArray(exitLocation.quaternion),
            oneVector
          )
          .premultiply(
            currentPanelInstance.zineRenderer.transformScene.matrixWorld
          )
          .decompose(
            localVector,
            localQuaternion,
            localVector2
          );
          const exitWorldLocation = {
            position: localVector.toArray(),
            quaternion: localQuaternion.toArray(),
          };

          // compute entranceLocalLocation
          const nextPanelInstance = this.panelInstances[nextPanelIndex];
          const nextEntranceIndex = nextPanelIndex > this.panelIndex ? 0 : 1;
          const {
            entranceExitLocations: nextEntranceExitLocations,
          } = nextPanelInstance.zineRenderer.metadata;
          const nextEntranceLocation = nextEntranceExitLocations[nextEntranceIndex];
          const {panel} = nextPanelInstance;
          const layer1 = panel.getLayer(1);
          const positionArray = layer1.getData('position');
          const quaternionArray = layer1.getData('quaternion');
          const scaleArray = layer1.getData('scale');
          // const nextFloorPlaneLocation = layer1.getData('floorPlaneLocation');
          // const nextFloorPlanePosition = new THREE.Vector3().fromArray(nextFloorPlaneLocation.position);
          // const nextFloorPlaneQuaternion = new THREE.Quaternion().fromArray(nextFloorPlaneLocation.quaternion)
          
          const position = new THREE.Vector3().fromArray(positionArray);
          const quaternion = new THREE.Quaternion().fromArray(quaternionArray);
          const scale = new THREE.Vector3().fromArray(scaleArray);
          const mainMatrixWorld = new THREE.Matrix4()
            .compose(
              position,
              quaternion,
              scale
            );
          
          new THREE.Matrix4()
            .compose(
              localVector.fromArray(nextEntranceLocation.position),
              localQuaternion.fromArray(nextEntranceLocation.quaternion),
              oneVector
            )
            .premultiply(mainMatrixWorld)
            .decompose(
              localVector,
              localQuaternion,
              localVector2
            );
          const entranceLocalLocation = {
            position: localVector.toArray(),
            quaternion: localQuaternion.toArray(),
          };

          localPlane.setFromNormalAndCoplanarPoint(
            localVector2.set(0, 0, -1)
              .applyQuaternion(localQuaternion.fromArray(exitWorldLocation.quaternion)),
            localVector.fromArray(exitWorldLocation.position)
          );

          const localPlayer = playersManager.getLocalPlayer();
          const capsulePosition = localPlayer.position;
          const signedDistance = localPlane.distanceToPoint(capsulePosition);

          // if we are on the opposite side of the entrance plane
          if (signedDistance < 0) {
            // align new panel under avatar
            {
              const localPlayer = playersManager.getLocalPlayer();
              const playerHeight = localPlayer.avatar.height;
              const playerFloorPosition = localPlayer.position.clone();
              playerFloorPosition.y -= playerHeight;

              // compute height
              const result = physics.raycast(
                localPlayer.position,
                downQuaternion,
              );
              let heightOffset = 0;
              if (result) {
                heightOffset = result.distance - playerHeight;
              }
              playerFloorPosition.y -= heightOffset;

              // offset backward along the exit plane
              const entranceFrontOffset = 0.001;
              playerFloorPosition.add(
                localVector.set(0, 0, -entranceFrontOffset)
                  .applyQuaternion(localQuaternion.fromArray(exitWorldLocation.quaternion))
              );

              // align
              nextPanelInstance.alignEntranceToFloor(
                playerFloorPosition,
                exitWorldLocation,
                entranceLocalLocation
              );
            }
            /*if (window.lol) */ {
              // deselect old panel
              currentPanelInstance.setSelected(false);

              // perform the transition animation in the story camera manager
              // note that we have to do this before setting the new panel,
              // so that the old camera start point can be snappshotted
              this.zineCameraManager.transitionLockCamera(nextPanelInstance.zineRenderer.camera, cameraTransitionTime);

              // select new panel
              this.panelIndex = nextPanelIndex;
              nextPanelInstance.setSelected(true);
            }
          }
        }
      });
    }

    // set spawn point
    const firstPanel = this.panelInstances[this.panelIndex];
    firstPanel.setSelected(true);
  }
  async spawn() {
    const firstPanel = this.panelInstances[this.panelIndex];
    const {cameraEntranceLocation} = firstPanel.zineRenderer.metadata;
    // if (!cameraEntranceLocation) {
    //   console.warn('no camera entrance location', firstPanel);
    //   debugger;
    // }
    const position = new THREE.Vector3()
      .fromArray(cameraEntranceLocation.position);
    const quaternion = new THREE.Quaternion()
      .fromArray(cameraEntranceLocation.quaternion);
    const scale = oneVector.clone();
    new THREE.Matrix4().compose(
      position,
      quaternion,
      scale
    )
    .premultiply(firstPanel.zineRenderer.transformScene.matrixWorld)
    .decompose(
      position,
      quaternion,
      scale
    );
    spawnManager.setSpawnPoint(position, quaternion);
  }
  update({
    mousePosition,
  }) {
    const {physics} = this;

    // update for entrance/exit transitions
    const _updatePanelInstances = () => {
      for (const panelInstance of this.panelInstances) {
        panelInstance.update();
      }
    };
    _updatePanelInstances();

    // update cursor
    const _updateStoryTargetMesh = () => {
      this.storyTargetMesh.visible = false;
      
      if (this.zineCameraManager.cameraLocked) {
        localVector2D.copy(mousePosition);
        localVector2D.y = -localVector2D.y;
        
        // raycast
        {
          localRaycaster.setFromCamera(localVector2D, camera);
          const result = physics.raycast(
            localRaycaster.ray.origin,
            localQuaternion.setFromRotationMatrix(
              localMatrix.lookAt(
                localVector.set(0, 0, 0),
                localRaycaster.ray.direction,
                localVector2.set(0, 1, 0)
              )
            )
          );
          if (result) {
            this.storyTargetMesh.position.fromArray(result.point);
          }
          this.storyTargetMesh.visible = !!result;
        }
        this.storyTargetMesh.updateMatrixWorld();
      }
    };
    _updateStoryTargetMesh();
  }
}

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
    await zineStoryboard.loadAsync(uint8Array);
    return zineStoryboard;
  }
  async createStoryboardInstanceAsync({
    start_url,
    physics,
    zineCameraManager = zineCameraManagerGlobal,
  }) {
    const instance = new THREE.Scene();
    instance.autoUpdate = false;

    // lights
    {
      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(0, 1, 2);
      instance.add(light);
      light.updateMatrixWorld();

      const ambientLight = new THREE.AmbientLight(0xffffff, 2);
      instance.add(ambientLight);
    }

    // storyboard
    const storyboard = await this.#loadUrl(start_url);

    // panel instance manager
    const panelInstanceManager = new PanelInstanceManager(storyboard, {
      zineCameraManager,
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
      };
      const cleanup = () => {
        panelInstanceManager.removeEventListener('load', onload);
      };
      panelInstanceManager.addEventListener('load', onload);
    }
    instance.add(panelInstanceManager);

    instance.spawn = async () => {
      await panelInstanceManager.spawn();
    };

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