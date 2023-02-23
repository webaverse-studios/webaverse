import {
  getOwnerApp,
} from './physics-traverse-utils.js';

export class PhysicsTracker {
  // constructor({
  //   playersManager,
  //   world,
  //   universe,
  // }) {
  //   this.playersManager = playersManager;
  //   this.world = world;
  //   this.universe = universe;
  // }
  #physicsObjects = new Map();
  #physicsObjectApps = new Map();
  
  constructor() {
    // nothing
  }

  addAppPhysicsObject(app, physicsObject) {
    // XXX this should be abstracted to physics-traverse-utils.js
    // let topApp = app;
    // for (;;) {
    //   let ownerApp;
    //   if (
    //     topApp?.parent?.isApp
    //   ) {
    //     topApp = topApp.parent;
    //   } else if (topApp?.parent?.isAppManager && (ownerApp = topApp?.parent?.getOwnerApp()) !== void 0) {
    //     topApp = ownerApp;
    //   } else {
    //     break;
    //   }
    // }
    app = getOwnerApp(app);

    this.#physicsObjects.set(physicsObject.physicsId, physicsObject);
    this.#physicsObjectApps.set(physicsObject.physicsId, app);
  }
  removeAppPhysicsObject(app, physicsObject) {
    this.#physicsObjects.delete(physicsObject.physicsId);
    this.#physicsObjectApps.delete(physicsObject.physicsId);
  }
  getAppByPhysicsId(physicsId) {
    return this.#physicsObjectApps.get(physicsId) || null;
  }
  getPhysicsObjectByPhysicsId(physicsId) {
    return this.#physicsObjects.get(physicsId) || null;
  }
  getPairByPhysicsId(physicsId) {
    const app = this.getAppByPhysicsId(physicsId);
    const physicsObject = this.getPhysicsObjectByPhysicsId(physicsId);
    return [
      app,
      physicsObject,
    ];
  }

  getAppPhysicsObjects(app) {
    const result = [];
    for (const physicsObject of this.#physicsObjects.values()) {
      if (this.#physicsObjectApps.get(physicsObject.physicsId) === app) {
        result.push(physicsObject);
      }
    }
    return result;
  }

  /* getAppByPhysicsId(physicsId) {
    let result;

    // local player
    const localPlayer = this.playersManager.getLocalPlayer();
    result = localPlayer.appManager.getAppByPhysicsId(physicsId);
    if (result) {
      return result;
    }

    // local app
    result = this.world.appManager.getAppByPhysicsId(physicsId);
    if (result) {
      return result;
    }

    // remote player
    for (const remotePlayer of this.playersManager.getRemotePlayers()) {
      const remoteApp = remotePlayer.appManager.getAppByPhysicsId(physicsId);
      if (remoteApp) {
        return remoteApp;
      }
    }

    // default
    return null;
  }
  getPhysicsObjectByPhysicsId(physicsId) {
    let result;
    
    // local player
    const localPlayer = this.playersManager.getLocalPlayer();
    result = localPlayer.appManager.getPhysicsObjectByPhysicsId(physicsId);
    if (result) {
      return result;
    }

    // local app
    result = this.world.appManager.getPhysicsObjectByPhysicsId(physicsId);
    if (result) {
      return result;
    }

    // remote player
    for (const remotePlayer of this.playersManager.getRemotePlayers()) {
      const remoteApp = remotePlayer.appManager.getPhysicsObjectByPhysicsId(physicsId);
      if (remoteApp) {
        return remoteApp;
      }
    }

    // default
    return null;
  } */
}