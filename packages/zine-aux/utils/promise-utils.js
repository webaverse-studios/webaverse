export function makePromise() {
  let resolve, reject;
  const p = new Promise((a, r) => {
    resolve = a;
    reject = r;
  });
  p.resolve = resolve;
  p.reject = reject;
  return p;
}