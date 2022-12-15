import npcManager from './npc-manager';
import {playersManager} from './players-manager';
import {Vector3, MathUtils} from 'three';
import {walkSpeed, runSpeed} from './constants';

const localVector = new Vector3();

export const followTarget = (player, target, timeDiff) => {
  if (target) {
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
  }
  return 0;
};

export const followFn = (player, timestamp, timeDiff) => {
  if (player) {
    if (player.getControlMode() !== 'controlled') {
      const localPlayer = playersManager.getLocalPlayer();
      if (player.getControlMode() === 'party') { // if party, follow in a line
        const target = npcManager.getPartyTarget(player);
        followTarget(player, target, timeDiff);
      } else if (player.getControlMode() === 'npc') {
        idleFn(player, timestamp, timeDiff);
      }
      player.setTarget(localPlayer.position);
    }

    player.updatePhysics(timestamp, timeDiff);
  }
};

export const idleFn = (player, timestamp, timeDiff) => {
  player.updatePhysics(timestamp, timeDiff);
};