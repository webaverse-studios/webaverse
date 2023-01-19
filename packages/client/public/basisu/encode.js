// Uncomment these after moving avatar optimizers to preview server
// import { dirname } from 'path';
// import { createRequire } from 'module';
// globalThis.__dirname = dirname(import.meta.url).substring(7);
// globalThis.require = createRequire(import.meta.url);

import BASIS from './basis_encoder.mjs';

function log(s) {
  console.log(s);
}

export function encodePNG2KTX(data, {
  encodeQuality = 1,
  compressionLevel = 0,
  enableUASTC = true,
  SRGB = true,
} = {}) {
  const {BasisEncoder, initializeBasis} = globalThis.basisuModule;

  initializeBasis();

  // Create a destination buffer to hold the compressed .basis file data. If this buffer isn't large enough compression will fail.
  var basisFileData = new Uint8Array(1024 * 1024 * 10);

  var num_output_bytes;

  // Compress using the BasisEncoder class.

  const basisEncoder = new BasisEncoder();

  const cPackUASTCLevelFastest = 0;

  const uastcLevel = cPackUASTCLevelFastest;
  const uastcFlag = enableUASTC;
  const ktx = true;

  basisEncoder.setSliceSourceImage(0, new Uint8Array(data), 0, 0, true);
  basisEncoder.setDebug(false);
  basisEncoder.setComputeStats(false);
  basisEncoder.setPerceptual(SRGB);
  basisEncoder.setMipSRGB(SRGB);
  basisEncoder.setQualityLevel(encodeQuality);
  basisEncoder.setCompressionLevel(compressionLevel);
  basisEncoder.setUASTC(uastcFlag);
  basisEncoder.setMipGen(false); // elem('Mipmaps').checked);
  basisEncoder.setYFlip(true);

  basisEncoder.setCreateKTX2File(ktx);
  basisEncoder.setKTX2UASTCSupercompression(true);
  basisEncoder.setKTX2SRGBTransferFunc(false);

  basisEncoder.setPackUASTCFlags(uastcLevel);

  // if (!uastcFlag)
  //  log('Encoding at ETC1S quality level ' + qualityLevel);

  const startTime = performance.now();

  num_output_bytes = basisEncoder.encode(basisFileData);

  const elapsed = performance.now() - startTime;

  var actualBasisFileData = new Uint8Array(basisFileData.buffer, 0, num_output_bytes);

  basisEncoder.delete();

  if (num_output_bytes === 0) {
    console.warn('encodeBasisTexture() failed!');
  }
  else {
    // log('encodeBasisTexture() succeeded, output size: ' + num_output_bytes + ', encoding time: ' + elapsed.toFixed(2));
  }

  if (num_output_bytes !== 0) {
    return actualBasisFileData;
  }

  return null;
}

BASIS({
  onRuntimeInitialized: () => { }
}).then(module => {
  globalThis.basisuModule = module;
});