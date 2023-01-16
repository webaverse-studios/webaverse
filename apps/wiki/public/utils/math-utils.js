export const align = (v, N) => {
  const r = v % N;
  return r === 0 ? v : v - r + N;
};
export const align4 = v => align(v, 4);

export const getClosestPowerOf2 = size => Math.ceil(Math.log2(size));