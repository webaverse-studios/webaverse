// import * as b3 from './lib/behavior3js/index.js';
// import metaversefileApi from 'metaversefile';

// note: doc/explain: https://github.com/upstreet-labs/app/pull/393#issue-1486522153 , https://github.com/upstreet-labs/app/pull/359#issuecomment-1338063650 .
// note: tickResults will all reset to false after every tick, so don't need set `tickResults.xxx = false`.

/* class Loading extends b3.Action {
  tick(tick) {
    if (tick.blackboard.get('loaded')) {
      return b3.SUCCESS;
    } else {
      return b3.RUNNING;
    }
  }
} */
const _fallLoop = (blackboard) => {
  const tickResults = blackboard.get('tickResults');
  const frameTryActions = blackboard.get('frameTryActions');
  // const localPlayer = target;
  const localPlayer = this.playersManager.getLocalPlayer();
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
    return false;
  }
};
const _startSkydive = (blackboard) => {
  const tickResults = blackboard.get('tickResults');
  const frameTryActions = blackboard.get('frameTryActions');
  // const localPlayer = tick.target;
  const localPlayer = this.playersManager.getLocalPlayer();
  if (!localPlayer.characterPhysics.grounded && frameTryActions.skydive) {
    tickResults.skydive = true;
    return true;
  } else {
    return false;
  }
};
const _skydive = (blackboard) => {
  const tickResults = blackboard.get('tickResults');
  // const localPlayer = tick.target;
  const localPlayer = this.playersManager.getLocalPlayer();
  if (!localPlayer.characterPhysics.grounded) {
    tickResults.skydive = true;
    return b3.RUNNING;
  } else {
    return false;
  }
};
const _fly = (blackboard) => {
  const tickResults = blackboard.get('tickResults');
  const longTryActions = blackboard.get('longTryActions');
  if (longTryActions.fly) {
    tickResults.fly = true;
    return true;
  } else {
    return false;
  }
};
const _startJump = (blackboard) => {
  const tickResults = blackboard.get('tickResults');
  const frameTryActions = blackboard.get('frameTryActions');
  // const localPlayer = tick.target;
  const localPlayer = this.playersManager.getLocalPlayer();
  if (
    frameTryActions.jump &&
    (localPlayer.characterPhysics.grounded || localPlayer.hasAction('sit'))
  ) {
    tickResults.jump = true;
    return true;
  } else {
    return false;
  }
}
const _jump = (blackboard) => {
  const tickResults = blackboard.get('tickResults');
  const frameTryActions = blackboard.get('frameTryActions');
  const frameTryStopActions = blackboard.get('frameTryStopActions');
  // const localPlayer = target;
  const localPlayer = this.playersManager.getLocalPlayer();
  if (frameTryStopActions.jump || localPlayer.characterPhysics.grounded) {
    return false;
  } else if (frameTryActions.jump) { // note: for trigger doubleJump.
    tickResults.jump = true; // note: doubleJump need jump in parallel.
    return true;
  } else {
    tickResults.jump = true;
    return b3.RUNNING;
  }
}
const _doubleJump = (blackboard) => {
  const tickResults = tick.blackboard.get('tickResults');
  const frameTryStopActions = tick.blackboard.get('frameTryStopActions');
  const localPlayer = tick.target;
  if (frameTryStopActions.doubleJump || localPlayer.characterPhysics.grounded) {
    return false;
  } else {
    tickResults.jump = true; // note: doubleJump need jump in parallel.
    tickResults.doubleJump = true;
    return b3.RUNNING;
  }
}

const _land = (blackboard) => {
  const tickResults = blackboard.get('tickResults');
  // const localPlayer = target;
  const localPlayer = this.playersManager.getLocalPlayer();
  if (localPlayer.characterPhysics.grounded) {
    tickResults.land = true;
    return true;
  } else {
    return false;
  }
}
const _startCrouch = (blackboard) => {
  const tickResults = blackboard.get('tickResults');
  const frameTryActions = blackboard.get('frameTryActions');
  if (frameTryActions.crouch) {
    tickResults.crouch = true;
    return true;
  } else {
    return false;
  }
}
const _crouch = (blackboard) => {
  const tickResults = blackboard.get('tickResults');
  const frameTryStopActions = blackboard.get('frameTryStopActions');
  if (frameTryStopActions.crouch) {
    return false;
  } else {
    tickResults.crouch = true;
    return b3.RUNNING;
  }
}
/* class WaitOneTick extends b3.Action {
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
} */
/* class WaitOneFrame extends b3.Action {
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
} */
const _narutoRun = (behavior) => {
  const tickResults = blackboard.get('tickResults');
  const longTryActions = blackboard.get('longTryActions');
  if (longTryActions.narutoRun) {
    tickResults.narutoRun = true;
    return true;
  } else {
    return false;
  }
}
const _startSit = (blackboard) => {
  const tickResults = blackboard.get('tickResults');
  const frameTryActions = blackboard.get('frameTryActions');
  if (frameTryActions.sit) {
    tickResults.sit = true;
    return true;
  } else {
    return false;
  }
};
const _sit = (blackboard) => {
    const tickResults = blackboard.get('tickResults');
    const frameTryStopActions = blackboard.get('frameTryStopActions');
    if (frameTryStopActions.sit) {
      return false;
    } else {
      tickResults.sit = true;
      return b3.RUNNING;
    }
  }
};
const _haltSit = (blackboard) => {
  const frameTryActions = blackboard.get('frameTryActions');
  const localPlayer = target;
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
    return true;
  } else {
    return false;
  }
}
const _startGlider = (blackboard) => {
  const tickResults = blackboard.get('tickResults');
  const frameTryActions = blackboard.get('frameTryActions');
  if (frameTryActions.glider) {
    tickResults.glider = true;
    return true;
  } else {
    return false;
  }
};
const _glider = (blackboard) => {
  // const localPlayer = tick.target;
  const localPlayer = this.playersManager.getLocalPlayer();
  const tickResults = blackboard.get('tickResults');
  const frameTryStopActions = blackboard.get('frameTryStopActions');
  if (frameTryStopActions.glider || localPlayer.characterPhysics.grounded) {
    // tickResults.glider = true; // note: don't set `true` here to solve one frame empty tick issue when switch from low prio glider to high prio fallLoop, it's bad design, do reTick/doubleTick instead.
    return false;
  } else {
    tickResults.glider = true;
    return null;
  }
};

/* const tree = new b3.BehaviorTree();
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
    ]}), // end: main
  }), // end: loaded
]}); // end: root */

/* const clearTickResults = (localPlayer, blackboard) => {
  const tickResults = blackboard.get('tickResults');
  for (const key in tickResults) {
    tickResults[key] = false;
  }
} */

/* const preFrameSettings = (localPlayer, blackboard, timestamp) => {
  blackboard.set('now', timestamp);
} */

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
      };
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

export class LocalPlayerCharacterBehavior {
  constructor({
    localPlayer,
  }) {
    this.localPlayer = localPlayer;

    const blackboard = new Map();
    blackboard.set('tickResults', {});
    blackboard.set('lastFrameResults', {});
    blackboard.set('frameTryActions', {});
    blackboard.set('longTryActions', {});
    blackboard.set('frameTryStopActions', {});
    // blackboard.set('frameCount', 0);
    // blackboard.set('loaded', true);
    this.blackboard = blackboard;
  }

  get() {
    debugger;
    return this.blackboard.get(...arguments);
  }

  set() {
    debugger;
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

  runBehavior() {
    /* const behaviorSpec = new b3.Priority({title:'base',children:[
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
    ]}); */

    const {blackboard} = this;
  
    const _behavior = () => {
      _sit() ||
      _fly() ||
      _jump() ||
      _fallLoop() ||
      _glider() ||
      _crouch() ||
      _narutoRun();
    };
    const _sit = () => {
      _startSit(blackboard);
      _haltSit();
      _sit();
    };
    const _fly = () => {
      
    };
    const _jump = () => {
  
    };
    const _fallLoop = () => {
  
    };
    const _glider = () => {
    
    };
    const _crouch = () => {
  
    };
    const _narutoRun = () => {
  
    };
  }

  // isLongTrying(actionType) {
  //   const longTryActions = this.blackboard.get('longTryActions');
  //   return !!longTryActions[actionType];
  // }

  update(timestamp) {
    preFrameSettings(this.localPlayer, this.blackboard, timestamp);
    tree.tick(this.localPlayer, this.blackboard);
    clearTickResults(this.localPlayer, this.blackboard);
    tree.tick(this.localPlayer, this.blackboard); // note: reTick/doubleTick in order to switch from low prio action to high prio action immediately, prevent one frame empty state/action.
    postFrameSettings(this.localPlayer, this.blackboard);
    clearTickResults(this.localPlayer, this.blackboard);
  }
}