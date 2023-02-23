
import * as THREE from 'three';
import _createTrailMaterial from './trail-material.js';
import {
	Mesh,
} from 'three';
const planeNumber = 50;
const trailWidth = 0.1;
const point1 = new THREE.Vector3();
const point2 = new THREE.Vector3();
let temp = [];
let temp2 = [];

class Trail extends Mesh {
  constructor(player) {
    super();
    this.player = player;
    const planeGeometry = this.getGeometry();
    const material = _createTrailMaterial();
		this.geometry = planeGeometry;
    this.material = material;
    this.frustumCulled = false;
	}

  getGeometry() {
    let position = new Float32Array(18 * planeNumber);
    this.positionArray = position;
    const planeGeometry = new THREE.BufferGeometry();
    planeGeometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  
    let uv = new Float32Array(12 * planeNumber);
    let fraction = 1;
    let ratio = 1 / planeNumber;
    for (let i = 0; i < planeNumber; i ++) {
      uv[i * 12 + 0] = 0;
      uv[i * 12 + 1] = fraction;
  
      uv[i * 12 + 2] = 1;
      uv[i * 12 + 3] = fraction;
  
      uv[i * 12 + 4] = 0;
      uv[i * 12 + 5] = fraction - ratio;
  
      uv[i * 12 + 6] = 1;
      uv[i * 12 + 7] = fraction - ratio;
  
      uv[i * 12 + 8] = 0;
      uv[i * 12 + 9] = fraction - ratio;
  
      uv[i * 12 + 10] = 1;
      uv[i * 12 + 11] = fraction;
  
      fraction -= ratio;
    }
    planeGeometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return planeGeometry;
  }
  
  resetTrail(centerPos) {
    for (let i = 0; i < this.positionArray.length / 3; i ++) {
      this.positionArray[i * 3 + 0] = centerPos.x;
      this.positionArray[i * 3 + 1] = centerPos.y;
      this.positionArray[i * 3 + 2] = centerPos.z;
    }
  }

  update(rotDegree, rotDir, centerPos) {
    point1.x = centerPos.x + Math.cos(rotDegree) * trailWidth * rotDir.x;
    point1.y = centerPos.y + Math.sin(rotDegree) * trailWidth;
    point1.z = centerPos.z + Math.cos(rotDegree) * trailWidth * rotDir.z;
    point2.x = centerPos.x - Math.cos(rotDegree) * trailWidth * rotDir.x;
    point2.y = centerPos.y - Math.sin(rotDegree) * trailWidth;
    point2.z = centerPos.z - Math.cos(rotDegree) * trailWidth * rotDir.z;
   
    
    for (let i = 0; i < 18; i ++) {
      temp[i] = this.positionArray[i];
    }
    for (let i = 0; i < planeNumber; i ++) {
      if (i === 0) {
        this.positionArray[0] = point1.x;
        this.positionArray[1] = point1.y;
        this.positionArray[2] = point1.z;
        
        this.positionArray[3] = point2.x;
        this.positionArray[4] = point2.y;
        this.positionArray[5] = point2.z;
        
        this.positionArray[6] = temp[0];
        this.positionArray[7] = temp[1];
        this.positionArray[8] = temp[2];
    
        this.positionArray[9] = temp[3];
        this.positionArray[10] = temp[4];
        this.positionArray[11] = temp[5];
    
        this.positionArray[12] = temp[0];
        this.positionArray[13] = temp[1];
        this.positionArray[14] = temp[2];
    
        this.positionArray[15] = point2.x;
        this.positionArray[16] = point2.y;
        this.positionArray[17] = point2.z;
      }
      else {
        for (let j = 0; j < 18; j ++) {
          temp2[j] = this.positionArray[i * 18 + j];
          this.positionArray[i * 18 + j] = temp[j];
          temp[j] = temp2[j];
        }
      }
    }
    this.geometry.attributes.position.needsUpdate = true;   
    
  }
}

export {Trail};