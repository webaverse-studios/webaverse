import * as THREE from 'three';
// import metaversefile from 'metaversefile';
// const {
//   useApp,
//   useLocalPlayer,
//   usePartyManager,
// } = metaversefile;

const localEuler = new THREE.Euler(0, 0, 0, 'YXZ');

export default ctx => {
  const {
    useApp,
    useLocalPlayer,
    // usePartyManager,
    useSpawnManager,
  } = ctx;

  const app = useApp();
  
  const srcUrl = ${this.srcUrl};
  ctx.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const j = await res.json();
    if (j) {
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3(1, 1, 1);
      if (j.position) {
        position.fromArray(j.position);
      }
      if (j.quaternion) {
        quaternion.fromArray(j.quaternion);
        localEuler.setFromQuaternion(quaternion, 'YXZ');
        localEuler.x = 0;
        localEuler.z = 0;
        quaternion.setFromEuler(localEuler);
      }

      const spawnManager = useSpawnManager();
      spawnManager.setSpawnPoint(position, quaternion);

      /* new THREE.Matrix4()
        .compose(position, quaternion, scale)
        .premultiply(app.matrixWorld)
        .decompose(position, quaternion, scale);

      const localPlayer = useLocalPlayer();
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

      // position all party members offset to spawnpoint
      const diff = new THREE.Vector3();
      const playerPosition = new THREE.Vector3();
      const partyManager = usePartyManager();
      const partyMembers = partyManager.getPartyPlayers();

      diff.subVectors(position, localPlayer.position);
      for (const player of partyMembers) {
        playerPosition.addVectors(diff, player.position);
        player.setSpawnPoint(playerPosition, quaternion);
      } */
    }
  })());

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'spawnpoint';
export const components = ${this.components};