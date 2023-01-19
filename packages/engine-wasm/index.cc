#include <node.h>
#include "v8-strings.h"
#include "util.h"
#include "noiseObject.h"
#include "cachedNoiseObject.h"
#include "noiserObject.h"
#include "march.h"
#include "tssl.h"
#include "compose.h"
#include "flod.h"
#include "heightfield.h"
#include "light.h"
// #include <iostream>

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Number;
using v8::Value;
using v8::Array;
using v8::ArrayBuffer;
using v8::Float32Array;
using v8::Uint32Array;
using v8::Uint8Array;
using v8::Boolean;

void CreateNoise(const FunctionCallbackInfo<Value>& args) {
  NoiseObject::NewInstance(args);
}

void CreateCachedNoise(const FunctionCallbackInfo<Value>& args) {
  CachedNoiseObject::NewInstance(args);
}

void CreateNoiser(const FunctionCallbackInfo<Value>& args) {
  NoiserObject::NewInstance(args);
}

/* void MarchCubes(const FunctionCallbackInfo<Value>& args) {
  unsigned int positionIndex;
  unsigned int faceIndex;

  Local<String> bufferString = V8_STRINGS::buffer.Get(args.GetIsolate());
  Local<String> byteOffsetString = V8_STRINGS::byteOffset.Get(args.GetIsolate());
  Local<String> positionsString = V8_STRINGS::positions.Get(args.GetIsolate());
  Local<String> indicesString = V8_STRINGS::indices.Get(args.GetIsolate());

  Local<Array> dimsArg = Local<Array>::Cast(args[0]);
  Local<ArrayBuffer> potentialBuffer = Local<ArrayBuffer>::Cast(args[1]->ToObject()->Get(bufferString));
  unsigned int potentialByteOffset = args[1]->ToObject()->Get(byteOffsetString)->Uint32Value();
  Local<Array> shiftArg = Local<Array>::Cast(args[2]);
  Local<Value> indexOffsetArg = args[3];
  Local<ArrayBuffer> positionsBuffer = Local<ArrayBuffer>::Cast(args[4]->ToObject()->Get(bufferString));
  unsigned int positionsByteOffset = args[4]->ToObject()->Get(byteOffsetString)->Uint32Value();
  Local<ArrayBuffer> facesBuffer = Local<ArrayBuffer>::Cast(args[5]->ToObject()->Get(bufferString));
  unsigned int facesByteOffset = args[5]->ToObject()->Get(byteOffsetString)->Uint32Value();

  int dims[3] = {
    dimsArg->Get(0)->Int32Value(),
    dimsArg->Get(1)->Int32Value(),
    dimsArg->Get(2)->Int32Value()
  };
  int shift[3] = {
    Local<Array>::Cast(shiftArg->Get(0))->Get(0)->Int32Value(),
    Local<Array>::Cast(shiftArg->Get(0))->Get(1)->Int32Value(),
    Local<Array>::Cast(shiftArg->Get(0))->Get(2)->Int32Value()
  };
  int indexOffset = indexOffsetArg->Int32Value();

  float *potential = (float *)((char *)potentialBuffer->GetContents().Data() + potentialByteOffset);
  float *positions = (float *)((char *)positionsBuffer->GetContents().Data() + positionsByteOffset);
  unsigned int *faces = (unsigned int *)((char *)facesBuffer->GetContents().Data() + facesByteOffset);

  marchingCubes(dims, potential, shift, indexOffset, positions, faces, positionIndex, faceIndex);

  Local<Object> result = Object::New(args.GetIsolate());
  result->Set(positionsString, Float32Array::New(positionsBuffer, positionsByteOffset, positionIndex));
  result->Set(indicesString, Uint32Array::New(facesBuffer, facesByteOffset, faceIndex));
  args.GetReturnValue().Set(result);
} */

void Objectize(const FunctionCallbackInfo<Value>& args) {
  Local<String> objectsSrcString = V8_STRINGS::objectsSrc.Get(args.GetIsolate());
  Local<String> vegetationsSrcString = V8_STRINGS::vegetationsSrc.Get(args.GetIsolate());
  Local<String> geometriesString = V8_STRINGS::geometries.Get(args.GetIsolate());
  Local<String> geometryIndexString = V8_STRINGS::geometryIndex.Get(args.GetIsolate());
  Local<String> blocksString = V8_STRINGS::blocks.Get(args.GetIsolate());
  Local<String> blockTypesString = V8_STRINGS::blockTypes.Get(args.GetIsolate());
  Local<String> dimsString = V8_STRINGS::dims.Get(args.GetIsolate());
  Local<String> transparentVoxelsString = V8_STRINGS::transparentVoxels.Get(args.GetIsolate());
  Local<String> translucentVoxelsString = V8_STRINGS::translucentVoxels.Get(args.GetIsolate());
  Local<String> faceUvsString = V8_STRINGS::faceUvs.Get(args.GetIsolate());
  Local<String> shiftString = V8_STRINGS::shift.Get(args.GetIsolate());
  Local<String> positionsString = V8_STRINGS::positions.Get(args.GetIsolate());
  Local<String> uvsString = V8_STRINGS::uvs.Get(args.GetIsolate());
  Local<String> ssaosString = V8_STRINGS::ssaos.Get(args.GetIsolate());
  Local<String> framesString = V8_STRINGS::frames.Get(args.GetIsolate());
  Local<String> objectIndicesString = V8_STRINGS::objectIndices.Get(args.GetIsolate());
  Local<String> indicesString = V8_STRINGS::indices.Get(args.GetIsolate());
  Local<String> objectsString = V8_STRINGS::objects.Get(args.GetIsolate());
  Local<String> bufferString = V8_STRINGS::buffer.Get(args.GetIsolate());
  Local<String> byteOffsetString = V8_STRINGS::byteOffset.Get(args.GetIsolate());

  Local<Object> opts = args[0]->ToObject();

  Local<ArrayBuffer> objectsSrcBuffer = Local<ArrayBuffer>::Cast(opts->Get(objectsSrcString)->ToObject()->Get(bufferString));
  unsigned int objectsSrcByteOffset = opts->Get(objectsSrcString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  void *objectsSrc = (void *)((char *)objectsSrcBuffer->GetContents().Data() + objectsSrcByteOffset);

  Local<ArrayBuffer> vegetationsSrcBuffer = Local<ArrayBuffer>::Cast(opts->Get(vegetationsSrcString)->ToObject()->Get(bufferString));
  unsigned int vegetationsSrcByteOffset = opts->Get(vegetationsSrcString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  void *vegetationsSrc = (void *)((char *)vegetationsSrcBuffer->GetContents().Data() + vegetationsSrcByteOffset);

  Local<ArrayBuffer> geometriesBuffer = Local<ArrayBuffer>::Cast(opts->Get(geometriesString)->ToObject()->Get(bufferString));
  unsigned int geometriesByteOffset = opts->Get(geometriesString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  void *geometries = (void *)((char *)geometriesBuffer->GetContents().Data() + geometriesByteOffset);

  Local<ArrayBuffer> geometryIndexBuffer = Local<ArrayBuffer>::Cast(opts->Get(geometryIndexString)->ToObject()->Get(bufferString));
  unsigned int geometryIndexByteOffset = opts->Get(geometryIndexString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned int *geometryIndex = (unsigned int *)((char *)geometryIndexBuffer->GetContents().Data() + geometryIndexByteOffset);

  Local<ArrayBuffer> blocksBuffer = Local<ArrayBuffer>::Cast(opts->Get(blocksString)->ToObject()->Get(bufferString));
  unsigned int blocksByteOffset = opts->Get(blocksString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned int *blocks = (unsigned int *)((char *)blocksBuffer->GetContents().Data() + blocksByteOffset);

  Local<ArrayBuffer> blockTypesBuffer = Local<ArrayBuffer>::Cast(opts->Get(blockTypesString)->ToObject()->Get(bufferString));
  unsigned int blockTypesByteOffset = opts->Get(blockTypesString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned int *blockTypes = (unsigned int *)((char *)blockTypesBuffer->GetContents().Data() + blockTypesByteOffset);

  Local<ArrayBuffer> dimsBuffer = Local<ArrayBuffer>::Cast(opts->Get(dimsString)->ToObject()->Get(bufferString));
  unsigned int dimsByteOffset = opts->Get(dimsString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  int *dims = (int *)((char *)dimsBuffer->GetContents().Data() + dimsByteOffset);

  Local<ArrayBuffer> transparentVoxelsBuffer = Local<ArrayBuffer>::Cast(opts->Get(transparentVoxelsString)->ToObject()->Get(bufferString));
  unsigned int transparentVoxelsByteOffset = opts->Get(transparentVoxelsString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *transparentVoxels = (unsigned char *)((char *)transparentVoxelsBuffer->GetContents().Data() + transparentVoxelsByteOffset);

  Local<ArrayBuffer> translucentVoxelsBuffer = Local<ArrayBuffer>::Cast(opts->Get(translucentVoxelsString)->ToObject()->Get(bufferString));
  unsigned int translucentVoxelsByteOffset = opts->Get(translucentVoxelsString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *translucentVoxels = (unsigned char *)((char *)translucentVoxelsBuffer->GetContents().Data() + translucentVoxelsByteOffset);

  Local<ArrayBuffer> faceUvsBuffer = Local<ArrayBuffer>::Cast(opts->Get(faceUvsString)->ToObject()->Get(bufferString));
  unsigned int faceUvsByteOffset = opts->Get(faceUvsString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *faceUvs = (float *)((char *)faceUvsBuffer->GetContents().Data() + faceUvsByteOffset);

  Local<ArrayBuffer> shiftBuffer = Local<ArrayBuffer>::Cast(opts->Get(shiftString)->ToObject()->Get(bufferString));
  unsigned int shiftByteOffset = opts->Get(shiftString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *shift = (float *)((char *)shiftBuffer->GetContents().Data() + shiftByteOffset);

  unsigned int positionIndex[NUM_CHUNKS_HEIGHT];
  unsigned int uvIndex[NUM_CHUNKS_HEIGHT];
  unsigned int ssaoIndex[NUM_CHUNKS_HEIGHT];
  unsigned int frameIndex[NUM_CHUNKS_HEIGHT];
  unsigned int objectIndexIndex[NUM_CHUNKS_HEIGHT];
  unsigned int indexIndex[NUM_CHUNKS_HEIGHT];
  unsigned int objectIndex[NUM_CHUNKS_HEIGHT];

  Local<ArrayBuffer> positionsBuffer = Local<ArrayBuffer>::Cast(opts->Get(positionsString)->ToObject()->Get(bufferString));
  unsigned int positionsByteOffset = opts->Get(positionsString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *positions = (float *)((char *)positionsBuffer->GetContents().Data() + positionsByteOffset);

  Local<ArrayBuffer> uvsBuffer = Local<ArrayBuffer>::Cast(opts->Get(uvsString)->ToObject()->Get(bufferString));
  unsigned int uvsByteOffset = opts->Get(uvsString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *uvs = (float *)((char *)uvsBuffer->GetContents().Data() + uvsByteOffset);

  Local<ArrayBuffer> ssaosBuffer = Local<ArrayBuffer>::Cast(opts->Get(ssaosString)->ToObject()->Get(bufferString));
  unsigned int ssaosByteOffset = opts->Get(ssaosString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *ssaos = (unsigned char *)((char *)ssaosBuffer->GetContents().Data() + ssaosByteOffset);

  Local<ArrayBuffer> framesBuffer = Local<ArrayBuffer>::Cast(opts->Get(framesString)->ToObject()->Get(bufferString));
  unsigned int framesByteOffset = opts->Get(framesString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *frames = (float *)((char *)framesBuffer->GetContents().Data() + framesByteOffset);

  Local<ArrayBuffer> objectIndicesBuffer = Local<ArrayBuffer>::Cast(opts->Get(objectIndicesString)->ToObject()->Get(bufferString));
  unsigned int objectIndicesByteOffset = opts->Get(objectIndicesString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *objectIndices = (float *)((char *)objectIndicesBuffer->GetContents().Data() + objectIndicesByteOffset);

  Local<ArrayBuffer> indicesBuffer = Local<ArrayBuffer>::Cast(opts->Get(indicesString)->ToObject()->Get(bufferString));
  unsigned int indicesByteOffset = opts->Get(indicesString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned int *indices = (unsigned int *)((char *)indicesBuffer->GetContents().Data() + indicesByteOffset);

  Local<ArrayBuffer> objectsBuffer = Local<ArrayBuffer>::Cast(opts->Get(objectsString)->ToObject()->Get(bufferString));
  unsigned int objectsByteOffset = opts->Get(objectsString)->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned int *objects = (unsigned int *)((char *)objectsBuffer->GetContents().Data() + objectsByteOffset);

  compose(
    objectsSrc, vegetationsSrc, geometries, geometryIndex,
    blocks, blockTypes, dims, transparentVoxels, translucentVoxels, faceUvs, shift,
    positions, uvs, ssaos, frames, objectIndices, indices, objects,
    positionIndex, uvIndex, ssaoIndex, frameIndex, objectIndexIndex, indexIndex, objectIndex
  );

  Local<Array> numPositions = Array::New(args.GetIsolate(), NUM_CHUNKS_HEIGHT);
  Local<Array> numUvs = Array::New(args.GetIsolate(), NUM_CHUNKS_HEIGHT);
  Local<Array> numSsaos = Array::New(args.GetIsolate(), NUM_CHUNKS_HEIGHT);
  Local<Array> numFrames = Array::New(args.GetIsolate(), NUM_CHUNKS_HEIGHT);
  Local<Array> numObjectIndices = Array::New(args.GetIsolate(), NUM_CHUNKS_HEIGHT);
  Local<Array> numIndices = Array::New(args.GetIsolate(), NUM_CHUNKS_HEIGHT);
  Local<Array> numObjects = Array::New(args.GetIsolate(), NUM_CHUNKS_HEIGHT);

  for (unsigned int i = 0; i < NUM_CHUNKS_HEIGHT; i++) {
    numPositions->Set(i, Number::New(args.GetIsolate(), positionIndex[i]));
    numUvs->Set(i, Number::New(args.GetIsolate(), uvIndex[i]));
    numSsaos->Set(i, Number::New(args.GetIsolate(), ssaoIndex[i]));
    numFrames->Set(i, Number::New(args.GetIsolate(), frameIndex[i]));
    numObjectIndices->Set(i, Number::New(args.GetIsolate(), objectIndexIndex[i]));
    numIndices->Set(i, Number::New(args.GetIsolate(), indexIndex[i]));
    numObjects->Set(i, Number::New(args.GetIsolate(), objectIndex[i]));
  }

  Local<Object> result = Object::New(args.GetIsolate());
  result->Set(positionsString, numPositions);
  result->Set(uvsString, numUvs);
  result->Set(ssaosString, numSsaos);
  result->Set(framesString, numFrames);
  result->Set(objectIndicesString, numObjectIndices);
  result->Set(indicesString, numIndices);
  result->Set(objectsString, numObjects);
  args.GetReturnValue().Set(result);
}

void Flod(const FunctionCallbackInfo<Value>& args) {
  Local<String> bufferString = V8_STRINGS::buffer.Get(args.GetIsolate());
  Local<String> byteOffsetString = V8_STRINGS::byteOffset.Get(args.GetIsolate());

  Local<ArrayBuffer> etherBuffer = Local<ArrayBuffer>::Cast(args[0]->ToObject()->Get(bufferString));
  unsigned int etherByteOffset = args[0]->ToObject()->Get(byteOffsetString)->Uint32Value();
  Local<Array> shiftArg = Local<Array>::Cast(args[1]);
  Local<ArrayBuffer> peekBuffer = Local<ArrayBuffer>::Cast(args[2]->ToObject()->Get(bufferString));
  unsigned int peekByteOffset = args[2]->ToObject()->Get(byteOffsetString)->Uint32Value();

  float *ether = (float *)((char *)etherBuffer->GetContents().Data() + etherByteOffset);
  int shift[3] = {
    shiftArg->Get(0)->Int32Value(),
    shiftArg->Get(1)->Int32Value(),
    shiftArg->Get(2)->Int32Value()
  };
  unsigned char *peeks = (unsigned char *)((char *)peekBuffer->GetContents().Data() + peekByteOffset);

  flod(ether, shift, peeks);
}

void GenHeightfield(const FunctionCallbackInfo<Value>& args) {
  Local<String> bufferString = V8_STRINGS::buffer.Get(args.GetIsolate());
  Local<String> byteOffsetString = V8_STRINGS::byteOffset.Get(args.GetIsolate());

  Local<ArrayBuffer> positionsBuffer = Local<ArrayBuffer>::Cast(args[0]->ToObject()->Get(bufferString));
  unsigned int positionsByteOffset = args[0]->ToObject()->Get(byteOffsetString)->Uint32Value();
  Local<ArrayBuffer> indicesBuffer = Local<ArrayBuffer>::Cast(args[1]->ToObject()->Get(bufferString));
  unsigned int indicesByteOffset = args[1]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned int numIndices = args[2]->Uint32Value();
  Local<ArrayBuffer> staticHeightfieldBuffer = Local<ArrayBuffer>::Cast(args[3]->ToObject()->Get(bufferString));
  unsigned int staticHeightfieldByteOffset = args[3]->ToObject()->Get(byteOffsetString)->Uint32Value();

  float *positions = (float *)((char *)positionsBuffer->GetContents().Data() + positionsByteOffset);
  unsigned int *indices = (unsigned int *)((char *)indicesBuffer->GetContents().Data() + indicesByteOffset);
  float *staticHeightfield = (float *)((char *)staticHeightfieldBuffer->GetContents().Data() + staticHeightfieldByteOffset);

  genHeightfield(positions, indices, numIndices, staticHeightfield);
}

void Light(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  if (args.Length() < 14) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongNumberOfArguments.Get(isolate)));
    return;
  }
  if (
      !args[0]->IsNumber() ||
      !args[1]->IsNumber() ||
      !args[2]->IsNumber() ||
      !args[3]->IsNumber() ||
      !args[4]->IsNumber() ||
      !args[5]->IsNumber() ||
      !args[6]->IsNumber() ||
      !args[7]->IsNumber() ||
      !args[8]->IsBoolean() ||
      !args[9]->IsFloat32Array() ||
      !args[10]->IsFloat32Array() ||
      !args[11]->IsFloat32Array() ||
      !args[12]->IsUint32Array() ||
      !args[13]->IsUint8Array()
  ) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongArguments.Get(isolate)));
    return;
  }

  Local<String> bufferString = V8_STRINGS::buffer.Get(isolate);
  Local<String> byteOffsetString = V8_STRINGS::byteOffset.Get(isolate);

  int ox = args[0]->Int32Value();
  int oz = args[1]->Int32Value();
  int minX = args[2]->Int32Value();
  int maxX = args[3]->Int32Value();
  int minY = args[4]->Int32Value();
  int maxY = args[5]->Int32Value();
  int minZ = args[6]->Int32Value();
  int maxZ = args[7]->Int32Value();
  bool relight = args[8]->BooleanValue();

  Local<ArrayBuffer> lavaBuffer = Local<ArrayBuffer>::Cast(args[9]->ToObject()->Get(bufferString));
  unsigned int lavaByteOffset = args[9]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *lava = (float *)((char *)lavaBuffer->GetContents().Data() + lavaByteOffset);

  Local<ArrayBuffer> objectLightsBuffer = Local<ArrayBuffer>::Cast(args[10]->ToObject()->Get(bufferString));
  unsigned int objectLightsByteOffset = args[10]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *objectLights = (float *)((char *)objectLightsBuffer->GetContents().Data() + objectLightsByteOffset);

  Local<ArrayBuffer> ethersBuffer = Local<ArrayBuffer>::Cast(args[11]->ToObject()->Get(bufferString));
  unsigned int ethersByteOffset = args[11]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *ethers = (float *)((char *)ethersBuffer->GetContents().Data() + ethersByteOffset);

  Local<ArrayBuffer> blocksBuffer = Local<ArrayBuffer>::Cast(args[12]->ToObject()->Get(bufferString));
  unsigned int blocksByteOffset = args[12]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned int *blocks = (unsigned int *)((char *)blocksBuffer->GetContents().Data() + blocksByteOffset);

  Local<ArrayBuffer> lightsBuffer = Local<ArrayBuffer>::Cast(args[13]->ToObject()->Get(bufferString));
  unsigned int lightsByteOffset = args[13]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *lights = (unsigned char *)((char *)lightsBuffer->GetContents().Data() + lightsByteOffset);

  float *lavaArray[9];
  float *objectLightsArray[9];
  float *etherArray[9];
  unsigned int *blocksArray[9];
  unsigned char *lightsArray[9];

  for (unsigned int i = 0; i < 9; i++) {
    lavaArray[i] = lava + (i * ((NUM_CELLS + 1) * (NUM_CELLS_HEIGHT + 1) * (NUM_CELLS + 1)));
    objectLightsArray[i] = objectLights + (i * (64 * 64 * 4));
    etherArray[i] = ethers + (i * ((NUM_CELLS + 1) * (NUM_CELLS_HEIGHT + 1) * (NUM_CELLS + 1)));
    blocksArray[i] = blocks + (i * (NUM_CELLS * NUM_CELLS_HEIGHT * NUM_CELLS));
    lightsArray[i] = lights + (i * (NUM_CELLS_OVERSCAN * (NUM_CELLS_HEIGHT + 1) * NUM_CELLS_OVERSCAN));
  }

  const bool lighted = light(ox, oz, minX, maxX, minY, maxY, minZ, maxZ, relight, lavaArray, objectLightsArray, etherArray, blocksArray, lightsArray);
  args.GetReturnValue().Set(Boolean::New(isolate, lighted));
}

void Lightmap(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  if (args.Length() < 8) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongNumberOfArguments.Get(isolate)));
    return;
  }
  if (
      !args[0]->IsNumber() ||
      !args[1]->IsNumber() ||
      !args[2]->IsFloat32Array() ||
      !args[3]->IsNumber() ||
      !args[4]->IsFloat32Array() ||
      !args[5]->IsUint8Array() ||
      !args[6]->IsUint8Array() ||
      !args[7]->IsUint8Array()
  ) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongArguments.Get(isolate)));
    return;
  }

  Local<String> bufferString = V8_STRINGS::buffer.Get(isolate);
  Local<String> byteOffsetString = V8_STRINGS::byteOffset.Get(isolate);

  int ox = args[0]->Uint32Value();
  int oz = args[1]->Uint32Value();

  Local<ArrayBuffer> positionsBuffer = Local<ArrayBuffer>::Cast(args[2]->ToObject()->Get(bufferString));
  unsigned int positionsByteOffset = args[2]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *positions = (float *)((char *)positionsBuffer->GetContents().Data() + positionsByteOffset);

  unsigned int numPositions = args[3]->Uint32Value();

  Local<ArrayBuffer> staticHeightfieldBuffer = Local<ArrayBuffer>::Cast(args[4]->ToObject()->Get(bufferString));
  unsigned int staticHeightfieldByteOffset = args[4]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *staticHeightfield = (float *)((char *)staticHeightfieldBuffer->GetContents().Data() + staticHeightfieldByteOffset);

  Local<ArrayBuffer> lightsBuffer = Local<ArrayBuffer>::Cast(args[5]->ToObject()->Get(bufferString));
  unsigned int lightsByteOffset = args[5]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *lights = (unsigned char *)((char *)lightsBuffer->GetContents().Data() + lightsByteOffset);

  Local<ArrayBuffer> skyLightmapsBuffer = Local<ArrayBuffer>::Cast(args[6]->ToObject()->Get(bufferString));
  unsigned int skyLightmapsByteOffset = args[6]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *skyLightmaps = (unsigned char *)((char *)skyLightmapsBuffer->GetContents().Data() + skyLightmapsByteOffset);

  Local<ArrayBuffer> torchLightmapsBuffer = Local<ArrayBuffer>::Cast(args[7]->ToObject()->Get(bufferString));
  unsigned int torchLightmapsByteOffset = args[7]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *torchLightmaps = (unsigned char *)((char *)torchLightmapsBuffer->GetContents().Data() + torchLightmapsByteOffset);

  lightmap(ox, oz, positions, numPositions, staticHeightfield, lights, skyLightmaps, torchLightmaps);
}

void Blockfield(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  if (args.Length() < 2) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongNumberOfArguments.Get(isolate)));
    return;
  }
  if (
      !args[0]->IsUint32Array() ||
      !args[1]->IsUint8Array()
  ) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongArguments.Get(isolate)));
    return;
  }

  Local<String> bufferString = V8_STRINGS::buffer.Get(isolate);
  Local<String> byteOffsetString = V8_STRINGS::byteOffset.Get(isolate);

  Local<ArrayBuffer> blocksBuffer = Local<ArrayBuffer>::Cast(args[0]->ToObject()->Get(bufferString));
  unsigned int blocksByteOffset = args[0]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned int *blocks = (unsigned int *)((char *)blocksBuffer->GetContents().Data() + blocksByteOffset);

  Local<ArrayBuffer> blockfieldBuffer = Local<ArrayBuffer>::Cast(args[1]->ToObject()->Get(bufferString));
  unsigned int blockfieldByteOffset = args[1]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *blockfield = (unsigned char *)((char *)blockfieldBuffer->GetContents().Data() + blockfieldByteOffset);

  genBlockfield(blocks, blockfield);
}

void InitAll(Local<Object> exports, Local<Object> module) {
  Isolate *isolate = Isolate::GetCurrent();

  NoiseObject::Init(isolate);
  CachedNoiseObject::Init(isolate);
  NoiserObject::Init(isolate);
  initUtil();

  Local<Object> result = Object::New(isolate);
  NODE_SET_METHOD(result, "fastNoise", CreateNoise);
  NODE_SET_METHOD(result, "cachedNoise", CreateCachedNoise);
  NODE_SET_METHOD(result, "noiser", CreateNoiser);
  // NODE_SET_METHOD(result, "marchingCubes", MarchCubes);
  // NODE_SET_METHOD(result, "compose", Compose);
  // NODE_SET_METHOD(result, "tesselate", Tssl);
  NODE_SET_METHOD(result, "objectize", Objectize);
  NODE_SET_METHOD(result, "flood", Flod);
  NODE_SET_METHOD(result, "genHeightfield", GenHeightfield);
  NODE_SET_METHOD(result, "light", Light);
  NODE_SET_METHOD(result, "lightmap", Lightmap);
  NODE_SET_METHOD(result, "blockfield", Blockfield);

  module->Set(V8_STRINGS::exports.Get(isolate), result);
}

NODE_MODULE(addon, InitAll)
