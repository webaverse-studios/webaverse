/*
this file contains the story beat triggers (battles, victory, game over, etc.)
*/

import * as THREE from 'three';
import metaversefile from 'metaversefile';
import {SwirlPass} from './SwirlPass.js';
import {
  getRenderer,
  rootScene,
  camera,
} from './renderer.js';
import * as sounds from './sounds.js';
import musicManager from './music-manager.js';
import cameraManager from './camera-manager.js';
import npcManager from './npc-manager.js';
import {chatManager} from './chat-manager.js';
import {mod} from './util.js';
import {playersManager} from './players-manager.js';
import renderSettingsManager from './rendersettings-manager.js';

import emoteManager from './emotes/emote-manager.js';

//

const localVector2D = new THREE.Vector2();

const upVector = new THREE.Vector3(0, 1, 0);

//

function makeSwirlPass() {
  const renderer = getRenderer();
  const size = renderer.getSize(localVector2D)
    .multiplyScalar(renderer.getPixelRatio());
  const resolution = size;
  const swirlPass = new SwirlPass(rootScene, camera, resolution.x, resolution.y);
  return swirlPass;
}
let swirlPass = null;
const _startSwirl = () => {
  if (!swirlPass) {
    swirlPass = makeSwirlPass();
    renderSettingsManager.addExtraPass(swirlPass);

    sounds.playSoundName('battleTransition');
    musicManager.playCurrentMusicName('battle');
  }
};
const _stopSwirl = () => {
  if (swirlPass) {
    renderSettingsManager.removeExtraPass(swirlPass);
    swirlPass = null;

    musicManager.stopCurrentMusic();
    return true;
  } else {
    return false;
  }
};

//

const fuzzyEmotionMappings = {
  "alert": "alert",
  "angry": "angry",
  "embarrassed": "embarrassed",
  "headNod": "headNod",
  "headShake": "headShake",
  "sad": "sad",
  "surprise": "surprise",
  "victory": "victory",
  "surprised": "surprise",
  "happy": "victory",
  "sorrow": "sad",
  "joy": "victory",
  "confused": "alert",
};
export const getFuzzyEmotionMapping = emotionName => fuzzyEmotionMappings[emotionName];

//

const _playerSay = async (player, message) => {
  const preloadedMessage = player.voicer.preloadMessage(message);
  await chatManager.waitForVoiceTurn(async () => {
    const audio = await player.voicer.start(preloadedMessage);
    console.log("player say", message, audio)
    // setText(message);
    return audio
  });
  // setText('');
};
class Conversation extends EventTarget {
  constructor(localPlayer, remotePlayer) {
    super();

    this.localPlayer = localPlayer;
    this.remotePlayer = remotePlayer;

    this.messages = [];
    this.finished = false;
    this.progressing = false;
    this.deltaY = 0;

    this.options = null;
    this.option = null;
    this.hoverIndex = null;

    /* this.addEventListener('message', e => {
      if (this.options) {
        const {message} = e.data;
        this.#setOption(message.text);
      }
    }); */
  }

  addLocalPlayerMessage(text, type = 'chat') {
    const message = {
      type,
      player: this.localPlayer,
      name: this.localPlayer.name,
      text,
    };
    this.messages.push(message);

    this.dispatchEvent(new MessageEvent('message', {
      data: {
        message,
      },
    }));

    (async () => {
      await _playerSay(this.localPlayer, text);
    })();

    const first = this.messages.length === 1;
    cameraManager.setDynamicTarget(
      this.localPlayer.avatar.modelBones.Head,
      this.remotePlayer?.avatar.modelBones.Head,
      first,
    );
  }

  addRemotePlayerMessage(text, emote, type = 'chat') {
    const message = {
      type,
      player: this.remotePlayer,
      name: this.remotePlayer.name,
      text,
      emote,
    };
    this.messages.push(message);

    this.dispatchEvent(new MessageEvent('message', {
      data: {
        message,
      },
    }));

    (async () => {
      await _playerSay(this.remotePlayer, text);
    })();

    const first = this.messages.length === 1;
    cameraManager.setDynamicTarget(
      this.remotePlayer.avatar.modelBones.Head,
      this.localPlayer.avatar.modelBones.Head,
      first,
    );

    const fuzzyEmotionName = getFuzzyEmotionMapping(emote);
    if (fuzzyEmotionName) {
      emoteManager.triggerEmote(fuzzyEmotionName, this.remotePlayer);
    }
  }

  async wrapProgress(fn) {
    if (!this.progressing) {
      this.progressing = true;
      this.dispatchEvent(new MessageEvent('progressstart'));

      try {
        await fn();
      } finally {
        this.progressing = false;
        this.dispatchEvent(new MessageEvent('progressend'));
      }
    } else {
      console.warn('ignoring conversation progress() because it was already in progress');
    }
  }

  progressChat() {
    console.log('progress chat');

    this.wrapProgress(async () => {
      const aiScene = metaversefile.useLoreAIScene();
      const {
        value: comment,
        emote,
        done,
      } = await aiScene.generateChatMessage(this.messages, this.remotePlayer.name);
      console.log('got comment', comment, emote, done, this.remotePlayer, this.localPlayer)
      if (!this.messages.some(m => m.text === comment && m.player === this.remotePlayer)) {
        this.addRemotePlayerMessage(comment, emote);
        done && this.finish();
      } else {
        this.finish();
      }
    });
  }

  progressSelf() {
    console.log('progress self');

    this.wrapProgress(async () => {
      const aiScene = metaversefile.useLoreAIScene();
      const {
        value: comment,
        done,
      } = await aiScene.generateChatMessage(this.messages, this.localPlayer.name);

      if (!this.messages.some(m => m.text === comment && m.player === this.localPlayer)) {
        this.addLocalPlayerMessage(comment);
        done && this.finish();
      } else {
        this.finish();
      }
    });
  }

  progressSelfOptions() {
    console.log('progress self options');

    this.wrapProgress(async () => {
      const aiScene = metaversefile.useLoreAIScene();
      const {
        value: options,
        done,
      } = await aiScene.generateDialogueOptions(this.messages, this.localPlayer.name);

      if (!done) {
        this.#setOptions(options);
        this.#setHoverIndex(0);
      } else {
        this.finish();
      }
    });
  }

  progressOptionSelect(option) {
    if (!option) {
      option = this.options[this.hoverIndex];
      if (!option) {
        throw new Error('failed to select option (not in options state?)');
      }
    }

    // say the option
    this.addLocalPlayerMessage(option.message, 'option');

    const fuzzyEmotionName = getFuzzyEmotionMapping(option.emote);
    if (fuzzyEmotionName) {
      emoteManager.triggerEmote(fuzzyEmotionName, this.localPlayer);
    }

    // clear options
    this.#setOptions(null);
    this.#setOption(option);

    // 25% chance of self elaboration, 75% chance of other character reply
    this.localTurn = Math.random() < 0.25;
  }

  #getMessageAgo(n) {
    return this.messages[this.messages.length - n] ?? null;
  }

  progress() {
    if (!this.finished) {
      const lastMessage = this.#getMessageAgo(1);

      const _handleLocalTurn = () => {
        // console.log('check last message 1', lastMessage, lastMessage?.type === 'chat', lastMessage?.player === this.localPlayer);

        if (lastMessage?.type === 'chat' && lastMessage?.player === this.localPlayer) {
          // 50% chance of showing options
          if (Math.random() < 0.5) {
            this.progressSelfOptions();
            this.localTurn = true;
          } else {
            this.progressSelf();

            // 50% chance of moving to the other character
            this.localTurn = Math.random() < 0.5;
          }
        } else {
          this.progressSelf();

          // 50% chance of moving to the other character
          this.localTurn = Math.random() < 0.5;
        }
      };
      const _handleOtherTurn = () => {
        // console.log('check last message 2', lastMessage, lastMessage?.type === 'chat', lastMessage?.player === this.remotePlayer);

        if (lastMessage?.type === 'chat' && lastMessage?.player === this.remotePlayer) {
          // 70% chance of showing options
          if (Math.random() < 0.7) {
            this.progressSelfOptions();
            this.localTurn = true;
          } else {
            // otherwise 50% chance of each character taking a turn
            if (Math.random() < 0.5) {
              this.progressChat();
            } else {
              this.localTurn = true;
              this.progress();
            }
          }
        } else { // it is the remote character's turn
          this.progressChat();
        }
      };

      if (this.options) {
        this.progressOptionSelect();
      } else {
        if (this.localTurn) {
          _handleLocalTurn();
        } else {
          _handleOtherTurn();
        }
      }
    } else {
      this.close();
    }
  }

  finish() {
    this.finished = true;
    this.dispatchEvent(new MessageEvent('finish'));
  }

  close() {
    this.dispatchEvent(new MessageEvent('close'));
  }

  #setOptions(options) {
    this.options = options;

    this.dispatchEvent(new MessageEvent('options', {
      data: {
        options,
      },
    }));
  }

  #setOption(option) {
    this.option = option;

    this.dispatchEvent(new MessageEvent('option', {
      data: {
        option: this.option,
      },
    }));
  }

  #getHoverIndexAbsolute() {
    const selectScrollIncrement = 150;
    return Math.floor(this.deltaY / selectScrollIncrement);
  }

  #setHoverIndex(hoverIndex) {
    this.hoverIndex = hoverIndex;

    this.dispatchEvent(new MessageEvent('hoverindex', {
      data: {
        hoverIndex: this.hoverIndex,
      },
    }));
  }

  handleWheel(e) {
    if (this.options) {
      const oldHoverIndexAbsolute = this.#getHoverIndexAbsolute();
      this.deltaY += e.deltaY;
      const newHoverIndexAbsolute = this.#getHoverIndexAbsolute();

      if (newHoverIndexAbsolute !== oldHoverIndexAbsolute) {
        const newHoverIndex = mod(newHoverIndexAbsolute, this.options.length);
        this.#setHoverIndex(newHoverIndex);
      }

      return true;
    } else {
      return false;
    }
  }
}

//

const fieldMusicNames = [
  'dungeon',
  'homespace',
];

//

let currentFieldMusic = null;
let currentFieldMusicIndex = 0;
export const handleStoryKeyControls = async e => {

  switch (e.which) {
    case 48: { // 0
      await musicManager.waitForLoad();
      _stopSwirl() || _startSwirl();
      return false;
    }
    case 57: { // 9
      await musicManager.waitForLoad();
      _stopSwirl();
      if (currentFieldMusic) {
        musicManager.stopCurrentMusic();
        currentFieldMusic = null;
      } else {
        const fieldMusicName = fieldMusicNames[currentFieldMusicIndex];
        currentFieldMusicIndex = (currentFieldMusicIndex + 1) % fieldMusicNames.length;
        currentFieldMusic = musicManager.playCurrentMusic(fieldMusicName, {
          repeat: true,
        });
      }
      return false;
    }
    case 189: { // -
      await musicManager.waitForLoad();
      _stopSwirl();
      musicManager.playCurrentMusic('victory', {
        repeat: true,
      });
      return false;
    }
    case 187: { // =
      await musicManager.waitForLoad();

      _stopSwirl();
      musicManager.playCurrentMusic('gameOver', {
        repeat: true,
      });
      return false;
    }
  }

  return true;

};

export const startConversation = app => {
  if (!app)
    return console.warn(
      'could not find app for physics id',
    );
  const {appType} = app;

  // cameraManager.setFocus(false);
  // zTargeting.focusTargetReticle = null;
  sounds.playSoundName('menuSelect');

  cameraManager.setFocus(false);
  cameraManager.setDynamicTarget();

  (async () => {
    const aiScene = metaversefile.useLoreAIScene();
    if (appType === 'npc') {
      const {name, description} = app.getLoreSpec();
      const remotePlayer = npcManager.getNpcByApp(app);

      if (remotePlayer) {
        const {
          value: comment,
          done,
        } = await aiScene.generateSelectCharacterComment(name, description);

        _startConversation(comment, remotePlayer, done);
      } else {
        console.warn('no player associated with app', app);
      }
    } else {
      const {name, description} = app;
      const comment = await aiScene.generateSelectTargetComment(name, description);
      const fakePlayer = {
        avatar: {
          modelBones: {
            Head: app,
          },
        },
      };
      _startConversation(comment, fakePlayer, true);
    }
  })();
}

export const progressConversation = () => {
  if (!currentConversation.progressing) {
    currentConversation.progress();
    sounds.playSoundName('menuNext');
  }
}

const story = new EventTarget();

let currentConversation = null;
story.getConversation = () => currentConversation;

// returns whether the event was handled (used for options scrolling)
story.handleWheel = e => {
  if (currentConversation) {
    return currentConversation.handleWheel(e);
  } else {
    return false;
  }
};

const _startConversation = (comment, remotePlayer, done) => {
  const localPlayer = playersManager.getLocalPlayer();
  currentConversation = new Conversation(localPlayer, remotePlayer);
  const newStoryAction = {
    type: 'story',
  };
  localPlayer.addAction(newStoryAction);
  currentConversation.addEventListener('close', () => {
    currentConversation = null;
    localPlayer.removeAction('story');
    cameraManager.setDynamicTarget(null);
  }, {once: true});
  story.dispatchEvent(new MessageEvent('conversationstart', {
    data: {
      conversation: currentConversation,
    },
  }));
  currentConversation.addLocalPlayerMessage(comment);
  done && currentConversation.finish();
  return currentConversation;
};
story.startLocalPlayerComment = comment => {
  return _startConversation(comment, null, true);
};

story.listenHack = () => {
  (typeof window !== 'undefined') && window.document.addEventListener('click', async e => {
    if (cameraManager.pointerLockElement) {
      if (e.button === 0 && currentConversation) {
        if (!currentConversation.progressing) {
          progressConversation();
        }
      }
    }
  });
};

export default story;
