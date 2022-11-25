import {fetchArrayBuffer, createCanvas} from '../../util.js';
import {AvatarRenderer} from '../../avatars/avatar-renderer.js';
import {createAvatarForScreenshot, screenshotAvatar} from '../../avatar-screenshotter.js';
import {maxAvatarQuality} from '../../constants.js';
import {emotes} from '../../emotes/emote-manager.js';

const allEmotions = [''].concat(emotes.map(emote => emote.name));

//

const makeAvatarIconRenderer = async (start_url) => {
  const arrayBuffer = await fetchArrayBuffer(start_url);

  const avatarRenderer = new AvatarRenderer({
    arrayBuffer,
    srcUrl: start_url,
    quality: maxAvatarQuality,
    controlled: true,
  });
  await avatarRenderer.waitForLoad();

  const avatar = createAvatarForScreenshot(avatarRenderer);

  return {
    render(width, height, emotion) {
      const canvas = createCanvas(width, height);

      screenshotAvatar({
        avatar,
        canvas,
        emotion,
      });

      return canvas;
    },
    destroy() {
      avatar.destroy();
    },
  };
};

//

export async function getDefaultCanvas(start_url, width, height) {
  const avatarIconRenderer = await makeAvatarIconRenderer(start_url);

  const emotion = '';
  const canvas = avatarIconRenderer.render(width, height, emotion);

  avatarIconRenderer.destroy();

  return canvas;
}
export async function getEmotionCanvases(start_url, width, height) {
  const avatarIconRenderer = await makeAvatarIconRenderer(start_url);

  const emotionCanvases = await Promise.all(allEmotions.map(async emotion => {
    const canvas = avatarIconRenderer.render(width, height, emotion);
    const imageBitmap = await createImageBitmap(canvas);
    return imageBitmap;
  }));

  avatarIconRenderer.destroy();

  return emotionCanvases;
}