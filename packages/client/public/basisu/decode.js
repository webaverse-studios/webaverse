import loaders from '../loaders.js';

export async function loadKtx2TextureBlob(blob) {
  const imageUrl = window.URL.createObjectURL(blob);

  return loadKtx2TextureUrl(imageUrl);
}

export async function loadKtx2TextureUrl(url) {
  return await new Promise((accept, reject) => {
    const {ktx2Loader} = loaders;
    ktx2Loader.load(url, accept, function onProgress() {}, reject);
  });
}