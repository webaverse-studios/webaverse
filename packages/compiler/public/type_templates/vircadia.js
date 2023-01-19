import metaversefile from 'metaversefile';
const { useApp, useCleanup, useDomain } = metaversefile;

export default e => {
  const app = useApp();
  const domain = useDomain();
  const srcUrl = ${ this.srcUrl };
  let json = null;

  const mode = app.getComponent('mode') ?? 'attached';
  if (mode === 'attached') {
    (async () => {
      if (domain) {
        const res = await fetch(srcUrl);
        json = await res.json();
        if (json && json.domain) {
          if (!domain.hasURL()) {
            domain.connect(json.domain);
          } else {
            console.error('Tried to use more than one Vircadia domain in a scene.');
          }
        } else {
          console.error("Invalid Vircadia domain spec:", json);
        }
      } else {
        console.error("Tried to use Vircadia domain in a non-domain scene.");
      }
    })();
  }

  useCleanup(() => {
    // Don't need to call domain.disconnect() here because domain will have already been disconnected by 
    // universe.disconnectDomain().
  });

  return app;
};
export const contentId = ${ this.contentId };
export const name = ${ this.name };
export const description = ${ this.description };
export const type = 'domain';
export const components = ${ this.components };
