import {Pass} from 'three/examples/jsm/postprocessing/Pass.js';
// import {
//   rootScene,
//   camera,
// } from './renderer.js';

class WebaverseRenderPass extends Pass {
  constructor({
    webaverseRenderer,
  }) {
    super();

    // members
    this.webaverseRenderer = webaverseRenderer;

    // locals
    this.clear = false;
    this.needsSwap = true;

    // internals
    this.internalDepthPass = null;
    this.internalRenderPass = null;
    this.onBeforeRenders = [];
    this.onAfterRender = null;
  }

  setSize(width, height) {
    if (this.internalDepthPass) {
      this.internalDepthPass.setSize(width, height);
    }
    if (this.internalRenderPass) {
      this.internalRenderPass.setSize(width, height);
    }
	}

  render(renderer, renderTarget, readBuffer, deltaTime, maskActive) {
    for (const onBeforeRender of this.onBeforeRenders) {
      onBeforeRender();
    }
    
    // render
    if (this.internalDepthPass) {
      this.internalDepthPass.renderToScreen = false;
      this.internalDepthPass.render(renderer, renderTarget, readBuffer, deltaTime, maskActive);
    }
    if (this.internalRenderPass) {
      this.internalRenderPass.renderToScreen = this.renderToScreen;
      this.internalRenderPass.render(renderer, renderTarget, readBuffer, deltaTime, maskActive);
    } else {
      renderer.setRenderTarget(this.renderToScreen ? null : renderTarget);
      renderer.clear();
      renderer.render(
        this.webaverseRenderer.rootScene,
        this.webaverseRenderer.camera
      );
    }
    
    this.onAfterRender && this.onAfterRender();
  }
}
export {
  WebaverseRenderPass,
};