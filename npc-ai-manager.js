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

    const addPlayer = player => {
      if (player.getControlMode() !== 'controlled') {
        this.npcs.push(player);
        console.log(player);
      }
    };

    const removePlayer = player => {
      const app = npcManager.getAppByNpc(player);
      if (npcBehaviorMap.has(app)) {
        npcBehaviorMap.delete(app);
      }
      const removeIndex = this.npcs.indexOf(player);
      const removed = this.npcs.splice(removeIndex, 1);
      console.log(removed);
    };

    const handlePlayerAdd = e => {
      addPlayer(e.data.player);
    };

    const handlePlayerRemove = e => {
      removePlayer(e.data.player);
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