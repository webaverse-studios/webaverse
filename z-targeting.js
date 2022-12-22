import * as THREE from 'three';
import metaversefile from './metaversefile-api.js';
import * as coreModules from './core-modules.js';
import {scene, camera} from './renderer.js';
import * as sounds from './sounds.js';
import cameraManager from './camera-manager.js';
import physicsManager from './physics-manager.js';
import {playersManager} from './players-manager.js';

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
  constructor() {
    this.results = [];
  }

  snapshotSweep(object) {
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

class ZTargeting extends THREE.Object3D {
  constructor() {
    super();

    this.targetReticleApp = null;
    this.reticles = [];
    this.focusTargetReticle = null;
    this.queryResults = new QueryResults();

    this.loadPromise = null;
  }

  waitForLoad() {
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
  }

  setQueryResult(timestamp) {
    let reticles;
    const localPlayer = playersManager.getLocalPlayer();
    if (localPlayer.hasAction('aim')) {
      this.queryResults.snapshotSweep(camera);
      reticles = this.queryResults.results;
    } else {
      reticles = [];
    }
    if (this.focusTargetReticle) {
      const timeDiff = timestamp - (cameraManager.cameraTarget ? cameraManager.cameraTarget.lerpStartTime : 0);
      const focusTime = 250;

      const f = timeDiff / focusTime;
      if (cameraManager.focus || f < 3) {
        reticles = [
          this.focusTargetReticle,
        ];

        let f2 = Math.min(Math.max(f, 0), 1);
        if (cameraManager.focus) {
          f2 = 1 - f2;
        }
        this.focusTargetReticle.zoom = f2;
      } else {
        this.focusTargetReticle = null;
      }
    }
    
    const targetReticleMesh = this.targetReticleApp.children[0];
    targetReticleMesh.setReticles(reticles);
  }

  update(timestamp) {
    this.setQueryResult(timestamp);
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
    cameraManager.setFocus(true);
    const remoteApp = this.focusTargetReticle ?
      metaversefile.getAppByPhysicsId(this.focusTargetReticle.physicsId)
    :
      null;
    const localPlayer = playersManager.getLocalPlayer();
    cameraManager.setStaticTarget(localPlayer.avatar.modelBones.Head, remoteApp);
  }
  #playSelectSound() {
    if (this.focusTargetReticle) {
      sounds.playSoundName(this.focusTargetReticle.type === 'enemy' ? 'zTargetEnemy' : 'zTargetObject');
        
      const naviSoundNames = [
        'naviHey',
        'naviWatchout',
        'naviFriendly',
        'naviItem',
        'naviDanger',
      ];
      const naviSoundName = naviSoundNames[Math.floor(Math.random() * naviSoundNames.length)];
      sounds.playSoundName(naviSoundName);
    } else {
      sounds.playSoundName('zTargetCenter');
    }
  }

  handleDown(object = camera) {
    if (!cameraManager.focus) {
      this.#snapshotSelectSweep(object);
      this.#focusSelectedApp();
      this.#playSelectSound();
    }
  }
  handleUp() {
    if (cameraManager.focus) {
      cameraManager.setFocus(false);
      cameraManager.setCameraToNullTarget();

      if (this.focusTargetReticle) {
        sounds.playSoundName('zTargetCancel');
      }
    }
  }

  toggle() {
    if (cameraManager.focus) {
      this.handleUp();
    } else {
      const localPlayer = playersManager.getLocalPlayer();
      this.handleDown(localPlayer);
      
      if (this.queryResults.results.length === 0) {
        setTimeout(() => {
          this.handleUp();
        }, 300);
      }
    }
  }

  handleRayFocus(object) {
    if (!cameraManager.focus) {
      this.#snapshotSelectRay(object);
      this.#focusSelectedApp();
      this.#playSelectSound();
    } else {
      this.handleUp();
    }
  }
}
const zTargeting = new ZTargeting();
scene.add(zTargeting);
export default zTargeting;