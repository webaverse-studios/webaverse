import {zbencode, zbdecode} from 'zjs';

//

// XXX make this point to a remote server in production
const rendererHost = `https://local-renderer.webaverse.com`;

//

export const makeRemoteWorker = startUrl => {
  return new RemoteEngineWorker(startUrl);
};

//

class RemoteEngineWorker {
  constructor(startUrl) {
    this.startUrl = startUrl;
  }
  async waitForLoad() {
    // nothing
  }
  async request(funcName, args = [], {
    signal = null,
  } = {}) {
    // console.log('remote engine request', {
    //   funcName,
    //   args,
    // });

    const u = new URL(`${rendererHost}/api`);
    u.searchParams.set('start_url', this.startUrl);
    u.searchParams.set('funcName', funcName);
    // u.searchParams.set('args', JSON.stringify(args));
    // cache ?? u.searchParams.set('cache', cache);
    
    const body = zbencode(args);

    const res = await fetch(u, {
      method: 'POST',
      body,
    });
    // console.log('got res', res);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      // console.log('got uint8Array', uint8Array);
      try {
        const result = zbdecode(uint8Array);
        // console.log('got result', result);
        return result;
      } catch(err) {
        // console.warn(err);
        const textDecoder = new TextDecoder();
        const text = textDecoder.decode(uint8Array);
        console.warn('offscreen engine error', err, text);
      }
    } else {
      throw new Error('failed to fetch: ' + res.status);
    }
  }
  destroy() {
    // nothing
  }
}