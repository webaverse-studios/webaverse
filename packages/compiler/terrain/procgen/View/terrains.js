import * as THREE from 'three';

import State from "../State/state.js";
import View from './view.js';
import Terrain from './terrain.js';

export default class Terrains
{
  constructor() {
    this.state = State.getInstance();
    this.view = View.getInstance();
    this.terrains = [];
    
    this.setMaterial();

    this.state.terrains.events.on('create', (engineTerrain) => {
      const terrain = new Terrain(this, engineTerrain);
      this.terrains.push(terrain);

      engineTerrain.events.on('destroy', () => {
        terrain.destroy();
        this.terrains.splice(this.terrains.indexOf(terrain), 1);
      })
    })
  }

 
  setMaterial() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: {
          value: null
        },
      },
      vertexShader: `\   
        
        uniform sampler2D uTexture;
       
        varying vec3 vNormal;
      
        void main() {
          vec4 terrainData = texture2D(uTexture, uv);
          vNormal = normalize(terrainData.rgb);
          
      
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectionPosition = projectionMatrix * viewPosition;
          gl_Position = projectionPosition;
      }`,
      fragmentShader: `\
        varying vec3 vNormal;
        void main() {
          gl_FragColor = vec4(vNormal, 1.0);
      }`,
      transparent: true,
      // wireframe: true
    });

    
    this.material.onBeforeRender = (renderer, scene, camera, geometry, mesh) => {
      this.material.uniforms.uTexture.value = mesh.userData.texture;
      this.material.uniformsNeedUpdate = true;
    }
  }

  update(timestamp) {
    this.terrains.forEach(terrain => {
      terrain.update(timestamp);
    })
  }
}