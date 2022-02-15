// import metaversefile from 'metaversefile';
// import {chatManager} from './chat-manager.js';
import murmurhash3js from 'murmurhash3js';
import {loreAiEndpoint, defaultPlayerName, defaultPlayerBio, defaultSetting} from './constants.js';

const numGenerateTries = 1;
const temperature = 1;
const top_p = 1;

const hash = s => murmurhash3js.x86.hash32(s).toString(16);
const characterLore = `\
# Overview

AI anime avatars in a virtual world. They have human-level intelligence, but they have interesting personalities and conversations. The script is throught provoking.
`;
const _makeChatPrompt = (setting, characters, messages, dstCharacter) => `\
${characterLore}
# Setting

${setting}

# Scene 1

${
  characters.map((c, i) => {
    return `Id: ${hash(c.name)}/${c.name}#${i+1}
Name: ${c.name}
Bio: ${c.bio}
`;
  }).join('\n')
}

${
  messages.map(m => {
    const characterIndex = characters.indexOf(m.character);
    return `*${hash(m.character.name)}/${m.character.name}#${characterIndex+1}: ${m.message}`;
  }).join('\n')
}
*${
  dstCharacter ? `${hash(dstCharacter.name)}/${dstCharacter.name}#${characters.indexOf(dstCharacter)+1}:` : ''
}`;

class AICharacter extends EventTarget {
  constructor({
    name = defaultPlayerName,
    bio = defaultPlayerBio,
  } = {}) {
    super();

    this.name = name;
    this.bio = bio;
  }
}
class AIScene {
  constructor(localPlayer, {
    setting = defaultSetting,
  } = {}) {
    this.setting = setting;
    this.localCharacter = new AICharacter(localPlayer.name, localPlayer.bio);
    this.characters = [
      this.localCharacter,
    ];
    this.messages = [];

    const _pushRequestMessage = message => {
      this.messages.push({
        character: this.localCharacter,
        message,
      });
    };
    const _pushResponseMessage = (character, message) => {
      this.messages.push({
        character,
        message,
      });
      character.dispatchEvent(new MessageEvent('say', {
        data: {
          message,
        },
      }));
    };
    localPlayer.characterHups.addEventListener('hupadd', e => {
      const {hup} = e.data;
      hup.addEventListener('voicestart', async e => {
        const {message} = e.data;
        const messageLowerCase = message.toLowerCase();

        if (this.messages.length === 0) { // start of conversation
          const mentionedCharacter = this.characters.find(c => {
            return c !== this.localCharacter && messageLowerCase.includes(c.name.toLowerCase());
          });
          if (mentionedCharacter) {
            _pushRequestMessage(message);
            for (let i = 0; i < numGenerateTries; i++) {
              const response = await this.generate(mentionedCharacter);
              if (response) {
                _pushResponseMessage(mentionedCharacter, response);
                break;
              }
            }
          }
        } else { // middle of conversation
          _pushRequestMessage(message);
          
          for (let i = 0; i < numGenerateTries; i++) {
            // const nextCharacterIndex = 1 + Math.floor(Math.random() * (this.characters.length - 1)); // skip over local character
            // const nextCharacter = this.characters[nextCharacterIndex];
            const response = await this.generate();
            const match = response?.match(/^([^\/]+?)\/([^#]+?)#([0-9]+?):([\s\S]*?)$/);
            // console.log('response match', response, match);
            if (match) {
              const characterName = match[2];
              const message = match[4].trim();
              const character = this.characters.find(c => c.name === characterName);
              // console.log('character name', this.characters.map(c => c.name), characterNameLowerCase, !!character);
              if (message && character && character !== this.localCharacter) {
                _pushResponseMessage(character, message);
              }
              break;
            }
          }
        }
      });
    });
  }
  setSetting(setting) {
    this.setting = setting;
  }
  addCharacter(opts) {
    const character = new AICharacter(opts);
    this.characters.push(character);
    return character;
  }
  removeCharacter(character) {
    this.characters.splice(this.characters.indexOf(character), 1);
  }
  async generate(dstCharacter = null) {
    const prompt = _makeChatPrompt(
      this.setting,
      this.characters,
      this.messages,
      dstCharacter
    );
    console.log('generate prompt', prompt, [
      this.setting,
      this.characters,
      this.messages,
      dstCharacter,
    ]);
    let response = await loreAI.generate(prompt, {
      end: `\n`,
      maxTokens: 100,
      temperature,
      top_p,
    });
    console.log('got response', response);
    if (/[a-z]/i.test(response)) {
      response = response.trim();
    } else {
      response = '';
    }
    return response;
  }
}

class LoreAI {
  generate(prompt, {
    end,
    maxTokens = 25,
    temperature,
    top_p,
  } = {}) {
    return new Promise((resolve, reject) => {
      if (prompt) {    
        const url = new URL(loreAiEndpoint);
        url.searchParams.set('p', prompt);
        url.searchParams.set('l', maxTokens);
        if (typeof end !== 'undefined') {
          url.searchParams.set('e', end);
        }
        if (typeof temperature === 'number') {
          url.searchParams.set('t', temperature);
        }
        if (typeof top_p === 'number') {
          url.searchParams.set('tp', top_p);
        }
        const openAiKey = localStorage.getItem('openAiKey');
        if (openAiKey) {
          url.searchParams.set('k', openAiKey);
        }
        // console.log('got url', url);
      
        const es = new EventSource(url);
        let fullS = '';
        es.addEventListener('message', e => {
          const s = e.data;
          // console.log('got s', s);

          const _finish = () => {
            // console.log('close');
            es.close();
            resolve(fullS);
          };
          if (s !== '[DONE]') {
            const j = JSON.parse(s);
            // console.log(j.choices);
            const {choices} = j;
            if (choices) {
              const {text} = choices[0];
              fullS += text;
        
              const endIndex = fullS.indexOf(end);
              // console.log('got end index', {fullS, end, endIndex});
              if (endIndex !== -1) {
                es.close();
                resolve(fullS.substring(0, endIndex));
              }
            } else {
              _finish();
            }
          } else {
            _finish();
          }
      
          // console.log(JSON.stringify(prompt + fullS));
        });
        es.addEventListener('error', err => {
          console.log('lore event source error', err);
          es.close();
          reject(err);
        });
      } else {
        reject(new Error('prompt is required'));
      }
    });
  }
  createScene(localPlayer, opts) {
    return new AIScene(localPlayer, opts);
  }
};
const loreAI = new LoreAI();
export default loreAI;