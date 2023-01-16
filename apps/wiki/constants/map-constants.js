import {chunkSize} from './procgen-constants.js';

export const worldWidth = 512;
export const worldHeight = 512;
export const chunksPerView = Math.ceil(worldWidth / chunkSize) + 1;
export const baseLod1Range = Math.ceil(worldWidth / chunkSize / 2);
export const spacing = 1;
export const maxChunks = 2048;