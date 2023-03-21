import {getAudioContext} from './ws-audio-context.js';
import {getAudioDataBuffer} from './ws-util.js';
import {channelCount, sampleRate, bitrate} from './ws-constants.js';

// note: you can toggle the implementation to use WebCodecs or not by commenting/uncommenting

// WebCodecs suport

/* export const WsEncodedAudioChunk = EncodedAudioChunk;

export function WsMediaStreamAudioReader(mediaStream) {
  const audioTracks = mediaStream.getAudioTracks();
  const audioTrack = audioTracks[0];
  const audio = (new MediaStreamTrackProcessor(audioTrack)).readable;
  const audioReader = audio.getReader();
  return audioReader;
}

export function WsAudioEncoder({output, error}) {
  const audioEncoder = new AudioEncoder({
    output,
    error,
  });
  audioEncoder.configure({
    codec: 'opus',
    numberOfChannels: channelCount,
    sampleRate,
    bitrate,
  });
  return audioEncoder;
}

export function WsAudioDecoder({output, error}) {
  const audioDecoder = new AudioDecoder({
    output,
    error,
  });
  audioDecoder.configure({
    codec: 'opus',
    numberOfChannels: channelCount,
    sampleRate,
  });
  return audioDecoder;
} */

// NO WebCodecs suport

class FakeAudioData {
  constructor() {
    this.data = null;
    this.buffer = {
      getChannelData: n => {
        return this.data;
      },
    };
  }
  set(data) {
    this.data = data;
  }
}
class FakeIteratorResult {
  constructor(value) {
    this.value = value;
    this.done = false;
  }
  setDone(done) {
    this.done = done;
  }
}
export class WsMediaStreamAudioReader {
  constructor(mediaStream) {
    this.buffers = [];
    this.cbs = [];
    this.fakeAudioData = new FakeAudioData();
    this.fakeIteratorResult = new FakeIteratorResult(this.fakeAudioData);
    
    const audioCtx = getAudioContext();
    
    const mediaStreamSourceNode = audioCtx.createMediaStreamSource(mediaStream);
    
    const audioWorkletNode = new AudioWorkletNode(audioCtx, 'ws-input-worklet');
    audioWorkletNode.onprocessorerror = err => {
      console.warn('audio worklet error', err);
    };
    audioWorkletNode.port.onmessage = e => {
      this.pushAudioData(e.data);
    };
    
    mediaStreamSourceNode.connect(audioWorkletNode);
    
    const close = e => {
      this.cancel();
    };
    mediaStream.addEventListener('close', close);
    this.cleanup = () => {
      mediaStream.removeEventListener('close', close);
    };
  }
  read() {
    if (this.buffers.length > 0) {
      const b = this.buffers.shift();
      if (b) {
        this.fakeAudioData.set(b);
      } else {
        this.fakeIteratorResult.setDone(true);
      }
      return Promise.resolve(this.fakeIteratorResult);
    } else {
      let accept;
      const p = new Promise((a, r) => {
        accept = a;
      });
      this.cbs.push(b => {
        if (b) {
          this.fakeAudioData.set(b);
        } else {
          this.fakeIteratorResult.setDone(true);
        }
        accept(this.fakeIteratorResult);
      });
      return p;
    }
  }
  cancel() {
    this.pushAudioData(null);
    this.cleanup();
  }
  pushAudioData(b) {
    if (this.cbs.length > 0) {
      this.cbs.shift()(b);
    } else {
      this.buffers.push(b);
    }
  }
}

export function WsEncodedAudioChunk(o) {
  return o;
}

export class WsAudioEncoder {
  constructor({output, error}) {
    this.worker = new Worker(`${import.meta.url.replace(/(\/)[^\/]*$/, '$1')}ws-codec-worker.js`, {
      type: 'module',
    });
    this.worker.onmessage = e => {
      output(e.data);
    };
    this.worker.onerror = error;
    this.worker.postMessage('encode');
  }
  encode(audioData) {
    this.worker.postMessage(audioData.data, [audioData.data.buffer]);
  }
  close() {
    this.worker.terminate();
  }
}

export class WsAudioDecoder {
  constructor({output, error}) {
    this.worker = new Worker(`${import.meta.url.replace(/(\/)[^\/]*$/, '$1')}ws-codec-worker.js`, {
      type: 'module',
    });
    const fakeAudioData = new FakeAudioData(null);
    this.worker.onmessage = e => {
      fakeAudioData.set(e.data);
      output(fakeAudioData);
    };
    this.worker.onerror = error;
    this.worker.postMessage('decode');
  }
  decode(data) {
    this.worker.postMessage(data, [data.buffer]);
  }
  close() {
    this.worker.terminate();
  }
}
