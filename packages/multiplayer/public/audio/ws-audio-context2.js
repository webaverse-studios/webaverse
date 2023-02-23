import {channelCount, sampleRate, bitrate} from './ws-constants.js';

let audioCtx = null;
let audioCtxPromise = null;
export const ensureAudioContext = () => {
  if (!audioCtxPromise) {
    audioCtxPromise = (async () => {
      audioCtx = new AudioContext({
        latencyHint: 'interactive',
        sampleRate,
      });

      // debugging
      audioCtx.addEventListener('resume', e => {
        console.log('audio context resumed');
      });
      audioCtx.addEventListener('suspend', e => {
        console.log('audio context suspend');
      });
      audioCtx.addEventListener('statechange', e => {
        console.log('audio context statechange', JSON.stringify(audioCtx.state));
      });

      await Promise.all([
        audioCtx.audioWorklet.addModule(`${import.meta.url.replace(/(\/)[^\/]*$/, '$1')}ws-input-worklet.js`),
        audioCtx.audioWorklet.addModule(`${import.meta.url.replace(/(\/)[^\/]*$/, '$1')}ws-output-worklet.js`),
      ]);
      return audioCtx;
    })();
  }
  audioCtx.resume();
  return audioCtxPromise;
};
export const getAudioContext = () => {
  if (!audioCtxPromise) {
    throw new Error('need to call ensureAudioContext first');
  }
  return audioCtx;
};