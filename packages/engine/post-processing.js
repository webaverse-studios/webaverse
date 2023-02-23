/*
this file implements post processing.
*/

import * as THREE from 'three';
import {UnrealBloomPass} from './UnrealBloomPass.js';
import {AdaptiveToneMappingPass} from 'three/examples/jsm/postprocessing/AdaptiveToneMappingPass.js';
import {BokehPass} from './BokehPass.js';
import {SSAOPass} from './SSAOPass.js';
import {DepthPass} from './DepthPass.js';
// import {
//   getRenderer,
//   getComposer,
//   rootScene,
//   sceneHighPriority,
//   scene,
//   camera,
// } from './renderer.js';
// import {
//   CameraManager,
// } from './camera-manager.js';
import {
  WebaverseRenderPass,
} from './webaverse-render-pass.js';
// import renderSettingsManager from './rendersettings-manager.js';
// import {
//   RenderSettingsManager,
// } from './rendersettings-manager.js';
// import { PlayersManager } from './players-manager.js';
// import metaversefileApi from 'metaversefile';

const localVector2D = new THREE.Vector2();
const localVector2D2 = new THREE.Vector2();

/* class EncodingPass extends ShaderPass {
  constructor() {
    super({
      uniforms: {
        tDiffuse: {
          value: null,
        },
      },
      vertexShader: `\
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `\
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          c = LinearTosRGB(c);
          // c = sRGBToLinear(c);
          // c.rgb = pow2(c.rgb, 0.8);
          // c.a = 1.;
          gl_FragColor = c;
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
  }
} */

// const encodingPass = new EncodingPass();

//

class MainWebaverseRenderPass extends WebaverseRenderPass {
  constructor({
    webaverseRenderer,
    cameraManager,
    playersManager,
  }) {
    super({
      webaverseRenderer,
    });

    // globalThis.pass = this;

    const _isDecapitated = () => (
      (/^(?:camera|firstperson)$/.test(cameraManager.getMode()) && !cameraManager.target) ||
      !!webaverseRenderer.renderer.xr.getSession()
    );
    const decapitate = (a, b, c) => {
      // ensure lights attached
      // scene.add(world.lights);

      // debugger;
      
      // decapitate avatar if needed
      // const localPlayer = metaversefileApi.useLocalPlayer();
      const localPlayer = playersManager.getLocalPlayer();
      if (localPlayer.avatar) {
        // scene.add(localPlayer.avatar.model);
        
        const decapitated = _isDecapitated();
        if (decapitated) {
          localPlayer.avatar.decapitate();
        } else {
          localPlayer.avatar.undecapitate();
        }
      }
    };
    this.onBeforeRenders.push(decapitate);
    this.onAfterRender = () => {
      // debugger;

      // undecapitate
      // const localPlayer = metaversefileApi.useLocalPlayer();
      const localPlayer = playersManager.getLocalPlayer();
      if (localPlayer.avatar) {
        const decapitated = _isDecapitated();
        if (decapitated) {
          localPlayer.avatar.undecapitate();
        }
      }
    };
    
    this.onBeforeRenders.push(decapitate);
    this.onAfterRender = () => {
      // undecapitate
      // const localPlayer = metaversefileApi.useLocalPlayer();
      const localPlayer = playersManager.getLocalPlayer();
      if (localPlayer.avatar) {
        const decapitated = _isDecapitated();
        if (decapitated) {
          localPlayer.avatar.undecapitate();
        }
      }
    };
  }
  // render(...args) {
  //   // debugger;
  //   super.render(...args);
  // }
}

//

export class PostProcessing extends EventTarget {
  constructor({
    webaverseRenderer,
    cameraManager,
    playersManager,
  }) {
    super();

    if (!webaverseRenderer || !playersManager) {
      console.warn('no webaverseRenderer');
      debugger;
    }
    this.webaverseRenderer = webaverseRenderer;

    this.webaverseRenderPass = new MainWebaverseRenderPass({
      webaverseRenderer,
      cameraManager,
      playersManager,
    });
    this.defaultPasses = [
      this.webaverseRenderPass,
      // encodingPass,
    ];
    this.defaultInternalPasses = [];
  }

  // bindCanvas() {
  //   this.updatePasses(this.defaultPasses, this.defaultInternalPasses);
  // }

  // internal passes
  #makeDepthPass({ssao, hdr}) {
    // const renderer = getRenderer();
    const {renderer} = this.webaverseRenderer;
    const size = renderer.getSize(localVector2D)
      .multiplyScalar(renderer.getPixelRatio());
  
    const regularScenes = [
      sceneHighPriority,
      scene,
    ];
    const depthPass = new DepthPass(regularScenes, camera, {
      width: size.x,
      height: size.y,
      onBeforeRenderScene(scene) {
        return renderSettingsManager.push(rootScene, scene);
      },
    });
    depthPass.needsSwap = false;
    // depthPass.enabled = hqDefault;
    return depthPass;
  }
  #makeSsaoRenderPass({
    kernelSize = 8,
    kernelRadius = 16,
    minDistance = 0.005,
    maxDistance = 0.1,
  }, depthPass) {
    // const renderer = getRenderer();
    const {renderer} = this.webaverseRenderer;
    const size = renderer.getSize(localVector2D)
      .multiplyScalar(renderer.getPixelRatio());
  
    const ssaoRenderPass = new SSAOPass(rootScene, camera, size.x, size.y, depthPass);
    ssaoRenderPass.kernelSize = kernelSize;
    ssaoRenderPass.kernelRadius = kernelRadius;
    ssaoRenderPass.minDistance = minDistance;
    ssaoRenderPass.maxDistance = maxDistance;
    // ssaoRenderPass.output = SSAOPass.OUTPUT.SSAO;
    return ssaoRenderPass;
  }
  #makeDofPass({
    focus = 3.0,
    aperture = 0.00002,
    maxblur = 0.005,
  }, depthPass) {
    // const renderer = getRenderer();
    const {renderer} = this.webaverseRenderer;
    const size = renderer.getSize(localVector2D)
      .multiplyScalar(renderer.getPixelRatio());
  
    const bokehPass = new BokehPass(rootScene, camera, {
      focus,
      aperture,
      maxblur,
      width: size.x,
      height: size.y,
    }, depthPass);
    bokehPass.needsSwap = true;
    // bokehPass.enabled = hqDefault;
    return bokehPass;
  }
  #makeHdrPass({
    adaptive = true,
    resolution = 256,
    adaptionRate = 100,
    maxLuminance = 10,
    minLuminance = 0,
    middleGrey = 3,
  }) {
    const adaptToneMappingPass = new AdaptiveToneMappingPass(adaptive, resolution);
    // adaptToneMappingPass.needsSwap = true;
    adaptToneMappingPass.setAdaptionRate(adaptionRate);
    adaptToneMappingPass.setMaxLuminance(maxLuminance);
    adaptToneMappingPass.setMinLuminance(minLuminance);
    adaptToneMappingPass.setMiddleGrey(middleGrey);
    adaptToneMappingPass.needsSwap = true;
    // adaptToneMappingPass.enabled = hqDefault;
    // adaptToneMappingPass.copyUniforms["opacity"].value = 0.5;
    return adaptToneMappingPass;
  }
  #makeBloomPass({
    strength = 0.2,
    radius = 0.5,
    threshold = 0.8,
  }) {
    // const renderer = getRenderer();
    const {renderer} = this.webaverseRenderer;
    const size = renderer.getSize(localVector2D)
      .multiplyScalar(renderer.getPixelRatio());
    const resolution = size;
  
    const unrealBloomPass = new UnrealBloomPass(resolution, strength, radius, threshold);
    // unrealBloomPass.threshold = params.bloomThreshold;
    // unrealBloomPass.strength = params.bloomStrength;
    // unrealBloomPass.radius = params.bloomRadius;
    // unrealBloomPass.copyUniforms['opacity'].value = 0.5;
    // unrealBloomPass.enabled = hqDefault;
    return unrealBloomPass;
  }
  /* #makeWebaWaterPass(webaWater) {
    const renderer = getRenderer();
    const webaWaterPass = new WebaWaterPass( {
        renderer,
        scene,
        camera,
        width: window.innerWidth,
        height: window.innerHeight,
        selects: [],
        invisibleSelects: [],
    });
  
    return webaWaterPass;
  } */

  makePasses(rendersettings) {
    const passes = [];
    const internalPasses = [];

    passes.push(this.webaverseRenderPass);
    
    if (rendersettings) {
      const {ssao, dof, hdr, bloom, /* postPostProcessScene, */ /* swirl, */ webaWater} = rendersettings;
      let depthPass = null;
      if (ssao || dof) {
        depthPass = this.#makeDepthPass({ssao, dof});
        internalPasses.push(depthPass);
      }
      if (ssao) {
        const ssaoPass = this.#makeSsaoRenderPass(ssao, depthPass);
        internalPasses.push(ssaoPass);
      }
      /* if (webaWater) {
        const webaWaterPass = this.#makeWebaWaterPass(webaWater);
        passes.push(webaWaterPass);
      } */
      if (dof) {
        const dofPass = this.#makeDofPass(dof, depthPass);
        passes.push(dofPass);
      }
      if (hdr) {
        const hdrPass = this.#makeHdrPass(hdr);
        passes.push(hdrPass);
      }
      if (bloom) {
        const bloomPass = this.#makeBloomPass(bloom);
        passes.push(bloomPass);
      }
      /* if (postPostProcessScene) {
        const {postPerspectiveScene, postOrthographicScene} = postPostProcessScene;
        if (postPerspectiveScene) {
          const postRenderPass = new RenderPass(postScenePerspective, camera);
          passes.push(postRenderPass);
        }
        if (postOrthographicScene) {
          const postRenderPass = new RenderPass(postSceneOrthographic, orthographicCamera);
          passes.push(postRenderPass);
        }
      } */
    }
    
    // passes.push(encodingPass);

    return {
      passes,
      internalPasses,
    };
  }

  setPasses(passes, internalPasses) {
    // const composer = getComposer();
    const {composer} = this.webaverseRenderer;

    composer.passes = passes;
    this.webaverseRenderPass.internalRenderPass = internalPasses.find(pass => pass.isSSAOPass) ?? null;
    this.webaverseRenderPass.internalDepthPass = internalPasses.find(pass => pass.isDepthPass) ?? null;

    // this.dispatchEvent(new MessageEvent('update'));
  }

  update() {
    // this.updatePasses(this.defaultPasses, this.defaultInternalPasses);

    // update pass sizes
    // const composer = getComposer();
    const {composer} = this.webaverseRenderer;

    const w = composer._width * composer._pixelRatio;
    const h = composer._height * composer._pixelRatio;
    const _updateSize = pass => {
      if (!pass.getSize) {
        (() => {
          let localW = 0;
          let localH = 0;
          pass.setSize = (setSize => function(newW, newH) {
            localW = newW;
            localH = newH;
            return setSize.call(this, newW, newH);
          })(pass.setSize);
          pass.getSize = function(target) {
            return target.set(localW, localH);
          };
        })();
      }

      const oldSize = pass.getSize(localVector2D);
      const newSize = localVector2D2.set(w, h);
      if (!newSize.equals(oldSize)) {
        pass.setSize(w, h);
      }
    };
    for (const pass of passes) {
      _updateSize(pass);
    }
    for (const internalPass of internalPasses) {
      _updateSize(internalPass);
    }

    // this.dispatchEvent(new MessageEvent('update'));
  }
}
// const postProcessing = new PostProcessing();
// export default postProcessing;