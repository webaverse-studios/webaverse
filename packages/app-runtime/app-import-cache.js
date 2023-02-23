import * as THREE from 'three';
// import {
//   importFn,
// } from './utils.js';
// import {
//   metaversefileAsync,
// } from './metaversefile-dynamic.js';
import physicsManager from '../engine/physics/physics-manager.js';

//

const globalImports = {
  '*': {
    three: async (app) => {
      return THREE;
    },
  },
  '': {
    metaversefile: async (app) => {
      // import all of metaversefile... not good
      throw new Error('do not import all metaversefile');
    },
  },
  '.': {
    metaversefile: async (app, methodName) => {
      async (keyName) => {
        switch (keyName) {
          case 'useApp': {
            return app;
          }
          case 'usePhysics': {
            const physics = physicsManager.getScene();
            return physics;
          }
          default: {
            return null;
          }
        }
      }
    },
  }
}

//

export class AppImportCache {
  constructor() {
    this.cachedValues = new Map();
  }
  addModuleToCache(moduleName, value) {
    this.cachedValues.set(moduleName, value);
  }
  addModuleKeyToCache(moduleName, keyName, value) {
    let m = this.cachedValues.get(moduleName);
    if (!m) {
      m = {};
    }
    m[keyName] = value;
    this.cachedValues.set(moduleName, m);
  }
  get(moduleName, keyName) {
    const m = this.cachedValues.get(moduleName);
    return m?.[keyName];
  }
  static async fromDependencies(app, dependencies) {
    const appCache = new AppImportCache();
    
    await Promise.all(Object.keys(dependencies).map(async k => {
      const a = dependencies[k];
      if (a.length > 0) {
        for (let i = 0; i < a.length; i++) {
          const keyName = a[i];
          
          if (keyName === '') {
            const imports = globalImports[''];
            if (imports) {
              const m = await imports(app);
              appCache.addModuleToCache(k, m);
            } else {
              throw new Error('no global imports for ' + u);
            }
          } else if (keyName === '*') {
            const imports = globalImports['*'];
            if (imports) {
              const m = await imports(app);
              appCache.addModuleToCache(k, m);
            } else {
              throw new Error('no global imports for ' + u);
            }
          } else {
            const imports = globalImports['.'];
            if (imports) {
              const imp = imports[k];
              if (imp) {
                const m = await imp(app, keyName);
                if (m) {
                  appCache.addModuleKeyToCache(k, keyName, m);
                } else {
                  throw new Error('no global imports for ' + k + ':' + keyName);
                }
              } else {
                throw new Error('no global imports for ' + k + ':' + keyName);
              }
            } else {
              throw new Error('no global imports for ' + k);
            }
          }
        }
      } else {
        const imports = globalImports['*'];
        if (imports) {
          const m = await imports(app);
          appCache.addModuleToCache(k, m);
        } else {
          throw new Error('no global imports for ' + k);
        }
      }
    }));

    for (const [k, m] of dependencies) {
      const m = moduleImports.get(k);
      appCache.addModuleToCache(k, m);
    }
    return appCache;
  }
}

//

export class MetaversefileCache {
  constructor() {
    this.appCaches = new Map();
  }
  addAppCache(appId, appCache) {
    this.appCaches.set(appId, appCache);
  }
  get(appId, moduleName, keyName) {
    // console.log('metaversefile get', {appId, moduleName, keyName});
    const appCache = this.appCaches.get(appId);
    if (appCache) {
      return appCache.get(moduleName, keyName);
    } else {
      return null;
    }
  }
}