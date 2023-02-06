import path from 'path';
import fs from 'fs';
import express from 'express';
import encoding from 'encoding-japanese';

import * as THREE from 'three';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {MMDLoader} from 'three/examples/jsm/loaders/MMDLoader.js';
import {CharsetEncoder} from 'three/examples/jsm/libs/mmdparser.module.js';

import {getAvatarHeight, getModelBones, modelBoneToAnimationBone} from './avatars/util.mjs';
import {zbencode, zbdecode} from '../zjs/encoding.mjs';

class ProgressEvent {
  constructor(type, options) {
    this.type = type;
    this.options = options;
  }
}
globalThis.ProgressEvent = ProgressEvent;

(async () => {
  const idleAnimationName = 'idle.fbx';
  const reversibleAnimationNames = [
    'left strafe walking.fbx',
    'left strafe.fbx',
    'right strafe walking.fbx',
    'right strafe.fbx',
    'Sneaking Forward.fbx',
    'Crouched Sneaking Left.fbx',
    'Crouched Sneaking Right.fbx',
  ];
  const findFilesWithExtension = (baseDir, subDir, ext) => {
    const files = [];
    const dotExt = `.${ext}`;
    const _recurse = p => {
      const entries = fs.readdirSync(p);
      for (const entry of entries) {
        const fullPath = `${p}/${entry}`;
        if (fs.statSync(fullPath).isDirectory()) {
          _recurse(fullPath);
        } else if (entry.endsWith(dotExt)) {
          files.push(fullPath.slice(baseDir.length + 1));
        }
      }
    };
    _recurse(path.join(baseDir, subDir));
    return files;
  };
  // let mmdAnimation = null;
  // const charsetEncoder = new CharsetEncoder();
  const _makeFakeBone = name => {
    return {
    // name,
      translation: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
    };
  };
  const _parseVpd = o => {
    const _getBone = name => {
      return o.bones.find(b => b.name === name) ?? _makeFakeBone();
    };
    const mmdModelBones = {
    // Root: _getBone('センター'), // deliberately excluded

      Hips: _getBone('下半身'),
      Spine: _makeFakeBone(), // not present in mmd
      Chest: _getBone('上半身'),
      UpperChest: _makeFakeBone(), // not present in mmd
      Neck: _getBone('首'),
      Head: _getBone('頭'),
      // Eye_L: _getBone('左目'), // deliberately excluded
      // Eye_R: _getBone('右目'), // deliberately excluded

      Left_shoulder: _getBone('左肩'),
      Left_arm: _getBone('左腕'),
      Left_elbow: _getBone('左ひじ'),
      Left_wrist: _getBone('左手首'),
      Left_thumb2: _getBone('左親指２'),
      Left_thumb1: _getBone('左親指１'),
      Left_thumb0: _makeFakeBone(), // not present in mmd
      Left_indexFinger3: _getBone('左人指３'),
      Left_indexFinger2: _getBone('左人指２'),
      Left_indexFinger1: _getBone('左人指１'),
      Left_middleFinger3: _getBone('左中指３'),
      Left_middleFinger2: _getBone('左中指２'),
      Left_middleFinger1: _getBone('左中指１'),
      Left_ringFinger3: _getBone('左薬指３'),
      Left_ringFinger2: _getBone('左薬指２'),
      Left_ringFinger1: _getBone('左薬指１'),
      Left_littleFinger3: _getBone('左小指３'),
      Left_littleFinger2: _getBone('左小指２'),
      Left_littleFinger1: _getBone('左小指１'),
      Left_leg: _getBone('左足'),
      Left_knee: _getBone('左ひざ'),
      Left_ankle: _getBone('左足首'),

      Right_shoulder: _getBone('右肩'),
      Right_arm: _getBone('右腕'),
      Right_elbow: _getBone('右ひじ'),
      Right_wrist: _getBone('右手首'),
      Right_thumb2: _getBone('右親指２'),
      Right_thumb1: _getBone('右親指１'),
      Right_thumb0: _makeFakeBone(), // not present in mmd
      Right_indexFinger3: _getBone('右人指３'),
      Right_indexFinger2: _getBone('右人指２'),
      Right_indexFinger1: _getBone('右人指１'),
      Right_middleFinger3: _getBone('右中指３'),
      Right_middleFinger2: _getBone('右中指２'),
      Right_middleFinger1: _getBone('右中指１'),
      Right_ringFinger3: _getBone('右薬指３'),
      Right_ringFinger2: _getBone('右薬指２'),
      Right_ringFinger1: _getBone('右薬指１'),
      Right_littleFinger3: _getBone('右小指３'),
      Right_littleFinger2: _getBone('右小指２'),
      Right_littleFinger1: _getBone('右小指１'),
      Right_leg: _getBone('右足'),
      Right_knee: _getBone('右ひざ'),
      Right_ankle: _getBone('右足首'),
      Left_toe: _getBone('左つま先'),
      Right_toe: _getBone('右つま先'),
    };
    /* for (const k in mmdModelBones) {
    if (!mmdModelBones[k]) {
      console.warn('no bone', k);
    }
  } */

    const mmdAnimation = {};
    for (const key in mmdModelBones) {
      const key2 = modelBoneToAnimationBone[key];
      /* if (key2 === undefined) {
      throw new Error('fail: ' + key);
    } */
      mmdAnimation[key2] = mmdModelBones[key];
    }
    return mmdAnimation;
  };

  const trackNames = ['mixamorigHips.position', 'mixamorigHips.quaternion', 'mixamorigSpine.quaternion', 'mixamorigSpine1.quaternion', 'mixamorigSpine2.quaternion', 'mixamorigNeck.quaternion', 'mixamorigHead.quaternion', 'mixamorigLeftShoulder.quaternion', 'mixamorigLeftArm.quaternion', 'mixamorigLeftForeArm.quaternion', 'mixamorigLeftHand.quaternion', 'mixamorigLeftHandMiddle1.quaternion', 'mixamorigLeftHandMiddle2.quaternion', 'mixamorigLeftHandMiddle3.quaternion', 'mixamorigLeftHandThumb1.quaternion', 'mixamorigLeftHandThumb2.quaternion', 'mixamorigLeftHandThumb3.quaternion', 'mixamorigLeftHandIndex1.quaternion', 'mixamorigLeftHandIndex2.quaternion', 'mixamorigLeftHandIndex3.quaternion', 'mixamorigLeftHandRing1.quaternion', 'mixamorigLeftHandRing2.quaternion', 'mixamorigLeftHandRing3.quaternion', 'mixamorigLeftHandPinky1.quaternion', 'mixamorigLeftHandPinky2.quaternion', 'mixamorigLeftHandPinky3.quaternion', 'mixamorigRightShoulder.quaternion', 'mixamorigRightArm.quaternion', 'mixamorigRightForeArm.quaternion', 'mixamorigRightHand.quaternion', 'mixamorigRightHandMiddle1.quaternion', 'mixamorigRightHandMiddle2.quaternion', 'mixamorigRightHandMiddle3.quaternion', 'mixamorigRightHandThumb1.quaternion', 'mixamorigRightHandThumb2.quaternion', 'mixamorigRightHandThumb3.quaternion', 'mixamorigRightHandIndex1.quaternion', 'mixamorigRightHandIndex2.quaternion', 'mixamorigRightHandIndex3.quaternion', 'mixamorigRightHandRing1.quaternion', 'mixamorigRightHandRing2.quaternion', 'mixamorigRightHandRing3.quaternion', 'mixamorigRightHandPinky1.quaternion', 'mixamorigRightHandPinky2.quaternion', 'mixamorigRightHandPinky3.quaternion', 'mixamorigRightUpLeg.quaternion', 'mixamorigRightLeg.quaternion', 'mixamorigRightFoot.quaternion', 'mixamorigRightToeBase.quaternion', 'mixamorigLeftUpLeg.quaternion', 'mixamorigLeftLeg.quaternion', 'mixamorigLeftFoot.quaternion', 'mixamorigLeftToeBase.quaternion']

  const newMixamoBonesRotation = {
    "mixamorigHips": [0, 0, 0, 1],
    "mixamorigSpine": [0, 0, 0, 1],
    "mixamorigSpine1": [0, 0, 0, 1],
    "mixamorigSpine2": [0, 0, 0, 1],
    "mixamorigNeck": [0, 0, 0, 1],
    "mixamorigHead": [0, 0, 0, 1],
    "mixamorigHeadTop_End": [0, 0, 0, 1],
    "mixamorigRightShoulder": [-0.034007257690587, -1.985709973673248e-15, -0.7609390796506805, 0.6479314959814356],
    "mixamorigRightArm": [-0.006108543264012025, -2.185434947891529e-12, -0.7070803537144913, 0.7071068229696142],
    "mixamorigRightForeArm": [-0.016740170109669862, 1.251144594188942e-7, -0.7069117842567201, 0.7071035963588816],
    "mixamorigRightHand": [0, 0, 0, 1],
    "mixamorigRightHandThumb1": [0, 0, 0, 1],
    "mixamorigRightHandThumb2": [0, 0, 0, 1],
    "mixamorigRightHandThumb3": [0, 0, 0, 1],
    "mixamorigRightHandThumb4": [0, 0, 0, 1],
    "mixamorigRightHandIndex1": [0, 0, 0, 1],
    "mixamorigRightHandIndex2": [0, 0, 0, 1],
    "mixamorigRightHandIndex3": [0, 0, 0, 1],
    "mixamorigRightHandIndex4": [0, 0, 0, 1],
    "mixamorigRightHandMiddle1": [0, 0, 0, 1],
    "mixamorigRightHandMiddle2": [0, 0, 0, 1],
    "mixamorigRightHandMiddle3": [0, 0, 0, 1],
    "mixamorigRightHandMiddle4": [0, 0, 0, 1],
    "mixamorigRightHandRing1": [0, 0, 0, 1],
    "mixamorigRightHandRing2": [0, 0, 0, 1],
    "mixamorigRightHandRing3": [0, 0, 0, 1],
    "mixamorigRightHandRing4": [0, 0, 0, 1],
    "mixamorigRightHandPinky1": [0, 0, 0, 1],
    "mixamorigRightHandPinky2": [0, 0, 0, 1],
    "mixamorigRightHandPinky3": [0, 0, 0, 1],
    "mixamorigRightHandPinky4": [0, 0, 0, 1],
    "mixamorigLeftShoulder": [0, 0, 0, 1],
    "mixamorigLeftArm": [0, 0, 0, 1],
    "mixamorigLeftForeArm": [0, 0, 0, 1],
    "mixamorigLeftHand": [0, 0, 0, 1],
    "mixamorigLeftHandThumb1": [0, 0, 0, 1],
    "mixamorigLeftHandThumb2": [0, 0, 0, 1],
    "mixamorigLeftHandThumb3": [0, 0, 0, 1],
    "mixamorigLeftHandThumb4": [0, 0, 0, 1],
    "mixamorigLeftHandIndex1": [0, 0, 0, 1],
    "mixamorigLeftHandIndex2": [0, 0, 0, 1],
    "mixamorigLeftHandIndex3": [0, 0, 0, 1],
    "mixamorigLeftHandIndex4": [0, 0, 0, 1],
    "mixamorigLeftHandMiddle1": [0, 0, 0, 1],
    "mixamorigLeftHandMiddle2": [0, 0, 0, 1],
    "mixamorigLeftHandMiddle3": [0, 0, 0, 1],
    "mixamorigLeftHandMiddle4": [0, 0, 0, 1],
    "mixamorigLeftHandRing1": [0, 0, 0, 1],
    "mixamorigLeftHandRing2": [0, 0, 0, 1],
    "mixamorigLeftHandRing3": [0, 0, 0, 1],
    "mixamorigLeftHandRing4": [0, 0, 0, 1],
    "mixamorigLeftHandPinky1": [0, 0, 0, 1],
    "mixamorigLeftHandPinky2": [0, 0, 0, 1],
    "mixamorigLeftHandPinky3": [0, 0, 0, 1],
    "mixamorigLeftHandPinky4": [0, 0, 0, 1],
    "mixamorigRightUpLeg": [0.2949089657232831, -4.118579243146164e-11, 0.9550439653750777, 0.030326986936897934],
    "mixamorigRightLeg": [0.9516126902357371, 1.1836008742393608e-10, -0.30611209458626437, 0.026993949883504273],
    "mixamorigRightFoot": [0, 0, 0, 1],
    "mixamorigRightToeBase": [0, 0, 0, 1],
    "mixamorigRightToe_End": [0, 0, 0, 1],
    "mixamorigLeftUpLeg": [0, 0, 0, 1],
    "mixamorigLeftLeg": [0, 0, 0, 1],
    "mixamorigLeftFoot": [0, 0, 0, 1],
    "mixamorigLeftToeBase": [0, 0, 0, 1],
    "mixamorigLeftToe_End": [0, 0, 0, 1],
  };
  /* data from:
    let newMixamoBonesRotation = {}
    newMixamo.children[1].skeleton.bones.forEach(bone=>{
      newMixamoBonesRotation[bone.name] = bone.quaternion.toArray())
    })
    JSON.stringify(newMixamoBonesRotation)
  */
  // for (const key in newMixamoBonesRotation) { // revert rotation
  //   for (let i = 0; i < 3; i++) { // conjugate
  //     newMixamoBonesRotation[key][i] *= -1;
  //   }
  // }

  const baker = async (uriPath = '', fbxFileNames, vpdFileNames, outFile) => {
    const animations = [];

    // mmd
    const mmdLoader = new MMDLoader();
    const charsetEncoder = new CharsetEncoder();
    const mmdPoses = [];
    for (const name of vpdFileNames) {
      // console.log('try', name);

      let o;

      /* const content = fs.readFileSync('packages/client/public/' + name);
      const text = charsetEncoder.s2u(content);
      // console.log('got text', text);
      const parser = mmdLoader._getParser();
      o = parser.parseVpd(text, true); */

      const content = fs.readFileSync('packages/client/public/' + name);
      var sjisArray = encoding.convert(content, 'UTF8');
      const text = new TextDecoder().decode(Uint8Array.from(sjisArray));
      const parser = mmdLoader._getParser();
      o = parser.parseVpd(text, true);

      /* const u = uriPath + name;
      o = await new Promise((accept, reject) => {
          mmdLoader.loadVPD(u, false, o => {
            // o.scene = o;
            accept(o);
          }, function progress() {}, reject);
      }); */

      const poses = _parseVpd(o);
      mmdPoses.push({
        name: name.slice('poses/'.length),
        poses,
      });
    }
    const mmdAnimationsJson = [];
    for (const mmdPose of mmdPoses) {
      const {name} = mmdPose;
      const tracks = [];
      for (const boneName in mmdPose.poses) {
        const bone = mmdPose.poses[boneName];
        const isHips = /hips/i.test(boneName);
        if (isHips) {
          tracks.push({
            name: boneName + '.position',
            type: 'vector',
            times: Float32Array.from([0]),
            values: Float32Array.from(bone.translation),
          });
        }
        tracks.push({
          name: boneName + '.quaternion',
          type: 'quaternion',
          times: Float32Array.from([0]),
          values: Float32Array.from(bone.quaternion),
        });
      }
      const mmdAnimation = {
        uuid: name,
        name,
        duration: 1,
        tracks,
      };
      mmdAnimationsJson.push(mmdAnimation);
    }

    // fbx
    const fbxLoader = new FBXLoader();
    const height = await (async () => {
      let o;
      const u = uriPath + 'animations/' + idleAnimationName;
      o = await new Promise((accept, reject) => {
        fbxLoader.load(u, o => {
          o.scene = o;
          accept(o);
        }, function progress() { }, reject);
      });
      // console.log('got height', height);
      // const animation = o.animations[0];
      const modelBones = getModelBones(o);
      return getAvatarHeight(modelBones);
    })();
    // console.log('got height', height);
    for (const name of fbxFileNames) {
      const u = uriPath + name;
      console.log('processing', name);
      let o;
      o = await new Promise((accept, reject) => {
        fbxLoader.load(u, o => {
          o.scene = o;
          accept(o);
        }, function progress() { }, reject);
      });
      // console.log('got height', height);
      const animation = o.animations[0];
      // const isNewMixamo = name.endsWith('_newMixamo.fbx');
      animation.name = name.slice('animations/'.length);
      // if (isNewMixamo) animation.name = animation.name.substring(0, animation.name.length - 14) + '.fbx';
      animation.object = o;

      animation.tracks = animation.tracks.filter(track => trackNames.includes(track.name)); // Filter out unused tracks, required by indices based wasm animation system.

      // scale position tracks by height
      for (const track of animation.tracks) {
        if (/\.position/.test(track.name)) {
          const values2 = new track.values.constructor(track.values.length);
          const valueSize = track.getValueSize();
          const numValues = track.values.length / valueSize;
          for (let i = 0; i < numValues; i++) {
            const index = i;
            for (let j = 0; j < valueSize; j++) {
              values2[index * valueSize + j] = track.values[index * valueSize + j] / height;
            }
          }
          track.values = values2;
        }
      }

      // if (isNewMixamo) {
        for (const track of animation.tracks) {
          const [boneName, vectorOrQuaternion] = track.name.split('.');
          if (vectorOrQuaternion === 'quaternion') {
            const valueSize = track.getValueSize();
            const numValues = track.values.length / valueSize;
            for (let i = 0; i < numValues; i++) {
              //
              THREE.Quaternion.multiplyQuaternionsFlat(
                track.values, i * 4,
                track.values, i * 4,
                newMixamoBonesRotation[boneName], 0,
              )
            }
          }
        }
      // }

      animations.push(animation);
    }
    const _reverseAnimation = animation => {
      animation = animation.clone();
      for (const track of animation.tracks) {
        const times2 = new track.times.constructor(track.times.length);
        for (let i = 0; i < track.times.length; i++) {
          times2[i] = animation.duration - track.times[track.times.length - 1 - i];
        }
        track.times = times2;

        const values2 = new track.values.constructor(track.values.length);
        const valueSize = track.getValueSize();
        const numValues = track.values.length / valueSize;
        for (let i = 0; i < numValues; i++) {
          const aIndex = i;
          const bIndex = numValues - 1 - i;
          for (let j = 0; j < valueSize; j++) {
            values2[aIndex * valueSize + j] = track.values[bIndex * valueSize + j];
          }
        }
        track.values = values2;
      }
      return animation;
    };
    for (const name of reversibleAnimationNames) {
      const animation = animations.find(a => a.name === name);
      const reverseAnimation = _reverseAnimation(animation);
      reverseAnimation.name = animation.name.replace(/\.fbx$/, ' reverse.fbx');
      reverseAnimation.object = animation.object;
      animations.push(reverseAnimation);
    }

    const walkAnimationNames = [
      'walking.fbx',
      'left strafe walking.fbx',
      'right strafe walking.fbx',
      'walking backwards.fbx',
      'left strafe walking reverse.fbx',
      'right strafe walking reverse.fbx',
      'Fast Run.fbx',
      'left strafe.fbx',
      'right strafe.fbx',
      'running backwards.fbx',
      'left strafe reverse.fbx',
      'right strafe reverse.fbx',
      'Sneaking Forward.fbx',
      'Crouched Sneaking Left.fbx',
      'Crouched Sneaking Right.fbx',
      'Sneaking Forward reverse.fbx',
      'Crouched Sneaking Left reverse.fbx',
      'Crouched Sneaking Right reverse.fbx',
      'naruto run.fbx',
    ];
    const animationStepIndices = walkAnimationNames.map(walkAnimationName => {
      const animation = animations.find(a => a.name === walkAnimationName);
      const {tracks, object} = animation;
      // console.log('got interpolants', object, animation.name);
      const bones = [];
      object.traverse(o => {
        if (o.isBone) {
          const bone = o;
          bone.initialPosition = bone.position.clone();
          bone.initialQuaternion = bone.quaternion.clone();
          bones.push(bone);
        }
      });
      // console.log('got bones', bones.map(b => b.name));
      const rootBone = object; // not really a bone
      const leftFootBone = bones.find(b => b.name === 'mixamorigLeftFoot');
      const rightFootBone = bones.find(b => b.name === 'mixamorigRightFoot');
      const epsilon = 0.001;
      const allOnesEpsilon = arr => arr.every(v => Math.abs(1 - v) < epsilon);

      const bonePositionInterpolants = {};
      const boneQuaternionInterpolants = {};
      const tracksToRemove = [];
      for (const track of tracks) {
        if (/\.position$/.test(track.name)) {
          const boneName = track.name.replace(/\.position$/, '');
          // const bone = bones.find(b => b.name === boneName);
          const boneInterpolant = new THREE.LinearInterpolant(track.times, track.values, track.getValueSize());
          bonePositionInterpolants[boneName] = boneInterpolant;
        } else if (/\.quaternion$/.test(track.name)) {
          const boneName = track.name.replace(/\.quaternion$/, '');
          // const bone = bones.find(b => b.name === boneName);
          const boneInterpolant = new THREE.QuaternionLinearInterpolant(track.times, track.values, track.getValueSize());
          boneQuaternionInterpolants[boneName] = boneInterpolant;
        } else if (/\.scale$/.test(track.name)) {
          if (allOnesEpsilon(track.values)) {
            const index = tracks.indexOf(track);
            tracksToRemove.push(index);
          } else {
            throw new Error(`This track has invalid values.  All scale transforms must be set to 1. Aborting.\n Animation: ${animation.name}, Track: ${track.name}, values: \n ${track.values}`);
          }
        } else {
          console.warn('unknown track name', animation.name, track);
        }
      }
      // remove scale transform tracks as they won't be used;
      let i = tracksToRemove.length;
      while (i--) {
        tracks.splice(tracksToRemove[i], 1);
      }

      const walkBufferSize = 256;
      const leftFootYDeltas = new Float32Array(walkBufferSize);
      const rightFootYDeltas = new Float32Array(walkBufferSize);
      for (let i = 0; i < walkBufferSize; i++) {
        const f = i / (walkBufferSize - 1);
        for (const bone of bones) {
          const positionInterpolant = bonePositionInterpolants[bone.name];
          const quaternionInterpolant = boneQuaternionInterpolants[bone.name];
          if (positionInterpolant) {
            const pv = positionInterpolant.evaluate(f * animation.duration);
            bone.position.fromArray(pv);
          } else {
            bone.position.copy(bone.initialPosition);
          }
          if (quaternionInterpolant) {
            const qv = quaternionInterpolant.evaluate(f * animation.duration);
            bone.quaternion.fromArray(qv);
          } else {
            bone.quaternion.copy(bone.initialQuaternion);
          }
        }
        rootBone.updateMatrixWorld(true);

        const fbxScale = 100;
        const rootY = new THREE.Vector3().setFromMatrixPosition(rootBone.matrixWorld).divideScalar(fbxScale).y;
        const leftFootY = new THREE.Vector3().setFromMatrixPosition(leftFootBone.matrixWorld).divideScalar(fbxScale).y;
        const rightFootY = new THREE.Vector3().setFromMatrixPosition(rightFootBone.matrixWorld).divideScalar(fbxScale).y;

        const leftFootYDelta = leftFootY - rootY;
        const rightFootYDelta = rightFootY - rootY;

        leftFootYDeltas[i] = leftFootYDelta;
        rightFootYDeltas[i] = rightFootYDelta;
      }

      const range = /sneak/i.test(walkAnimationName) ? 0.3 : 0.06;

      let leftMin = Infinity;
      let leftMax = -Infinity;
      for (let i = 0; i < leftFootYDeltas.length; i++) {
        const leftFootYDelta = leftFootYDeltas[i];
        leftMin = Math.min(leftMin, leftFootYDelta);
        leftMax = Math.max(leftMax, leftFootYDelta);
      }
      const leftYLimit = leftMin + range * (leftMax - leftMin);
      let rightMin = Infinity;
      let rightMax = -Infinity;
      for (let i = 0; i < rightFootYDeltas.length; i++) {
        const rightFootYDelta = rightFootYDeltas[i];
        rightMin = Math.min(rightMin, rightFootYDelta);
        rightMax = Math.max(rightMax, rightFootYDelta);
      }
      const rightYLimit = rightMin + range * (rightMax - rightMin);

      const leftStepIndices = new Uint8Array(walkBufferSize);
      const rightStepIndices = new Uint8Array(walkBufferSize);
      let numLeft = 0;
      let numRight = 0;
      const _isFootYStepping = (y, stepYLimit) => y <= stepYLimit;
      for (let i = 0; i < leftFootYDeltas.length; i++) {
        const lastLeftFootStepping = _isFootYStepping(leftFootYDeltas[i === 0 ? (leftFootYDeltas.length - 1) : (i - 1)], leftYLimit);
        const leftFootStepping = _isFootYStepping(leftFootYDeltas[i], leftYLimit);
        const newLeftStep = leftFootStepping && !lastLeftFootStepping;
        leftStepIndices[i] = newLeftStep ? 1 : 0;
        numLeft += +newLeftStep;

        const lastRightFootStepping = _isFootYStepping(rightFootYDeltas[i === 0 ? (rightFootYDeltas.length - 1) : (i - 1)], leftYLimit);
        const rightFootStepping = _isFootYStepping(rightFootYDeltas[i], leftYLimit);
        const newRightStep = rightFootStepping && !lastRightFootStepping;
        rightStepIndices[i] = newRightStep ? 1 : 0;
        numRight += +newRightStep;
      }
      console.log(
        'got deltas',
        animation.name,
        leftMin,
        leftMax,
        leftYLimit,
        rightMin,
        rightMax,
        rightYLimit,
        numLeft,
        numRight,
      );
      /* if (numLeft === 2) {
        for (let i = leftStepIndices.length - 1; i >= 0; i--) {
          if (leftStepIndices[i]) {
            leftStepIndices[i] = 0;
            break;
          }
        }
      }
      if (numRight === 2) {
        for (let i = rightStepIndices.length - 1; i >= 0; i--) {
          if (rightStepIndices[i]) {
            rightStepIndices[i] = 0;
            break;
          }
        }
      } */
      /* if (_isFootYStepping(leftFootYDeltas[0], leftYLimit) === _isFootYStepping(leftFootYDeltas[leftFootYDeltas.length - 1], leftYLimit)) {
        const endIndex = leftStepIndices[leftStepIndices.length - 1];
        // console.log('end index', endIndex, leftStepIndices[0], leftStepIndices[leftStepIndices.length - 1]);
        for (let i = leftStepIndices.length - 1; i >= 0 && leftStepIndices[i] === endIndex; i--) {
          leftStepIndices[i] = leftStepIndices[0];
        }
      }
      if (_isFootYStepping(rightFootYDeltas[0], rightYLimit) === _isFootYStepping(rightFootYDeltas[rightFootYDeltas.length - 1], rightYLimit)) {
        const endIndex = rightStepIndices[rightStepIndices.length - 1];
        for (let i = rightStepIndices.length - 1; i >= 0 && rightStepIndices[i] === endIndex; i--) {
          rightStepIndices[i] = rightStepIndices[0];
        }
      } */
      /* console.log(
        'got deltas',
        animation.name, leftStepIndex, rightStepIndex,
        _isFootYStepping(rightFootYDeltas[0], rightYLimit),
        _isFootYStepping(rightFootYDeltas[rightFootYDeltas.length - 1], rightYLimit),
        _isFootYStepping(rightFootYDeltas[rightFootYDeltas.length - 2], rightYLimit),
        _isFootYStepping(leftFootYDeltas[0], leftYLimit),
        _isFootYStepping(leftFootYDeltas[leftFootYDeltas.length - 1], leftYLimit),
        _isFootYStepping(leftFootYDeltas[leftFootYDeltas.length - 2], leftYLimit),
      ); */

      return {
        leftFootYDeltas,
        rightFootYDeltas,
        name: animation.name,
        leftStepIndices,
        rightStepIndices,
      };

      /* if (
        _isFootYStepping(leftFootYDeltas[0], leftYLimit) === _isFootYStepping(leftFootYDeltas[leftFootYDeltas.length-1], leftYLimit)
      ) {
        for (let i = leftFootYDeltas.length-1; i >= 0; i--) {
          if (_isFootYStepping(leftFootYDeltas[i], leftYLimit)) {
            leftStepIndices[i] = leftStepIndices[0];
          } else {
            break;
          }
        }
        leftStepIndex--;
      }
      if (
        _isFootYStepping(rightFootYDeltas[0], rightYLimit) === _isFootYStepping(rightFootYDeltas[rightFootYDeltas.length-1], rightYLimit)
      ) {
        for (let i = rightFootYDeltas.length-1; i >= 0; i--) {
          if (_isFootYStepping(rightFootYDeltas[i], rightYLimit)) {
            rightStepIndices[i] = rightStepIndices[0];
          } else {
            break;
          }
        }
        rightStepIndex--;
      } */

      /*
      AnimationClip {
        name: 'right strafe.fbx',
        tracks: [
          VectorKeyframeTrack {
            name: 'mixamorigHips.position',
            times: [Float32Array],
            values: [Float32Array],
            createInterpolant: [Function: InterpolantFactoryMethodLinear]
          },
      */
    });
    // console.log('got animations', animations);

    // format
    const animationsJson = animations.map(a => a.toJSON())
      .concat(mmdAnimationsJson);
    for (const animation of animationsJson) {
      for (const track of animation.tracks) {
        track.times = Float32Array.from(track.times);
        track.values = Float32Array.from(track.values);
      }
    }
    // console.log('got animations json', animationsJson[0], mmdAnimationsJson[0]);
    const animationsUint8Array = zbencode({
      animations: animationsJson,
      animationStepIndices,
    });
    zbdecode(animationsUint8Array);
    console.log('exporting animations');
    fs.writeFileSync(outFile, Buffer.from(animationsUint8Array));
    console.log('exported animations at', outFile);
  };

  (async () => {
    const app = express();
    /* app.all('*', (req, res, next) => {
      // console.log('got url 1', req.url);
      req.url = decodeURI(req.url);
      req.originalUrl = decodeURI(req.url);
      // console.log('got url 2', req.url);
      next();
    }); */
    app.use(express.static('packages/client/public'));
    app.listen(9999);
    const animationFileNames = fs.readdirSync('packages/client/public/animations');
    const fbxFileNames = animationFileNames.filter(name => /\.fbx$/.test(name)).map(name => 'animations/' + name);
    const vpdFileNames = findFilesWithExtension('packages/client/public', 'poses', 'vpd');
    const animationsResultFileName = 'packages/client/public/animations/animations.z';
    await baker('http://localhost:9999/', fbxFileNames, vpdFileNames, animationsResultFileName).catch(e => {
      console.warn('bake error', e);
    });
    process.exit();
  })();
})();
