import * as THREE from 'three';
import {camera} from './renderer.js';
import {playersManager} from './players-manager.js';
import {partyManager} from './party-manager.js';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();

//

class SpawnManager {
  #spawnPosition = new THREE.Vector3();
  #spawnQuaternion = new THREE.Quaternion();
  setSpawnPoint(position, quaternion) {
    this.#spawnPosition.copy(position);
    this.#spawnQuaternion.copy(quaternion);
  }

  async spawn() {
    const localPlayer = playersManager.getLocalPlayer();
    // if the avatar was not set, we'll need to set the spawn again when it is
    if (!localPlayer.avatar) {
      await new Promise((accept, reject) => {
        localPlayer.addEventListener('avatarchange', e => {
          const {avatar} = e;
          if (avatar) {
            accept();
          }
        });
      });
    }
    const {height} = localPlayer.avatar;
    if (typeof height !== 'number') {
      console.warn('no height', {localPlayer, height});
      debugger;
    }
    const playerSpawnPosition = this.#spawnPosition.clone()
      .add(
        new THREE.Vector3(0, height, 0)
      );
    localPlayer.characterPhysics.setPosition(playerSpawnPosition);
    camera.quaternion.copy(this.#spawnQuaternion);
    camera.updateMatrixWorld();

    // position all party members offset to spawnpoint
    const partyMembers = partyManager.getPartyPlayers();
    const diff = localVector.subVectors(this.#spawnPosition, localPlayer.position);
    for (const player of partyMembers) {
      const playerPosition = localVector2.addVectors(diff, player.position);
      player.setSpawnPoint(playerPosition, this.#spawnQuaternion);
    }
  }
}
const spawnManager = new SpawnManager();
export default spawnManager;