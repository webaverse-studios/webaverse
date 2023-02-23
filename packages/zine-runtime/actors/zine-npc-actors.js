import * as THREE from 'three';
import alea from 'alea';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  AvatarManager,
} from '../../components/generators/AvatarManager.js';

const avatarNames = [
  'ann_liskwitch_v3.1_guilty.vrm',
  'citrine.vrm',
  'Buster_Rabbit_V1.1_Guilty.vrm',
];
const avatarUrls = avatarNames.map(name => `https://cdn.jsdelivr.net/gh/webaverse/content@main/avatars/${name}`);

const createAppAsync = async (opts) => {
  const {
    position,
    quaternion,
    content: npcJson,
  } = opts;
  const {
    avatarUrl,
  } = npcJson;

  const gltf = await new Promise((accept, reject) => {
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(avatarUrl, accept, null, reject);
  });

  const avatar = await AvatarManager.makeAvatar({
    gltf,
  });
  const {
    avatarQuality,
  } = avatar;
  // console.log('got avatr', avatar, avatarQuality);

  const app = avatarQuality.scene;
  app.avatar = avatar;

  let lastTimestamp = performance.now();
  app.update = (timestamp) => {
    const timeDiff = timestamp - lastTimestamp;
    avatar.update(timestamp, timeDiff);

    lastTimestamp = timestamp;
  };

  return app;
};

export class PanelRuntimeNpcs extends THREE.Object3D {
  constructor({
    candidateLocations,
    n = 1,
    seed = 'npcs',
  }) {
    super();

    const rng = alea(seed);
    
    this.locations = [];
    this.npcApps = [];
    for (let i = 0; i < n; i++) {
      const candidateLocationIndex = Math.floor(rng() * candidateLocations.length);
      const candidateLocation = candidateLocations.splice(candidateLocationIndex, 1)[0];
      const {
        position, // array[3]
        quaternion, // array[4]
      } = candidateLocation;

      const position2 = position.slice();
      // position2[1] += 1.5;

      this.locations.push({
        position: position2.slice(),
        quaternion: quaternion.slice(),
      });

      const avatarUrlIndex = Math.floor(rng() * avatarUrls.length);
      const avatarName = avatarNames[avatarUrlIndex];
      const avatarUrl = avatarUrls[avatarUrlIndex];

      const npcJson = {
        name: avatarName,
        // previewUrl: "./images/characters/upstreet/small/drake.png",
        avatarUrl,
        voice: "Mizuki",
        // voicePack: "Scillia voice pack",
        // class: "Drop Hunter",
        // bio: "His nickname is DRK. 15/M hacker. Loves guns. Likes plotting new hacks. He has the best equipment and is always ready for a fight.",
        // themeSongUrl: "https://webaverse.github.io/music/themes/129079005-im-gonna-find-it-mystery-sci-f.mp3"
      };
      // console.log('load npc json', npcJson);

      this.loaded = false;
      this.loadPromise = (async () => {
        const opts = {
          type: 'application/npc',
          content: npcJson,
          position: position2,
          quaternion,
        };

        // console.warn('would have created app', opts);
        // debugger;

        // const npcApp = await metaversefileApi.createAppAsync(opts);
        const npcApp = await createAppAsync(opts);
        // console.log('create npc app 2', npcApp);
        this.add(npcApp);
        npcApp.updateMatrixWorld();

        this.npcApps.push(npcApp);

        this.loaded = true;
      })();
    }
  }
  async waitForLoad() {
    await this.loadPromise;
  }
}