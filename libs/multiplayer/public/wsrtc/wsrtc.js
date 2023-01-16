import {channelCount, sampleRate, bitrate, MESSAGE} from './ws-constants.js';
import {WsEncodedAudioChunk, WsMediaStreamAudioReader, WsAudioEncoder, WsAudioDecoder} from './ws-codec.js';
import {ensureAudioContext, getAudioContext} from './ws-audio-context.js';
import {encodeMessage, encodeAudioMessage, encodePoseMessage, encodeTypedMessage, decodeTypedMessage, getEncodedAudioChunkBuffer, getAudioDataBuffer/*, loadState*/} from './ws-util.js';
import { zbdecode } from '../encoding.mjs';
// import * as Z from 'zjs';

function formatWorldUrl(u, localPlayer) {
  u = u.replace(/^http(s?)/, 'ws$1');
  const url = new URL(u);
  url.searchParams.set('playerId', localPlayer.playerId ?? '');
  return url.toString();
}
class WSRTC extends EventTarget {
  constructor(ws, {
    localPlayer = null,
    // crdtState = new Z.Doc(),
  } = {}) {
    super();
    
    this.state = 'closed';
    this.ws = null;
    this.mediaStream = null;
    this.audioReader = null;
    this.audioEncoder = null;
    
    this.localPlayer = localPlayer;
    this.crdtState = {clientInit: 'woot'};
    
    /* this.addEventListener('join', e => {
      const player = e.data;
      console.log('join', player);
    });
    this.addEventListener('leave', e => {
      const player = e.data;
      console.log('leave', player);
    }); */
    // const u2 = formatWorldUrl(u, localPlayer);
    // const ws = new WebSocket(u2);
    this.ws = ws;
    ws.binaryType = 'arraybuffer';
    {
      const initialMessage = e => {
        const uint32Array = new Uint32Array(e.data, 0, Math.floor(e.data.byteLength/Uint32Array.BYTES_PER_ELEMENT));
        const method = uint32Array[0];
        // console.log('got data', e.data, 0, Math.floor(e.data.byteLength/Uint32Array.BYTES_PER_ELEMENT), uint32Array, method);

        // console.log('got method', method);

        switch (method) {
          case MESSAGE.INIT: {
            // finish setup
            ws.removeEventListener('message', initialMessage);
            console.log('bind main message');
            ws.addEventListener('message', mainMessage);
            
            // emit open event
            this.state = 'open';
            this.dispatchEvent(new MessageEvent('open'));
            
            // initial state update
            let index = Uint32Array.BYTES_PER_ELEMENT;
            const roomDataByteLength = uint32Array[index/Uint32Array.BYTES_PER_ELEMENT];
            index += Uint32Array.BYTES_PER_ELEMENT;
            const data = new Uint8Array(e.data, index, roomDataByteLength);
            // console.log('crdt load');
            this.crdtState = zbdecode(data);
            
            // log
            // console.log('init wsrtc 1', this.crdtState.toJSON());
            this.dispatchEvent(new MessageEvent('init'));
            // console.log('init wsrtc 2', this.crdtState.toJSON());
            
            break;
          }
        }
      };
      const _handleStateUpdateMessage = (e, dataView) => {
        const byteLength = dataView.getUint32(Uint32Array.BYTES_PER_ELEMENT, true);
        const data = new Uint8Array(dataView.buffer, dataView.byteOffset + 2 * Uint32Array.BYTES_PER_ELEMENT, byteLength);
        Z.applyUpdate(this.crdtState, data);
      };
      
      const _handleAudioMessage = (e, dataView) => {
        const playerId = dataView.getUint32(Uint32Array.BYTES_PER_ELEMENT, true);
          const type = dataView.getUint32(2*Uint32Array.BYTES_PER_ELEMENT, true) === 0 ? 'key' : 'delta';
          const timestamp = dataView.getFloat32(3*Uint32Array.BYTES_PER_ELEMENT, true);
          const byteLength = dataView.getUint32(4*Uint32Array.BYTES_PER_ELEMENT, true);
          const data = new Uint8Array(e.data, 5 * Uint32Array.BYTES_PER_ELEMENT, byteLength);
          
          const encodedAudioChunk = new WsEncodedAudioChunk({
            type: 'key', // XXX: hack! when this is 'delta', you get Uncaught DOMException: Failed to execute 'decode' on 'AudioDecoder': A key frame is required after configure() or flush().
            timestamp,
            data,
          });

          this.dispatchEvent(
            new MessageEvent('audio', {
              data: {
                playerId,
                data: encodedAudioChunk
              },
            })
          );

        };

      const mainMessage = e => {
        const dataView = new DataView(e.data);
        const method = dataView.getUint32(0, true);
        switch (method) {
          case MESSAGE.STATE_UPDATE:
            _handleStateUpdateMessage(e, dataView);
            break;
          case MESSAGE.AUDIO:
            _handleAudioMessage(e, dataView);
            break;
          default:
            console.warn('unknown method id: ' + method);
            break;
        }
      };
      ws.addEventListener('message', initialMessage);
      ws.addEventListener('close', e => {
        this.state = 'closed';
        this.ws = null;
        this.dispatchEvent(new MessageEvent('close'));
        this.crdtState.off('update', handleStateUpdate);
      });

      const handleStateUpdate = (encodedUpdate, origin) => {
        this.sendMessage([
          MESSAGE.STATE_UPDATE,
          encodedUpdate,
        ]);
      };
      this.crdtState.on('update', handleStateUpdate);
    }
    ws.addEventListener('error', err => {
      this.dispatchEvent(new MessageEvent('error', {
        data: err,
      }));
    });

    this.addEventListener('close', () => {
      // this.users = new Map();
      
      if (this.mediaStream) {
        this.mediaStream = null;
      }
      if (this.audioReader) {
        this.audioReader.cancel();
        this.audioReader = null;
      }
      if (this.audioEncoder) {
        this.audioEncoder.close();
        this.audioEncoder = null;
      }
      // this.disableMic();
      // console.log('close');
    });
  }
  sendMessage(parts) {
    if (this.ws.readyState === WebSocket.OPEN) {
      const encodedMessage = encodeMessage(parts);
      this.ws.send(encodedMessage);
    }
  }
  sendAudioMessage(method, id, type, timestamp, data) { // for performance
    const encodedMessage = encodeAudioMessage(method, id, type, timestamp, data);
    this.ws.send(encodedMessage);
  }
  close() {
    if (this.state === 'open') {
      this.ws.close();
    } else {
      throw new Error('connection not open');
    }
  }
  async enableMic(mediaStream) {
    if (this.mediaStream) {
      throw new Error('mic already enabled');
    }
    if (!mediaStream) {
      mediaStream = await WSRTC.getUserMedia();
    }
    this.mediaStream = mediaStream;

    const audioReader = new WsMediaStreamAudioReader(this.mediaStream);
    this.audioReader = audioReader;
    
    const muxAndSend = encodedChunk => {
      const {type, timestamp} = encodedChunk;
      const data = getEncodedAudioChunkBuffer(encodedChunk);
      this.sendAudioMessage(
        MESSAGE.AUDIO,
        this.localPlayer.playerIdInt,
        type,
        timestamp,
        data,
      );
    };
    function onEncoderError(err) {
      console.warn('encoder error', err);
    }
    const audioEncoder = new WsAudioEncoder({
      output: muxAndSend,
      error: onEncoderError,
    });
    this.audioEncoder = audioEncoder;
    
    async function readAndEncode() {
      const result = await audioReader.read();
      if (!result.done) {
        audioEncoder.encode(result.value);
        readAndEncode();
      }
    }
    readAndEncode();
  }
  disableMic() {
    if (this.mediaStream) {
      WSRTC.destroyUserMedia(this.mediaStream);
      this.mediaStream = null;
    }
    if (this.audioReader) {
      this.audioReader.cancel();
      this.audioReader = null;;
    }
    if (this.audioEncoder) {
      this.audioEncoder.close();
      this.audioEncoder = null;
    }
  }
  
  static waitForReady() {
    return ensureAudioContext();
  }
  static getAudioContext() {
    return getAudioContext();
  }
  static getUserMedia() {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount,
        sampleRate,
      },
    });
  }
  static destroyUserMedia(mediaStream) {
    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
  }
}

export default WSRTC;
// globalThis.WSRTC = WSRTC;
