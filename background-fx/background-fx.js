import {DotsBgFxMesh} from './DotsBgFx.js';
import {GlyphBgFxMesh} from './GlyphBgFx.js';
import {GrassBgFxMesh} from './GrassBgFx.js';
import {LightningBgFxMesh} from './LightningBgFx.js';
import {NoiseBgFxMesh} from './NoiseBgFx.js';
import {OutlineBgFxMesh} from './OutlineBgFx.js';
import {PoisonBgFxMesh} from './PoisonBgFx.js';
import {RadialBgFxMesh} from './RadialBgFx.js';
import {RainBgFxMesh} from './RainBgFx.js';
import {SmokeBgFxMesh} from './SmokeBgFx.js';

class BackgroundFx {
  async waitForLoad() {
    await Promise.all([
      DotsBgFxMesh.waitForLoad(),
      GlyphBgFxMesh.waitForLoad(),
      GrassBgFxMesh.waitForLoad(),
      LightningBgFxMesh.waitForLoad(),
      NoiseBgFxMesh.waitForLoad(),
      OutlineBgFxMesh.waitForLoad(),
      PoisonBgFxMesh.waitForLoad(),
      RadialBgFxMesh.waitForLoad(),
      RainBgFxMesh.waitForLoad(),
      SmokeBgFxMesh.waitForLoad(),
    ]);
  }
}
const backgroundFx = new BackgroundFx();
export default backgroundFx;
