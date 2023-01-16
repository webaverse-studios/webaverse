import {
  zbencode,
  zbdecode,
} from 'zjs';

const _getArgs = async argsUrl => {
  const res = await fetch(argsUrl);
  if (res.ok) {
    const arrayBuffer = await res.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const args = zbdecode(uint8Array);
    return args;
  } else {
    throw new Error('failed to fetch args: ' + argsUrl + ' ' + res.status);
  }
};
const _respond = async (cbUrl, statusCode, contentType, body) => {
  const res = await fetch(cbUrl, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'X-Proxy-Status-Code': statusCode,
    },
    body,
  });
  if (res.ok) {
    await res.blob();
  } else {
    throw new Error('failed to respond: ' + res.status);
  }
};
const offscreenEngineManagerApi = async fn => {
  if (globalThis.location) {
    const url = new URL(location.href);
    const {searchParams} = url;
    const funcName = searchParams.get('funcName');
    const argsUrl = searchParams.get('argsUrl');
    const cbUrl = searchParams.get('cbUrl');
    // console.log('offscreen engine api check', {href: location.href, funcName, argsUrl, cbUrl});
    if (funcName && argsUrl && cbUrl) {
      // console.log('wait for args', argsUrl);
      const args = await _getArgs(argsUrl);

      const opts = {
        signal: null,
      };
      // console.log('wait for func');
      const result = await fn(funcName, args, opts);
      const resultUint8Array = zbencode(result);
      // console.log('wait for respond');
      await _respond(cbUrl, 200, 'application/octet-stream', resultUint8Array);
      // console.log('offscreen done');
    }
  }
};
export default offscreenEngineManagerApi;