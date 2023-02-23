import {loadJson} from './util.js';
import {charactersBaseUrl, defaultCharacterName} from './endpoints.js';

const getCharacterFullPath = filename => charactersBaseUrl + filename;

export class CharacterSelectManager {
  constructor() {
    this.charactersLoadPromise = null;
    this.charactersMapPromise = null;
    this.defaultCharacterSpecPromise = null;
  }

  getCharactersAsync() {
    if (!this.charactersLoadPromise) {
      this.charactersLoadPromise = loadJson(charactersBaseUrl + 'characters.json');
    }
    return this.charactersLoadPromise;
  }

  getDefaultSpecAsync() {
    if (!this.defaultCharacterSpecPromise) {
      this.defaultCharacterSpecPromise = (async () => {
        return await loadJson(getCharacterFullPath(defaultCharacterName));
      })();
    }
    return this.defaultCharacterSpecPromise;
  }

  loadCharactersMap() {
    if (!this.charactersMapPromise) {
      this.charactersMapPromise = (async () => {
        const characters = await this.getCharactersAsync();
        const {packs} = characters;

        // list npc file names
        const charactersMap = {};
        await Promise.all(packs.map(async pack => {
          const characters = await Promise.all(pack.characters.map(characterName =>
            loadJson(getCharacterFullPath(characterName))
          ));
          charactersMap[pack.name] = characters;
        }));
        return charactersMap;
      })();
    }
    return this.charactersMapPromise;
  }
}
// const characterSelectManager = new CharacterSelectManager();
// export {
//   characterSelectManager,
// };