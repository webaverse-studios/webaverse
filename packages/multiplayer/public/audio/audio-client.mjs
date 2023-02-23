import {UPDATE_METHODS} from '../update-types.js';
import {parseUpdateObject, makeId} from '../util.mjs';
import {zbencode} from '../../../zjs/encoding.mjs';
// import {ensureAudioContext, getAudioContext} from './wsrtc/ws-audio-context.js';
import {WsMediaStreamAudioReader, WsAudioEncoder, WsAudioDecoder} from './ws-codec.js';
import {getEncodedAudioChunkBuffer, getAudioDataBuffer} from './ws-util.js';

function createAudioOutputStream({
  audioContext,
}) {
  // const audioContext = getAudioContext();
  if (!audioContext) {
    debugger;
  }

  const audioWorkletNode = new AudioWorkletNode(
    audioContext,
    'ws-output-worklet',
  );

  const audioDecoder = new WsAudioDecoder({
    output: data => {
      data = getAudioDataBuffer(data);
      audioWorkletNode.port.postMessage(data, [data.buffer]);
    },
  });

  return {
    outputNode: audioWorkletNode,
    audioDecoder,
    write(data) {
      audioDecoder.decode(data);
    },
    close() {
      audioWorkletNode.disconnect();
      audioDecoder.close();
    },
  };
}

const stopMediaStream = mediaStream => {
  // stop all tracks
  for (const track of mediaStream.getTracks()) {
    track.stop();
  }
};

/* export async function initAudioContext() {
  const audioContext = await ensureAudioContext();
  audioContext.resume();
} */

export async function createMicrophoneSource({
  mediaStream,
  audioContext,
}) {
  // // const audioContext = await ensureAudioContext();
  if (!audioContext) {
    debugger;
  }
  // audioContext.resume();
  if (!mediaStream) {
    debugger;
  }

  // const mediaStream = await navigator.mediaDevices.getUserMedia({
  //   audio: true,
  // });

  const audioReader = new WsMediaStreamAudioReader(mediaStream, {
    audioContext,
  });

  const fakeWs = new EventTarget();

  const muxAndSend = encodedChunk => {
    const data = getEncodedAudioChunkBuffer(encodedChunk);

    fakeWs.dispatchEvent(new MessageEvent('data', {
      data,
    }));
  };

  function onEncoderError(err) {
    console.warn('encoder error', err);
  }
  const audioEncoder = new WsAudioEncoder({
    output: muxAndSend,
    error: onEncoderError,
  });

  async function readAndEncode() {
    const result = await audioReader.read();
    if (!result.done) {
      audioEncoder.encode(result.value);
      readAndEncode();
    }
  }
  readAndEncode();

  return {
    outputSocket: fakeWs,
    mediaStream,
    audioReader,
    audioEncoder,
    destroy() {
      // console.log('media stream destroy');
      stopMediaStream(mediaStream);
      audioReader.cancel();
      audioEncoder.close();
    },
  };
}

export class NetworkedAudioClient extends EventTarget {
  constructor({
    playerId = makeId(),
    audioContext,
  }) {
    super();

    this.playerId = playerId;
    if (!audioContext) {
      debugger;
    }
    this.audioContext = audioContext;

    this.ws = null;

    this.microphoneSourceCleanupFns = new Map();
    this.outputAudioStreams = new Map();
  }

  static handlesMethod(method) {
    return [
      UPDATE_METHODS.AUDIO,
      UPDATE_METHODS.AUDIO_END,
    ].includes(method);
  }

  addMicrophoneSource(microphoneSource) {
    const ondata = e => {
      // console.log('send mic data', e.data.byteLength);
      this.ws.send(zbencode({
        method: UPDATE_METHODS.AUDIO,
        args: [
          this.playerId,
          e.data,
        ],
      }));
    };
    microphoneSource.outputSocket.addEventListener('data', ondata);

    this.microphoneSourceCleanupFns.set(microphoneSource, () => {
      this.ws.send(zbencode({
        method: UPDATE_METHODS.AUDIO_END,
        args: [
          this.playerId,
        ],
      }));

      microphoneSource.outputSocket.removeEventListener('data', ondata);
    });
  }

  removeMicrophoneSource(microphoneSource) {
    this.microphoneSourceCleanupFns.get(microphoneSource)();
    this.microphoneSourceCleanupFns.delete(microphoneSource);
  }

  async connect(ws) {
    this.ws = ws;

    await new Promise((resolve, reject) => {
      resolve = (resolve => () => {
        resolve();
        _cleanup();
      })(resolve);
      reject = (reject => () => {
        reject();
        _cleanup();
      })(reject);

      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);

      const _cleanup = () => {
        this.ws.removeEventListener('open', resolve);
        this.ws.removeEventListener('error', reject);
      };
    });

    // console.log('irc listen');
    this.ws.addEventListener('message', e => {
      // console.log('got irc data', e.data);
      if (e?.data?.byteLength > 0) {
        const updateBuffer = e.data;
        const uint8Array = new Uint8Array(updateBuffer);
        const updateObject = parseUpdateObject(uint8Array);

        const {method /*, args */} = updateObject;
        if (NetworkedAudioClient.handlesMethod(method)) {
          this.handleUpdateObject(updateObject);
        }
      } else {
        // debugger;
      }
    });
  }

  handleUpdateObject(updateObject) {
    const {method, args} = updateObject;
    // console.log('audio update object', {method, args});
    if (method === UPDATE_METHODS.AUDIO) {
      // console.log('got irc chat', {method, args});
      const [playerId, data] = args;

      let audioStream = this.outputAudioStreams.get(playerId);
      if (!audioStream) {
        const stream = createAudioOutputStream({
          audioContext: this.audioContext,
        });
        // stream.outputNode.connect(this.audioContext.destination);
        this.outputAudioStreams.set(playerId, stream);
        audioStream = stream;

        this.dispatchEvent(new MessageEvent('audiostreamstart', {
          data: {
            playerId,
            stream,
          },
        }));
      }
      // console.log('receive mic data', data.byteLength);
      audioStream.write(data);
    } else if (method === UPDATE_METHODS.LEAVE || method === UPDATE_METHODS.AUDIO_END) {
      const [playerId] = args;

      const audioStream = this.outputAudioStreams.get(playerId);
      if (audioStream) {
        audioStream.close();
        this.outputAudioStreams.delete(playerId);

        this.dispatchEvent(new MessageEvent('audiostreamend', {
          data: {
            playerId,
          },
        }));
      }
    } else if (method === UPDATE_METHODS.JOIN) {
      const [playerId] = args;
      this.playerIds.push(playerId);
      this.dispatchEvent(new MessageEvent('join', {
        data: {
          playerId,
        },
      }));
    } else if (method === UPDATE_METHODS.LEAVE) {
      const [playerId] = args;
      const index = this.playerIds.indexOf(playerId);
      this.playerIds.splice(index, 1);
      this.dispatchEvent(new MessageEvent('leave', {
        data: {
          playerId,
        },
      }));
    } else {
      console.warn('unhandled irc method', updateObject);
      debugger;
    }
  }
}
