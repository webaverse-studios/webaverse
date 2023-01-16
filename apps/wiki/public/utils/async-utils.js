export const makePromise = () => {
  let accept, reject;
  const promise = new Promise((a, r) => {
    accept = a;
    reject = r;
  });
  promise.accept = accept;
  promise.reject = reject;
  return promise;
};