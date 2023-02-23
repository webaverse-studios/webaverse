import * as THREE from 'three';
// import metaversefile from './metaversefile-api.js';
// import * as coreModules from './core-modules.js';
// import {scene, camera} from './renderer.js';
// import * as sounds from '../../sounds.js';
// import cameraManager from './camera-manager.js';
import physicsManager from '../../physics/physics-manager.js';
import {
  TargetReticleMesh,
} from './target-reticle-mesh.js';

//

const localVector = new THREE.Vector3();
// const localVector2 = new THREE.Vector3();

// const maxResults = 16;

//

const getPyramidConvexGeometry = (() => {
  const radius = 0.5;
  const height = 0.2;
  const radialSegments = 4;
  const heightSegments = 1;

  let shapeAddress = null;

  return () => {
    if (shapeAddress === null) {
      const geometry = new THREE.ConeGeometry(
        radius,
        height,
        radialSegments,
        heightSegments,
        /* openEnded,
        thetaStart,
        thetaLength, */
      );
      geometry.rotateX(-Math.PI/2);
      geometry.rotateZ(Math.PI/4);
      geometry.scale(2, 2.75, 1);

      /* redMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0xff0000}));
      redMesh.frustumCulled = false;
      scene.add(redMesh); */

      const fakeMesh = new THREE.Mesh(geometry);
      const physicsScene = physicsManager.getScene();
      const buffer = physicsScene.cookConvexGeometry(fakeMesh);
      shapeAddress = physicsScene.createConvexShape(buffer);
    }
    return shapeAddress;
  };
})();
class QueryResults {
  constructor({
    camera,
  }) {
    this.camera = camera;

    this.results = [];
  }

  snapshotSweep(object) {
    const {camera} = this;
    const {position, quaternion} = object;
    const direction = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(quaternion);
    const sweepDistance = 100;
    const maxHits = 64;

    const pyramidConvexGeometryAddress = getPyramidConvexGeometry();

    const physicsScene = physicsManager.getScene();
    const result = physicsScene.sweepConvexShape(
      pyramidConvexGeometryAddress,
      position,
      quaternion,
      direction,
      sweepDistance,
      maxHits,
    );
    let reticles = result.map(reticle => {
      const distance = reticle.position.distanceTo(position);
      const type = (() => {
        if (distance < 5) {
          return 'friend';
        } else if (distance < 10) {
          return 'enemy';
        } else {
          return 'object';
        }
      })();
      const zoom = 0;
      return {
        position: reticle.position,
        physicsId: reticle.objectId,
        type,
        zoom,
      };
    });
    if (object === camera) {
      reticles = reticles.filter(reticle => {
        localVector.copy(reticle.position)
          .project(camera);
        return ( // check inside camera frustum
          localVector.x >= -1 && localVector.x <= 1 &&
          localVector.y >= -1 && localVector.y <= 1 &&
          localVector.z > 0
        );
      });
    }
    const reticleSpecs = reticles.map(reticle => {
      localVector.copy(reticle.position)
        .project(camera);
      return {
        reticle,
        lengthSq: localVector.lengthSq(),
      };
    });
    reticleSpecs.sort((a, b) => a.lengthSq - b.lengthSq);
    reticles = reticleSpecs.map(reticleSpec => reticleSpec.reticle);
    this.results = reticles;
  }
  snapshotRay(object) {
    const physicsScene = physicsManager.getScene();
    const results = physicsScene.raycast(object.position, object.quaternion);

    if (results) {
      const {
        distance,
        faceIndex,
        meshId,
        normal,
        objectId,
        point,
      } = results;

      const position = new THREE.Vector3().fromArray(point);
      const physicsId = objectId;
      const type = (() => {
        if (distance < 5) {
          return 'friend';
        } else if (distance < 10) {
          return 'enemy';
        } else {
          return 'object';
        }
      })();
      const zoom = 0;
      const reticle = {
        position,
        physicsId,
        type,
        zoom,
      };
      const reticles = [
        reticle,
      ];
      this.results = reticles;
    } else {
      this.results = [];
    }
  }
}

export class ZTargetingManager extends THREE.Object3D {
  constructor({
    webaverseRenderer,
    cameraManager,
    playersManager,
    physicsTracker,
    sounds,
  }) {
    super();

    if (!webaverseRenderer || !cameraManager || !playersManager || !physicsTracker || !sounds) {
      debugger;
    }
    this.webaverseRenderer = webaverseRenderer;
    this.cameraManager = cameraManager;
    this.playersManager = playersManager;
    this.physicsTracker = physicsTracker;
    this.sounds = sounds;

    const {camera} = webaverseRenderer;
    this.targetReticleMesh = new TargetReticleMesh({
      camera,
    });
    // this.targetReticleMesh.onBeforeRender = () => {
    //   debugger;
    // };
    this.add(this.targetReticleMesh);
    this.updateMatrixWorld();

    this.reticles = [];
    this.focusTargetReticle = null;
    this.queryResults = new QueryResults({
      camera,
    });

    this.loadPromise = null;
  }

  /* waitForLoad() {
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        const {importModule} = coreModules;
        const m = await importModule('targetReticle');
        
        const targetReticleApp = metaversefile.createApp();
        await targetReticleApp.addModule(m);
        scene.add(targetReticleApp);
        this.targetReticleApp = targetReticleApp;
      })();
    }
    return this.loadPromise;
  } */

  setQueryResult(timestamp) {
    const {camera} = this.webaverseRenderer;

    let reticles;
    const localPlayer = this.playersManager.getLocalPlayer();
    if (localPlayer.actionManager.hasActionType('aim')) {
      this.queryResults.snapshotSweep(camera);
      reticles = this.queryResults.results;
    } else {
      reticles = [];
    }
    if (this.focusTargetReticle) {
      const timeDiff = timestamp - this.cameraManager.lerpStartTime;
      const focusTime = 250;

      const f = timeDiff / focusTime;
      if (this.cameraManager.focus || f < 3) {
        reticles = [
          this.focusTargetReticle,
        ];

        let f2 = Math.min(Math.max(f, 0), 1);
        if (this.cameraManager.focus) {
          f2 = 1 - f2;
        }
        this.focusTargetReticle.zoom = f2;
      } else {
        this.focusTargetReticle = null;
      }
    }
    
    // const targetReticleMesh = this.targetReticleApp.children[0];
    this.targetReticleMesh.setReticles(reticles);
  }

  update(timestamp, timeDiff) {
    this.setQueryResult(timestamp);
    this.targetReticleMesh.update(timestamp, timeDiff);
  }

  #snapshotSelectSweep(object) {
    this.queryResults.snapshotSweep(object);
    this.#updateFocusTargetReticle();
  }
  #snapshotSelectRay(object) {
    this.queryResults.snapshotRay(object);
    this.#updateFocusTargetReticle();
  }
  #updateFocusTargetReticle() {
    if (this.queryResults.results.length > 0) {
      this.focusTargetReticle = this.queryResults.results[0];
    } else {
      this.focusTargetReticle = null;
    }
  }
  #focusSelectedApp() {
    this.cameraManager.setFocus(true);
    const remoteApp = this.focusTargetReticle ?
      this.physicsTracker.getAppByPhysicsId(this.focusTargetReticle.physicsId)
    :
      null;
    const localPlayer = this.playersManager.getLocalPlayer();
    this.cameraManager.setStaticTarget(localPlayer.avatar.modelBones.Head, remoteApp);
  }
  #playSelectSound() {
    if (this.focusTargetReticle) {
      this.sounds.playSoundName(this.focusTargetReticle.type === 'enemy' ? 'zTargetEnemy' : 'zTargetObject');
        
      const naviSoundNames = [
        'naviHey',
        'naviWatchout',
        'naviFriendly',
        'naviItem',
        'naviDanger',
      ];
      const naviSoundName = naviSoundNames[Math.floor(Math.random() * naviSoundNames.length)];
      this.sounds.playSoundName(naviSoundName);
    } else {
      this.sounds.playSoundName('zTargetCenter');
    }
  }

  handleDown(object = this.webaverseRenderer.camera) {
    if (!this.cameraManager.focus) {
      this.#snapshotSelectSweep(object);
      this.#focusSelectedApp();
      this.#playSelectSound();
    }
  }
  handleUp() {
    if (this.cameraManager.focus) {
      this.cameraManager.setFocus(false);
      this.cameraManager.setCameraToNullTarget();

      if (this.focusTargetReticle) {
        this.sounds.playSoundName('zTargetCancel');
      }
    }
  }

  toggle() {
    if (this.cameraManager.focus) {
      this.handleUp();
    } else {
      const localPlayer = this.playersManager.getLocalPlayer();
      this.handleDown(localPlayer);
      
      if (this.queryResults.results.length === 0) {
        setTimeout(() => {
          this.handleUp();
        }, 300);
      }
    }
  }
  release() {
    if (this.cameraManager.focus) {
      this.handleUp();
    }
  }

  handleRayFocus(object) {
    if (!this.cameraManager.focus) {
      this.#snapshotSelectRay(object);
      this.#focusSelectedApp();
      this.#playSelectSound();
    } else {
      this.handleUp();
    }
  }
}