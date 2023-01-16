import * as THREE from 'three';
import {
  chunkSize,
} from '../../constants/procgen-constants.js';
import {
  chunksPerView,
  spacing,
  maxChunks,
} from '../../constants/map-constants.js';
import {getScaleInt} from '../../public/utils/procgen-utils.js';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localMatrix = new THREE.Matrix4();

const zeroQuaternion = new THREE.Quaternion();

//

const _getChunkHeightfieldAsync = async (x, z, lod, {
  instance,
  signal = null,
} = {}) => {
  const min = new THREE.Vector2(x, z);
  const lodArray = Int32Array.from([lod, lod]);
  const generateFlags = {
    terrain: false,
    water: false,
    barrier: false,
    vegetation: false,
    grass: false,
    poi: true,
    heightfield: true,
  };
  const numVegetationInstances = 0; // litterUrls.length;
  const numGrassInstances = 0; // grassUrls.length;
  const numPoiInstances = 0; // hudUrls.length;
  const options = {
    signal,
  };
  const chunkResult = await instance.generateChunk(
    min,
    lod,
    lodArray,
    generateFlags,
    numVegetationInstances,
    numGrassInstances,
    numPoiInstances,
    options,
  );
  return chunkResult;
};

export class HeightfieldsMesh extends THREE.InstancedMesh {
  constructor({
    instance,
  }) {
    const chunksGeometry = new THREE.PlaneGeometry(1, 1)
      .translate(0.5, -0.5, 0)
      .rotateX(-Math.PI / 2);
    const chunksInstancedGeometry = new THREE.InstancedBufferGeometry();
    chunksInstancedGeometry.attributes = chunksGeometry.attributes;
    chunksInstancedGeometry.index = chunksGeometry.index;
    const uvs2 = new Float32Array(2 * maxChunks);
    const uvs2Attribute = new THREE.InstancedBufferAttribute(uvs2, 2);
    chunksInstancedGeometry.setAttribute('uv2', uvs2Attribute);
    // console.log('got geo', chunksInstancedGeometry);

    const canvas = document.createElement('canvas');
    canvas.width = chunksPerView * chunkSize;
    canvas.height = chunksPerView * chunkSize;
    canvas.ctx = canvas.getContext('2d');
    canvas.ctx.imageData = canvas.ctx.createImageData(chunkSize, chunkSize);
    /* canvas.style.cssText = `\
      position: fixed;
      top: 0;
      left: 0;
      z-index: 100;
      pointer-events: none;
    `; */

    const uTex = new THREE.Texture(canvas);
    // uTex.flipY = false;
    const chunksMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTex: {
          value: uTex,
          needsUpdate: true,
        },
        opacity: {
          value: 1,
          needsUpdate: true,
        },
      },
      vertexShader: `\
        attribute vec2 uv2;
        varying vec2 vUv;
      
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vUv = uv2 + uv / ${chunksPerView.toFixed(8)};
          // vUv = uv;
        }
      `,
      fragmentShader: `\
        uniform sampler2D uTex;
        uniform float opacity;
        varying vec2 vUv;

        void main() {
          // vec3 uvc = vec3(vUv.x, 0.0, vUv.y);

          vec4 c = texture2D(uTex, vUv);
          // c.rgb += uvc;
          gl_FragColor = vec4(c.rgb, opacity);
        }
      `,
      transparent: true,
    });
    // chunksMaterial.uniforms.uTex.value.onUpdate = () => {
    //   console.log('tex update');
    // };

    super(
      chunksInstancedGeometry,
      chunksMaterial,
      maxChunks,
    );

    this.instance = instance;

    this.canvas = canvas;
    // document.body.appendChild(canvas); // XXX debugging
    this.updateCancelFn = null;
  }

  addChunk({
    chunk,
    freeListEntry,
    camera,
    signal,
  }) {
    (async () => {
      try {
        const {min} = chunk;
        const scaleInt = getScaleInt(camera.scale.x);
        
        const chunkResult = await _getChunkHeightfieldAsync(min.x, min.y, scaleInt, {
          instance: this.instance,
          signal,
        });
        // console.log('got chunk result', chunkResult);
        const {
          heightfields,
          poiInstances,
        } = chunkResult;
        
        const _updateHeightfields = () => {
          const {
            pixels,
          } = heightfields;

          const dx = freeListEntry % chunksPerView;
          const dy = Math.floor(freeListEntry / chunksPerView);

          const _updateGeometry = () => {
            localMatrix.compose(
              localVector.set(
                min.x * chunkSize,
                0,
                min.y * chunkSize,
              ),
              zeroQuaternion,
              localVector2.setScalar(scaleInt * chunkSize - spacing),
            );
            this.setMatrixAt(freeListEntry, localMatrix);
            this.instanceMatrix.needsUpdate = true;

            // update uvs
            // XXX why does the right/bottom get removed and then added again when scrolling left/up?
            const uvX = dx / chunksPerView;
            const uvY = (1 - 1 / chunksPerView) - (dy / chunksPerView);
            this.geometry.attributes.uv2.array[freeListEntry * 2] = uvX;
            this.geometry.attributes.uv2.array[freeListEntry * 2 + 1] = uvY;
            this.geometry.attributes.uv2.needsUpdate = true;
          };
          const _updateTexture = () => {
            const {ctx} = this.canvas;
            const {imageData} = ctx;
            let index = 0;
            for (let ddz = 0; ddz < chunkSize; ddz++) {
              for (let ddx = 0; ddx < chunkSize; ddx++) {
                const srcHeight = pixels[index];
                const srcWater = pixels[index + 1];
                imageData.data[index] = srcHeight;
                imageData.data[index + 1] = srcWater;
                imageData.data[index + 2] = 0;
                imageData.data[index + 3] = 255;

                index += 4;
              }
            }
            ctx.putImageData(imageData, dx * chunkSize, dy * chunkSize);
            this.material.uniforms.uTex.value.needsUpdate = true;
            // console.log('update', this.material.uniforms.uTex);
          };
          _updateGeometry();
          _updateTexture();
        };
        const _updatePois = () => {
          // XXX
        };
        _updateHeightfields();
        _updatePois();
      } catch(err) {
        if (!err?.isAbortError) {
          throw err;
        }
      }
    })();
  }

  removeChunk(freeListEntry) {
    // console.log('remove chunk', chunk.min.toArray().join(','), freeListEntry);
    
    // const {min} = chunk;
    localMatrix.makeScale(
      0,
      0,
      0,
    );
    this.setMatrixAt(freeListEntry, localMatrix);
    this.instanceMatrix.needsUpdate = true;

    /* // update texture
    const dx = freeListEntry % chunksPerView;
    const dy = Math.floor(freeListEntry / chunksPerView);

    const {ctx} = this.canvas;
    ctx.clearRect(dx * chunkSize, dy * chunkSize, chunkSize, chunkSize);
    this.material.uniforms.uTex.value.needsUpdate = true; */
  }

  setOpacity(opacity) {
    this.material.uniforms.opacity.value = opacity;
    this.material.uniforms.opacity.needsUpdate = true;
  }

  destroy() {
    // this.canvas?.parentNode?.removeChild(this.canvas);
  }
}