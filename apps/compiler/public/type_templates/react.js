import metaversefile from 'metaversefile';
const {useApp, useFrame, useDomRenderer, useInternals, useWear, useCleanup} = metaversefile;

export default e => {  
  const app = useApp();
  const {sceneLowerPriority} = useInternals();
  const domRenderEngine = useDomRenderer();

  let srcUrl = ${this.srcUrl};
  
  let dom = null;
  // const transformMatrix = new THREE.Matrix4();
  e.waitUntil((async () => {
    const res = await fetch(srcUrl);
    const json = await res.json();
    let {/*position, quaternion, scale,*/ jsxUrl} = json;

    if (/^\\./.test(jsxUrl)) {
      jsxUrl = new URL(jsxUrl, srcUrl).href;
    }
    
    const m = await import(jsxUrl);
  
    dom = domRenderEngine.addDom({
      render: () => m.default(),
    });

    sceneLowerPriority.add(dom);
    dom.updateMatrixWorld();
  })());

  useFrame(() => {
    if (dom) {
      if (!wearing) {
        app.matrixWorld.decompose(dom.position, dom.quaternion, dom.scale);
        dom.updateMatrixWorld();
      } else {
        dom.position.copy(app.position);
        dom.quaternion.copy(app.quaternion);
        dom.scale.copy(app.scale);
        dom.updateMatrixWorld();
      }
    }
  });

  let wearing = false;
  useWear(e => {
    wearing = e.wear;
  });

  useCleanup(() => {
    if (dom) {
      sceneLowerPriority.remove(dom);
      dom.destroy();
    }
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'react';
export const components = ${this.components};