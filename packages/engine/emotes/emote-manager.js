import {playersManager} from '../players-manager.js';
import {emoteAnimations} from '../avatars/animationHelpers.js';
import emotes from './emotes.json';

class EmoteManager {
  constructor() {
    this.emoteTimeouts = new Map();
  }

  getEmoteSpec(emoteName) {
    const emoteHardName = emoteName.replace(/Soft$/, '');
    const emote = emotes.find(emote => emote.name === emoteHardName);
    return emote;
  }

  triggerEmote(emoteName, player = playersManager.getLocalPlayer()) {
    return new Promise((accept, reject) => {
      const emoteSpec = this.getEmoteSpec(emoteName);
      if (!emoteSpec) {
        debugger;
      }
      const emoteHardName = emoteSpec.name;

      // clear old emote
      player.removeAction('emote');
      const oldEmoteTimeout = this.emoteTimeouts.get(player);
      if (oldEmoteTimeout) {
        clearTimeout(oldEmoteTimeout);
        this.emoteTimeouts.delete(player);
      }

      // add new emote
      const newEmoteAction = {
        type: 'emote',
        animation: emoteHardName,
      };
      player.addAction(newEmoteAction);

      const newFacePoseAction = {
        type: 'facepose',
        emotion: emoteHardName,
      };
      player.addAction(newFacePoseAction);

      const emoteAnimation = emoteAnimations[emoteHardName];
      const emoteAnimationDuration = emoteAnimation.duration;
      const newEmoteTimeout = setTimeout(() => {
        const emoteActionIndex = player.findActionIndex(action => action.type === 'emote' && action.animation === emoteHardName);
        player.removeActionIndex(emoteActionIndex);
        this.emoteTimeouts.delete(player);
        const faceposeActionIndex = player.findActionIndex(action => action.type === 'facepose' && action.emotion === emoteHardName);
        player.removeActionIndex(faceposeActionIndex);
        this.emoteTimeouts.delete(player);

        accept();
      }, emoteAnimationDuration * 1000);
      this.emoteTimeouts.set(player, newEmoteTimeout);
    });
  }
}
export {
  emotes,
};
const emoteManager = new EmoteManager();
export default emoteManager;