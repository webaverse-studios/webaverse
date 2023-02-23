import * as THREE from 'three';
import {
  AppManager,
} from '../app-manager.js';
import {
  HpManager,
} from '../hp-manager.js';
// import {scene, sceneHighPriority, sceneLowPriority, sceneLowerPriority, sceneLowestPriority} from './renderer.js';
import {
  getScnUrl,
} from './realm-utils.js';

// Handles the world and objects in it, has an app manager just like a player
export class World extends THREE.Object3D {
  constructor({
    engine,
  }) {
    super();

    // members
    if (!engine) {
      debugger;
    }
    this.engine = engine;

    // locals
    this.appManager = new AppManager({
      engine,
    });
    this.add(this.appManager);
    this.appManager.updateMatrixWorld();

    this.hpManager = new HpManager();

    // debug cube mesh
    {
      const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
      const boxMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
      const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
      // boxMesh.position.set(0, 0, 0);
      this.add(boxMesh);
      boxMesh.updateMatrixWorld();
    }

    const _getBindSceneForRenderPriority = renderPriority => {
      const {webaverseRenderer} = engine;
      switch (renderPriority) {
        case 'high': {
          return webaverseRenderer.sceneHighPriority;
        }
        case 'low': {
          return webaverseRenderer.sceneLowPriority;
        }
        case 'lower': {
          return webaverseRenderer.sceneLowerPriority;
        }
        case 'lowest': {
          return webaverseRenderer.sceneLowestPriority;
        }
        default: {
          return webaverseRenderer.scene;
        }
      }
    };

    // this.winds = [];
    // This handles adding apps to the world scene
    // this.appManager.addEventListener('appadd', e => {
    //   const app = e.data;
    //   const bindScene = _getBindSceneForRenderPriority(app.getComponent('renderPriority'));
    //   bindScene.add(app);
    //   let boundAppManager = this.appManager;

    //   const isInvincible = app.getComponent('invincible');

    //   // regular glb models default to invincible for now
    //   if (!isInvincible) {
    //     const hitTracker = hpManager.makeHitTracker();
    //     hitTracker.bind(app);
    //     app.dispatchEvent({type: 'hittrackeradded'});

    //     const die = () => {
    //       boundAppManager.removeTrackedApp(app.instanceId);
    //     };
    //     app.addEventListener('die', die);
    //   }

    //   const migrated = (e) => {
    //     const {appManager} = e;
    //     boundAppManager = appManager;
    //   };
    //   app.addEventListener('migrated', migrated);
    // });

    // This handles removal of apps from the scene when we leave the world
    // this.appManager.addEventListener('appremove', async e => {
    //   const app = e.data;
    //   app.hitTracker.unbind();
    //   app.parent.remove(app);
    // });
  }
  async setRealmSpec(realmSpec) {
    const {src} = realmSpec;
    const scnUrl = getScnUrl(src);
    await this.appManager.loadScnFromUrl(scnUrl);
    
    // await loadScene({
    //   engine: this.engine,
    //   src,
    // });
  }
}
// export const world = new World();