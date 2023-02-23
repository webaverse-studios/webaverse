/*
this manager provides music preloading, selection, and playing.
*/

// import {
//   AudioManager,
// } from './audio-manager.js';
import {defaultMusicVolume} from './constants.js';

class Music {
  constructor({
    name,
    urls,
    url,
  }, {
    audioManager,
  }) {
    this.name = name;
    this.urls = urls ?? [url];

    if (!audioManager) {
      debugger;
      throw new Error('no audio manager argument');
    }
    this.audioManager = audioManager;

    this.audioBuffers = null;
    this.audioBufferIndex = 0; // Math.floor(Math.random() * this.urls.length);

    this.loadPromise = null;
  }

  play({
    repeat = false,
  } = {}) {
    const audioBuffer = this.audioBuffers[this.audioBufferIndex];
    this.audioBufferIndex = (this.audioBufferIndex + 1) % this.audioBuffers.length;
    
    const {audioContext} = this.audioManager;
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = repeat;
    source.start(0);

    const gain = audioContext.createGain();
    gain.gain.value = defaultMusicVolume;

    source.connect(gain);
    gain.connect(audioContext.gain);

    return {
      source,
      gain,
    };
  }

  waitForLoad() {
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        this.audioBuffers = await Promise.all(this.urls.map(async url => {
          const res = await fetch(url);
          const arrayBuffer = await res.arrayBuffer();
          const {audioContext} = this.audioManager;
          return await audioContext.decodeAudioData(arrayBuffer);
        }));
      })();
    }
    return this.loadPromise;
  }
}
const musicSpecs = [
  {
    name: 'battle',
    urls: [
      './sounds/music/battle1.mp3',
      './sounds/music/battle2.mp3',
      './sounds/music/battle3.mp3',
    ],
  },
  {
    name: 'victory',
    urls: [
      './sounds/music/victory1.mp3',
      './sounds/music/victory2.mp3',
      './sounds/music/victory3.mp3',
      './sounds/music/victory4.mp3',
      './sounds/music/victory5.mp3',
    ],
  },
  {
    name: 'gameOver',
    urls: [
      './sounds/music/gameOver1.mp3',
      './sounds/music/gameOver2.mp3',
      './sounds/music/gameOver3.mp3',
    ],
  },
  {
    name: 'overworld',
    urls: [
      './sounds/music/overworld.mp3',
    ],
  },
  {
    name: 'dungeon',
    urls: [
      './sounds/music/dungeon.mp3',
    ],
  },
  {
    name: 'homespace',
    urls: [
      './sounds/music/homespace.mp3',
    ],
  },
];
export class MusicManager {
  constructor({
    audioManager,
  }) {
    this.audioManager = audioManager;

    this.musics = [];
    this.loadPromise = null;
    this.currentMusic = null;
  }

  async fetchMusic(url, name = url) {
    const music = new Music({
      name,
      url,
    }, {
      audioManager: this.audioManager,
    });
    await music.waitForLoad();
    return music;
  }

  playCurrentMusic(newMusic, {
    repeat = false,
  } = {}) {
    this.stopCurrentMusic();

    this.currentMusic = newMusic.play({
      repeat,
    });

    const localCurrentMusic = this.currentMusic;
    this.currentMusic.source.addEventListener('ended', () => {
      if (this.currentMusic === localCurrentMusic) {
        this.currentMusic = null;
      }
    });
  }

  playCurrentMusicName(name, opts) {
    const newMusic = this.musics.find(music => music.name === name);
    if (newMusic) {
      this.playCurrentMusic(newMusic, opts);
    }
  }

  stopCurrentMusic() {
    if (this.currentMusic) {
      this.currentMusic.source.stop();
      this.currentMusic.gain.disconnect();
      this.currentMusic = null;
    }
  }

  waitForLoad() {
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        const opts = {
          audioManager: this.audioManager,
        };
        this.musics = await Promise.all(musicSpecs.map(async musicSpec => {
          const music = new Music(musicSpec, opts);
          await music.waitForLoad();
          return music;
        }));
      })();
    }
    return this.loadPromise;
  }
}
// const musicManager = new MusicManager();
// export default musicManager;