import * as THREE from 'three';
import alea from 'alea';
import metaversefileApi from '../../metaversefile-api.js';

const oreNames = [
  'ore_deposit_black_dream.glb',
  'ore_deposit_blue_dream.glb',
  'ore_deposit_green_dream.glb',
  'ore_deposit_red_dream.glb',
  'ore_deposit_white_dream.glb',
  'ore_item_black_dream.glb',
  'ore_item_blue_dream.glb',
  'ore_item_green_dream.glb',
  'ore_item_red_dream.glb',
  'ore_item_white_dream.glb',
  'Unrefined_Aqualith_v1.2_Guilty.glb',
  'Unrefined_Fyrite_ALT_v1.2_Guilty.glb',
  'Unrefined_Fyrite_v1.2_Guilty.glb',
  'Unrefined_Moonstone_v1.2_Guilty.glb',
  'Unrefined_Obsidian_v1.2_Guilty.glb',
  'Unrefined_Venturine_v1.2_Guilty.glb',
];
const oreUrls = oreNames.map(name => `./packages/zine/resources/ores/${name}`);

export class PanelRuntimeOres extends THREE.Object3D {
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

      const oreUrlIndex = Math.floor(rng() * oreUrls.length);
      const oreName = oreNames[oreUrlIndex];
      const oreUrl = oreUrls[oreUrlIndex];

      const itemJson = {
        name: oreName,
        modelUrl: oreUrl,
      };

      (async () => {
        const opts = {
          type: 'application/item',
          content: itemJson,
          position,
          quaternion,
          components: [
            {
              key: 'itemMode',
              value: 'static',
            },
          ],
        };
        const npcApp = await metaversefileApi.createAppAsync(opts);
        this.add(npcApp);
      })();
    }
  }
}