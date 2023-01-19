import {createObjectSpriteAnimation} from './object-spriter.js';
import offscreenEngineManager from './offscreen-engine-runtime/offscreen-engine-manager.js';

class SpriteAnimationManager {
  constructor() {
    this.spriteAnimationCache = new Map();
  }

  getSpriteAnimationForAppUrlInternal(args) {
    return offscreenEngineManager.request('getSpriteAnimationForAppUrlInternal', args);
  }

  getSpriteAnimationForApp(app) {
    let spritesheet = this.spriteAnimationCache.get(app.contentId);
    if (!spritesheet) {
      spritesheet = createObjectSpriteAnimation(app);
      this.spriteAnimationCache.set(app.contentId, spritesheet);
    }
    return spritesheet;
  }

  async getSpriteAnimationForAppUrlAsync(appUrl, opts) {
    let spritesheet = this.spriteAnimationCache.get(appUrl);
    if (!spritesheet) {
      spritesheet = await this.getSpriteAnimationForAppUrlInternal([appUrl, opts]);
      this.spriteAnimationCache.set(appUrl, spritesheet);
    }
    return spritesheet;
  }
}
const spriteAnimationManager = new SpriteAnimationManager();

export default spriteAnimationManager;