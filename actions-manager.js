import * as b3 from './lib/behavior3js/index.js';

// note: results are tickResults, will all reset to false every frame/tick, so don't need set `results.xxx = false`.

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
    const results = tick.blackboard.get('results');
    const localPlayer = tick.target;
    if (!localPlayer.characterPhysics.grounded && ((tick.blackboard.get('now') - localPlayer.characterPhysics.lastGroundedTime) > 200)) {
      results.fallLoop = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class FallLoopFromJump extends b3.Action {
  tick(tick) {
    const results = tick.blackboard.get('results');
    const localPlayer = tick.target;
    if (tick.blackboard.get('fallLoopFromJump') && !localPlayer.characterPhysics.grounded) {
      results.fallLoopFromJump = true;
      return b3.SUCCESS;
    } else {
      tick.blackboard.set('fallLoopFromJump', false);
      return b3.FAILURE;
    }
  }
}
class Fly extends b3.Action {
  tick(tick) {
    const results = tick.blackboard.get('results');
    if (
      tick.blackboard.get('fly')
    ) {
      results.fly = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class StartJump extends b3.Action {
  tick(tick) {
    const results = tick.blackboard.get('results');
    const tickInfos = tick.blackboard.get('tickInfos');
    const localPlayer = tick.target;
    if (
      (tickInfos.keySpace && localPlayer.characterPhysics.grounded) ||
      localPlayer.hasAction('sit')
    ) {
      results.jump = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class Jump extends b3.Action {
  tick(tick) {
    const results = tick.blackboard.get('results');
    const tickInfos = tick.blackboard.get('tickInfos');
    const localPlayer = tick.target;
    if (localPlayer.characterPhysics.grounded) {
      return b3.FAILURE;
    } else if (tickInfos.keySpace) {
      return b3.SUCCESS;
    } else {
      results.jump = true;
      return b3.RUNNING;
    }
  }
}
class DoubleJump extends b3.Action {
  tick(tick) {
    const results = tick.blackboard.get('results');
    const localPlayer = tick.target;
    if (localPlayer.characterPhysics.grounded) {
      return b3.FAILURE;
    } else {
      results.jump = true;
      results.doubleJump = true;
      return b3.RUNNING;
    }
  }
}

class Land extends b3.Action {
  tick(tick) {
    const results = tick.blackboard.get('results');
    const localPlayer = tick.target;
    if (localPlayer.characterPhysics.grounded) {
      results.land = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}
class Crouch extends b3.Action {
  tick(tick) {
    const results = tick.blackboard.get('results');
    if (tick.blackboard.get('crouch')) {
      results.crouch = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
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
class NarutoRun extends b3.Action {
  tick(tick) {
    const results = tick.blackboard.get('results');
    if (tick.blackboard.get('narutoRun')) {
      results.narutoRun = true;
      return b3.SUCCESS;
    } else {
      return b3.FAILURE;
    }
  }
}

const tree = new b3.BehaviorTree();
tree.root = new b3.MemSequence({title:'root',children: [
  new Loading({title:'Loading',}),
  new b3.Runnor({title:'loaded',child:
    new b3.Parallel({title:'main',children:[
      new b3.Priority({title:'base',children:[
        new b3.Sequence({title:'fly & narutoRun',children:[
          new Fly({title:'Fly'}),
          new b3.Succeedor({child: new NarutoRun({title:'NarutoRun'})}),
        ]}),
        new FallLoopFromJump({title:'FallLoopFromJump'}),
        new b3.MemSequence({title:'jump & doubleJump',children:[
          new StartJump({title:'StartJump'}),
          new WaitOneTick({title:'WaitOneTick'}),
          new Jump({title:'Jump'}),
          new DoubleJump({title:'DoubleJump'}),
        ]}),
        new FallLoop({title:'FallLoop'}),
        new Crouch({title:'Crouch'}),
        new NarutoRun({title:'NarutoRun'}),
      ]}), // end: base
      new Land({title:'Land'}),
    ]}), // end: main
  }), // end: loaded
]}); // end: root

const preTickSettings = (localPlayer, blackboard) => {
}

const postTickSettings = (localPlayer, blackboard) => {
  const setActions = () => {
    const results = blackboard.get('results');
    const lastResults = blackboard.get('lastResults');
    const tickInfos = blackboard.get('tickInfos');
  
    if (results.crouch && !lastResults.crouch) {
      const crouchAction = blackboard.get('crouchAction');
      localPlayer.addActionReal(crouchAction);
    }
    if (!results.crouch && lastResults.crouch) localPlayer.removeActionReal('crouch');
  
    if (results.land && !lastResults.land) {
        localPlayer.addActionReal({
          type: 'land',
          time: blackboard.get('now'),
          isMoving: localPlayer.avatar.idleWalkFactor > 0,
        });
    }
    if (!results.land && lastResults.land) localPlayer.removeActionReal('land');
  
    if (results.narutoRun && !lastResults.narutoRun) localPlayer.addActionReal({type: 'narutoRun'});
    if (!results.narutoRun && lastResults.narutoRun) localPlayer.removeActionReal('narutoRun');
  
    if (results.fly && !lastResults.fly) localPlayer.addActionReal({type: 'fly'});
    if (!results.fly && lastResults.fly) localPlayer.removeActionReal('fly');
  
    if (results.jump && !lastResults.jump) {
      localPlayer.addActionReal({
        type: 'jump',
        startPositionY: localPlayer.characterPhysics.characterController.position.y,
      });
    }
    if (!results.jump && lastResults.jump) {
      localPlayer.removeActionReal('jump');
    }
  
    if (results.doubleJump && !lastResults.doubleJump) {
      localPlayer.addActionReal({
        type: 'doubleJump',
        startPositionY: localPlayer.characterPhysics.characterController.position.y,
      });
    }
    if (!results.doubleJump && lastResults.doubleJump) {
      localPlayer.removeActionReal('doubleJump');
    }
  
    if (results.fallLoop && !lastResults.fallLoop) {
      localPlayer.addActionReal({type: 'fallLoop'});
    }
    if (!results.fallLoop && lastResults.fallLoop) localPlayer.removeActionReal('fallLoop');
  
    if (results.fallLoopFromJump && !lastResults.fallLoopFromJump) {
      localPlayer.addActionReal({
        type: 'fallLoop',
        from: 'jump',
      });
    }
    if (!results.fallLoopFromJump && lastResults.fallLoopFromJump) {
      localPlayer.removeActionReal('fallLoop');
    }
  }
  setActions();

  const setLastResults = () => {
    const results = blackboard.get('results');
    const lastResults = blackboard.get('lastResults');
    for (const key in results) {
      lastResults[key] = results[key];
    }
  }
  setLastResults();

  const resetResults = () => {
    const results = blackboard.get('results');
    for (const key in results) {
      results[key] = false;
    }
  }
  resetResults();

  const resetTickInfos = () => {
    const tickInfos = blackboard.get('tickInfos');
    if (tickInfos) {
      for (const key in tickInfos) {
        tickInfos[key] = null;
      }
    }
  }
  resetTickInfos();
}

class ActionsManager {
  constructor(localPlayer) {
    this.localPlayer = localPlayer;
    this.blackboard = new b3.Blackboard();
    this.blackboard.set('results', {}); // tick results
    this.blackboard.set('lastResults', {});
    this.blackboard.set('tickInfos', {});
    this.blackboard.set('loaded', true);
  }
  get() {
    return this.blackboard.get(...arguments);
  }
  set() {
    return this.blackboard.set(...arguments);
  }
  update(timestamp) {
    this.blackboard.set('now', timestamp);
    // preTickSettings(this.localPlayer, this.blackboard);
    tree.tick(this.localPlayer, this.blackboard);
    postTickSettings(this.localPlayer, this.blackboard);
  }
}

export {ActionsManager};
