/* utils to bind characters to their avatars
set the avatar state from the character state */

import * as THREE from 'three';
import Avatar from './avatars/avatars.js';
import {
  getEyePosition,
} from './avatars/util.mjs';
import physx from './physics/physx.js';
import avatarsWasmManager from './avatars/avatars-wasm-manager.js';
// import {playersManager} from './players-manager.js';

// const appSymbol = 'app'; // Symbol('app');
const avatarSymbol = 'avatar'; // Symbol('avatar');
const maxMirrorDistanace = 3;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localPlane = new THREE.Plane();

export function applyCharacterTransformsToAvatar(character, session, rig) {
  if (!session) {
    rig.inputs.hmd.position.copy(character.avatarBinding.position);
    rig.inputs.hmd.quaternion.copy(character.avatarBinding.quaternion);
    rig.inputs.leftGamepad.position.copy(character.leftHand.position);
    rig.inputs.leftGamepad.quaternion.copy(character.leftHand.quaternion);
    rig.inputs.rightGamepad.position.copy(character.rightHand.position);
    rig.inputs.rightGamepad.quaternion.copy(character.rightHand.quaternion);
  }
}
export function applyCharacterMetaTransformsToAvatar(character, session, rig) {
  if (!session) {
    rig.velocity.copy(character.avatarBinding.velocity);
  }
}
export function applyCharacterModesToAvatar(character, session, rig) {
  for (let i = 0; i < 2; i++) {
    rig.setHandEnabled(i, character.hands[i].enabled);
  }
  rig.setTopEnabled(
    (!!session && (rig.inputs.leftGamepad.enabled || rig.inputs.rightGamepad.enabled)),
  );
  rig.setBottomEnabled(
    (
      rig.getTopEnabled() /* ||
      rig.getHandEnabled(0) ||
      rig.getHandEnabled(1) */
    ) &&
    rig.velocity.length() < 0.001,
  );
}
/* const _getPlayerByAppInstanceId = instanceId => {
  const remotePlayers = playersManager.getRemotePlayers(); // Might have to be removed too
  const localPlayer = playersManager.getLocalPlayer();
  const result = localPlayer.appManager.getAppByInstanceId(instanceId);
  if (result) {
    return localPlayer;
  } else {
    for (const remotePlayer in remotePlayers) {
      if (remotePlayer.appManager.getAppByInstanceId(instanceId)) {
        return remotePlayer;
      }
    }
  }
}; */
export function makeAvatar(app, environmentManager) {
  if (app?.appType === 'vrm') {
    // if (!app.avatarQuality) {
    //   console.warn('no avatar quality set', app);
    //   debugger;
    // }
    const avatar = new Avatar(app.avatarQuality, {
      fingers: true,
      hair: true,
      visemes: true,
      debug: false,
      environmentManager,
    });
    // avatar[appSymbol] = app;

    // unFrustumCull(app);
    // enableShadows(app);

    return avatar;
  } else {
    debugger;
    throw new Error('invalid app type for avatar');
  }
}
export function applyCharacterActionsToAvatar(character, rig) {
  const jumpAction = character.actionManager.getActionType('jump');
  const doubleJumpAction = character.actionManager.getActionType('doubleJump');
  const landAction = character.actionManager.getActionType('land');
  const flyAction = character.actionManager.getActionType('fly');
  const swimAction = character.actionManager.getActionType('swim');
  const useAction = character.actionManager.getActionType('use');
  const pickUpAction = character.actionManager.getActionType('pickUp');
  const narutoRunAction = character.actionManager.getActionType('narutoRun');
  const sitAction = character.actionManager.getActionType('sit');
  // const sitAnimation = sitAction ? sitAction.animation : '';
  // const danceAction = character.actionManager.getActionType('dance');
  // const danceAnimation = danceAction ? danceAction.animation : '';
  const emoteAction = character.actionManager.getActionType('emote');
  const emoteAnimation = emoteAction ? emoteAction.animation : '';
  // const throwAction = character.actionManager.getActionType('throw');
  const aimAction = character.actionManager.getActionType('aim');
  const crouchAction = character.actionManager.getActionType('crouch');
  const wearAction = character.actionManager.getActionType('wear');
  // const chargeJump = character.actionManager.getActionType('chargeJump');
  // const chargeJumpAnimation = chargeJump ? chargeJump.animation : '';
  // const standCharge = character.actionManager.getActionType('standCharge');
  // const standChargeAnimation = standCharge ? standCharge.animation : '';
  const fallLoopAction = character.actionManager.getActionType('fallLoop');
  // const fallLoopAnimation = fallLoopAction ? fallLoopAction.animation : '';
  // const hurtAction = character.actionManager.getActionType('hurt');
  // const swordSideSlash = character.actionManager.getActionType('swordSideSlash');
  // const swordSideSlashAnimation = swordSideSlash ? swordSideSlash.animation : '';
  // const swordTopDownSlash = character.actionManager.getActionType('swordTopDownSlash');
  // const swordTopDownSlashAnimation = swordTopDownSlash ? swordTopDownSlash.animation : '';

  rig.jumpState = !!jumpAction;
  // rig.jumpTime = character.actionInterpolants.jump.get();
  rig.doubleJumpState = !!doubleJumpAction;
  // rig.doubleJumpTime = character.actionInterpolants.doubleJump.get();
  // rig.landTime = character.actionInterpolants.land.get();
  rig.lastLandStartTime = landAction ? landAction.time : 0;
  rig.landWithMoving = landAction?.isMoving;
  rig.flyState = !!flyAction;
  // rig.flyTime = flyAction ? character.actionInterpolants.fly.get() : -1;
  // rig.activateTime = character.actionInterpolants.activate.get();
  rig.swimState = !!swimAction;
  // rig.swimTime = swimAction ? character.actionInterpolants.swim.get() : -1;
  
  const _handleUse = () => {
    if (useAction?.animation) {
      rig.useAnimation = useAction.animation;
    } else {
      if (rig.useAnimation) {
        rig.useAnimation = '';
      }
    }
    if (useAction?.animationCombo) {
      rig.useAnimationCombo = useAction.animationCombo;
    } else {
      if (rig.useAnimationCombo.length > 0) {
        rig.useAnimationCombo = [];
      }
    }
    if (useAction?.animationEnvelope) {
      rig.useAnimationEnvelope = useAction.animationEnvelope;
    } else {
      if (rig.useAnimationEnvelope.length > 0) {
        rig.useAnimationEnvelope = [];
      }
    }
    rig.useAnimationIndex = useAction?.index;
    // rig.useTime = character.actionInterpolants.use.get();
    rig.unuseTime = avatarsWasmManager.physxWorker.getActionInterpolantAnimationAvatar(character.avatar.animationAvatarPtr, 'unuse', 0);
    if (rig.unuseTime === 0) { // this means use is active
      if (useAction?.animationEnvelope) {
        rig.unuseAnimation = rig.useAnimationEnvelope[2]; // the last animation in the triplet is the unuse animation
      } else {
        rig.unuseAnimation = null;
      }
    }
  };
  _handleUse();

  // const _handlePickUp = () => {
  //   rig.pickUpState = !!pickUpAction;
  //   rig.pickUpTime = character.actionInterpolants.pickUp.get();
  // };
  // _handlePickUp();

  rig.manuallySetMouth  = character.avatarFace.manuallySetMouth;
  rig.vowels[1] = character.avatarFace.manuallySetMouth ? 0 : rig.vowels[1];
  rig.vowels[2] = character.avatarFace.manuallySetMouth ? 0 : rig.vowels[2];
  rig.vowels[3] = character.avatarFace.manuallySetMouth ? 0 : rig.vowels[3];
  rig.vowels[4] = character.avatarFace.manuallySetMouth ? 0 : rig.vowels[4];

  rig.narutoRunState = !!narutoRunAction && !crouchAction;
  // rig.narutoRunTime = character.actionInterpolants.narutoRun.get();
  rig.aimState = !!aimAction;
  // rig.aimTime = character.actionInterpolants.aim.get();
  rig.aimRightTransitionTime = avatarsWasmManager.physxWorker.getActionInterpolantAnimationAvatar(rig.animationAvatarPtr, 'aimRightTransition', 0);
  rig.aimLeftTransitionTime = avatarsWasmManager.physxWorker.getActionInterpolantAnimationAvatar(rig.animationAvatarPtr, 'aimLeftTransition', 0);
  // rig.aimAnimation = (aimAction?.characterAnimation) || '';
  // rig.aimDirection.set(0, 0, -1);
  // aimAction && rig.aimDirection.applyQuaternion(rig.inputs.hmd.quaternion);
  // rig.sitState = !!sitAction;
  // rig.sitAnimation = sitAnimation;

  // XXX this needs to be based on the current loadout index
  rig.holdState = wearAction?.holdAnimation === 'pick_up_idle';
  if (rig.holdState) rig.unuseAnimation = null;
  // rig.danceState = !!danceAction;
  // rig.danceFactor = character.actionInterpolants.dance.get();
  // if (danceAction) {
  //   rig.danceAnimation = danceAnimation;
  // }
  // rig.emoteFactor = character.actionInterpolants.emote.get();
  rig.emoteAnimation = emoteAnimation;
  // rig.throwState = !!throwAction;
  // rig.throwTime = character.actionInterpolants.throw.get();
  // rig.crouchTime = character.actionInterpolants.crouch.getInverse();
  // rig.chargeJumpTime = character.actionInterpolants.chargeJump.get();
  // rig.chargeAnimation = chargeJumpAnimation;
  // rig.chargeJumpState = !!chargeJump;
  // rig.standChargeTime = character.actionInterpolants.standCharge.get();
  // rig.standChargeAnimation = standChargeAnimation;
  // rig.standChargeState = !!standCharge;
  // rig.fallLoopTime = character.actionInterpolants.fallLoop.get();
  // rig.fallLoopFactor = character.actionInterpolants.fallLoopTransition.getNormalized();
  rig.fallLoopFromJump = fallLoopAction?.from === 'jump';
  // rig.fallLoopAnimation = fallLoopAnimation;
  rig.fallLoopState = !!fallLoopAction;
  rig.landState = !!landAction;
  // rig.swordSideSlashTime = character.actionInterpolants.swordSideSlash.get();
  // rig.swordSideSlashAnimation = swordSideSlashAnimation;
  // rig.swordSideSlashState = !!swordSideSlash;
  // rig.swordTopDownSlashTime = character.actionInterpolants.swordTopDownSlash.get();
  // rig.swordTopDownSlashAnimation = swordTopDownSlashAnimation;
  // rig.swordTopDownSlashState = !!swordTopDownSlash;
  // rig.hurtAnimation = (hurtAction?.animation) || '';
  // rig.hurtTime = character.actionInterpolants.hurt.get();
  // rig.movementsTime = character.actionInterpolants.movements.get();
  // rig.movementsTransitionTime = character.actionInterpolants.movementsTransition.get();
  // rig.sprintTime = character.actionInterpolants.sprint.get();
}
// returns whether headTarget were applied
export function applyCharacterHeadTargetToAvatar(character, rig) {
  if (character.headTargetEnabled) {
    rig.headTarget.copy(character.headTarget);
    rig.headTargetInverted = character.headTargetInverted;
    rig.headTargetEnabled = true;
    return true;
  } else {
    rig.headTargetEnabled = false;
    return false;
  }
}
// returns whether eyes(eyeballs) were applied
export function applyCharacterEyesToAvatar(character, rig) {
  if (character.eyeballTargetEnabled) {
    rig.eyeballTarget.copy(character.eyeballTarget);
    rig.eyeballTargetEnabled = true;
    return true;
  } else {
    rig.eyeballTargetEnabled = false;
    return false;
  }
}
export function applyMirrorsToAvatar(character, rig, mirrors) {
  rig.eyeballTargetEnabled = false;

  if (!mirrors) {
    debugger;
  }

  const closestMirror = mirrors.sort((a, b) => {
    const aDistance = character.position.distanceTo(a.position);
    const bDistance = character.position.distanceTo(b.position);
    return aDistance - bDistance;
  })[0];
  if (closestMirror) {
    // console.log('character bind mirror', closestMirror);
    const mirrorPosition = localVector2.setFromMatrixPosition(closestMirror.matrixWorld);

    if (mirrorPosition.distanceTo(character.position) < maxMirrorDistanace) {
      const eyePosition = getEyePosition(rig.modelBones);
      localPlane
        .setFromNormalAndCoplanarPoint(
          localVector.set(0, 0, 1)
            .applyQuaternion(localQuaternion.setFromRotationMatrix(closestMirror.matrixWorld)),
          mirrorPosition,
        )
        .projectPoint(eyePosition, rig.eyeballTarget);
      rig.eyeballTargetEnabled = true;
    }
  }
}
export function applyFacePoseToAvatar(character, rig) {
  const facePoseActions = character.actionManager.getActionsArray().filter(a => a.type === 'facepose');
  if (facePoseActions.length > 0) {
    character.avatar.faceposes = facePoseActions;
  } else {
    if (character.avatar.faceposes.length !== 0) {
      character.avatar.faceposes.length = 0;
    }
  }
}
export function applyCharacterPoseToAvatar(character, rig) {
  const poseAction = character.actionManager.getActionType('pose');
  rig.poseAnimation = poseAction?.animation || null;
}
export function applyCharacterToAvatar(character, session, rig, mirrors) {
  applyCharacterTransformsToAvatar(character, session, rig);
  applyCharacterMetaTransformsToAvatar(character, session, rig);
  
  applyCharacterModesToAvatar(character, session, rig);
  applyCharacterActionsToAvatar(character, rig);
  applyCharacterHeadTargetToAvatar(character, rig);
  applyCharacterEyesToAvatar(character, rig) ||
    applyMirrorsToAvatar(character, rig, mirrors);
  
  applyFacePoseToAvatar(character, rig);
  applyCharacterPoseToAvatar(character, rig);
}

export function switchAvatar(oldAvatar, newApp, environmentManager) {
  let result;

  oldAvatar && oldAvatar[appSymbol].removeComponent('controlled');

  if (newApp) {
    newApp.setComponent('controlled', true);

    if (!newApp[avatarSymbol]) {
      newApp[avatarSymbol] = makeAvatar(newApp, environmentManager);
    } else {
      throw new Error('already had an avatar');
    }
    result = newApp[avatarSymbol];
  } else {
    result = null;
  }
  return result;
}