/* this module is responsible for mapping a remote TTS endpoint to the character. */

import audioManager from "../audio-manager.js";
import { deepCopyArrayBuffer, makePromise } from "../util.js";
import { voiceEndpointBaseUrl } from "../endpoints.js";

class VoiceEndpoint {
  constructor(url) {
    this.url = new URL(url, import.meta.url);
  }
}

class PreloadMessage {
  constructor(voiceEndpointUrl, text) {
    this.voiceEndpointUrl = voiceEndpointUrl;
    this.text = text;

    this.isPreloadMessage = true;
    this.loadPromise = VoiceEndpointVoicer.loadAudioBuffer(this.voiceEndpointUrl, this.text);
  }

  waitForLoad() {
    return this.loadPromise;
  }
}

class VoiceEndpointVoicer {
  constructor(voiceEndpoint, player) {
    this.voiceEndpoint = voiceEndpoint;
    this.player = player;

    // this.live = true;
    this.running = false;
    this.queue = [];
    this.cancel = null;
    this.endPromise = null;
  }

  static preloadMessage(voiceEndpointUrl, text) {
    return new PreloadMessage(voiceEndpointUrl, text);
  }

  preloadMessage(text) {
    return VoiceEndpointVoicer.preloadMessage(this.voiceEndpoint.url.toString(), text);
  }

  static async loadAudioBuffer(voiceEndpointUrl, text) {
    // console.log('load audio buffer', voiceEndpointUrl, text);
    try {
      const u = new URL(voiceEndpointUrl);
      u.searchParams.set("s", text);
      const res = await fetch(u/*, {
        mode: 'cors',
      } */);
      const arrayBuffer = await res.arrayBuffer();
      console.log("Array BUFFER:", arrayBuffer);
      const cachedBuffer = deepCopyArrayBuffer(arrayBuffer);

      const audioContext = audioManager.getAudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log("AUDIO BUFFER:", audioBuffer, audioContext, arrayBuffer);
      return [audioBuffer, cachedBuffer];
    } catch (err) {
      console.warn("epic fail", err);
      debugger;
    }
  }

  /* async loadAudioBuffer(text) {
    return VoiceEndpointVoicer.loadAudioBuffer(this.voiceEndpoint.url, text);
  } */
  start(text) {
    console.log("voicer start", text, "WE ARE HERE");
    if (!this.endPromise) {
      this.endPromise = makePromise();
    }

    if (!this.running) {
      this.running = true;

      if (!this.player.avatar.isAudioEnabled()) {
        this.player.avatar.setAudioEnabled(true);
      }

      const _next = () => {
        const { endPromise } = this;
        if (endPromise) {
          this.endPromise = null;
          endPromise.accept();
        }
      };

      let live = true;
      const cancelFns = [
        () => {
          live = false;
          _next();
        }
      ];
      this.cancel = () => {
        for (const cancelFn of cancelFns) {
          cancelFn();
        }
      };

      (async () => {
        const [audioBuffer, arrayBuffer] = await (text.isPreloadMessage ? text.waitForLoad() : this.loadAudioBuffer(text));
        console.log("audio buffer, got both", audioBuffer, arrayBuffer)
        console.log("arrayBUFFER", arrayBuffer);

        const endpoint = 'http://localhost:3030/voice-cache';

        const data = {
          prompt: text.text,
          recipient: '2dc79985-d7e8-4e06-9d4b-1e7e8cde6f16',
          response: "test",
        };

        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(response.statusText);
            }
            return response.json();
          })
          .then(result => {
            console.log('Data sent successfully', result);
          })
          .catch(error => {
            console.error('Error sending data', error);
          });

        if (!live) {
          console.log("bail on audio buffer");
          return;
        }

        const audioContext = audioManager.getAudioContext();
        const audioBufferSourceNode = audioContext.createBufferSource();
        audioBufferSourceNode.buffer = audioBuffer;
        const ended = () => {
          this.cancel = null;
          this.running = false;

          if (this.queue.length > 0) {
            const text = this.queue.shift();
            this.start(text);
          } else {
            _next();
          }
        };
        audioBufferSourceNode.addEventListener("ended", ended, { once: true });
        if (!this.player.avatar.microphoneWorker) {
          this.player.avatar.setAudioEnabled(true);
        }
        audioBufferSourceNode.connect(this.player.avatar.getAudioInput());
        audioBufferSourceNode.start();

        cancelFns.push(() => {
          audioBufferSourceNode.removeEventListener("ended", ended);

          audioBufferSourceNode.stop();
          audioBufferSourceNode.disconnect();
        });
      })();
    } else {
      this.queue.push(text);
    }
    return this.endPromise;
  }

  stop() {
    // this.live = false;
    this.queue.length = 0;
    if (this.cancel) {
      this.cancel();
      this.cancel = null;
    }
    this.running = false;
  }
}

const getVoiceEndpointUrl = (voiceId) => `${voiceEndpointBaseUrl}?voice=${encodeURIComponent(voiceId)}`;

export {
  VoiceEndpoint,
  PreloadMessage,
  VoiceEndpointVoicer,
  getVoiceEndpointUrl
};
