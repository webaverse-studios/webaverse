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

    const heights = []; // int16

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let verticesCount = 0;
    // let positionStrs = [];
    for (let i3 = 0; i3 < this.terrainState.positions.length; i3 += 3) {
      const x = this.terrainState.positions[i3 + 0];
      const y = this.terrainState.positions[i3 + 1];
      const z = this.terrainState.positions[i3 + 2];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
      verticesCount++;
      // heights.push(Math.round(y));
      // positionStrs.push(x + ',' + y + ',' + z);
    }

    for (let i3 = 0; i3 < this.terrainState.positions.length; i3 += 3) {
      this.terrainState.positions[i3 + 0] -= minX;
      this.terrainState.positions[i3 + 2] -= minZ;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.terrainState.positions, 3));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.terrainState.uv, 2));
    this.geometry.index = new THREE.BufferAttribute(this.terrainState.indices, 1, false);

    // for (let i3 = 0; i3 < this.geometry.attributes.position.array.length; i3 += 3) {
    //   this.geometry.attributes.position.array[i3 + 0] -= minX;
    //   this.geometry.attributes.position.array[i3 + 2] -= minZ;
    // }
    // this.geometry.attributes.position.needsUpdate = true;
   
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
    this.mesh.position.x = minX;
    this.mesh.position.z = minZ;
    this.mesh.updateMatrix();
    this.mesh.updateMatrixWorld();
    
    this.mesh.userData.texture = this.texture

    // this.physicsId = this.physics.addGeometry(this.mesh);

    // const numRows = Math.round(Math.abs(minX - maxX)) + 1; // int, x axis
    // const numColumns = Math.round(Math.abs(minZ - maxZ)) + 1; // int, z axis
    // const heightScale = 1; // float
    // const rowScale = 1; // float, x axis
    // const columnScale = 1; // float, z axis
    // const numVerts = numRows * numColumns;
    // for (let i = 0; i < numVerts; i++) {
    //   // heights.push(Math.round(Math.random() * 10));
    //   heights.push(0);
    // }
    const numRows = 6; // int, x axis
    const numColumns = 6; // int, z axis
    const heightScale = 1; // float
    const rowScale = Math.abs(minX - maxX) / 5; // float, x axis
    const columnScale = Math.abs(minZ - maxZ) / 5; // float, z axis
    // const rowScale = 1; // float, x axis
    // const columnScale = 1; // float, z axis
    const numVerts = numRows * numColumns;
    for (let i = 0; i < numVerts; i++) {
      // heights.push(Math.round(Math.random() * 10));
      heights.push(0);
    }
    // debugger
    // const positionMesh = new THREE.Object3D();
    // positionMesh.position.copy(this.mesh.position);
    // positionMesh.x = minX;
    // positionMesh.z = minZ;
    this.physicsId = this.physics.addHeightFieldGeometry(this.mesh, numRows, numColumns, heights, heightScale, rowScale, columnScale);

    this.scene.add(this.mesh)
    
    this.created = true
  }

  destroy() {
    // if(this.created) {
    //   this.geometry.dispose()
    //   this.scene.remove(this.mesh)
    //   this.physics.removeGeometry(this.physicsId);
    // }
  }
}