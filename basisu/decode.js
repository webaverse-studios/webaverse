import loaders from '../loaders.js';

export async function loadKtx2Texture(data) {
  const blob = new Blob([data]);
  const imageUrl = window.URL.createObjectURL(blob);

  const ktx2Loader = loaders.ktx2Loader;
  const tex = await new Promise((accept, reject) => {
    ktx2Loader.load(imageUrl, function (texture) {
      accept(texture);
    });
  });

  return tex;
}
