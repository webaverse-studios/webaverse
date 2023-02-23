/*
this file implements avatar transformation effects/shaders.
*/

import * as THREE from 'three';
// import metaversefile from 'metaversefile';
// import {sceneLowPriority} from './renderer.js';

//

const sceneLowPriority = 'not implemented'; // XXX

//

export class AvatarCharacterFx {
  constructor(character) {
    this.character = character;

    // this.lastJumpState = false;
    // this.lastStepped = [false, false];
    // this.lastWalkTime = 0;

    this.sonicBoom = null;
    this.healEffect = null;
    this.healEffectInited = false;
  }

  update(timestamp, timeDiffS) {
    if (!this.character.avatar) {
      return;
    }
    // const _updateSonicBoomMesh = () => {
    //   if (!this.sonicBoom && this.character.getControlMode() === 'controlled') {
    //     this.sonicBoom = metaversefile.createApp();
    //     this.sonicBoom.setComponent('player', this.character);
    //     (async () => {
    //       const {importModule} = metaversefile.useDefaultModules();
    //       const m = await importModule('sonicBoom');
    //       await this.sonicBoom.addModule(m);
    //     })();
    //     sceneLowPriority.add(this.sonicBoom);
    //   }
    // };
    // _updateSonicBoomMesh();
    const _updateNameplate = () => {
      if(!this.nameplate && this.character.getControlMode() === 'remote'){
        (async () => {
          this.nameplate = metaversefile.createApp();
          this.nameplate.setComponent('player', this.character);
          const {importModule} = metaversefile.useDefaultModules();
          const m = await importModule('nameplate');
          await this.nameplate.addModule(m);
          sceneLowPriority.add(this.nameplate);
        })();
      }
    };
    /*
    // Nameplate code is currently not working.
    _updateNameplate();
    */
    // const _updateHealEffectMesh = () => {
    //   if (this.character.hasAction('cure')) {
    //     if (!this.healEffect) {
    //       this.healEffect = metaversefile.createApp();
    //       (async () => {
    //         const {importModule} = metaversefile.useDefaultModules();
    //         const m = await importModule('healEffect');
    //         await this.healEffect.addModule(m);
    //         this.healEffectInited = true;
    //         this.healEffect.playEffect(this.character);
    //         this.character.removeAction('cure');
    //       })();
    //       sceneLowPriority.add(this.healEffect);
    //     } else if (this.healEffectInited) {
    //       this.healEffect.playEffect(this.character);
    //       this.character.removeAction('cure');
    //     }
    //   }
    // };
    // _updateHealEffectMesh();
  }

  destroy() {
    // if (this.sonicBoom) {
    //   sceneLowPriority.remove(this.sonicBoom);
    //   this.sonicBoom.destroy();
    //   this.sonicBoom = null;
    // }
    // if (this.nameplate) {
    //   sceneLowPriority.remove(this.nameplate);
    //   this.nameplate = null;
    // }
    // if (this.healEffect) {
    //   sceneLowPriority.remove(this.healEffect);
    //   this.healEffect = null;
    // }
  }
}