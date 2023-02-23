import {MathUtils} from 'three';
import loaders from '../loaders.js';
import {zbdecode} from '../../zjs/encoding.mjs';
// import physx from '../physics/avatarsWasmManager.js';
import avatarsWasmManager from './avatars-wasm-manager.js';
import {animationMappingConfig} from './AnimationMapping.js';

import {
  decorateAnimation,
} from './util.mjs';

import {
  angleDifference,
} from '../util.js';
import {VRMCurveMapper} from './VRMCurveMapper';

let animations;
let animationStepIndices;

const UseAnimationIndexes = {};

const emoteAnimations = {};

const animationsAngleArrays = {
  walk: [
    {name: 'left strafe walking.fbx', angle: Math.PI / 2},
    {name: 'right strafe walking.fbx', angle: -Math.PI / 2},

    {name: 'walking.fbx', angle: 0},
    {name: 'walking backwards.fbx', angle: Math.PI},

    // {name: 'left strafe walking reverse.fbx', angle: Math.PI*3/4},
    // {name: 'right strafe walking reverse.fbx', angle: -Math.PI*3/4},
  ],
  run: [
    {name: 'left strafe.fbx', angle: Math.PI / 2},
    {name: 'right strafe.fbx', angle: -Math.PI / 2},

    {name: 'Fast Run.fbx', angle: 0},
    {name: 'running backwards.fbx', angle: Math.PI},

    // {name: 'left strafe reverse.fbx', angle: Math.PI*3/4},
    // {name: 'right strafe reverse.fbx', angle: -Math.PI*3/4},
  ],
  crouch: [
    {name: 'Crouched Sneaking Left.fbx', angle: Math.PI / 2},
    {name: 'Crouched Sneaking Right.fbx', angle: -Math.PI / 2},

    {name: 'Sneaking Forward.fbx', angle: 0},
    {name: 'Sneaking Forward reverse.fbx', angle: Math.PI},

    // {name: 'Crouched Sneaking Left reverse.fbx', angle: Math.PI*3/4},
    // {name: 'Crouched Sneaking Right reverse.fbx', angle: -Math.PI*3/4},
  ],
};
const animationsAngleArraysMirror = {
  walk: [
    {name: 'left strafe walking reverse.fbx', matchAngle: -Math.PI / 2, angle: -Math.PI / 2},
    {name: 'right strafe walking reverse.fbx', matchAngle: Math.PI / 2, angle: Math.PI / 2},
  ],
  run: [
    {name: 'left strafe reverse.fbx', matchAngle: -Math.PI / 2, angle: -Math.PI / 2},
    {name: 'right strafe reverse.fbx', matchAngle: Math.PI / 2, angle: Math.PI / 2},
  ],
  crouch: [
    {name: 'Crouched Sneaking Left reverse.fbx', matchAngle: -Math.PI / 2, angle: -Math.PI / 2},
    {name: 'Crouched Sneaking Right reverse.fbx', matchAngle: Math.PI / 2, angle: Math.PI / 2},
  ],
};
const animationsIdleArrays = {
  reset: {name: 'reset.fbx'},
  walk: {name: 'idle.fbx'},
  run: {name: 'idle.fbx'},
  crouch: {name: 'Crouch Idle.fbx'},
};

const _normalizeAnimationDurations = (animations, baseAnimation, factor = 1) => {
  for (let i = 1; i < animations.length; i++) {
    const animation = animations[i];
    const oldDuration = animation.duration;
    const newDuration = baseAnimation.duration;
    for (const track of animation.tracks) {
      const {times} = track;
      for (let j = 0; j < times.length; j++) {
        times[j] *= newDuration / oldDuration * factor;
      }
    }
    animation.duration = newDuration * factor;
  }
};

async function loadAnimations() {
  const res = await fetch('/animations/animations.z');
  const arrayBuffer = await res.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const animationsJson = zbdecode(uint8Array);
  animations = animationsJson.animations; // .map(a => AnimationClip.parse(a));
  animationStepIndices = animationsJson.animationStepIndices;
  animations.index = {};
  for (const animation of animations) {
    animations.index[animation.name] = animation;

    animation.tracks.index = {};
    for (const track of animation.tracks) {
      animation.tracks.index[track.name] = track;
    }
  }
}

async function loadSkeleton() {
  const srcUrl = '/animations/animations-skeleton.glb';

  let o;
  try {
    o = await new Promise((resolve, reject) => {
      const {gltfLoader} = loaders;
      gltfLoader.load(srcUrl, () => {
        resolve();
      }, function onprogress() { }, reject);
    });
  } catch (err) {
    console.warn(err);
  }
  if (o) {
    // animationsBaseModel = o;
  }
}

let loadPromise = null;
export const waitForLoad = async () => {
  if (!loadPromise) {
    loadPromise = (async () => {
      await Promise.all([
        avatarsWasmManager.waitForLoad(),
        loadAnimations(),
        loadSkeleton(),
      ]);
    
      for (const k in animationsAngleArrays) {
        const as = animationsAngleArrays[k];
        for (const a of as) {
          a.animation = animations.index[a.name];
        }
      }
      for (const k in animationsAngleArraysMirror) {
        const as = animationsAngleArraysMirror[k];
        for (const a of as) {
          a.animation = animations.index[a.name];
        }
      }
      for (const k in animationsIdleArrays) {
        animationsIdleArrays[k].animation = animations.index[animationsIdleArrays[k].name];
      }
    
      const walkingAnimations = [
        'walking.fbx',
        'left strafe walking.fbx',
        'right strafe walking.fbx',
      ].map(name => animations.index[name]);
      const walkingBackwardAnimations = [
        'walking backwards.fbx',
        'left strafe walking reverse.fbx',
        'right strafe walking reverse.fbx',
      ].map(name => animations.index[name]);
      const runningAnimations = [
        'Fast Run.fbx',
        'left strafe.fbx',
        'right strafe.fbx',
      ].map(name => animations.index[name]);
      const runningBackwardAnimations = [
        'running backwards.fbx',
        'left strafe reverse.fbx',
        'right strafe reverse.fbx',
      ].map(name => animations.index[name]);
      const crouchingForwardAnimations = [
        'Sneaking Forward.fbx',
        'Crouched Sneaking Left.fbx',
        'Crouched Sneaking Right.fbx',
      ].map(name => animations.index[name]);
      const crouchingBackwardAnimations = [
        'Sneaking Forward reverse.fbx',
        'Crouched Sneaking Left reverse.fbx',
        'Crouched Sneaking Right reverse.fbx',
      ].map(name => animations.index[name]);
      for (const animation of animations) {
        decorateAnimation(animation);
      }
    
      _normalizeAnimationDurations(walkingAnimations, walkingAnimations[0]);
      _normalizeAnimationDurations(walkingBackwardAnimations, walkingBackwardAnimations[0]);
      _normalizeAnimationDurations(runningAnimations, runningAnimations[0]);
      _normalizeAnimationDurations(runningBackwardAnimations, runningBackwardAnimations[0]);
      _normalizeAnimationDurations(crouchingForwardAnimations, crouchingForwardAnimations[0], 0.5);
      _normalizeAnimationDurations(crouchingBackwardAnimations, crouchingBackwardAnimations[0], 0.5);
    
      /* function mergeAnimations(a, b) {
        const o = {};
        for (const k in a) {
          o[k] = a[k];
        }
        for (const k in b) {
          o[k] = b[k];
        }
        return o;
      } */
      /* jumpAnimationSegments = {
          chargeJump: animations.find(a => a.isChargeJump),
          chargeJumpFall: animations.find(a => a.isChargeJumpFall),
          isFallLoop: animations.find(a => a.isFallLoop),
          isLanding: animations.find(a => a.isLanding)
        }; */
    
      // chargeJump = animations.find(a => a.isChargeJump);
      // standCharge = animations.find(a => a.isStandCharge);
      // fallLoop = animations.find(a => a.isFallLoop);
      // swordSideSlash = animations.find(a => a.isSwordSideSlash);
      // swordTopDownSlash = animations.find(a => a.isSwordTopDownSlash)
    
      initAnimationSystem();
    })();
  }
};

const initAnimationSystem = () => {
  for (const spec of animationMappingConfig) {
    avatarsWasmManager.physxWorker.createAnimationMapping(
      spec.isPosition,
      spec.index,
      spec.isTop,
      spec.isArm,
      spec.boneName,
    );
  }

  let animationIndex = 0;
  for (const fileName in animations.index) {
    const animation = animations.index[fileName];
    animation.index = animationIndex;
    const animationPtr = avatarsWasmManager.physxWorker.createAnimation(animation.name, animation.duration);
    animation.ptr = animationPtr;
    // for (const k in animation.interpolants) { // maybe wrong interpolant index order
    for (const spec of animationMappingConfig) { // correct interpolant index order
      const {
        animationTrackName: k,
      } = spec;

      const track = animation.tracks.index[k];
      const valueSize = track.type === 'vector' ? 3 : 4;
      avatarsWasmManager.physxWorker.createAnimationInterpolant(
        animationPtr,
        track.times,
        track.values,
        valueSize,
      );
    }
    animationIndex++;
  }

  //

  const animationGroupDeclarations = avatarsWasmManager.physxWorker.initAnimationSystem();

  // get data back from wasm to js ------------------------------------------------

  // UseAnimationIndexes
  const useAnimationGroupDeclaration = animationGroupDeclarations.filter(n => n.name === 'use')[0];
  useAnimationGroupDeclaration.animations.forEach(animationDeclaration => {
    UseAnimationIndexes[animationDeclaration.keyName] = animationDeclaration.index;
  });

  // EmoteAnimationIndexes
  const emoteAnimationGroupDeclaration = animationGroupDeclarations.filter(n => n.name === 'emote')[0];

  // ---

  // emoteAnimations
  emoteAnimationGroupDeclaration.animations.forEach(animationDeclaration => {
    emoteAnimations[animationDeclaration.keyName] = animations.index[animationDeclaration.fileName];
  });

  // end: get data back from wasm to js ------------------------------------------------
};

export const _createAnimation = avatar => {
  avatar.mixerPtr = avatarsWasmManager.physxWorker.createAnimationMixer();
  avatar.animationAvatarPtr = avatarsWasmManager.physxWorker.createAnimationAvatar(avatar.mixerPtr);
};

export const _updateAnimation = (avatar, now, timeDiff) => {
  const nowS = now / 1000;
  const landTimeS = nowS - avatar.lastLandStartTime / 1000 + 0.8; // in order to align landing 2.fbx with walk/run
  const timeSinceLastMove = now - avatar.lastMoveTime;
  const timeSinceLastMoveS = timeSinceLastMove / 1000;

  if (avatar.emoteAnimation !== avatar.lastEmoteAnimation) {
    avatar.lastEmoteTime = avatar.emoteAnimation ? now : 0;
  }
  avatar.lastEmoteAnimation = avatar.emoteAnimation;

  const angle = avatar.getAngle();
  const _getMirrorAnimationAngles = (animationAngles, key) => {
    const animations = animationAngles.map(({animation}) => animation);
    const animationAngleArrayMirror = animationsAngleArraysMirror[key];

    const backwardIndex = animations.findIndex(a => a.isBackward);
    if (backwardIndex !== -1) {
      // const backwardAnimationAngle = animationAngles[backwardIndex];
      // const angleToBackwardAnimation = Math.abs(angleDifference(angle, backwardAnimationAngle.angle));
      // if (angleToBackwardAnimation < Math.PI * 0.3) {
      const sideIndex = backwardIndex === 0 ? 1 : 0;
      const wrongAngle = animationAngles[sideIndex].angle;
      const newAnimationAngle = animationAngleArrayMirror.find(animationAngle => animationAngle.matchAngle === wrongAngle);
      animationAngles = animationAngles.slice();
      animationAngles[sideIndex] = newAnimationAngle;
      // animations[sideIndex] = newAnimationAngle.animation;
      // return {
      // return animationAngles;
      // angleToBackwardAnimation,
      // };
      // }
    }
    // return {
    return animationAngles;
    // angleToBackwardAnimation: Infinity,
    // ;
  };
  const _getAngleToBackwardAnimation = animationAngles => {
    const animations = animationAngles.map(({animation}) => animation);

    const backwardIndex = animations.findIndex(a => a.isBackward);
    if (backwardIndex !== -1) {
      const backwardAnimationAngle = animationAngles[backwardIndex];
      const angleToBackwardAnimation = Math.abs(angleDifference(angle, backwardAnimationAngle.angle));
      return angleToBackwardAnimation;
    } else {
      return Infinity;
    }
  };
  const keyWalkAnimationAngles = getClosest2AnimationAngles('walk', angle);
  const keyWalkAnimationAnglesMirror = _getMirrorAnimationAngles(keyWalkAnimationAngles, 'walk');
  const isBackward = _getAngleToBackwardAnimation(keyWalkAnimationAnglesMirror) < Math.PI * 0.4;
  if (isBackward !== avatar.lastIsBackward) {
    avatar.backwardAnimationSpec = {
      startFactor: avatar.lastBackwardFactor,
      endFactor: isBackward ? 1 : 0,
      startTime: now,
      endTime: now + 150,
    };
    avatar.lastIsBackward = isBackward;
  }
  let mirrorFactor;
  if (avatar.backwardAnimationSpec) {
    const f = (now - avatar.backwardAnimationSpec.startTime) / (avatar.backwardAnimationSpec.endTime - avatar.backwardAnimationSpec.startTime);
    if (f >= 1) {
      mirrorFactor = avatar.backwardAnimationSpec.endFactor;
      avatar.backwardAnimationSpec = null;
    } else {
      mirrorFactor = avatar.backwardAnimationSpec.startFactor +
        Math.pow(
          f,
          0.5,
        ) * (avatar.backwardAnimationSpec.endFactor - avatar.backwardAnimationSpec.startFactor);
    }
  } else {
    mirrorFactor = isBackward ? 1 : 0;
  }
  avatar.lastBackwardFactor = mirrorFactor;

  const updateValues = () => {
    const forwardFactor = 1 - MathUtils.clamp(Math.abs(angle) / (Math.PI / 2), 0, 1);
    const backwardFactor = 1 - MathUtils.clamp((Math.PI - Math.abs(angle)) / (Math.PI / 2), 0, 1);
    const leftFactor = 1 - MathUtils.clamp(Math.abs(angle - Math.PI / 2) / (Math.PI / 2), 0, 1);
    const rightFactor = 1 - MathUtils.clamp(Math.abs(angle - -Math.PI / 2) / (Math.PI / 2), 0, 1);
    // const mirrorFactor = MathUtils.clamp((Math.abs(angle) - Math.PI / 2) / (Math.PI / 4), 0, 1);
    const mirrorFactorReverse = 1 - mirrorFactor;
    const mirrorLeftFactor = mirrorFactor * leftFactor;
    const mirrorRightFactor = mirrorFactor * rightFactor;
    const mirrorLeftFactorReverse = mirrorFactorReverse * leftFactor;
    const mirrorRightFactorReverse = mirrorFactorReverse * rightFactor;

    const useAnimationComboName = avatar.useAnimationCombo[avatar.useAnimationIndex];

    const values = [
      forwardFactor,
      backwardFactor,
      leftFactor,
      rightFactor,
      mirrorLeftFactorReverse,
      mirrorLeftFactor,
      mirrorRightFactorReverse,
      mirrorRightFactor,

      avatar.idleWalkFactor,
      avatar.walkRunFactor,
      avatar.movementsTransitionFactor,
      avatar.movementsTime,

      avatar.landWithMoving,
      avatar.lastEmoteTime,
      avatar.useAnimationEnvelope.length,

      UseAnimationIndexes[avatar.useAnimation] ?? -1,
      UseAnimationIndexes[useAnimationComboName] ?? -1,
      UseAnimationIndexes[avatar.unuseAnimation] ?? -1,
      avatar.fallLoopFromJump,
      landTimeS,
      timeSinceLastMoveS,
    ];
    avatar.useAnimationEnvelope.forEach(useAnimationEnvelopeName => {
      values.push(UseAnimationIndexes[useAnimationEnvelopeName] || 0);
    });
    avatarsWasmManager.physxWorker.updateAnimationAvatar(avatar.animationAvatarPtr, values, timeDiff);
  };
  updateValues();

  let resultValues;
  const doUpdate = () => {
    resultValues = avatarsWasmManager.physxWorker.updateAnimationMixer(avatar.mixerPtr, now, nowS);
    let index = 0;
    for (const spec of avatar.animationMappings) {
      const {
        // animationTrackName: k,
        dst,
        // isTop,
        isPosition,
      } = spec;

      const result = resultValues[index];
      dst.fromArray(result);

      // ignore all animation position except y
      if (isPosition) {
        if (avatar.flyState || avatar.jumpState || avatar.doubleJumpState || avatar.fallLoopState) { // in air
          // force height in the jump case to overide the animation
          dst.y = avatar.height * 0.55;
        } else {
          // animations position is height-relative
          dst.y *= avatar.height; // XXX avatar could be made perfect by measuring from foot to hips instead
        }
      }

      index++;
    }
  };
  doUpdate();
};

export {
  animations,
  animationStepIndices,
  emoteAnimations,
  // cubicBezier,
};

export const getClosest2AnimationAngles = (key, angle) => {
  const animationAngleArray = animationsAngleArrays[key];
  animationAngleArray.sort((a, b) => {
    const aDistance = Math.abs(angleDifference(angle, a.angle));
    const bDistance = Math.abs(angleDifference(angle, b.angle));
    return aDistance - bDistance;
  });
  const closest2AnimationAngles = animationAngleArray.slice(0, 2);
  return closest2AnimationAngles;
};

export const _findArmature = bone => {
  for (; ; bone = bone.parent) {
    if (!bone.isBone) {
      return bone;
    }
  }
  // return null; // can't happen
};

// export const _getLerpFn = isPosition => isPosition ? Vector3.prototype.lerp : Quaternion.prototype.slerp;

export function getFirstPersonCurves(vrmExtension) {
  const DEG2RAD = Math.PI / 180; // MathUtils.DEG2RAD;
  function _importCurveMapperBone(map) {
    return new VRMCurveMapper(
      typeof map.xRange === 'number' ? DEG2RAD * map.xRange : undefined,
      typeof map.yRange === 'number' ? DEG2RAD * map.yRange : undefined,
      map.curve,
    );
  }
  if (vrmExtension) {
    const isVrmVersion0 = parseFloat(vrmExtension.specVersion) < 1;
    let lookAtHorizontalInner;
    let lookAtHorizontalOuter;
    let lookAtVerticalDown;
    let lookAtVerticalUp;
    // let lookAtTypeName;
    if (isVrmVersion0) {
      const {firstPerson} = vrmExtension;
      lookAtHorizontalInner = firstPerson.lookAtHorizontalInner;
      lookAtHorizontalOuter = firstPerson.lookAtHorizontalOuter;
      lookAtVerticalDown = firstPerson.lookAtVerticalDown;
      lookAtVerticalUp = firstPerson.lookAtVerticalUp;
    } else {
      const {lookAt} = vrmExtension;
      lookAtHorizontalInner = lookAt.rangeMapHorizontalInner;
      lookAtHorizontalOuter = lookAt.rangeMapHorizontalOuter;
      lookAtVerticalDown = lookAt.rangeMapVerticalDown;
      lookAtVerticalUp = lookAt.rangeMapVerticalUp;
    }

    const lookAtHorizontalInnerCurve = _importCurveMapperBone(lookAtHorizontalInner);
    const lookAtHorizontalOuterCurve = _importCurveMapperBone(lookAtHorizontalOuter);
    const lookAtVerticalDownCurve = _importCurveMapperBone(lookAtVerticalDown);
    const lookAtVerticalUpCurve = _importCurveMapperBone(lookAtVerticalUp);
    return {
      lookAtHorizontalInnerCurve,
      lookAtHorizontalOuterCurve,
      lookAtVerticalDownCurve,
      lookAtVerticalUpCurve,
    };
  } else {
    return null;
  }
}

/* const _localizeMatrixWorld = bone => {
  bone.matrix.copy(bone.matrixWorld);
  if (bone.parent) {
    bone.matrix.premultiply(bone.parent.matrixWorld.clone().invert());
  }
  bone.matrix.decompose(bone.position, bone.quaternion, bone.scale);

  for (let i = 0; i < bone.children.length; i++) {
    _localizeMatrixWorld(bone.children[i]);
  }
}; */

// const crouchMagnitude = 0.2;
/* const animationsSelectMap = {
  crouch: {
    'Crouch Idle.fbx': new Vector3(0, 0, 0),
    'Sneaking Forward.fbx': new Vector3(0, 0, -crouchMagnitude),
    'Sneaking Forward reverse.fbx': new Vector3(0, 0, crouchMagnitude),
    'Crouched Sneaking Left.fbx': new Vector3(-crouchMagnitude, 0, 0),
    'Crouched Sneaking Right.fbx': new Vector3(crouchMagnitude, 0, 0),
  },
  stand: {
    'idle.fbx': new Vector3(0, 0, 0),
    'jump.fbx': new Vector3(0, 1, 0),

    'left strafe walking.fbx': new Vector3(-0.5, 0, 0),
    'left strafe.fbx': new Vector3(-1, 0, 0),
    'right strafe walking.fbx': new Vector3(0.5, 0, 0),
    'right strafe.fbx': new Vector3(1, 0, 0),

    'Fast Run.fbx': new Vector3(0, 0, -1),
    'walking.fbx': new Vector3(0, 0, -0.5),

    'running backwards.fbx': new Vector3(0, 0, 1),
    'walking backwards.fbx': new Vector3(0, 0, 0.5),

    'left strafe walking reverse.fbx': new Vector3(-Infinity, 0, 0),
    'left strafe reverse.fbx': new Vector3(-Infinity, 0, 0),
    'right strafe walking reverse.fbx': new Vector3(Infinity, 0, 0),
    'right strafe reverse.fbx': new Vector3(Infinity, 0, 0),
  },
};
const animationsDistanceMap = {
  'idle.fbx': new Vector3(0, 0, 0),
  'jump.fbx': new Vector3(0, 1, 0),

  'left strafe walking.fbx': new Vector3(-0.5, 0, 0),
  'left strafe.fbx': new Vector3(-1, 0, 0),
  'right strafe walking.fbx': new Vector3(0.5, 0, 0),
  'right strafe.fbx': new Vector3(1, 0, 0),

  'Fast Run.fbx': new Vector3(0, 0, -1),
  'walking.fbx': new Vector3(0, 0, -0.5),

  'running backwards.fbx': new Vector3(0, 0, 1),
  'walking backwards.fbx': new Vector3(0, 0, 0.5),

  'left strafe walking reverse.fbx': new Vector3(-1, 0, 1).normalize().multiplyScalar(2),
  'left strafe reverse.fbx': new Vector3(-1, 0, 1).normalize().multiplyScalar(3),
  'right strafe walking reverse.fbx': new Vector3(1, 0, 1).normalize().multiplyScalar(2),
  'right strafe reverse.fbx': new Vector3(1, 0, 1).normalize().multiplyScalar(3),

  'Crouch Idle.fbx': new Vector3(0, 0, 0),
  'Sneaking Forward.fbx': new Vector3(0, 0, -crouchMagnitude),
  'Sneaking Forward reverse.fbx': new Vector3(0, 0, crouchMagnitude),
  'Crouched Sneaking Left.fbx': new Vector3(-crouchMagnitude, 0, 0),
  'Crouched Sneaking Left reverse.fbx': new Vector3(-crouchMagnitude, 0, crouchMagnitude),
  'Crouched Sneaking Right.fbx': new Vector3(crouchMagnitude, 0, 0),
  'Crouched Sneaking Right reverse.fbx': new Vector3(crouchMagnitude, 0, crouchMagnitude),
}; */

/* const _findBoneDeep = (bones, boneName) => {
  for (let i = 0; i < bones.length; i++) {
    const bone = bones[i];
    if (bone.name === boneName) {
      return bone;
    } else {
      const deepBone = _findBoneDeep(bone.children, boneName);
      if (deepBone) {
        return deepBone;
      }
    }
  }
  return null;
}; */

/* const copySkeleton = (src, dst) => {
  for (let i = 0; i < src.bones.length; i++) {
    const srcBone = src.bones[i];
    const dstBone = _findBoneDeep(dst.bones, srcBone.name);
    dstBone.matrixWorld.copy(srcBone.matrixWorld);
  }

  // const armature = dst.bones[0].parent;
  // _localizeMatrixWorld(armature);

  dst.calculateInverses();
}; */

/* const _exportBone = bone => {
  return [bone.name, bone.position.toArray().concat(bone.quaternion.toArray()).concat(bone.scale.toArray()), bone.children.map(b => _exportBone(b))];
};
const _exportSkeleton = skeleton => {
  const hips = _findHips(skeleton);
  const armature = _findArmature(hips);
  return JSON.stringify(_exportBone(armature));
};
const _importObject = (b, Cons, ChildCons) => {
  const [name, array, children] = b;
  const bone = new Cons();
  bone.name = name;
  bone.position.fromArray(array, 0);
  bone.quaternion.fromArray(array, 3);
  bone.scale.fromArray(array, 3+4);
  for (let i = 0; i < children.length; i++) {
    bone.add(_importObject(children[i], ChildCons, ChildCons));
  }
  return bone;
};
const _importArmature = b => _importObject(b, Object3D, Bone);
const _importSkeleton = s => {
  const armature = _importArmature(JSON.parse(s));
  return new Skeleton(armature.children);
}; */