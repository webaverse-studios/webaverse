#ifndef V8_STRINGS_H
#define V8_STRINGS_H

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
  extern Persistent<String> exports;

  extern Persistent<String> buffer;
  extern Persistent<String> byteOffset;

  extern Persistent<String> positions;
  extern Persistent<String> uvs;
  extern Persistent<String> indices;
  extern Persistent<String> ssaos;
  extern Persistent<String> frames;
  extern Persistent<String> objectIndices;
  extern Persistent<String> objects;
  extern Persistent<String> index;

  extern Persistent<String> objectsSrc;
  extern Persistent<String> vegetationsSrc;
  extern Persistent<String> geometries;
  extern Persistent<String> geometryIndex;
  extern Persistent<String> blocks;
  extern Persistent<String> blockTypes;
  extern Persistent<String> dims;
  extern Persistent<String> transparentVoxels;
  extern Persistent<String> translucentVoxels;
  extern Persistent<String> faceUvs;
  extern Persistent<String> shift;

  extern Persistent<String> seed;
  extern Persistent<String> frequency;
  extern Persistent<String> octaves;

  extern Persistent<String> landStart;
  extern Persistent<String> landCount;
  extern Persistent<String> waterStart;
  extern Persistent<String> waterCount;
  extern Persistent<String> lavaStart;
  extern Persistent<String> lavaCount;

  extern Persistent<String> NoiseObject;
  extern Persistent<String> CachedNoiseObject;
  extern Persistent<String> Noiser;

  extern Persistent<String> wrongNumberOfArguments;
  extern Persistent<String> wrongArguments;
};

#endif
