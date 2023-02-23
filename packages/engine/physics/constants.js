export const heightfieldScale = 0.1; // must fit heightfield in int16

// Now friction only affect damping, don't affect full speed moving.
// export const groundFriction = 0.28;
export const groundFriction = 25;
export const airFriction = groundFriction;
export const flyFriction = groundFriction;
export const swimFriction = groundFriction;

export const aimTransitionMaxTime = 150;

export const jumpHeight = 3;
export const flatGroundJumpAirTime = 666;

export const avatarInterpolationFrameRate = 60;
export const avatarInterpolationTimeDelay = 1000/(avatarInterpolationFrameRate * 0.5);
export const avatarInterpolationNumFrames = 4;

export const eatFrameIndices = [500, 800, 1100];
export const drinkFrameIndices = [400, 700, 1000];
export const useFrameIndices = {
  swordSideSlash: [0],
  swordSideSlashStep: [0],
  swordTopDownSlash: [0],
  swordTopDownSlashStep: [0],
};

// note: For WASM API.
export const GET = 0;
export const GET_NORMALIZED = 1;
export const GET_INVERSE = 2;