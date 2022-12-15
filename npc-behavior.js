import npcManager from './npc-manager';
import {playersManager} from './players-manager';
import {Vector3, MathUtils} from 'three';
import {walkSpeed, runSpeed} from './constants';

export const BehaviorType = {
  IDLE: 0,
  FOLLOW: 1,
}

const localVector = new Vector3();

export const followTarget = (player, target, timeDiff) => {
  if (!target)
    return console.error('unable to follow, target was null');
  const v = localVector.setFromMatrixPosition(target.matrixWorld)
    .sub(player.position);
  v.y = 0;
  const distance = v.length();

  const speed = MathUtils.clamp(
    MathUtils.mapLinear(
      distance,
      2, 2.5,
      walkSpeed, runSpeed,
    ),
    0, runSpeed,
  );
  const velocity = v.normalize().multiplyScalar(speed);
  player.characterPhysics.applyWasd(velocity, timeDiff);

  return distance;
};

export const followFn = (player, timestamp, timeDiff) => {
  if (!player)
    return console.warn('unable to follow, player was null');
  if (player.getControlMode() !== 'controlled') {
    const localPlayer = playersManager.getLocalPlayer();
    if (player.getControlMode() === 'party') { // if party, follow in a line
      const target = npcManager.getPartyTarget(player);
      followTarget(player, target, timeDiff);
    } else if (player.getControlMode() === 'npc') {
      if(!player.target) {
        return console.warn('unable to follow, no target component');
      }
      followTarget(player, player.target, timeDiff);
    }
    player.setTarget(localPlayer.position);
  }

  player.updatePhysics(timestamp, timeDiff);
};

export const idleFn = (player, timestamp, timeDiff) => {
  player.updatePhysics(timestamp, timeDiff);
};