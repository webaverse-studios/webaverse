import npcManager from './npc-manager';
import {idleFn, followFn} from './npc-behavior';

const npcBehaviorMap = new WeakMap();

const behaviorFns = [
  idleFn,
  followFn,
]

class NpcAiManager {
  constructor() {
    this.npcs = [];

    const updateNpcs = () => {
      this.npcs = [].concat(
        npcManager.npcs,
        npcManager.detachedNpcs,
      ).filter(player => player.getControlMode() !== 'controlled');
    };

    const handlePlayerAdd = e => {
      updateNpcs();
    };

    const handlePlayerRemove = e => {
      const player = e.data.player;
      const app = npcManager.getAppByNpc(player);
      if (npcBehaviorMap.has(app)) {
        npcBehaviorMap.delete(app);
      }
      updateNpcs();
    };

    npcManager.addEventListener('playeradd', handlePlayerAdd);
    npcManager.addEventListener('playerremove', handlePlayerRemove);
  }

  update(timestamp, timeDiff) {
    for(const npc of this.npcs) {
      const app = npcManager.getAppByNpc(npc);
      const currentState = npcBehaviorMap.get(app);
      const nextState = app.getComponent('state');
      if (currentState !== nextState) {
        npcBehaviorMap.set(app, nextState);
        npcManager.setBehaviorFn(app, behaviorFns[nextState]);
        // console.log('changing state', currentState, '->', nextState);
      }
    }
  }

}

const npcAiManager = new NpcAiManager();
export default npcAiManager;