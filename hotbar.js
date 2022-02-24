import * as THREE from 'three';
// import {world} from './world.js';
import {getRenderer} from './renderer.js';
import easing from './easing.js';
import {createObjectSprite} from './object-spriter.js';

const cubicBezier = easing(0, 1, 0, 1);

const fullscreenVertexShader = `\
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;
const fullscreenFragmentShader = `\
  uniform sampler2D uTex;
  uniform float uTexEnabled;
  uniform float uSelected;
  uniform float uSelectFactor;
  uniform float uTime;
  uniform float numFrames;
  uniform float numFramesPerRow;
  varying vec2 vUv;

  //---------------------------------------------------------------------------
  //1D Perlin noise implementation 
  //---------------------------------------------------------------------------
  #define HASHSCALE 0.1031
  float hash(float p) {
    vec3 p3  = fract(vec3(p) * HASHSCALE);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
  }
  float fade(float t) { return t*t*t*(t*(6.*t-15.)+10.); }
  float grad(float hash, float p) {
    int i = int(1e4*hash);
    return (i & 1) == 0 ? p : -p;
  }
  float perlinNoise1D(float p) {
    float pi = floor(p), pf = p - pi, w = fade(pf);
    return mix(grad(hash(pi), pf), grad(hash(pi + 1.0), pf - 1.0), w) * 2.0;
  }
  float fbm(float pos, int octaves, float persistence) {
    float total = 0., frequency = 1., amplitude = 1., maxValue = 0.;
    for(int i = 0; i < octaves; ++i) {
        total += perlinNoise1D(pos * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2.;
    }
    return total / maxValue;
  }
  
  struct Tri {
    vec2 a;
    vec2 b;
    vec2 c;
  };

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
  bool isPointInTriangle(vec2 point, Tri tri) {
    return isPointInTriangle(point, tri.a, tri.b, tri.c);
  }
  bool isInsideChevron(vec2 point, vec2 center, float width, float height, float skew) {
    point -= center;

    vec2 a = vec2(-width/2., height/2. - skew);
    vec2 b = vec2(-width/2., -height/2. - skew);
    vec2 c = vec2(0., height/2. + skew);
    vec2 d = vec2(0., -height/2. + skew);
    vec2 e = vec2(width/2., height/2. - skew);
    vec2 f = vec2(width/2., -height/2. - skew);
    Tri t1 = Tri(a, b, c);
    Tri t2 = Tri(b, d, c);
    Tri t3 = Tri(e, f, c);
    Tri t4 = Tri(f, d, c);

    return isPointInTriangle(point, t1) ||
      isPointInTriangle(point, t2) ||
      isPointInTriangle(point, t3) ||
      isPointInTriangle(point, t4);
  }

  void main() {
    // base color
    vec3 baseColor;
    const float borderWidth = 0.03;
    float boxInnerRadius = 0.5 - borderWidth;
    float boxInnerSize = boxInnerRadius * 2.;
    bool isInside = vUv.x >= borderWidth &&
      vUv.x <= 1.-borderWidth &&
      vUv.y >= borderWidth &&
      vUv.y <= 1.-borderWidth;
    bool isBorder = !isInside;
    if (isInside) {
      baseColor = vec3(0.1);
      float distanceToCenter = length(vUv - vec2(0.5));
      float distanceFactor = min(max(distanceToCenter / boxInnerRadius, 0.), 1.);
      baseColor += 0.15 * (1. - distanceFactor);
    } else {
      baseColor = vec3(0.);
    }

    // highlight color
    vec3 highlightColor = baseColor;
    if (isBorder) {
      if (uSelected > 0.) {
        vec3 color3 = vec3(${new THREE.Color(0x59C173).toArray().map(n => n.toFixed(8)).join(', ')});
        vec3 color4 = vec3(${new THREE.Color(0x5D26C1).toArray().map(n => n.toFixed(8)).join(', ')});
        vec3 colorMix2 = mix(color3, color4, vUv.y);
        
        highlightColor = colorMix2 * 0.5;
        // highlightColor.gb = vUv * 0.5;
      }
    } else {
      vec3 color1 = vec3(${new THREE.Color(0x00F260).toArray().map(n => n.toFixed(8)).join(', ')});
      vec3 color2 = vec3(${new THREE.Color(0x0575E6).toArray().map(n => n.toFixed(8)).join(', ')});
      vec3 colorMix = mix(color1, color2, vUv.y);

      float extraIntensity = min(max(0.5 + fbm(uTime * 0.001 * 3., 3, 0.7), 0.), 1.) * 0.5;
      float distanceToBottomMiddle = length(vUv - vec2(0.5, 1.));
      float extraFactor = min(max(distanceToBottomMiddle, 0.), 1.);

      highlightColor.rgb += colorMix * extraFactor * extraIntensity * uSelectFactor;

      const int numChevrons = 5;
      float fNumChevrons = float(numChevrons);
      float timeYOffset = mod(uTime / 1000. * 2., 1.);
      for (int i = 0; i < numChevrons; i++) {
        float fi = float(i);
        vec2 uv2 = vUv;
        /* uv2.x -= 0.5;
        uv2.x *= (0.5 + uv2.y * 0.5) * 1.2;
        uv2.x += 0.5; */
        if (isInsideChevron(uv2, vec2(0.5, (fi + 0.5)/fNumChevrons + timeYOffset/fNumChevrons), 0.5, 0.05, 0.05)) {
          // if (uSelected > 0.) {
            highlightColor = mix(highlightColor, vec3(0.7), (1. - vUv.y) * 0.3 * uSelectFactor);
          /* } else {
            // highlightColor = mix(highlightColor, vec3(0.1), (1. - vUv.y) * 0.25);
          } */
          break;
        }
      }

      const float arrowHeight = 0.25;
      Tri t1 = Tri(
        vec2(borderWidth, borderWidth),
        vec2(0.5, arrowHeight),
        vec2(0.5, borderWidth)
      );
      Tri t2 = Tri(
        vec2(0.5, borderWidth),
        vec2(0.5, arrowHeight),
        vec2(1. - borderWidth, borderWidth)
      );
      float arrowHeightOffset = (-1. + uSelectFactor) * arrowHeight;
      t1.a.y += arrowHeightOffset;
      t1.b.y += arrowHeightOffset;
      t1.c.y += arrowHeightOffset;
      t2.a.y += arrowHeightOffset;
      t2.b.y += arrowHeightOffset;
      t2.c.y += arrowHeightOffset;
      if (
        isPointInTriangle(vUv, t1) ||
        isPointInTriangle(vUv, t2)
      ) {
        highlightColor = vec3(1.);
      }
    }

    // sample texture
    vec4 s;
    if (uTexEnabled > 0.) {
      float f = mod(uTime / 1000. * 0.5, 1.);
      float frameIndex = floor(f * numFrames);
      float x = mod(frameIndex, numFramesPerRow);
      float y = floor(frameIndex / numFramesPerRow);

      float frameSize = 1. / numFramesPerRow;

      float xOffset = x * frameSize;
      float yOffset = y * frameSize;

      vec2 uv = vUv;
      uv.x = xOffset + uv.x * frameSize;
      uv.y = yOffset + uv.y * frameSize;

      // gl_FragColor.gb = uv;
      // gl_FragColor.a = 1.;

      s = texture2D(uTex, uv);
    } else {
      s = vec4(0.);
    }

    // result
    gl_FragColor.rgb = highlightColor * (1.-s.a) + s.rgb * s.a;
    gl_FragColor.a = 1.;
  }
`;
const localVector2D = new THREE.Vector2();
const localVector4D = new THREE.Vector4();

const _makeHotbarRendererScene = () => {
  const scene = new THREE.Scene();

  const fullScreenQuadMesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: {
        uTex: {
          value: null,
          needsUpdate: false,
        },
        uTexEnabled: {
          value: 0,
          needsUpdate: true,
        },
        uSelected: {
          value: 0,
          needsUpdate: true,
        },
        uSelectFactor: {
          value: 0,
          needsUpdate: true,
        },
        uTime: {
          value: 0,
          needsUpdate: true,
        },
        numFrames: {
          value: 0,
          needsUpdate: true,
        },
        numFramesPerRow: {
          value: 0,
          needsUpdate: true,
        },
      },
      vertexShader: fullscreenVertexShader,
      fragmentShader: fullscreenFragmentShader,
      depthTest: false,
    }),
  );
  fullScreenQuadMesh.frustumCulled = false;
  scene.add(fullScreenQuadMesh);
  scene.fullScreenQuadMesh = fullScreenQuadMesh;

  return scene;
};

class HotbarRenderer {
  constructor(width, height, selected) {
    this.width = width;
    this.height = height;

    this.scene = _makeHotbarRendererScene();
    this.camera = new THREE.OrthographicCamera(
      -1,
      1,
      1,
      -1,
      0,
      1000
    );
    this.canvases = [];
    this.app = null;
    this.selected = selected;
    this.selectFactor = +selected;
    this.needsUpdate = false;
  }
  addCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.ctx = ctx;

    this.canvases.push(canvas);
    this.needsUpdate = true;
  }
  removeCanvas(canvas) {
    this.canvases.splice(this.canvases.indexOf(canvas), 1);
    this.needsUpdate = true;
  }
  setSelected(selected) {
    this.selected = selected;
    this.needsUpdate = true;
  }
  setApp(app) {
    if (app) {
      (async () => {
        const {
          texture,
          numFrames,
          // frameSize,
          numFramesPerRow,
        } = await createObjectSprite(app);
        // console.log('got new render target', {texture, numFrames, frameSize, numFramesPerRow});
        this.scene.fullScreenQuadMesh.material.uniforms.uTex.value = texture;
        this.scene.fullScreenQuadMesh.material.uniforms.uTex.needsUpdate = true;
        this.scene.fullScreenQuadMesh.material.uniforms.uTexEnabled.value = 1;
        this.scene.fullScreenQuadMesh.material.uniforms.uTexEnabled.needsUpdate = true;
        this.scene.fullScreenQuadMesh.material.uniforms.numFrames.value = numFrames;
        this.scene.fullScreenQuadMesh.material.uniforms.numFrames.needsUpdate = true;
        this.scene.fullScreenQuadMesh.material.uniforms.numFramesPerRow.value = numFramesPerRow;
        this.scene.fullScreenQuadMesh.material.uniforms.numFramesPerRow.needsUpdate = true;
      })().catch(err => {
        console.warn('error rendering hotbar app', err);
      });
    } else {
      /* this.scene.fullScreenQuadMesh.material.uniforms.uTex.value = null;
      this.scene.fullScreenQuadMesh.material.uniforms.uTex.needsUpdate = true; */
      this.scene.fullScreenQuadMesh.material.uniforms.uTexEnabled.value = 0;
      this.scene.fullScreenQuadMesh.material.uniforms.uTexEnabled.needsUpdate = true;
      /* this.scene.fullScreenQuadMesh.material.uniforms.numFrames.value = numFrames;
      this.scene.fullScreenQuadMesh.material.uniforms.numFrames.needsUpdate = true;
      this.scene.fullScreenQuadMesh.material.uniforms.numFramesPerRow.value = numFramesPerRow;
      this.scene.fullScreenQuadMesh.material.uniforms.numFramesPerRow.needsUpdate = true; */
    }

    this.app = app;
    this.needsUpdate = true;
  }
  update(timestamp, timeDiff) {
    const renderer = getRenderer();
    const size = renderer.getSize(localVector2D);
    const pixelRatio = renderer.getPixelRatio();

    const lastSelectFactor = this.selectFactor;

    if (this.selected) {
      this.selectFactor += timeDiff / 1000;
    } else {
      this.selectFactor -= timeDiff / 1000;
    }
    this.selectFactor = Math.min(Math.max(this.selectFactor, 0), 1);

    if (this.needsUpdate) {
      const _render = () => {
        // push old state
        const oldRenderTarget = renderer.getRenderTarget();
        const oldViewport = renderer.getViewport(localVector4D);

        {
          const smoothedSelectFactor = this.selected ? cubicBezier(this.selectFactor) : 1 - cubicBezier(1 - this.selectFactor);

          this.scene.fullScreenQuadMesh.material.uniforms.uSelected.value = +this.selected;
          this.scene.fullScreenQuadMesh.material.uniforms.uSelected.needsUpdate = true;
          this.scene.fullScreenQuadMesh.material.uniforms.uSelectFactor.value = smoothedSelectFactor;
          this.scene.fullScreenQuadMesh.material.uniforms.uSelectFactor.needsUpdate = true;
          this.scene.fullScreenQuadMesh.material.uniforms.uTime.value = timestamp;
          this.scene.fullScreenQuadMesh.material.uniforms.uTime.needsUpdate = true;

          renderer.setViewport(0, 0, this.width, this.height);
          renderer.clear();
          renderer.render(this.scene, this.camera);
        }

        // pop old state
        renderer.setRenderTarget(oldRenderTarget);
        renderer.setViewport(oldViewport);
      };
      _render();

      const _copyToCanvases = () => {
        for (const canvas of this.canvases) {
          const {
            width,
            height,
            ctx
          } = canvas;
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(
            renderer.domElement,
            0,
            size.y * pixelRatio - this.height * pixelRatio,
            this.width * pixelRatio,
            this.height * pixelRatio,
            0,
            0,
            width,
            height
          );
        }
      };
      _copyToCanvases();

      this.needsUpdate = this.selected || this.selectFactor !== lastSelectFactor;
    }
  }
  destroy() {
    hotbarRenderers.splice(hotbarRenderers.indexOf(hotbarRenderer), 1);
  }
}
const hotbarRenderers = [];

const createHotbarRenderer = (width, height, selected) => {
  const hotbarRenderer = new HotbarRenderer(width, height, selected);
  hotbarRenderers.push(hotbarRenderer);
  return hotbarRenderer;
};

export {
  HotbarRenderer,
  createHotbarRenderer,
};