/*
metaversefile uses plugins to load files from the metaverse and load them as apps.
it is an interface between raw data and the engine.
metaversfile can load many file types, including javascript.
*/

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {Text} from 'troika-three-text';
import React from 'react';
// import metaversefile from 'metaversefile';
import {getRenderer, scene, sceneHighPriority, sceneLowPriority, sceneLowerPriority, sceneLowestPriority, rootScene, camera} from './renderer.js';
import cameraManager from './camera-manager.js';
import physicsManager from './physics-manager.js';
import Avatar from './avatars/avatars.js';
import {world} from './world.js';
import {moduleUrls, importModule} from './core-modules.js';
import {componentTemplates} from './metaverse-components.js';
import postProcessing from './post-processing.js';
import {getRandomString, memoize} from './util.js';
import * as mathUtils from './math-utils.js';
// import JSON6 from 'json-6';
import * as geometries from './geometries.js';
import * as materials from './materials.js';
import {AvatarRenderer} from './avatars/avatar-renderer.js';
import {chatManager} from './chat-manager.js';
import loreAI from './ai/lore/lore-ai.js';
import imageAI from './ai/image/image-ai.js';
import audioAI from './ai/audio/audio-ai.js';
import npcManager from './npc-manager.js';
import mobManager from './mob-manager.js';
import universe from './universe.js';
import {PathFinder} from './npc-utils.js';
import {avatarManager} from './avatar-manager.js';
import {partyManager} from './party-manager.js';
import {playersManager} from './players-manager.js';
import loaders from './loaders.js';
import writers from './writers.js';
import * as voices from './voices.js';
import * as procgen from './procgen/procgen.js';
import renderSettingsManager from './rendersettings-manager.js';
import questManager from './quest-manager.js';
// import {murmurhash3} from './procgen/murmurhash3.js';
import debug from './debug.js';
import * as scenePreviewer from './scene-previewer.js';
import * as sounds from './sounds.js';
import hpManager from './hp-manager.js';
import particleSystemManager from './particle-system.js';
import domRenderEngine from './dom-renderer.jsx';
import dropManager from './drop-manager.js';
import hitManager from './character-hitter.js';
import procGenManager from './procgen-manager.js';
import cardsManager from './cards-manager.js';
import * as geometryBuffering from './geometry-buffering.js';
import * as geometryBatching from './geometry-batching.js';
import * as geometryChunking from './geometry-chunking.js';
import * as atlasing from './atlasing.js';
import * as spriting from './spriting.js';
import * as gpuTaskManager from './gpu-task-manager.js';
import * as generationTaskManager from './generation-task-manager.js';
import ioManager from './io-manager.js';
import {lightsManager} from './engine-hooks/lights/lights-manager.js';
import {skyManager} from './engine-hooks/environment/skybox/sky-manager.js';
import {compilerBaseUrl} from './endpoints.js';
import {getDefaultCanvas} from './offscreen-engine-runtime/fns/avatar-iconer-fn.js';
import {isWorker} from './env.js';
// import './metaversefile-binding.js';
import spawnManager from './spawn-manager.js';

// const localVector2D = new THREE.Vector2();

const defaultModules = {
  moduleUrls,
  importModule,
};

// const localPlayer = playersManager.getLocalPlayer();
/* const loreAIScene = loreAI.createScene(localPlayer);
const _bindAppManagerToLoreAIScene = (appManager, loreAIScene) => {
  const bindings = new WeakMap();
  appManager.addEventListener('appadd', e => {
    const app = e.data;
    const object = loreAIScene.addObject({
      name: app.name,
      description: app.description,
    });
    bindings.set(app, object);
  });
  appManager.addEventListener('appremove', e => {
    const app = e.data;
    const object = bindings.get(app);
    loreAIScene.removeObject(object);
    bindings.delete(app);
  });
};
_bindAppManagerToLoreAIScene(world.appManager, loreAIScene);
world.loreAIScene = loreAIScene; */

/* class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false};
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return {hasError: true, error: error};
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    // logErrorToMyService(error, errorInfo);
    console.warn(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children; 
  }
} */
/* function createPointerEvents(store) {
  // const { handlePointer } = createEvents(store)
  const handlePointer = key => e => {
    // const handlers = eventObject.__r3f.handlers;
    // console.log('handle pointer', key, e);
  };
  const names = {
    onClick: 'click',
    onContextMenu: 'contextmenu',
    onDoubleClick: 'dblclick',
    onWheel: 'wheel',
    onPointerDown: 'pointerdown',
    onPointerUp: 'pointerup',
    onPointerLeave: 'pointerleave',
    onPointerMove: 'pointermove',
    onPointerCancel: 'pointercancel',
    onLostPointerCapture: 'lostpointercapture',
  };

  return {
    connected: false,
    handlers: (Object.keys(names).reduce(
      (acc, key) => ({...acc, [key]: handlePointer(key)}),
      {},
    )),
    connect: (target) => {
      const {set, events} = store.getState()
      events.disconnect?.()
      set((state) => ({events: {...state.events, connected: target}}))
      Object.entries(events?.handlers ?? []).forEach(([name, event]) =>
        target.addEventListener(names[name], event, {passive: true}),
      )
    },
    disconnect: () => {
      const {set, events} = store.getState()
      if (events.connected) {
        Object.entries(events.handlers ?? []).forEach(([name, event]) => {
          if (events && events.connected instanceof HTMLElement) {
            events.connected.removeEventListener(names[name], event)
          }
        })
        set((state) => ({events: {...state.events, connected: false}}))
      }
    },
  }
} */

const _loadImageTexture = src => {
  const img = new Image();
  img.onload = () => {
    texture.needsUpdate = true;
  };
  img.onerror = err => {
    console.warn(err);
  };
  img.crossOrigin = 'Anonymous';
  img.src = src;
  const texture = new THREE.Texture(img);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  // texture.anisotropy = 16;
  return texture;
};
const _threeTone = memoize(() => {
  return _loadImageTexture('/textures/threeTone.jpg');
});
const _fiveTone = memoize(() => {
  return _loadImageTexture('/textures/fiveTone.jpg');
});
const _twentyTone = memoize(() => {
  return _loadImageTexture('/textures/twentyTone.png');
});
const gradientMaps = {
  get threeTone() {
    return _threeTone();
  },
  get fiveTone() {
    return _fiveTone();
  },
  get twentyTone() {
    return _twentyTone();
  },
};

//

// keep these:
[
  'app',
  'renderer',
  'scene',
]

//

let currentAppRender = null;
let iframeContainer = null;
let recursion = 0;
let wasDecapitated = false;
const mirrors = [];
// eslint-disable-next-line no-new-func
// const importFn = new Function('u', 'console.log(u); return import(u)');
export const metaversefileApi = {
  /* async import(s) {
    if (/^[a-zA-Z0-9]+:/.test(s)) {
      s = `${compilerBaseUrl}${s.replace(compilerBaseUrl, '').replace(/^([a-zA-Z0-9]+:\/)\//, '$1')}`;
    } else {
      s = new URL(s, compilerBaseUrl).href;
    }

    console.log('metaversefile import', {s});

    try {
      // const m = await import(s);
      console.log('s', s);
      
      const m = await importFn(s);
      console.log('m', m)
      return m;
    } catch(err) {
      // console.warn('error loading', JSON.stringify(s), err.stack);
      // Todo: need to output as an error for automated tests
      console.error(err)
      return null;
    }
  }, */
  getObjectUrl(object, baseUrl = '') {
    const {start_url, type, content} = object;

    function typeContentToUrl(type, content) {
      if (typeof content === 'object') {
        content = JSON.stringify(content);
      }
      const dataUrlPrefix = 'data:' + type + ',';
      return dataUrlPrefix + encodeURIComponent(content) + '.data'; // .replace(/\\//g, '%2F');
    }

    if (start_url) {
      if (baseUrl) {
        let u = new URL(start_url, baseUrl).href;
        const baseUrlObj = new URL(baseUrl);
        const baseUrlHost = baseUrlObj.protocol + '//' + baseUrlObj.host + '/';
        if (u.startsWith(baseUrlHost)) {
          u = u.slice(baseUrlHost.length);
        }
        return u;
      } else {
        return start_url;
      }
    } else if (type && content) {
      return typeContentToUrl(type, content);
    } else {
      return null;
    }
  },
  useApp() {
    const app = currentAppRender;
    if (app) {
      return app;
    } else {
      throw new Error('useApp cannot be called outside of render()');
    }
  },
  useRenderer() {
    return getRenderer();
  },
  useRenderSettings() {
    return renderSettingsManager;
  },
  useScene() {
    return scene;
  },
  useSound() {
    return sounds;
  },
  useCamera() {
    return camera;
  },
  getMirrors() {
    return mirrors;
  },
  getWinds() {
    return world.winds;
  },
  setWinds(wind) {
    world.winds.push(wind);
  },
  removeWind(wind) {
    const index = world.winds.indexOf(wind);
    if (index > -1) {
      world.winds.splice(index, 1);
    }
  },
  registerMirror(mirror) {
    mirrors.push(mirror);
  },
  unregisterMirror(mirror) {
    const index = mirrors.indexOf(mirror);
    if (index !== -1) {
      mirrors.splice(index, 1);
    }
  },
  useWorld() {
    return {
      appManager: world.appManager,
      getApps() {
        return world.appManager.apps;
      },
    };
  },
  useLightsManager() {
    return lightsManager;
  },
  useSkyManager() {
    return skyManager;
  },
  useChatManager() {
    return chatManager;
  },
  useQuests() {
    return questManager;
  },
  useLoreAI() {
    return loreAI;
  },
  useImageAI() {
    return imageAI;
  },
  useAudioAI() {
    return audioAI;
  },
  useVoices() {
    return voices;
  },
  /* useAvatarRenderer() {
    return AvatarRenderer;
  }, */
  /* useAvatarIconer() {
    return {
      getDefaultCanvas,
    };
  }, */
  useScenePreviewer() {
    return scenePreviewer;
  },
  usePostProcessing() {
    return postProcessing;
  },
  useAvatarAnimations() {
    return Avatar.getAnimations();
  },
  useFrame(fn) {
    const app = currentAppRender;
    if (app) {
      const frame = e => {
        if (!app.paused) {
          fn(e.data);
        }
      };
      world.appManager.addEventListener('frame', frame);
      const destroy = () => {
        cleanup();
      };
      app.addEventListener('destroy', destroy);
      
      const cleanup = () => {
        world.appManager.removeEventListener('frame', frame);
        app.removeEventListener('destroy', destroy);
      };
      
      return {
        cleanup,
      };
    } else {
      throw new Error('useFrame cannot be called outside of render()');
    }
  },
  useExport(fn) {
    const app = currentAppRender;
    if (app) {
      app.exports.push(fn);
    } else {
      throw new Error('useExport cannot be called outside of render()');
    }
  },
  clearFrame(frame) {
    frame.cleanup();
  },
  /* useBeforeRender() {
    recursion++;
    if (recursion === 1) {
      // scene.directionalLight.castShadow = false;
      const localPlayer = playersManager.getLocalPlayer();
      if (localPlayer.avatar) {
        wasDecapitated = localPlayer.avatar.decapitated;
        localPlayer.avatar.undecapitate();
      }
    }
  },
  useAfterRender() {
    recursion--;
    if (recursion === 0) {
      // console.log('was decap', wasDecapitated);
      const localPlayer = playersManager.getLocalPlayer();
      if (localPlayer.avatar && wasDecapitated) {
        localPlayer.avatar.decapitate();
        localPlayer.avatar.skeleton.update();
      }
    }
  }, */
  useCleanup(fn) {
    const app = currentAppRender;
    if (app) {
      app.addEventListener('destroy', () => {
        fn();
      });
    } else {
      throw new Error('useCleanup cannot be called outside of render()');
    }
  },
  /* useLocalPlayer() {
    return playersManager.getLocalPlayer();
  }, */
  /* useRemotePlayer(playerId) {
    let player = playersManager.getRemotePlayers().get(playerId);
    return player;
  },
  useRemotePlayers() {
    return Array.from(playersManager.getRemotePlayers().values());
  }, */
  usePlayersManager() {
    return playersManager;
  },
  usePartyManager() {
    return partyManager;
  },
  useNpcManager() {
    return npcManager;
  },
  useMobManager() {
    return mobManager;
  },
  useAvatarManager() {
    return avatarManager;
  },
  usePathFinder() {
    return PathFinder;
  },
  useLoaders() {
    return loaders;
  },
  useWriters() {
    return writers;
  },
  usePhysics(instance = null) {
    const app = currentAppRender;
    if (app) {
      const physicsScene = physicsManager.getScene(instance)
        .clone();
      /* const physics = {};
      for (const k in physicsManager) {
        physics[k] = physicsManager[k];
      } */
      /* const localVector = new THREE.Vector3();
      const localVector2 = new THREE.Vector3();
      const localQuaternion = new THREE.Quaternion();
      const localMatrix = new THREE.Matrix4(); */
      // const localMatrix2 = new THREE.Matrix4();
      physicsScene.addPlaneGeometry = (addPlaneGeometry => function(position, quaternion, dynamic) {
        const physicsObject = addPlaneGeometry.call(this, position, quaternion, dynamic);
        app.physicsObjects.push(physicsObject);
        return physicsObject;
      })(physicsScene.addPlaneGeometry);
      physicsScene.addBoxGeometry = (addBoxGeometry => function(position, quaternion, size, dynamic) {
        /* const basePosition = position;
        const baseQuaternion = quaternion;
        const baseScale = size;
        app.updateMatrixWorld();
        localMatrix
          .compose(position, quaternion, size)
          .premultiply(app.matrixWorld)
          .decompose(localVector, localQuaternion, localVector2);
        position = localVector;
        quaternion = localQuaternion;
        size = localVector2; */

        const physicsObject = addBoxGeometry.call(this, position, quaternion, size, dynamic);
        // physicsObject.position.copy(app.position);
        // physicsObject.quaternion.copy(app.quaternion);
        // physicsObject.scale.copy(app.scale);
        
        // const {physicsMesh} = physicsObject;
        // physicsMesh.position.copy(position);
        // physicsMesh.quaternion.copy(quaternion);
        // physicsMesh.scale.copy(size);
        // app.add(physicsObject);
        // physicsObject.updateMatrixWorld();

        app.physicsObjects.push(physicsObject);

        return physicsObject;
      })(physicsScene.addBoxGeometry);
      physicsScene.addCapsuleGeometry = (addCapsuleGeometry => function(position, quaternion, radius, halfHeight, physicsMaterial, dynamic, flags) {
        // const basePosition = position;
        // const baseQuaternion = quaternion;
        // const baseScale = new THREE.Vector3(radius, halfHeight*2, radius)

        // app.updateMatrixWorld();
        // localMatrix
        //   .compose(position, quaternion, new THREE.Vector3(radius, halfHeight*2, radius))
        //   .premultiply(app.matrixWorld)
        //   .decompose(localVector, localQuaternion, localVector2);
        // position = localVector;
        // quaternion = localQuaternion;
        // size = localVector2;
        
        const physicsObject = addCapsuleGeometry.call(this, position, quaternion, radius, halfHeight, physicsMaterial, dynamic, flags);
        // physicsObject.position.copy(app.position);
        // physicsObject.quaternion.copy(app.quaternion);
        // physicsObject.scale.copy(app.scale);
        // physicsObject.updateMatrixWorld();
        
        // const {physicsMesh} = physicsObject;
        // physicsMesh.position.copy(basePosition);
        // physicsMesh.quaternion.copy(baseQuaternion);

        // physicsMesh.scale.copy(baseScale);
        // app.add(physicsObject);
        // physicsObject.updateMatrixWorld();

        // const localPlayer = metaversefile.useLocalPlayer();

        /* if(localPlayer.avatar) {
          if(localPlayer.avatar.height) {
            console.log(localPlayer.avatar.height);
          }
        } */
        
        app.physicsObjects.push(physicsObject);

        // physicsManager.pushUpdate(app, physicsObject);
        // physicsManager.setTransform(physicsObject);
        return physicsObject;
      })(physicsScene.addCapsuleGeometry);
      /* physics.addSphereGeometry = (addSphereGeometry => function(position, quaternion, radius, physicsMaterial, ccdEnabled) {
        const basePosition = position;
        const baseQuaternion = quaternion;
        const baseScale = new THREE.Vector3(radius, radius, radius);
        // app.updateMatrixWorld();
        // localMatrix
        //   .compose(position, quaternion, new THREE.Vector3(1, 1, 1))
        //   .premultiply(app.matrixWorld)
        //   .decompose(localVector, localQuaternion, localVector2);
        // position = localVector;
        // quaternion = localQuaternion;
        //size = localVector2;
        
        const physicsObject = addSphereGeometry.call(this, position, quaternion, radius, physicsMaterial, ccdEnabled);
        //physicsObject.position.copy(app.position);
        //physicsObject.quaternion.copy(app.quaternion);
        //physicsObject.scale.copy(app.scale);
        
        const {physicsMesh} = physicsObject;
        physicsMesh.position.copy(basePosition);
        physicsMesh.quaternion.copy(baseQuaternion);
        //physicsMesh.scale.copy(baseScale);
        // app.add(physicsObject);
        physicsObject.updateMatrixWorld();
        
        app.physicsObjects.push(physicsObject);
        // physicsManager.pushUpdate(app, physicsObject);
        return physicsObject;
      })(physics.addSphereGeometry); */
      physicsScene.addGeometry = (addGeometry => function(mesh) {
        /* const oldParent = mesh.parent;
        
        const parentMesh = new THREE.Object3D();
        parentMesh.position.copy(app.position);
        parentMesh.quaternion.copy(app.quaternion);
        parentMesh.scale.copy(app.scale);
        parentMesh.add(mesh);
        parentMesh.updateMatrixWorld(); */
        
        const physicsObject = addGeometry.call(this, mesh);
        /* physicsObject.position.copy(app.position);
        physicsObject.quaternion.copy(app.quaternion);
        physicsObject.scale.copy(app.scale);
        physicsObject.updateMatrixWorld(); */
        // window.physicsObject = physicsObject;
        
        /* if (oldParent) {
          oldParent.add(mesh);
          mesh.updateMatrixWorld();
        } */
        
        // app.add(physicsObject);
        app.physicsObjects.push(physicsObject);
        return physicsObject;
      })(physicsScene.addGeometry);
      physicsScene.addCookedGeometry = (addCookedGeometry => function(buffer, position, quaternion, scale) {
        const physicsObject = addCookedGeometry.apply(this, arguments);
        // app.add(physicsObject);
        app.physicsObjects.push(physicsObject);
        return physicsObject;
      })(physicsScene.addCookedGeometry);
      physicsScene.addConvexGeometry = (addConvexGeometry => function(mesh) {
        const physicsObject = addConvexGeometry.apply(this, arguments);
        // app.add(physicsObject);
        app.physicsObjects.push(physicsObject);
        return physicsObject;
      })(physicsScene.addConvexGeometry);
      physicsScene.addConvexShape = (addConvexShape => function(mesh) {
        const physicsObject = addConvexShape.apply(this, arguments);
        // app.add(physicsObject);
        app.physicsObjects.push(physicsObject);
        return physicsObject;
      })(physicsScene.addConvexShape);
      physicsScene.addCookedConvexGeometry = (addCookedConvexGeometry => function() {
        const physicsObject = addCookedConvexGeometry.apply(this, arguments);
        // app.add(physicsObject);
        app.physicsObjects.push(physicsObject);
        return physicsObject;
      })(physicsScene.addCookedConvexGeometry);
      physicsScene.addHeightFieldGeometry = (addHeightFieldGeometry => function() {
        const physicsObject = addHeightFieldGeometry.apply(this, arguments);
        // app.add(physicsObject);
        app.physicsObjects.push(physicsObject);
        return physicsObject;
      })(physicsScene.addHeightFieldGeometry);
      physicsScene.addCookedHeightfieldGeometry = (addCookedHeightfieldGeometry => function() {
        const physicsObject = addCookedHeightfieldGeometry.apply(this, arguments);
        // app.add(physicsObject);
        app.physicsObjects.push(physicsObject);
        return physicsObject;
      })(physicsScene.addCookedHeightfieldGeometry);
      physicsScene.removeGeometry = (removeGeometry => function(physicsObject) {
        removeGeometry.apply(this, arguments);
        
        const index = app.physicsObjects.indexOf(physicsObject);
        if (index !== -1) {
          app.remove(physicsObject);
          app.physicsObjects.splice(index);
        }
      })(physicsScene.removeGeometry);
      
      return physicsScene;
    } else {
      throw new Error('usePhysics cannot be called outside of render()');
    }
  },
  useHpManager() {
    return hpManager;
  },
  useIoManager() {
    return ioManager;
  },
  /* useProcGen() {
    return procgen;
  }, */
  useCameraManager() {
    return cameraManager;
  },
  useParticleSystem() {
    return particleSystemManager;
  },
  useDefaultModules() {
    return defaultModules;
  },
  useMathUtils() {
    return mathUtils;
  },
  useActivate(fn) {
    const app = currentAppRender;
    if (app) {
      app.addEventListener('activate', e => {
        fn(e);
      });
      app.addEventListener('destroy', () => {
        app.removeEventListener('activate', fn);
      });
    } else {
      throw new Error('useActivate cannot be called outside of render()');
    }
  },
  useWear(fn) {
    const app = currentAppRender;
    if (app) {
      app.addEventListener('wearupdate', e => {
        fn(e);
      });
      app.addEventListener('destroy', () => {
        app.removeEventListener('wearupdate', fn);
      });
    } else {
      throw new Error('useWear cannot be called outside of render()');
    }
  },
  useUse(fn) {
    const app = currentAppRender;
    if (app) {
      app.addEventListener('use', e => {
        fn(e);
      });
      app.addEventListener('destroy', () => {
        app.removeEventListener('use', fn);
      });
    } else {
      throw new Error('useUse cannot be called outside of render()');
    }
  },
  useResize(fn) {
    const app = currentAppRender;
    if (app) {
      globalThis.addEventListener('resize', e => {
        fn(e);
      });
      app.addEventListener('destroy', () => {
        globalThis.removeEventListener('resize', fn);
      });
    } else {
      throw new Error('useResize cannot be called outside of render()');
    }
  },
  getNextInstanceId() {
    return getRandomString();
  },
  createAppInternal(appSpec = {}, {onWaitPromise = null} = {}) {
    const {
      // start_url = '',
      // type = '',
      // content = '',
      module = null,
      components = [],
      position = null,
      quaternion = null,
      scale = null,
      parent = null,
      in_front = false,
    } = appSpec;

    const app = new App();

    // transform
    const _updateTransform = () => {
      let matrixNeedsUpdate = false;
      if (Array.isArray(position)) {
        app.position.fromArray(position);
        matrixNeedsUpdate = true;
      } else if (position?.isVector3) {
        app.position.copy(position);
        matrixNeedsUpdate = true;
      }
      if (Array.isArray(quaternion)) {
        app.quaternion.fromArray(quaternion);
        matrixNeedsUpdate = true;
      } else if (quaternion?.isQuaternion) {
        app.quaternion.copy(quaternion);
        matrixNeedsUpdate = true;
      }
      if (Array.isArray(scale)) {
        app.scale.fromArray(scale);
        matrixNeedsUpdate = true;
      } else if (scale?.isVector3) {
        app.scale.copy(scale);
        matrixNeedsUpdate = true;
      }
      if (in_front) {
        const localPlayer = playersManager.getLocalPlayer();
        app.position.copy(localPlayer.position).add(new THREE.Vector3(0, 0, -1).applyQuaternion(localPlayer.quaternion));
        app.quaternion.copy(localPlayer.quaternion);
        app.scale.setScalar(1);
        matrixNeedsUpdate = true;
      }
      if (parent) {
        parent.add(app);
        matrixNeedsUpdate = true;
      }

      if (matrixNeedsUpdate) {
        app.updateMatrixWorld();
        app.lastMatrix.copy(app.matrixWorld);
      }
    };
    _updateTransform();

    // components
    const _updateComponents = () => {
      if (Array.isArray(components)) {
        for (const {key, value} of components) {
          app.setComponent(key, value);
        }
      } else if (typeof components === 'object' && components !== null) {
        for (const key in components) {
          const value = components[key];
          app.setComponent(key, value);
        }
      }
    };
    _updateComponents();

    // load
    const u = metaversefile.getObjectUrl(appSpec);
    if (u || module) {
      const p = (async () => {
        let m;
        if (u) {
          m = await metaversefile.import(u);
        } else {
          m = module;
        }
        await metaversefile.addModule(app, m);
      })();
      if (onWaitPromise) {
        onWaitPromise(p);
      }
    }

    return app;
  },
  createApp(spec) {
    return metaversefile.createAppInternal(spec);
  },
  async createAppAsync(spec, opts) {
    let p = null;
    const app = metaversefile.createAppInternal(spec, {
      onWaitPromise(newP) {
        p = newP;
      },
    });
    if (p !== null) {
      await p;
    }
    return app;
  },
  /* createAppPair(spec) {
    let promise = null;
    const app = metaversefile.createAppInternal(spec, {
      onWaitPromise(newPromise) {
        promise = newPromise;
      },
    });
    return [app, promise];
  },
  createModule: (() => {
    const dataUrlPrefix = `data:application/javascript;charset=utf-8,`;
    const jsPrefix = `\
import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {Vector3, Quaternion, Euler, Matrix4, Box3, Object3D, Texture} = THREE;
const {apps, createApp, createModule, addApp, removeApp, useFrame, useLocalPlayer, getAppByName, getAppsByName, getAppsByType, getAppsByTypes, getAppsByComponent} = metaversefile;

export default () => {
`;
    const jsSuffix = '\n};';
    return s => {
      const result = dataUrlPrefix + encodeURIComponent(jsPrefix + s.replace(/\%/g, '%25') + jsSuffix);
      console.log('got', {dataUrlPrefix, jsPrefix, s, jsSuffix, result});
      return result;
    };
  })(), */
  addApp(app) {
    return world.appManager.addApp.apply(world.appManager, arguments);
  },
  removeApp() {
    return world.appManager.removeApp.apply(world.appManager, arguments);
  },
  addTrackedApp() {
    return world.appManager.addTrackedApp.apply(world.appManager, arguments);
  },
  removeTrackedApp(app) {
    return world.appManager.removeTrackedApp.apply(world.appManager, arguments);
  },
  getPlayerByAppInstanceId(instanceId) {
    const localPlayer = playersManager.getLocalPlayer();
    let result = localPlayer.appManager.getAppByInstanceId(instanceId);
    if (result) {
      return localPlayer;
    } else {
      for (const remotePlayer in playersManager.getRemotePlayers()) {
        const remoteApp = remotePlayer.appManager.getAppByInstanceId(instanceId);
        if (remoteApp) {
          return remotePlayer;
        }
      }
      for (let i = 0; i < npcManager.npcs.length; i++) {
        const npcPlayer = npcManager.npcs[i];
        const remoteApp = npcPlayer.appManager.getAppByInstanceId(instanceId);
        if (remoteApp) {
          return npcPlayer;
        }
      }
      return null;
    }
  },
  getRemotePlayerByPlayerId(playerId) {
    for (const pair of playersManager.getRemotePlayers()) {
      if (pair[0] === playerId) {
        return pair[1];
      }
    }
  },
  getAppByInstanceId(instanceId) {
    // local
    const localPlayer = playersManager.getLocalPlayer();
    let result = world.appManager.getAppByInstanceId(instanceId) || localPlayer.appManager.getAppByInstanceId(instanceId);
    if (result) {
      return result;
    }

    // npc
    for (const npc of npcManager.npcs) {
      const npcApp = npc.appManager.getAppByInstanceId(instanceId);
      if (npcApp) {
        return npcApp;
      }
    }

    /* // remote
    for (const remotePlayer in playersManager.getRemotePlayers()) {
      const remoteApp = remotePlayer.appManager.getAppByInstanceId(instanceId);
      if (remoteApp) {
        return remoteApp;
      }
    } */

    // default
    return null;
  },
  getAppByPhysicsId(physicsId) {
    // local player
    const localPlayer = playersManager.getLocalPlayer();
    let result = world.appManager.getAppByPhysicsId(physicsId);
    if (result) {
      return result;
    }

    // local app
    result = localPlayer.appManager.getAppByPhysicsId(physicsId);
    if (result) {
      return result;
    }

    // remote player
    for (const remotePlayer in playersManager.getRemotePlayers()) {
      const remoteApp = remotePlayer.appManager.getAppByPhysicsId(physicsId);
      if (remoteApp) {
        return remoteApp;
      }
    }

    // mob
    for (const mob of mobManager.mobs) {
      const mobPhysicsObjects = mob.getPhysicsObjects();
      for (const mobPhysicsObject of mobPhysicsObjects) {
        if (mobPhysicsObject.physicsId === physicsId) {
          return mob.subApp;
        }
      }
    }

    // default
    return null;
  },
  getPhysicsObjectByPhysicsId(physicsId) {
    // local player
    const localPlayer = playersManager.getLocalPlayer();
    let result = world.appManager.getPhysicsObjectByPhysicsId(physicsId);
    if (result) {
      return result;
    }

    // local app
    result = localPlayer.appManager.getPhysicsObjectByPhysicsId(physicsId);
    if (result) {
      return result;
    }

    // remote player
    for (const remotePlayer in playersManager.getRemotePlayers()) {
      const remotePhysicsObject = remotePlayer.appManager.getPhysicsObjectByPhysicsId(physicsId);
      if (remotePhysicsObject) {
        return remotePhysicsObject;
      }
    }

    // mob
    for (const mob of mobManager.mobs) {
      const mobPhysicsObjects = mob.getPhysicsObjects();
      for (const mobPhysicsObject of mobPhysicsObjects) {
        if (mobPhysicsObject.physicsId === physicsId) {
          return mobPhysicsObject;
        }
      }
    }

    // default
    return null;
  },
  getPairByPhysicsId(physicsId) {
    // local player
    const localPlayer = playersManager.getLocalPlayer();
    let result = world.appManager.getPairByPhysicsId(physicsId);
    if (result) {
      // console.log('return 1');
      return result;
    }

    // local app
    result = localPlayer.appManager.getPairByPhysicsId(physicsId);
    if (result) {
      // console.log('return 2');
      return result;
    }

    // remote player
    for (const remotePlayer in playersManager.getRemotePlayers()) {
      const remotePair = remotePlayer.appManager.getPairByPhysicsId(physicsId);
      if (remotePair) {
        // console.log('return 3');
        return remotePair;
      }
    }

    // mob
    for (const mob of mobManager.mobs) {
      const mobPhysicsObjects = mob.getPhysicsObjects();
      for (const mobPhysicsObject of mobPhysicsObjects) {
        if (mobPhysicsObject.physicsId === physicsId) {
          // console.log('return 4');
          return [mob.subApp, mobPhysicsObject];
        }
      }
    }

    // default
    return null;
  },
  useInternals() {
    if (!iframeContainer && !isWorker) {
      iframeContainer = document.getElementById('iframe-container');
      
      iframeContainer.getFov = () => camera.projectionMatrix.elements[ 5 ] * (globalThis.innerHeight / 2);
      iframeContainer.updateSize = function updateSize() {
        const fov = iframeContainer.getFov();
        iframeContainer.style.cssText = `
          position: fixed;
          left: 0;
          top: 0;
          width: ${globalThis.innerWidth}px;
          height: ${globalThis.innerHeight}px;
          perspective: ${fov}px;
          pointer-events: none;
          user-select: none;
        `;
      };
      iframeContainer.updateSize();
    }

    const renderer = getRenderer();
    return {
      renderer,
      scene,
      rootScene,
      // postSceneOrthographic,
      // postScenePerspective,
      camera,
      sceneHighPriority,
      sceneLowPriority,
      sceneLowerPriority,
      sceneLowestPriority,
      iframeContainer,
    };
  },
  useText() {
    return Text;
  },
  useGeometries() {
    return geometries;
  },
  useThree() {
    return THREE;
  },
  useThreeUtils() {
    return {
      BufferGeometryUtils,
    };
  },
  useGeometryBuffering() {
    return geometryBuffering;
  },
  useGeometryBatching() {
    return geometryBatching;
  },
  useGeometryChunking() {
    return geometryChunking;
  },
  useAtlasing() {
    return atlasing;
  },
  useSpriting() {
    return spriting;
  },
  useGPUTask() {
    return gpuTaskManager;
  },
  useGenerationTask() {
    return generationTaskManager;
  },
  useMaterials() {
    return materials;
  },
  /* useJSON6Internal() {
    return JSON6;
  }, */
  useGradientMapsInternal() {
    return gradientMaps;
  },
  isSceneLoaded() {
    return universe.isSceneLoaded();
  },
  async waitForSceneLoaded() {
    await universe.waitForSceneLoaded();
  },
  useDomRenderer() {
    return domRenderEngine;
  },
  useDropManager() {
    return dropManager;
  },
  useHitManager() {
    return hitManager;
  },
  useProcGenManager() {
    return procGenManager;
  },
  useCardsManager() {
    return cardsManager;
  },
  useSpawnManager() {
    return spawnManager;
  },
  useDebug() {
    return debug;
  },
  useCompilerBaseUrl() {
    return compilerBaseUrl
  },
  async addModule(app, m) {
    // wait to make sure module initialization happens in a clean tick loop,
    // even when adding a module from inside of another module's initialization
    await Promise.resolve();
    
    try {
      app.name = m.name ?? (m.contentId ? m.contentId.match(/([^\/\.]*)$/)[1] : '');
    } catch (error) {
      console.error(error)
    }
    app.description = m.description ?? '';
    app.appType = m.type ?? '';
    app.contentId = m.contentId ?? '';
    if (Array.isArray(m.components)) {
      for (const {key, value} of m.components) {
        if (!app.hasComponent(key)) {
          app.setComponent(key, value);
        }
      }
    }
    app.modules.push(m);
    app.updateModulesHash();

    let renderSpec = null;
    let waitUntilPromise = null;
    const _initModule = () => {
      currentAppRender = app;

      try {
        const fn = m.default;
        if (typeof fn === 'function') {
          renderSpec = fn({
            waitUntil(p) {
              waitUntilPromise = p;
            },
          });
        } else {
          console.warn('module default export is not a function', m);
          return null;
        }
      } catch(err) {
        console.warn(err);
        return null;
      } finally {
        currentAppRender = null;
      }
    };
    _initModule();

    if (waitUntilPromise) {
      await waitUntilPromise;
    }

    const _bindDefaultComponents = app => {
      // console.log('bind default components', app); // XXX
      
      currentAppRender = app;

      // component handlers
      const componentHandlers = {};
      for (const {key, value} of app.components) {
        const componentHandlerTemplate = componentTemplates[key];
        if (componentHandlerTemplate) {
          componentHandlers[key] = componentHandlerTemplate(app, value);
        }
      }
      app.addEventListener('componentupdate', e => {
        const {key, value} = e;

        currentAppRender = app;

        const componentHandler = componentHandlers[key];
        if (!componentHandler && value !== undefined) {
          const componentHandlerTemplate = componentTemplates[key];
          if (componentHandlerTemplate) {
            componentHandlers[key] = componentHandlerTemplate(app, value);
          }
        } else if (componentHandler && value === undefined) {
          componentHandler.remove();
          delete componentHandlers[key];
        }

        currentAppRender = null;
      });

      currentAppRender = null;
    };

    if (renderSpec instanceof THREE.Object3D) {
      const o = renderSpec;
      if (o !== app) {
        app.add(o);
        o.updateMatrixWorld();
      }
      
      app.addEventListener('destroy', () => {
        if (o !== app) {
          app.remove(o);
        }
      });

      _bindDefaultComponents(app);
      
      return app;
    } else if (renderSpec === false || renderSpec === null || renderSpec === undefined) {
      app.destroy();
      return null;
    } else if (renderSpec === true) {
      // console.log('background app', app);
      return null;
    } else {
      app.destroy();
      console.warn('unknown renderSpec:', renderSpec);
      throw new Error('unknown renderSpec');
    }
  },
};

const metaversefileAsync = async methodName => {
  async (keyName) => {
    switch (keyName) {
      case 'useApp': {
        return {
        };
      }
      case 'usePhysics': {
        return {
        };
      }
      case 'useAvatarIconer': {
        return {
        };
      }
      default: {
        return null;
      }
    }
  }
};