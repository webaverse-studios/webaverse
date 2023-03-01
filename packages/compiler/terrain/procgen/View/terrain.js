import * as THREE from 'three'

import View from './view.js'
import State from '../State/state.js';

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
    this.physicsId = this.physics.addGeometry(this.mesh);

    this.scene.add(this.mesh)
    
    this.created = true
  }

  destroy() {
    if(this.created) {
      this.geometry.dispose()
      this.scene.remove(this.mesh)
      this.physics.removeGeometry(this.physicsId);
    }
  }
}