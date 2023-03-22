export const baseUnit = 4;
export const previewExt = 'jpg';
export const maxGrabDistance = 1.5;
export const heightfieldScale = 0.1;

export const transparentPngUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const rarityColors = {
  common: [0xDCDCDC, 0x373737],
  uncommon: [0xff8400, 0x875806],
  rare: [0x00CE21, 0x00560E],
  epic: [0x00B3DB, 0x003743],
  legendary: [0xAD00EA, 0x32002D],
};

const chainName = (() => {
  if (typeof location !== 'undefined') {
    if (/^test\./.test(location.hostname)) {
      return 'testnet';
    } else if (/^polygon\./.test(location.hostname)) {
      return 'polygon';
    } else {
      return 'mainnet';
    }
  } else {
    return 'polygon';
  }
})();
const otherChainName = /sidechain/.test(chainName) ?
  chainName.replace(/sidechain/, '')
:
  chainName + 'sidechain';
export {
  chainName,
  otherChainName,
};
export const polygonVigilKey = `0937c004ab133135c86586b55ca212a6c9ecd224`;

//

const origin = (typeof location !== 'undefined') ?
  location.protocol + '//' + globalThis.location.hostname
:
  'https://local.webaverse.com';

//

export const storageHost = 'https://ipfs.webaverse.com';
export const previewHost = 'https://preview.exokit.org';
export const worldsHost = 'https://worlds.exokit.org';
export const accountsHost = `https://${chainName}sidechain-accounts.webaverse.com`;
export const contractsHost = 'https://contracts.webaverse.com';
export const localstorageHost = 'https://localstorage.webaverse.com';
export const loginEndpoint = 'https://login.webaverse.com';
export const tokensHost = `https://${chainName}all-tokens.webaverse.com`;
export const landHost = `https://${chainName}sidechain-land.webaverse.com`;
export const codeAiHost = `https://ai.webaverse.com/code`;
export const web3MainnetSidechainEndpoint = 'https://mainnetsidechain.exokit.org';
export const web3TestnetSidechainEndpoint = 'https://testnetsidechain.exokit.org';
// export const worldUrl = 'worlds.webaverse.com';
export const discordClientId = '684141574808272937';

export const worldMapName = 'world';
export const actionsMapName = 'actions';
export const playersMapName = 'players';
export const appsMapName = 'apps';
export const partyMapName = 'party';

// export const ceramicNodeUrl = `https://ceramic-clay.3boxlabs.com`;
export const metaverseProfileDefinition = `kjzl6cwe1jw145wm7u2sy1wpa33hglvmuy6th9lys7x4iadaizn4zqgpp3tmu34`;

export const audioTimeoutTime = 10 * 1000;

export const idleSpeed = 0;
export const walkSpeed = 2.5;
export const runSpeed = walkSpeed * 3;
export const narutoRunSpeed = walkSpeed * 20;
export const crouchSpeed = walkSpeed * 0.7;
export const flySpeed = walkSpeed * 5;
export const gliderSpeed = walkSpeed * 2;

export const narutoRunTimeFactor = 2;

export const crouchMaxTime = 200;
export const activateMaxTime = 750;
export const useMaxTime = 750;
export const aimMaxTime = 1000;
export const throwReleaseTime = 220;
export const throwAnimationDuration = 1.4166666269302368;
export const minFov = 60;
export const maxFov = 120;
export const midFov = 90;
export const initialPosY = 1.5;

// Now friction only affect damping, don't affect full speed moving.
// export const groundFriction = 0.28;
export const groundFriction = 25;
export const airFriction = groundFriction;
// export const flyFriction = 0.5;
// export const swimFriction = 0.2;
export const flyFriction = groundFriction;
export const swimFriction = groundFriction;

export const aimTransitionMaxTime = 150;

export const jumpHeight = 3;
export const flatGroundJumpAirTime = 666;

export const startSkydiveTimeS = 2;

export const avatarInterpolationFrameRate = 60;
export const avatarInterpolationTimeDelay = 1000/(avatarInterpolationFrameRate * 0.5);
export const avatarInterpolationNumFrames = 15; // For chrome "Network throttling: Slow 3G", old value `4` is too less to hit snapshots cache. `10` can hit most. `15` can hit almot all and safe for worse real network connections.

export const eatFrameIndices = [500, 800, 1100];
export const drinkFrameIndices = [400, 700, 1000];
export const useFrameIndices = {
  swordSideSlash: [0],
  swordSideSlashStep: [0],
  swordTopDownSlash: [0],
  swordTopDownSlashStep: [0],
};

export const defaultMaxId = 8192;

export const defaultMusicVolume = 0.35;

export const defaultImageAICanvasSize = 512;
export const chatTextSpeed = 15;
export const shakeAnimationSpeed = 30;

export const hotbarSize = 60;
export const infoboxSize = 100;

export const startTextureAtlasSize = 512;
export const maxTextureAtlasSize = 4096;

export const numLoadoutSlots = 6;

export const defaultDioramaSize = 512;
export const defaultChunkSize = 16;
export const defaultWorldSeed = 100;

export const minAvatarQuality = 1;
export const maxAvatarQuality = 4;
export const defaultAvatarQuality = 3;
export const characterSelectAvatarQuality = 4;

export const minCanvasSize = 512;
export const offscreenCanvasSize = 2048;

export const realmSize = 256;

// dev mode
const IS_DEV_MODE_ENABLED = false;

export const IS_NARUTO_RUN_ENABLED = IS_DEV_MODE_ENABLED;
export const IS_FLYING_ENABLED = IS_DEV_MODE_ENABLED;
export const MAX_THIRD_PERSON_CAMERA_DISTANCE = IS_DEV_MODE_ENABLED ? Infinity : 20;

// note: For WASM API.
export const GET = 0;
export const GET_NORMALIZED = 1;
export const GET_INVERSE = 2;
//
