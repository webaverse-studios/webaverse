import {
  AppManager,
} from '../app-manager.js';
import {
  SceneManager,
} from '../scene-manager.js';
import {makeId, parseQuery} from '../util.js';
import {scenesBaseUrl, defaultSceneName} from '../endpoints.js';

//

export const getScnUrl = (src) => {
  if (src === undefined) { // default load
    const sceneManager = new SceneManager();
    return sceneManager.getSceneUrl(defaultSceneName);
  } else if (src === '') { // blank load
    return null;
  } else if (typeof src === 'string') { // src load
    return src;
  } else {
    console.warn('invalid src', src);
    throw new Error('invalid src: ' + JSON.stringify(src));
  }
};

/* export const loadScene = async ({
  engine,
  src,
}) => {
  const appSpec = getAppSpec(src);
  if (appSpec !== null) {
    const app = await engine.createAppAsync(appSpec);
  }
} */