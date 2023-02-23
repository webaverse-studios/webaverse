// export const idKey = 'id';
export const mainImageKey = 'image';
export const promptKey = 'prompt';
export const isRootKey = 'isRoot';
export const compressedKey = 'compressed';
export const layer0Specs = [
  // idKey,
  mainImageKey,
  promptKey,
  isRootKey,
  compressedKey,
];

//

export const layer1Specs = [
  'lore',
  'resolution',
  'position',
  'quaternion',
  'scale',
  'cameraJson',
  'boundingBox',
  'floorBoundingBox',
  'outlineJson',
  'depthFieldHeaders',
  'depthField',
  'sphericalHarmonics',
  'planesJson',
  'portalJson',
  'segmentLabels',
  'segmentLabelIndices',
  'planeLabels',
  'planeLabelIndices',
  'portalLabels',
  // 'segmentSpecs',
  // 'planeSpecs',
  // 'portalSpecs',
  'firstFloorPlaneIndex',
  'floorPlaneJson',
  'floorResolution',
  'floorNetDepths',
  'floorNetCameraJson',
  'floorPlaneLocation',
  'cameraEntranceLocation',
  'entranceExitLocations',
  'portalLocations',
  'candidateLocations',
  'predictedHeight',
  'edgeDepths',
  'wallPlanes',
  'paths',
];
export const layer0CompressionSpecs = [
  {
    layer: 0,
    key: mainImageKey,
    type: 'image',
  },
];
export const layer1CompressionSpecs = [
  {
    layer: 1,
    key: 'depthField',
    type: 'depth',
  },
  {
    layer: 1,
    key: 'floorNetDepths',
    type: 'depth',
  },
  {
    layer: 1,
    key: 'segmentLabelIndices',
    type: 'byteAttribute',
  },
  {
    layer: 1,
    key: 'planeLabelIndices',
    type: 'byteAttribute',
  },
];

//

export const layer2Specs = [
  'maskImg',
  'editedImg',
  'depthFieldHeaders',
  'depthField',
  'depthFloatImageData',
  'distanceFloatImageData',
  'distanceNearestPositions',
  'newDepthFloatImageData',
  'reconstructedDepthFloats',
  'planesJson',
  'planesMask',
  'portalJson',
  'segmentLabels',
  'segmentLabelIndices',
  'planeLabels',
  'planeLabelIndices',
  'portalLabels',
  // 'segmentSpecs',
  // 'planeSpecs',
  // 'portalSpecs',
  'floorResolution',
  'floorNetDepths',
  'floorNetCameraJson',
  'segmentMask',
  'editCameraJson',
];

//

export const layerSpecs = [
  layer0Specs,
  layer1Specs,
  layer2Specs,
];