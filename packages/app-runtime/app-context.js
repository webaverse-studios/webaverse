// import * as THREE from 'three';
import physicsManager from '../engine/physics/physics-manager.js';
import {AvatarManager} from '../engine/avatars/avatar-manager.js';
import loaders from '../engine/loaders.js';

// const useTHREE = () => THREE;
const useAvatarManager = (() => {
  let avatarManager = null;
  return () => {
    if (!avatarManager) {
      avatarManager = new AvatarManager();
    }
    return avatarManager;
  };
})();
// XXX this is expensive... should we load all loaders?
const useLoaders = () => loaders;

export class AppContext {
  #app;
  
  constructor({
    engine,
    app,
    // parent,
    waitUntil,
  }) {
    this.#app = app;
    this.waitUntil = waitUntil;

    this.useApp = () => this.#app;
    this.useEngine = () => engine;
    // this.useImportManager = () => engine.importManager;
    
    this.useFrame = fn => {
      return engine.frameTracker.add(fn);
    };
    this.clearFrame = frameId => {
      engine.frameTracker.remove(frameId);
    };
    this.useActivate = fn => {
      // console.warn('on activate', fn);
    };
    this.useCleanup = fn => {
      const destroy = e => {
        fn();
        cleanup();
      };
      app.addEventListener('destroy', destroy);
      const cleanup = () => {
        app.removeEventListener('destroy', destroy);
      };
    };
    this.useExport = () => {
      // console.warn('useExport');
    };
    
    this.useRenderer = () => engine.webaverseRenderer.renderer;
    this.useScene = () => engine.webaverseRenderer.scene;
    this.useCamera = () => engine.camera;
    
    this.useLocalPlayer = () => engine.playersManager.getLocalPlayer();
    this.useSpawnManager = () => engine.spawnManager;
    this.useHitManager = () => engine.hitManager;
    
    this.useRenderSettings = () => engine.renderSettingsManager;
    this.useLightingManager = () => engine.lightingManager;
    this.useSkyManager = () => engine.skyManager;

    let physics;
    this.usePhysics = () => {
      if (!physics) {
        physics = physicsManager.getScene();
      }
      return physics;
    };
    this.usePhysicsTracker = () => engine.physicsTracker;
    this.useTempManager = () => engine.tempManager;

    this.useAvatarManager = useAvatarManager;
    this.useNpcManager = () => engine.npcManager;
    this.useMobManager = () => engine.mobManager;
    this.useSounds = () => engine.sounds;
    
    this.useLoaders = useLoaders;
  }
}