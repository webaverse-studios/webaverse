// compression utils

import DracoEncoderModule from './lib/draco/draco_encoder.js';
import DracoDecoderModule from './lib/draco/draco_decoder.js';

//

export const compressImage = async imageArrayBuffer => {
  const blob = new Blob([
    imageArrayBuffer,
  ]);
  const imageBitmap = await createImageBitmap(blob);
  
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);

  const context = canvas.getContext('2d');
  context.drawImage(imageBitmap, 0, 0);
  imageBitmap.close();
  // encode as webp
  const webpBlob = await canvas.convertToBlob({
    type: 'image/webp',
    quality: 0.8,
  });
  const webpArraybuffer = await webpBlob.arrayBuffer();
  return webpArraybuffer;
}

//

export const compressPointCloud = async vertices => {
  const numPoints = vertices.length / 3;
  
  const [
    encoderModule,
    // decoderModule,
  ] = await Promise.all([
    DracoEncoderModule(),
    // DracoDecoderModule(),
  ]);
  
  const encoder = new encoderModule.Encoder();
  const pointCloudBuilder = new encoderModule.PointCloudBuilder();
  const dracoPointCloud = new encoderModule.PointCloud();

  const positionAttribute = pointCloudBuilder.AddFloatAttribute(dracoPointCloud, encoderModule.POSITION, numPoints, 3, vertices);

  const encodedData = new encoderModule.DracoInt8Array();
  // Use default encoding setting.
  // long EncodePointCloudToDracoBuffer(PointCloud pc, boolean deduplicate_values, DracoInt8Array encoded_data);
  const encodedLen = encoder.EncodePointCloudToDracoBuffer(dracoPointCloud, false, encodedData);
  const uint8Array = new Uint8Array(encodedLen);
  const int8Array = new Int8Array(uint8Array.buffer);
  for (let i = 0; i < encodedLen; i++) {
    int8Array[i] = encodedData.GetValue(i);
  }
  const result = uint8Array;

  encoderModule.destroy(encodedData);
  encoderModule.destroy(dracoPointCloud);
  encoderModule.destroy(encoder);
  encoderModule.destroy(pointCloudBuilder);

  return result;
};
export const decompressPointCloud = async byteArray => {
  const [
    // encoderModule,
    decoderModule,
  ] = await Promise.all([
    // DracoEncoderModule(),
    DracoDecoderModule(),
  ]);

  // Create the Draco decoder.
  const buffer = new decoderModule.DecoderBuffer();
  buffer.Init(byteArray, byteArray.length);

  // Create a buffer to hold the encoded data.
  const decoder = new decoderModule.Decoder();
  const geometryType = decoder.GetEncodedGeometryType(buffer);

  // Decode the encoded geometry.
  let outputGeometry;
  let status;
  if (geometryType == decoderModule.TRIANGULAR_MESH) {
    // outputGeometry = new decoderModule.Mesh();
    // status = decoder.DecodeBufferToMesh(buffer, outputGeometry);
    throw new Error('decompress failed because the encoded geometry is not a point cloud');
  } else {
    outputGeometry = new decoderModule.PointCloud();
    status = decoder.DecodeBufferToPointCloud(buffer, outputGeometry);
  }

  const pc = outputGeometry;
  // long GetAttributeId([Ref, Const] PointCloud pc, draco_GeometryAttribute_Type type);
  const positionAttribute = decoder.GetAttribute(pc, 0);
  // boolean GetAttributeFloatForAllPoints([Ref, Const] PointCloud pc, [Ref, Const] PointAttribute pa, DracoFloat32Array out_values);
  const positionAttributeData = new decoderModule.DracoFloat32Array();
  decoder.GetAttributeFloatForAllPoints(pc, positionAttribute, positionAttributeData);

  // copy data
  const float32Array = new Float32Array(positionAttributeData.size());
  for (let i = 0; i < float32Array.length; i++) {
    float32Array[i] = positionAttributeData.GetValue(i);
  }

  // You must explicitly delete objects created from the DracoDecoderModule
  // or Decoder.
  decoderModule.destroy(pc);
  decoderModule.destroy(positionAttribute);
  decoderModule.destroy(positionAttributeData);
  decoderModule.destroy(decoder);
  decoderModule.destroy(buffer);

  return float32Array;
};
const testPointCloudCompression = async () => {
  const testData = Float32Array.from([
    1, 2, 3,
    1, 2, 3,
    1, 2, 3,
    4, 5, 6,
    4, 5, 6,
    4, 5, 6,
    7, 8, 9,
    7, 8, 9,
    7, 8, 9,
  ]);
  const uint8Array = await compressPointCloud(testData);
  const decodedPointCloud = await decompressPointCloud(uint8Array);
  // check that they are the same
  for (let i = 0; i < testData.length; i++) {
    if (testData[i] !== decodedPointCloud[i]) {
      throw new Error('compression test failed due to data mismatch');
    }
  }
  console.log(`compression test compression ratio: ${compressionRatioString(uint8Array, testData)}`, {
    testData,
    decodedPointCloud,
  });
};
// globalThis.testPointCloudCompression = testPointCloudCompression;

//

export const compressDepthQuantized = async (float32Array, maxDepth = 10000) => {
  const numPoints = float32Array.length;

  // // find the min and max depth
  // let minDepth = Infinity;
  // let maxDepth = -Infinity;
  // for (let i = 0; i < float32Array.length; i++) {
  //   const depth = float32Array[i];
  //   if (depth < minDepth) {
  //     minDepth = depth;
  //   }
  //   if (depth > maxDepth) {
  //     maxDepth = depth;
  //   }
  // }
  
  const [
    encoderModule,
    // decoderModule,
  ] = await Promise.all([
    DracoEncoderModule(),
    // DracoDecoderModule(),
  ]);
  
  const encoder = new encoderModule.Encoder();
  const pointCloudBuilder = new encoderModule.PointCloudBuilder();
  const dracoPointCloud = new encoderModule.PointCloud();

  encoder.SetEncodingMethod(encoderModule.POINT_CLOUD_SEQUENTIAL_ENCODING);
  // encoder.SetEncodingMethod(encoderModule.POINT_CLOUD_KD_TREE_ENCODING);
  // encoder.SetAttributeQuantization(encoderModule.GENERIC, 0);

  // encode the floats to fit inside uint16
  const uint16Array = new Uint16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const depth = float32Array[i];
    const encodedDepth = Math.round(depth) / maxDepth * 65535;
    uint16Array[i] = encodedDepth;
  }
  // add indices
  // const indexArray = new Uint16Array(float32Array.length);
  // for (let i = 0; i < float32Array.length; i++) {
  //   indexArray[i] = i;
  // }

  const positionAttribute = pointCloudBuilder.AddUInt16Attribute(
    dracoPointCloud,
    encoderModule.POSITION,
    numPoints,
    1,
    uint16Array,
  );
  // const indexAttribute = pointCloudBuilder.AddUInt16Attribute(
  //   dracoPointCloud,
  //   encoderModule.GENERIC,
  //   numPoints,
  //   1,
  //   indexArray,
  // );

  const encodedData = new encoderModule.DracoInt8Array();
  const encodedLen = encoder.EncodePointCloudToDracoBuffer(dracoPointCloud, false, encodedData);
  const uint8Array = new Uint8Array(encodedLen);
  const int8Array = new Int8Array(uint8Array.buffer);
  for (let i = 0; i < encodedLen; i++) {
    int8Array[i] = encodedData.GetValue(i);
  }
  const result = uint8Array;

  encoderModule.destroy(encodedData);
  encoderModule.destroy(dracoPointCloud);
  encoderModule.destroy(encoder);
  encoderModule.destroy(pointCloudBuilder);

  return result;
};
export const decompressDepthQuantized = async (byteArray, maxDepth = 10000) => {
  const [
    // encoderModule,
    decoderModule,
  ] = await Promise.all([
    // DracoEncoderModule(),
    DracoDecoderModule(),
  ]);

  // Create the Draco decoder.
  const buffer = new decoderModule.DecoderBuffer();
  buffer.Init(byteArray, byteArray.length);

  // Create a buffer to hold the encoded data.
  const decoder = new decoderModule.Decoder();
  const geometryType = decoder.GetEncodedGeometryType(buffer);

  // Decode the encoded geometry.
  let outputGeometry;
  let status;
  if (geometryType == decoderModule.TRIANGULAR_MESH) {
    // outputGeometry = new decoderModule.Mesh();
    // status = decoder.DecodeBufferToMesh(buffer, outputGeometry);
    throw new Error('decompress failed because the encoded geometry is not a point cloud');
  } else {
    outputGeometry = new decoderModule.PointCloud();
    status = decoder.DecodeBufferToPointCloud(buffer, outputGeometry);
  }

  if (!status.ok()) {
    const pc = outputGeometry;
    // long GetAttributeId([Ref, Const] PointCloud pc, draco_GeometryAttribute_Type type);
    const positionAttribute = decoder.GetAttribute(pc, 0);
    const positionAttributeData = new decoderModule.DracoUInt16Array();
    decoder.GetAttributeUInt16ForAllPoints(pc, positionAttribute, positionAttributeData);
    // const positionAttributeData = new decoderModule.DracoFloat32Array();
    // decoder.GetAttributeFloatForAllPoints(pc, positionAttribute, positionAttributeData);
    // const indexAttribute = decoder.GetAttribute(pc, 1);
    // const indexAttributeData = new decoderModule.DracoUInt16Array();
    // decoder.GetAttributeUInt16ForAllPoints(pc, indexAttribute, indexAttributeData);

    // copy data
    // const indexArray = new Uint16Array(indexAttributeData.size());
    // for (let i = 0; i < indexArray.length; i++) {
    //   indexArray[i] = indexAttributeData.GetValue(i);
    // }

    // decode back to float32
    const float32Array = new Float32Array(positionAttributeData.size());
    for (let i = 0; i < float32Array.length; i++) {
      const encodedDepth = positionAttributeData.GetValue(i);
      const depth = encodedDepth / 65535 * maxDepth;
      float32Array[i] = depth;
    }

    // You must explicitly delete objects created from the DracoDecoderModule
    // or Decoder.
    decoderModule.destroy(pc);
    decoderModule.destroy(positionAttribute);
    decoderModule.destroy(positionAttributeData);
    decoderModule.destroy(decoder);
    decoderModule.destroy(buffer);

    return float32Array;
  } else {
    debugger;
    throw new Error('decompress failed');
  }
};
const testDepthCompressionQuantized = async () => {
  const testData = Float32Array.from([
    1, 2, 3,
    1, 2, 3,
    1, 2, 3,
    4, 5, 6,
    4, 5, 6,
    4, 5, 6,
    7, 8, 9,
    7, 8, 9,
    7, 8, 9,
  ].concat(Array(128).fill(7))).map(n => n * 1000);
  const uint8Array = await compressDepthQuantized(testData);
  const decodedDepth = await decompressDepthQuantized(uint8Array);
  console.log(`compression test compression ratio: ${compressionRatioString(uint8Array, testData)}`, {
    testData,
    decodedDepth,
  });
};
// globalThis.testDepthCompressionQuantized = testDepthCompressionQuantized; // XXX

//

export const compressDepth = async (float32Array, quantization = -1) => {
  const numPoints = float32Array.length;
  
  const [
    encoderModule,
    // decoderModule,
  ] = await Promise.all([
    DracoEncoderModule(),
    // DracoDecoderModule(),
  ]);
  
  const encoder = new encoderModule.Encoder();
  const pointCloudBuilder = new encoderModule.PointCloudBuilder();
  const dracoPointCloud = new encoderModule.PointCloud();

  encoder.SetEncodingMethod(encoderModule.POINT_CLOUD_SEQUENTIAL_ENCODING);
  // encoder.SetEncodingMethod(encoderModule.POINT_CLOUD_KD_TREE_ENCODING);
  if (quantization !== -1) {
    encoder.SetAttributeQuantization(encoderModule.POSITION, quantization);
    encoder.SetAttributeQuantization(encoderModule.GENERIC, quantization);
  }

  const positionAttribute = pointCloudBuilder.AddFloatAttribute(
    dracoPointCloud,
    encoderModule.POSITION,
    numPoints,
    1,
    float32Array,
  );

  const encodedData = new encoderModule.DracoInt8Array();
  const encodedLen = encoder.EncodePointCloudToDracoBuffer(dracoPointCloud, false, encodedData);
  const uint8Array = new Uint8Array(encodedLen);
  const int8Array = new Int8Array(uint8Array.buffer);
  for (let i = 0; i < encodedLen; i++) {
    int8Array[i] = encodedData.GetValue(i);
  }
  const result = uint8Array;

  encoderModule.destroy(encodedData);
  encoderModule.destroy(dracoPointCloud);
  encoderModule.destroy(encoder);
  encoderModule.destroy(pointCloudBuilder);

  return result;
};
export const decompressDepth = async (byteArray) => {
  const [
    // encoderModule,
    decoderModule,
  ] = await Promise.all([
    // DracoEncoderModule(),
    DracoDecoderModule(),
  ]);

  // Create the Draco decoder.
  const buffer = new decoderModule.DecoderBuffer();
  buffer.Init(byteArray, byteArray.length);

  // Create a buffer to hold the encoded data.
  const decoder = new decoderModule.Decoder();
  const geometryType = decoder.GetEncodedGeometryType(buffer);

  // Decode the encoded geometry.
  let outputGeometry;
  let status;
  if (geometryType == decoderModule.TRIANGULAR_MESH) {
    // outputGeometry = new decoderModule.Mesh();
    // status = decoder.DecodeBufferToMesh(buffer, outputGeometry);
    throw new Error('decompress failed because the encoded geometry is not a point cloud');
  } else {
    outputGeometry = new decoderModule.PointCloud();
    status = decoder.DecodeBufferToPointCloud(buffer, outputGeometry);
  }

  if (status.ok()) {
    const pc = outputGeometry;
    // long GetAttributeId([Ref, Const] PointCloud pc, draco_GeometryAttribute_Type type);
    const positionAttribute = decoder.GetAttribute(pc, 0);
    const positionAttributeData = new decoderModule.DracoFloat32Array();
    decoder.GetAttributeFloatForAllPoints(pc, positionAttribute, positionAttributeData);
    // const positionAttributeData = new decoderModule.DracoFloat32Array();
    // decoder.GetAttributeFloatForAllPoints(pc, positionAttribute, positionAttributeData);
    // const indexAttribute = decoder.GetAttribute(pc, 1);
    // const indexAttributeData = new decoderModule.DracoUInt16Array();
    // decoder.GetAttributeUInt16ForAllPoints(pc, indexAttribute, indexAttributeData);
    
    // copy data
    const float32Array = new Float32Array(positionAttributeData.size());
    for (let i = 0; i < float32Array.length; i++) {
      float32Array[i] = positionAttributeData.GetValue(i);
    }

    // You must explicitly delete objects created from the DracoDecoderModule
    // or Decoder.
    decoderModule.destroy(pc);
    decoderModule.destroy(positionAttribute);
    decoderModule.destroy(positionAttributeData);
    decoderModule.destroy(decoder);
    decoderModule.destroy(buffer);

    return float32Array;
  } else {
    debugger;
    throw new Error('decompress failed');
  }
};
const compressionRatioString = (encoded, raw) => ((encoded.byteLength / raw.byteLength) * 100).toFixed(2) + '%';
const testDepthCompression = async () => {
  const testData = Float32Array.from([
    1, 2, 3,
    1, 2, 3,
    1, 2, 3,
    4, 5, 6,
    4, 5, 6,
    4, 5, 6,
    7, 8, 9,
    7, 8, 9,
    7, 8, 9,
  ].concat(Array(128).fill(7))).map(n => n * 1000);
  const uint8Array = await compressDepth(testData);
  const decodedDepth = await decompressDepth(uint8Array);
  // for (let i = 0; i < testData.length; i++) {
  //   if (testData[i] !== decodedDepth[i]) {
  //     throw new Error('compression test failed due to data mismatch');
  //   }
  // }
  console.log(`compression test compression ratio: ${compressionRatioString(uint8Array, testData)}`, {
    testData,
    decodedDepth,
  });
};
// globalThis.testDepthCompression = testDepthCompression; // XXX

//

export const compressByteAttribute = async (byteAttribute) => {
  const numPoints = byteAttribute.length;
  
  const [
    encoderModule,
    // decoderModule,
  ] = await Promise.all([
    DracoEncoderModule(),
    // DracoDecoderModule(),
  ]);
  
  const encoder = new encoderModule.Encoder();
  const pointCloudBuilder = new encoderModule.PointCloudBuilder();
  const dracoPointCloud = new encoderModule.PointCloud();

  encoder.SetEncodingMethod(encoderModule.POINT_CLOUD_SEQUENTIAL_ENCODING);
  encoder.SetAttributeQuantization(encoderModule.POSITION, 0);
  encoder.SetAttributeQuantization(encoderModule.GENERIC, 0);

  const positionAttribute = pointCloudBuilder.AddUInt8Attribute(dracoPointCloud, encoderModule.POSITION, numPoints, 1, byteAttribute);

  const encodedData = new encoderModule.DracoInt8Array();
  // Use default encoding setting.
  // long EncodePointCloudToDracoBuffer(PointCloud pc, boolean deduplicate_values, DracoInt8Array encoded_data);
  const encodedLen = encoder.EncodePointCloudToDracoBuffer(dracoPointCloud, false, encodedData);
  const uint8Array = new Uint8Array(encodedLen);
  const int8Array = new Int8Array(uint8Array.buffer);
  // const int8Array = new Int8Array(encodedLen);
  for (let i = 0; i < encodedLen; i++) {
    int8Array[i] = encodedData.GetValue(i);
  }
  const result = uint8Array;
  // const result = int8Array;

  encoderModule.destroy(encodedData);
  encoderModule.destroy(dracoPointCloud);
  encoderModule.destroy(encoder);
  encoderModule.destroy(pointCloudBuilder);

  return result;
};
export const decompressByteAttribute = async byteArray => {
  const [
    // encoderModule,
    decoderModule,
  ] = await Promise.all([
    // DracoEncoderModule(),
    DracoDecoderModule(),
  ]);

  // Create the Draco decoder.
  const buffer = new decoderModule.DecoderBuffer();
  buffer.Init(byteArray, byteArray.length);

  // Create a buffer to hold the encoded data.
  const decoder = new decoderModule.Decoder();
  const geometryType = decoder.GetEncodedGeometryType(buffer);

  // Decode the encoded geometry.
  let outputGeometry;
  let status;
  if (geometryType == decoderModule.TRIANGULAR_MESH) {
    // outputGeometry = new decoderModule.Mesh();
    // status = decoder.DecodeBufferToMesh(buffer, outputGeometry);
    throw new Error('decompress failed because the encoded geometry is not a point cloud');
  } else {
    outputGeometry = new decoderModule.PointCloud();
    status = decoder.DecodeBufferToPointCloud(buffer, outputGeometry);
  }

  const pc = outputGeometry;
  // long GetAttributeId([Ref, Const] PointCloud pc, draco_GeometryAttribute_Type type);
  const positionAttribute = decoder.GetAttribute(pc, 0);
  // boolean GetAttributeFloatForAllPoints([Ref, Const] PointCloud pc, [Ref, Const] PointAttribute pa, DracoFloat32Array out_values);
  const positionAttributeData = new decoderModule.DracoUInt8Array();
  decoder.GetAttributeUInt8ForAllPoints(pc, positionAttribute, positionAttributeData);

  // copy data
  const uint8Array = new Uint8Array(positionAttributeData.size());
  for (let i = 0; i < uint8Array.length; i++) {
    uint8Array[i] = positionAttributeData.GetValue(i);
  }

  // You must explicitly delete objects created from the DracoDecoderModule
  // or Decoder.
  decoderModule.destroy(pc);
  decoderModule.destroy(positionAttribute);
  decoderModule.destroy(positionAttributeData);
  decoderModule.destroy(decoder);
  decoderModule.destroy(buffer);

  return uint8Array;
};
const testByteAttributeCompression = async () => {
  const testData = Uint8Array.from([
    1, 1, 1,
    1, 2, 1,
    1, 1, 1,
    2, 2, 2,
    2, 3, 2,
    2, 2, 2,
    3, 3, 3,
    3, 4, 3,
    3, 3, 3,
    4, 4, 4,
    4, 5, 4,
    4, 4, 4,
  ].concat(Array(1024).fill(7)));
  const uint8Array = await compressByteAttribute(testData);
  const decodedByteAttribute = await decompressByteAttribute(uint8Array);
  // check that they are the same
  for (let i = 0; i < testData.length; i++) {
    if (testData[i] !== decodedByteAttribute[i]) {
      throw new Error('compression test failed due to data mismatch');
    }
  }
  console.log(`compression test compression ratio: ${compressionRatioString(uint8Array, testData)}`, {
    testData,
    decodedDepth,
  });
};
// globalThis.testByteAttributeCompression = testByteAttributeCompression; // XXX

//

function mergeChunks(chunks) {
  const result = new Uint8Array(chunks.reduce((a, b) => a + b.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
const makeReadableStream = array => new ReadableStream({
  pull(controller) {
    for (let i = 0; i < array.length; i++) {
      controller.enqueue(array[i]);
    }
    controller.close();
  }
});
export const compressGeneric = async data => {
  const s = makeReadableStream([
    data,
  ]).pipeThrough(
    new CompressionStream('gzip')
  );
  const reader = s.getReader();
  const chunks = [];
  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  return mergeChunks(chunks);
};
export const decompressGeneric = async data => {
  const s = makeReadableStream([
    data,
  ]).pipeThrough(
    new DecompressionStream('gzip')
  );
  const reader = s.getReader();
  const chunks = [];
  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  return mergeChunks(chunks);
};
const testCompressionGeneric = async () => {
  const testData = Uint8Array.from([1,2,3,4,5,6,7,8]);
  const compressed = await compressGeneric(testData);
  const decompressed = await decompressGeneric(compressed);
  // ensure they are the same
  for (let i = 0; i < testData.length; i++) {
    if (testData[i] !== decompressed[i]) {
      throw new Error('compression test failed due to data mismatch');
    }
  }
};
// globalThis.testCompressionGeneric = testCompressionGeneric; // XXX