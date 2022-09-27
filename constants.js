export const baseUnit = 4;
export const previewExt = 'jpg';
export const maxGrabDistance = 1.5;
export const defaultRendererUrl = 'https://render.exokit.org/'

export const transparentPngUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const rarityColors = {
  common: [0xDCDCDC, 0x373737],
  uncommon: [0xff8400, 0x875806],
  rare: [0x00CE21, 0x00560E],
  epic: [0x00B3DB, 0x003743],
  legendary: [0xAD00EA, 0x32002D],
};

const PEEK_FACE_INDICES = [];
(function initPeekFaceIndices(){
   for (let i = 0; i < 8 * 8; i++)
    {
      PEEK_FACE_INDICES[i] = 0xFF;
    }

    let peekIndex = 0;
    for (let startFace = 0; startFace < 6; startFace++)
    {
      for (let endFace = 0; endFace < 6; endFace++)
      {
        if (startFace != endFace)
        {
          const otherEntry = PEEK_FACE_INDICES[endFace << 3 | startFace];
          PEEK_FACE_INDICES[startFace << 3 | endFace] = otherEntry != 0xFF ? otherEntry : peekIndex++;
        }
      }
    }
    // console.log("INVOKED");
})();

export {PEEK_FACE_INDICES};

const chainName = (() => {
  if (typeof globalThis !== 'undefined' && /^test\./.test(location.hostname)) {
    return 'testnet';
  } else if (typeof globalThis !== 'undefined' && /^polygon\./.test(location.hostname)) {
    return 'polygon';
  } else {
    return 'mainnet';
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

const origin = globalThis.location.protocol + '//' + globalThis.location.hostname;

let _inappPreviewHost = '';

switch ( origin ) {
    case 'https://local.webaverse.com': {
        _inappPreviewHost = `https://local.webaverse.online:${globalThis.location.port}`;
        break;
    }
    case 'https://dev.webaverse.com': {
        _inappPreviewHost = 'https://dev.webaverse.online';
        break;
    }
    case 'https://staging.webaverse.com': {
        _inappPreviewHost = 'https://staging.webaverse.online';
        break;
    }
    default: {
        _inappPreviewHost = 'https://app.webaverse.online';
    }
}

export const inappPreviewHost = _inappPreviewHost;

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
export const worldUrl = 'worlds.webaverse.com';
export const discordClientId = '684141574808272937';
export const walletHost = 'https://wallet.webaverse.com';

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

export const defaultMaxId = 8192;

export const defaultMusicVolume = 0.35;

export const voicePacksUrl = `https://webaverse.github.io/voicepacks/all_packs.json`;

export const voiceEndpointBaseUrl = `https://voice-cw.webaverse.com/tts`;
export const voiceEndpointsUrl = `https://raw.githubusercontent.com/webaverse/tiktalknet/main/model_lists/all_models.json`;

export const imageAIEndpointUrl = `https://stable-diffusion.webaverse.com`;
export const imageCaptionAIEndpointUrl = `https://clip.webaverse.com`;

export const defaultImageAICanvasSize = 512;

export const audioAIEndpointUrl = `https://diffsound.webaverse.com`;

export const W3S_API_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDYyODg4RUNjQzFkQTYxZDUzZjEyYTI4MDQwRjllQzViNGJFRTMzNmMiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjMzMTk1MjI2OTAsIm5hbWUiOiJ3ZWJhdmVyc2UifQ.WlpTfnrw0B6Z1Cs28Cawwx5PU04op6FLvHSxdh5j-hE`;

export const chatTextSpeed = 15;
export const shakeAnimationSpeed = 30;

export const hotbarSize = 60;
export const infoboxSize = 100;

export const startTextureAtlasSize = 512;
export const maxTextureAtlasSize = 4096;

export const numLoadoutSlots = 8;

export const defaultDioramaSize = 512;
export const defaultChunkSize = 16;
export const defaultWorldSeed = 100;

export const minAvatarQuality = 1;
export const maxAvatarQuality = 4;
export const defaultAvatarQuality = 3;

// ------ todo: Use infos from wasm.

export const AnimationGroupIndex = {
  Single: 0,
  //
  Walk: 1,
  Run: 2,
  Crouch: 3,
  //
  Activate: 4,
  Aim: 5,
  Dance: 6,
  Emote: 7,
  Hold: 8,
  Hurt: 9,
  Land: 10,
  NarutoRun: 11,
  PickUp: 12,
  Sit: 13,
  Swim: 14,
  Use: 15,
};

// ---

export const SingleAnimationIndex = {
  idle: 0,
  crouchIdle: 1,
  jump: 2,
  doubleJump: 3,
  fallLoop: 4,
  float: 5,
};

// ---

export const WalkAnimationIndex = {
  forward: 0,
  backward: 1,
  left: 2,
  leftMirror: 3,
  right: 4,
  rightMirror: 5,
};

export const RunAnimationIndex = {
  forward: 0,
  backward: 1,
  left: 2,
  leftMirror: 3,
  right: 4,
  rightMirror: 5,
};

export const CrouchAnimationIndex = {
  forward: 0,
  backward: 1,
  left: 2,
  leftMirror: 3,
  right: 4,
  rightMirror: 5,
};

// ---

export const ActivateAnimationIndex = {
  grab_forward: 0,
  grab_down: 1,
  grab_up: 2,
  grab_left: 3,
  grab_right: 4,
  pick_up: 5,
};

export const AimAnimationIndex = {
  swordSideIdle: 0,
  swordSideSlash: 1,
  swordSideSlashStep: 2,
  swordTopDownSlash: 3,
  swordTopDownSlashStep: 4,
};

export const DanceAnimationIndex = {
  dansu: 0,
  powerup: 1,
};

export const EmoteAnimationIndex = {
  alert: 0,
  alertSoft: 1,
  angry: 2,
  angrySoft: 3,
  embarrassed: 4,
  embarrassedSoft: 5,
  headNod: 6,
  headNodSoft: 7,
  headShake: 8,
  headShakeSoft: 9,
  sad: 10,
  sadSoft: 11,
  surprise: 12,
  surpriseSoft: 13,
  victory: 14,
  victorySoft: 15,
};

export const HoldAnimationIndex = {
  pick_up_idle: 0,
};

export const HurtAnimationIndex = {
  pain_back: 0,
  pain_arch: 1,
};

export const LandAnimationIndex = {
  landing: 0,
  landing2: 1,
};

export const NarutoRunAnimationIndex = {
  narutoRun: 0,
};

export const PickUpAnimationIndex = {
  pickUp: 0,
  pickUpIdle: 1,
  pickUpThrow: 2,
  putDown: 3,
  pickUpZelda: 4,
  pickUpIdleZelda: 5,
  putDownZelda: 6,
};

export const SitAnimationIndex = {
  chair: 0,
  saddle: 1,
  stand: 2,
};

export const SwimAnimationIndex = {
  breaststroke: 0,
  freestyle: 1,
};

export const UseAnimationIndex = {
  combo: 0,
  slash: 1,
  rifle: 2,
  pistol: 3,
  magic: 4,
  eat: 5,
  drink: 6,
  throw: 7, // note: Have to use uppercase. Lower case "throw" will cause key word conflict error "error: expected identifier".
  pickUpThrow: 8,
  bowDraw: 9,
  bowIdle: 10,
  bowLoose: 11,
  pickaxe: 12,
  swordSideIdle: 13,
  swordSideSlash: 14,
  swordSideSlashStep: 15,
  swordTopDownSlash: 16,
  swordTopDownSlashStep: 17,
};
