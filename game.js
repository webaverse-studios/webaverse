/*
this file contains the main game logic tying together the managers.
general game logic goes here.
usually, code starts here and is migrated to an appropriate manager.
*/

import * as THREE from 'three';
import alea from 'alea';
import physx from './physx.js';
import cameraManager from './camera-manager.js';
import ioManager from './io-manager.js';
import dioramaManager from './diorama/diorama-manager.js';
import {world} from './world.js';
import {buildMaterial, highlightMaterial, selectMaterial, hoverMaterial, hoverEquipmentMaterial} from './shaders.js';
import {getRenderer, sceneLowPriority, camera, scene, rootScene} from './renderer.js';
import {downloadFile, snapPosition, getDropUrl, handleDropJsonItem, makeId} from './util.js';
import {maxGrabDistance, throwReleaseTime, throwAnimationDuration, walkSpeed, crouchSpeed, flySpeed} from './constants.js';
import metaversefileApi from './metaversefile-api.js';
import loadoutManager from './loadout-manager.js';
import * as sounds from './sounds.js';
import {playersManager} from './players-manager.js';
import {partyManager} from './party-manager.js';
import physicsManager from './physics-manager.js';
import raycastManager from './raycast-manager.js';
import zTargeting from './z-targeting.js';
import Avatar from './avatars/avatars.js';
import {avatarManager} from './avatar-manager.js';
import npcManager from './npc-manager.js';
import grabManager from './grab-manager.js';
import {getVoucherFromUser} from './src/hooks/voucherHelpers'  
import zineCameraManager from './zine-runtime/zine-camera-manager.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localVector6 = new THREE.Vector3();
const localVector7 = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();
const localBox = new THREE.Box3();
const localRay = new THREE.Ray();
const localRaycaster = new THREE.Raycaster();

const zeroVector = new THREE.Vector3(0, 0, 0);
const upVector = new THREE.Vector3(0, 1, 0);

const hitRadius = 1;
const hitHeight = 0.2;
const hitHalfHeight = hitHeight * 0.5;
const hitboxOffsetDistance = 0.3;

class GameManager extends EventTarget {
  menuOpen = 0;
  gridSnap = 0;
  editMode = false;
  contextMenu = false;
  contextMenuObject = null;
  inventoryHack = false;
  closestObject = null;
  usableObject = null;
  hoverEnabled = false;
  lastFirstPerson = cameraManager.getMode() === 'firstperson';
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

  constructor() {
    super();
    this.bindEvents();
    this.setFirstPersonAction(this.lastFirstPerson);
    this.bindPointerLock();
    this.registerHighlightMeshes();
  }

  registerHighlightMeshes() {
    this.highlightPhysicsMesh = this.makeHighlightPhysicsMesh(buildMaterial);
    grabManager.setHighlightPhysicsMesh(this.highlightPhysicsMesh);

    this.mouseHighlightPhysicsMesh = this.makeHighlightPhysicsMesh(highlightMaterial);
    this.mouseHighlightPhysicsMesh.visible = false;
    sceneLowPriority.add(this.mouseHighlightPhysicsMesh);

    this.mouseSelectPhysicsMesh = this.makeHighlightPhysicsMesh(selectMaterial);
    this.mouseSelectPhysicsMesh.visible = false;
    sceneLowPriority.add(this.mouseSelectPhysicsMesh);

    this.mouseDomHoverPhysicsMesh = this.makeHighlightPhysicsMesh(hoverMaterial);
    this.mouseDomHoverPhysicsMesh.visible = false;
    sceneLowPriority.add(this.mouseDomHoverPhysicsMesh);

    this.mouseDomEquipmentHoverPhysicsMesh = this.makeHighlightPhysicsMesh(hoverEquipmentMaterial);
    this.mouseDomEquipmentHoverPhysicsMesh.visible = false;
    sceneLowPriority.add(this.mouseDomEquipmentHoverPhysicsMesh);
  }

  init() {
    this.grabUseMesh = metaversefileApi.createApp();
    (async () => {
      const {importModule} = metaversefileApi.useDefaultModules();
      const m = await importModule('button');
      await this.grabUseMesh.addModule(m);
    })();
    this.grabUseMesh.targetApp = null;
    this.grabUseMesh.targetPhysicsId = -1;
    sceneLowPriority.add(this.grabUseMesh);
  };

  delete() {
    if (this.mouseSelectedObject) {
      world.appManager.removeTrackedApp(this.mouseSelectedObject.instanceId);

      if (this.mouseHoverObject === this.mouseSelectedObject) {
        gameManager.setMouseHoverObject(null);
      }
      gameManager.setMouseSelectedObject(null);
    }
  };

  getNextUseIndex = animationCombo => {
    if (Array.isArray(animationCombo)) {
      return (this.lastUseIndex++) % animationCombo.length;
    } else {
      return 0;
    }
  }

  startUse() {
    const wearApp = loadoutManager.getSelectedApp();
    if (wearApp) {
      const useComponent = wearApp.getComponent('use');
      if (useComponent) {
        const localPlayer = playersManager.getLocalPlayer();
        const useAction = localPlayer.getAction('use');
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
          localPlayer.addAction(newUseAction);

          wearApp.use();
        }
      }
    }
  };

  endUse() {
    const localPlayer = playersManager.getLocalPlayer();
    const useAction = localPlayer.getAction('use');
    if (useAction) {
      const app = metaversefileApi.getAppByInstanceId(useAction.instanceId);
      app.dispatchEvent({
        type: 'use',
        use: false,
      });
      localPlayer.removeAction('use');
    }
  };

  mousedown() {
    this.startUse();
  };

  mouseup() {
    this.isMouseUp = true;
  };

  grab(object) {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.grab(object);

    gameManager.gridSnap = 0;
    gameManager.editMode = false;
  };

  getGrabAction(i) {
    const targetHand = i === 0 ? 'left' : 'right';
    const localPlayer = playersManager.getLocalPlayer();
    const grabAction = localPlayer.findAction(action => action.type === 'grab' && action.hand === targetHand);
    return grabAction;
  };

  getGrabbedObject(i) {
    const grabAction = this.getGrabAction(i);
    const grabbedObjectInstanceId = grabAction?.instanceId;
    const result = grabbedObjectInstanceId ? metaversefileApi.getAppByInstanceId(grabbedObjectInstanceId) : null;
    return result;
  };

  unwearAppIfHasSitComponent(player) {
    const wearActions = player.getActionsByType('wear');
    for (const wearAction of wearActions) {
      const instanceId = wearAction.instanceId;
      const app = metaversefileApi.getAppByInstanceId(instanceId);
      const hasSitComponent = app.hasComponent('sit');
      if (hasSitComponent) {
        app.unwear();
      }
    }
  }

  // returns whether we actually snapped
  updateGrabbedObject(
    o,
    grabMatrix,
    offsetMatrix,
    {collisionEnabled, handSnapEnabled, physx, gridSnap},
  ) {
    grabMatrix.decompose(localVector, localQuaternion, localVector2);
    offsetMatrix.decompose(localVector3, localQuaternion2, localVector4);
    const offset = localVector3.length();
    localMatrix
      .multiplyMatrices(grabMatrix, offsetMatrix)
      .decompose(localVector5, localQuaternion3, localVector6);

    const _getPhysicalPosition = box => {
      return localVector7.set(
        (box.min.x + box.max.x) / 2,
        box.min.y,
        (box.min.z + box.max.z) / 2,
      );
    }

    let physicalOffset = null;
    const grabbedPhysicsObjects = o.getPhysicsObjects();

    // Compute physical local bounding box and it's position offset from app.position.
    // THREE.Box3.getCenter() has a console error, so I calculate manually.
    if (grabbedPhysicsObjects) {
      localBox.makeEmpty();
      for (const physicsObject of grabbedPhysicsObjects) {
        const geometry = physicsObject.physicsMesh.geometry;
        geometry.computeBoundingBox();
        localBox.union(geometry.boundingBox);
      }
      physicalOffset = _getPhysicalPosition(localBox);
    }

    const physicsScene = physicsManager.getScene();
    const collision = collisionEnabled && physicsScene.raycast(localVector, localQuaternion);
    localQuaternion2.setFromAxisAngle(localVector2.set(1, 0, 0), -Math.PI * 0.5);
    const downCollision = collisionEnabled && physicsScene.raycast(localVector5, localQuaternion2);

    if (collision) {
      const {point} = collision;
      localVector6.fromArray(point);
    }

    if (downCollision) {
      const {point} = downCollision;
      localVector4.fromArray(point);
      if (ioManager.keys.shift) {
        o.position.copy(localVector5.setY(localVector4.y));
      } else {
        // if collision point is closer to the player than the grab offset and collisionDown point
        // is below collision point then place the object at collision point
        if (
          localVector.distanceTo(localVector6) < offset &&
          localVector4.y < localVector6.y
        )
          localVector5.copy(localVector6);

        // if grabbed object would go below another object then place object at downCollision point
        if (localVector5.y < localVector4.y) localVector5.setY(localVector4.y);
        o.position.copy(localVector5);
      }
    }

    const collisionIsWithinOffset = localVector.distanceTo(localVector6) < offset;
    const collisionIsAboveGround = localVector4.y < localVector6.y;

    // Did the ray collide with any other object than the grabbed object? Need this check because on the first frame
    // it collides with the grabbed object, although physical actors are being disabled. This caused teleport issue.
    const collNonGrabbedObj = !!collision && !o.physicsObjects.some(obj => obj.physicsId === collision.objectId);

    // if collision point is closer to the player than the grab offset and collisionDown point
    // is below collision point then place the object at collision point
    if (collNonGrabbedObj && !!downCollision && collisionIsWithinOffset && collisionIsAboveGround) {
      localVector5.copy(localVector6).sub(physicalOffset);
    }

    const objectOverlapsVertically = localVector7.copy(localVector5).add(physicalOffset).y < localVector4.y;

    // if grabbed object would overlap vertically then place object at downCollision point
    if (!!downCollision && objectOverlapsVertically) {
      localVector5.setY(localVector4.sub(physicalOffset).y);
    }

    o.position.copy(localVector5);

    const handSnap =
      !handSnapEnabled ||
      offset >= maxGrabDistance ||
      !!collision ||
      !!downCollision;
    if (handSnap) {
      snapPosition(o, gridSnap);
      o.quaternion.setFromEuler(o.savedRotation);
    } else {
      o.quaternion.copy(localQuaternion3);
    }

    o.updateMatrixWorld();

    return {
      handSnap,
    };
  }

  getCurrentGrabAnimation() {
    let currentAnimation = '';
    const localPlayer = playersManager.getLocalPlayer();

    const wearComponent = this.grabUseMesh.targetApp.getComponent('wear');
    if (wearComponent && wearComponent.grabAnimation === 'pick_up') {
      currentAnimation = wearComponent.grabAnimation;
    } else {
      const grabUseMeshPosition = this.grabUseMesh.position;
      let currentDistance = 100;

      // Forward
      {
        localVector.set(0, -0.5, -0.5).applyQuaternion(localPlayer.quaternion)
          .add(localPlayer.position);
        const distance = grabUseMeshPosition.distanceTo(localVector);
        currentDistance = distance;
        currentAnimation = 'grab_forward';
      }

      // Down
      {
        localVector.set(0, -1.2, -0.5).applyQuaternion(localPlayer.quaternion)
          .add(localPlayer.position);
        const distance = grabUseMeshPosition.distanceTo(localVector);
        if (distance < currentDistance) {
          currentDistance = distance;
          currentAnimation = 'grab_down';
        }
      }

      // Up
      {
        localVector.set(0, 0.0, -0.5).applyQuaternion(localPlayer.quaternion)
          .add(localPlayer.position);
        const distance = grabUseMeshPosition.distanceTo(localVector);
        if (distance < currentDistance) {
          currentDistance = distance;
          currentAnimation = 'grab_up';
        }
      }

      // Left
      {
        localVector.set(-0.8, -0.5, -0.5).applyQuaternion(localPlayer.quaternion)
          .add(localPlayer.position);
        const distance = grabUseMeshPosition.distanceTo(localVector);
        if (distance < currentDistance) {
          currentDistance = distance;
          currentAnimation = 'grab_left';
        }
      }

      // Right
      {
        localVector.set(0.8, -0.5, -0.5).applyQuaternion(localPlayer.quaternion)
          .add(localPlayer.position);
        const distance = grabUseMeshPosition.distanceTo(localVector);
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
    const localPlayer = playersManager.getLocalPlayer();
    if (firstPerson) {
      if (!localPlayer.hasAction('firstperson')) {
        const aimAction = {
          type: 'firstperson',
        };
        localPlayer.addAction(aimAction);
      }
    } else {
      localPlayer.removeAction('firstperson');
    }
  };

  bindPointerLock() {
    cameraManager.addEventListener('pointerlockchange', e => {
      const {pointerLockElement} = e.data;

      gameManager.setMouseHoverObject(null);
      if (!pointerLockElement) {
        gameManager.editMode = false;
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
    const localPlayer = playersManager.getLocalPlayer();

    if (zineCameraManager.cameraLocked) {
      // compute the ray
      const {mousePosition} = zineCameraManager;
      localVector2D.copy(mousePosition);
      localVector2D.y = -localVector2D.y;
      localRaycaster.setFromCamera(localVector2D, camera);

      // raycast to select
      const rayObject = new THREE.Object3D();
      rayObject.position.copy(localRaycaster.ray.origin);
      rayObject.quaternion.setFromRotationMatrix(
        localMatrix.lookAt(
          zeroVector,
          localRaycaster.ray.direction,
          upVector
        )
      );
      zTargeting.handleRayFocus(rayObject);
    } else {
      if (!localPlayer.hasAction('aim')) {
        const wearApp = loadoutManager.getSelectedApp();
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
        localPlayer.addAction(aimAction);
      }
    }
  }

  menuUnaim() {
    const localPlayer = playersManager.getLocalPlayer();
    const aimAction = localPlayer.getAction('aim');
    if (aimAction) {
      localPlayer.removeAction('aim');
    }
  }

  menuMiddleDown() {
    zTargeting.handleDown();
  }

  menuMiddle() {
    // nothing
  }

  menuMiddleUp() {
    zTargeting.handleUp();
  }

  menuMiddleToggle() {
    zTargeting.toggle();
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

  dropSelectedApp() {
    const app = loadoutManager.getSelectedApp();
    if (app) {
      const localPlayer = playersManager.getLocalPlayer();
      localPlayer.unwear(app, {});
      this.endUse();
    }
  }

  deleteSelectedApp() {
    if (this.selectedIndex !== -1) {
      const app = loadoutManager.getSelectedApp();
      if (app) {
        const localPlayer = playersManager.getLocalPlayer();
        localPlayer.unwear(app, {
          destroy: true,
        });
      }
    }
  }
  
  menuVDown() {
    const localPlayer = playersManager.getLocalPlayer();
    if (grabManager.getGrabbedObject(0)) {
      grabManager.menuGridSnap();
    } else {
      localPlayer.removeAction('dance');

      const newAction = {
        type: 'dance',
        animation: 'dansu',
      };
      localPlayer.addAction(newAction);
    }
  }

  menuVUp() {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.removeAction('dance');
  }

  menuBDown() {
    const localPlayer = playersManager.getLocalPlayer();
    const sssAction = localPlayer.getAction('sss');
    if (!sssAction) {
      const newSssAction = {
        type: 'sss',
      };
      localPlayer.addAction(newSssAction);

      sounds.playSoundName('limitBreak');

      localPlayer.removeAction('dance');
      const newDanceAction = {
        type: 'dance',
        animation: 'powerup',
      };
      localPlayer.addAction(newDanceAction);
    } else {
      localPlayer.removeAction('sss');
      localPlayer.removeAction('dance');
    }
  }

  menuBUp() {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.removeAction('sss');
    localPlayer.removeAction('dance');
  }

  menuDoubleTap() {
    if (!this.isCrouched()) {
      const localPlayer = playersManager.getLocalPlayer();
      const narutoRunAction = localPlayer.getAction('narutoRun');
      if (!narutoRunAction) {
        const newNarutoRunAction = {
          type: 'narutoRun',
        };
        localPlayer.addAction(newNarutoRunAction);
      }
    }
  }

  menuUnDoubleTap() {
    const localPlayer = playersManager.getLocalPlayer();
    const narutoRunAction = localPlayer.getAction('narutoRun');
    if (narutoRunAction) {
      localPlayer.removeAction('narutoRun');
    }
  }

  menuSwitchCharacter() {
    const switched = partyManager.switchCharacter();
    if (switched) {
      sounds.playSoundName('menuReady');
    }
  }

  menuZoneIntro() {
    const rng = alea('lol' + Math.random());
    const r = n => {
      return -n + rng() * n * 2;
    }
    const rp = n => {
      return rng() * n;
    }
    const r3 = (n, target) => {
      return target.set(r(n), r(n), r(n));
    };
  
    const range = 30;
    const localPlayer = playersManager.getLocalPlayer();
    const center = localPlayer.position.clone()
      .add(
        new THREE.Vector3(0, range/4, 0)
          .applyQuaternion(localPlayer.quaternion)
      );
    const centerToPlayerDirection = localPlayer.position.clone()
      .sub(center)
      .normalize();
    
    const startPosition = new THREE.Vector3((rng() < 0.5 ? 1 : -1) * range, range/2, -range)
      .applyQuaternion(localPlayer.quaternion)
      .add(r3(5, new THREE.Vector3()));
    const baseQuaternion = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(
        startPosition,
        center,
        upVector
      )
    );
    const startQuaternion = baseQuaternion.clone().multiply(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-rp(Math.PI * 0.2), r(Math.PI * 0.2), r(Math.PI * 0.01), 'YXZ')
      )
    );
    const endPosition = center.clone()
      .add(
        centerToPlayerDirection.clone()
          .multiply(new THREE.Vector3(r(3), r(3), rp(3)))
      );
    const endEuler = new THREE.Euler().setFromQuaternion(baseQuaternion, 'YXZ');
    endEuler.x = 0;
    endEuler.z = 0;
    const endQuaternion = new THREE.Quaternion().setFromEuler(endEuler)
      .multiply(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(-rp(Math.PI * 0.2), r(Math.PI * 0.2), 0, 'YXZ')
        )
      );
  
    const sp2x = r(1);
    const startPosition2 = localPlayer.position.clone()
      .add(new THREE.Vector3(sp2x, r(1) - 0.5, 1).applyQuaternion(localPlayer.quaternion));
    const startQuaternion2 = localPlayer.quaternion.clone();
    const endPosition2 = startPosition2.clone()
      .add(
        new THREE.Vector3((sp2x < 0 ? 1 : -1) * (1 + rp(2)), 0, 0)
          .applyQuaternion(localPlayer.quaternion)
      );
    const endQuaternion2 = startQuaternion2.clone();
  
    const cinematicScript = [
      {
        type: 'set',
        position: startPosition,
        quaternion: startQuaternion,
        duration: 1000,
      },
      {
        type: 'move',
        position: endPosition,
        quaternion: endQuaternion,
        duration: 5000,
      },
      {
        type: 'set',
        position: endPosition,
        quaternion: endQuaternion,
        duration: 500,
      },
      {
        type: 'set',
        position: startPosition2,
        quaternion: startQuaternion2,
        duration: 1000,
      },
      {
        type: 'move',
        position: endPosition2,
        quaternion: endQuaternion2,
        duration: 3000,
      },
    ];
    cameraManager.startCinematicScript(cinematicScript);
  
    // console.log('start cinematic intro');
  }

  isFlying() {
    const localPlayer = playersManager.getLocalPlayer();
    return localPlayer.hasAction('fly');
  }

  toggleFly() {
    const localPlayer = playersManager.getLocalPlayer();
    const flyAction = localPlayer.getAction('fly');
    if (flyAction) {
      localPlayer.removeAction('fly');
      if (!localPlayer.characterPhysics.lastGrounded) {
        localPlayer.setControlAction({type: 'fallLoop'});
      }
    } else {
      const flyAction = {
        type: 'fly',
        time: 0,
      };

      this.unwearAppIfHasSitComponent(localPlayer);

      localPlayer.setControlAction(flyAction);
    }
  }

  isCrouched() {
    const localPlayer = playersManager.getLocalPlayer();
    return localPlayer.hasAction('crouch');
  }

  isSwimming() {
    const localPlayer = playersManager.getLocalPlayer();
    return localPlayer.hasAction('swim');
  }

  toggleCrouch() {
    const localPlayer = playersManager.getLocalPlayer();
    let crouchAction = localPlayer.getAction('crouch');
    if (crouchAction) {
      localPlayer.removeAction('crouch');
    } else {
      crouchAction = {
        type: 'crouch',
      };
      localPlayer.addAction(crouchAction);
    }
  }

  async handleDropJsonItemToPlayer(item, index) {
    const u = await handleDropJsonItem(item);
    return await this.handleDropUrlToPlayer(u, index);
  }

  async handleDropJsonToPlayer(j, index) {
    const localPlayer = playersManager.getLocalPlayer();
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
    world.appManager.importApp(app);
    app.activate();
  }

  async handleDropJsonForDrop(object, currentAddress, WebaversecontractAddress, afterDrop = f => f) { // currentAddress = walletaddress, WebaversecontractAddress= signaddress
    const localPlayer = playersManager.getLocalPlayer();
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
      const {voucher, expiry} = await getVoucherFromUser(newObject.tokenId, currentAddress, WebaversecontractAddress)
      if (voucher.signature !== undefined) {
        newObject.voucher = voucher
        // add blacklist and time counter add
        afterDrop(true)
      }
    } else {
        afterDrop(false)
    }

    const velocity = localVector.set(0, 0, -1).applyQuaternion(localPlayer.quaternion)
    .normalize()
    .multiplyScalar(2.5);
    world.appManager.importAddedUserVoucherApp(position, quaternion, newObject, velocity);
  }

  async handleDropJsonForSpawn(handleDropJsonForSpawn) { // currentAddress = walletaddress, WebaversecontractAddress= signaddress
    const localPlayer = playersManager.getLocalPlayer();
    localVector.copy(localPlayer.position);
    if (localPlayer.avatar) {
      localVector.y -= localPlayer.avatar.height;
    }
    console.log("localvector", localVector)

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
    world.appManager.importApp(app);
  }

  selectLoadout(index) {
    loadoutManager.setSelectedIndex(index);
  }

  canToggleAxis() {
    return false;
  }

  toggleAxis() {
    console.log('toggle axis');
  }

  isJumping() {
    const localPlayer = playersManager.getLocalPlayer();
    return localPlayer.hasAction('jump');
  }

  isDoubleJumping() {
    const localPlayer = playersManager.getLocalPlayer();
    return localPlayer.hasAction('doubleJump');
  }

  ensureJump(trigger) {
    const localPlayer = playersManager.getLocalPlayer();

    this.unwearAppIfHasSitComponent(localPlayer);

    if (!localPlayer.hasAction('jump') &&
      !localPlayer.hasAction('fly') &&
      !localPlayer.hasAction('fallLoop') &&
      !localPlayer.hasAction('swim') &&
      !!localPlayer.characterPhysics.characterController
    ) {
      const newJumpAction = {
        type: 'jump',
        trigger: trigger,
        startPositionY: localPlayer.characterPhysics.characterController.position.y,
      };
      localPlayer.setControlAction(newJumpAction);
    }
  }

  jump(trigger) {
    this.ensureJump(trigger);
  }

  doubleJump() {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.addAction({
      type: 'doubleJump',
      startPositionY: localPlayer.characterPhysics.characterController.position.y,
    });
  }

  isMovingBackward() {
    const localPlayer = playersManager.getLocalPlayer();
    return localPlayer.avatar?.direction.z > 0.1; // If check > 0 will cause glitch when move left/right;
  }

  isAiming() {
    const localPlayer = playersManager.getLocalPlayer();
    return localPlayer.hasAction('aim');
  }

  isSitting() {
    const localPlayer = playersManager.getLocalPlayer();
    return localPlayer.hasAction('sit');
  }

  isGrounded() {
    const localPlayer = playersManager.getLocalPlayer();
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

    world.appManager.dispatchEvent(new MessageEvent('hoverchange', {
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

    world.appManager.dispatchEvent(new MessageEvent('selectchange', {
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
    const localPlayer = playersManager.getLocalPlayer();
    if (ioManager.keys.up || ioManager.keys.down || ioManager.keys.left || ioManager.keys.right) {
      if (!localPlayer.hasAction('movements')) {
        localPlayer.addAction({type: 'movements'});
      }
    } else {
      localPlayer.removeAction('movements');
    }
  }

  setSprint(bool) {
    const localPlayer = playersManager.getLocalPlayer();
    if (bool) {
      if (!localPlayer.hasAction('sprint')) { // note: prevent holding shift switch browser page.
        localPlayer.addAction({type: 'sprint'});
      }
    } else {
      localPlayer.removeAction('sprint');
    }
  }

  getSpeed() {
    let speed = 0;

    const isCrouched = gameManager.isCrouched();
    const isSwimming = gameManager.isSwimming();
    const isFlying = gameManager.isFlying();
    const isRunning = ioManager.keys.shift && !isCrouched;
    const isMovingBackward = gameManager.isMovingBackward();
    if (isCrouched && !isMovingBackward) {
      speed = crouchSpeed;
    } else if (gameManager.isFlying()) {
      speed = flySpeed;
    } else {
      speed = walkSpeed;
    }
    const localPlayer = playersManager.getLocalPlayer();
    const sprintMultiplier = isRunning ?
      (localPlayer.hasAction('narutoRun') ? 20 : 3)
      :
      ((isSwimming && !isFlying) ? 5 - localPlayer.getAction('swim').swimDamping : 1);
    speed *= sprintMultiplier;

    const backwardMultiplier = isMovingBackward ? (isRunning ? 0.8 : 0.7) : 1;
    speed *= backwardMultiplier;

    return speed;
  }

  getClosestObject() {
    return gameManager.closestObject;
  }

  getUsableObject() {
    return gameManager.usableObject;
  }

  menuActivateDown() {
    if (this.grabUseMesh.visible) {
      const localPlayer = playersManager.getLocalPlayer();
      const activateAction = localPlayer.getAction('activate');
      if (!activateAction) {
        const animationName = this.getCurrentGrabAnimation();
        const newActivateAction = {
          type: 'activate',
          animationName,
        };
        localPlayer.addAction(newActivateAction);
      }
    }
  }

  menuActivateUp() {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.removeAction('activate');
  }

  setAvatarQuality(quality) {
    const applySettingToApp = app => {
      const player = npcManager.getNpcByApp(app);
      if (player && player.avatar) {
        player.avatar.setQuality(quality);
      } else if (app.appType === 'vrm' && app.avatarRenderer) {
        app.avatarRenderer.setQuality(quality);
      }
    };

    // local party members
    const localPlayer = playersManager.getLocalPlayer();
    for (const app of localPlayer.appManager.apps) {
      applySettingToApp(app);
    }

    // remote players
    for (const remotePlayer in playersManager.getRemotePlayers()) {
      for (const app of remotePlayer.appManager.apps) {
        applySettingToApp(app);
      }
    }

    for (const app of world.appManager.apps) {
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
    playersManager.addEventListener('playerchange', playerSelectedFn);

    avatarManager.addEventListener('avatarchange', e => {
      const playerDiorama = this.getPlayerDiorama();
      const localPlayer = playersManager.getLocalPlayer();
      playerDiorama.setTarget(localPlayer);
      playerDiorama.setObjects([
        e.data.avatar.avatarRenderer.scene,
      ]);
    });
  }

  getPlayerDiorama(outline, background) {
    if (!this.#playerDiorama) {
      this.#playerDiorama = dioramaManager.createPlayerDiorama({
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
    const localPlayer = playersManager.getLocalPlayer();
    return localPlayer.setVoiceEndpoint(voiceId);
  }

  saveScene() {
    const scene = world.appManager.exportJSON();
    const s = JSON.stringify(scene, null, 2);
    const blob = new Blob([s], {
      type: 'application/json',
    });
    downloadFile(blob, 'scene.scn');
  }

  pushAppUpdates() {
    world.appManager.pushAppUpdates();

    for (const remotePlayer in playersManager.getRemotePlayers()) {
      remotePlayer.appManager.pushAppUpdates();
    }
  };

  pushPlayerUpdates() {
    const localPlayer = playersManager.getLocalPlayer();
    localPlayer.pushPlayerUpdates();
  };

  update(timestamp, timeDiff) {
    const now = timestamp;
    const renderer = getRenderer();
    const localPlayer = playersManager.getLocalPlayer();

    const _updateGrab = () => {
      const renderer = getRenderer();
      const _isWear = o => localPlayer.findAction(action => action.type === 'wear' && action.instanceId === o.instanceId);

      // XXX commented to prevent synchronous loading for this.grabUseMesh 
      this.grabUseMesh.visible = false;
      if (!grabManager.editMode) {
        const avatarHeight = localPlayer.avatar ? localPlayer.avatar.height : 0;
        localVector.copy(localPlayer.position)
          .add(localVector2.set(0, avatarHeight * (1 - localPlayer.getCrouchFactor()) * 0.5, -0.3).applyQuaternion(localPlayer.quaternion));

        const radius = 1;
        const halfHeight = 0.1;
        const physicsScene = physicsManager.getScene();
        const collision = physicsScene.getCollisionObject(radius, halfHeight, localVector, localPlayer.quaternion);
        if (collision) {
          const physicsId = collision.objectId;
          const object = metaversefileApi.getAppByPhysicsId(physicsId);
          // console.log('got collision', physicsId, object);
          const physicsObject = metaversefileApi.getPhysicsObjectByPhysicsId(physicsId);
          if (object && !_isWear(object) && physicsObject) {
            this.grabUseMesh.position.setFromMatrixPosition(physicsObject.physicsMesh.matrixWorld);
            this.grabUseMesh.quaternion.copy(camera.quaternion);
            this.grabUseMesh.updateMatrixWorld();
            this.grabUseMesh.targetApp = object;
            this.grabUseMesh.targetPhysicsId = physicsId;
            this.grabUseMesh.setComponent('value', physx.physxWorker.getActionInterpolantAnimationAvatar(localPlayer.avatar.animationAvatarPtr, 'activate', 1));

            this.grabUseMesh.visible = true;
          }
        }
      }
    };
    _updateGrab();

    const _handlePickUp = () => {
      const pickUpAction = localPlayer.getAction('pickUp');
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
      ioManager.setMovementEnabled(!pickUpAction);
    }
    _handlePickUp();

    const _updatePhysicsHighlight = () => {
      this.highlightPhysicsMesh.visible = false;

      if (this.highlightedPhysicsObject) {
        const physicsId = this.highlightedPhysicsId;

        this.highlightedPhysicsObject.updateMatrixWorld();

        const physicsObject = metaversefileApi.getPhysicsObjectByPhysicsId(physicsId);
        if (physicsObject) {
          const {physicsMesh} = physicsObject;
          this.highlightPhysicsMesh.geometry = physicsMesh.geometry;
          this.highlightPhysicsMesh.matrixWorld.copy(physicsMesh.matrixWorld)
            .decompose(this.highlightPhysicsMesh.position, this.highlightPhysicsMesh.quaternion, this.highlightPhysicsMesh.scale);

          this.highlightPhysicsMesh.material.uniforms.uTime.value = (now % 1500) / 1500;
          this.highlightPhysicsMesh.material.uniforms.uTime.needsUpdate = true;
          this.highlightPhysicsMesh.material.uniforms.uColor.value.setHex(buildMaterial.uniforms.uColor.value.getHex());
          this.highlightPhysicsMesh.material.uniforms.uColor.needsUpdate = true;
          this.highlightPhysicsMesh.visible = true;
          this.highlightPhysicsMesh.updateMatrixWorld();
        }
      }
    };
    _updatePhysicsHighlight();

    const _updateMouseHighlight = () => {
      this.mouseHighlightPhysicsMesh.visible = false;

      if (gameManager.hoverEnabled) {
        const collision = raycastManager.getCollision();
        if (collision) {
          const {physicsObject/*, physicsId */} = collision;
          const {physicsMesh} = physicsObject;
          this.mouseHighlightPhysicsMesh.geometry = physicsMesh.geometry;
          localMatrix2.copy(physicsMesh.matrixWorld)
            .decompose(this.mouseHighlightPhysicsMesh.position, this.mouseHighlightPhysicsMesh.quaternion, this.mouseHighlightPhysicsMesh.scale);
          this.mouseHighlightPhysicsMesh.material.uniforms.uTime.value = (now % 1500) / 1500;
          this.mouseHighlightPhysicsMesh.material.uniforms.uTime.needsUpdate = true;
          this.mouseHighlightPhysicsMesh.updateMatrixWorld();

          this.mouseHighlightPhysicsMesh.visible = true;
          gameManager.setMouseHoverObject(collision.app, collision.physicsId, collision.point);
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
      const apps = world.appManager.apps;
      if (apps.length > 0) {
        let closestObject;

        if (!gameManager.getMouseSelectedObject() && !gameManager.contextMenu) {
          if (cameraManager.getMode() !== 'firstperson') {
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
            if ((!!localPlayer.avatar && cameraManager.getMode()) === 'firstperson') {
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
              closestObject = gameManager.getMouseHoverObject();
            }
          }
        } else {
          closestObject = null;
        }

        gameManager.closestObject = closestObject;
      }
    };
    _handleClosestObject();

    const _handleUsableObject = () => {
      const apps = world.appManager.apps;
      if (apps.length > 0) {
        let usableObject;

        if (
          !gameManager.getMouseSelectedObject() &&
          !gameManager.contextMenu
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

        gameManager.usableObject = usableObject;
      }
    };
    _handleUsableObject();

    const _updateActivate = () => {
      const v = physx.physxWorker.getActionInterpolantAnimationAvatar(localPlayer.avatar.animationAvatarPtr, 'activate', 1);
      const currentActivated = v >= 1;

      if (currentActivated && !this.lastActivated) {
        if (this.grabUseMesh.targetApp) {
          this.grabUseMesh.targetApp.activate({
            physicsId: this.grabUseMesh.targetPhysicsId,
          });
        }
        localPlayer.removeAction('activate');
      }
      this.lastActivated = currentActivated;
    };

    _updateActivate();

    const _updateThirdPerson = () => {
      const firstPerson = cameraManager.getMode() === 'firstperson';
      if (firstPerson !== this.lastFirstPerson) {
        this.setFirstPersonAction(firstPerson);
        this.lastFirstPerson = firstPerson;
      }
    };
    _updateThirdPerson();

    const _updateThrow = () => {
      const useAction = localPlayer.getAction('use');
      if (useAction && useAction.behavior === 'throw') {
        const v = physx.physxWorker.getActionInterpolantAnimationAvatar(localPlayer.avatar.animationAvatarPtr, 'use', 0) / throwReleaseTime;
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

    const _updateBehavior = () => {
      const useAction = localPlayer.getAction('use');
      if (useAction) {
        const _handleSword = () => {
          localVector.copy(localPlayer.position)
            .add(localVector2.set(0, 0, -hitboxOffsetDistance).applyQuaternion(localPlayer.quaternion));

          localPlayer.characterHitter.attemptHit({
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

    const _updateLook = () => {
      if (localPlayer.avatar) {
        if (this.mouseSelectedObject && this.mouseSelectedPosition) {
          localPlayer.headTarget.copy(this.mouseSelectedPosition);
          localPlayer.headTargetInverted = true;
          localPlayer.headTargetEnabled = true;
        } else if (!cameraManager.pointerLockElement && !cameraManager.target && raycastManager.lastMouseEvent) {
          const renderer = getRenderer();
          const size = renderer.getSize(localVector);

          localPlayer.headTarget.set(-(raycastManager.lastMouseEvent.clientX / size.x - 0.5), (raycastManager.lastMouseEvent.clientY / size.y - 0.5), 1)
            .unproject(camera);
          localPlayer.headTargetInverted = false;
          localPlayer.headTargetEnabled = true;
        } else if (zTargeting?.focusTargetReticle?.position) {
          localPlayer.setTarget(zTargeting.focusTargetReticle.position);
        } else {
          localPlayer.setTarget(null);
        }
      }
    };
    _updateLook();

    const crosshairEl = document.getElementById('crosshair');
    if (crosshairEl) {
      const visible = !!cameraManager.pointerLockElement &&
        (['camera', 'firstperson', 'thirdperson'].includes(cameraManager.getMode()) || localPlayer.hasAction('aim')) &&
        !grabManager.getGrabbedObject(0);
      crosshairEl.style.visibility = visible ? null : 'hidden';
    }

    const _updateUse = () => {
      const useAction = localPlayer.getAction('use');
      if (useAction) {
        if (useAction.animation === 'pickUpThrow') {
          const useTime = physx.physxWorker.getActionInterpolantAnimationAvatar(localPlayer.avatar.animationAvatarPtr, 'use', 0);
          if (useTime / 1000 >= throwAnimationDuration) {
            this.endUse();
          }
        } else if (this.isMouseUp) {
          this.endUse();
        }

      }
      this.isMouseUp = false;
    };
    _updateUse();
  };
}

const gameManager = new GameManager();
export default gameManager;