import {generateObjectUrlCard} from './card-renderer.js';

class CardsManager {
  async getCardsImage(start_url, {width, flipY, signal} = {}) {
    const imageBitmap = await generateObjectUrlCard({
        start_url,
        width,
        flipY,
        signal,
    });
    return imageBitmap;
  }
}
const cardsManager = new CardsManager();
export default cardsManager;