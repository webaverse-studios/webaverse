import {/* channelCount, */sampleRate/*, bitrate*/} from './ws-constants.js';

//

let audioCtx = null;
export const ensureAudioContext = async () => {
  if (!audioCtx && typeof AudioContext !== 'undefined') {
    audioCtx = new AudioContext({
      latencyHint: 'interactive',
      sampleRate,
    });

    const inputWorkletUrl = new URL(`./ws-input-worklet.js`, import.meta.url);
    const outputWorkletUrl = new URL(`./ws-output-worklet.js`, import.meta.url);
    await Promise.all([
      audioCtx.audioWorklet.addModule(inputWorkletUrl),
      audioCtx.audioWorklet.addModule(outputWorkletUrl),
    ]);
  }
};
export const getAudioContext = () => {
  ensureAudioContext();
  return audioCtx;
};