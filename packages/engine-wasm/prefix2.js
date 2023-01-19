function makePromise() {
  let accept, reject;
  const p = new Promise((a, r) => {
    accept = a;
    reject = r;
  });
  p.accept = accept;
  p.reject = reject;
  return p;
}
globalThis.wasmModulePromise = makePromise();

globalThis.wasmModule = (moduleName, moduleFn) => {
  if (moduleName === 'vxl') {
    globalThis.Module = moduleFn({
      print(text) { console.log(text); },
      printErr(text) { console.warn(text); },
      locateFile() {
        return 'bin/geometry.wasm';
      },
      onRuntimeInitialized: () => {
        wasmModulePromise.accept();
      },
    });
  } else {
    console.warn('unknown wasm module', moduleName);
  }
};
