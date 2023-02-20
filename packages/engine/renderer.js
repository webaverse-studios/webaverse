/*
this file contains the main objects we use for rendering.
the purpose of this file is to hold these objects and to make sure they are correctly configured (e.g. handle canvas resize)
*/

import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {makePromise} from './util.js';
import {minFov, minCanvasSize} from './constants.js';
import {WebaverseScene} from './webaverse-scene.js';

// XXX enable this when the code is stable; then, we will have many more places to add missing matrix updates
// THREE.Object3D.DefaultMatrixAutoUpdate = false;

let offscreenCanvas = null; let canvas = null; let context = null; let renderer = null; let composer = null;

const waitPromise = makePromise();
const waitForLoad = () => waitPromise;

function bindCanvas(c) {
  // initialize renderer
  canvas = c;
  // context = canvas && canvas.getContext('webgl2', {
  //   antialias: true,
  //   alpha: true,
  //   xrCompatible: true,
  // });

  // get canvas context as a bitmap renderer
  context = canvas && canvas.getContext('bitmaprenderer');

  offscreenCanvas = new OffscreenCanvas(1024, 1024);

  renderer = new THREE.WebGLRenderer({
    canvas: offscreenCanvas,
    antialias: true,
    alpha: true,
    rendererExtensionFragDepth: true,
  });
  
  const {
    width,
    height,
    pixelRatio,
  } = _getCanvasDimensions();
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(pixelRatio);

  renderer.autoClear = false;
  renderer.sortObjects = false;
  renderer.physicallyCorrectLights = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;

  // initialize post-processing
  const renderTarget = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    encoding: THREE.sRGBEncoding,
  });
  renderTarget.name = 'effectComposerRenderTarget';
  renderTarget.samples = context.MAX_SAMPLES; // XXX make this based on the antialiasing settings
  renderTarget.texture.generateMipmaps = false;
  composer = new EffectComposer(renderer, renderTarget);

  // initialize camera
  _setCameraSize(width, height, pixelRatio);

  // resolve promise
  waitPromise.accept();
}

function getRenderer() {
  return renderer;
}
function getContainerElement() {
  const container = canvas.parentNode;
  return container;
}

function getComposer() {
  return composer;
}

let renderBeforeFunc = null
let renderAfterFunc = null
function renderBeforeComposer() {
  if (renderBeforeFunc) renderBeforeFunc()
}

function renderAfterComposer() {
  if (renderAfterFunc) renderAfterFunc()
}

function setRenderBeforeComposer(func) {
  renderBeforeFunc = func
}
function setRenderAfterComposer(func) {
  renderAfterFunc = func
}

const scene = new THREE.Scene();
scene.name = 'scene';
const sceneHighPriority = new THREE.Scene();
sceneHighPriority.name = 'highPriorioty';
const sceneLowPriority = new THREE.Scene();
sceneLowPriority.name = 'lowPriorioty';
const sceneLowerPriority = new THREE.Scene();
sceneLowerPriority.name = 'lowerPriorioty';
const sceneLowestPriority = new THREE.Scene();
sceneLowestPriority.name = 'lowestPriorioty';
const rootScene = new WebaverseScene();
rootScene.name = 'root';
rootScene.autoUpdate = false;
rootScene.add(sceneHighPriority);
rootScene.add(scene);
rootScene.add(sceneLowPriority);
rootScene.add(sceneLowerPriority);
rootScene.add(sceneLowestPriority);

const camera = new THREE.PerspectiveCamera(minFov, 1, 0.1, 10000);
camera.position.set(0, 1.6, 0);
camera.rotation.order = 'YXZ';
camera.name = 'sceneCamera';

scene.add(camera);

const _getCanvasDimensions = () => {
  let width = globalThis.innerWidth;
  let height = globalThis.innerHeight;
  const pixelRatio = globalThis.devicePixelRatio;

  width = Math.max(width, minCanvasSize);
  height = Math.max(height, minCanvasSize);
  
  return {
    width,
    height,
    pixelRatio,
  };
};

const _setSizes = () => {
  const {
    width,
    height,
    pixelRatio,
  } = _getCanvasDimensions();
  _setRendererSize(width, height, pixelRatio);
  _setComposerSize(width, height, pixelRatio);
  _setCameraSize(width, height, pixelRatio);
};

const _setRendererSize = (width, height, pixelRatio) => {
  const renderer = getRenderer();
  if (renderer) {
    // pause XR since it gets in the way of resize
    if (renderer.xr.getSession()) {
      renderer.xr.isPresenting = false;
    }

    /* const {
      width,
      height,
      pixelRatio,
    } = _getCanvasDimensions(); */
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(pixelRatio);

    // resume XR
    if (renderer.xr.getSession()) {
      renderer.xr.isPresenting = true;
    }
  }
};
const _setComposerSize = (width, height, pixelRatio) => {
  const composer = getComposer();
  if (composer) {
    composer.setSize(width, height);
    composer.setPixelRatio(pixelRatio);
  }
};
const _setCameraSize = (width, height, pixelRatio) => {
  const aspect = width / height;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
};

if (typeof window !== 'undefined') {
  globalThis.window.addEventListener('resize', e => {
    _setSizes();
  });
}

export {
  waitForLoad,
  bindCanvas,
  getRenderer,
  getContainerElement,
  getComposer,
  renderBeforeComposer,
  renderAfterComposer,
  setRenderBeforeComposer,
  setRenderAfterComposer,
  canvas,
  offscreenCanvas,
  scene,
  rootScene,
  camera,
  sceneHighPriority,
  sceneLowPriority,
  sceneLowerPriority,
  sceneLowestPriority,
};