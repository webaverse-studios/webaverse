import {
  makeRemoteWorker,
} from 'offscreen-engine/remote-engine-worker.js';

//

// generative world engine remote url
const gweRemoteUrl = `https://local.webaverse.com:9999/engine.html`;

//

export const compileScene = async ({
  imageArrayBuffer,
  // prompt,
}) => {
  const worker = makeRemoteWorker(gweRemoteUrl);
  const result = await worker.request('compileScene', {
    imageArrayBuffer,
    // prompt,
  });
  return result;
};

// globalThis.testCompileScene = async () => {
//   const imageUrl = `https://local.webaverse.com/packages/zine/resources/images/Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__67930432-4de8-4b77-b7c4-7a5bb5a84c1c.png`;
//   const res = await fetch(imageUrl);
//   const arrayBuffer = await res.arrayBuffer();
//   const result = await compileScene(arrayBuffer);
//   return result;
// };