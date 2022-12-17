import * as THREE from 'three';
import alea from 'alea';
import metaversefileApi from '../../metaversefile-api.js';

const avatarNames = [
  'avatar_0_0.vrm',
  'avatar_0_1.vrm',
  'avatar_0_2.vrm',
  'avatar_0_3.vrm',
  'avatar_0_4.vrm',
  'avatar_0_5.vrm',
  'avatar_0_6.vrm',
  'avatar_0_7.vrm',
  'avatar_0_8.vrm',
  'avatar_0_9.vrm',
  'avatar_1_0.vrm',
  'avatar_1_1.vrm',
  'avatar_1_2.vrm',
  'avatar_1_3.vrm',
  'avatar_1_4.vrm',
  'avatar_1_5.vrm',
  'avatar_1_6.vrm',
  'avatar_1_7.vrm',
  'avatar_1_8.vrm',
  'avatar_1_9.vrm',
];
const avatarUrls = avatarNames.map(name => `./packages/zine/resources/avatars/${name}`);
// const avatarNames = [
//   // 'DropHunter_Master_v2_Guilty.vrm',
//   // 'HackerClassMaster_v2.1_Guilty.vrm',
//   // 'avatar_raw_0.vrm',
//   // 'avatar_invisible_0.vrm',
//   'avatar_visible_0.vrm',
// ];
// const avatarUrls = [
//   `./packages/zine/resources/avatars/source/${avatarNames[0]}`,
// ];

export class PanelRuntimeNpcs extends THREE.Object3D {
  constructor({
    candidateLocations,
    n = 1,
    seed = '',
  }) {
    super();

    const rng = alea(seed);
    
    for (let i = 0; i < n; i++) {
      const candidateLocationIndex = Math.floor(rng() * candidateLocations.length);
      const candidateLocation = candidateLocations.splice(candidateLocationIndex, 1)[0];
      const {
        position, // array[3]
        quaternion, // array[4]
      } = candidateLocation;

      const avatarUrlIndex = Math.floor(rng() * avatarUrls.length);
      const avatarName = avatarNames[avatarUrlIndex];
      const avatarUrl = avatarUrls[avatarUrlIndex];

      const npcJson = {
        name: avatarName,
        previewUrl: "./images/characters/upstreet/small/drake.png",
        // avatarUrl: "./avatars/Drake_hacker_v8_Guilty.vrm",
        avatarUrl,
        voice: "Mizuki",
        // voicePack: "ShiShi voice pack",
        voicePack: "Scillia voice pack",
        class: "Drop Hunter",
        bio: "His nickname is DRK. 15/M hacker. Loves guns. Likes plotting new hacks. He has the best equipment and is always ready for a fight.",
        themeSongUrl: "https://webaverse.github.io/music/themes/129079005-im-gonna-find-it-mystery-sci-f.mp3"
      };
      // console.log('load npc json', npcJson);

      (async () => {
        const opts = {
          type: 'application/npc',
          content: npcJson,
          position,
          quaternion,
        };
        console.log('create npc app 1', {
          position,
          quaternion,
          opts,
        });
        const npcApp = await metaversefileApi.createAppAsync(opts);
        console.log('create npc app 2', npcApp);
        this.add(npcApp);
      })();
    }
  }
}