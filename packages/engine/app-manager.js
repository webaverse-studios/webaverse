/*
app manager binds z.js data to live running metaversefile apps.
you can have as many app managers as you want.
*/

import * as THREE from 'three';
// import {ZineData} from '../zine/zine-format.js';

import {getRandomString} from './util.js';
import {
  App,
} from '../app-runtime/app.js';
// import physicsManager from './physics/physics-manager.js';
// import metaversefile from 'metaversefile';
// import * as coreModules from './core-modules.js';

// import {appsMapName} from './constants.js';

// const localVector = new THREE.Vector3();
// const localVector2 = new THREE.Vector3();
// const localQuaternion = new THREE.Quaternion();
// const localMatrix = new THREE.Matrix4();

const localData = {
  timestamp: 0,
  frame: null,
  timeDiff: 0,
};
// const localFrameOpts = {
//   data: localData,
// };
// const frameEvent = new MessageEvent('frame', localFrameOpts);
const frameEvent = {
  type: 'frame',
  data: localData,
};

class AppManager extends THREE.Object3D {
  constructor({
    engine,
  }) {
    super();

    this.isAppManager = true;
    
    // members
    if (!engine) {
      console.warn('need engine', {engine});
      debugger;
    }
    this.engine = engine;

    // locals
    this.apps = new Map();
    this.transform = new Float32Array(10);
    
    // temps
    // this.pendingAddPromises = new Map();
    // this.unbindStateFn = null;
    // this.trackedAppUnobserveMap = new Map();
    
    this.onBeforeAppAdd = null;
    this.onBeforeAppRemove = null;

    // this.bindEvents();
  }

  #ownerApp;
  getOwnerApp() {
    return this.#ownerApp;
  }
  setOwnerApp(app) {
    this.#ownerApp = app;
  }

  tick(timestamp, timeDiff, frame) {
    localData.timestamp = timestamp;
    localData.frame = frame;
    localData.timeDiff = timeDiff;
    this.dispatchEvent(frameEvent);
  }

  transplantApp(app, newAppManager) {
    if (!this.apps.has(app.instanceId)) {
      debugger;
    }
    if (newAppManager.apps.has(app.instanceId)) {
      debugger;
    }

    // remove locally
    this.apps.delete(app.instanceId);
    this.remove(app);
    this.dispatchEvent({
      type: 'appremove',
      data: app,
    });

    // add remotely
    newAppManager.apps.set(app.instanceId, app);
    newAppManager.add(app);
    app.updateMatrixWorld();
    newAppManager.dispatchEvent({
      type: 'appadd',
      data: app,
    });

    // emit transplant event
    this.dispatchEvent({
      type: 'apptransplant',
      data: {
        app,
        oldAppManager: this,
        newAppManager,
      },
    });
  }

  async loadScnFromUrl(srcUrl) {
    const res = await fetch(srcUrl);
    const j = await res.json();
    const {objects} = j;

    const promises = [];
    for (let i = 0; i < objects.length; i++) {
      const p = (async () => {
        const object = objects[i];
        let {
          start_url,
          type,
          content,
          position = [0, 0, 0],
          quaternion = [0, 0, 0, 1],
          scale = [1, 1, 1],
          components = [],
        } = object;
        // if (!start_url) {
        //   throw new Error('no start_url');
        // }
        position = new THREE.Vector3().fromArray(position);
        quaternion = new THREE.Quaternion().fromArray(quaternion);
        scale = new THREE.Vector3().fromArray(scale);
        
        const baseUrl = import.meta.url;
        // console.log('baseUrl', baseUrl);
        const contentId = this.engine.importManager.getObjectUrl({
          contentId: start_url,
          type,
          content,
        }, baseUrl);
        // console.log('url', url)
        // await loadApp(url, position, quaternion, scale, components);

        // console.log('add app async 1', contentId);
        const p = this.addAppAsync({
          contentId,
          position,
          quaternion,
          scale,
          components,
          // instanceId = getRandomString(),
        });
        // console.log('add app async 2');
        await p;
        // console.log('add app async 3');
      })();
      promises.push(p);
    }

    await Promise.all(promises);

    console.log('scene loaded:', srcUrl);
  }

  // XXX need to migrate migrations to a different local system...
  /* getPeerOwnerAppManager(instanceId) {
    for (const appManager of appManagers) {
      if (appManager !== this) {
        return appManager;
      }
    }
    return null;
  } */

  /* isBound() {
    return true;
    // return !!this.appsArray;
  } */

  /* unbindState() {
    if (this.isBound()) {
      this.unbindStateFn();
      this.appsArray = null;
      this.unbindStateFn = null;
    }
  } */

  /* bindState(nextAppsArray) {
    this.unbindState();
  
    if (nextAppsArray) {
      const observe = e => {
        const {added, deleted} = e.changes;
        
        for (const item of added.values()) {
          let appMap = item.content.type;
          if (appMap.constructor === Object) {
            for (let i = 0; i < this.appsArray.length; i++) {
              const localAppMap = this.appsArray.get(i, Z.Map); // force to be a map
              if (localAppMap.binding === item.content.type) {
                appMap = localAppMap;
                break;
              }
            }
          }

          const instanceId = appMap.get('instanceId');
          
          const oldApp = this.apps.find(app => app.instanceId === instanceId);
          if (oldApp) {
            // console.log('accept migration add', instanceId);
            this.dispatchEvent(new MessageEvent('trackedappimport', {
              data: {
                instanceId,
                app: oldApp,
                // sourceAppManager: this,
                // destinationAppManager: peerOwnerAppManager,
              },
            }));
          } else {
            const trackedApp = this.getOrCreateTrackedApp(instanceId);
            // console.log('detected add app', instanceId, trackedApp.toJSON(), new Error().stack);
            this.dispatchEvent(new MessageEvent('trackedappadd', {
              data: {
                trackedApp,
              },
            }));
          }
        }
        for (const item of deleted.values()) {
          const appMap = item.content.type;
          const instanceId = item.content.type._map.get('instanceId').content.arr[0]; // needed to get the old data

          const app = this.getAppByInstanceId(instanceId);
          let migrated = false;
          const peerOwnerAppManager = this.getPeerOwnerAppManager(instanceId);
          
          if (peerOwnerAppManager) {
            // console.log('detected migrate app 1', instanceId, appManagers.length);
            
            const e = new MessageEvent('trackedappexport', {
              data: {
                instanceId,
                app,
                sourceAppManager: this,
                destinationAppManager: peerOwnerAppManager,
              },
            });
            this.dispatchEvent(e);
            peerOwnerAppManager.dispatchEvent(e);
            migrated = true;
            break;
          }
          
          // console.log('detected remove app 2', instanceId, appManagers.length);
          
          if (!migrated) {
            // console.log('detected remove app 3', instanceId, appManagers.length);
            
            this.dispatchEvent(new MessageEvent('trackedappremove', {
              data: {
                instanceId,
                app,
              },
            }));
          }
        }
      };
      nextAppsArray.observe(observe);
      this.unbindStateFn = () => {
        nextAppsArray.unobserve(observe);
      };
    }
    this.appsArray = nextAppsArray;
  } */

  /* async loadApps() {
    for (let i = 0; i < this.appsArray.length; i++) {
      const trackedApp = this.appsArray.get(i, Z.Map);
      if(this.hasTrackedApp(trackedApp.get('instanceId'))) {
        const app = this.apps.find(app => app.instanceId === trackedApp.get('instanceId'));
        if(!app){
          await this.importTrackedApp(trackedApp);
        }
      }
    }
  } */

  /* trackedAppBound(instanceId) {
    return !!this.trackedAppUnobserveMap.get(instanceId)
  } */
  
  /* async importTrackedApp(trackedApp) {
    const trackedAppBinding = trackedApp.toJSON();
    const {instanceId, contentId, transform, components} = trackedAppBinding;
    
    const p = makePromise();
    p.instanceId = instanceId;
    this.pendingAddPromises.set(instanceId, p);

    let live = true;
    
    const clear = e => {
      live = false;
      cleanup();
    };
    const cleanup = () => {
      this.removeEventListener('clear', clear);
      this.pendingAddPromises.delete(instanceId);
    };
    this.addEventListener('clear', clear);
    const _bailout = app => {
      // Add Error placeholder
      const errorPH = this.getErrorPlaceholder();
      if (app) {
        errorPH.position.fromArray(app.position);
        errorPH.quaternion.fromArray(app.quaternion);
        errorPH.scale.fromArray(app.scale);
      }
      this.addApp(errorPH);

      // Remove app
      if (app) {
        this.removeApp(app);
        app.destroy();
      }
      p.reject(new Error('app cleared during load: ' + contentId));
    };

    // attempt to load app
    try {
      const m = await metaversefile.import(contentId);
      if (!live) return _bailout(null);

      // create app
      // as an optimization, the app may be reused by calling addApp() before tracking it
      const app = metaversefile.createApp();

      // setup
      {
        // set pose
        app.position.fromArray(transform);
        app.quaternion.fromArray(transform, 3);
        app.scale.fromArray(transform, 7);
        app.updateMatrixWorld();
        app.lastMatrix.copy(app.matrixWorld);

        // set components
        app.instanceId = instanceId;
        app.setComponent('physics', true);
        for (const {key, value} of components) {
          app.setComponent(key, value);
        }
      }

      // initialize app
      {
        // console.log('add module', m);
        const mesh = await app.addModule(m);
        if (!live) return _bailout(app);
        if (!mesh) {
          console.warn('failed to load object', {contentId});
        }

        this.addApp(app);
      }

      this.bindTrackedApp(trackedApp, app);

      p.resolve(app);
    } catch (err) {
      p.reject(err);
    } finally {
      cleanup();
    }
  } */

  /* bindTrackedApp(trackedApp, app) {
    // console.log('bind tracked app', trackedApp.get('instanceId'));
    const _observe = (e, origin) => {
      // ! bellow code is bugged
      // if (origin !== 'push') {
      //   if (e.changes.keys.has('transform')) {
      //     app.position.fromArray(trackedApp.get('transform'));
      //     app.quaternion.fromArray(trackedApp.get('transform'), 3);
      //     app.scale.fromArray(trackedApp.get('transform'), 7);
      //     app.updateMatrixWorld();
      //   }
      // }
    };
    trackedApp.observe(_observe);
    
    const instanceId = trackedApp.get('instanceId');
    this.trackedAppUnobserveMap.set(instanceId, trackedApp.unobserve.bind(trackedApp, _observe));
  } */

  /* unbindTrackedApp(instanceId) {
    const fn = this.trackedAppUnobserveMap.get(instanceId);
    
    if (fn) {
      this.trackedAppUnobserveMap.delete(instanceId);
      fn();
    } else {
      console.warn('tracked app was not bound:', instanceId);
    }
  } */

  /* bindEvents() {
    this.addEventListener('trackedappadd', async e => {
      const {trackedApp} = e.data;
      this.importTrackedApp(trackedApp);
    });
    this.addEventListener('trackedappremove', async e => {
      const {instanceId, app} = e.data;
      
      this.unbindTrackedApp(instanceId);
      
      this.removeApp(app);
      app.destroy();
    });
    this.addEventListener('trackedappimport', async e => {
      const {
        instanceId,
        app,
      } = e.data;
    });
    this.addEventListener('trackedappexport', async e => {
      const {
        instanceId,
        app,
        sourceAppManager,
        destinationAppManager,
      } = e.data;
      if (sourceAppManager === this) {
        const index = this.apps.indexOf(app);
        if (index !== -1) {
          this.apps.splice(index, 1);
        }
      } else if (destinationAppManager === this) {
        if (!this.apps.includes(app)) {
          this.apps.push(app);

          app.dispatchEvent({
            type: 'migrated',
            appManager: this,
          });
        }
      }
    });
    
    if (typeof window !== 'undefined') {
      const resize = e => {
        this.resize(e);
      };
      globalThis.window.addEventListener('resize', resize);
      this.cleanup = () => {
        globalThis.window.removeEventListener('resize', resize);
      };
    }
  } */

  getApps() {
    const apps = Array.from(this.apps.values());
    return apps;
  }

  getAppByInstanceId(instanceId) {
    return this.apps.get(instanceId);
  }

  /* getAppByPhysicsId(physicsId) {
    for (const app of this.apps.values()) {
      if (app.getPhysicsObjects && app.getPhysicsObjects().some(o => o.physicsId === physicsId)) {
        return app;
      }
    }
    return null;
  }

  getPhysicsObjectByPhysicsId(physicsId) {
    for (const app of this.apps.values()) {
      const physicsObjects = app.getPhysicsObjects();
      for (const physicsObject of physicsObjects) {
        if (physicsObject.physicsId === physicsId) {
          return physicsObject;
        }
      }
    }
    return null;
  }

  getPairByPhysicsId(physicsId) {
    for (const app of this.apps.values()) {
      const physicsObjects = app.getPhysicsObjects();
      for (const physicsObject of physicsObjects) {
        if (physicsObject.physicsId === physicsId) {
          return [app, physicsObject];
        }
      }
    }
    return null;
  } */

  /* getOrCreateApp(instanceId) {
    let zd = this.apps.get(instanceId);
    if (!zd) {
      zd = new ZineData();
      this.apps.set(instanceId, zd);
    }
    return zd;
  }
  createApp(instanceId) {
    return new ZineData();
  } */

  /* getTrackedApp(instanceId) {
    for (const app of this.appsArray) {
      if (app.get('instanceId') === instanceId) {
        return app;
      }
    }
    return null;
  } */

  /* hasTrackedApp(instanceId) {
    if (!this.appsArray) {
      throw new Error('AppManager should be bound');
    }
    for (const app of this.appsArray) {
      if (app.get('instanceId') === instanceId) {
        return true;
      }
    }
    return false;
  } */

  clear() {
    throw new Error('not implemented');
    // XXX iterate the apps Map
    
    /* if (!this.isBound()) {
      const apps = this.apps.slice();
      for (const app of apps) {
        this.removeApp(app);
        app.destroy();
      }
      this.dispatchEvent(new MessageEvent('clear'));
    } else {
      throw new Error('cannot clear world while it is bound');
    } */
  }

  async addAppAsync({
    contentId,
    app = new App(),
    position = new THREE.Vector3(),
    quaternion = new THREE.Quaternion(),
    scale = new THREE.Vector3(1, 1, 1),
    components = [],
    instanceId = getRandomString(),
  }) {
    if (typeof contentId !== 'string') {
      debugger;
    }

    if (this.onBeforeAppAdd && !this.isUpdating()) {
      this.onBeforeAppAdd({
        app,
        contentId,
        position,
        quaternion,
        scale,
        components,
        instanceId,
      });
    }

    // const self = this;
    // const transform = new Float32Array(11);
    // position.toArray(transform);
    // quaternion.toArray(transform, 3);
    // scale.toArray(transform, 7);

    app = await this.engine.createAppAsync({
      contentId,
      instanceId,
      app,
      position,
      scale,
      quaternion,
      components,
    });
    app.instanceId = instanceId;
    this.apps.set(instanceId, app);

    this.add(app);
    app.updateMatrixWorld();

    return app;

    // const trackedApp = this.createApp(instanceId);
    // trackedApp.setData('instanceId', instanceId);
    // trackedApp.setData('contentId', contentId);
    // trackedApp.setData('transform', transform);
    // trackedApp.setData('components', components);

    // const loadPromise = (async () => {
      
    // })();
    // this.pendingAddPromises.set(instanceId, loadPromise);

    /* const p = this.pendingAddPromises.get(instanceId);
    if (p) {
      return p;
    } else {
      const app = this.getAppByInstanceId(instanceId);
      if (app) {
        return Promise.resolve(app);
      } else {
        throw new Error('no pending world add object promise');
      }
    } */
  }

  /* getTrackedAppIndex(instanceId) {
    for (let i = 0; i < this.appsArray.length; i++) {
      const app = this.appsArray.get(i);
      if (app.get('instanceId') === instanceId) {
        return i;
      }
    }
    return -1;
  }

  removeTrackedAppInternal(instanceId) {
    const removeIndex = this.getTrackedAppIndex(instanceId);
    if (removeIndex !== -1) {
      this.appsArray.delete(removeIndex, 1);
    } else {
      console.warn('invalid remove instance id', instanceId);
    }
  }

  removeTrackedApp(removeInstanceId) {
    const self = this;
    this.appsArray.doc.transact(function tx() {
      self.removeTrackedAppInternal(removeInstanceId);
    });
  } */

  /* addApp(app) {
    const {
      instanceId,
    } = app;
    this.apps.set(instanceId, app);
    
    this.dispatchEvent({
      type: 'appadd',
      data: app,
    });
  } */

  removeApp(app) {
    if (app.parent === this) {
      if (this.onBeforeAppRemove && !this.isUpdating()) {
        this.onBeforeAppRemove({
          app,
        });
      }

      const {
        instanceId,
      } = app;
      if (this.apps.has(instanceId)) {
        this.apps.delete(instanceId);

        app.parent.remove(app);
        app.destroy();

        this.dispatchEvent({
          type: 'appremove',
          data: app,
        });
      } else {
        throw new Error('removing app not in app manager');
      }
    } else {
      throw new Error('app not child of app manager');
    }
  }

  clear() {
    const apps = Array.from(this.apps.values());
    for (const app of apps) {
      this.removeApp(app);
    }
  }

  #updating = false;
  isUpdating() {
    return this.#updating;
  }
  tx(fn) {
    this.#updating = true;
    try {
      fn();
    } finally {
      this.#updating = false;
    }
  }

  /* resize(e) {
    const apps = this.apps.slice();
    for (const app of apps) {
      app.resize && app.resize(e);
    }
  } */

  /* getErrorPlaceholder() {
    const app = metaversefile.createApp({
      name: 'error-placeholder',
    });
    app.contentId = 'error-placeholder';
    (async () => {
      const m = await coreModules.importModule('errorPlaceholder');
      await app.addModule(m);
    })();
    return app;
  } */

  /* transplantApp(app, dstAppManager) {
    const {instanceId} = app;
    const srcAppManager = this;
    
    this.unbindTrackedApp(instanceId);
    
    let dstTrackedApp = null;

    const wrapTxFn = (srcAppManager.appsArray.doc === dstAppManager.appsArray.doc) ?
      innerFn => srcAppManager.appsArray.doc.transact(innerFn)
    :
      innerFn => dstAppManager.appsArray.doc.transact(() => {
        srcAppManager.appsArray.doc.transact(innerFn);
      });
    wrapTxFn(() => {
      const srcTrackedApp = srcAppManager.getTrackedApp(instanceId);
      const contentId = srcTrackedApp.get('contentId');
      const transform = srcTrackedApp.get('transform');
      const components = srcTrackedApp.get('components');
      
      srcAppManager.removeTrackedAppInternal(instanceId);
      
      dstTrackedApp = dstAppManager.addTrackedAppInternal(
        instanceId,
        contentId,
        transform,
        components,
      );
    });
    
    dstAppManager.bindTrackedApp(dstTrackedApp, app);
  } */

  /* importApp(app) {
    const self = this;
    this.appsArray.doc.transact(() => {
      const contentId = app.contentId;
      const instanceId = app.instanceId;
      const components = app.components.slice();
      const transform = new Float32Array(10);
      app.position.toArray(transform);
      app.quaternion.toArray(transform, 3);
      app.scale.toArray(transform, 7);
      
      const dstTrackedApp = self.addTrackedAppInternal(
        instanceId,
        contentId,
        transform,
        components,
      );

      self.addApp(app);
      self.bindTrackedApp(dstTrackedApp, app);
    });
  } */

  /* importAddedUserVoucherApp(position, quaternion, json, localVelocity) {
    const dropManager = metaversefile.useDropManager();
    dropManager.createDropApp({
      // tokenId: json.tokenId,
      type: json.type,
      start_url: json.start_url,
      components: [
        {
          key: 'appName',
          value: json.name
        },
        {
          key: 'appUrl',
          value: json.start_url,
        },
        {
          key: 'voucher',
          value: json.voucher, // fakeVoucher is for ServerDrop, claimVoucher is for UserClaim
        },
      ],
      voucher: "hadVoucher",
      position: position.clone()
        .add(new THREE.Vector3(0, 0.7, 0)),
      quaternion,
      scale: new THREE.Vector3(1, 1, 1),
      velocity: localVelocity
    });
  } */

  /* hasApp(app) {
    return this.apps.includes(app);
  } */

  /* pushAppUpdates() {
    if (this.appsArray) {
      this.appsArray.doc.transact(() => { 
        this.updatePhysics();
      }, 'push');
    }
  } */

  /* update(timestamp, timeDiff) {
    // XXX all app updates happen in the frameTracker now
    debugger;
    // XXX unlock running actual physics
    for (const app of this.apps.values()) {
      // const physicsObjects = this.physicsTracker.getAppPhysicsObjects(app);
      // for (const physicsObject of physicsObjects) {
      //   console.log()
      //   // physicsObject.update(timestamp, timeDiff);
      // }
    }
    return;

    for (const app of this.apps) {
      if (!app.matrix.equals(app.lastMatrix)) {
        const _updateTrackedApp = () => {
          // note: not all apps are tracked in multiplayer. for those that are, we push the transform update here.
          const trackedApp = this.getTrackedApp(app.instanceId);
          if (trackedApp) {
            app.matrixWorld.decompose(localVector, localQuaternion, localVector2);
        
            localVector.toArray(this.transform);
            localQuaternion.toArray(this.transform, 3);
            localVector2.toArray(this.transform, 7);
            trackedApp.set('transform', this.transform);

            app.updateMatrixWorld();
          }
        };
        _updateTrackedApp();

        const _updatePhysicsObjects = () => {
          // update attached physics objects with a relative transform
          const physicsObjects = app.getPhysicsObjects();
          if (physicsObjects.length > 0) {
            const lastMatrixInverse = localMatrix.copy(app.lastMatrix).invert();

            for (const physicsObject of physicsObjects) {
              if (!physicsObject.detached) {
                physicsObject.matrix
                  .premultiply(lastMatrixInverse)
                  .premultiply(app.matrix)
                  .decompose(physicsObject.position, physicsObject.quaternion, physicsObject.scale);
                physicsObject.matrixWorld.copy(physicsObject.matrix);
                for (const child of physicsObject.children) {
                  child.updateMatrixWorld();
                }

                const physicsScene = physicsManager.getScene();
                physicsScene.setTransform(physicsObject);
                physicsScene.getBoundingBoxForPhysicsId(physicsObject.physicsId, physicsObject.physicsMesh.geometry.boundingBox);
              }
            }
          }
        };
        _updatePhysicsObjects();

        app.lastMatrix.copy(app.matrix);
      }
    }
  } */

  /* exportJSON() {
    const objects = [];

    // iterate over appsArray
    for (const trackedApp of this.appsArray) {
      const transform = trackedApp.get('transform');
      const position = [ transform[0], transform[1], transform[2]];
      const quaternion = [ transform[3], transform[4], transform[5], transform[6]];
      const scale = [ transform[7], transform[8], transform[9]];

      const components = trackedApp.get('components');
      const object = {};

      // Check for identities and skip them -- we don't need to serialize a scale 1,1,1 for example
      if(position[0] !== 0 || position[1] !== 0 || position[2] !== 0) object.position = position;
      if(quaternion[0] !== 0 || quaternion[1] !== 0 || quaternion[2] !== 0) object.quaternion = quaternion;
      if(scale[0] !== 1 || scale[1] !== 1 || scale[2] !== 1) object.scale = scale;
      if(components && components.length > 0) object.components = components;
    
      let contentId = trackedApp.get('contentId');
      const match = contentId.match(/^\/@proxy\/data:([^;,]+),([\s\S]*)$/);
      if (match) {
        const type = match[1];
        const content = decodeURIComponent(match[2]);
        object.type = type;
        object.content = jsonParse(content) ?? {};
      } else {
        object.start_url = contentId;
      }

      objects.push(object);
    }

    return {objects};
  } */

  destroy() {
    for (const app of this.apps.values()) {
      app.destroy();
    }
  }
}
export {
  AppManager,
};