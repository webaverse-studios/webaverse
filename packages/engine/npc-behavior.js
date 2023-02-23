import * as THREE from 'three';
import {Vector3, MathUtils} from 'three';
import {walkSpeed, runSpeed} from './constants.js';

//

const localVector = new Vector3();
const localVector2 = new Vector3();
const localVector3 = new Vector3();
const localVector4 = new Vector3();
const localVector5 = new Vector3();
const localCamera = new THREE.PerspectiveCamera();

//

const zeroVector = new Vector3(0, 0, 0);

//

const waypointRange = 10;
const waypointTouchDistance = 0.5;
export class NpcBehavior {
  constructor({
    character,
  }) {
    // members
    if (!character) {
      debugger;
    }
    this.character = character;

    // locals
    this.lastBehaviorTime = 0; 
  }

  addIdleAction(timestamp) {
    this.character.actionManager.addAction({
      type: 'behavior',
      behaviorType: 'idle',
      timeout: 1000 + Math.random() * 1000,
    });
    this.lastBehaviorTime = timestamp;
  }
  addWaypointAction(timestamp) {
    this.character.actionManager.addAction({
      type: 'behavior',
      behaviorType: 'waypoint',
      targetPosition: this.character.position.clone()
        .add(
          localVector.set(
            (Math.random() - 0.5) * 2 * waypointRange,
            0,
            (Math.random() - 0.5) * 2 * waypointRange
          )
        ).toArray(),
      timeout: 10 * 1000,
    });
    this.lastBehaviorTime = timestamp;
  }
  addBehaviorAction(timestamp) {
    if (Math.random() < 0.5) {
      this.addIdleAction(timestamp);
    } else {
      this.addWaypointAction(timestamp);
    }
  }

  applyBehaviorAction(timestamp, timeDiff, behaviorAction) {
    const {
      behaviorType,
    } = behaviorAction;

    switch (behaviorType) {
      case 'idle': {
        const {
          timeout,
        } = behaviorAction;

        const directionCamera = localCamera;
        directionCamera.position.set(0, 0, 0);
        directionCamera.quaternion.identity();
        directionCamera.updateMatrixWorld();
        this.character.characterPhysics.applyWasd(zeroVector, directionCamera, timeDiff);

        // check finish
        if ((timestamp - this.lastBehaviorTime) > timeout) {
          this.character.actionManager.removeAction(behaviorAction);       
          this.addWaypointAction(timestamp);
        }
        break;
      }
      case 'waypoint': {
        const targetPosition = localVector.fromArray(behaviorAction.targetPosition);
        const delta = localVector2.copy(targetPosition)
          .sub(this.character.position);
        delta.y = 0;
        const v = localVector3.copy(delta);
        const distance = v.length();

        // velocity
        const speed = MathUtils.clamp(
          MathUtils.mapLinear(
            distance,
            0, 5,
            walkSpeed / 4, runSpeed,
          ),
          0, runSpeed,
        );
        const velocity = v.normalize()
          .multiplyScalar(speed);

        // direction camera
        const directionCamera = localCamera;
        directionCamera.position.copy(this.character.position)
          .sub(delta);
        directionCamera.quaternion.copy(this.character.quaternion);
        directionCamera.updateMatrixWorld();

        // apply wasd
        this.character.characterPhysics.applyWasd(velocity, directionCamera, timeDiff);
        
        // check finish
        const positionXZ = localVector4.copy(this.character.position);
        positionXZ.y = 0;
        const targetPositionXZ = localVector5.copy(targetPosition);
        targetPositionXZ.y = 0;
        if (
          (this.character.position.distanceTo(targetPosition) < waypointTouchDistance) ||
          (timestamp - this.lastBehaviorTime > behaviorAction.timeout)
        ) {
          this.character.actionManager.removeAction(behaviorAction);
          this.addBehaviorAction(timestamp);
        }
        break;
      }
      default: {
        throw new Error('unknown behavior type: ' + behaviorType);
      }
    }
  }

  update(timestamp, timeDiff) {
    if (!this.character.actionManager.hasActionType('behavior')) {
      this.addBehaviorAction(timestamp);
    }

    let behaviorAction = this.character.actionManager.getActionType('behavior');
    if (behaviorAction) {
      this.applyBehaviorAction(timestamp, timeDiff, behaviorAction);
    }
  }
}