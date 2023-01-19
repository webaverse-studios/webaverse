#ifndef CACHED_NOISE_OBJECT_H
#define CACHED_NOISE_OBJECT_H

#include "cachedNoise.h"
// #include "MurmurHash3.h"
#include "hash.h"
#include <node.h>
#include <node_object_wrap.h>
#include <random>
#include <unordered_map>
#include <vector>

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

class CachedNoiseObject : public node::ObjectWrap {
  public:
    static Persistent<Function> constructor;
    static void Init(Isolate* isolate);
    static void NewInstance(const FunctionCallbackInfo<Value>& args);

    CachedNoise cachedNoise;
    std::unordered_map<std::pair<int, int>, std::vector<double>> cache;
    explicit CachedNoiseObject(int s, double frequency, int octaves);

    static void New(const FunctionCallbackInfo<Value>& args);
    static void In2D(const FunctionCallbackInfo<Value>& args);
    double in2D(int x, int z);
};

#endif
