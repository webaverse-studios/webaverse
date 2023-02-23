// import * as THREE from 'three';
// import metaversefile from 'metaversefile';
// const {useApp, useNpcManager, useCleanup} = metaversefile;

export default ctx => {
  const {
    useApp,
    useNpcManager,
    useHitManager,
    useCleanup,
  } = ctx;
  const app = useApp();
  const npcManager = useNpcManager();
  const hitManager = useHitManager();

  const srcUrl = ${this.srcUrl};

  let live = true;
  const cleanupFns = [];
  app.npc = null;
  ctx.waitUntil((async () => {
    const npc = await npcManager.addNpcApp(app, srcUrl);
    if (!live) return;

    app.npc = npc;
    // npc.app = app;
    cleanupFns.push(() => {
      npcManager.removeNpcApp(app);
    });
  })());

  useCleanup(() => {
    live = false;

    for (const cleanupFn of cleanupFns) {
      cleanupFn();
    }
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'npc';
export const components = ${this.components};