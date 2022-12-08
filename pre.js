// window.global = window.globalThis;
// console.log('eliding global set');
/* Object.defineProperty(window, 'global', {
  get() {
    debugger;
  },
  set(o) {
    debugger;
  },
}); */

globalThis.logNum = function(n) {
  const nStr = n.toFixed(2);
  return (n < 0 ? '' : '+') + nStr;
}

globalThis.logVector3 = function(v) {
  return globalThis.logNum(v.x) + ' ' + globalThis.logNum(v.y) + ' ' + globalThis.logNum(v.z);
}

globalThis.logVector4 = function(v) {
  return globalThis.logNum(v.x) + ' ' + globalThis.logNum(v.y) + ' ' + globalThis.logNum(v.z) + ' ' + globalThis.logNum(v.w);
}
