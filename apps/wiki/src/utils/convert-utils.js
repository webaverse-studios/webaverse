export function blob2img(blob) {
  const img = new Image();
  const u = URL.createObjectURL(blob);
  const promise = new Promise((accept, reject) => {
    function cleanup() {
      URL.revokeObjectURL(u);
    }
    img.onload = () => {
      accept(img);
      cleanup();
    };
    img.onerror = err => {
      reject(err);
      cleanup();
    };
  });
  img.crossOrigin = 'Anonymous';
  img.src = u;
  img.blob = blob;
  return promise;
}

export function canvas2blob(canvas) {
  return new Promise((accept, reject) => {
    canvas.toBlob(accept, 'image/png');
  });
}

export function img2ImageData(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return imageData;
}