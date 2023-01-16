import * as THREE from 'three';
import {getRenderer} from '../renderer.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {Text} from 'troika-three-text';
import {fullscreenGeometry} from '../../background-fx/common.js';
import {OutlineBgFxMesh} from '../../background-fx/OutlineBgFx.js';
import {NoiseBgFxMesh} from '../../background-fx/NoiseBgFx.js';
import {PoisonBgFxMesh} from '../../background-fx/PoisonBgFx.js';
import {SmokeBgFxMesh} from '../../background-fx/SmokeBgFx.js';
import {GlyphBgFxMesh} from '../../background-fx/GlyphBgFx.js';
import {DotsBgFxMesh} from '../../background-fx/DotsBgFx.js';
import {LightningBgFxMesh} from '../../background-fx/LightningBgFx.js';
import {RadialBgFxMesh} from '../../background-fx/RadialBgFx.js';
import {GrassBgFxMesh} from '../../background-fx/GrassBgFx.js';
import {WebaverseScene} from '../webaverse-scene.js';
import {lightsManager} from '../engine-hooks/lights/lights-manager.js';
// import {DioramaRenderer} from './diorama-renderer.js';
import {SpeedHistogram} from './speed-histogram.js';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
// const localVector2D2 = new THREE.Vector2();
const localVector4D = new THREE.Vector4();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localColor = new THREE.Color();

//

const lightningMesh = new LightningBgFxMesh();
const radialMesh = new RadialBgFxMesh();
const grassMesh = new GrassBgFxMesh();
const poisonMesh = new PoisonBgFxMesh();
const noiseMesh = new NoiseBgFxMesh();
const smokeMesh = new SmokeBgFxMesh();
const glyphMesh = new GlyphBgFxMesh();
const dotsMesh = new DotsBgFxMesh();
const outlineMesh = new OutlineBgFxMesh();

const histogram = new SpeedHistogram().fromArray([
  {speed: 10, duration: 100},
  {speed: 0.05, duration: 2000},
  {speed: 10, duration: 100},
]).toArray(60);
const labelAnimationRate = 3;
const labelVertexShader = `\
  uniform float iTime;
  attribute vec3 color;
  varying vec2 tex_coords;
  varying vec3 vColor;

  float frames[${histogram.length}] = float[${histogram.length}](${histogram.map(v => v.toFixed(8)).join(', ')});
  float mapTime(float t) {
    t /= ${labelAnimationRate.toFixed(8)};
    t = mod(t, 1.);

    const float l = ${histogram.length.toFixed(8)};
    float frameIndexFloat = floor(min(t, 0.999) * l);
    //return frameIndexFloat / l;

    int frameIndex = int(frameIndexFloat);
    float leftFrame = frames[frameIndex];
    // return leftFrame;

    float rightFrame = frames[frameIndex + 1];
    float frameStartTime = frameIndexFloat / l;
    float frameDuration = 1. / (l - 1.);
    float factor = (t - frameStartTime) / frameDuration;
    float frame = leftFrame*(1.-factor) + rightFrame*factor;
    return frame;
  }

  void main() {
    tex_coords = uv;
    vColor = color;
    float t = mapTime(iTime);
    gl_Position = vec4(position.xy + vec2(-2. + t * 4., 0.) * position.z, -1., 1.);
  }
`;
const labelFragmentShader = `\
  varying vec2 tex_coords;
  varying vec3 vColor;

  vec2 rotateCCW(vec2 pos, float angle) { 
    float ca = cos(angle),  sa = sin(angle);
    return pos * mat2(ca, sa, -sa, ca);  
  }

  vec2 rotateCCW(vec2 pos, vec2 around, float angle) { 
    pos -= around;
    pos = rotateCCW(pos, angle);
    pos += around;
    return pos;
  }

  // return 1 if v inside the box, return 0 otherwise
  bool insideAABB(vec2 v, vec2 bottomLeft, vec2 topRight) {
      vec2 s = step(bottomLeft, v) - step(topRight, v);
      return s.x * s.y > 0.;   
  }

  bool isPointInTriangle(vec2 point, vec2 a, vec2 b, vec2 c) {
    vec2 v0 = c - a;
    vec2 v1 = b - a;
    vec2 v2 = point - a;

    float dot00 = dot(v0, v0);
    float dot01 = dot(v0, v1);
    float dot02 = dot(v0, v2);
    float dot11 = dot(v1, v1);
    float dot12 = dot(v1, v2);

    float invDenom = 1. / (dot00 * dot11 - dot01 * dot01);
    float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    float v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return (u >= 0.) && (v >= 0.) && (u + v < 1.);
  }

  void main() {
    vec3 c;
    if (vColor.r > 0.) {
      /* if (tex_coords.x <= 0.025 || tex_coords.x >= 0.975 || tex_coords.y <= 0.05 || tex_coords.y >= 0.95) {
        c = vec3(0.2);
      } else { */
        c = vec3(0.1 + tex_coords.y * 0.1);
      // }
    } else {
      c = vec3(0.);
    }
    gl_FragColor = vec4(c, 1.0);
  }
`;
const textVertexShader = `\
  uniform float uTroikaOutlineOpacity;
  // attribute vec3 color;
  attribute vec3 offset;
  attribute float scale;
  varying vec2 tex_coords;
  // varying vec3 vColor;

  float frames[${histogram.length}] = float[${histogram.length}](${histogram.map(v => v.toFixed(8)).join(', ')});
  float mapTime(float t) {
    t /= ${labelAnimationRate.toFixed(8)};
    t = mod(t, 1.);

    const float l = ${histogram.length.toFixed(8)};
    float frameIndexFloat = floor(min(t, 0.999) * l);
    //return frameIndexFloat / l;

    int frameIndex = int(frameIndexFloat);
    float leftFrame = frames[frameIndex];
    // return leftFrame;

    float rightFrame = frames[frameIndex + 1];
    float frameStartTime = frameIndexFloat / l;
    float frameDuration = 1. / (l - 1.);
    float factor = (t - frameStartTime) / frameDuration;
    float frame = leftFrame*(1.-factor) + rightFrame*factor;
    return frame;
  }

  void main() {
    tex_coords = uv;
    // vColor = color;

    float iTime = uTroikaOutlineOpacity;
    float t = mapTime(iTime);
    gl_Position = vec4(offset.xy + position.xy * scale + vec2(-2. + t * 4., 0.) * position.z, -1., 1.);
  }
`;
const textFragmentShader = `\
  void main() {
    gl_FragColor = vec4(vec3(1.), 1.);
  }
`;
async function makeTextMesh(
  text = '',
  material = null,
  font = '/fonts/Bangers-Regular.ttf',
  fontSize = 1,
  letterSpacing = 0,
  anchorX = 'left',
  anchorY = 'middle',
  color = 0x000000,
) {
  const textMesh = new Text();
  textMesh.text = text;
  if (material !== null) {
    textMesh.material = material;
  }
  textMesh.font = font;
  textMesh.fontSize = fontSize;
  textMesh.letterSpacing = letterSpacing;
  textMesh.color = color;
  textMesh.anchorX = anchorX;
  textMesh.anchorY = anchorY;
  textMesh.frustumCulled = false;
  await new Promise(accept => {
    textMesh.sync(accept);
  });
  return textMesh;
}

const s1 = 0.4;
const sk1 = 0.2;
const speed1 = 1;
const aspectRatio1 = 0.3;
const p1 = new THREE.Vector3(0.45, -0.65, 0);
const s2 = 0.5;
const sk2 = 0.1;
const speed2 = 1.5;
const aspectRatio2 = 0.15;
const p2 = new THREE.Vector3(0.35, -0.825, 0);
const labelMesh = (() => {
  const _decorateGeometry = (g, color, z) => {
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      color.toArray(colors, i);
      g.attributes.position.array[i + 2] = z;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  };
  const g1 = fullscreenGeometry.clone()
    .applyMatrix4(
      new THREE.Matrix4()
        .makeShear(0, 0, sk1, 0, 0, 0)
    )
    .applyMatrix4(
      new THREE.Matrix4()
        .makeScale(s1, s1 * aspectRatio1, 1)
    )
    .applyMatrix4(
      new THREE.Matrix4()
        .makeTranslation(p1.x, p1.y, p1.z)
    );
  _decorateGeometry(g1, new THREE.Color(0xFFFFFF), speed1);
  const g2 = fullscreenGeometry.clone()
    .applyMatrix4(
      new THREE.Matrix4()
        .makeShear(0, 0, sk2, 0, 0, 0)
    )
    .applyMatrix4(
      new THREE.Matrix4()
        .makeScale(s2, s2 * aspectRatio2, 1)
    )
    .applyMatrix4(
      new THREE.Matrix4()
        .makeTranslation(p2.x, p2.y, p2.z)
    );
  _decorateGeometry(g2, new THREE.Color(0x000000), speed2);
  const geometry = BufferGeometryUtils.mergeBufferGeometries([
    g2,
    g1,
  ]);
  const quad = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      uniforms: {
        iTime: {
          value: 0,
          needsUpdate: false,
        },
        /* outline_thickness: {
          value: 0.02,
          needsUpdate: true,
        },
        outline_colour: {
          value: new THREE.Color(0, 0, 1),
          needsUpdate: true,
        },
        outline_threshold: {
          value: .5,
          needsUpdate: true,
        }, */
      },
      vertexShader: labelVertexShader,
      fragmentShader: labelFragmentShader,
    })
  );
  quad.frustumCulled = false;
  return quad;
})();

const textObject = (() => {
  const o = new THREE.Object3D();
  
  const _decorateGeometry = (g, offset, z, scale) => {
    const offsets = new Float32Array(g.attributes.position.array.length);
    const scales = new Float32Array(g.attributes.position.count);
    for (let i = 0; i < g.attributes.position.array.length; i += 3) {
      offset.toArray(offsets, i);
      g.attributes.position.array[i + 2] = z;
      scales[i / 3] = scale;
    }
    g.setAttribute('offset', new THREE.BufferAttribute(offsets, 3));
    g.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
  };
  const textMaterial = new THREE.ShaderMaterial({
    vertexShader: textVertexShader,
    fragmentShader: textFragmentShader,
  });
  (async () => {
    const nameMesh = await makeTextMesh(
      'Scillia',
      textMaterial,
      '/fonts/WinchesterCaps.ttf',
      1.25,
      0.05,
      'center',
      'middle',
      0xFFFFFF,
    );
    _decorateGeometry(nameMesh.geometry, p1, speed1, s1 * aspectRatio1);
    o.add(nameMesh);
  })();
  (async () => {
    const labelMesh = await makeTextMesh(
      'pledged to the lisk',
      textMaterial,
      '/fonts/Plaza Regular.ttf',
      1,
      0.02,
      'center',
      'middle',
      0xFFFFFF,
    );
    _decorateGeometry(labelMesh.geometry, p2, speed2, s2 * aspectRatio2);
    o.add(labelMesh);
  })();
  return o;
})();

const sideScene = new WebaverseScene();
sideScene.name = 'sideScene';
sideScene.autoUpdate = false;
sideScene.add(lightningMesh);
sideScene.add(radialMesh);
sideScene.add(grassMesh);
sideScene.add(poisonMesh);
sideScene.add(noiseMesh);
sideScene.add(smokeMesh);
sideScene.add(glyphMesh);
sideScene.add(dotsMesh);
sideScene.add(outlineMesh);
sideScene.add(labelMesh);
sideScene.add(textObject);

//

class DioramaRenderer {
  constructor() {
    const sideCamera = new THREE.PerspectiveCamera();
    this.sideCamera = sideCamera;

    this.lightningMesh = lightningMesh;
    this.radialMesh = radialMesh;
    this.outlineMesh = outlineMesh;

    this.labelMesh = labelMesh;
    this.grassMesh = grassMesh;
    this.poisonMesh = poisonMesh;
    this.noiseMesh = noiseMesh;
    this.smokeMesh = smokeMesh;
    this.glyphMesh = glyphMesh;
    this.dotsMesh = dotsMesh;
    this.textObject = textObject;
    const skinnedRedMaterial = (() => {
      let wVertex = THREE.ShaderLib.standard.vertexShader;
      let wFragment = THREE.ShaderLib.standard.fragmentShader;
      let wUniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms);
      wUniforms.iTime = {
        value: 0,
        needsUpdate: false,
      };
      wFragment = `\
        void main() {
          gl_FragColor = vec4(1., 0., 0., 1.);
        }
      `;
      const material = new THREE.ShaderMaterial({
        uniforms: wUniforms,
        vertexShader: wVertex,
        fragmentShader: wFragment,
        // lights: true,
        // depthPacking: THREE.RGBADepthPacking,
        // name: "detail-material",
        // fog: true,
        extensions: {
          derivatives: true,
        },
        side: THREE.BackSide,
      });
      return material;
    })();
    
    //
    
    const outlineRenderScene = new THREE.Scene();
    outlineRenderScene.name = 'outlineRenderScene';
    outlineRenderScene.autoUpdate = false;
    outlineRenderScene.overrideMaterial = skinnedRedMaterial;
    this.outlineRenderScene = outlineRenderScene;
    
    //

    this.sideScene = sideScene;

    this.autoLights = (() => {
      const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    
      const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
      directionalLight.position.set(1, 2, 3);
      directionalLight.updateMatrixWorld();
    
      return [
        ambientLight,
        directionalLight,
      ];
    })();

    this.outlineRenderTarget = null;

  }

  #makeOutlineRenderTarget(w, h) {
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
  }

  render(timeOffset, timeDiff, width, height, objects, target, cameraOffset, canvases, opts) {
    const {
      // objects = [],
      // target = new THREE.Object3D(),
      // cameraOffset = new THREE.Vector3(0.3, 0, -0.5),
      clearColor = null,
      clearAlpha = 1,
      lights = true,
      label = null,
      outline = false,
      grassBackground = false,
      poisonBackground = false,
      noiseBackground = false,
      smokeBackground = false,
      lightningBackground = false,
      radialBackground = false,
      glyphBackground = false,
      dotsBackground = false,
      autoCamera = true,
      detached = false,
    } = opts;
    const {devicePixelRatio: pixelRatio} = globalThis;

    const renderer = getRenderer();
    const size = renderer.getSize(localVector2D);
    if (size.x < width || size.y < height) {
      console.warn('renderer is too small');
      return;
    }

    if (!this.outlineRenderTarget || (this.outlineRenderTarget.width !== width * pixelRatio) || (this.outlineRenderTarget.height !== height * pixelRatio)) {
      this.outlineRenderTarget = this.#makeOutlineRenderTarget(width * 1, height * pixelRatio);
    }

    const _addObjectsToScene = scene => {
      for (const object of objects) {
        scene.add(object);
      }
    };

    const _addAutoLightsToScene = scene => {
      if (lights) {
        for (const autoLight of this.autoLights) {
          scene.add(autoLight);
        }
      }
    };

    const _addRootLightsToScene = scene => {
      const restoreFn = [];
      for (const light of lightsManager.lights) {
        const oldParent = light.parent;
        restoreFn.push(() => {
          oldParent.add(light);
        });
        scene.add(light);
      }
      return () => {
        for (const fn of restoreFn) {
          fn();
        }
      };
    };

    let oldRenderTarget = null;
    let oldViewport = null;
    let oldClearColor = null;
    let oldClearAlpha = null;
    const _pushState = () => {
      const oldParents = (() => {
        const parents = new WeakMap();
        for (const object of objects) {
          parents.set(object, object.parent);
        }
        return parents;
      })();
      const _restoreParents = () => {
        for (const object of objects) {
          const parent = oldParents.get(object);
          if (parent) {
            parent.add(object);
          } else {
            if (object.parent) {
              object.parent.remove(object);
            }
          }
        }
        if (lights) {
          for (const autoLight of this.autoLights) {
            autoLight.parent.remove(autoLight);
          }
        }
      };
      oldRenderTarget = renderer.getRenderTarget();
      oldViewport = renderer.getViewport(localVector4D);
      oldClearColor = renderer.getClearColor(localColor);
      oldClearAlpha = renderer.getClearAlpha();

      return () => {
        _restoreParents();
        renderer.setRenderTarget(oldRenderTarget);
        renderer.setViewport(oldViewport);
        renderer.setClearColor(oldClearColor, oldClearAlpha);
      };
    };
    const _popState = _pushState();

    const _render = () => {
      if (autoCamera) {
        // set up side camera
        target.matrixWorld.decompose(localVector, localQuaternion, localVector2);
        const targetPosition = localVector;
        const targetQuaternion = localQuaternion;

        this.sideCamera.position.copy(targetPosition)
          .add(
            localVector2.set(cameraOffset.x, 0, cameraOffset.z)
              .applyQuaternion(targetQuaternion)
          );
          this.sideCamera.quaternion.setFromRotationMatrix(
          localMatrix.lookAt(
            this.sideCamera.position,
            targetPosition,
            localVector3.set(0, 1, 0)
          )
        );
        this.sideCamera.position.add(
          localVector2.set(0, cameraOffset.y, 0)
            .applyQuaternion(targetQuaternion)
        );
        this.sideCamera.updateMatrixWorld();
      }

      // set up side avatar scene
      _addObjectsToScene(this.outlineRenderScene);
      _addAutoLightsToScene(this.outlineRenderScene);
      // this.outlineRenderScene.add(world.lights);
      // render side avatar scene
      renderer.setRenderTarget(this.outlineRenderTarget);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      if (outline) {
        renderer.render(this.outlineRenderScene, this.sideCamera);
      }
      
      // set up side scene
      _addObjectsToScene(this.sideScene);
      const restoreRootLightsFn = _addRootLightsToScene(this.sideScene);
      // sideScene.add(world.lights);

      const _setupBackground = () => {
        const _renderGrass = () => {
          if (grassBackground) {
            this.grassMesh.update(timeOffset, timeDiff, width, height);
            this.grassMesh.visible = true;
          } else {
            this.grassMesh.visible = false;
          }
        };
        _renderGrass();
        const _renderPoison = () => {
          if (poisonBackground) {
            this.poisonMesh.update(timeOffset, timeDiff, width, height);
            this.poisonMesh.visible = true;
          } else {
            this.poisonMesh.visible = false;
          }
        };
        _renderPoison();
        const _renderNoise = () => {
          if (noiseBackground) {
            this.noiseMesh.update(timeOffset, timeDiff, width, height);
            this.noiseMesh.visible = true;
          } else {
            this.noiseMesh.visible = false;
          }
        };
        _renderNoise();
        const _renderSmoke = () => {
          if (smokeBackground) {
            this.smokeMesh.update(timeOffset, timeDiff, width, height);
            this.smokeMesh.visible = true;
          } else {
            this.smokeMesh.visible = false;
          }
        };
        _renderSmoke();
        const _renderLightning = () => {
          if (lightningBackground) {
            this.lightningMesh.update(timeOffset, timeDiff, width, height);
            this.lightningMesh.visible = true;
          } else {
            this.lightningMesh.visible = false;
          }
        };
        _renderLightning();
        const _renderRadial = () => {
          if (radialBackground) {
            this.radialMesh.update(timeOffset, timeDiff, width, height);
            this.radialMesh.visible = true;
          } else {
            this.radialMesh.visible = false;
          }
        };
        _renderRadial();
        const _renderGlyph = () => {
          if (glyphBackground) {
            this.glyphMesh.update(timeOffset, timeDiff, width, height);
            this.glyphMesh.visible = true;
          } else {
            this.glyphMesh.visible = false;
          }
        };
        _renderGlyph();
        const _renderDots = () => {
          if (dotsBackground) {
            this.dotsMesh.update(timeOffset, timeDiff, width, height);
            this.dotsMesh.visible = true;
          } else {
            this.dotsMesh.visible = false;
          }
        };
        _renderDots();
        const _renderOutline = () => {
          if (outline) {
            this.outlineMesh.update(timeOffset, timeDiff, width, height, this.outlineRenderTarget.texture);
            this.outlineMesh.visible = true;
          } else {
            this.outlineMesh.visible = false;
          }
        };
        _renderOutline();
        const _renderLabel = () => {
          if (label) {
            this.labelMesh.material.uniforms.iTime.value = timeOffset / 1000;
            this.labelMesh.material.uniforms.iTime.needsUpdate = true;
            this.labelMesh.visible = true;
            for (const child of this.textObject.children) {
              child.material.uniforms.uTroikaOutlineOpacity.value = timeOffset / 1000;
              child.material.uniforms.uTroikaOutlineOpacity.needsUpdate = true;
            }
            this.textObject.visible = true;
          } else {
            this.labelMesh.visible = false;
            this.textObject.visible = false;
          }
        };
        _renderLabel();
      };
      _setupBackground();
      
      const _renderSceneCamera = () => {
        renderer.setRenderTarget(oldRenderTarget);
        renderer.setViewport(0, 0, width, height);
        if (clearColor !== null) {
          renderer.setClearColor(clearColor, clearAlpha);
        }
        renderer.clear();
        renderer.render(this.sideScene, this.sideCamera);
      };
      _renderSceneCamera();

      const _copyFrame = () => {
        for (const canvas of canvases) {
          const {
            width: canvasWidth,
            height: canvasHeight,
            ctx,
          } = canvas;
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          // ctx.filter = 'brightness(1.25)';
          ctx.drawImage(
            renderer.domElement,
            0,
            size.y * pixelRatio - height * pixelRatio,
            width * pixelRatio,
            height * pixelRatio,
            0,
            0,
            canvasWidth,
            canvasHeight
          );
        }
      };
      _copyFrame();

      restoreRootLightsFn();
    };
    _render();

    _popState();
  }

  async waitForLoad() {

  }
}

//

class Diorama {
  
}

//

let sideSceneCompiled = false;
const _ensureSideSceneCompiled = () => {
  if (!sideSceneCompiled) {
    const renderer = getRenderer();
    const camera = new THREE.PerspectiveCamera();
    renderer.compile(sideScene, camera);
    sideSceneCompiled = true;
  }
};

const createPlayerDiorama = (opts = {}) => {
  _ensureSideSceneCompiled();

  let {
    objects = [],
    target = new THREE.Object3D(),
    cameraOffset = new THREE.Vector3(0.3, 0, -0.5),
    detached = false,
  } = opts;

  const canvases = [];
  let lastDisabledTime = 0;
  const dioramaRenderer = new DioramaRenderer();

  const diorama = {
    width: 0,
    height: 0,
    camera: dioramaRenderer.sideCamera,
    dioramaRenderer,
    // loaded: false,
    setTarget(newTarget) {
      target = newTarget;
    },
    setObjects(newObjects) {
      objects = newObjects;
    },
    getCanvases() {
      return canvases;
    },
    resetCanvases() {
      canvases.length = 0;
    },
    addCanvas(canvas) {
      const {width, height} = canvas;
      this.width = Math.max(this.width, width);
      this.height = Math.max(this.height, height);

      const ctx = canvas.getContext('2d');
      canvas.ctx = ctx;

      canvases.push(canvas);

      this.updateAspect();
    },
    setSize(width, height) {
      this.width = width;
      this.height = height;

      this.updateAspect();
    },
    updateAspect() {
      const newAspect = this.width / this.height;
      if (dioramaRenderer.sideCamera.aspect !== newAspect) {
        dioramaRenderer.sideCamera.aspect = newAspect;
        dioramaRenderer.sideCamera.updateProjectionMatrix();
      }
    },
    removeCanvas(canvas) {
      const index = canvases.indexOf(canvas);
      if (index !== -1) {
        canvases.splice(index, 1);
      }
    },
    toggleShader() {
      const oldValues = {
        grassBackground: opts.grassBackground,
        poisonBackground: opts.poisonBackground,
        noiseBackground: opts.noiseBackground,
        smokeBackground: opts.smokeBackground,
        lightningBackground: opts.lightningBackground,
        radialBackground: opts.radialBackground,
        glyphBackground: opts.glyphBackground,
        dotsBackground: opts.dotsBackground,
      };
      opts.grassBackground = false;
      opts.poisonBackground = false;
      opts.noiseBackground = false;
      opts.smokeBackground = false;
      opts.lightningBackground = false;
      opts.radialBackground = false;
      opts.glyphBackground = false;
      opts.dotsBackground = false;
      if (oldValues.grassBackground) {
        opts.poisonBackground = true;
      } else if (oldValues.poisonBackground) {
        opts.noiseBackground = true;
      } else if (oldValues.noiseBackground) {
        opts.smokeBackground = true;
      } else if (oldValues.smokeBackground) {
        opts.lightningBackground = true;
      } else if (oldValues.lightningBackground) {
        opts.radialBackground = true;
      } else if (oldValues.radialBackground) {
        opts.glyphBackground = true;
      } else if (oldValues.glyphBackground) {
        opts.grassBackground = true;
      }
    },
    setCameraOffset(newCameraOffset) {
      cameraOffset.copy(newCameraOffset);
    },
    setClearColor(newClearColor, newClearAlpha) {
      opts.clearColor = newClearColor;
      opts.clearAlpha = newClearAlpha;
    },
    update(timestamp, timeDiff) {
      if (canvases.length === 0) {
        lastDisabledTime = timestamp;
        return;
      }
      const timeOffset = timestamp - lastDisabledTime;

      // console.log('render', {
      //   timeOffset, timeDiff, width: this.width, height: this.height, objects, target, cameraOffset, canvases,
      // });
      dioramaRenderer.render(timeOffset, timeDiff, this.width, this.height, objects, target, cameraOffset, canvases, opts);
    },
    destroy() {
      const index = dioramas.indexOf(diorama);
      if (index !== -1) {
        dioramas.splice(index, 1);
      }
    },
  };

  if (!detached) {
    dioramas.push(diorama);
  }
  return diorama;
};

//

let dioramaRenderer = null;
const dioramas = [];
const dioramaManager = {
  createPlayerDiorama,
  update(timestamp, timeDiff) {
    for (const diorama of dioramas) {
      diorama.update(timestamp, timeDiff);
    }
  },
  waitForLoad() {
    dioramaRenderer = new DioramaRenderer();
    return dioramaRenderer.waitForLoad();
  },
};
export default dioramaManager;