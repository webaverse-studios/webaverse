import {packs, defaultCharacter} from './characters/characters.js';

class CharacterSelectManager {
  constructor() {
    this.charactersMap = null;
    this.defaultCharacterSpec = null;
  }

  async getDefaultSpecAsync() {
    if (!this.defaultCharacterSpec) {
      // const characterName = defaultCharacter;
      // this.defaultCharacterSpec = await loadNpc(getCharacterFullPath(characterName));
      this.defaultCharacterSpec = defaultCharacter;
    }
    return this.defaultCharacterSpec;
  }

  async loadCharactersMap() {
    if (!this.charactersMap) {
      this.charactersMap = {};
      for (const pack of packs) {
        this.charactersMap[pack.name] = pack.characters;
      }
    }
    return this.charactersMap;
  }
}

const characterSelectManager = new CharacterSelectManager();
export {
  characterSelectManager
};
