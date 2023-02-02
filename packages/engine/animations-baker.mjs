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

  const newMixamoBonesRotation = JSON.parse('{"mixamorigHips":[0.006458545995471647,0,0,0.9999791433743129],"mixamorigSpine":[-0.0801557216468605,0,-2.4806808368112424e-7,0.9967823535191669],"mixamorigSpine1":[6.162975822039155e-33,-4.9630836753181624e-24,5.211237859084076e-23,1],"mixamorigSpine2":[0.01288561985057818,-4.771173867766652e-10,-3.7024045453006494e-8,0.9999169769541195],"mixamorigNeck":[-6.93889390390723e-18,-8.271806125530272e-24,5.190558343770245e-23,1],"mixamorigHead":[-6.93889390390723e-18,-3.6734198463196485e-40,-1.0339757656912817e-24,1],"mixamorigHeadTop_End":[9.020562075079394e-17,-4.963083675318166e-24,-3.143286327701505e-23,1],"mixamorigRightShoulder":[-0.48443063216376725,0.5709636753028516,-0.52616363833282,-0.4030871739493107],"mixamorigRightArm":[-0.024616241704842487,0.0025622916210436006,-0.10349841681885358,0.9943216547083585],"mixamorigRightForeArm":[6.227981431617342e-23,-2.646977960169685e-23,-1.3234889800848421e-23,1],"mixamorigRightHand":[1.152193750972892e-22,0,-2.646977960169692e-23,1],"mixamorigRightHandThumb1":[0.2532844925861686,0.06161827244019283,-0.22821025705768286,0.9380672859078498],"mixamorigRightHandThumb2":[-0.002315749257559553,-0.0011704489169351965,0.009300110231568924,0.9999533865657887],"mixamorigRightHandThumb3":[-0.0016647383095556426,-0.0008077810781858078,0.006919747685379325,0.9999743462849742],"mixamorigRightHandThumb4":[0.005774853769703283,-0.11750920454458612,-0.04874370878255333,0.9918579982867299],"mixamorigRightHandIndex1":[-6.059340578197897e-7,9.953529057904328e-11,-0.00016426752705445157,0.9999999865079061],"mixamorigRightHandIndex2":[8.720939633726537e-24,-5.293956093329932e-23,0.00025564424489899254,0.9999999673230096],"mixamorigRightHandIndex3":[-6.444869927176027e-23,1.323488985200309e-23,-0.00008792197348428728,0.9999999961348633],"mixamorigRightHandIndex4":[8.659859370723388e-8,0.0010026920012318767,0.00008705832638285169,0.9999994935146673],"mixamorigRightHandMiddle1":[-9.781740202927786e-7,4.908535656919696e-10,-0.0005018059094885016,0.9999998740949284],"mixamorigRightHandMiddle2":[3.5690271381461986e-22,1.3234894580508825e-23,0.0008498714387871692,0.9999996388592037],"mixamorigRightHandMiddle3":[2.1083736306676373e-22,-1.323489048629851e-23,-0.000321842011839134,0.9999999482088584],"mixamorigRightHandMiddle4":[1.5498268359238935e-7,0.0009288141658670982,0.00016639448508219267,0.9999995548084492],"mixamorigRightHandRing1":[6.963165823826898e-8,1.085065250991148e-11,0.00015582929737310876,0.9999999878586124],"mixamorigRightHandRing2":[3.2570237418368884e-24,-2.64697802511189e-23,-0.000221515090966507,0.9999999754655319],"mixamorigRightHandRing3":[1.946620950012599e-23,-3.9704669655166076e-23,-0.00011280510431914317,0.9999999936375041],"mixamorigRightHandRing4":[-1.3396451298096423e-7,0.00014607500499735936,-0.0007992862081225937,0.9999996699017618],"mixamorigRightHandPinky1":[0.000004670719286902753,2.4304698046602265e-9,0.0005203629947084558,0.9999998646002598],"mixamorigRightHandPinky2":[1.2760428740290541e-21,3.970468361896965e-23,0.0008462316753971022,0.9999996419459117],"mixamorigRightHandPinky3":[-1.8546942585670984e-22,2.6469782867912306e-23,-0.000496777829639297,0.9999998766058863],"mixamorigRightHandPinky4":[-6.420659236909109e-8,0.0015694812069815289,-0.00004128528174330756,0.9999987675113715],"mixamorigLeftShoulder":[0.48442267749711376,0.5709704717068556,-0.5261616291252289,0.40308972946685606],"mixamorigLeftArm":[-0.02460635908641656,-0.002561394687342173,0.10350452783474903,0.9943212655210948],"mixamorigLeftForeArm":[9.612242362214153e-23,1.3234889800848425e-23,-2.646977960169688e-23,1],"mixamorigLeftHand":[-6.26962918533632e-23,-3.970466940254537e-23,-2.6469779601696903e-23,1],"mixamorigLeftHandThumb1":[0.25309644676633125,-0.06132323271522457,0.2273527590163699,0.9383455508133752],"mixamorigLeftHandThumb2":[-0.002067032129087833,0.0010427308040619617,-0.00821340789373109,0.9999635893478417],"mixamorigLeftHandThumb3":[-0.001531358964997087,0.0007452552330187543,-0.00607311960528406,0.9999801081784668],"mixamorigLeftHandThumb4":[0.005153407131366978,0.12268277993699259,0.041651534921938925,0.9915581311958046],"mixamorigLeftHandIndex1":[6.665759936749852e-7,-2.9380348585947107e-11,-0.00004407651766068507,0.9999999990284081],"mixamorigLeftHandIndex2":[3.4072136137164387e-7,3.580919473410255e-11,0.0001050981787351313,0.9999999944771283],"mixamorigLeftHandIndex3":[3.347505650683504e-7,-2.2176925334093858e-11,-0.00006624910485486997,0.9999999978054721],"mixamorigLeftHandIndex4":[1.0594603907920035e-8,-0.00037756326482063453,-0.000013069537623522491,0.9999999286375816],"mixamorigLeftHandMiddle1":[4.084735851900896e-7,-1.2926721325515467e-11,-0.000031646406983828354,0.9999999994991691],"mixamorigLeftHandMiddle2":[-1.6358384175735738e-7,-3.4673461654792905e-12,0.00002119614093572879,0.9999999997753484],"mixamorigLeftHandMiddle3":[-4.275899279477681e-7,-8.846622749074218e-12,0.000020689502181930057,0.9999999997858808],"mixamorigLeftHandMiddle4":[-2.675942539082108e-8,-0.0010241407152540845,0.000027984757264270498,0.9999994751761864],"mixamorigLeftHandRing1":[6.248995762954408e-7,3.945164311107466e-12,0.000006313277301958231,0.9999999999798759],"mixamorigLeftHandRing2":[1.830217884437177e-23,1.323488980123116e-23,8.470329472535674e-22,1],"mixamorigLeftHandRing3":[1.2418170115086394e-22,0,4.235164736275166e-22,1],"mixamorigLeftHandRing4":[-2.7316933950438614e-7,0.0004934373218353761,0.000016047023509748677,0.9999998781310067],"mixamorigLeftHandPinky1":[-0.000004975537953269549,1.0178097892277209e-8,0.0020448023965822897,0.9999979093770162],"mixamorigLeftHandPinky2":[6.285466836481913e-7,-1.324096488413518e-10,-0.00021066000242779328,0.9999999778109838],"mixamorigLeftHandPinky3":[1.0560541723515697e-7,-7.084234405766792e-12,-0.0000670821116501426,0.9999999977499896],"mixamorigLeftHandPinky4":[2.2034709579345222e-7,-0.0007833987784531817,-0.0002953855857226708,0.9999996495167691],"mixamorigRightUpLeg":[2.7047671429134563e-9,0.010356475588677583,0.9999463702685825,2.6115275064568443e-7],"mixamorigRightLeg":[-0.03809137752293408,-8.16315213450579e-10,2.1414893185802513e-8,0.9992742601300231],"mixamorigRightFoot":[0.45974006194132166,3.725814189701004e-23,-1.2432846936543718e-7,0.8880535318583977],"mixamorigRightToeBase":[0.335241516804437,7.023902526244116e-24,-1.1130089220595614e-7,0.9421322228915896],"mixamorigRightToe_End":[0,0.01160806788231821,1.323578157340828e-23,0.9999326241102645],"mixamorigLeftUpLeg":[2.8191483378909245e-9,0.01036795967915088,0.9999462512615453,2.718950400523856e-7],"mixamorigLeftLeg":[-0.0381124510208252,-8.172602612650612e-10,2.142781333519525e-8,0.9992734566059407],"mixamorigLeftFoot":[0.4597486071334844,-3.725832749974238e-24,-1.1668517803347452e-7,0.8880491080108168],"mixamorigLeftToeBase":[0.33524149798857356,1.4047804952656945e-23,-1.1452079069214375e-7,0.94213222958689],"mixamorigLeftToe_End":[-3.388370469318711e-21,-0.011869165745076847,1.0588657716620974e-22,0.9999295589712888]}');
  /* data from:
    let newMixamoBonesRotation = {}
    newMixamo.children[1].skeleton.bones.forEach(bone=>{
      newMixamoBonesRotation[bone.name] = bone.quaternion.toArray())
    })
    JSON.stringify(newMixamoBonesRotation)
  */
  for (const key in newMixamoBonesRotation) { // revert rotation
    for (let i = 0; i < 3; i++) { // conjugate
      newMixamoBonesRotation[key][i] *= -1;
    }
  }

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
              THREE.Quaternion.multiplyQuaternionsFlat(
                track.values, i * 4,
                newMixamoBonesRotation[boneName], 0,
                track.values, i * 4,
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
