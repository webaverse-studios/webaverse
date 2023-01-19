#ifndef NOISER_OBJECT_H
#define NOISER_OBJECT_H

#include "noiseObject.h"
#include "cachedNoiseObject.h"
#include "noiser.h"
#include "hash.h"
#include <node.h>
#include <random>
#include <unordered_map>

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
using v8::Object;
using v8::Array;

class NoiserObject : public Noiser, public node::ObjectWrap {
  public:
    static Persistent<Function> constructor;
    static void Init(Isolate* isolate);
    static void NewInstance(const FunctionCallbackInfo<Value>& args);

    explicit NoiserObject(int seed);

    static void New(const FunctionCallbackInfo<Value>& args);
    static void GetBiome(const FunctionCallbackInfo<Value>& args);
    static void GetBiomeHeight(const FunctionCallbackInfo<Value>& args);
    static void GetElevation(const FunctionCallbackInfo<Value>& args);
    static void GetTemperature(const FunctionCallbackInfo<Value>& args);

    static void Apply(const FunctionCallbackInfo<Value>& args);
    static void Fill(const FunctionCallbackInfo<Value>& args);
};

#endif
