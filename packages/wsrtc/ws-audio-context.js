import {/* channelCount, */sampleRate/*, bitrate*/} from './ws-constants.js';

//

let audioCtx = null;
export const ensureAudioContext = async () => {
  if (!audioCtx && typeof AudioContext !== 'undefined') {
    audioCtx = new AudioContext({
      latencyHint: 'interactive',
      sampleRate,
    });

    const inputWorkletUrl = `/ws-input-worklet.js`;
    const outputWorkletUrl = `/ws-output-worklet.js`;
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