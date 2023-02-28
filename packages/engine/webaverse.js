/*
this file bootstraps the webaverse engine.
it uses the help of various managers and stores, and executes the render loop.
*/

import * as THREE from 'three'

// import metaversefileApi from './metaversefile-api.js';

// managers
// import {
//   App,
// } from '../app-runtime/app.js';
import {
  ImportManager,
} from '../app-runtime/import-manager.js'
import {
  PlayersManager,
} from './players-manager.js'
import {
  EnvironmentManager,
} from './environment/environment-manager.js'
import {
  CameraManager,
} from './camera-manager.js'
import {
  PointerLockManager,
} from './io/pointerlock-manager.js'
import {
  AudioManager,
} from './audio/audio-manager.js'
import {
  CharacterSelectManager,
} from './characterselect-manager.js'
import {
  PartyManager,
} from './party-manager.js'
import {
  IoManager,
} from './io/io-manager.js'
import {
  SpawnManager,
} from './spawn-manager.js'
import {
  LightingManager,
} from './managers/lighting/lighting-manager.js'
import {
  SkyManager,
} from './managers/environment/skybox/sky-manager.js'
import {
  GameManager,
} from './game.js'
// import {
//   GameManager,
// } from './game.js';
// import {
//   NpcAiManager,
// } from './npc-ai-manager.js';
// import {
//   MobManager,
// } from './mob-manager.js';

import Avatar from './avatars/avatars.js'
import {
  Sounds,
} from './sounds.js'
import physx from './physics/physx.js'
import physicsManager from './physics/physics-manager.js'
import physxWorkerManager from './physics/physx-worker-manager.js'
// import {
//   World,
// } from './world.js';
// import {
//   Universe,
// } from './universe.js';
import {
  NpcManager,
} from './npc-manager.js'
import {
  MobManager,
} from './managers/mob/mob-manager.js'
import {
  ZTargetingManager,
} from './managers/z-targeting/z-targeting-manager.js'
import {
  RealmManager,
} from './realms/realm-manager.js'
// import {
//   HpManager,
// } from './hp-manager.js';
import {
  PostProcessing,
} from './post-processing.js'
// import particleSystemManager from './particle-system.js';
import {
  LoadoutManager,
} from './loadout-manager.js'
// import {
//   QuestManager,
// } from './quest-manager.js';
// import {
//   getRenderer,
//   scene,
//   sceneHighPriority,
//   sceneLowPriority,
//   rootScene,
//   camera,
//   bindCanvas,
//   getComposer,
//   offscreenCanvas,
//   canvas
// } from './renderer.js';
// import transformControls from './transform-controls.js';
// import dioramaManager from './diorama/diorama-manager.js';
import {
  DioramaManager,
} from './diorama/diorama-manager.js'
import {
  Voices,
} from './voices.js'
import {
  RenderSettingsManager,
} from './rendersettings-manager.js'
// import musicManager from './music-manager.js';
import {
  MusicManager,
} from './music-manager.js'
// import story from './story.js';
import {
  RaycastManager,
} from './raycast-manager.js'
// import settingsManager from './settings-manager.js';
import {
  InteractionManager,
} from './interaction-manager.js'
import {
  BackgroundFx,
} from './background-fx/background-fx.js'
import {
  HitManager,
} from './managers/interaction/hit-manager.js'
// import {
//   LoadingManager,
// } from './loading-manager';
import {
  makeDefaultPerspectiveCamera,
} from './renderer-utils.js'
import {
  MetaversefileCache,
} from '../app-runtime/app-import-cache.js'
import {
  ChatManager,
} from './chat-manager.js'
import {
  TempManager,
} from './temp-manager.js'
import {
  FrameTracker,
} from './frame-tracker.js'
import {
  PhysicsTracker,
} from './physics/physics-tracker.js'
import {
  WebaverseRenderer,
} from './renderers/webaverse-renderer.js'

import './metaversefile-binding.js'
import {NpcRenderManager} from './npc-render-pipeline/render-manager.js'

//

const localVector     = new THREE.Vector3()
const localVector2    = new THREE.Vector3()
const localQuaternion = new THREE.Quaternion()
const localMatrix     = new THREE.Matrix4()
const localMatrix2    = new THREE.Matrix4()

const sessionMode = 'immersive-vr'
const sessionOpts = {
  requiredFeatures: [
    'local-floor',
    // 'bounded-floor',
  ],
  optionalFeatures: [
    'hand-tracking',
  ],
}

const frameEvent = new MessageEvent('frame', {
  data: {
    timestamp: 0,
    timeDiff: 0,
  },
})

const metaversefileCache      = new MetaversefileCache()
globalThis.metaversefileCache = metaversefileCache

// let numWebaverseEngines = null;
export class WebaverseEngine extends EventTarget {
  camera            = makeDefaultPerspectiveCamera()
  webaverseRenderer = new WebaverseRenderer()
  audioContext      = new AudioContext()

  importManager = new ImportManager()
  tempManager   = new TempManager()
  frameTracker  = new FrameTracker()

  audioManager = new AudioManager({
    audioContext: this.audioContext,
  })
  sounds       = new Sounds({
    audioManager: this.audioManager,
  })

  physicsTracker     = new PhysicsTracker()
  environmentManager = new EnvironmentManager()
  chatManager        = new ChatManager()
  playersManager     = new PlayersManager({
    physicsTracker: this.physicsTracker,
    environmentManager: this.environmentManager,
    audioManager: this.audioManager,
    chatManager: this.chatManager,
    sounds: this.sounds,
    engine: this,
  })

  npcRenderManager = new NpcRenderManager()

  // hpManager = new HpManager();
  cameraManager      = new CameraManager({
    webaverseRenderer: this.webaverseRenderer,
    // camera: this.camera,
    playersManager: this.playersManager,
  })
  pointerLockManager = new PointerLockManager({
    engine: this,
  })
  spawnManager       = new SpawnManager({
    // cameraManager: this.cameraManager,
    webaverseRenderer: this.webaverseRenderer,
    playersManager: this.playersManager,
  })
  lightingManager    = new LightingManager()
  skyManager         = new SkyManager({
    lightingManager: this.lightingManager,
  })

  characterSelectManager = new CharacterSelectManager()

  realmManager = new RealmManager({
    playersManager: this.playersManager,
    spawnManager: this.spawnManager,
    engine: this,
    characterSelectManager: this.characterSelectManager,
    audioManager: this.audioManager,
  })

  raycastManager = new RaycastManager({
    webaverseRenderer: this.webaverseRenderer,
    cameraManager: this.cameraManager,
    world: this.world,
    physicsTracker: this.physicsTracker,
  })
  ioManager      = new IoManager({
    engine: this,
    cameraManager: this.cameraManager,
    pointerLockManager: this.pointerLockManager,
    raycastManager: this.raycastManager,
    webaverseRenderer: this.webaverseRenderer,
    playersManager: this.playersManager,
    realmManager: this.realmManager,
  })
  partyManager   = new PartyManager({
    playersManager: this.playersManager,
    characterSelectManager: this.characterSelectManager,
    engine: this,
  })

  hitManager        = new HitManager({
    webaverseRenderer: this.webaverseRenderer,
    playersManager: this.playersManager,
    physicsTracker: this.physicsTracker,
    sounds: this.sounds,
  })
  npcManager        = new NpcManager({
    physicsTracker: this.physicsTracker,
    environmentManager: this.environmentManager,
    audioManager: this.audioManager,
    chatManager: this.chatManager,
    sounds: this.sounds,
    engine: this,
    characterSelectManager: this.characterSelectManager,
    hitManager: this.hitManager,
    npcRenderManager: this.npcRenderManager,
  })
  zTargetingManager = new ZTargetingManager({
    webaverseRenderer: this.webaverseRenderer,
    cameraManager: this.cameraManager,
    playersManager: this.playersManager,
    physicsTracker: this.physicsTracker,
    sounds: this.sounds,
  })
  mobManager        = new MobManager({
    // physicsTracker: this.physicsTracker,
    // environmentManager: this.environmentManager,
  })

  loadoutManager        = new LoadoutManager({
    webaverseRenderer: this.webaverseRenderer,
    playersManager: this.playersManager,
  })
  interactionManager    = new InteractionManager({
    cameraManager: this.cameraManager,
    playersManager: this.playersManager,
    realmManager: this.realmManager,
    ioManager: this.ioManager,
    webaverseRenderer: this.webaverseRenderer,
    physicsTracker: this.physicsTracker,
  })
  voices                = new Voices({
    playersManager: this.playersManager,
  })
  musicManager          = new MusicManager({
    audioManager: this.audioManager,
  })
  postProcessing        = new PostProcessing({
    webaverseRenderer: this.webaverseRenderer,
    cameraManager: this.cameraManager,
    playersManager: this.playersManager,
  })
  renderSettingsManager = new RenderSettingsManager({
    postProcessing: this.postProcessing,
  })
  backgroundFx          = new BackgroundFx()
  game                  = new GameManager({
    webaverseRenderer: this.webaverseRenderer,
    ioManager: this.ioManager,
    cameraManager: this.cameraManager,
    playersManager: this.playersManager,
    loadoutManager: this.loadoutManager,
    interactionManager: this.interactionManager,
    raycastManager: this.raycastManager,
    realmManager: this.realmManager,
    hitManager: this.hitManager,
    zTargetingManager: this.zTargetingManager,
  })
  dioramaManager        = new DioramaManager()

  constructor({
                dstCanvas,
              }) {
    super()

    this.dstCanvas = dstCanvas

    // if (++numWebaverseEngines > 1) {
    //   debugger;
    //   throw new Error('only one engine allowed');
    // }

    const _connectObjects = () => {
      const {scene} = this.webaverseRenderer

      scene.add(this.playersManager)
      this.playersManager.updateMatrixWorld()

      scene.add(this.npcManager)
      this.npcManager.updateMatrixWorld()

      scene.add(this.mobManager)
      this.mobManager.updateMatrixWorld()

      scene.add(this.zTargetingManager)
      this.zTargetingManager.updateMatrixWorld()

      scene.add(this.realmManager)
      this.realmManager.updateMatrixWorld()

      scene.add(this.interactionManager)
      this.interactionManager.updateMatrixWorld()
    }
    _connectObjects()

    const _bindCanvasEvents = () => {
      if ( this.dstCanvas ) {
        this.webaverseRenderer.bindCanvasEvents(this.dstCanvas)
      }
    }
    _bindCanvasEvents()

    // console.warn('story listen hack...');
    // story.listenHack();

    this.loadPromise   = (async () => {
      // let index = 0;
      // const totalWaitForLoadFunctions = 14;
      // let loadProgressPercentage = 0;

      /* const _updateLoadProgress = () => {
        loadProgressPercentage = Math.round((index++) / totalWaitForLoadFunctions * 100);

        this.dispatchEvent(new MessageEvent('loadProgress', {
          data: {
            loadProgressPercentage,
          },
        }));
        // console.log('loadProgressPercentage', loadProgressPercentage);
      } */

      // console.log('physx loading...')
      // physx needs to be loaded first, before everything else, otherwise we have a race condition
      // await physx.waitForLoad();
      // _updateLoadProgress();

      // console.log('metaversefileApi loading...')

      // console.log('game init...')
      // game.load();

      // call the waitForLoad functions and update the loading progress
      // we need to load them simultaneously
      await Promise.all([
        physx.waitForLoad(),
        Avatar.waitForLoad(),
        physxWorkerManager.waitForLoad(),
        this.sounds.waitForLoad(),
        this.voices.waitForLoad(),
        // this.backgroundFx.waitForLoad(),
        // this.musicManager.waitForLoad(),
      ])

      const _initializePlayer = async () => {
        await this.partyManager.initDefaultPlayer()
        await this.partyManager.inviteDefaultPlayer()
        this.loadoutManager.initDefault()
      }
      await _initializePlayer()

      const _initializeRealm = async () => {
        await this.realmManager.handleUrlUpdate()
      }
      await _initializeRealm()

      this.startLoop()

      this.setContentLoaded()
    })()
    this.contentLoaded = false
    // const self = this

    /* // Todo: global variable for e2e automatic tests
    window.globalWebaverse = {
      metaversefileApi,
      playersManager,
      npcManager,
      physicsManager,
      cameraManager,
      hpManager,
      universe,
      webaverse: self,
      world,
      game,
    }; */
  }

  /* connectCanvas(canvas) {
    // const canvas = document.createElement('canvas');

    // add the canvas to the engine container
    // document.body.appendChild(canvas);
    // this.bindCanvas(canvas);
  } */

  /* newApp() {
    return new App();
  } */
  async createAppAsync(spec) {
    return await this.importManager.createAppAsyncFromEngine(spec, this)
  }

  async waitForLoad() {
    if ( !this.loadPromise ) {
      this.loadPromise = async () => {
        await physx.waitForLoad()
        await Promise.all([
          Avatar.waitForLoad(),
          physxWorkerManager.waitForLoad(),
          sounds.waitForLoad(),
          // particleSystemManager.waitForLoad(),
          // transformControls.waitForLoad(),
          backgroundFx.waitForLoad(),
          voices.waitForLoad(),
          musicManager.waitForLoad(),
        ])
      }
    }
    await this.loadPromise()
  }

  /* getRenderer() {
    return getRenderer();
  }

  getScene() {
    return scene;
  }

  getSceneHighPriority() {
    return sceneHighPriority;
  }

  getSceneLowPriority() {
    return sceneLowPriority;
  }

  getCamera() {
    return camera;
  } */

  setContentLoaded() {
    this.contentLoaded = true
    this.dispatchEvent(new MessageEvent('loaded'))
  }

  // bindCanvas(c) {
  //   // bindCanvas(c);
  //   this.postProcessing.bindCanvas();
  // }

  async isXrSupported() {
    if ( navigator.xr ) {
      let ok = false
      try {
        ok = await navigator.xr.isSessionSupported(sessionMode)
      } catch (err) {
        console.warn(err)
      }
      return ok
    } else {
      return false
    }
  }

  async enterXr() {
    const renderer = getRenderer()
    const session  = renderer.xr.getSession()
    if ( session === null ) {
      let session = null
      try {
        session = await navigator.xr.requestSession(sessionMode, sessionOpts)
      } catch (err) {
        try {
          session = await navigator.xr.requestSession(sessionMode)
        } catch (err) {
          console.warn(err)
        }
      }
      if ( session ) {
        function onSessionEnded(e) {
          session.removeEventListener('end', onSessionEnded)
          renderer.xr.setSession(null)
        }

        session.addEventListener('end', onSessionEnded)
        renderer.xr.setSession(session)
        // renderer.xr.setReferenceSpaceType('local-floor');
      }
    } else {
      await session.end()
    }
  }

  render(timestamp, timeDiff) {
    // frameEvent.data.timestamp = timestamp;
    // frameEvent.data.timeDiff = timeDiff;
    // this.game.dispatchEvent(frameEvent);

    // const {
    //   composer,
    // } = this.webaverseRenderer;
    this.webaverseRenderer.composer.render()
  }

  startLoop() {
    // const renderer = getRenderer();
    const {renderer, camera} = this.webaverseRenderer
    if ( !renderer || !camera ) {
      throw new Error('must bind canvas first')
    }

    let lastTimestamp = performance.now()
    const animate     = (timestamp, frame) => {
      const _frame = () => {
        timestamp            = timestamp ?? performance.now()
        const timeDiff       = timestamp - lastTimestamp
        const timeDiffCapped = Math.min(Math.max(timeDiff, 0), 100)

        const _pre = () => {
          this.ioManager.update(timeDiffCapped)

          const physicsScene = physicsManager.getScene()
          if ( this.contentLoaded /* && physicsScene.getPhysicsEnabled() */ ) {
            physicsScene.simulatePhysics(timeDiffCapped)
            physicsScene.getTriggerEvents()
            // npcAiManager.update(timestamp, timeDiffCapped);
            // npcManager.updatePhysics(timestamp, timeDiffCapped);
          }

          this.playersManager.updateAvatars(timestamp, timeDiffCapped)
          this.npcManager.updateAvatars(timestamp, timeDiffCapped)
          // npcManager.updateAvatar(timestamp, timeDiffCapped);
          // this.playersManager.updateRemotePlayers(timestamp, timeDiffCapped);

          if ( this.contentLoaded ) {
            // // update app managers
            // // world
            // this.world.appManager.update(timestamp, timeDiffCapped);
            // this.playersManager.updateAppManagers(timestamp, timeDiffCapped);

            // update frame tracker
            this.frameTracker.update(timestamp, timeDiffCapped)
          }

          // transformControls.update();
          this.raycastManager.update(timestamp, timeDiffCapped)
          this.zTargetingManager.update(timestamp, timeDiffCapped)
          this.game.update(timestamp, timeDiffCapped)
          this.interactionManager.update(timestamp, timeDiffCapped)

          // const rootRealm = this.realmManager.getRootRealm();
          // rootRealm.appManager.tick(timestamp, timeDiffCapped, frame);

          // this.mobManager.update(timestamp, timeDiffCapped);
          // this.hpManager.update(timestamp, timeDiffCapped); // XXX unlock this
          // questManager.update(timestamp, timeDiffCapped);
          // particleSystemManager.update(timestamp, timeDiffCapped);

          this.cameraManager.updatePost(timestamp, timeDiffCapped)
          this.ioManager.updatePost()

          // this.game.pushAppUpdates();
          // this.game.pushPlayerUpdates();

          const session  = renderer.xr.getSession()
          const xrCamera = session ? renderer.xr.getCamera(camera) : camera
          localMatrix.multiplyMatrices(xrCamera.projectionMatrix, /* localMatrix2.multiplyMatrices( */xrCamera.matrixWorldInverse/*, physx.worldContainer.matrixWorld) */)
          localMatrix2.copy(xrCamera.matrix)
            .premultiply(camera.matrix)
            .decompose(localVector, localQuaternion, localVector2)

          lastTimestamp = timestamp
        }
        _pre()

        // render scenes
        this.dioramaManager.update(timestamp, timeDiffCapped)
        this.loadoutManager.update(timestamp, timeDiffCapped)

        {
          const popRenderSettings = this.renderSettingsManager.push(
            this.webaverseRenderer.rootScene,
            undefined,
            {
              postProcessing: this.postProcessing,
            },
          )

          this.npcRenderManager.render(this.webaverseRenderer.rootScene, this.npcManager.smartNpcs)

          this.render(timestamp, timeDiffCapped)
          {
            const {
                    dstCanvas,
                  } = this
            if ( dstCanvas ) {
              this.webaverseRenderer.transferToCanvas(dstCanvas)
            }
          }

          popRenderSettings()
        }
      }
      _frame()

    }
    renderer.setAnimationLoop(animate)

    // _startHacks(this);
  }
}

/* const _startHacks = webaverse => {
  const localPlayer = playersManager.getLocalPlayer();
  const vpdAnimations = Avatar.getAnimations().filter(animation => animation.name.endsWith('.vpd'));

  // Press } to debug current state in console.
  (typeof window !== 'undefined') && window.addEventListener('keydown', event => {
    if (event.key === '}') {
      console.log('>>>>> current state');
      console.log(universe.state);
      console.log('>>>>> scene');
      console.log(scene);
      console.log('>>>>> local player');
      console.log(localPlayer);
      console.log('>>>>> remote players');
      console.log(playersManager.getRemotePlayers());
    }
  });

  const lastEmotionKey = {
    key: -1,
    timestamp: 0,
  };
  let emotionIndex = -1;
  let poseAnimationIndex = -1;
  const _emotionKey = key => {
    const timestamp = performance.now();
    if ((timestamp - lastEmotionKey.timestamp) < 1000) {
      const key1 = lastEmotionKey.key;
      const key2 = key;
      emotionIndex = (key1 * 10) + key2;

      lastEmotionKey.key = -1;
      lastEmotionKey.timestamp = 0;
    } else {
      lastEmotionKey.key = key;
      lastEmotionKey.timestamp = timestamp;
    }
  };
  const _updateFacePose = () => {
    const oldFacePoseActionIndex = localPlayer.findActionIndex(action => action.type === 'facepose' && /^emotion-/.test(action.emotion));
    if (oldFacePoseActionIndex !== -1) {
      localPlayer.removeActionIndex(oldFacePoseActionIndex);
    }
    if (emotionIndex !== -1) {
      const emoteAction = {
        type: 'facepose',
        emotion: `emotion-${emotionIndex}`,
        value: 1,
      };
      localPlayer.addAction(emoteAction);
    }
  };
  const _updatePose = () => {
    localPlayer.removeAction('pose');
    if (poseAnimationIndex !== -1) {
      const animation = vpdAnimations[poseAnimationIndex];
      const poseAction = {
        type: 'pose',
        animation: animation.name,
      };
      localPlayer.addAction(poseAction);
    }
  };
  webaverse.titleCardHack = false;
  // let haloMeshApp = null;
  (typeof window !== 'undefined') && window.addEventListener('keydown', e => {
    if (e.which === 46) { // .
      emotionIndex = -1;
      _updateFacePose();
    } else if (e.which === 107) { // +
      poseAnimationIndex++;
      poseAnimationIndex = Math.min(Math.max(poseAnimationIndex, -1), vpdAnimations.length - 1);
      _updatePose();

      // _ensureMikuModel();
      // _updateMikuModel();
    } else if (e.which === 109) { // -
      poseAnimationIndex--;
      poseAnimationIndex = Math.min(Math.max(poseAnimationIndex, -1), vpdAnimations.length - 1);
      _updatePose();

      // _ensureMikuModel();
      // _updateMikuModel();
    } else if (e.which === 106) { // *
      webaverse.titleCardHack = !webaverse.titleCardHack;
      webaverse.dispatchEvent(new MessageEvent('titlecardhackchange', {
        data: {
          titleCardHack: webaverse.titleCardHack,
        },
      }));
    } else if (e.code === 'Home') { // home
      const quality = settingsManager.adjustCharacterQuality(-1);
      game.setAvatarQuality(quality);
    } else if (e.code === 'End') { // end
      const quality = settingsManager.adjustCharacterQuality(1);
      game.setAvatarQuality(quality);
    } else {
      const match = e.code.match(/^Numpad([0-9])$/);
      if (match) {
        const key = parseInt(match[1], 10);
        _emotionKey(key);
        _updateFacePose();
      }
    }
  });
}; */
