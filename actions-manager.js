import * as b3 from './lib/behavior3js/index.js';
import metaversefileApi from 'metaversefile';

// note: tickResults will all reset to false after every tick, so don't need set `tickResults.xxx = false`.

class Loading extends b3.Action {
  tick(tick) {
    if (tick.blackboard.get('loaded')) {
      return b3.SUCCESS;
    } else {
      return b3.RUNNING;
    }
  }
}
class FallLoop extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryActions = tick.blackboard.get('tickTryActions');
    const localPlayer = tick.target;
    if (tickTryActions.glider) { // todo: use another node put in Priority instead of check glider directly here ?
      tickResults.glider = true;
      return b3.SUCCESS;
    } else if (!localPlayer.characterPhysics.grounded && ((tick.blackboard.get('now') - localPlayer.characterPhysics.lastGroundedTime) > 200)) {
      tickResults.fallLoop = true;
      return b3.RUNNING;
    } else {
      return b3.FAILURE;
    }
  }
}
class StartFallLoopFromJump extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryActions = tick.blackboard.get('tickTryActions');
    const localPlayer = tick.target;
    if (tickTryActions.fallLoop?.from === 'jump' && !localPlayer.characterPhysics.grounded) {
      tickResults.fallLoopFromJump = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class FallLoopFromJump extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const localPlayer = tick.target;
    if (localPlayer.characterPhysics.grounded) {
      return b3.FAILURE;
    } else {
      tickResults.fallLoopFromJump = true;
      return b3.RUNNING;
    }
  }
}
class Fly extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const longTryActions = tick.blackboard.get('longTryActions');
    if (longTryActions.fly) {
      tickResults.fly = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class StartJump extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryActions = tick.blackboard.get('tickTryActions');
    const localPlayer = tick.target;
    if (
      tickTryActions.jump &&
      (localPlayer.characterPhysics.grounded || localPlayer.hasAction('sit'))
    ) {
      tickResults.jump = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class Jump extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryActions = tick.blackboard.get('tickTryActions');
    const localPlayer = tick.target;
    if (localPlayer.characterPhysics.grounded) {
      return b3.FAILURE;
    } else if (tickTryActions.jump) { // note: for trigger doubleJump.
      tickResults.jump = true; // note: doubleJump need jump in parallel.
      return b3.SUCCESS;
    } else {
      tickResults.jump = true;
      return b3.RUNNING;
    }
  }
}
class DoubleJump extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const localPlayer = tick.target;
    if (localPlayer.characterPhysics.grounded) {
      return b3.FAILURE;
    } else {
      tickResults.jump = true; // note: doubleJump need jump in parallel.
      tickResults.doubleJump = true;
      return b3.RUNNING;
    }
  }
}

class Land extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const localPlayer = tick.target;
    if (localPlayer.characterPhysics.grounded) {
      tickResults.land = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class StartCrouch extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryActions = tick.blackboard.get('tickTryActions');
    if (tickTryActions.crouch) {
      tickResults.crouch = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class Crouch extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryStopActions = tick.blackboard.get('tickTryStopActions');
    if (tickTryStopActions.crouch) {
      return b3.FAILURE;
    } else {
      tickResults.crouch = true;
      return b3.RUNNING;
    }
  }
}
class WaitOneTick extends b3.Action {
  tick(tick) {
    const ticked = tick.blackboard.get('ticked', tick.tree.id, this.id)
    if (ticked) {
      tick.blackboard.set('ticked', false, tick.tree.id, this.id) // todo: need reset if be halted ?
      return b3.SUCCESS
    } else {
      tick.blackboard.set('ticked', true, tick.tree.id, this.id)
      return b3.RUNNING
    }
  }
}
class NarutoRun extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const longTryActions = tick.blackboard.get('longTryActions');
    if (longTryActions.narutoRun) {
      tickResults.narutoRun = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class StartSit extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryActions = tick.blackboard.get('tickTryActions');
    if (tickTryActions.sit) {
      tickResults.sit = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class Sit extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryStopActions = tick.blackboard.get('tickTryStopActions');
    if (tickTryStopActions.sit) {
      return b3.FAILURE;
    } else {
      tickResults.sit = true;
      return b3.RUNNING;
    }
  }
}
class HaltSit extends b3.Condition {
  tick(tick) {
    const tickTryActions = tick.blackboard.get('tickTryActions');
    const localPlayer = tick.target;
    if (tickTryActions.jump || tickTryActions.fly) {
      tick.blackboard.set('needReTick', true);
      const wearActions = localPlayer.getActionsByType('wear');
      for (const wearAction of wearActions) {
        const instanceId = wearAction.instanceId;
        const app = metaversefileApi.getAppByInstanceId(instanceId);
        const hasSitComponent = app.hasComponent('sit');
        if (hasSitComponent) {
          app.unwear();
        }
      }
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class Glider extends b3.Action {
  tick(tick) {
    const localPlayer = tick.target;
    const tickResults = tick.blackboard.get('tickResults');
    const tickTryStopActions = tick.blackboard.get('tickTryStopActions');
    if (tickTryStopActions.glider || localPlayer.characterPhysics.grounded) {
      return b3.FAILURE;
    } else {
      tickResults.glider = true;
      return b3.RUNNING;
    }
  }
}

const tree = new b3.BehaviorTree();
tree.root = new b3.MemSequence({title:'root',children: [
  new Loading({title:'Loading',}),
  new b3.Runnor({title:'loaded',child:
    new b3.Parallel({title:'main',children:[
      new b3.Priority({title:'base',children:[
        new b3.MemSequence({title:'sit',children:[
          new StartSit(),
          new b3.Priority({children:[
            new HaltSit(),
            new Sit(),
          ]}),
        ]}),
        new b3.Sequence({title:'fly & narutoRun',children:[
          new Fly({title:'Fly'}),
          new b3.Succeedor({child: new NarutoRun({title:'NarutoRun'})}),
        ]}),
        new b3.MemSequence({title:'fallLoopFromJump',children:[
          new StartFallLoopFromJump({title:'StartFallLoopFromJump'}),
          new FallLoopFromJump({title:'FallLoopFromJump'}),
        ]}),
        new b3.MemSequence({title:'jump & doubleJump',children:[
          new StartJump({title:'StartJump'}),
          new WaitOneTick({title:'WaitOneTick'}), // note: wait leave ground.
          new Jump({title:'Jump'}),
          new DoubleJump({title:'DoubleJump'}),
        ]}),
        new b3.MemSequence({title:'fallLoop & glider',children:[
          new FallLoop({title:'FallLoop'}),
          new WaitOneTick({title:'WaitOneTick'}), // note: prevent remove glider immediately, because add/remove glider all triggered by space key.
          new Glider({title:'Glider'}),
        ]}),
        new b3.MemSequence({title:'crouch',children:[
          new StartCrouch({title:'StartCrouch'}),
          new Crouch({title:'Crouch'}),
        ]}),
        new NarutoRun({title:'NarutoRun'}),
      ]}), // end: base
      new Land({title:'Land'}),
    ]}), // end: main
  }), // end: loaded
]}); // end: root

// const preTickSettings = (localPlayer, blackboard) => {
// }

const postTickSettings = (localPlayer, blackboard) => {
  const setActions = () => {
    const tickResults = blackboard.get('tickResults');
    const lastTickResults = blackboard.get('lastTickResults');
    // const tickInfos = blackboard.get('tickInfos');
    const tickTryActions = blackboard.get('tickTryActions');
    const longTryActions = blackboard.get('longTryActions');
  
    if (tickResults.crouch && !lastTickResults.crouch) {
      localPlayer.addAction(tickTryActions.crouch); // todo: auto-check tick or long ?
    }
    if (!tickResults.crouch && lastTickResults.crouch) localPlayer.removeAction('crouch');
  
    if (tickResults.land && !lastTickResults.land) {
        localPlayer.addAction({
          type: 'land',
          time: blackboard.get('now'),
          isMoving: localPlayer.avatar.idleWalkFactor > 0,
        });
    }
    if (!tickResults.land && lastTickResults.land) localPlayer.removeAction('land');
  
    if (tickResults.narutoRun && !lastTickResults.narutoRun) localPlayer.addAction(longTryActions.narutoRun);
    if (!tickResults.narutoRun && lastTickResults.narutoRun) localPlayer.removeAction('narutoRun');
  
    if (tickResults.fly && !lastTickResults.fly) localPlayer.addAction(longTryActions.fly); // todo: just tryActions is ok, don't need tick/long ?
    if (!tickResults.fly && lastTickResults.fly) localPlayer.removeAction('fly');
  
    if (tickResults.jump && !lastTickResults.jump) {
      localPlayer.addAction(tickTryActions.jump);
    }
    if (!tickResults.jump && lastTickResults.jump) {
      localPlayer.removeAction('jump');
    }
  
    if (tickResults.doubleJump && !lastTickResults.doubleJump) {
      localPlayer.addAction({
        type: 'doubleJump',
        startPositionY: localPlayer.characterPhysics.characterController.position.y,
      });
    }
    if (!tickResults.doubleJump && lastTickResults.doubleJump) {
      localPlayer.removeAction('doubleJump');
    }
  
    if (tickResults.fallLoop && !lastTickResults.fallLoop) {
      localPlayer.addAction({type: 'fallLoop'});
    }
    if (!tickResults.fallLoop && lastTickResults.fallLoop) localPlayer.removeAction('fallLoop');
  
    if (tickResults.fallLoopFromJump && !lastTickResults.fallLoopFromJump) {
      localPlayer.addAction(tickTryActions.fallLoop);
    }
    if (!tickResults.fallLoopFromJump && lastTickResults.fallLoopFromJump) {
      localPlayer.removeAction('fallLoop');
    }
  
    if (tickResults.sit && !lastTickResults.sit) {
      localPlayer.addAction(tickTryActions.sit);
    }
    if (!tickResults.sit && lastTickResults.sit) {
      localPlayer.removeAction('sit');
    }
  
    if (tickResults.glider && !lastTickResults.glider) {
      localPlayer.addAction(tickTryActions.glider);
    }
    if (!tickResults.glider && lastTickResults.glider) {
      localPlayer.removeAction('glider');
    }
  }
  setActions();

  const setLastTickResults = () => {
    const tickResults = blackboard.get('tickResults');
    const lastTickResults = blackboard.get('lastTickResults');
    for (const key in tickResults) {
      lastTickResults[key] = tickResults[key];
    }
  }
  setLastTickResults();

  const resetTickInfos = () => {
    // const tickInfos = blackboard.get('tickInfos');
    // for (const key in tickInfos) {
    //   tickInfos[key] = null;
    // }
    const tickTryActions = blackboard.get('tickTryActions');
    for (const key in tickTryActions) {
      tickTryActions[key] = null;
    }
    const tickTryStopActions = blackboard.get('tickTryStopActions');
    for (const key in tickTryStopActions) {
      tickTryStopActions[key] = null;
    }
    const tickResults = blackboard.get('tickResults');
    for (const key in tickResults) {
      tickResults[key] = false;
    }
  }
  resetTickInfos();
}

class ActionsManager {
  constructor(localPlayer) {
    this.localPlayer = localPlayer;
    this.blackboard = new b3.Blackboard(); // todo: make blackboard private.
    this.blackboard.set('tickResults', {});
    this.blackboard.set('lastTickResults', {});
    // this.blackboard.set('tickInfos', {});
    this.blackboard.set('tickTryActions', {}); // todo: rename: tickTryAddActions.
    this.blackboard.set('longTryActions', {}); // todo: rename: longTryAddActions.
    this.blackboard.set('tickTryStopActions', {}); // todo: rename: tickTryRemoveActions.
    this.blackboard.set('loaded', true);
  }

  get() {
    return this.blackboard.get(...arguments);
  }

  set() {
    return this.blackboard.set(...arguments);
  }

  tryAddAction(action, isLong = false) {
    if (isLong) {
      const longTryActions = this.blackboard.get('longTryActions');
      longTryActions[action.type] = action; // todo: how to handle multiple same actionType long try ?
      const tickTryActions = this.blackboard.get('tickTryActions');
      tickTryActions[action.type] = action; // note: long try also trigger tick try.
    } else {
      const tickTryActions = this.blackboard.get('tickTryActions');
      tickTryActions[action.type] = action;
    }
  }

  tryRemoveAction(actionType, isLong = false) {
    if (isLong) {
      const longTryActions = this.blackboard.get('longTryActions');
      longTryActions[actionType] = null;
    } else {
      const tickTryStopActions = this.blackboard.get('tickTryStopActions');
      tickTryStopActions[actionType] = true;
    }
  }

  isLongTrying(actionType) {
    const longTryActions = this.blackboard.get('longTryActions');
    return !!longTryActions[actionType];
  }

  update(timestamp) {
    this.blackboard.set('now', timestamp);
    // preTickSettings(this.localPlayer, this.blackboard);
    tree.tick(this.localPlayer, this.blackboard);
    if (this.blackboard.get('needReTick')) {
      this.blackboard.set('needReTick', false);
      tree.tick(this.localPlayer, this.blackboard); // note: will and needed to use the same `tickInfos` as first tree.tick(), because of called before `postTickSettings()`.
    }
    postTickSettings(this.localPlayer, this.blackboard);
  }
}

export {ActionsManager};