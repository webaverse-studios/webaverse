export const getOwnerApp = (app) => {
  for (;;) {
    let ownerApp;
    if (app.parent?.isApp) {
      app = app.parent;
    } else if (app.parent?.isAppManager && (ownerApp = app.parent.getOwnerApp()) !== void 0) {
      app = ownerApp;
    } else {
      break;
    }
  }
  return app;
};