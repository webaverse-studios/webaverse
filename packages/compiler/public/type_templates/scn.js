import * as THREE from 'three';
// import metaversefile from 'metaversefile';
// const {
//   useApp,
//   createApp,
//   getObjectUrl,
//   createAppAsync,
//   addTrackedApp,
//   removeTrackedApp,
//   useCleanup,
// } = metaversefile;

function mergeComponents(a, b) {
  const result = a.map(({
    key,
    value,
  }) => ({
    key,
    value,
  }));
  for (let i = 0; i < b.length; i++) {
    const bComponent = b[i];
    const {key, value} = bComponent;
    let aComponent = result.find(c => c.key === key);
    if (!aComponent) {
      aComponent = {
        key,
        value,
      };
      result.push(aComponent);
    } else {
      aComponent.value = value;
    }
  }
  return result;
}

export default ctx => {
  const {
    useApp,
    // createApp,
    // getObjectUrl,
    // createAppAsync,
    // addTrackedApp,
    // removeTrackedApp,
    useEngine,
    // useImportManager,
    useWorld,
    useCleanup,
  } = ctx;
  const app = useApp();
  const engine = useEngine();
  const {
    world,
    importManager,
  } = engine;
  // const importManager = useImportManager();
  // const world = useWorld();

  const srcUrl = ${this.srcUrl};
  
  const mode = app.getComponent('mode') ?? 'attached';
  const paused = app.getComponent('paused') ?? false;
  const objectComponents = app.getComponent('objectComponents') ?? [];
  // console.log('scn got mode', app.getComponent('mode'), 'attached');
  const loadApp = (() => {
    /* switch (mode) {
      case 'detached': {
        return async (url, position, quaternion, scale, components) => {
          const components2 = {};
          for (const {key, value} of components) {
            components2[key] = value;
          }
          for (const {key, value} of objectComponents) {
            components2[key] = value;
          }
          if (components2.mode === undefined) {
            components2.mode = 'detached';
          }
          if (components2.paused === undefined) {
            components2.paused = paused;
          }

          const subApp = await createAppAsync({
            start_url: url,
            position,
            quaternion,
            scale,
            parent: app,
            components: components2,
          });
          // app.add(subApp);
          // console.log('scn app add subapp', app, subApp, subApp.parent);
          // subApp.updateMatrixWorld();

          app.addEventListener('componentsupdate', e => {
            const {keys} = e;
            if (keys.includes('paused')) {
              const paused = app.getComponent('paused') ?? false;
              subApp.setComponent('paused', paused);
            }
          });
        };
      }
      case 'attached': { */
        return async (url, position, quaternion, scale, components) => {
          components = mergeComponents(components, objectComponents);
          
          // console.log('scn add app', world?.appManager, {
          //   url, position, quaternion, scale, components,
          // });
          await world.appManager.addAppAsync(
            url,
            position,
            quaternion,
            scale,
            components,
            // instanceId = getRandomString(),
          );
          // console.log('add app 2');
        };
      // }
      // default: {
      //   throw new Error('unknown mode: ' + mode);
      // }
    // }
  })();
  
  let live = true;
  ctx.waitUntil((async () => {
    console.log('loading scn', srcUrl);
    const res = await fetch(srcUrl);
    const j = await res.json();
    const {objects} = j;
    const buckets = {};

    for (const object of objects) {
      const lp = object.loadPriority ?? 0;
      let a = buckets[lp];
      if (!a) {
        a = [];
        buckets[lp] = a;
      }
      a.push(object);
    }

    const sKeys = Object.keys(buckets).sort((a, b) => a - b);
    
    for (let i=0; i<sKeys.length; i++) {
      const lp = sKeys[i];
      await Promise.all(buckets[lp].map(async object => {
        if (live) {
          let {position = [0, 0, 0], quaternion = [0, 0, 0, 1], scale = [1, 1, 1], components = []} = object;
          position = new THREE.Vector3().fromArray(position);
          quaternion = new THREE.Quaternion().fromArray(quaternion);
          scale = new THREE.Vector3().fromArray(scale);
          
          const baseUrl = import.meta.url;
          console.log('baseUrl', baseUrl);
          const url = importManager.getObjectUrl(object, baseUrl);
          console.log('url', url)
          await loadApp(url, position, quaternion, scale, components);
        }
      }));
    }

    console.log('scene loaded:', srcUrl);
  })());
  
  useCleanup(() => {
    live = false;
  });

  app.hasSubApps = true;

  return true;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'scn';
export const components = ${this.components};