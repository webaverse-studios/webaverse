import * as THREE from 'three';
import {KTX2Loader} from 'three/examples/jsm/loaders/KTX2Loader.js';
import {
  zbdecode,
} from '../../zine/encoding.js';


const getKtx2Loader = (() => {
  let ktx2Loader = null;
  return () => {
    if (!ktx2Loader) {
      ktx2Loader = new KTX2Loader();
      ktx2Loader.load = (_load => function load() {
        // console.log('ktx2 loader load', this.workerConfig);
        if (!this.workerConfig) {
          const renderer = new THREE.WebGLRenderer();
          this.detectSupport(renderer);
          renderer.dispose();
        }
        return _load.apply(this, arguments);
      })(ktx2Loader.load);
      ktx2Loader.setTranscoderPath('/three/basis/');
    }
    return ktx2Loader;
  };
})();

export const loadKtx2zTexture = async file => {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const zJson = zbdecode(uint8Array);
  // console.log('got z json', zJson);
  const [
    numFrames,
    width,
    height,
    numFramesPerX,
    numFramesPerY,
    duration,
    ktx2Uint8Array,
  ] = zJson;

  const ktx2Blob = new Blob([ktx2Uint8Array], {
    type: 'application/octet-stream',
  });

  const texture = await new Promise((accept, reject) => {
    const ktx2Loader = getKtx2Loader();
    const u = URL.createObjectURL(ktx2Blob);
    const cleanup = () => {
      URL.revokeObjectURL(u);
    };
    ktx2Loader.load(u, t => {
      accept(t);
      cleanup();
    }, function onProgress() {}, err => {
      reject(err);
      cleanup();
    });
  });
  texture.name = name;
  texture.anisotropy = 16;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  // use mip mapped filter
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  
  texture.numFrames = numFrames;
  texture.width = width;
  texture.height = height;
  texture.numFramesPerX = numFramesPerX;
  texture.numFramesPerY = numFramesPerY;
  texture.duration = duration;

  return texture;
};