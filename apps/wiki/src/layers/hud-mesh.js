import * as THREE from 'three';
import {IconPackage, IconMesh} from '../meshes/icon-mesh.js';
import {assetUrls} from '../../assets/asset-urls.js';

//

export const hudUrls = assetUrls.huds;

//

const hudLodDistanceCutoff = 4;

//

export class HudMesh extends THREE.Object3D {
  constructor({
    instance,
    // gpuTaskManager,
    renderer,
  }) {
    super();

    this.iconMesh = new IconMesh({
      instance,
      lodCutoff: hudLodDistanceCutoff,
      renderer,
    });
    this.add(this.iconMesh);
  }

  addChunk(chunk, chunkResult) {
    this.iconMesh.addChunk(chunk, chunkResult);
  }

  removeChunk(chunk) {
    this.iconMesh.removeChunk(chunk);
  }

  update() {
    this.iconMesh.update();
  }

  async waitForLoad() {
    const iconPackage = await IconPackage.loadUrls(hudUrls);
    this.iconMesh.setPackage(iconPackage);
  }
}