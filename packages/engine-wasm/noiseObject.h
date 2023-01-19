#ifndef NOISE_OBJECT_H
#define NOISE_OBJECT_H

#include <node.h>
#include <node_object_wrap.h>
#include "noise.h"

class NoiseObject : public node::ObjectWrap {
 public:
  static v8::Persistent<v8::Function> constructor;
  static void Init(v8::Isolate* isolate);
  static void NewInstance(const v8::FunctionCallbackInfo<v8::Value>& args);

  Noise noise;
  explicit NoiseObject(int s = 0, double frequency = 0.01, int octaves = 1);
  ~NoiseObject();

  double in2D(double x, double y);
  double in3D(double x, double y, double z);

  static void New(const v8::FunctionCallbackInfo<v8::Value>& args);
  static void In2D(const v8::FunctionCallbackInfo<v8::Value>& args);
  static void In3D(const v8::FunctionCallbackInfo<v8::Value>& args);
};

#endif
