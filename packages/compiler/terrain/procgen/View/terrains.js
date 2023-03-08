import * as THREE from 'three';

import State from "../State/state.js";
import View from './view.js';
import Terrain from './terrain.js';

import {terrainVertexShader, terrainFragmentShader,} from './Material/terrain/shader.js';



export default class Terrains
{
  constructor() {
    this.state = State.getInstance();
    this.view = View.getInstance();
    this.texturePacks = this.view.texturePacks;

    
    
    this.setMaterial();

    this.state.terrains.events.on('create', (engineTerrain) => {
      const terrain = new Terrain(this, engineTerrain);

      engineTerrain.events.on('destroy', () => {
        terrain.destroy();
      })
    })
  }

  getTexureByName(textureName) {
    return this.texturePacks.find(x => x.name === textureName).texture;
  }

 
  setMaterial() {
    const terrainUniforms = {
      uTexture: {
        value: null
      },
      terrainRockTexture: {
        value: this.getTexureByName('terrain-rock')
      },
      terrainDirtTexture: {
        value: this.getTexureByName('terrain-dirt')
      },
      terrainSandTexture: {
        value: this.getTexureByName('terrain-sand')
      },
      terrainGrassTexture: {
        value: this.getTexureByName('terrain-grass')
      },
      terrainBrickTexture: {
        value: this.getTexureByName('terrain-brick')
      },
    }
    const uniforms = Object.assign({}, THREE.UniformsLib.lights, terrainUniforms);
    
    this.material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: terrainVertexShader,
      fragmentShader: terrainFragmentShader,
      transparent: true,
      lights: true,
    });
    
    
    this.material.onBeforeRender = (renderer, scene, camera, geometry, mesh) => {
      this.material.uniforms.uTexture.value = mesh.userData.texture;
      this.material.uniformsNeedUpdate = true;
    }
  }

  update(timestamp) {
    
  }
}