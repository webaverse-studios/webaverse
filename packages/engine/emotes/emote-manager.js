// import {playersManager} from '../players-manager.js';
import {
  PlayersManager,
} from '../players-manager.js';
import {emoteAnimations} from '../avatars/animationHelpers.js';
import emotes from './emotes.json';

export class EmoteManager {
  constructor({
    playersManager,
  }) {
    if (!playersManager) {
      console.warn('no playersManager');
      debugger;
    }

    this.emoteTimeouts = new Map();
  }

  // static emotes = emotes;

  getEmoteSpec(emoteName) {
    const emoteHardName = emoteName.replace(/Soft$/, '');
    const emote = emotes.find(emote => emote.name === emoteHardName);
    return emote;
  }

  triggerEmote(emoteName, player) {
    if (!emoteName || !player) {
      console.warn('bad player', {
        emoteName,
        player,
      });
      debugger;
    }

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
      const newAction = {
        type: 'emote',
        animation: emoteHardName,
      };
      player.addAction(newAction);

      const emoteAnimation = emoteAnimations[emoteHardName];
      const emoteAnimationDuration = emoteAnimation.duration;
      const newEmoteTimeout = setTimeout(() => {
        const actionIndex = player.findActionIndex(action => action.type === 'emote' && action.animation === emoteHardName);
        player.removeActionIndex(actionIndex);
        this.emoteTimeouts.delete(player);

        accept();
      }, emoteAnimationDuration * 1000);
      this.emoteTimeouts.set(player, newEmoteTimeout);
    });
  }
}
// export {
//   emotes,
// };
// const emoteManager = new EmoteManager();
// export default emoteManager;