import * as THREE from 'three'

import View from './view.js'
import State from '../State/state.js';

const localVector3D = new THREE.Vector3();
const localVector3D2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();

export default class Terrain {
  constructor(terrains, terrainState) {
    this.state = State.getInstance();
    this.view = View.getInstance();
    this.scene = this.view.scene;
    this.physics = this.view.physics;
    this.physicsId = null;
    
    this.created = false;

    this.terrains = terrains;
    this.terrainState = terrainState;
    this.terrainState.renderInstance = this;
    this.terrainState.events.on('ready', () => {
      this.create()
    })
  }

  create() {
    const terrainsState = this.state.terrains;
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.terrainState.positions, 3));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.terrainState.uv, 2));
   
    this.geometry.index = new THREE.BufferAttribute(this.terrainState.indices, 1, false);
    this.texture = new THREE.DataTexture(
      this.terrainState.texture,
      terrainsState.segments,
      terrainsState.segments,
      THREE.RGBAFormat,
      THREE.FloatType,
      THREE.UVMapping,
      THREE.ClampToEdgeWrapping,
      THREE.ClampToEdgeWrapping,
      THREE.LinearFilter,
      THREE.LinearFilter
    );
    this.texture.flipY = false;
    this.texture.needsUpdate = true;

    
    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.terrains.material);
    
    this.mesh.userData.texture = this.texture
    // this.physicsId = this.physics.addGeometry(this.mesh);

    const _handlePhysics = async () => {
      globalThis.cookCount++;
      // debugger
      const geometryBuffer = await this.physics.cookGeometryAsync(
        this.mesh,
      );
      // debugger
      globalThis.createdCount++;
      if (geometryBuffer && geometryBuffer.length !== 0) {
        this.mesh.matrixWorld.decompose(
          localVector3D,
          localQuaternion,
          localVector3D2,
        );
        this.physicsId = this.physics.addCookedGeometry(
          geometryBuffer,
          localVector3D,
          localQuaternion,
          localVector3D2,
        );
      }

      this.scene.add(this.mesh)
      
      this.created = true
    }
    _handlePhysics();
  }

  destroy() {
    if(this.created) {
      this.geometry.dispose()
      this.scene.remove(this.mesh)
      this.physics.removeGeometry(this.physicsId);
      globalThis.disposeCount++;
    }
  }
}