#include "v8-strings.h"
#include <node.h>

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

namespace V8_STRINGS {
  Persistent<String> exports(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "exports"));

  Persistent<String> buffer(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "buffer"));
  Persistent<String> byteOffset(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "byteOffset"));

  Persistent<String> positions(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "positions"));
  Persistent<String> uvs(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "uvs"));
  Persistent<String> indices(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "indices"));
  Persistent<String> ssaos(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "ssaos"));
  Persistent<String> frames(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "frames"));
  Persistent<String> objectIndices(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "objectIndices"));
  Persistent<String> objects(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "objects"));
  Persistent<String> index(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "index"));

  Persistent<String> objectsSrc(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "objectsSrc"));
  Persistent<String> vegetationsSrc(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "vegetationsSrc"));
  Persistent<String> geometries(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "geometries"));
  Persistent<String> geometryIndex(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "geometryIndex"));
  Persistent<String> blocks(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "blocks"));
  Persistent<String> blockTypes(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "blockTypes"));
  Persistent<String> dims(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "dims"));
  Persistent<String> transparentVoxels(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "transparentVoxels"));
  Persistent<String> translucentVoxels(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "translucentVoxels"));
  Persistent<String> faceUvs(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "faceUvs"));
  Persistent<String> shift(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "shift"));
  Persistent<String> seed(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "seed"));
  Persistent<String> frequency(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "frequency"));
  Persistent<String> octaves(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "octaves"));

  Persistent<String> landStart(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "landStart"));
  Persistent<String> landCount(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "landCount"));
  Persistent<String> waterStart(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "waterStart"));
  Persistent<String> waterCount(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "waterCount"));
  Persistent<String> lavaStart(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "lavaStart"));
  Persistent<String> lavaCount(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "lavaCount"));

  Persistent<String> NoiseObject(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "NoiseObject"));
  Persistent<String> CachedNoiseObject(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "CachedNoiseObject"));
  Persistent<String> Noiser(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "Noiser"));

  Persistent<String> wrongNumberOfArguments(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "Wrong number of arguments"));
  Persistent<String> wrongArguments(Isolate::GetCurrent(), String::NewFromUtf8(Isolate::GetCurrent(), "Wrong arguments"));
};
