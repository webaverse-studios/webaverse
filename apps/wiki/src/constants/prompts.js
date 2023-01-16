export const prompts = {
  // map: `2D overhead view fantasy battle map scene, mysterious lush sakura forest, anime drawing, digital art`;
  map: `2D overhead view fantasy battle map scene, mysterious dinosaur robot factory, anime video game drawing, trending, winner, digital art`,
  // world: `anime screenshot, mysterious forest path with japanese dojo doorway, neon arrows, jungle labyrinth, metal ramps, lush vegetation, ancient technology, mystery creature, glowing magic, ghibli style, digital art`,
  // world: `anime screenshot, empty desert dunes with ancient technology buried sparsely, neon arrows, cactus, rusty metal sci fi building, ghibli style, digital art`,
  // world: `bird's eye view, tropical jungle with sci fi metal gate, dinosaur, ghibli style, digital art`,
  world: `large jungle path, sci fi industrial metal gate and ramp, dinosaur, ghibli style, digital art`,
  // world: `standing on a skyscraper at the solarpunk city, sakura trees, lush vegetation, ancient technology, ghibli style, digital art`,
  character: `cute young anime girl wearing a hoodie, full body, white background, digital art`,
  // const prompt = `magical alien grass blades on a white background, studio ghibli anime style, digital art`;
  // const prompt = `ancient magical cloudy potion antigravity on a white background, studio ghibli anime style, digital art`;
  // const prompt = `high tech energy sword with hexagon pattern and mysterious glyphs on it, white background, video game item concept art render, trending on ArtStation, digital art`;
  // const prompt = `juicy magical alien fruit, anime style, white background, digital art`;`
  // const prompt = `huge square sword, anime style, rendered in unreal engine, white background, digital art`;
  // const prompt = `cute little anime ghost pet with tiny legs on a white background, studio ghibli, digital art`;
  // const prompt = `strange alien plant with flowers on a white background, studio ghibli anime style, digital art`;
  // const prompt = `ancient high tech medkit on a white background, studio ghibli anime style, digital art`;
  // const prompt = `ancient magical high tech book with digital symbols on it on a white background, studio ghibli anime style, digital art`;
  // const prompt = `ancient magical cloudy potion of terrible death soul on a white background, studio ghibli anime style, digital art`;
  // const prompt = `fun magical anime item, lush vegetation, ancient technology, white background, digital art`;
  item: `small fun magical game console anime item with aura, white background, digital art`,
};

export const labelClasses = ['person', 'floor', 'path', 'sidewalk', 'ground', 'road', 'runway', 'land', 'dirt', 'ceiling', 'field', 'river', 'water', 'sea', 'sky', 'mountain', 'leaves', 'wall', 'house', 'machine', 'rock', 'flower', 'door', 'gate', 'car', 'boat', 'animal', 'mat', 'grass', 'plant', 'metal', 'light', 'tree', 'wood', 'food', 'smoke', 'forest', 'shirt', 'pant', 'structure', 'bird', 'tunnel', 'cave', 'skyscraper', 'sign', 'stairs', 'box', 'sand', 'fruit', 'vegetable', 'barrier'];
export const groundBoost = 50;
export const boostSpec = {
  person: groundBoost,
  building: groundBoost,
  floor: groundBoost,
  sidewalk: groundBoost,
  path: groundBoost,
  ground: groundBoost,
  road: groundBoost,
  runway: groundBoost,
  land: groundBoost,
  dirt: groundBoost,
  field: groundBoost,
  // sky: groundBoost,
  // car: 0.5,
  // boat: 0.5,
};
export const boosts = labelClasses.map(c => boostSpec[c] ?? 1);