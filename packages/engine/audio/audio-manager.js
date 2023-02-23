// import {getAudioContext} from 'wsrtc/ws-audio-context.js';
import microphoneWorkletUrl from './microphone-worklet.js?url';
import wsInputWorkletUrl from './ws-input-worklet.js?url';
import wsOutputWorkletUrl from './ws-output-worklet.js?url';

export class AudioManager {
  constructor({audioContext}) {
    this.audioContext = audioContext;
    this.audioContext.gain = this.audioContext.createGain();
    this.audioContext.gain.connect(this.audioContext.destination);
    
    this.loadPromise = Promise.all([
      this.audioContext.audioWorklet.addModule(microphoneWorkletUrl),
      this.audioContext.audioWorklet.addModule(wsInputWorkletUrl),
      this.audioContext.audioWorklet.addModule(wsOutputWorkletUrl),
    ]).then(() => {});
    // await Promise.all([
    //   audioCtx.audioWorklet.addModule(`${import.meta.url.replace(/(\/)[^\/]*$/, '$1')}ws-input-worklet.js`),
    //   audioCtx.audioWorklet.addModule(`${import.meta.url.replace(/(\/)[^\/]*$/, '$1')}ws-output-worklet.js`),
    // ]);
  }

  /* getAudioContext() {
    throw new Error('use audioContext directly!');
    return this.audioContext;
  } */

  setVolume(volume) {
    this.audioContext.gain.gain.value = volume;
  }

  playBuffer(audioBuffer) {
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(this.audioContext.destination);
    sourceNode.start();
  }

  async getUserMedia(opts) {
    const mediaStream = await navigator.mediaDevices.getUserMedia(opts);
    return mediaStream;
  }

  async waitForLoad() {
    await this.loadPromise;
  }
}
// export default new AudioManager();