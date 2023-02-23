/*
this file contains the main game logic tying together the managers.
general game logic goes here.
usually, code starts here and is migrated to an appropriate manager.
*/

import * as THREE from 'three';
// import physx from './physics/physx.js';
import avatarsWasmManager from './avatars/avatars-wasm-manager.js';
// import cameraManager from './camera-manager.js';
// import {
//   CameraManager,
// } from './camera-manager.js';
// import ioManager from './io-manager.js';
// import {
//   IoManager,
// } from './io-manager.js';
import {
  DioramaManager,
} from './diorama/diorama-manager.js';
// import {world} from './world.js';
import {buildMaterial, highlightMaterial, selectMaterial, hoverMaterial, hoverEquipmentMaterial} from './shaders.js';
// import {getRenderer, sceneLowPriority, camera} from './renderer.js';
import {downloadFile, getDropUrl, handleDropJsonItem, makeId} from './util.js';
import {throwReleaseTime, throwAnimationDuration, walkSpeed, crouchSpeed, flySpeed, IS_NARUTO_RUN_ENABLED, gliderSpeed, IS_FLYING_ENABLED} from './constants.js';
// import metaversefileApi from 'metaversefile';
import * as sounds from './sounds.js';
// import {partyManager} from './party-manager.js';
// import {
//   PartyManager,
// } from './party-manager.js';
// import physicsManager from './physics/physics-manager.js';
// import raycastManager from './raycast-manager.js';
// import {
//   RaycastManager,
// } from './raycast-manager.js';
// import Avatar from './avatars/avatars.js';
// import {
//   AvatarManager,
// } from './avatar-manager.js';
// import {
//   PlayersManager,
// } from './players-manager.js';
// import {
//   NpcManager,
// } from './npc-manager.js';
// import {
//   InteractionManager,
// } from './interaction-manager.js';
// import avatarsWasmManager from './avatars/avatars-wasm-manager.js';
import {scenesBaseUrl, defaultSceneName} from './endpoints.js';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();
const localRay = new THREE.Ray();

//

const zeroVector = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);
const identityQuaternion = new THREE.Quaternion();

//

const hitRadius = 1;
const hitHeight = 0.2;
const hitHalfHeight = hitHeight * 0.5;
const hitboxOffsetDistance = 0.3;
const swordComboAnimationDuration = 600;

//

export class GameManager extends EventTarget {
  menuOpen = 0;
  gridSnap = 0;
  editMode = false;
  contextMenu = false;
  contextMenuObject = null;
  inventoryHack = false;
  closestObject = null;
  usableObject = null;
  hoverEnabled = false;
  lastFirstPerson = false;
  lastActivated = false;
  lastThrowing = false;
  grabUseMesh = null;
  isMouseUp = false;
  lastUseIndex = 0;

  highlightedPhysicsObject = null;
  highlightedPhysicsId = 0;
  mouseHoverObject = null;
  mouseHoverPhysicsId = 0;
  mouseHoverPosition = null;
  mouseSelectedObject = null;
  mouseSelectedPhysicsId = 0;
  mouseSelectedPosition = null;
  mouseDomHoverObject = null;
  mouseDomHoverPhysicsId = 0;
  mouseDomEquipmentHoverObject = null;
  mouseDomEquipmentHoverPhysicsId = 0;

  dioramaManager = new DioramaManager();

  constructor({
    webaverseRenderer,
    ioManager,
    cameraManager,
    playersManager,
    loadoutManager,
    raycastManager,
    interactionManager,
    realmManager,
    hitManager,
    zTargetingManager,
  }) {
    super();

    // members
    if (!webaverseRenderer || !ioManager || !cameraManager || !playersManager || !loadoutManager || !raycastManager || !interactionManager || !realmManager || !hitManager || !zTargetingManager) {
      console.warn('missing arguments', {
        webaverseRenderer,
        ioManager,
        cameraManager,
        playersManager,
        loadoutManager,
        raycastManager,
        interactionManager,
        realmManager,
        hitManager,
        zTargetingManager,
      });
      throw new Error('missing required arguments');
    }
    this.webaverseRenderer = webaverseRenderer;
    this.ioManager = ioManager;
    this.cameraManager = cameraManager;
    this.playersManager = playersManager;
    this.loadoutManager = loadoutManager;
    this.raycastManager = raycastManager;
    this.interactionManager = interactionManager;
    this.realmManager = realmManager;
    this.hitManager = hitManager;
    this.zTargetingManager = zTargetingManager;

    // locals
    this.lastFirstPerson = this.cameraManager.getMode() === 'firstperson';

    // initialize
    this.bindEvents();
    this.setFirstPersonAction(this.lastFirstPerson);
    this.bindPointerLock();
    this.registerHighlightMeshes();
  }

  registerHighlightMeshes() {
    this.highlightPhysicsMesh = this.makeHighlightPhysicsMesh(buildMaterial);
    // this.interactionManager.setHighlightPhysicsMesh(this.highlightPhysicsMesh);

    this.mouseHighlightPhysicsMesh = this.makeHighlightPhysicsMesh(highlightMaterial);
    this.mouseHighlightPhysicsMesh.visible = false;
    this.webaverseRenderer.sceneLowPriority.add(this.mouseHighlightPhysicsMesh);

    this.mouseSelectPhysicsMesh = this.makeHighlightPhysicsMesh(selectMaterial);
    this.mouseSelectPhysicsMesh.visible = false;
    this.webaverseRenderer.sceneLowPriority.add(this.mouseSelectPhysicsMesh);

    this.mouseDomHoverPhysicsMesh = this.makeHighlightPhysicsMesh(hoverMaterial);
    this.mouseDomHoverPhysicsMesh.visible = false;
    this.webaverseRenderer.sceneLowPriority.add(this.mouseDomHoverPhysicsMesh);

    this.mouseDomEquipmentHoverPhysicsMesh = this.makeHighlightPhysicsMesh(hoverEquipmentMaterial);
    this.mouseDomEquipmentHoverPhysicsMesh.visible = false;
    this.webaverseRenderer.sceneLowPriority.add(this.mouseDomEquipmentHoverPhysicsMesh);
  }

  // load() {
  //   this.grabUseMesh = metaversefileApi.createApp();
  //   (async () => {
  //     const {importModule} = metaversefileApi.useDefaultModules();
  //     const m = await importModule('button');
  //     await this.grabUseMesh.addModule(m);
  //   })();
  //   this.grabUseMesh.targetApp = null;
  //   this.grabUseMesh.targetPhysicsId = -1;
  //   sceneLowPriority.add(this.grabUseMesh);
  // };

  delete() {
    if (this.mouseSelectedObject) {
      world.appManager.removeTrackedApp(this.mouseSelectedObject.instanceId);

      if (this.mouseHoverObject === this.mouseSelectedObject) {
        this.setMouseHoverObject(null);
      }
      this.setMouseSelectedObject(null);
    }
  }

  getNextUseIndex = animationCombo => {
    if (Array.isArray(animationCombo)) {
      return (this.lastUseIndex++) % animationCombo.length;
    } else {
      return 0;
    }
  }

  startUse() {
    const localPlayer = this.playersManager.getLocalPlayer();
    const wearApp = this.loadoutManager.getSelectedApp();
    const storyAction = localPlayer.actionManager.getActionType('story');
    if (wearApp && !storyAction) {
      const useComponent = wearApp.getComponent('use');
      if (useComponent) {
        const useAction = localPlayer.actionManager.getActionType('use');
        if (!useAction) {
          const {instanceId} = wearApp;
          const {boneAttachment, animation, animationCombo, animationEnvelope, ik, behavior, position, quaternion, scale} = useComponent;
          const index = this.getNextUseIndex(animationCombo);
          const newUseAction = {
            type: 'use',
            instanceId,
            animation,
            animationCombo,
            animationEnvelope,
            ik,
            behavior,
            boneAttachment,
            index,
            position,
            quaternion,
            scale,
          };
          localPlayer.actionManager.addAction(newUseAction);

          wearApp.use();
        }
      }
    }
  };

  endUse() {
    const localPlayer = this.playersManager.getLocalPlayer();
    const useAction = localPlayer.actionManager.getActionType('use');
    if (useAction) {
      const app = localPlayer.appManager.getAppByInstanceId(useAction.instanceId);
      app.dispatchEvent({
        type: 'use',
        use: false,
      });
      localPlayer.actionManager.removeActionType('use');
    }
  };

  mousedown() {
    this.startUse();
  };

  mouseup() {
    this.isMouseUp = true;
  };

  /* unwearAppIfHasSitComponent(player) {
    const wearActions = player.getActionsByType('wear');
    for (const wearAction of wearActions) {
      const instanceId = wearAction.instanceId;
      const app = metaversefileApi.getAppByInstanceId(instanceId);
      const hasSitComponent = app.hasComponent('sit');
      if (hasSitComponent) {
        app.unwear();
      }
    }
  } */

  getCurrentGrabAnimation() {
    let currentAnimation = '';
    const localPlayer = this.playersManager.getLocalPlayer();

    const {targetApp} = this.interactionManager.physicsTarget;

    const wearComponent = targetApp.getComponent('wear');
    if (wearComponent && wearComponent.grabAnimation === 'pick_up') {
      currentAnimation = wearComponent.grabAnimation;
    } else {
      const targetAppPosition = targetApp.position;
      let currentDistance = 100;

      // Forward
      {
        localVector.set(0, -0.5, -0.5).applyQuaternion(localPlayer.quaternion)
          .add(localPlayer.position);
        const distance = targetAppPosition.distanceTo(localVector);
        currentDistance = distance;
        currentAnimation = 'grab_forward';
      }

      // Down
      {
        localVector.set(0, -1.2, -0.5).applyQuaternion(localPlayer.quaternion)
          .add(localPlayer.position);
        const distance = targetAppPosition.distanceTo(localVector);
        if (distance < currentDistance) {
          currentDistance = distance;
          currentAnimation = 'grab_down';
        }
      }

      // Up
      {
        localVector.set(0, 0.0, -0.5).applyQuaternion(localPlayer.quaternion)
          .add(localPlayer.position);
        const distance = targetAppPosition.distanceTo(localVector);
        if (distance < currentDistance) {
          currentDistance = distance;
          currentAnimation = 'grab_up';
        }
      }

      // Left
      {
        localVector.set(-0.8, -0.5, -0.5).applyQuaternion(localPlayer.quaternion)
          .add(localPlayer.position);
        const distance = targetAppPosition.distanceTo(localVector);
        if (distance < currentDistance) {
          currentDistance = distance;
          currentAnimation = 'grab_left';
        }
      }

      // Right
      {
        localVector.set(0.8, -0.5, -0.5).applyQuaternion(localPlayer.quaternion)
          .add(localPlayer.position);
        const distance = targetAppPosition.distanceTo(localVector);
        if (distance < currentDistance) {
          currentDistance = distance;
          currentAnimation = 'grab_right';
        }
      }
    }

    return currentAnimation;
  };

  makeHighlightPhysicsMesh(material) {
    const geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    material = material.clone();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.physicsId = 0;
    return mesh;
  };

  setFirstPersonAction(firstPerson) {
    const localPlayer = this.playersManager.getLocalPlayer();
    if (firstPerson) {
      // if (!localPlayer.actionManager) {
      //   debugger;
      // }
      if (!localPlayer.actionManager.hasActionType('firstperson')) {
        const aimAction = {
          type: 'firstperson',
        };
        localPlayer.actionManager.addAction(aimAction);
      }
    } else {
      localPlayer.actionManager.removeActionType('firstperson');
    }
  };

  bindPointerLock() {
    this.cameraManager.addEventListener('pointerlockchange', e => {
      const {pointerLockElement} = e.data;

      this.setMouseHoverObject(null);
      if (!pointerLockElement) {
        this.editMode = false;
      }
    });
  };

  getMenu() {
    return this.menuOpen;
  }

  setContextMenu(contextMenu) {
    this.contextMenu = contextMenu;
  }

  getContextMenuObject() {
    return this.contextMenuObject;
  }

  setContextMenuObject(contextMenuObject) {
    this.contextMenuObject = contextMenuObject;
  }

  menuDelete() {
    this.delete();
  }

  menuClick(e) {
    this.click(e);
  }

  menuMouseDown() {
    this.mousedown();
  }

  menuMouseUp() {
    this.mouseup();
  }

  menuAim() {
    const localPlayer = this.playersManager.getLocalPlayer();
    if (!localPlayer.actionManager.hasActionType('aim')) {
      const wearApp = this.loadoutManager.getSelectedApp();
      const wearAimApp = (() => {
        if (wearApp) {
          const aimComponent = wearApp.getComponent('aim');
          if (aimComponent) {
            return wearApp;
          }
        }
        return null;
      })();
      const wearAimComponent = wearAimApp?.getComponent('aim');

      const {instanceId} = wearAimApp ?? {};
      const {appAnimation, characterAnimation, boneAttachment, position, quaternion, scale} = wearAimComponent ?? {};
      const aimAction = {
        type: 'aim',
        instanceId,
        appAnimation,
        characterAnimation,
        boneAttachment,
        position,
        quaternion,
        scale,
      };
      localPlayer.actionManager.addAction(aimAction);
    }
  }

  menuUnaim() {
    const localPlayer = this.playersManager.getLocalPlayer();
    const aimAction = localPlayer.actionManager.getActionType('aim');
    if (aimAction) {
      localPlayer.actionManager.removeActionType('aim');
    }
  }

  menuMiddleDown() {
  }

  menuMiddle() {
    // nothing
  }

  menuMiddleUp() {
  }

  menuMiddleToggle() {
    this.zTargetingManager.toggle();
  }
  menuMiddleRelease() {
    this.zTargetingManager.release();
  }

  menuDragdownRight(e) {
    // nothing
  }

  menuDragRight(e) {
    // nothing
  }

  menuDragupRight() {
    // nothing
  }

  inputFocused() {
    return !!document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.nodeName);
  }

  #getPlayerDropStartPosition(player, target) {
    const heightOffset = player.avatar ? -player.avatar.height / 2 : -0.5;
    const avatarQuaternion = player.avatar ?
      player.quaternion
    :
      identityQuaternion;
    const dropStartPosition = target.copy(player.position);
    localVector.set(0, heightOffset, -0.5)
      .applyQuaternion(avatarQuaternion);
    dropStartPosition.add(localVector);
    return dropStartPosition;
  }
  dropSelectedApp() {
    const app = this.loadoutManager.getSelectedApp();
    if (app) {
      const localPlayer = this.playersManager.getLocalPlayer();
      const dropStartPosition = this.#getPlayerDropStartPosition(localPlayer, new THREE.Vector3());
      const dropDirection = localVector2.set(0, 0, -1)
        .applyQuaternion(localPlayer.quaternion);
      
      localPlayer.unwear(app, {
        dropStartPosition,
        dropDirection,
      });
      this.endUse();
    }
  }

  deleteSelectedApp() {
    if (this.selectedIndex !== -1) {
      const app = this.loadoutManager.getSelectedApp();
      if (app) {
        const localPlayer = this.playersManager.getLocalPlayer();
        localPlayer.unwear(app, {
          destroy: true,
        });
      }
    }
  }

  menuVDown() {
    const localPlayer = this.playersManager.getLocalPlayer();
    if (this.interactionManager.getGrabbedObject(0)) {
      this.interactionManager.menuGridSnap();
    } else {
      localPlayer.actionManager.removeActionType('dance');

      const newAction = {
        type: 'dance',
        animation: 'dansu',
      };
      localPlayer.actionManager.addAction(newAction);
    }
  }

  menuVUp() {
    const localPlayer = this.playersManager.getLocalPlayer();
    localPlayer.actionManager.removeActionType('dance');
  }

  menuBDown() {
    const localPlayer = this.playersManager.getLocalPlayer();
    const sssAction = localPlayer.actionManager.getActionType('sss');
    if (!sssAction) {
      const newSssAction = {
        type: 'sss',
      };
      localPlayer.actionManager.addAction(newSssAction);

      sounds.playSoundName('limitBreak');

      localPlayer.actionManager.removeActionType('dance');
      const newDanceAction = {
        type: 'dance',
        animation: 'powerup',
      };
      localPlayer.actionManager.addAction(newDanceAction);
    } else {
      localPlayer.actionManager.removeActionType('sss');
      localPlayer.actionManager.removeActionType('dance');
    }
  }

  menuBUp() {
    const localPlayer = this.playersManager.getLocalPlayer();
    localPlayer.actionManager.removeActionType('dance');
  }

  menuDoubleTap() {
    if(IS_NARUTO_RUN_ENABLED) {
      const localPlayer = this.playersManager.getLocalPlayer();
      if (!localPlayer.actionManager.hasActionType('narutoRun')) {
        const newNarutoRunAction = {type: 'narutoRun'};
        localPlayer.actionManager.addAction(newNarutoRunAction);
      }
    }
  }

  menuUnDoubleTap() {
    if(IS_NARUTO_RUN_ENABLED) {
      const localPlayer = this.playersManager.getLocalPlayer();
      localPlayer.actionManager.removeActionType('narutoRun');
    }
  }

  menuSwitchCharacter() {
    const switched = partyManager.switchCharacter();
    if (switched) {
      sounds.playSoundName('menuReady');
    }
  }

  worldClear() {
    const rootRealm = this.realmManager.getRootRealm();
    rootRealm.appManager.clear();
  }
  async worldOpen() {
    const rootRealm = this.realmManager.getRootRealm();
    rootRealm.appManager.clear();
    const scnSrc = scenesBaseUrl + defaultSceneName;
    console.log('load scn', scnSrc);
    await rootRealm.appManager.loadScnFromUrl(scnSrc);
  }

  async equipTest() {
    // console.log('equip test');
    const localPlayer = this.playersManager.getLocalPlayer();
    const app = await this.dropTest();
    localPlayer.wear(app);
  }
  async dropTest() {
    // console.log('drop test');
    const contentId = 'https://webaverse.github.io/sword/';
    const localPlayer = this.playersManager.getLocalPlayer();
    const position = this.#getPlayerDropStartPosition(localPlayer, new THREE.Vector3());
    const {quaternion} = localPlayer;
    // console.log('add app', {
    //   position,
    //   quaternion,
    // });
    const rootRealm = this.realmManager.getRootRealm();
    const app = await rootRealm.appManager.addAppAsync({
      contentId,
      position,
      quaternion,
    });
    return app;
  }

  isGlidering() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.actionManager.hasActionType('glider');
  }

  isFlying() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.actionManager.hasActionType('fly');
  }

  toggleMic() {
    const localPlayer = this.playersManager.getLocalPlayer();
    console.log('toggle voice', localPlayer);
    localPlayer.toggleMic();
  }
  toggleSpeech() {
    const localPlayer = this.playersManager.getLocalPlayer();
    console.log('toggle speech', localPlayer);
    localPlayer.toggleSpeech();
  }

  toggleFly() {
    if(IS_FLYING_ENABLED) {
      const localPlayer = this.playersManager.getLocalPlayer();
      if (localPlayer.actionManager.hasActionType('fly')) {
        localPlayer.actionManager.removeActionType('fly', true);
      } else {
        const newFlyAction = {type: 'fly'};
        localPlayer.actionManager.addAction(newFlyAction, true);
        localPlayer.actionManager.hasActionType('jump') &&
          localPlayer.actionManager.removeActionType('jump');
        localPlayer.actionManager.hasActionType('doubleJump') &&
          localPlayer.actionManager.removeActionType('doubleJump');
        localPlayer.actionManager.hasActionType('fallLoop') &&
          localPlayer.actionManager.removeActionType('fallLoop');
      }
    }
  }

  isCrouched() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.actionManager.hasActionType('crouch');
  }

  isSwimming() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.actionManager.hasActionType('swim');
  }

  toggleCrouch() {
    const localPlayer = this.playersManager.getLocalPlayer();
    if (localPlayer.actionManager.hasActionType('crouch')) {
      localPlayer.actionManager.removeActionType('crouch');
    } else {
      const newCrouchAction = {type: 'crouch'};
      localPlayer.actionManager.addAction(newCrouchAction);
    }
  }

  async handleDropJsonItemToPlayer(item, index) {
    const u = await handleDropJsonItem(item);
    return await this.handleDropUrlToPlayer(u, index);
  }

  async handleDropJsonToPlayer(j, index) {
    const localPlayer = this.playersManager.getLocalPlayer();
    localVector.copy(localPlayer.position);
    if (localPlayer.avatar) {
      localVector.y -= localPlayer.avatar.height;
    }
    const u = getDropUrl(j);
    return await this.handleDropUrlToPlayer(u, index, localVector);
  }

  async handleDropUrlToPlayer(u, index, position) {
    const app = await metaversefileApi.createAppAsync({
      start_url: u,
      position: position,
    });
    app.instanceId = makeId(5);
    const rootRealm = this.realmManager.getRootRealm();
    rootRealm.appManager.importApp(app);
    app.activate();
  }

  async handleDropJsonForDrop(object, currentAddress, WebaversecontractAddress, afterDrop = f => f) { // currentAddress = walletaddress, WebaversecontractAddress= signaddress
    const localPlayer = this.playersManager.getLocalPlayer();
    localVector.copy(localPlayer.position);
    if (localPlayer.avatar) {
      localVector.y -= localPlayer.avatar.height;
    }

    const position = localPlayer.position
      .clone()
      .add(new THREE.Vector3(0, 0, -1).applyQuaternion(localPlayer.quaternion));
    const quaternion = localPlayer.quaternion;

    const newObject = {...object}
    if (newObject && newObject.voucher === undefined) {
      console.error('no voucher')
      // const {voucher, expiry} = await getVoucherFromUser(newObject.tokenId, currentAddress, WebaversecontractAddress)
      // if (voucher.signature !== undefined) {
      //   newObject.voucher = voucher
      //   // add blacklist and time counter add
      //   afterDrop(true)
      // }
    } else {
        afterDrop(false)
    }

    const velocity = localVector.set(0, 0, -1).applyQuaternion(localPlayer.quaternion)
    .normalize()
    .multiplyScalar(2.5);
    const rootRealm = this.realmManager.getRootRealm();
    rootRealm.appManager.importAddedUserVoucherApp(position, quaternion, newObject, velocity);
  }

  async handleDropJsonForSpawn(handleDropJsonForSpawn) { // currentAddress = walletaddress, WebaversecontractAddress= signaddress
    debugger;
    const localPlayer = this.playersManager.getLocalPlayer();
    localVector.copy(localPlayer.position);
    if (localPlayer.avatar) {
      localVector.y -= localPlayer.avatar.height;
    }
    // console.log("localvector", localVector)

    const u = getDropUrl(handleDropJsonForSpawn);
    const app = await metaversefileApi.createAppAsync({
      start_url: u,
      localVector,
    });
    const position = localPlayer.position
      .clone()
      .add(new THREE.Vector3(0, 0, -2).applyQuaternion(localPlayer.quaternion));
    const quaternion = localPlayer.quaternion;

    app.position.copy(position);
    app.quaternion.copy(quaternion);
    app.instanceId = makeId(5);
    app.updateMatrixWorld();
    const rootRealm = this.realmManager.getRootRealm();
    rootRealm.appManager.importApp(app);
  }

  selectLoadout(index) {
    this.loadoutManager.setSelectedIndex(index);
  }

  canToggleAxis() {
    return false;
  }

  toggleAxis() {
    console.log('toggle axis');
  }

  isJumping() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.actionManager.hasActionType('jump');
  }

  isDoubleJumping() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.actionManager.hasActionType('doubleJump');
  }

  jump() {
    // console.log('jump()');
    const localPlayer = this.playersManager.getLocalPlayer();

    if (
      !localPlayer.actionManager.hasActionType('jump') &&
      !localPlayer.actionManager.hasActionType('fly') &&
      !localPlayer.actionManager.hasActionType('fallLoop') &&
      !localPlayer.actionManager.hasActionType('swim')
    ) {
      const newJumpAction = {
        type: 'jump',
        startPositionY: localPlayer.characterPhysics.characterController.position.y,
      }
      localPlayer.actionManager.addAction(newJumpAction);
    }
  }

  doubleJump() {
    const localPlayer = this.playersManager.getLocalPlayer();
    const newDoubleJumpAction = {
      type: 'doubleJump',
      startPositionY: localPlayer.characterPhysics.characterController.position.y,
    };
    localPlayer.actionManager.addAction(newDoubleJumpAction);
  }

  isSkydiving() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.actionManager.hasActionType('skydive');
  }

  isGlidering() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.actionManager.hasActionType('glider');
  }

  glider() {
    const localPlayer = this.playersManager.getLocalPlayer();
    const newGliderAction = {
      type: 'glider',
    }
    localPlayer.actionManager.addAction(newGliderAction);
    localPlayer.actionManager.removeActionType('fallLoop');
    localPlayer.actionManager.removeActionType('skydive');
  }

  unglider() {
    const localPlayer = this.playersManager.getLocalPlayer();
      localPlayer.actionManager.removeActionType('glider');
  }

  isMovingBackward() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.avatar?.direction.z > 0.1; // If check > 0 will cause glitch when move left/right;
  }

  isAiming() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.actionManager.hasActionType('aim');
  }

  isSitting() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.actionManager.hasActionType('sit');
  }

  isGrounded() {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.characterPhysics.lastGrounded;
  }

  getMouseHoverObject() {
    return this.mouseHoverObject;
  }

  getMouseHoverPhysicsId() {
    return this.mouseHoverPhysicsId;
  }

  getMouseHoverPosition() {
    return this.mouseHoverPosition;
  }

  setHoverEnabled(hoverEnabled) {
    this.hoverEnabled = hoverEnabled;
  }

  setMouseHoverObject(o, physicsId, position) { // XXX must be triggered
    this.mouseHoverObject = o;
    this.mouseHoverPhysicsId = physicsId;
    if (this.mouseHoverObject && position) {
      this.mouseHoverPosition = position.clone();
    } else {
      this.mouseHoverPosition = null;
    }

    const rootRealm = this.realmManager.getRootRealm();
    rootRealm.appManager.dispatchEvent(new MessageEvent('hoverchange', {
      data: {
        app: this.mouseHoverObject,
        physicsId: this.mouseHoverPhysicsId,
        position: this.mouseHoverPosition,
      },
    }));
  }

  getMouseSelectedObject() {
    return this.mouseSelectedObject;
  }

  getMouseSelectedPhysicsId() {
    return this.mouseSelectedPhysicsId;
  }

  getMouseSelectedPosition() {
    return this.mouseSelectedPosition;
  }

  setMouseSelectedObject(o, physicsId, position) {
    this.mouseSelectedObject = o;
    this.mouseSelectedPhysicsId = physicsId;
    if (this.mouseSelectedObject && position) {
      this.mouseSelectedPosition = position.clone();
    } else {
      this.mouseSelectedPosition = null;
    }

    const rootRealm = this.realmManager.getRootRealm();
    rootRealm.appManager.dispatchEvent(new MessageEvent('selectchange', {
      data: {
        app: this.mouseSelectedObject,
        physicsId: this.mouseSelectedPhysicsId,
        position: this.mouseSelectedPosition,
      },
    }));
  }

  getMouseDomHoverObject() {
    return this.mouseDomHoverObject;
  }

  setMouseDomHoverObject(o, physicsId) {
    this.mouseDomHoverObject = o;
    this.mouseDomHoverPhysicsId = physicsId;
  }

  getMouseDomEquipmentHoverObject() {
    return this.mouseDomEquipmentHoverObject;
  }

  setMouseDomEquipmentHoverObject(o, physicsId) {
    this.mouseDomEquipmentHoverObject = o;
    this.mouseDomEquipmentHoverPhysicsId = physicsId;
  }

  setMovements() {
    const localPlayer = this.playersManager.getLocalPlayer();
    if (
      this.ioManager.keys.up ||
      this.ioManager.keys.down ||
      this.ioManager.keys.left ||
      this.ioManager.keys.right
    ) {
      if (!localPlayer.actionManager.hasActionType('movements')) {
        localPlayer.actionManager.addAction({type: 'movements'});
      }
    } else {
      localPlayer.actionManager.removeActionType('movements');
    }
  }

  setSprint(bool) {
    const localPlayer = this.playersManager.getLocalPlayer();
    if (bool) {
      if (!localPlayer.actionManager.hasActionType('sprint')) { // note: prevent holding shift switch browser page.
        localPlayer.actionManager.addAction({type: 'sprint'});
      }
    } else {
      localPlayer.actionManager.removeActionType('sprint');
    }
  }

  getSpeed() {
    let speed = 0;

    const isCrouched = this.isCrouched();
    const isSwimming = this.isSwimming();
    const isFlying = this.isFlying();
    const isRunning = this.ioManager.keys.shift && !isCrouched;
    const isMovingBackward = this.isMovingBackward();
    if (isCrouched && !isMovingBackward) {
      speed = crouchSpeed;
    } else if (this.isFlying()) {
      speed = flySpeed;
    } else if (this.isGlidering()) {
      speed = gliderSpeed;
    } else {
      speed = walkSpeed;
    }
    const localPlayer = this.playersManager.getLocalPlayer();
    const sprintMultiplier = isRunning ?
      (localPlayer.actionManager.hasActionType('narutoRun') ? 20 : 3)
      :
      ((isSwimming && !isFlying) ? 5 - localPlayer.actionManager.getActionType('swim').swimDamping : 1);
    speed *= sprintMultiplier;

    const backwardMultiplier = isMovingBackward ? (isRunning ? 0.8 : 0.7) : 1;
    speed *= backwardMultiplier;

    return speed;
  }

  getClosestObject() {
    return this.closestObject;
  }

  getUsableObject() {
    return this.usableObject;
  }

  menuActivateDown() {
    if (this.interactionManager.canUse()) {
      const localPlayer = this.playersManager.getLocalPlayer();
      const activateAction = localPlayer.actionManager.getActionType('activate');
      if (!activateAction) {
        const animationName = this.getCurrentGrabAnimation();
        const newActivateAction = {
          type: 'activate',
          animationName,
        };
        localPlayer.actionManager.addAction(newActivateAction);
      }
    }
  }

  menuActivateUp() {
    const localPlayer = this.playersManager.getLocalPlayer();
    if (localPlayer.actionManager.hasActionType('activate')) {
      localPlayer.actionManager.removeActionType('activate');
    }
  }

  setAvatarQuality(quality) {
    const applySettingToApp = app => {
      const player = this.npcManager.getNpcByApp(app);
      if (player && player.avatar) {
        player.avatar.setQuality(quality);
      } else if (app.appType === 'vrm' && app.avatarRenderer) {
        app.avatarRenderer.setQuality(quality);
      }
    };

    // local party members
    const localPlayer = this.playersManager.getLocalPlayer();
    for (const app of localPlayer.appManager.apps) {
      applySettingToApp(app);
    }

    // remote players
    for (const remotePlayer in this.playersManager.getRemotePlayers()) {
      for (const app of remotePlayer.appManager.apps) {
        applySettingToApp(app);
      }
    }

    const rootRealm = this.realmManager.getRootRealm();
    for (const app of rootRealm.appManager.apps) {
      applySettingToApp(app);
    }
  }

  #playerDiorama = null;
  bindEvents() {
    const playerSelectedFn = e => {
      const {
        player,
      } = e.data;

      const playerDiorama = this.getPlayerDiorama();
      const localPlayer = player;
      playerDiorama.setTarget(localPlayer);
      playerDiorama.setObjects([
        localPlayer.avatar.avatarRenderer.scene,
      ]);
    };
    this.playersManager.addEventListener('playerchange', playerSelectedFn);

    this.playersManager.addEventListener('avatarchange', e => {
      const playerDiorama = this.getPlayerDiorama();
      const localPlayer = this.playersManager.getLocalPlayer();
      playerDiorama.setTarget(localPlayer);
      playerDiorama.setObjects([
        e.data.avatar.avatarRenderer.scene,
      ]);
    });
  }

  getPlayerDiorama(outline, background) {
    if (!this.#playerDiorama) {
      this.#playerDiorama = this.dioramaManager.createPlayerDiorama({
        outline: !!outline,
	      grassBackground: !!background,
      });
    }
    return this.#playerDiorama;
  }

  async setVoicePack(voicePack) {
    const localPlayer = metaversefileApi.useLocalPlayer();
    return await localPlayer.setVoicePack(voicePack);
  }

  setVoiceEndpoint(voiceId) {
    const localPlayer = this.playersManager.getLocalPlayer();
    return localPlayer.setVoiceEndpoint(voiceId);
  }

  saveScene() {
    const rootRealm = this.realmManager.getRootRealm();
    const scene = rootRealm.appManager.exportJSON();
    const s = JSON.stringify(scene, null, 2);
    const blob = new Blob([s], {
      type: 'application/json',
    });
    downloadFile(blob, 'scene.scn');
  }

  /* pushAppUpdates() {
    debugger;
    return; // XXX re-enable for multiplayer

    this.world.appManager.pushAppUpdates();

    for (const remotePlayer in this.playersManager.getRemotePlayers()) {
      remotePlayer.appManager.pushAppUpdates();
    }
  } */

  /* pushPlayerUpdates() {
    debugger;
    return; // XXX re-enable for multiplayer

    const localPlayer = this.playersManager.getLocalPlayer();
    localPlayer.pushPlayerUpdates();
  } */

  update(timestamp, timeDiff) {
    const now = timestamp;
    // const {renderer} = this.webaverseRenderer;
    const localPlayer = this.playersManager.getLocalPlayer();

    const {
      camera,
    } = this.cameraManager;

    const _updateThirdPerson = () => {
      const firstPerson = this.cameraManager.getMode() === 'firstperson';
      if (firstPerson !== this.lastFirstPerson) {
        this.setFirstPersonAction(firstPerson);
        this.lastFirstPerson = firstPerson;
      }
    };
    _updateThirdPerson();

    /* const _handlePickUp = () => {
      const pickUpAction = localPlayer.actionManager.getActionType('pickUp');
      if (pickUpAction) {
        const {instanceId} = pickUpAction;
        const app = metaversefileApi.getAppByInstanceId(instanceId);

        const _removeApp = () => {
          if (app.parent) {
            app.oldParent = app.parent;
            app.parent.remove(app);
          }
        };
        const _addApp = () => {
          app.oldParent.add(app);
          app.oldParent = null;
        };

        _removeApp();

        const animations = Avatar.getAnimations();
        const pickUpZeldaAnimation = animations.find(a => a.name === 'pick_up_zelda.fbx');
        const pickUpTime = physx.physxWorker.getActionInterpolantAnimationAvatar(localPlayer.avatar.animationAvatarPtr, 'pickUp', 0);
        const pickUpTimeS = pickUpTime / 1000;
        if (pickUpTimeS < pickUpZeldaAnimation.duration) {
          // still playing the pick up animation
        } else {
          // idling

          _addApp();

          const handsAveragePosition = localVector.setFromMatrixPosition(localPlayer.avatar.modelBones.Left_wrist.matrixWorld)
            .add(localVector2.setFromMatrixPosition(localPlayer.avatar.modelBones.Right_wrist.matrixWorld))
            .divideScalar(2)
            .add(localVector2.set(0, 0.2, 0));
          app.position.copy(handsAveragePosition);
          localEuler.setFromQuaternion(localPlayer.quaternion, 'YXZ');
          localEuler.x = 0;
          localEuler.y += Math.PI;
          localEuler.z = 0;
          app.quaternion.setFromEuler(localEuler);
          app.updateMatrixWorld();
        }
      }
      this.ioManager.setMovementEnabled(!pickUpAction);
    }
    _handlePickUp();

    const _updateMouseHighlight = () => {
      this.mouseHighlightPhysicsMesh.visible = false;

      if (this.hoverEnabled) {
        const collision = this.raycastManager.getCollision();
        if (collision) {
          const {physicsObject} = collision;
          const {physicsMesh} = physicsObject;
          this.mouseHighlightPhysicsMesh.geometry = physicsMesh.geometry;
          localMatrix2.copy(physicsMesh.matrixWorld)
            .decompose(this.mouseHighlightPhysicsMesh.position, this.mouseHighlightPhysicsMesh.quaternion, this.mouseHighlightPhysicsMesh.scale);
          this.mouseHighlightPhysicsMesh.material.uniforms.uTime.value = (now % 1500) / 1500;
          this.mouseHighlightPhysicsMesh.material.uniforms.uTime.needsUpdate = true;
          this.mouseHighlightPhysicsMesh.updateMatrixWorld();

          this.mouseHighlightPhysicsMesh.visible = true;
          this.setMouseHoverObject(collision.app, collision.physicsId, collision.point);
        }
      }
    };
    _updateMouseHighlight();

    const _updateMouseSelect = () => {
      this.mouseSelectPhysicsMesh.visible = false;

      const o = this.mouseSelectedObject;
      if (o) {
        const physicsId = this.mouseSelectedPhysicsId;

        const physicsObject = metaversefileApi.getPhysicsObjectByPhysicsId(physicsId);
        if (physicsObject) {
          const {physicsMesh} = physicsObject;
          this.mouseSelectPhysicsMesh.geometry = physicsMesh.geometry;

          // update matrix
          {
            localMatrix2.copy(physicsMesh.matrixWorld)
              .decompose(this.mouseSelectPhysicsMesh.position, this.mouseSelectPhysicsMesh.quaternion, this.mouseSelectPhysicsMesh.scale);
            this.mouseSelectPhysicsMesh.visible = true;
            this.mouseSelectPhysicsMesh.updateMatrixWorld();

          }
          // update uniforms
          {
            this.mouseSelectPhysicsMesh.material.uniforms.uTime.value = (now % 1500) / 1500;
            this.mouseSelectPhysicsMesh.material.uniforms.uTime.needsUpdate = true;

          }
        }
      }
    };
    _updateMouseSelect();

    const _updateMouseDomHover = () => {
      this.mouseDomHoverPhysicsMesh.visible = false;

      if (this.mouseDomHoverObject && !this.mouseSelectedObject) {
        const physicsId = this.mouseDomHoverPhysicsId;

        const physicsObject = metaversefileApi.getPhysicsObjectByPhysicsId(physicsId);
        if (physicsObject) {
          const {physicsMesh} = physicsObject;
          this.mouseDomHoverPhysicsMesh.geometry = physicsMesh.geometry;
          localMatrix2.copy(physicsMesh.matrixWorld)
            .decompose(this.mouseDomHoverPhysicsMesh.position, this.mouseDomHoverPhysicsMesh.quaternion, this.mouseDomHoverPhysicsMesh.scale);
          this.mouseDomHoverPhysicsMesh.material.uniforms.uTime.value = (now % 1500) / 1500;
          this.mouseDomHoverPhysicsMesh.material.uniforms.uTime.needsUpdate = true;
          this.mouseDomHoverPhysicsMesh.visible = true;
          this.mouseDomHoverPhysicsMesh.updateMatrixWorld();
        }
      }
    };
    _updateMouseDomHover();

    const _updateMouseDomEquipmentHover = () => {
      this.mouseDomEquipmentHoverPhysicsMesh.visible = false;

      if (this.mouseDomEquipmentHoverObject && !this.mouseSelectedObject) {
        const physicsId = this.mouseDomEquipmentHoverPhysicsId;

        const physicsObject = metaversefileApi.getPhysicsObjectByPhysicsId(physicsId);
        if (physicsObject) {
          const {physicsMesh} = physicsObject;
          this.mouseDomEquipmentHoverPhysicsMesh.geometry = physicsMesh.geometry;
          localMatrix2.copy(physicsMesh.matrixWorld)
            .decompose(this.mouseDomEquipmentHoverPhysicsMesh.position, this.mouseDomEquipmentHoverPhysicsMesh.quaternion, this.mouseDomEquipmentHoverPhysicsMesh.scale);
          this.mouseDomEquipmentHoverPhysicsMesh.material.uniforms.uTime.value = (now % 1500) / 1500;
          this.mouseDomEquipmentHoverPhysicsMesh.material.uniforms.uTime.needsUpdate = true;
          this.mouseDomEquipmentHoverPhysicsMesh.visible = true;
          this.mouseDomEquipmentHoverPhysicsMesh.updateMatrixWorld();
        }
      }
    };
    _updateMouseDomEquipmentHover();

    const _handleClosestObject = () => {
      const apps = this.world.appManager.apps;
      if (apps.length > 0) {
        let closestObject;

        if (!this.getMouseSelectedObject() && !this.contextMenu) {
          if (this.cameraManager.getMode() !== 'firstperson') {
            localPlayer.matrixWorld.decompose(
              localVector,
              localQuaternion,
              localVector2,
            );
            const avatarHeight = localPlayer.avatar ? localPlayer.avatar.height : 0;
            localVector.y -= avatarHeight / 2;
            const distanceSpecs = apps.map(object => {
              let distance = object.position.distanceTo(localVector);
              if (distance > 30) {
                distance = Infinity;
              }
              return {
                distance,
                object,
              };
            }).sort((a, b) => a.distance - b.distance);
            const closestDistanceSpec = distanceSpecs[0];
            if (isFinite(closestDistanceSpec.distance)) {
              closestObject = closestDistanceSpec.object;
            }
          } else {
            if ((!!localPlayer.avatar && this.cameraManager.getMode()) === 'firstperson') {
              localRay.set(
                camera.position,
                localVector.set(0, 0, -1)
                  .applyQuaternion(camera.quaternion),
              );

              const distanceSpecs = apps.map(object => {
                const distance =
                  object.position.distanceTo(camera.position) < 8 ?
                    localRay.distanceToPoint(object.position)
                    :
                    Infinity;
                return {
                  distance,
                  object,
                };
              }).sort((a, b) => a.distance - b.distance);
              const closestDistanceSpec = distanceSpecs[0];
              if (isFinite(closestDistanceSpec.distance)) {
                closestObject = closestDistanceSpec.object;
              }
            } else {
              closestObject = this.getMouseHoverObject();
            }
          }
        } else {
          closestObject = null;
        }

        this.closestObject = closestObject;
      }
    };
    _handleClosestObject(); 

    const _handleUsableObject = () => {
      const apps = this.world.appManager.apps;
      if (apps.length > 0) {
        let usableObject;

        if (
          !this.getMouseSelectedObject() &&
          !this.contextMenu
        ) {
          localPlayer.matrixWorld.decompose(
            localVector,
            localQuaternion,
            localVector2,
          );
          const avatarHeight = localPlayer.avatar ? localPlayer.avatar.height : 0;
          localVector.y -= avatarHeight / 2;
          const distanceSpecs = apps.map(object => {
            let distance = object.position.distanceTo(localVector);
            if (distance > 3) {
              distance = Infinity;
            }
            return {
              distance,
              object,
            };
          }).sort((a, b) => a.distance - b.distance);
          const closestDistanceSpec = distanceSpecs[0];
          if (isFinite(closestDistanceSpec.distance)) {
            usableObject = closestDistanceSpec.object;
          }
        } else {
          usableObject = null;
        }

        this.usableObject = usableObject;
      }
    };
    _handleUsableObject();

    const _updateActivate = () => {
      const v = avatarsWasmManager.physxWorker.getActionInterpolantAnimationAvatar(localPlayer.avatar.animationAvatarPtr, 'activate', 1);
      const currentActivated = v >= 1;

      if (currentActivated && !this.lastActivated) {
        if (this.grabUseMesh.targetApp) {
          this.grabUseMesh.targetApp.activate({
            physicsId: this.grabUseMesh.targetPhysicsId,
          });
        }
        localPlayer.actionManager.removeActionType('activate');
      }
      this.lastActivated = currentActivated;
    };
    _updateActivate();

    const _updateThrow = () => {
      const useAction = localPlayer.actionManager.getActionType('use');
      if (useAction && useAction.behavior === 'throw') {
        const v = avatarsWasmManager.physxWorker.getActionInterpolantAnimationAvatar(localPlayer.avatar.animationAvatarPtr, 'use', 0) / throwReleaseTime;
        const currentThrowing = v >= 1;

        if (currentThrowing && !this.lastThrowing) {
          const app = metaversefileApi.getAppByInstanceId(useAction.instanceId);
          localPlayer.unwear(app, {
            dropStartPosition: localVector.copy(localPlayer.position)
              .add(localVector2.set(0, 0.5, -1).applyQuaternion(localPlayer.quaternion)),
            dropDirection: localVector2.set(0, 0.2, -1).normalize().applyQuaternion(localPlayer.quaternion),
          });
        }
        this.lastThrowing = currentThrowing;
      }
    };
    _updateThrow();

    const _updateLook = () => {
      if (localPlayer.avatar) {
        if (this.mouseSelectedObject && this.mouseSelectedPosition) {
          localPlayer.headTarget.copy(this.mouseSelectedPosition);
          localPlayer.headTargetInverted = true;
          localPlayer.headTargetEnabled = true;
        } else if (
          !this.cameraManager.pointerLockElement &&
          !this.cameraManager.target &&
          this.raycastManager.lastMouseEvent
        ) {
          // const renderer = getRenderer();
          const {renderer} = this.webaverseRenderer;
          const size = renderer.getSize(localVector);

          localPlayer.headTarget.set(-(this.raycastManager.lastMouseEvent.clientX / size.x - 0.5), (this.raycastManager.lastMouseEvent.clientY / size.y - 0.5), 1)
            .unproject(camera);
          localPlayer.headTargetInverted = false;
          localPlayer.headTargetEnabled = true;
        } else {
          localPlayer.setTarget(null);
        }
      }
    };
    _updateLook();

    const crosshairEl = document.getElementById('crosshair');
    if (crosshairEl) {
      const visible = !!this.cameraManager.pointerLockElement &&
        (['camera', 'firstperson', 'thirdperson'].includes(this.cameraManager.getMode()) || localPlayer.actionManager.hasActionType('aim')) &&
        !this.interactionManager.getGrabbedObject(0);
      crosshairEl.style.visibility = visible ? null : 'hidden';
    } */

    const _updateUse = () => {
      const useAction = localPlayer.actionManager.getActionType('use');
      if (useAction) {
        if (useAction.animation === 'pickUpThrow') {
          const useTime = avatarsWasmManager.physxWorker.getActionInterpolantAnimationAvatar(localPlayer.avatar.animationAvatarPtr, 'use', 0);
          if (useTime / 1000 >= throwAnimationDuration) {
            this.endUse();
          }
        } else if (useAction.behavior === 'sword' && useAction.animationCombo?.length > 0) {
          const useTime = avatarsWasmManager.physxWorker.getActionInterpolantAnimationAvatar(localPlayer.avatar.animationAvatarPtr, 'use', 0);
          if (useTime > swordComboAnimationDuration) {
            this.endUse();
          }
        } else if (this.isMouseUp) {
          this.endUse();
        }

      }
      this.isMouseUp = false;
    };
    _updateUse();

    const _updateBehavior = () => {
      const useAction = localPlayer.actionManager.getActionType('use');
      if (useAction) {
        const _handleSword = () => {
          localVector.copy(localPlayer.position)
            .add(localVector2.set(0, 0, -hitboxOffsetDistance).applyQuaternion(localPlayer.quaternion));

          this.hitManager.attemptHit({
            character: localPlayer,
            type: 'sword',
            args: {
              hitRadius,
              hitHalfHeight,
              position: localVector,
              quaternion: localPlayer.quaternion,
            },
            timestamp,
          });
        };

        switch (useAction.behavior) {
          case 'sword': {
            _handleSword();
            break;
          }
          default: {
            break;
          }
        }
      }
    };
    _updateBehavior();
  };
}
// const gameManager = new GameManager();
// export default gameManager;