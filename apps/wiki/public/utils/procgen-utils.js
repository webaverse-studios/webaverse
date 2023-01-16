export const getScaleLod = scale => {
  let scaleLod = Math.ceil(Math.log2(scale));
  scaleLod = Math.max(scaleLod, 0);
  scaleLod++;
  return scaleLod;
};
export const getScaleInt = scale => {
  const scaleLod = getScaleLod(scale);
  // console.log('scale lod', scale, scaleLod);
  // const scaleInt = Math.pow(2, scaleLod);
  const scaleInt = 1 << (scaleLod - 1);
  return scaleInt;
};

export const getBoundingSize = boundingType => {
  switch (boundingType) {
    case 'sphere': return 4;
    case 'box': return 6;
    default: return 0;
  }
};