/*
physx wasm integration.
*/

import * as THREE from 'three';
import Module from '../../../public/avatars-wasm.js';
import {Allocator, ScratchStack} from '../geometry-util.js';
// import {heightfieldScale} from './constants.js';

// const maxNumUpdates = 256;
// const localVector = new THREE.Vector3()
// const localVector2 = new THREE.Vector3()
// const localQuaternion = new THREE.Quaternion()

// const capsuleUpQuaternion = new THREE.Quaternion().setFromAxisAngle(
//   new THREE.Vector3(0, 0, 1),
//   Math.PI / 2
// )
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const physx = {};

let loadPromise = null;
let scratchStack = null;
physx.loaded = false;
physx.waitForLoad =  () => {
  if (!loadPromise) {
    loadPromise = (async () => {
      await Module.waitForLoad();

      Module._initialize();

      const scratchStackSize = 8 * 1024 * 1024;
      scratchStack = new ScratchStack(Module, scratchStackSize);

      physx.loaded = true;

      // console.log('module called run', Module.calledRun);
      /* if (Module.calledRun) {
        // Module.onRuntimeInitialized()
        Module.postRun()
      } */
    })();
  }
  return loadPromise;
};

const physxWorker = (() => {
  const w = {}
  w.alloc = (constructor, count) => {
    if (count > 0) {
      const size = constructor.BYTES_PER_ELEMENT * count
      const ptr = Module._doMalloc(size)
      return new constructor(Module.HEAP8.buffer, ptr, count)
    } else {
      return new constructor(Module.HEAP8.buffer, 0, 0)
    }
  };
  w.free = (ptr) => {
    Module._doFree(ptr)
  };
  w.initialize = () => Module._initialize()

  // AnimationSystem

  w.createAnimationAvatar = (mixerPtr) => {
    const ptr = Module._createAnimationAvatar(
      mixerPtr,
    )
    return ptr;
  }
  w.updateInterpolationAnimationAvatar = (animationAvatarPtr, timeDiff) => {
    Module._updateInterpolationAnimationAvatar(
      animationAvatarPtr, timeDiff,
    )
  }
  w.updateAnimationAvatar = (animationAvatarPtr, values) => {
    values.forEach((value, i) => {
      scratchStack.f32[i] = value;
    })
    Module._updateAnimationAvatar(
      animationAvatarPtr, scratchStack.ptr,
    )
  }
  w.addActionAnimationAvatar = (animationAvatarPtr, action) => {
    const bytes = textEncoder.encode(JSON.stringify(action))
    const stringByteLength = bytes.length;
    for (let i = 0; i < stringByteLength; i++) {
      scratchStack.u8[i] = bytes[i];
    }

    Module._addActionAnimationAvatar(
      animationAvatarPtr,
      scratchStack.ptr,
      stringByteLength,
    )
  }
  w.removeActionAnimationAvatar = (animationAvatarPtr, action) => {
    const bytes = textEncoder.encode(JSON.stringify(action))
    const stringByteLength = bytes.length;
    for (let i = 0; i < stringByteLength; i++) {
      scratchStack.u8[i] = bytes[i];
    }

    Module._removeActionAnimationAvatar(
      animationAvatarPtr,
      scratchStack.ptr,
      stringByteLength,
    )
  }
  w.getActionInterpolantAnimationAvatar = (animationAvatarPtr, actionName, type = 0) => { // 0: get(), 1: getNormalized(), 2: getInverse()
    const bytes = textEncoder.encode(actionName)
    const stringByteLength = bytes.length;
    for (let i = 0; i < stringByteLength; i++) {
      scratchStack.u8[i] = bytes[i];
    }

    const interpolantValue = Module._getActionInterpolantAnimationAvatar(
      animationAvatarPtr,
      scratchStack.ptr,
      stringByteLength,
      type,
    )
    return interpolantValue;
  }
  w.createAnimationMixer = () => {
    const ptr = Module._createAnimationMixer(
    )
    return ptr;
  }
  w.updateAnimationMixer = (mixerPtr, now, nowS) => {
    const outputBufferOffsetMain = Module._updateAnimationMixer(
      mixerPtr, now, nowS,
    )
    const resultValues = [];
    const head = outputBufferOffsetMain / Float32Array.BYTES_PER_ELEMENT;
    for (let i = 0; i < 53; i++) {
      let value;
      const isPosition = i === 0;
      const x = Module.HEAPF32[head + i * 4 + 0];
      const y = Module.HEAPF32[head + i * 4 + 1];
      const z = Module.HEAPF32[head + i * 4 + 2];
      if (isPosition) {
        value = [x, y, z];
      } else {
        const w = Module.HEAPF32[head + i * 4 + 3];
        value = [x, y, z, w];
      }
      resultValues.push(value);
    }

    return resultValues;
  }
  w.createAnimationMapping = (isPosition, index, isTop, isArm, boneName) => {
    const bytes = textEncoder.encode(boneName)
    const nameByteLength = bytes.length;
    for (let i = 0; i < nameByteLength; i++) {
      scratchStack.u8[i] = bytes[i];
    }

    Module._createAnimationMapping(
      isPosition, index, isTop, isArm, scratchStack.ptr, nameByteLength,
    )
  }
  w.createAnimation = (name, duration) => {
    const bytes = textEncoder.encode(name)
    const nameByteLength = bytes.length;
    for (let i = 0; i < nameByteLength; i++) {
      scratchStack.u8[i] = bytes[i];
    }

    const ptr = Module._createAnimation(
      scratchStack.ptr,
      nameByteLength,
      duration,
    )
    return ptr;
  }
  let initialized = false;
  w.initAnimationSystem = (/* values */) => {
    // values.forEach((value, i) => {
    //   scratchStack.f32[i] = value;
    // })

    // console.log('init animation system');
    if (!initialized) {
      initialized = true;
    } else {
      console.warn('double init animation system');
      debugger;
    }

    const jsonStrByteLength = Module._initAnimationSystem(
      scratchStack.ptr,
    )

    const jsonStr = textDecoder.decode(scratchStack.u8.slice(0, jsonStrByteLength));
    const animationGroupDeclarations = JSON.parse(jsonStr);

    const lowerCaseFirstLetter = (string) => {
      return string.charAt(0).toLowerCase() + string.slice(1);
    }

    animationGroupDeclarations.forEach(animationGroup => {
      animationGroup.name = lowerCaseFirstLetter(animationGroup.name);
      animationGroup.animations.forEach(animation => {
        animation.keyName = lowerCaseFirstLetter(animation.keyName);
      })
    });

    return animationGroupDeclarations;
  }
  w.createAnimationInterpolant = (animationPtr, parameterPositions, sampleValues, valueSize) => { // `valueSize` only support 3 ( Vector ) and 4 ( Quaternion ).
    const allocator = new Allocator(Module);

    const parameterPositionsTypedArray = allocator.alloc(Float32Array, parameterPositions.length);
    parameterPositionsTypedArray.set(parameterPositions);

    const sampleValuesTypedArray = allocator.alloc(Float32Array, sampleValues.length);
    sampleValuesTypedArray.set(sampleValues);

    Module._createAnimationInterpolant(
      animationPtr,
      parameterPositions.length,
      parameterPositionsTypedArray.byteOffset,
      sampleValues.length,
      sampleValuesTypedArray.byteOffset,
      valueSize, // only support 3 (vector) and 4 (quaternion)
    )

    allocator.freeAll();
  }

  // End AnimationSystem

  return w;
})()

physx.physxWorker = physxWorker

// const _updateGeometry = () => {
//   physx.crosshairMesh.update()

//   physxWorker.update()
// }
// physx.update = _updateGeometry

export default physx