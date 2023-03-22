import * as THREE from 'three';
import Avatar from './avatars/avatars.js';
import * as sounds from './sounds.js';
import audioManager from './audio-manager.js';

import {
  crouchMaxTime,
  eatFrameIndices,
  drinkFrameIndices,
  useFrameIndices,
  idleSpeed,
  walkSpeed,
  runSpeed,
  narutoRunTimeFactor,
} from './constants.js';
import {
  mod,
  selectVoice,
} from './util.js';
import physx from './physx.js';

const localVector = new THREE.Vector3();

const freestyleDuration = 1466.666666666666 / 2;
const freestyleOffset = 900 / 2;
const breaststrokeDuration = 1066.666666666666;
const breaststrokeOffset = 433.3333333333333;


// HACK: this is used to dynamically control the step offset for a particular animation
// it is useful during development to adjust sync between animations and sound
// the key listener part of this is in io-manager.js
/* if (typeof window.lol !== 'number') {
  window.lol = 0.06;
  window.lol2 = 0.18;
} */
const sneakingOffset = -0.14;
const walkingOffset = 0.13;
const walkingBackwardOffset = 0.18;
const runningBackwardOffset = 0.06;
const strafeWalkingOffset = 0.24;
const offsets = {
  'Sneaking Forward.fbx': sneakingOffset, 
  'walking.fbx': walkingOffset,
  'walking backwards.fbx': walkingBackwardOffset,
  'Fast Run.fbx': 0,
  'left strafe walking.fbx': strafeWalkingOffset,
  'right strafe walking.fbx': strafeWalkingOffset,
  'running backwards.fbx': runningBackwardOffset,
};
const _getActionFrameIndex = (f, frameTimes) => {
  let i;
  for (i = 0; i < frameTimes.length; i++) {
    if (f >= frameTimes[i]) {
      continue;
    } else {
      break;
    }
  }
  return i;
};

export class AvatarCharacterSfx {
  constructor(character) {
    this.character = character;

    this.lastJumpState = false;
    this.lastStepped = [false, false];
    this.lastWalkTime = 0;
    this.lastEatFrameIndex = -1;
    this.lastDrinkFrameIndex = -1;
    this.lastUseFrameIndex = -1;

    this.narutoRunStartTime = 0;
    this.narutoRunFinishTime = 0;
    this.narutoRunTrailSoundStartTime = 0;
    this.narutoRunTurnSoundStartTime = 0;
    
    this.currentQ=new THREE.Quaternion();
    this.preQ=new THREE.Quaternion();
    this.arr = [0, 0, 0, 0];

    this.startRunningTime = 0;
    this.willGasp = false;

    this.oldNarutoRunSound = null;
    this.lastEmote = null;

    const wearupdate = e => {
      if (this.character.getControlMode() === 'controlled') {
        sounds.playSoundName(e.wear ? 'itemEquip' : 'itemUnequip');
      }
    };
    character.addEventListener('wearupdate', wearupdate);
    this.cleanup = () => {
      character.removeEventListener('wearupdate', wearupdate);
    };

    this.currentStep = null;
    this.setSwimmingHand = true;

    this.lastLandState = false;

    this.lastDoubleJump = false;
  }

  update(timestamp, timeDiffS) {
    /* if (!this.character.avatar) {
      return;
    } */
    
    const timeSeconds = timestamp/1000;
    const currentSpeed = localVector.set(this.character.avatar.velocity.x, 0, this.character.avatar.velocity.z).length();
    
    const idleWalkFactor = Math.min(Math.max((currentSpeed - idleSpeed) / (walkSpeed - idleSpeed), 0), 1);
    const walkRunFactor = Math.min(Math.max((currentSpeed - walkSpeed) / (runSpeed - walkSpeed), 0), 1);
    const crouchFactor = Math.min(Math.max(1 - (this.character.avatar.crouchTime / crouchMaxTime), 0), 1);

    const soundFiles = sounds.getSoundFiles();
    // const soundFileAudioBuffer = sounds.getSoundFileAudioBuffer();

    // doubleJump
    const doubleJumpAction = this.character.getAction('doubleJump');
    const doubleJumpState = !!doubleJumpAction;
    if (doubleJumpState && this.lastDoubleJump !== doubleJumpState) {
      sounds.playSoundName('doubleJump');
    }
    this.lastDoubleJump = doubleJumpState;
    // jump
    const _handleJump = () => {
      if (this.character.avatar.jumpState && !this.lastJumpState) {
        sounds.playSoundName('jump');

        // play jump grunt 
        if(this.character.hasAction('jump')){
          this.playGrunt('jump'); 
        }
      } /* else if (this.lastJumpState && !this.player.avatar.jumpState) {
        sounds.playSoundName('land');
      } */
      if(this.character.avatar.landState && !this.lastLandState){
        sounds.playSoundName('land');
      }
      this.lastLandState = this.character.avatar.landState;
      this.lastJumpState = this.character.avatar.jumpState;
    };
    _handleJump();

    // step
    const _handleStep = () => {
      // if (idleWalkFactor > 0.5 && !this.character.avatar.jumpState && !this.character.avatar.fallLoopState && !this.character.avatar.flyState && !this.character.hasAction('glider') && !this.character.hasAction('swim')) {
      // note: need check action directly instead of check xxxState, because xxxState maybe one frame delayed then cause wrongly play step sound.
      if (idleWalkFactor > 0.5 && !this.character.hasAction('jump') && !this.character.hasAction('fallLoop') && !this.character.hasAction('fly') && !this.character.hasAction('glider') && !this.character.hasAction('swim')) {
        const isRunning = walkRunFactor > 0.5;
        const isCrouching = crouchFactor > 0.5;
        const isNarutoRun = this.character.avatar.narutoRunState;
        const walkRunAnimationName = (() => {
          if (isNarutoRun) {
            return 'naruto run.fbx';
          } else {
            const animationAngles = isCrouching ?
              Avatar.getClosest2AnimationAngles('crouch', this.character.avatar.getAngle())
            :
              (isRunning ?
                Avatar.getClosest2AnimationAngles('run', this.character.avatar.getAngle())
              :
                Avatar.getClosest2AnimationAngles('walk', this.character.avatar.getAngle())
              );
            return animationAngles[0].name;
          }
        })();
        const localSoundFiles = (() => {
          if (isNarutoRun) {
            return soundFiles.narutoRun;
          } else if (isCrouching) {
            return soundFiles.walk;
          } else if (isRunning) {
            return soundFiles.run;
          } else {
            return soundFiles.walk;
          }
        })();
        const animations = Avatar.getAnimations();
        const animation = animations.find(a => a.name === walkRunAnimationName);
        const animationStepIndices = Avatar.getAnimationStepIndices();
        const animationIndices = animationStepIndices.find(i => i.name === walkRunAnimationName);
        const {leftStepIndices, rightStepIndices} = animationIndices;

        const offset = offsets[walkRunAnimationName] ?? 0; // ?? window.lol;
        const _getStepIndex = timeSeconds => {
          const timeMultiplier = walkRunAnimationName === 'naruto run.fbx' ? narutoRunTimeFactor : 1;
          const walkTime = (timeSeconds * timeMultiplier + offset) % animation.duration;
          const walkFactor = walkTime / animation.duration;
          const stepIndex = Math.floor(mod(walkFactor, 1) * leftStepIndices.length);
          return stepIndex;
        };

        const startIndex = _getStepIndex(this.lastWalkTime);
        const endIndex = _getStepIndex(timeSeconds);
        for (let i = startIndex;; i++) {
          i = i % leftStepIndices.length;
          if (i !== endIndex) {
            if (leftStepIndices[i] && !this.lastStepped[0] && !this.character.avatar.narutoRunState && timeSeconds-this.narutoRunFinishTime>0.5) {
              const candidateAudios = localSoundFiles// .filter(a => a.paused);
              if (candidateAudios.length > 0) {
                /* for (const a of candidateAudios) {
                  !a.paused && a.pause();
                } */
                this.currentStep = 'left';
                const audioSpec = candidateAudios[Math.floor(Math.random() * candidateAudios.length)];
                sounds.playSound(audioSpec);
              }
            }
            this.lastStepped[0] = leftStepIndices[i];

            if (rightStepIndices[i] && !this.lastStepped[1] && !this.character.avatar.narutoRunState && timeSeconds-this.narutoRunFinishTime>0.5) {
              const candidateAudios = localSoundFiles// .filter(a => a.paused);
              if (candidateAudios.length > 0) {
                /* for (const a of candidateAudios) {
                  !a.paused && a.pause();
                } */
                this.currentStep = 'right';
                const audioSpec = candidateAudios[Math.floor(Math.random() * candidateAudios.length)];
                sounds.playSound(audioSpec);
              }
            }
            this.lastStepped[1] = rightStepIndices[i];
          } else {
            break;
          }
        }

        this.lastWalkTime = timeSeconds;
      }
      
    };

    if (!this.character.hasAction('sit')) {
      _handleStep();
    }
    const _handleSwim = () => {
      const hasSwim = !!this.character.getAction('swim');
      const hasSprint = !!this.character.getAction('sprint');
      if (hasSwim) {
        if (!hasSprint) {
          if (
            this.setSwimmingHand 
            && physx.physxWorker.getActionInterpolantAnimationAvatar(this.character.avatar.animationAvatarPtr, 'movements', 0) % breaststrokeDuration <= breaststrokeOffset
          ) {
            this.setSwimmingHand = false;
          }
          else if(
            !this.setSwimmingHand 
            && physx.physxWorker.getActionInterpolantAnimationAvatar(this.character.avatar.animationAvatarPtr, 'movements', 0) % breaststrokeDuration > breaststrokeOffset
          ) {
            let regex = new RegExp('^water/swim[0-9]*.wav$');
            const candidateAudios = soundFiles.water.filter(f => regex.test(f.name));
            const audioSpec = candidateAudios[Math.floor(Math.random() * candidateAudios.length)];
            sounds.playSound(audioSpec);
            this.setSwimmingHand = true;
          }
        }
        else if (hasSprint) {
          let regex = new RegExp('^water/swim_fast[0-9]*.wav$');
          const candidateAudios = soundFiles.water.filter(f => regex.test(f.name));
          const audioSpec = candidateAudios[Math.floor(Math.random() * candidateAudios.length)];
          if (
            this.setSwimmingHand 
            && physx.physxWorker.getActionInterpolantAnimationAvatar(this.character.avatar.animationAvatarPtr, 'movements', 0) % freestyleDuration <= freestyleOffset
          ) {
            sounds.playSound(audioSpec);
            this.setSwimmingHand = false;
          }
          else if (
            !this.setSwimmingHand 
            && physx.physxWorker.getActionInterpolantAnimationAvatar(this.character.avatar.animationAvatarPtr, 'movements', 0) % freestyleDuration > freestyleOffset
          ) {
            sounds.playSound(audioSpec);
            this.setSwimmingHand = true;
          }
        }  
      }
    }
    _handleSwim();

    const _handleNarutoRun = () => {
      this.currentQ.copy(this.character.quaternion);
     
      let temp=this.currentQ.angleTo(this.preQ);
      for(let i=0;i<4;i++){
          let temp2=this.arr[i];
          this.arr[i]=temp;
          temp=temp2;
      }
      
      if(this.character.avatar.narutoRunState){
        if(this.narutoRunStartTime===0){
          this.narutoRunStartTime=timeSeconds; 
          sounds.playSound(soundFiles.sonicBoom[0]);
          this.playGrunt('narutoRun');
        }
        else {
          if(this.arr.reduce((a,b)=>a+b) >= Math.PI/3){

            this.arr.fill(0)
            if(timeSeconds - this.narutoRunTurnSoundStartTime>soundFiles.sonicBoom[3].duration-0.9 || this.narutoRunTurnSoundStartTime===0){
              sounds.playSound(soundFiles.sonicBoom[3]);
              this.narutoRunTurnSoundStartTime = timeSeconds;
            }
              
          }
         
          if(timeSeconds - this.narutoRunTrailSoundStartTime>soundFiles.sonicBoom[2].duration-0.2 || this.narutoRunTrailSoundStartTime===0){
            
            const localSound = sounds.playSound(soundFiles.sonicBoom[2]);
            this.oldNarutoRunSound = localSound;
            localSound.addEventListener('ended', () => {
              if (this.oldNarutoRunSound === localSound) {
                this.oldNarutoRunSound = null;
              }
            });

            this.narutoRunTrailSoundStartTime = timeSeconds;
          }
        }

        // if naruto run play more than 2 sec, set willGasp
        if(timeSeconds - this.narutoRunStartTime > 2){
          this.willGasp = true;
        }

      }
      if(!this.character.avatar.narutoRunState && this.narutoRunStartTime!==0){
        this.narutoRunStartTime=0;
        this.narutoRunFinishTime=timeSeconds;
        this.narutoRunTrailSoundStartTime=0;
        this.narutoRunTurnSoundStartTime=0;
        sounds.playSound(soundFiles.sonicBoom[1]);
        if (this.oldNarutoRunSound) {
          !this.oldNarutoRunSound.paused && this.oldNarutoRunSound.stop();
          this.oldNarutoRunSound = null;
        }
      }
      this.preQ.x=this.currentQ.x;
      this.preQ.y=this.currentQ.y;
      this.preQ.z=this.currentQ.z;
      this.preQ.w=this.currentQ.w;
    };
    _handleNarutoRun();

    const _handleGasp = () => {
      const isRunning = currentSpeed > 0.5;
      if(isRunning){
        if(this.startRunningTime === 0)
          this.startRunningTime = timeSeconds;
      }
      else{
        if(this.startRunningTime !== 0 && this.willGasp && !this.character.avatar.narutoRunState){
          this.playGrunt('gasp');
        }
        this.willGasp = false;
        this.startRunningTime = 0;
      }
      
      if(timeSeconds - this.startRunningTime > 5 && this.startRunningTime !== 0){
        this.willGasp = true;
      }
    }
    _handleGasp();

    const _handleFood = () => {
      const useAction = this.character.getAction('use');
      if (useAction) {
        const _handleEat = () => {
          const v = physx.physxWorker.getActionInterpolantAnimationAvatar(this.character.avatar.animationAvatarPtr, 'use', 0);
          const eatFrameIndex = _getActionFrameIndex(v, eatFrameIndices);

          // console.log('chomp', v, eatFrameIndex, this.lastEatFrameIndex);
          if (eatFrameIndex !== 0 && eatFrameIndex !== this.lastEatFrameIndex) {
            sounds.playSoundName('chomp');
            // control mouth movement
            this.character.avatarFace.setMouthMoving(0.04, 0.04, 0.1, 0.02);
          }

          this.lastEatFrameIndex = eatFrameIndex;
        };
        const _handleDrink = () => {
          // console.log('drink action', useAction);

          const v = physx.physxWorker.getActionInterpolantAnimationAvatar(this.character.avatar.animationAvatarPtr, 'use', 0);
          const drinkFrameIndex = _getActionFrameIndex(v, drinkFrameIndices);

          // console.log('gulp', v, drinkFrameIndex, this.lastDrinkFrameIndex);
          if (drinkFrameIndex !== 0 && drinkFrameIndex !== this.lastDrinkFrameIndex) {
            sounds.playSoundName('gulp');
            // control mouth movement
            this.character.avatarFace.setMouthMoving(0.1, 0.1, 0.1, 0.1);
          }

          this.lastDrinkFrameIndex = drinkFrameIndex;
        };

        // console.log('got use action', useAction);
        switch (useAction.behavior) {
          case 'eat': {
            _handleEat();
            break;
          }
          case 'drink': {
            _handleDrink();
            break;
          }
          default: {
            break;
          }
        }
      }
    };
    _handleFood();

    const _handleEmote = () => {
      if(this.character.avatar.emoteAnimation && this.lastEmote !== this.character.avatar.emoteAnimation){
        this.playEmote(this.character.avatar.emoteAnimation);
      }
      this.lastEmote = this.character.avatar.emoteAnimation;
    };
    _handleEmote();

    const _handleUse = () => {
      const useAction = this.character.getAction('use');
      if (useAction) {
        const {animationCombo, index} = useAction;
        if (Array.isArray(animationCombo) && index !== undefined) {
          const useAnimationName = animationCombo[index];
          const localUseFrameIndices = useFrameIndices[useAnimationName];
          const useFrameIndex = _getActionFrameIndex(physx.physxWorker.getActionInterpolantAnimationAvatar(this.character.avatar.animationAvatarPtr, 'use', 0), localUseFrameIndices);

          if (useFrameIndex !== 0 && useFrameIndex !== this.lastUseFrameIndex) {
            sounds.playSoundName('swordSlash');
            this.playGrunt('attack');
          }
          this.lastUseFrameIndex = useFrameIndex;
        } else {
          this.lastUseFrameIndex = -1;
        }
      } else {
        this.lastUseFrameIndex = -1;
      }
    };
    _handleUse();
  }

  playGrunt(type) {
    if (this.character.voicePack) { // ensure voice pack loaded
      const voiceFiles = this.character.voicePack.voiceFiles.actionVoices[type];

      if (voiceFiles.length === 0)
        return console.warn('No voicepack file was found for ', type);
      
      // if (index === undefined) {
        let voice = selectVoice(voiceFiles);
        const duration = voice.duration;
        const offset = voice.offset;
      /* } else {
        duration = voiceFiles[index].duration;
        offset = voiceFiles[index].offset;
      } */
      
      const audioContext = audioManager.getAudioContext();
      const audioBufferSourceNode = audioContext.createBufferSource();
      audioBufferSourceNode.buffer = this.character.voicePack.audioBuffer;

      // control mouth movement with audio volume
      if (!this.character.avatar.isAudioEnabled()) {
        this.character.avatar.setAudioEnabled(true);
      }
      audioBufferSourceNode.connect(this.character.avatar.getAudioInput());

      // if the oldGrunt are still playing
      if(this.oldGrunt){
        this.oldGrunt.stop();
        this.oldGrunt = null;
      }

      this.oldGrunt=audioBufferSourceNode;
      // clean the oldGrunt if voice end
      audioBufferSourceNode.addEventListener('ended', () => {
        if (this.oldGrunt === audioBufferSourceNode) {
          this.oldGrunt = null;
        }
      });

      audioBufferSourceNode.start(0, offset, duration);
    }
  }

  playEmote(type, index){
    if (this.character.voicePack) { // ensure voice pack loaded
      const voiceFiles = this.character.voicePack.voiceFiles.emoteVoices[type];
      
      // if (index === undefined) {
        let voice = selectVoice(voiceFiles);
        const duration = voice.duration;
        const offset = voice.offset;
      /* } else {
        duration = voiceFiles[index].duration;
        offset = voiceFiles[index].offset;
      } */
      
      const audioContext = audioManager.getAudioContext();
      const audioBufferSourceNode = audioContext.createBufferSource();
      audioBufferSourceNode.buffer = this.character.voicePack.audioBuffer;

      // control mouth movement with audio volume
      if (!this.character.avatar.isAudioEnabled()) {
        this.character.avatar.setAudioEnabled(true);
      }
      audioBufferSourceNode.connect(this.character.avatar.getAudioInput());

      // if the oldGrunt are still playing
      if(this.oldGrunt){
        this.oldGrunt.stop();
        this.oldGrunt = null;
      }

      this.oldGrunt=audioBufferSourceNode;
      // clean the oldGrunt if voice end
      audioBufferSourceNode.addEventListener('ended', () => {
        if (this.oldGrunt === audioBufferSourceNode) {
          this.oldGrunt = null;
        }
      });

      audioBufferSourceNode.start(0, offset, duration);
    }
  }

  destroy() {
    this.cleanup();
  }
}