import * as THREE from 'three';

import Avatar from './avatars.js';
import avatarsWasmManager from './avatars-wasm-manager.js';

import {AvatarQuality} from './avatar-quality.js';
import {maxAvatarQuality} from '../constants.js';


//

export class AvatarManager extends EventTarget {
  makeQuality(gltf) {
    const avatarQuality = new AvatarQuality({
      gltf,
      quality: maxAvatarQuality,
    });
    return avatarQuality;

    // await avatarQuality.waitForLoad();
  
    // const avatar = new Avatar(avatarQuality, {
    //   fingers: true,
    //   hair: true,
    //   visemes: true,
    //   debug: false,
    // });
    // avatar.setTopEnabled(false);
    // avatar.setHandEnabled(0, false);
    // avatar.setHandEnabled(1, false);
    // avatar.setBottomEnabled(false);
    // avatar.inputs.hmd.position.y = avatar.height;
    // avatar.inputs.hmd.updateMatrixWorld();

    // return avatar;
  }
}