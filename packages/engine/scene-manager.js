import {loadJson} from './util.js';
import {scenesBaseUrl} from './endpoints.js';

export class SceneManager {
  constructor() {
    this.sceneNamesPromise = null;
  }

  getSceneNamesAsync() {
    if (!this.sceneNamesPromise) {
      this.sceneNamesPromise = loadJson(scenesBaseUrl + 'scenes.json');
    }
    return this.sceneNamesPromise;
  }

  getSceneUrl(sceneName) {
    return scenesBaseUrl + sceneName;
  }
}
// const sceneManager = new SceneManager();
// export {
//   sceneManager,
// };