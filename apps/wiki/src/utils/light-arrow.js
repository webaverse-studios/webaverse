import * as THREE from 'three';
import {downloadFile} from '../utils/http-utils.js';

export const frameSize = 64;
export const numFrames = 64;
export const numFramesPerRow = Math.sqrt(numFrames);
export const canvasSize = frameSize * numFramesPerRow;
export const arrowTime = 5000;
export const timeDiff = arrowTime / numFrames;

//

export const arrowUpBrightUrl = '/images/arrow-up-bright.png';
export const arrowUpDimUrl = '/images/arrow-up-dim.png';
export const arrowsUpUrl = '/images/arrows-up.png';

//

/* const localColor = new THREE.Color();
const localColor2 = new THREE.Color();
const localColor3 = new THREE.Color();
const localColor4 = new THREE.Color();
const localColor5 = new THREE.Color();
const localColor6 = new THREE.Color();

const colors = [
  // [
    0xcd782e,
    0xe5fec0,
  // ],
  // [
    0xc44d31,
    0xfffe83,
  // ],
  // [
    0xab2b44,
    0xfffe60,
  // ],
  // [
    0x912552,
    0xffed4c,
  // ],
  // [
    0x66217a,
    0xffa146,
  // ],
  // [
    0x532b8b,
    0xff7559,
  // ],
  // [
    0x2a3dab,
    0xff4a7d,
  // ],
  // [
    0x1755bb,
    0xf830a5,
  // ],
  // [
    0x0076c4,
    0xa93dec,
  // ],
  // [
    0x009fb4,
    0x5d67fa,
  // ],
  // [
    0x0dafad,
    0x457ffc,
  // ],
  // [
    0x49bf85,
    0x00c0fc,
  // ],
  // [
    0x69c776,
    0x00e8fc,
  // ],
  // [
    0x9bbe58,
    0x22fffe,
  // ],
  // [
    0xafad42,
    0x55fffc ,
  // ],
  // [
    0xc38b34,
    0xb5ffef,
  // ],
];

const _renderArrowSpritesheet = async () => {
  const res = await fetch('./images/arrow.svg');
  const svgData = await res.text();

  const domParser = new DOMParser();
  const doc = domParser.parseFromString(svgData, 'image/svg+xml');
  const gradient = doc.querySelector('linearGradient');
  const svg = doc.querySelector('svg');
  svg.setAttribute('width', frameSize);
  svg.setAttribute('height', frameSize);
  // const stops = Array.from(gradient.querySelectorAll('stop'));
  const xmlSerializer = new XMLSerializer();

  let now = 0;
  const framePromises = [];
  // let index = 0;
  while (now < arrowTime) {
    const fStart = (now % arrowTime) / arrowTime * colors.length;
    const fMid = (fStart + 0.5) % colors.length;
    const fEnd = (fStart + 1) % colors.length;
    const startColorIndex1 = Math.floor(fStart);
    const startColorIndex2 = Math.floor((fStart + 1) % colors.length);
    const startColorOffset = fStart - startColorIndex1;
    const midColorIndex1 = Math.floor(fMid);
    const midColorIndex2 = Math.floor((fMid + 1) % colors.length);
    const midColorOffset = fMid - midColorIndex1;
    const endColorIndex1 = Math.floor(fEnd);
    const endColorIndex2 = Math.floor((fEnd + 1) % colors.length);
    const endColorOffset = fEnd - endColorIndex1;
    
    localColor.setHex(colors[startColorIndex1]);
    localColor2.setHex(colors[startColorIndex2]);
    localColor3.setHex(colors[midColorIndex1]);
    localColor4.setHex(colors[midColorIndex2]);
    localColor5.setHex(colors[endColorIndex1]);
    localColor6.setHex(colors[endColorIndex2]);
    
    const doc2 = doc.cloneNode(true);
    const stops = Array.from(doc2.querySelectorAll('stop'));

    stops[0].style.stopColor = localColor.lerp(localColor2, startColorOffset).getStyle();
    stops[1].style.stopColor = localColor3.lerp(localColor4, midColorOffset).getStyle();
    stops[2].style.stopColor = localColor5.lerp(localColor6,endColorOffset).getStyle();

    const framePromise = (async () => {
      const s = xmlSerializer.serializeToString(doc2);
      const dataUrl = `data:image/svg+xml;base64,${btoa(s)}`;

      const img = await (async () => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        await new Promise((accept, reject) => {
          img.onload = () => {
            accept();
          };
          img.onerror = reject;
          img.src = dataUrl;
        });
        return img;
      })();
      const frame = await createImageBitmap(img);
      return frame;
    })();
    framePromises.push(framePromise);

    now += timeDiff;
  }
  const frames = await Promise.all(framePromises);

  const renderedCanvas = _renderCanvasFromFrames(frames);
  return renderedCanvas;
};
const _renderCanvasFromFrames = (frames, {
  rotate = false,
} = {}) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const x = (i % numFramesPerRow) * frameSize;
    const y = Math.floor(i / numFramesPerRow) * frameSize;
    
    if (rotate) {
      ctx.resetTransform();
      ctx.translate(x + frameSize / 2, y + frameSize / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.translate(-x - frameSize / 2, -y - frameSize / 2);
    }
    ctx.drawImage(frame, x, y);
  }
  return canvas;
};
globalThis.generateArrowSpriteSheet = async () => {
  const renderedCanvas = await _renderArrowSpritesheet();

  const blob = await new Promise((accept, reject) => {
    renderedCanvas.toBlob(accept, 'image/png');
  });
  downloadFile(blob, 'arrows.png');
}; */