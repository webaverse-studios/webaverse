import {
  defaultPlayerName,
  defaultPlayerBio,
  defaultObjectName,
  defaultObjectDescription,

  makeLorePrompt,
  makeLoreStop,
  postProcessResponse,
  parseLoreResponses,

  makeCommentPrompt,
  makeCommentStop,
  parseCommentResponse,

  makeSelectTargetPrompt,
  makeSelectTargetStop,
  parseSelectTargetResponse,

  makeSelectCharacterPrompt,
  makeSelectCharacterStop,
  parseSelectCharacterResponse,

  makeChatPrompt,
  makeChatStop,
  parseChatResponse,

  makeOptionsPrompt,
  makeOptionsStop,
  parseOptionsResponse,

  makeCharacterIntroPrompt,
  makeCharacterIntroStop,
  parseCharacterIntroResponse,
} from './lore-model.js'
import {
  OPENAI_API_KEY,
} from '../../constants/auth.js';

const numGenerateTries = 2;
const temperature = 1;
const frequency_penalty = 0.2;
const presence_penalty = 0.2;
const top_p = 1;

const ApiTypes = ['UPSTREET', 'AI21', 'GOOSEAI', 'OPENAI', 'NONE'];
const DefaultSettings = {
  apiType: ApiTypes[0],
  apiKey: '',
};
const authenticatedApiName = 'ai';


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
class AIObject extends EventTarget {
  constructor({
    name = defaultObjectName,
    description = defaultObjectDescription,
  } = {}) {
    super();

    this.name = name;
    this.description = description;
  }
}
class AIScene {
  constructor({
    localPlayer,
    generateFn,
  }) {
    this.settings = [];
    this.objects = [];
    this.localCharacter = new AICharacter(localPlayer.name, localPlayer.bio);
    this.characters = [
      this.localCharacter,
    ];
    this.messages = [];
    this.generateFn = generateFn;

    const _waitForFrame = () => new Promise(resolve => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
    const _pushRequestMessage = async message => {
      const emote = 'none';
      const action = 'none';
      const object = 'none';
      const target = 'none';
      this.messages.push({
        character: this.localCharacter,
        message,
        emote,
        action,
        object,
        target,
      });
      console.log("pushing request message", this.localCharacter,
        message,
        emote,
        action,
        object,
        target)
      while (this.messages.length > 8) {
        this.messages.shift();
      }
      await _waitForFrame();
    };
    const _pushResponseMessage = async o => {
      const {name, message, emote, action, object, target} = o;
      const character = this.characters.find(c => c.name === name);
      this.messages.push({
        character,
        message,
        emote,
        action,
        object,
        target,
      });
      console.log("pushing response message", this.localCharacter,
        message,
        emote,
        action,
        object,
        target)
      while (this.messages.length > 8) {
        this.messages.shift();
      }
      character.dispatchEvent(new MessageEvent('say', {
        data: {
          message,
          emote,
          action,
          object,
          target,
        },
      }));
      await _waitForFrame();
    };
    localPlayer.characterHups.addEventListener('hupadd', e => {
      const {hup} = e.data;
      hup.addEventListener('voicestart', async e => {
        const {message} = e.data;
        const messageLowerCase = message.toLowerCase();

        if (this.messages.length === 0) { // start of conversation
          const mentionedCharacterIndex = this.characters.findIndex(c => {
            return c !== this.localCharacter && messageLowerCase.includes(c.name.toLowerCase());
          });
          if (mentionedCharacterIndex !== -1) {
            const mentionedCharacter = this.characters[mentionedCharacterIndex];
            await _pushRequestMessage(message);
            for (let i = 0; i < numGenerateTries; i++) {
              const response = await this.generate(mentionedCharacter);
              if (response) {
                const a = parseLoreResponses(response);
                if (a.length > 0) {
                  for (const o of a) {
                    const {name, message} = o;
                    const character = this.characters.find(c => c.name === name);
                    if (message && character && character !== this.localCharacter) {
                      await _pushResponseMessage(o);
                    } else {
                      break;
                    }
                  }
                  break;
                }
              }
            }
          }
        } else { // middle of conversation
          await _pushRequestMessage(message);

          for (let i = 0; i < numGenerateTries; i++) {
            // const nextCharacterIndex = 1 + Math.floor(Math.random() * (this.characters.length - 1)); // skip over local character
            // const nextCharacter = this.characters[nextCharacterIndex];
            const response = await this.generate();
            const a = parseLoreResponses(response);
            if (a.length > 0) {
              for (const o of a) {
                const {
                  name,
                  message,
                } = o;
                const character = this.characters.find(c => c.name === name);
                // console.log('character name', this.characters.map(c => c.name), characterNameLowerCase, !!character);
                if (message && character && character !== this.localCharacter) {
                  await _pushResponseMessage(o);
                } else {
                  break;
                }
              }
              break;
            }
          }
        }
      });
    });
  }

  addSetting(setting) {
    this.settings.push(setting);
  }

  removeSetting(setting) {
    this.settings.splice(this.settings.indexOf(setting), 1);
  }

  addCharacter(opts) {
    const character = new AICharacter(opts);
    this.characters.push(character);
    return character;
  }

  removeCharacter(character) {
    this.characters.splice(this.characters.indexOf(character), 1);
  }

  addObject(opts) {
    const object = new AIObject(opts);
    this.objects.push(object);
    return object;
  }

  removeObject(object) {
    this.objects.splice(this.objects.indexOf(object), 1);
  }

  async generate(dstCharacter = null) {
    const prompt = makeLorePrompt({
      settings: this.settings,
      characters: this.characters,
      messages: this.messages,
      objects: this.objects,
      dstCharacter,
    });
    const stop = makeLoreStop(this.localCharacter, 0);
    let response = await this.generateFn(prompt, stop);
    // console.log('got lore', {prompt, response});
    response = postProcessResponse(response, this.characters, dstCharacter);
    return response;
  }

  async generateLocationComment(name, dstCharacter = null) {
    const prompt = makeCommentPrompt({
      settings: this.settings,
      dstCharacter,
      name,
    });
    const stop = makeCommentStop();
    let response = await this.generateFn(prompt, stop);
    response = parseCommentResponse(response);
    // console.log('got comment', {prompt, response});
    return response;
  }

  // XXX needs better API
  async generateSelectTargetComment(name, description) {
    const prompt = makeSelectTargetPrompt({
      name,
      description,
    });
    const stop = makeSelectTargetStop();
    let response = await this.generateFn(prompt, stop);
    console.log('select target response', {prompt, response});
    response = parseSelectTargetResponse(response);
    // console.log('got comment', {prompt, response});
    return response;
  }

  async generateSelectCharacterComment(name, description) {
    const prompt = makeSelectCharacterPrompt({
      name,
      description,
    });
    console.log('select character prompt', {prompt});
    const stop = makeSelectCharacterStop();
    const response = await this.generateFn(prompt, stop);
    console.log('select character response', {prompt, response});
    const response2 = parseSelectCharacterResponse(response);
    console.log('select character parsed', {response2});
    return response2;
  }

  async generateChatMessage(messages, nextCharacter) {
    console.log("generateChatMessage", {messages, nextCharacter});
    const prompt = makeChatPrompt({
      messages,
      nextCharacter,
    });
    console.log('chat prompt', {prompt});
    const stop = makeChatStop();
    const response = await this.generateFn(prompt, stop);
    console.log('chat response', {prompt, response});
    const response2 = parseChatResponse(response);
    console.log('chat parsed', {response2});
    return response2;
  }

  async generateDialogueOptions(messages, nextCharacter) {
    const prompt = makeOptionsPrompt({
      messages,
      nextCharacter,
    });
    console.log('dialogue options prompt', {prompt});
    const stop = makeOptionsStop();
    const response = await this.generateFn(prompt, stop);
    console.log('dialogue options response', {prompt, response});
    const response2 = parseOptionsResponse(response);
    console.log('dialogue options parsed', {response2});
    return response2;
  }

  async generateCharacterIntroPrompt(name, bio) {
    const prompt = makeCharacterIntroPrompt({
      name,
      bio,
    });
    console.log('dialogue options prompt', {prompt});
    const stop = makeCharacterIntroStop();
    const response = await this.generateFn(prompt, stop);
    console.log('dialogue options response', {prompt, response});
    const response2 = parseCharacterIntroResponse(response);
    console.log('dialogue options parsed', {response2});
    return response2;
  }
}

class LoreAI {
  constructor() {
    this.endpointFn = null;

    if (typeof window === 'undefined')
      return; // don't load this in workers

    const _loadSettings = () => {
      // load local storage
      const settingsString = localStorage.getItem('AiSettings');
      let settings;

      try {

        settings = JSON.parse(settingsString);

      } catch (err) {
        console.warn('could not parse AiSettings', err);
        settings = DefaultSettings;

      }

      settings = settings ?? DefaultSettings;

      const apiType = settings.apiType ?? DefaultSettings.apiType;
      const apiKey = settings.apiKey ?? '';

      const newSettings = {
        apiType: apiType,
        apiKey: apiKey,
      };

      localStorage.setItem('AiSettings', JSON.stringify(newSettings));

      this.updateLoreEndpoint(apiType);
    }

    _loadSettings();
  }

  updateLoreEndpoint(apiType) {
    const _getApiUrl = apiType => {
      switch (apiType) {
        case 'NONE': return null;
        case 'UPSTREET': return `https://upstreet.webaverse.com/api/ai`;
        case 'AI21': return `https://ai.webaverse.com/ai21/v1/engines/j1-large/completions`;
        case 'GOOSEAI': return `https://ai.webaverse.com/gooseai/v1/engines/gpt-neo-20b/completions`;
        case 'OPENAI': return `https://api.openai.com/v1/engines/text-davinci-002/completions`;
        default: return null;
      }
    };
    const _apiTypeNeedsApiKey = apiType => apiType === 'OPENAI';

    const url = _getApiUrl(apiType);
    this.setEndpointUrl(url);
  };

  async generate(prompt, {
    stop,
    max_tokens = 100,
    temperature,
    frequency_penalty,
    presence_penalty,
    // top_p,
  } = {}) {
    if (prompt) {
      const query = {};
      query.prompt = prompt;
      query.max_tokens = max_tokens;
      if (stop !== undefined) {
        query.stop = stop;
      }
      if (temperature !== undefined) {
        query.temperature = temperature;
      }
      if (frequency_penalty !== undefined) {
        query.frequency_penalty = frequency_penalty;
      }
      if (presence_penalty !== undefined) {
        query.presence_penalty = presence_penalty;
      }

      query.temperature = temperature;
      query.top_p = top_p;

      /* if (typeof temperature === 'number') {
        query.temperature = temperature;
      }
      if (typeof top_p === 'number') {
        query.top_p = top_p;
      } */

      const result = await this.endpoint(query);

      const {choices} = result;
      const {text} = choices[0];
      return text;
    } else {
      throw new Error('prompt is required');
    }
  }

  async endpoint(query) {
    if (this.endpointFn) {
      return await this.endpointFn(query);
    } else {
      console.warn('no endpoint function set');
      return {
        choices: [{
          text: '',
        }],
      };
    }
  }

  setEndpoint(endpointFn) {
    this.endpointFn = endpointFn;
  }

  async setEndpointUrl(url) {
    if (url) {
      // const settingsString = localStorage.getItem('AiSettings');
      const settingsString = localStorage.getItem('AiSettings') ?? JSON.stringify({
        apiKey: OPENAI_API_KEY,
      });
      let settings;

      try {
        settings = JSON.parse(settingsString);
      } catch (err) {
        console.warn('could not parse AiSettings', err);
      }

      const apiKey = settings?.apiKey ?? '';

      const endpointFn = async query => {
        // get openai api key from local storage
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(query),
        });
        const j = await res.json();
        return j;
      };
      this.setEndpoint(endpointFn);
    } else {
      this.setEndpoint(null);
      console.warn('url is required');
    }
  }

  createScene(localPlayer) {
    return new AIScene({
      localPlayer,
      generateFn: (prompt, stop) => {
        return this.generate(prompt, {
          stop,
          temperature,
          presence_penalty,
          frequency_penalty,
          top_p,
        });
      },
    });
  }
};
const loreAI = new LoreAI();
export default loreAI;
