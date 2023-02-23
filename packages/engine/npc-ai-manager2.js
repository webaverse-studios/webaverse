// import npcManager from './npc-manager.js';
import {
  NpcManager,
} from './npc-manager.js';
import {idleFn, followFn} from './npc-behavior.js';
// import metaversefile from 'metaversefile';

const npcStateMap = new WeakMap();

const behaviorFns = [
  idleFn,
  followFn,
]

export class NpcAiManager {
  constructor({
    npcManager,
  }) {
    if (!npcManager) {
      throw new Error('missing required argument');
    }
    this.npcManager = npcManager;
    
    this.npcs = [];
    
    const addPlayer = player => {
      if (player.getControlMode() !== 'controlled') {
        this.npcs.push(player);
      }
    };

    const removePlayer = player => {
      const app = npcManager.getAppByNpc(player);
      if (npcStateMap.has(app)) {
        npcStateMap.delete(app);
      }
      const removeIndex = this.npcs.indexOf(player);
      this.npcs.splice(removeIndex, 1);
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
      const currentState = npcStateMap.get(app);
      const currentBehavior = currentState && currentState.behavior;
      const state = app.getComponent('state');
      
      if(state && state.behavior){

        const {behavior} = state;
        
        if (currentBehavior !== behavior) {
          const targetPlayer = npcManager.getNpcByAppInstanceId(state.target);
          console.log('changed state to', behavior, 'state.target', state.target, 'targetPlayer', targetPlayer)
          npc.target = targetPlayer;
          npcStateMap.set(app, state);
          npcManager.setBehaviorFn(app, behaviorFns[behavior]);
        }
      }
    }
  }
}
// const npcAiManager = new NpcAiManager();
// export default npcAiManager;