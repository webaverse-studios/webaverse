import * as b3 from './lib/behavior3js/index.js';
import metaversefileApi from 'metaversefile';

// note: doc/explain: https://github.com/upstreet-labs/app/pull/393#issue-1486522153 , https://github.com/upstreet-labs/app/pull/359#issuecomment-1338063650 .

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
    const frameTryActions = tick.blackboard.get('frameTryActions');
    const localPlayer = tick.target;
    if (
      !localPlayer.characterPhysics.grounded &&
      (
        ((tick.blackboard.get('now') - localPlayer.characterPhysics.lastGroundedTime) > 200) ||
        frameTryActions.fallLoop
      )
    ) {
      tickResults.fallLoop = true;
      return b3.RUNNING;
    } else {
      return b3.FAILURE;
    }
  }
}
class StartSkydive extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const frameTryActions = tick.blackboard.get('frameTryActions');
    const localPlayer = tick.target;
    if (!localPlayer.characterPhysics.grounded && frameTryActions.skydive) {
      tickResults.skydive = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class Skydive extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const localPlayer = tick.target;
    if (!localPlayer.characterPhysics.grounded) {
      tickResults.skydive = true;
      return b3.RUNNING;
    } else {
      return b3.FAILURE;
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
    const frameTryActions = tick.blackboard.get('frameTryActions');
    const localPlayer = tick.target;
    if (
      frameTryActions.jump &&
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
    const frameTryActions = tick.blackboard.get('frameTryActions');
    const frameTryStopActions = tick.blackboard.get('frameTryStopActions');
    const localPlayer = tick.target;
    if (frameTryStopActions.jump || localPlayer.characterPhysics.grounded) {
      return b3.FAILURE;
    } else if (frameTryActions.jump) { // note: for trigger doubleJump.
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
    const frameTryStopActions = tick.blackboard.get('frameTryStopActions');
    const localPlayer = tick.target;
    if (frameTryStopActions.doubleJump || localPlayer.characterPhysics.grounded) {
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
    const frameTryActions = tick.blackboard.get('frameTryActions');
    if (frameTryActions.crouch) {
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
    const frameTryStopActions = tick.blackboard.get('frameTryStopActions');
    if (frameTryStopActions.crouch) {
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
      tick.blackboard.set('ticked', false, tick.tree.id, this.id)
      return b3.SUCCESS
    } else {
      tick.blackboard.set('ticked', true, tick.tree.id, this.id)
      return b3.RUNNING
    }
  }
}
class WaitOneFrame extends b3.Action {
  tick(tick) {
    const frameCount = tick.blackboard.get('frameCount');
    const thisFrameCount = tick.blackboard.get('frameCount', tick.tree.id, this.id);
    const tickResults = tick.blackboard.get('tickResults');
    if (!thisFrameCount) {
      tick.blackboard.set('frameCount', frameCount, tick.tree.id, this.id);
    }
    if (frameCount > thisFrameCount) {
      tick.blackboard.set('frameCount', undefined, tick.tree.id, this.id);
      return b3.SUCCESS
    } else {
      if (this.setTrueKey) tickResults[this.setTrueKey] = true;
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
    const frameTryActions = tick.blackboard.get('frameTryActions');
    if (frameTryActions.sit) {
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
    const frameTryStopActions = tick.blackboard.get('frameTryStopActions');
    if (frameTryStopActions.sit) {
      return b3.FAILURE;
    } else {
      tickResults.sit = true;
      return b3.RUNNING;
    }
  }
}
class HaltSit extends b3.Condition {
  tick(tick) {
    const frameTryActions = tick.blackboard.get('frameTryActions');
    const localPlayer = tick.target;
    if (frameTryActions.jump || frameTryActions.fly) {
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
class StartSwim extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const frameTryActions = tick.blackboard.get('frameTryActions');
    if (frameTryActions.swim) {
      tickResults.swim = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class Swim extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const frameTryStopActions = tick.blackboard.get('frameTryStopActions');
    if (frameTryStopActions.swim) {
      return b3.FAILURE;
    } else {
      tickResults.swim = true;
      return b3.RUNNING;
    }
  }
}
class StartGlider extends b3.Action {
  tick(tick) {
    const tickResults = tick.blackboard.get('tickResults');
    const frameTryActions = tick.blackboard.get('frameTryActions');
    if (frameTryActions.glider) {
      tickResults.glider = true;
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
    const frameTryStopActions = tick.blackboard.get('frameTryStopActions');
    if (frameTryStopActions.glider || localPlayer.characterPhysics.grounded) {
      // tickResults.glider = true; // note: don't set `true` here to solve one frame empty tick issue when switch from low prio glider to high prio fallLoop, it's bad design, do reTick/doubleTick instead.
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
      new b3.Priority({title:'swim & base & land',children:[
        new b3.MemSequence({title:'swim',children:[
          new StartSwim(),
          new Swim(),
        ]}),
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
          new b3.MemSequence({title:'jump & doubleJump',children:[
            new StartJump({title:'StartJump'}),
            new WaitOneFrame({title:'WaitOneFrame',setTrueKey:'jump'}), // note: wait leave ground.
            new Jump({title:'Jump'}),
            new DoubleJump({title:'DoubleJump'}),
          ]}),
          new b3.MemSequence({title:'fallLoop & skydive & glider',children:[
            new b3.Priority({children:[
              new StartSkydive({title:'StartSkydive'}),
              new FallLoop({title:'FallLoop'}),
            ]}),
            new b3.Priority({children:[
              new StartGlider({title:'StartGlider'}),
              new b3.Parallel({children:[
                new FallLoop({title:'FallLoop'}),
                new Skydive({title:'Skydive'}),
              ]}),
            ]}),
            new WaitOneFrame({title:'WaitOneFrame',setTrueKey:'glider'}), // note: WaitOneFrame to prevent remove glider immediately, because add/remove glider all triggered by space key.
            new Glider({title:'Glider'}),
          ]}),
          new b3.MemSequence({title:'crouch',children:[
            new StartCrouch({title:'StartCrouch'}),
            new Crouch({title:'Crouch'}),
          ]}),
          new NarutoRun({title:'NarutoRun'}),
        ]}), // end: base
        new Land({title:'Land'}),
      ]}),
    ]}), // end: main
  }), // end: loaded
]}); // end: root

const clearTickResults = (localPlayer, blackboard) => {
  const tickResults = blackboard.get('tickResults');
  for (const key in tickResults) {
    tickResults[key] = false;
  }
}

const preFrameSettings = (localPlayer, blackboard, timestamp) => {
  blackboard.set('now', timestamp);
}

const postFrameSettings = (localPlayer, blackboard) => {
  const tickResults = blackboard.get('tickResults');
  const lastFrameResults = blackboard.get('lastFrameResults');
  const frameTryActions = blackboard.get('frameTryActions');
  const longTryActions = blackboard.get('longTryActions');

  const setActions = () => {  
    if (tickResults.crouch && !lastFrameResults.crouch) {
      localPlayer.addAction(frameTryActions.crouch);
    }
    if (!tickResults.crouch && lastFrameResults.crouch) localPlayer.removeAction('crouch');
  
    if (tickResults.land && !lastFrameResults.land) {
      const newLandAction = {
        type: 'land',
        time: blackboard.get('now'),
        isMoving: localPlayer.avatar.idleWalkFactor > 0,
      }
      localPlayer.addAction(newLandAction);
    }
    if (!tickResults.land && lastFrameResults.land) localPlayer.removeAction('land');
  
    if (tickResults.narutoRun && !lastFrameResults.narutoRun) {
      localPlayer.addAction(longTryActions.narutoRun);
    }
    if (!tickResults.narutoRun && lastFrameResults.narutoRun) {
      localPlayer.removeAction('narutoRun');
    }
  
    if (tickResults.fly && !lastFrameResults.fly) localPlayer.addAction(longTryActions.fly);
    if (!tickResults.fly && lastFrameResults.fly) localPlayer.removeAction('fly');
  
    if (tickResults.jump && !lastFrameResults.jump) {
      localPlayer.addAction(frameTryActions.jump);
    }
    if (!tickResults.jump && lastFrameResults.jump) {
      localPlayer.removeAction('jump');
    }
  
    if (tickResults.doubleJump && !lastFrameResults.doubleJump) {
      const newDoubleJumpAction = {
        type: 'doubleJump',
        startPositionY: localPlayer.characterPhysics.characterController.position.y,
      }
      localPlayer.addAction(newDoubleJumpAction);
    }
    if (!tickResults.doubleJump && lastFrameResults.doubleJump) {
      localPlayer.removeAction('doubleJump');
    }
  
    if (tickResults.fallLoop && !lastFrameResults.fallLoop) {
      if (frameTryActions.fallLoop) {
        localPlayer.addAction(frameTryActions.fallLoop)
      } else {
        const newFallLoopAction = {type: 'fallLoop'};
        localPlayer.addAction(newFallLoopAction);
      }
    }
    if (!tickResults.fallLoop && lastFrameResults.fallLoop) localPlayer.removeAction('fallLoop');
  
    if (tickResults.skydive && !lastFrameResults.skydive) {
      localPlayer.addAction(frameTryActions.skydive);
    }
    if (!tickResults.skydive && lastFrameResults.skydive) localPlayer.removeAction('skydive');
  
    if (tickResults.fallLoopFromJump && !lastFrameResults.fallLoopFromJump) {
      localPlayer.addAction(frameTryActions.fallLoop);
    }
    if (!tickResults.fallLoopFromJump && lastFrameResults.fallLoopFromJump) {
      localPlayer.removeAction('fallLoop');
    }
  
    if (tickResults.sit && !lastFrameResults.sit) {
      localPlayer.addAction(frameTryActions.sit);
    }
    if (!tickResults.sit && lastFrameResults.sit) {
      localPlayer.removeAction('sit');
    }
  
    if (tickResults.swim && !lastFrameResults.swim) {
      localPlayer.addAction(frameTryActions.swim);
    }
    if (!tickResults.swim && lastFrameResults.swim) {
      localPlayer.removeAction('swim');
    }
  
    if (tickResults.glider && !lastFrameResults.glider) {
      localPlayer.addAction(frameTryActions.glider);
      localPlayer.glider.visible = true;
    }
    if (!tickResults.glider && lastFrameResults.glider) {
      localPlayer.removeAction('glider');
      localPlayer.glider.visible = false;
    }
  }
  setActions();

  const setLastFrameResults = () => {
    const tickResults = blackboard.get('tickResults');
    const lastFrameResults = blackboard.get('lastFrameResults');
    for (const key in tickResults) {
      lastFrameResults[key] = tickResults[key];
    }
  }
  setLastFrameResults();

  const resetFrameInfos = () => {
    const frameTryActions = blackboard.get('frameTryActions');
    for (const key in frameTryActions) {
      frameTryActions[key] = null;
    }
    const frameTryStopActions = blackboard.get('frameTryStopActions');
    for (const key in frameTryStopActions) {
      frameTryStopActions[key] = null;
    }
  }
  resetFrameInfos();

  blackboard.set('frameCount', blackboard.get('frameCount') + 1);
}

class ActionsManager {
  constructor(localPlayer) {
    this.localPlayer = localPlayer;
    this.blackboard = new b3.Blackboard();
    this.blackboard.set('tickResults', {});
    this.blackboard.set('lastFrameResults', {});
    this.blackboard.set('frameTryActions', {});
    this.blackboard.set('longTryActions', {});
    this.blackboard.set('frameTryStopActions', {});
    this.blackboard.set('frameCount', 0);
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
      longTryActions[action.type] = action;
      const frameTryActions = this.blackboard.get('frameTryActions');
      frameTryActions[action.type] = action; // note: long try also trigger frame try.
    } else {
      const frameTryActions = this.blackboard.get('frameTryActions');
      frameTryActions[action.type] = action;
    }
  }

  tryRemoveAction(actionType, isLong = false) {
    if (isLong) {
      const longTryActions = this.blackboard.get('longTryActions');
      longTryActions[actionType] = null;
    } else {
      const frameTryStopActions = this.blackboard.get('frameTryStopActions');
      frameTryStopActions[actionType] = true;
    }
  }

  isLongTrying(actionType) {
    const longTryActions = this.blackboard.get('longTryActions');
    return !!longTryActions[actionType];
  }

  update(timestamp) {
    preFrameSettings(this.localPlayer, this.blackboard, timestamp);
    tree.tick(this.localPlayer, this.blackboard);
    clearTickResults(this.localPlayer, this.blackboard);
    tree.tick(this.localPlayer, this.blackboard); // note: reTick/doubleTick in order to switch from low prio action to high prio action immediately, prevent one frame empty state/action.
    postFrameSettings(this.localPlayer, this.blackboard);
    clearTickResults(this.localPlayer, this.blackboard);
  }
}

export {ActionsManager};