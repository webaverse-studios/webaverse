import {
  ZineStoryboard,
} from 'zine/zine-format.js';
import {
  ZineRenderer,
} from 'zine/zine-renderer.js';

//

class ZineManager {
  constructor() {
    
  }
  async loadUrl(u) {
    const response = await fetch(u);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const zineStoryboard = new ZineStoryboard();
    zineStoryboard.load(uint8Array);
    return zineStoryboard;
  }
  createRenderer(opts) {
    const zineRenderer = new ZineRenderer(opts);
    return zineRenderer;
  }
}
const zineManager = new ZineManager();
export default zineManager;