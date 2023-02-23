import * as THREE from 'three';
import {
  loadKtx2zTexture,
} from '../utils/ktx2-utils.js';

const defaultMaxParticles = 256;
// const canvasSize = 4096;
// const frameSize = 512;
// const rowSize = Math.floor(canvasSize/frameSize);

const _makePlaneGeometry = () => {
  const planeGeometryNonInstanced = new THREE.PlaneBufferGeometry(1, 1);
  const planeGeometry = new THREE.InstancedBufferGeometry();
  for (const k in planeGeometryNonInstanced.attributes) {
    planeGeometry.setAttribute(k, planeGeometryNonInstanced.attributes[k]);
  }
  planeGeometry.index = planeGeometryNonInstanced.index;
  return planeGeometry;
};
const planeGeometry = _makePlaneGeometry();

const _makeGeometry = (size, maxParticles) => {
  const geometry = planeGeometry.clone()
    .scale(size, size, 1);
  geometry.setAttribute('p', new THREE.InstancedBufferAttribute(new Float32Array(maxParticles * 3), 3));
  // geometry.setAttribute('q', new THREE.InstancedBufferAttribute(new Float32Array(maxParticles * 4), 4));
  geometry.setAttribute('t', new THREE.InstancedBufferAttribute(new Float32Array(maxParticles * 3), 3));
  geometry.setAttribute('textureIndex', new THREE.InstancedBufferAttribute(new Int32Array(maxParticles), 1));
  return geometry;
};

const vertexShader = `\
precision highp float;
precision highp int;

#define PI 3.141592653589793

uniform float uTime;
uniform vec4 cameraBillboardQuaternion;
attribute vec3 p;
attribute vec3 t;
varying vec2 vUv;
varying float vTimeDiff;

in int textureIndex;
flat out int vTextureIndex;

vec4 quat_from_axis_angle(vec3 axis, float angle) { 
  vec4 qr;
  float half_angle = (angle * 0.5) * PI;
  qr.x = axis.x * sin(half_angle);
  qr.y = axis.y * sin(half_angle);
  qr.z = axis.z * sin(half_angle);
  qr.w = cos(half_angle);
  return qr;
}
vec3 rotateVecQuat(vec3 position, vec4 q) {
  vec3 v = position.xyz;
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}
/* vec3 rotate_vertex_position(vec3 position, vec3 axis, float angle) { 
  vec4 q = quat_from_axis_angle(axis, angle);
  return rotateVecQuat(position, q);
} */

void main() {
  vec3 pos = position;
  pos += p;
  pos = rotateVecQuat(pos, cameraBillboardQuaternion);
  // pos += p;
  // pos = (modelMatrix * vec4(pos, 1.)).xyz;
  // gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);

  vUv = uv;
  vUv.y = 1. - vUv.y;

  float startTime = t.x;
  float endTime = t.y;
  float loop = t.z;
  vTimeDiff = (uTime - startTime) / (endTime - startTime);
  if (loop > 0.5) {
    vTimeDiff = mod(vTimeDiff, 1.);
  }

  vTextureIndex = textureIndex;
}
`;
const fragmentShader = `\
precision highp float;
precision highp int;

#define PI 3.1415926535897932384626433832795

uniform sampler2D uTex1;
uniform sampler2D uTex2;
uniform sampler2D uTex3;
uniform sampler2D uTex4;
uniform sampler2D uTex5;
uniform sampler2D uTex6;
uniform sampler2D uTex7;
uniform sampler2D uTex8;

uniform vec4 uNumFrames1;
uniform vec4 uNumFrames2;
uniform vec4 uNumFrames3;
uniform vec4 uNumFrames4;
uniform vec4 uNumFrames5;
uniform vec4 uNumFrames6;
uniform vec4 uNumFrames7;
uniform vec4 uNumFrames8;

// uniform float uDurations1;
// uniform float uDurations2;
// uniform float uDurations3;
// uniform float uDurations4;
// uniform float uDurations5;
// uniform float uDurations6;
// uniform float uDurations7;
// uniform float uDurations8;

/* uniform float uAnimationSpeed1;
uniform float uAnimationSpeed2;
uniform float uAnimationSpeed3;
uniform float uAnimationSpeed4;
uniform float uAnimationSpeed5;
uniform float uAnimationSpeed6;
uniform float uAnimationSpeed7;
uniform float uAnimationSpeed8; */

uniform float uTime;
/* uniform float uNumFrames;
uniform float uAnimationSpeed; */
varying vec2 vUv;
varying float vTimeDiff;
flat in int vTextureIndex;

vec2 getUv(float numFrames, float numFramesPerX, float numFramesPerY) {
  vec2 uv = vUv;

  uv /= vec2(numFramesPerX, numFramesPerY);

  float f = vTimeDiff;
  float frame = floor(f * numFrames);
  float x = mod(frame, numFramesPerX);
  float y = floor(frame / numFramesPerX);
  uv += vec2(x, y) / vec2(numFramesPerX, numFramesPerY);
  
  return uv;
}

void main() {
  vec4 c = vec4(0.);
  if (vTextureIndex == 0) {
    vec2 uv = getUv(uNumFrames1.y, uNumFrames1.z, uNumFrames1.w);
    c = texture2D(uTex1, uv);
  } else if (vTextureIndex == 1) {
    vec2 uv = getUv(uNumFrames2.y, uNumFrames2.z, uNumFrames2.w);
    c = texture2D(uTex2, uv);
  } else if (vTextureIndex == 2) {
    vec2 uv = getUv(uNumFrames3.y, uNumFrames3.z, uNumFrames3.w);
    c = texture2D(uTex3, uv);
  } else if (vTextureIndex == 3) {
    vec2 uv = getUv(uNumFrames4.y, uNumFrames4.z, uNumFrames4.w);
    c = texture2D(uTex4, uv);
  } else if (vTextureIndex == 4) {
    vec2 uv = getUv(uNumFrames5.y, uNumFrames5.z, uNumFrames5.w);
    c = texture2D(uTex5, uv);
  } else if (vTextureIndex == 5) {
    vec2 uv = getUv(uNumFrames6.y, uNumFrames6.z, uNumFrames6.w);
    c = texture2D(uTex6, uv);
  } else if (vTextureIndex == 6) {
    vec2 uv = getUv(uNumFrames7.y, uNumFrames7.z, uNumFrames7.w);
    c = texture2D(uTex7, uv);
  } else if (vTextureIndex == 7) {
    vec2 uv = getUv(uNumFrames8.y, uNumFrames8.z, uNumFrames8.w);
    c = texture2D(uTex8, uv);
  }

  gl_FragColor = c;
  if (gl_FragColor.a < 0.5) {
    // gl_FragColor = vec4(0., 0., 1., 1.);
    discard;
  } else {
    // gl_FragColor = vec4(vTimeDiff, 0., 0., 1.);
  }
}
`;
const _makeMaterial = maxNumTextures => {  
  const uniforms = {
    uTime: {
      value: 0,
      needsUpdate: true,
    },
    cameraBillboardQuaternion: {
      value: new THREE.Quaternion(),
      needsUpdate: true,
    },
  };
  for (let i = 1; i <= maxNumTextures; i++) {
    uniforms['uTex' + i] = {
      value: null,
      needsUpdate: false,
    };
    uniforms['uNumFrames' + i] = {
      value: new THREE.Vector4(),
      needsUpdate: true,
    };
    // uniforms['uDurations' + i] = {
    //   value: 0,
    //   needsUpdate: true,
    // };
    /* uniforms['uAnimationSpeed' + i] = {
      value: 0,
      needsUpdate: false,
    }; */
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    // alphaTest: 0.9,
  });
  material.setTextures = newTextures => {
    // update the uniforms
    for (let i = 0; i < newTextures.length; i++) {
      const newTexture = newTextures[i];
      const index = i + 1;
      
      const uTexUniform = material.uniforms['uTex' + index];
      uTexUniform.value = newTexture;
      uTexUniform.needsUpdate = true;

      const {
        numFrames,
        width,
        height,
        numFramesPerX,
        numFramesPerY,
        duration,
      } = newTexture;

      const uNumFramesUniform = material.uniforms['uNumFrames' + index];
      const aspect = width / height;
      uNumFramesUniform.value.set(
        aspect,
        numFrames,
        numFramesPerX,
        numFramesPerY,
      );
      uNumFramesUniform.needsUpdate = true;

      // const uNumDurationsUniform = material.uniforms['uDurations' + index];
      // uNumDurationsUniform.value = duration;
      // uNumFramesUniform.needsUpdate = true;
    }
  };
  return material;
}

//

export class ParticleEmitter2 extends THREE.Object3D {
  constructor(particleSystem, {
    range = 1,
  } = {}) {
    super();

    this.particleSystem = particleSystem;
    this.range = range;

    this.timeout = null;
    const now = performance.now()
    this.resetNextUpdate(now);
    this.particles = [];
  }

  resetNextUpdate(now) {
    this.lastParticleTimestamp = now;
    this.nextParticleDelay = Math.random() * 100;
  }

  update({
    timestamp,
    localPlayer,
  }) {
    const now = timestamp;
    const timeDiff = now - this.lastParticleTimestamp;
    const duration = 1000;

    const _removeParticles = () => {
      this.particles = this.particles.filter(particle => {
        const timeDiff = now - particle.startTime;
        if (timeDiff < duration) {
          return true;
        } else {
          particle.destroy();
          return false;
        }
      });
    };
    _removeParticles();

    const _addParticles = () => {
      if (timeDiff >= this.nextParticleDelay) {
        const texture = this.particleSystem.pack.textures[Math.floor(Math.random() * this.particleSystem.pack.textures.length)];
        const particle = this.particleSystem.addParticle(texture, {
          duration,
        });
        particle.offset = new THREE.Vector3(
          (-0.5 + Math.random()) * 2 * this.range,
          (-0.5 + Math.random()) * 2 * this.range,
          (-0.5 + Math.random()) * 2 * this.range
        );
        this.particles.push(particle);

        this.resetNextUpdate(timestamp);
      }
    };
    _addParticles();
    const _updateParticles = () => {
      if (this.particles.length > 0) {
        for (const particle of this.particles) {
          // particle.position.copy(localPlayer.position)
          //   .add(particle.offset);
          particle.position.copy(particle.offset);
          particle.update();
        }
      }
    };
    _updateParticles();
  }
}

//

class Particle extends THREE.Object3D {
  constructor(index, textureIndex, startTime, endTime, loop, parent) {
    super();

    this.index = index;
    this.textureIndex = textureIndex;
    this.startTime = startTime;
    this.endTime = endTime;
    this.loop = loop;
    this.parent = parent;
  }

  update() {
    this.parent.needsUpdate = true;
  }

  destroy() {
    this.parent.removeParticle(this);
  }
}
class ParticleSystemPack {
  constructor({
    textures,
  }) {
    this.textures = textures;
  }
}
export class ParticleSystemMesh extends THREE.InstancedMesh {
  static async loadPack(files) {
    const textures = await Promise.all(files.map(async file => {
      const texture = await loadKtx2zTexture(file);
      return texture;
    }));
    const psPack = new ParticleSystemPack({
      textures,
    });
    return psPack;
  }
  constructor({
    pack,
    size = 1,
    maxParticles = defaultMaxParticles,
  }) {
    const geometry = _makeGeometry(size, maxParticles);
    const material = _makeMaterial(pack.textures.length);
    super(geometry, material, maxParticles);

    this.frustumCulled = false;

    this.pack = pack;
    this.needsUpdate = false;

    this.material.setTextures(this.pack.textures);

    this.particles = Array(maxParticles).fill(null);
    this.count = 0;
  }

  addParticle(texture, {
    offsetTime = 0,
    loop = false,
  } = {}) {
    const {
      duration,
    } = texture;
    const now = performance.now();
    const startTime = now + offsetTime;
    const endTime = startTime + duration * 1000;

    for (let i = 0; i < this.particles.length; i++) {
      let particle = this.particles[i];
      if (particle === null) {
        const textureIndex = this.pack.textures.indexOf(texture);
        particle = new Particle(i, textureIndex, startTime, endTime, loop, this);
        this.particles[i] = particle;
        this.needsUpdate = true;
        return particle;
      }
    }
    console.warn('particles overflow');
    return null;
  }

  removeParticle(particle) {
    this.particles[particle.index] = null;
    this.needsUpdate = true;
  }

  update({
    timestamp,
    timeDiff,
    camera,
  }) {
    if (this.needsUpdate) {
      this.needsUpdate = false;

      this.updateGeometry();
    }

    this.material.uniforms.uTime.value = timestamp;
    this.material.uniforms.uTime.needsUpdate = true;
    this.material.uniforms.cameraBillboardQuaternion.value.copy(camera.quaternion);
  }

  updateGeometry() {
    let index = 0;
    for (const particle of this.particles) {
      if (particle !== null) {
        this.geometry.attributes.p.array[index*3 + 0] = particle.position.x;
        this.geometry.attributes.p.array[index*3 + 1] = particle.position.y;
        this.geometry.attributes.p.array[index*3 + 2] = particle.position.z;

        this.geometry.attributes.t.array[index*3 + 0] = particle.startTime;
        this.geometry.attributes.t.array[index*3 + 1] = particle.endTime;
        this.geometry.attributes.t.array[index*3 + 2] = particle.loop ? 1 : 0;

        this.geometry.attributes.textureIndex.array[index] = particle.textureIndex;

        index++;
      }
    }

    this.geometry.attributes.p.updateRange.count = index * 3;
    this.geometry.attributes.p.needsUpdate = true;
    
    this.geometry.attributes.t.updateRange.count = index * 3;
    this.geometry.attributes.t.needsUpdate = true;
    
    this.geometry.attributes.textureIndex.updateRange.count = index;
    this.geometry.attributes.textureIndex.needsUpdate = true;
    
    this.count = index;
  }

  waitForLoad() {
    return this.loadPromise;
  }

  destroy() {
    // nothing
  }
}