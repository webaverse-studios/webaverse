#include "terrain.h"
#include <iostream>
#include <emscripten.h>

extern "C" {

EMSCRIPTEN_KEEPALIVE void getTerrain(
    float *scratchStack
  ) {
  return Terrain::getTerrain(
    scratchStack
  );
}

EMSCRIPTEN_KEEPALIVE void *doMalloc(size_t size) {
  return malloc(size);
}

int main() {
  return 0;
}

} // extern "C"