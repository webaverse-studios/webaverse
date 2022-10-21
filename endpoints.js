import {isProd} from './env.js';

export const compilerBaseUrl = isProd ?
  `https://compiler.webaverse.com/`
:
  `https://local-compiler.webaverse.com/`;

// scenes
export const scenesBaseUrl = isProd ?
  `https://webaverse.github.io/scenes/`
:
  `/packages/scenes/`;
export const defaultSceneName = 'street.scn';

// characters
export const charactersBaseUrl = isProd ?
  `https://webaverse.github.io/characters/`
:
  `/packages/characters/`;
export const defaultCharacterName = 'scillia.npc';

// voice packs
export const voicePacksUrl = `https://webaverse.github.io/voicepacks/all_packs.json`;

// voice endpoints
export const voiceEndpointBaseUrl = `https://voice-cw.webaverse.com/tts`;
export const voiceEndpointsUrl = `https://raw.githubusercontent.com/webaverse/tiktalknet/main/model_lists/all_models.json`;

// image generation
export const imageAIEndpointUrl = `https://stable-diffusion.webaverse.com`;

// image captioning
export const imageCaptionAIEndpointUrl = `https://clip.webaverse.com`;

// sfx generation
export const audioAIEndpointUrl = `https://diffsound.webaverse.com`;