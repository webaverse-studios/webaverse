/*
io manager reads inputs from the browser.
some inputs are implicit, like resize.
the functionality is implemented in other managers.
*/

import * as THREE from 'three';
import metaversefile from 'metaversefile';
import cameraManager from './camera-manager.js';
import game from './game.js';
import {world} from './world.js';
import voiceInput from './voice-input/voice-input.js';
import {getRenderer, camera} from './renderer.js';
import physicsManager from './physics-manager.js';
import transformControls from './transform-controls.js';
import storyManager from './story.js';
import raycastManager from './raycast-manager.js';
import grabManager from './grab-manager.js';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localEuler = new THREE.Euler();
const localMatrix2 = new THREE.Matrix4();
const localMatrix3 = new THREE.Matrix4();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localPlane = new THREE.Plane();
const localFrustum = new THREE.Frustum();

const zeroVector = new THREE.Vector3(0, 0, 0);
const upVector = new THREE.Vector3(0, 1, 0);

const doubleTapTime = 200;;

class IoManager extends EventTarget {
  lastAxes = [[0, 0, 0, 0], [0, 0, 0, 0]];
  lastButtons = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];
  currentWeaponValue = 0;
  lastWeaponValue = 0;
  currentTeleport = false;
  lastTeleport = false;
  currentMenuDown = false;
  lastMenuDown = false;
  menuExpanded = false;
  lastMenuExpanded = false;
  currentWeaponGrabs = [false, false];
  lastWeaponGrabs = [false, false];
  currentWalked = false;
  lastMouseButtons = 0;
  movementEnabled = true;

  keysDirection = new THREE.Vector3();

  keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    forward: false,
    backward: false,
    shift: false,
    doubleTap: false,
    space: false,
    ctrl: false,
  };

  lastKeysDownTime = {
    keyW: 0,
    keyA: 0,
    keyS: 0,
    keyD: 0,
    keyE: 0,
  };

  constructor() {
    super();
    cameraManager.addEventListener('pointerlockchange', () => {
      this.resetKeys();
    });
  }

  inputFocused() { return document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.getAttribute('contenteditable') !== null) };

  update(timeDiff) {
    const renderer = getRenderer();
    const xrCamera = renderer.xr.getSession() ? renderer.xr.getCamera(camera) : camera;
    if (renderer.xr.getSession()) {
      ioManager.currentWalked = false;
      const inputSources = Array.from(renderer.xr.getSession().inputSources);
      for (let i = 0; i < inputSources.length; i++) {
        const inputSource = inputSources[i];
        const {handedness, gamepad} = inputSource;
        if (gamepad && gamepad.buttons.length >= 2) {
          const index = handedness === 'right' ? 1 : 0;

          // axes
          const {axes: axesSrc, buttons: buttonsSrc} = gamepad;
          const axes = [
            axesSrc[0] || 0,
            axesSrc[1] || 0,
            axesSrc[2] || 0,
            axesSrc[3] || 0,
          ];
          const buttons = [
            buttonsSrc[0] ? buttonsSrc[0].value : 0,
            buttonsSrc[1] ? buttonsSrc[1].value : 0,
            buttonsSrc[2] ? buttonsSrc[2].value : 0,
            buttonsSrc[3] ? buttonsSrc[3].value : 0,
            buttonsSrc[4] ? buttonsSrc[4].value : 0,
            buttonsSrc[5] ? buttonsSrc[4].value : 0,
          ];
          if (handedness === 'left') {
            const dx = axes[0] + axes[2];
            const dy = axes[1] + axes[3];
            if (Math.abs(dx) >= 0.01 || Math.abs(dy) >= 0.01) {
              localEuler.setFromQuaternion(xrCamera.quaternion, 'YXZ');
              localEuler.x = 0;
              localEuler.z = 0;
              localVector.set(dx, 0, dy)
                .applyEuler(localEuler)
                .multiplyScalar(0.05);

              camera.matrix
                // .premultiply(localMatrix2.makeTranslation(-xrCamera.position.x, -xrCamera.position.y, -xrCamera.position.z))
                .premultiply(localMatrix3.makeTranslation(localVector.x, localVector.y, localVector.z))
                // .premultiply(localMatrix2.copy(localMatrix2).invert())
                .decompose(camera.position, camera.quaternion, camera.scale);
              ioManager.currentWalked = true;
            }

            ioManager.currentWeaponGrabs[1] = buttons[1] > 0.5;
          } else if (handedness === 'right') {
            const _applyRotation = r => {
              camera.matrix
                .premultiply(localMatrix2.makeTranslation(-xrCamera.position.x, -xrCamera.position.y, -xrCamera.position.z))
                .premultiply(localMatrix3.makeRotationFromQuaternion(localQuaternion.setFromAxisAngle(localVector.set(0, 1, 0), r)))
                .premultiply(localMatrix2.copy(localMatrix2).invert())
                .decompose(camera.position, camera.quaternion, camera.scale);
            };
            if (
              (axes[0] < -0.75 && !(ioManager.lastAxes[index][0] < -0.75)) ||
              (axes[2] < -0.75 && !(ioManager.lastAxes[index][2] < -0.75))
            ) {
              _applyRotation(Math.PI * 0.2);
            } else if (
              (axes[0] > 0.75 && !(ioManager.lastAxes[index][0] > 0.75)) ||
              (axes[2] > 0.75 && !(ioManager.lastAxes[index][2] > 0.75))
            ) {
              _applyRotation(-Math.PI * 0.2);
            }
            ioManager.currentTeleport = (axes[1] < -0.75 || axes[3] < -0.75);
            ioManager.currentMenuDown = (axes[1] > 0.75 || axes[3] > 0.75);

            ioManager.currentWeaponDown = buttonsSrc[0].pressed;
            ioManager.currentWeaponValue = buttons[0];
            ioManager.currentWeaponGrabs[0] = buttonsSrc[1].pressed;

            if (
              buttons[3] >= 0.5 && ioManager.lastButtons[index][3] < 0.5 &&
              !(Math.abs(axes[0]) > 0.5 || Math.abs(axes[1]) > 0.5 || Math.abs(axes[2]) > 0.5 || Math.abs(axes[3]) > 0.5) &&
              !game.isJumping() &&
              !game.isSitting()
            ) {
              game.jump();
            }
          }

          ioManager.lastAxes[index][0] = axes[0];
          ioManager.lastAxes[index][1] = axes[1];
          ioManager.lastAxes[index][2] = axes[2];
          ioManager.lastAxes[index][3] = axes[3];

          ioManager.lastButtons[index][0] = buttons[0];
          ioManager.lastButtons[index][1] = buttons[1];
          ioManager.lastButtons[index][2] = buttons[2];
          ioManager.lastButtons[index][3] = buttons[3];
          ioManager.lastButtons[index][4] = buttons[4];
        }
      }
    } else {
      this.keysDirection.set(0, 0, 0);

      const localPlayer = metaversefile.useLocalPlayer();

      const _updateHorizontal = direction => {
        if (ioManager.keys.left) {
          direction.x -= 1;
        }
        if (ioManager.keys.right) {
          direction.x += 1;
        }
        if (ioManager.keys.up) {
          direction.z -= 1;
        }
        if (ioManager.keys.down) {
          direction.z += 1;
        }
      };

      const _updateVertical = direction => {
        if (ioManager.keys.space) {
          direction.y += 1;
        }
        if (ioManager.keys.ctrl) {
          direction.y -= 1;
        }
      };

      _updateHorizontal(this.keysDirection);
      if (this.keysDirection.equals(zeroVector)) {
        if (localPlayer.hasAction('narutoRun')) {
          this.keysDirection.copy(cameraManager.lastNonzeroDirectionVector);
        }
      } else {
        cameraManager.lastNonzeroDirectionVector.copy(this.keysDirection);
      }
      
      if (localPlayer.hasAction('fly') || localPlayer.hasAction('swim')) {
        this.keysDirection.applyQuaternion(camera.quaternion);
        _updateVertical(this.keysDirection);
      } else {
        const _applyCameraRelativeKeys = () => {
          // get distance to the camera frustum planes
          const transformCameraFrustum = localFrustum.setFromProjectionMatrix(
            camera.projectionMatrix
          );
          // transform the planes to the camera
          for (const plane of transformCameraFrustum.planes) {
            plane.applyMatrix4(camera.matrixWorld);
          }
          // get the closest plane distance
          let closestDistance = Infinity;
          for (const plane of transformCameraFrustum.planes) {
            const distance = plane.distanceToPoint(localPlayer.position);
            if (distance < closestDistance) {
              closestDistance = distance;
            }
          }

          const transformCameraForwardDirection = localVector.set(0, 0, -1)
            .applyQuaternion(camera.quaternion);
          transformCameraForwardDirection.y = 0;
          if (transformCameraForwardDirection.x === 0 && transformCameraForwardDirection.z === 0) {
            transformCameraForwardDirection.z = -1;
          }
          transformCameraForwardDirection.normalize();
          const backQuaternion = localQuaternion2.setFromRotationMatrix(
            localMatrix.lookAt(zeroVector, transformCameraForwardDirection, upVector)
          );

          this.keysDirection.applyQuaternion(backQuaternion);
        };
        _applyCameraRelativeKeys();

        const _updateCrouch = () => {
          if (ioManager.keys.ctrl && !ioManager.lastCtrlKey && game.isGrounded()) {
            game.toggleCrouch();
          }
          ioManager.lastCtrlKey = ioManager.keys.ctrl;
        };
        _updateCrouch();
      }
      const physicsScene = physicsManager.getScene();
      if (physicsScene.getPhysicsEnabled() && this.movementEnabled) {
        const speed = game.getSpeed();
        const velocity = this.keysDirection.normalize().multiplyScalar(speed);
        localPlayer.characterPhysics.applyWasd(velocity, timeDiff);
      }
    }
  };

  updatePost() {
    ioManager.lastTeleport = ioManager.currentTeleport;
    ioManager.lastMenuDown = ioManager.currentMenuDown;
    ioManager.lastWeaponDown = ioManager.currentWeaponDown;
    ioManager.lastWeaponValue = ioManager.currentWeaponValue;
    ioManager.lastMenuExpanded = ioManager.menuExpanded;
    for (let i = 0; i < 2; i++) {
      ioManager.lastWeaponGrabs[i] = ioManager.currentWeaponGrabs[i];
    }
  };

  setMovementEnabled(newMovementEnabled) {
    this.movementEnabled = newMovementEnabled;
    if (!this.movementEnabled) {
      const localPlayer = metaversefile.useLocalPlayer();
      localPlayer.characterPhysics.applyWasd(zeroVector, 0);
    }
  };

  resetKeys() {
    for (const k in ioManager.keys) {
      ioManager.keys[k] = false;
    }
  };

  keydown(e) {
    if (this.inputFocused() || e.repeat) {
      return;
    }

    if (e.keyCode === 18) { // alt
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    switch (e.which) {
      case 9: { // tab
        break;
      }
      case 49: // 1
      case 50: // 2
      case 51: // 3
      case 52: // 4
      case 53: // 5
      case 54: // 6
      case 55: // 7
      case 56: // 8
        {
          game.selectLoadout(e.which - 49);
          break;
        }
      case 87: { // W
        ioManager.keys.up = true;
        game.setMovements();

        const now = performance.now();
        const timeDiff = now - this.lastKeysDownTime.keyW;
        if (timeDiff < doubleTapTime && ioManager.keys.shift) {
          ioManager.keys.doubleTap = true;
          game.menuDoubleTap();
        }
        this.lastKeysDownTime.keyW = now;
        this.lastKeysDownTime.keyS = 0;
        break;
      }
      case 65: { // A
        ioManager.keys.left = true;
        game.setMovements();

        const now = performance.now();
        const timeDiff = now - this.lastKeysDownTime.keyA;
        if (timeDiff < doubleTapTime && ioManager.keys.shift) {
          ioManager.keys.doubleTap = true;
          game.menuDoubleTap();
        }
        this.lastKeysDownTime.keyA = now;
        this.lastKeysDownTime.keyD = 0;
        break;
      }
      case 83: { // S
        if (e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();

          game.saveScene();
        } else {
          ioManager.keys.down = true;
          game.setMovements();

          const now = performance.now();
          const timeDiff = now - this.lastKeysDownTime.keyS;
          if (timeDiff < doubleTapTime && ioManager.keys.shift) {
            ioManager.keys.doubleTap = true;
            game.menuDoubleTap();
          }
          this.lastKeysDownTime.keyS = now;
          this.lastKeysDownTime.keyW = 0;
        }
        break;
      }
      case 68: { // D
        ioManager.keys.right = true;
        game.setMovements();

        const now = performance.now();
        const timeDiff = now - this.lastKeysDownTime.keyD;
        if (timeDiff < doubleTapTime && ioManager.keys.shift) {
          ioManager.keys.doubleTap = true;
          game.menuDoubleTap();
        }
        this.lastKeysDownTime.keyD = now;
        this.lastKeysDownTime.keyA = 0;
        break;

      }
      case 70: { // F
        e.preventDefault();
        e.stopPropagation();
        if (grabManager.canPush()) {
          ioManager.keys.forward = true;
        } else {
          game.toggleFly();
        }
        break;
      }
      case 88: { // X
        if (!e.ctrlKey) {
          game.menuDelete();
          grabManager.menuDelete();
        }
        break;
      }
      case 67: { // C
        if (grabManager.canPush()) {
          ioManager.keys.backward = true;
        } else {
          ioManager.keys.ctrl = true;
          game.toggleCrouch();
        }
        break;
      }
      case 71: { // G
        game.menuSwitchCharacter();
        break;
      }
      case 86: { // V
        e.preventDefault();
        e.stopPropagation();
        game.menuVDown(e);
        break;
      }
      case 66: { // B
        e.preventDefault();
        e.stopPropagation();
        game.menuBDown(e);
        break;
      }
      case 69: { // E
        const now = performance.now();
        const timeDiff = now - this.lastKeysDownTime.keyE;
        const canRotate = grabManager.canRotate();
        if (timeDiff < doubleTapTime && !canRotate) {
          game.menuMiddleToggle();
        } else {
          // game.menuMiddleUp();

          if (canRotate) {
            grabManager.menuRotate(-1);
          } else {
            game.menuActivateDown();
          }
        }
        this.lastKeysDownTime.keyE = now;
        break;
      }
      case 84: { // T
        e.preventDefault();
        e.stopPropagation();
        voiceInput.toggleMic();
        break;
      }
      case 89: { // Y
        e.preventDefault();
        e.stopPropagation();
        voiceInput.toggleSpeech();
        break;
      }
      case 82: { // R
        if (cameraManager.pointerLockElement) {
          if (grabManager.canRotate()) {
            grabManager.menuRotate(1);
          } else if (!e.ctrlKey) {
            game.dropSelectedApp();
          }
        }
        break;
      }
      case 16: { // shift
        ioManager.keys.shift = true;
        game.setSprint(true);
        break;
      }
      case 32: { // space
        ioManager.keys.space = true;
        game.jump();
        break;
      }
      case 81: { // Q
        if (e.ctrlKey) {
          if (cameraManager.pointerLockElement) {
            cameraManager.exitPointerLock();
          } else {
            cameraManager.requestPointerLock();
          }
        } else {
          // game.setWeaponWheel(true);
          if (game.canToggleAxis()) {
            game.toggleAxis();
          } else {
            // clear conflicting aim with quick menu
            game.menuUnaim();
          }
        }
        break;
      }
      case 74: { // J
        game.inventoryHack = !game.inventoryHack;
        break;
      }
      case 27: { // esc
        game.setContextMenu(false);
        break;
      }
      case 72: { // H
        const debug = metaversefile.useDebug();
        debug.toggle();
        break;
      }
      case 192: { // tilde
        grabManager.toggleEditMode();
        break;
      }
    }
  }

  keypress = e => {
    // nothing
  };

  wheel = e => {
    if (storyManager.handleWheel(e)) {
      // nothing
    } else {
      const physicsScene = physicsManager.getScene();
      // if (physicsScene.getPhysicsEnabled()) {
      //   const renderer = getRenderer();

      //   if (renderer && (e.target === renderer.domElement || e.target.id === 'app')) {
      //       cameraManager.handleWheelEvent(e);
      //   }
      if (physicsScene.getPhysicsEnabled() && getRenderer()) {
        cameraManager.handleWheelEvent(e);
      }
    }
  }

  keyup = e => {
    if (this.inputFocused() || e.repeat) {
      return;
    }

    if (e.keyCode === 18) { // alt
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    switch (e.which) {
      case 87: { // W
        ioManager.keys.up = false;
        game.setMovements();
        break;
      }
      case 65: { // A
        ioManager.keys.left = false;
        game.setMovements();
        break;
      }
      case 83: { // S
        ioManager.keys.down = false;
        game.setMovements();
        break;
      }
      case 68: { // D
        ioManager.keys.right = false;
        game.setMovements();
        break;
      }
      case 32: { // space
        ioManager.keys.space = false;
        break;
      }
      case 69: { // E
        if (cameraManager.pointerLockElement) {
          game.menuActivateUp();
        }
        break;
      }
      case 70: { // F
        ioManager.keys.forward = false;
        break;
      }
      case 67: { // C
        ioManager.keys.backward = false;
        ioManager.keys.ctrl = false;
        break;
      }
      case 86: { // V
        e.preventDefault();
        e.stopPropagation();
        game.menuVUp();
        break;
      }
      case 66: { // B
        e.preventDefault();
        e.stopPropagation();
        game.menuBUp();
        break;
      }
      case 16: { // shift
        ioManager.keys.shift = false;
        ioManager.keys.doubleTap = false;
       
        game.menuUnDoubleTap();
        game.setSprint(false);
        break;
      }
      case 46: { // delete
        const object = game.getMouseSelectedObject();
        if (object) {
          game.setMouseHoverObject(null);
          game.setMouseSelectedObject(null);
          world.removeObject(object.instanceId);
        } else if (!e.ctrlKey) {
          game.deleteSelectedApp();
        }
        break;
      }
      case 27: {
        game.setMouseSelectedObject(null);
      }
    }
  };

  mousemove = e => {
    if (cameraManager.pointerLockElement) {
        cameraManager.handleMouseMove(e);
    } else {
      if (game.dragging) {
        game.menuDrag(e);
        game.menuDragRight(e);
      }
    }
    raycastManager.setLastMouseEvent(e);
  };

  mouseleave = e => {
    const renderer = getRenderer();
    renderer.domElement.classList.remove('hover');
  };

  click = e => {
    console.log('click')
    if (cameraManager.pointerLockElement) {
      grabManager.menuClick(e);
    } else if (!game.hoverEnabled) {
      console.log('requesting pointer lock')
        cameraManager.requestPointerLock();
      }
    raycastManager.setLastMouseEvent(e);
  };

  dblclick = e => {
    // nothing
  };

  mousedown = e => {
    const changedButtons = this.lastMouseButtons ^ e.buttons;
    if (cameraManager.pointerLockElement) {
      if ((changedButtons & 1) && (e.buttons & 1)) { // left
        game.menuMouseDown();
      }
      if ((changedButtons & 2) && (e.buttons & 2)) { // right
        game.menuAim();
      }
    } else {
      if ((changedButtons & 1) && (e.buttons & 1)) { // left
        const raycaster = raycastManager.getMouseRaycaster(e);
        if (raycaster) {
          transformControls.handleMouseDown(raycaster);
        }
      }
      if ((changedButtons & 1) && (e.buttons & 2)) { // right
        game.menuDragdownRight();
        game.setContextMenu(false);
      }
    }
    if ((changedButtons & 4) && (e.buttons & 4)) { // middle
      e.preventDefault();
      if (!cameraManager.pointerLockElement) {
        cameraManager.requestPointerLock();
      }
      // game.menuMiddleDown();
    }
    this.lastMouseButtons = e.buttons;
    raycastManager.setLastMouseEvent(e);
  };

  mouseup = e => {
    const changedButtons = this.lastMouseButtons ^ e.buttons;
    if (cameraManager.pointerLockElement) {
      if ((changedButtons & 1) && !(e.buttons & 1)) { // left
        game.menuMouseUp();
      }
      if ((changedButtons & 2) && !(e.buttons & 2)) { // right
        game.menuUnaim();
      }
    } else {
      if ((changedButtons & 2) && !(e.buttons & 2)) { // right
        game.menuDragupRight();
      }
    }
    if ((changedButtons & 4) && !(e.buttons & 4)) { // middle
      // game.menuMiddleUp();
    }
    this.lastMouseButtons = e.buttons;
    raycastManager.setLastMouseEvent(e);
  };

  paste = e => {
    if (!window.document.activeElement) {
      const items = Array.from(e.clipboardData.items);
      if (items.length > 0) {
        e.preventDefault();
        console.log('paste items', items);
      }
    }
  };
}

const ioManager = new IoManager();

export default ioManager;