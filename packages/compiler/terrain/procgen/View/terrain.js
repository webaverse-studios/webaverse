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
    this.abortController = null;
    
    this.created = false;

    this.terrains = terrains;
    this.terrainState = terrainState;
    this.terrainState.renderInstance = this;
    this.terrainState.events.on('ready', () => {
      this.create()
    })
  }

  create() {
    // console.log(this.terrainState.x, this.terrainState.z);
    const terrainsState = this.state.terrains;
    // debugger
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

    const _handlePhysics = () => {
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      this.physics.cookGeometryAsync(
        this.mesh,
        {signal},
      ).then(geometryBuffer => {
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
      })
    }
    _handlePhysics();
  }

  update(timestamp) {
    if (this.abortController) {
      // localVector3D.set(globalThis.localPlayer.position.x, 0, globalThis.localPlayer.position.z);
      // localVector3D2.set(this.terrainState.x, 0, this.terrainState.z);
      // if (localVector3D.sub(localVector3D2).length() > 1000) {
      if (
        Math.abs(globalThis.localPlayer.position.x - this.terrainState.x) > 512 ||
        Math.abs(globalThis.localPlayer.position.z - this.terrainState.z) > 512
      ) {
        this.abortController.abort('chunk faraway, not needed');
      }
    }
  }

  destroy() {
    if(this.created) {
      this.geometry.dispose()
      this.scene.remove(this.mesh)
      this.physics.removeGeometry(this.physicsId);
    }
  }
}