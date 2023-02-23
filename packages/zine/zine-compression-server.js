import {
  compressImage,
  compressPointCloud,
  decompressPointCloud,
  compressDepth,
  compressDepthQuantized,
  decompressDepth,
  decompressDepthQuantized,
  compressByteAttribute,
  decompressByteAttribute,
  compressGeneric,
  decompressGeneric,
} from './zine-compression-utils.js';

//

const maxDepth = 10000;
const quantization = 16;

//

export class ZineCompressionServer {
  constructor() {
    (async () => {
      // wait for global init message to get the port
      const port = await new Promise((accept, reject) => {
        self.addEventListener('message', e => {
          const {data} = e;
          const {method, args} = data;
          if (method === 'init') {
            accept(args.port);
            args.port.start();
          }
        });
      });

      // listen for messages on the port
      port.addEventListener('message', async e => {
        const {data} = e;
        const {id, method, args} = data;

        const _respondOk = (result, transfers) => {
          port.postMessage({
            id,
            result,
          }, transfers);
        };
        const _respondError = (error, transfers) => {
          port.postMessage({
            id,
            error: error.stack,
          }, transfers);
        };
  
        try {
          switch (method) {
            case 'compress': {
              const {type, value} = args;
              
              let compressedValue;
              let transfers;
              if (type === 'image') {
                compressedValue = await compressImage(value);
                transfers = [compressedValue];
              } else if (type === 'pointCloud') {
                compressedValue = await compressPointCloud(new Float32Array(value));
                transfers = [compressedValue.buffer];
              } else if (type === 'depthQuantized') {
                compressedValue = await compressDepthQuantized(new Float32Array(value, maxDepth));
                transfers = [compressedValue.buffer];
              } else if (type === 'depth') {
                compressedValue = await compressDepth(new Float32Array(value), quantization);
                transfers = [compressedValue.buffer];
              } else if (type === 'byteAttribute') {
                compressedValue = await compressByteAttribute(value);
                transfers = [compressedValue.buffer];
              } else if (type === 'generic') {
                compressedValue = await compressGeneric(value);
                transfers = [compressedValue.buffer];
              } else {
                new Error('unknown compression type: ' + type);
              }

              _respondOk(compressedValue, transfers);
              
              break;
            }
            case 'decompress': {
              const {type, value} = args;

              let decompressedValue;
              let transfers = [];
              if (type === 'pointCloud') {
                decompressedValue = await decompressPointCloud(value);
                decompressedValue = decompressedValue.buffer;
                transfers = [decompressedValue];
              } else if (type === 'depthQuantized') {
                decompressedValue = await decompressDepthQuantized(value);
                transfers = [decompressedValue.buffer];
              } else if (type === 'depth') {
                decompressedValue = await decompressDepth(value);
                transfers = [decompressedValue.buffer];
              } else if (type === 'byteAttribute') {
                decompressedValue = await decompressByteAttribute(value);
                transfers = [decompressedValue.buffer];
              } else if (type === 'generic') {
                decompressedValue = await decompressGeneric(value);
                transfers = [decompressedValue.buffer];
              } else {
                throw new Error('unknown compression type: ' + type);
              }

              _respondOk(decompressedValue, transfers);
              
              break;
            }
            default: {
              throw new Error('unknown method: ' + method);
            }
          }
        } catch(err) {
          _respondError(err);
        }
      });
    })();
  }
}
if (typeof self !== 'undefined' && self.constructor.name === 'DedicatedWorkerGlobalScope') {
  new ZineCompressionServer();
}