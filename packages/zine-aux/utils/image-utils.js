import {
  makePromise,
} from './promise-utils.js';

export const loadImage = u => {
  const p = makePromise();
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    p.resolve(img);
  };
  img.onerror = p.reject;
  img.src = u;
  return p;
};