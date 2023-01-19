#include "noiserObject.h"
#include "util.h"
#include "v8-strings.h"
#include "biomes.h"
#include "cachedNoiseObject.h"
#include "noiseObject.h"
#include "march.h"
#include "heightfield.h"
#include "flod.h"
#include <node.h>
#include <cmath>
#include <random>
#include <algorithm>
#include <unordered_map>
#include <vector>
#include <functional>
// #include <iostream>

using v8::Context;
using v8::Function;
using v8::FunctionCallbackInfo;
using v8::FunctionTemplate;
using v8::Isolate;
using v8::Local;
using v8::Number;
using v8::Object;
using v8::Persistent;
using v8::String;
using v8::Value;
using v8::Exception;
using v8::Array;
using v8::ArrayBuffer;

Persistent<Function> NoiserObject::constructor;
void NoiserObject::Init(Isolate* isolate) {
  // Prepare constructor template
  Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, New);
  tpl->SetClassName(V8_STRINGS::Noiser.Get(isolate));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  // Prototype
  NODE_SET_PROTOTYPE_METHOD(tpl, "getBiomeHeight", GetBiomeHeight);
  NODE_SET_PROTOTYPE_METHOD(tpl, "getBiome", GetBiome);
  NODE_SET_PROTOTYPE_METHOD(tpl, "getElevation", GetElevation);
  NODE_SET_PROTOTYPE_METHOD(tpl, "getTemperature", GetTemperature);
  NODE_SET_PROTOTYPE_METHOD(tpl, "apply", Apply);
  NODE_SET_PROTOTYPE_METHOD(tpl, "fill", Fill);

  constructor.Reset(isolate, tpl->GetFunction());
}
void NoiserObject::NewInstance(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  const unsigned argc = 1;
  Local<Value> argv[argc] = {args[0]};
  Local<Function> cons = Local<Function>::New(isolate, constructor);
  Local<Context> context = isolate->GetCurrentContext();
  Local<Object> instance = cons->NewInstance(context, argc, argv).ToLocalChecked();

  args.GetReturnValue().Set(instance);
}

void NoiserObject::New(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  if (args.IsConstructCall()) {
    Local<String> seedString = V8_STRINGS::seed.Get(isolate);

    Local<Object> opts = args[0]->ToObject();

    int seed = opts->Get(seedString)->Int32Value();

    NoiserObject* obj = new NoiserObject(seed);
    obj->Wrap(args.This());
    args.GetReturnValue().Set(args.This());
  } else {
    const int argc = 1;
    Local<Value> argv[argc] = {args[0]};
    Local<Function> cons = Local<Function>::New(isolate, constructor);
    Local<Context> context = isolate->GetCurrentContext();
    Local<Object> instance = cons->NewInstance(context, argc, argv).ToLocalChecked();
    args.GetReturnValue().Set(instance);
  }
}

NoiserObject::NoiserObject(int seed) : Noiser(seed) {}

void NoiserObject::GetBiome(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  if (args.Length() < 2) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongNumberOfArguments.Get(isolate)));
    return;
  }
  if (!args[0]->IsNumber() || !args[1]->IsNumber()) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongArguments.Get(isolate)));
    return;
  }

  NoiserObject* obj = ObjectWrap::Unwrap<NoiserObject>(args.Holder());
  args.GetReturnValue().Set(Number::New(isolate, obj->getBiome(args[0]->Int32Value(), args[1]->Int32Value())));
}

void NoiserObject::GetBiomeHeight(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  if (args.Length() < 3) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongNumberOfArguments.Get(isolate)));
    return;
  }

  // Check the argument types
  if (!args[0]->IsNumber() || !args[1]->IsNumber() || !args[2]->IsNumber()) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongArguments.Get(isolate)));
    return;
  }

  NoiserObject* obj = ObjectWrap::Unwrap<NoiserObject>(args.Holder());
  args.GetReturnValue().Set(Number::New(isolate, obj->getBiomeHeight((unsigned char)args[0]->Uint32Value(), args[1]->Int32Value(), args[2]->Int32Value())));
}

void NoiserObject::GetElevation(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  if (args.Length() < 2) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongNumberOfArguments.Get(isolate)));
    return;
  }
  if (!args[0]->IsNumber() || !args[1]->IsNumber()) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongArguments.Get(isolate)));
    return;
  }

  NoiserObject* obj = ObjectWrap::Unwrap<NoiserObject>(args.Holder());
  args.GetReturnValue().Set(Number::New(isolate, obj->getElevation(args[0]->Int32Value(), args[1]->Int32Value())));
}

void NoiserObject::GetTemperature(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  if (args.Length() < 2) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongNumberOfArguments.Get(isolate)));
    return;
  }
  if (!args[0]->IsNumber() || !args[1]->IsNumber()) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongArguments.Get(isolate)));
    return;
  }

  NoiserObject* obj = ObjectWrap::Unwrap<NoiserObject>(args.Holder());
  args.GetReturnValue().Set(Number::New(isolate, obj->getTemperature(args[0]->NumberValue(), args[1]->NumberValue())));
}

void NoiserObject::Apply(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  if (args.Length() < 15) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongNumberOfArguments.Get(isolate)));
    return;
  }

  // Check the argument types
  if (
    !args[0]->IsNumber() ||
    !args[1]->IsNumber() ||
    !args[2]->IsUint8Array() ||
    !args[3]->IsUint8Array() ||
    !args[4]->IsUint8Array() ||
    !args[5]->IsBoolean() ||
    !args[6]->IsFloat32Array() ||
    !args[7]->IsBoolean() ||
    !args[8]->IsFloat32Array() ||
    !args[9]->IsBoolean() ||
    !args[10]->IsFloat32Array() ||
    !args[11]->IsFloat32Array() ||
    !args[12]->IsBoolean() ||
    !args[13]->IsFloat32Array() ||
    !args[14]->IsNumber()
  ) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongArguments.Get(isolate)));
    return;
  }

  Local<String> bufferString = V8_STRINGS::buffer.Get(isolate);
  Local<String> byteOffsetString = V8_STRINGS::byteOffset.Get(isolate);

  int ox = args[0]->Int32Value();
  int oz = args[1]->Int32Value();

  Local<ArrayBuffer> biomesBuffer = Local<ArrayBuffer>::Cast(args[2]->ToObject()->Get(bufferString));
  unsigned int biomesByteOffset = args[2]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *biomes = (unsigned char *)((char *)biomesBuffer->GetContents().Data() + biomesByteOffset);

  Local<ArrayBuffer> temperatureBuffer = Local<ArrayBuffer>::Cast(args[3]->ToObject()->Get(bufferString));
  unsigned int temperatureByteOffset = args[3]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *temperature = (unsigned char *)((char *)temperatureBuffer->GetContents().Data() + temperatureByteOffset);

  Local<ArrayBuffer> humidityBuffer = Local<ArrayBuffer>::Cast(args[4]->ToObject()->Get(bufferString));
  unsigned int humidityByteOffset = args[4]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *humidity = (unsigned char *)((char *)humidityBuffer->GetContents().Data() + humidityByteOffset);

  bool fillBiomes = args[5]->BooleanValue();

  Local<ArrayBuffer> elevationsBuffer = Local<ArrayBuffer>::Cast(args[6]->ToObject()->Get(bufferString));
  unsigned int elevationsByteOffset = args[6]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *elevations = (float *)((char *)elevationsBuffer->GetContents().Data() + elevationsByteOffset);

  bool fillElevations = args[7]->BooleanValue();

  Local<ArrayBuffer> ethersBuffer = Local<ArrayBuffer>::Cast(args[8]->ToObject()->Get(bufferString));
  unsigned int ethersByteOffset = args[8]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *ethers = (float *)((char *)ethersBuffer->GetContents().Data() + ethersByteOffset);

  bool fillEther = args[9]->BooleanValue();

  Local<ArrayBuffer> waterBuffer = Local<ArrayBuffer>::Cast(args[10]->ToObject()->Get(bufferString));
  unsigned int waterByteOffset = args[10]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *water = (float *)((char *)waterBuffer->GetContents().Data() + waterByteOffset);

  Local<ArrayBuffer> lavaBuffer = Local<ArrayBuffer>::Cast(args[11]->ToObject()->Get(bufferString));
  unsigned int lavaByteOffset = args[11]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *lava = (float *)((char *)lavaBuffer->GetContents().Data() + lavaByteOffset);

  bool fillLiquid = args[12]->BooleanValue();

  Local<ArrayBuffer> newEtherBuffer = Local<ArrayBuffer>::Cast(args[13]->ToObject()->Get(bufferString));
  unsigned int newEtherByteOffset = args[13]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *newEther = (float *)((char *)newEtherBuffer->GetContents().Data() + newEtherByteOffset);

  unsigned int numNewEthers = args[14]->Uint32Value();

  NoiserObject* obj = ObjectWrap::Unwrap<NoiserObject>(args.Holder());
  obj->apply(ox, oz, biomes, temperature, humidity, fillBiomes, elevations, fillElevations, ethers, fillEther, water, lava, fillLiquid, newEther, numNewEthers);
}

void NoiserObject::Fill(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  if (args.Length() < 14) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongNumberOfArguments.Get(isolate)));
    return;
  }

  // Check the argument types
  if (
    !args[0]->IsNumber() ||
    !args[1]->IsNumber() ||
    !args[2]->IsUint8Array() ||
    !args[3]->IsFloat32Array() ||
    !args[4]->IsFloat32Array() ||
    !args[5]->IsFloat32Array() ||
    !args[6]->IsFloat32Array() ||
    !args[7]->IsFloat32Array() ||
    !args[8]->IsUint32Array() ||
    !args[9]->IsUint32Array() ||
    !args[10]->IsUint32Array() ||
    !args[11]->IsFloat32Array() ||
    !args[12]->IsFloat32Array() ||
    !args[13]->IsUint8Array()
  ) {
    isolate->ThrowException(Exception::TypeError(V8_STRINGS::wrongArguments.Get(isolate)));
    return;
  }

  Local<String> bufferString = V8_STRINGS::buffer.Get(isolate);
  Local<String> byteOffsetString = V8_STRINGS::byteOffset.Get(isolate);

  int ox = args[0]->Int32Value();
  int oz = args[1]->Int32Value();

  Local<ArrayBuffer> biomesBuffer = Local<ArrayBuffer>::Cast(args[2]->ToObject()->Get(bufferString));
  unsigned int biomesByteOffset = args[2]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *biomes = (unsigned char *)((char *)biomesBuffer->GetContents().Data() + biomesByteOffset);

  Local<ArrayBuffer> elevationsBuffer = Local<ArrayBuffer>::Cast(args[3]->ToObject()->Get(bufferString));
  unsigned int elevationsByteOffset = args[3]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *elevations = (float *)((char *)elevationsBuffer->GetContents().Data() + elevationsByteOffset);

  Local<ArrayBuffer> ethersBuffer = Local<ArrayBuffer>::Cast(args[4]->ToObject()->Get(bufferString));
  unsigned int ethersByteOffset = args[4]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *ethers = (float *)((char *)ethersBuffer->GetContents().Data() + ethersByteOffset);

  Local<ArrayBuffer> waterBuffer = Local<ArrayBuffer>::Cast(args[5]->ToObject()->Get(bufferString));
  unsigned int waterByteOffset = args[5]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *water = (float *)((char *)waterBuffer->GetContents().Data() + waterByteOffset);

  Local<ArrayBuffer> lavaBuffer = Local<ArrayBuffer>::Cast(args[6]->ToObject()->Get(bufferString));
  unsigned int lavaByteOffset = args[6]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *lava = (float *)((char *)lavaBuffer->GetContents().Data() + lavaByteOffset);

  Local<ArrayBuffer> positionsBuffer = Local<ArrayBuffer>::Cast(args[7]->ToObject()->Get(bufferString));
  unsigned int positionsByteOffset = args[7]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *positions = (float *)((char *)positionsBuffer->GetContents().Data() + positionsByteOffset);

  Local<ArrayBuffer> indicesBuffer = Local<ArrayBuffer>::Cast(args[8]->ToObject()->Get(bufferString));
  unsigned int indicesByteOffset = args[8]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned int *indices = (unsigned int *)((char *)indicesBuffer->GetContents().Data() + indicesByteOffset);

  Local<ArrayBuffer> attributeRangeBuffer = Local<ArrayBuffer>::Cast(args[9]->ToObject()->Get(bufferString));
  unsigned int attributeRangeByteOffset = args[9]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned int *attributeRanges = (unsigned int *)((char *)attributeRangeBuffer->GetContents().Data() + attributeRangeByteOffset);

  Local<ArrayBuffer> indexRangeBuffer = Local<ArrayBuffer>::Cast(args[10]->ToObject()->Get(bufferString));
  unsigned int indexRangeByteOffset = args[10]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned int *indexRanges = (unsigned int *)((char *)indexRangeBuffer->GetContents().Data() + indexRangeByteOffset);

  Local<ArrayBuffer> staticHeightfieldBuffer = Local<ArrayBuffer>::Cast(args[11]->ToObject()->Get(bufferString));
  unsigned int staticHeightfieldByteOffset = args[11]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *staticHeightfield = (float *)((char *)staticHeightfieldBuffer->GetContents().Data() + staticHeightfieldByteOffset);

  Local<ArrayBuffer> colorsBuffer = Local<ArrayBuffer>::Cast(args[12]->ToObject()->Get(bufferString));
  unsigned int colorsByteOffset = args[12]->ToObject()->Get(byteOffsetString)->Uint32Value();
  float *colors = (float *)((char *)colorsBuffer->GetContents().Data() + colorsByteOffset);

  Local<ArrayBuffer> peeksBuffer = Local<ArrayBuffer>::Cast(args[13]->ToObject()->Get(bufferString));
  unsigned int peeksByteOffset = args[13]->ToObject()->Get(byteOffsetString)->Uint32Value();
  unsigned char *peeks = (unsigned char *)((char *)peeksBuffer->GetContents().Data() + peeksByteOffset);

  NoiserObject* obj = ObjectWrap::Unwrap<NoiserObject>(args.Holder());
  obj->fill(ox, oz, biomes, elevations, ethers, water, lava, positions, indices, attributeRanges, indexRanges, staticHeightfield, colors, peeks);
}
