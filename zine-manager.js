import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
  depthFloat32ArrayToOrthographicGeometry,
} from 'zine/zine-geometry-utils.js';
import {appsMapName, heightfieldScale} from './constants.js'

// constants

const oneVector = new THREE.Vector3(1, 1, 1);

// locals

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
// const localCamera = new THREE.PerspectiveCamera();
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

// helper classes

const entranceExitHeight = 2;
const entranceExitWidth = 2;
const entranceExitDepth = 20;
class EntranceExitMesh extends THREE.Mesh {
  constructor({
    entranceExitLocations,
    matrixWorld,
  }) {
    const baseGeometry = new THREE.BoxGeometry(entranceExitWidth, entranceExitHeight, entranceExitDepth)
      .translate(0, entranceExitHeight / 2, entranceExitDepth / 2);
    const geometries = entranceExitLocations.map(eel => {
      const g = baseGeometry.clone();
      
      localMatrix.compose(
        localVector.fromArray(eel.position),
        localQuaternion.fromArray(eel.quaternion),
        localVector2.setScalar(1)
      ).premultiply(matrixWorld).decompose(
        localVector,
        localQuaternion,
        localVector2
      );
      // localMatrix.compose(
      //   localVector,
      //   localQuaternion,
      //   oneVector
      // );

      g.applyMatrix4(localMatrix);
      return g;
    });
    const geometry = geometries.length > 0 ? BufferGeometryUtils.mergeBufferGeometries(geometries) : new THREE.BufferGeometry();

    const material = new THREE.ShaderMaterial({
      vertexShader: `\
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `\
        varying vec2 vUv;

        void main() {
          vec3 c = vec3(1., 0., 1.);
          gl_FragColor = vec4(c, 0.5);
          gl_FragColor.rg += vUv * 0.2;
        }
      `,
      transparent: true,
    });
    super(geometry, material);

    // const hasGeometry = geometries.length > 0;

    const entranceExitMesh = this;
    entranceExitMesh.frustumCulled = false;
    // entranceExitMesh.enabled = false;
    // entranceExitMesh.visible = false;
    // entranceExitMesh.updateVisibility = () => {
    //   entranceExitMesh.visible = entranceExitMesh.enabled && hasGeometry;
    // };
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

    // camera
    // const camera = setPerspectiveCameraFromJson(localCamera, cameraJson);
    const floorNetCamera = setOrthographicCameraFromJson(localOrthographicCamera, floorNetCameraJson);
    // instance.camera = camera;
    instance.camera = zineRenderer.camera;

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
    {
      const scale = new THREE.Vector3().fromArray(zineRenderer.metadata.scale);
      const entranceExitMesh = new EntranceExitMesh({
        entranceExitLocations: zineRenderer.metadata.entranceExitLocations,
        matrixWorld: zineRenderer.transformScene.matrixWorld,
      });
      instance.add(entranceExitMesh);
    }

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
          color: 0x0000ff,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.2,
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

    // methods
    instance.link = () => {
      const panel1 = storyboard.getPanel(1);
      const zineRenderer2 = this.#createRenderer(panel1);
      console.log('link instance', zineRenderer, zineRenderer2);
      
      zineRenderer.connect(zineRenderer2);
      
      // scene mesh
      {
        instance.add(zineRenderer2.scene);
      }

      // extra meshes
      {
        const entranceExitMesh2 = new EntranceExitMesh({
          entranceExitLocations: zineRenderer2.metadata.entranceExitLocations,
          matrixWorld: zineRenderer2.transformScene.matrixWorld,
        });
        instance.add(entranceExitMesh2);
      }

      instance.updateMatrixWorld();
    };

    // update matrix world
    instance.updateMatrixWorld();

    // return
    return instance;
  }
}
const zineManager = new ZineManager();
export default zineManager;