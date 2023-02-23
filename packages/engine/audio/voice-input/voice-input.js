// import WSRTC from 'wsrtc/wsrtc.js';
// import {chatManager} from '../chat-manager.js';
// import universe from '../universe.js';
// import {
//   Universe,
// } from '../universe.js';
// import metaversefile from 'metaversefile';

export class VoiceInput extends EventTarget {
  constructor({
    character,
    audioManager,
    chatManager,
  }) {
    super();

    // members
    this.character = character;
    this.audioManager = audioManager;
    this.chatManager = chatManager;

    // locals
    this.mediaStream = null;
    this.speechRecognition = null;
  }

  micEnabled() {
    return !!this.mediaStream;
  }

  async enableMic() {
    // await WSRTC.waitForReady();
    // this.mediaStream = await WSRTC.getUserMedia();
    this.mediaStream = await this.audioManager.getUserMedia({
      audio: true,
    });

    // const localPlayer = metaversefile.useLocalPlayer();
    this.character.setMicMediaStream(this.mediaStream);

    // const wsrtc = universe.getConnection();
    // if (wsrtc) {
    //   wsrtc.enableMic(this.mediaStream);
    // }
    // if (universe.multiplayerEnabled) {
    //   universe.realms.enableMic();
    // }

    this.dispatchEvent(new MessageEvent('micchange', {
      data: {
        enabled: true,
      }
    }));
  }

  disableMic() {
    /* if (this.micEnabled()) */ {
      // const wsrtc = universe.getConnection();
      // if (universe.multiplayerEnabled) {
      //   universe.realms.disableMic();
      // } else if (wsrtc) {
      //   wsrtc.disableMic();
      // } else {
      //   WSRTC.destroyUserMedia(this.mediaStream);
      // }
      // this.mediaStream = null;
      
      // const localPlayer = metaversefile.useLocalPlayer();
      this.character.setMicMediaStream(null);

      this.dispatchEvent(new MessageEvent('micchange', {
        data: {
          enabled: false,
        }
      }));
    }
    if (this.speechEnabled()) {
      this.disableSpeech();
    }
  }

  async toggleMic() {
    if (this.micEnabled()) {
      this.disableMic();
    } else {
      await this.enableMic();
    }
  }

  speechEnabled() {
    return !!this.speechRecognition;
  }

  async enableSpeech() {
    if (!this.micEnabled()) {
      await this.enableMic();
    }

    let final_transcript = '';
    const localSpeechRecognition = new webkitSpeechRecognition();

    /* const names = [
      'Scillia',
    ];
    const grammar = '#JSGF V1.0; grammar names; public <name> = ' + names.join(' | ') + ' ;'
    const speechRecognitionList = new webkitSpeechGrammarList();
    speechRecognitionList.addFromString(grammar, 1);
    localSpeechRecognition.grammars = speechRecognitionList;
    localSpeechRecognition.maxAlternatives = 10; */
    localSpeechRecognition.interimResults = false;
    localSpeechRecognition.maxAlternatives = 1;
    // localSpeechRecognition.continuous = true;
    // localSpeechRecognition.interimResults = true;
    // localSpeechRecognition.lang = document.querySelector("#select_dialect").value;
    /* localSpeechRecognition.onstart = () => {
      // document.querySelector("#status").style.display = "block";
    }; */
    localSpeechRecognition.onerror = e => {
      console.log('speech recognition error', e);
    };
    localSpeechRecognition.onend = () => {
      /* final_transcript = final_transcript
        .replace(/celia|sylvia|sileo|cilia|tilia|zilia/gi, 'Scillia'); */
      console.log('speech:', [final_transcript]);
      if (final_transcript) {
        this.chatManager.addMessage(final_transcript, {
          timeout: 3000,
        });
      }

      if (localSpeechRecognition === this.speechRecognition) {
        final_transcript = '';
        localSpeechRecognition.start();
      }
    };
    localSpeechRecognition.onresult = event => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        final_transcript += event.results[i][0].transcript;
      }
    };
    localSpeechRecognition.start();

    this.speechRecognition = localSpeechRecognition;

    this.dispatchEvent(new MessageEvent('speechchange', {
      data: {
        enabled: true,
      }
    }));
  }

  disableSpeech() {
    if (this.speechEnabled()) {
      this.speechRecognition.stop();
      this.speechRecognition = null;

      this.dispatchEvent(new MessageEvent('speechchange', {
        data: {
          enabled: false,
        }
      }));
    }
  }

  async toggleSpeech() {
    if (this.speechEnabled()) {
      this.disableSpeech();
    } else {
      await this.enableSpeech();
    }
  }
}
// const voiceInput = new VoiceInput();
// export default voiceInput;