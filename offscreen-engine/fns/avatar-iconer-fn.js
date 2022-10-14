import {fetchArrayBuffer} from '../../util.js';
import {AvatarRenderer} from '../../avatars/avatar-renderer.js';
import {createAvatarForScreenshot, screenshotAvatar} from '../../avatar-screenshotter.js';
import {maxAvatarQuality, offscreenCanvasSize} from '../../constants.js';
import {emotes} from '../../emotes/emote-manager.js';
import {createCanvas} from '../../renderer.js';

const allEmotions = [''].concat(emotes.map(emote => emote.name));

export async function getEmotionCanvases(start_url, width, height) {
  const arrayBuffer = await fetchArrayBuffer(start_url);

  const avatarRenderer = new AvatarRenderer({
    arrayBuffer,
    srcUrl: start_url,
    quality: maxAvatarQuality,
    controlled: true,
  });
  await avatarRenderer.waitForLoad();

  const avatar = createAvatarForScreenshot(avatarRenderer);

  const emotionCanvases = await Promise.all(allEmotions.map(async emotion => {
    const canvas = createCanvas(width, height);

    await screenshotAvatar({
      avatar,
      canvas,
      emotion,
    });

    const imageBitmap = await createImageBitmap(canvas);
    return imageBitmap;
  }));

  avatar.destroy();

  return emotionCanvases;
}