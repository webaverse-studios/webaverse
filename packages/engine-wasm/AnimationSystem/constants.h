const float narutoRunTimeFactor = 2;
const float crouchMaxTime = 200;
const float aimMaxTime = 1000;

class BoneIndexes {
public:
  // positions ---
  int HipsPosition;
  // quaternions ---
  int Hips;
  int Spine;
  int Chest;
  int UpperChest;
  int Neck;
  int Head;
  int Left_shoulder;
  int Left_arm;
  int Left_elbow;
  int Left_wrist;
  int Left_middleFinger1;
  int Left_middleFinger2;
  int Left_middleFinger3;
  int Left_thumb0;
  int Left_thumb1;
  int Left_thumb2;
  int Left_indexFinger1;
  int Left_indexFinger2;
  int Left_indexFinger3;
  int Left_ringFinger1;
  int Left_ringFinger2;
  int Left_ringFinger3;
  int Left_littleFinger1;
  int Left_littleFinger2;
  int Left_littleFinger3;
  int Right_shoulder;
  int Right_arm;
  int Right_elbow;
  int Right_wrist;
  int Right_middleFinger1;
  int Right_middleFinger2;
  int Right_middleFinger3;
  int Right_thumb0;
  int Right_thumb1;
  int Right_thumb2;
  int Right_indexFinger1;
  int Right_indexFinger2;
  int Right_indexFinger3;
  int Right_ringFinger1;
  int Right_ringFinger2;
  int Right_ringFinger3;
  int Right_littleFinger1;
  int Right_littleFinger2;
  int Right_littleFinger3;
  int Right_leg;
  int Right_knee;
  int Right_ankle;
  int Right_toe;
  int Left_leg;
  int Left_knee;
  int Left_ankle;
  int Left_toe;
};
BoneIndexes boneIndexes;

// ---------------------------------------------------------

class AnimationDeclaration {
public:
  std::string keyName;
  int index;
  std::string fileName;
};

class AnimationGroupDeclaration {
public:
  std::string groupName;
  int index;
  std::vector<AnimationDeclaration> animationDeclarations;
};

typedef std::vector<AnimationGroupDeclaration> AnimationGroupDeclarations;

// ------

int animationGroupIota = 0;
class AnimationGroupIndexes {
public:
  int Single;
  //
  int Walk;
  int Run;
  int Crouch;
  //
  int Skydive;
  int Glider;
  //
  int Activate;
  int Aim;
  int Dance;
  int Emote;
  int Hold;
  int Hurt;
  int Land;
  int NarutoRun;
  int PickUp;
  int Sit;
  int Swim;
  int Use;
};
AnimationGroupIndexes animationGroupIndexes;

// ---   note: Start from 0, -1 means null/undefined.

int singleAnimationIota = 0;
class SingleAnimationIndexes {
public:
  int Idle;
  int CrouchIdle;
  int SkydiveIdle;
  int GliderIdle;
  int Jump;
  int DoubleJump;
  int FallLoop;
  int Float; // note: Have to use upper case. Otherwise will cause error "error: cannot combine with previous 'int' declaration specifier `int float`;" .
};
SingleAnimationIndexes singleAnimationIndexes;

// ---

int walkAnimationIota = 0;
class WalkAnimationIndexes {
public:
  int Forward;
  int Backward;
  int Left;
  int LeftMirror;
  int Right;
  int RightMirror;
};
WalkAnimationIndexes walkAnimationIndexes;

int runAnimationIota = 0;
class RunAnimationIndexes {
public:
  int Forward;
  int Backward;
  int Left;
  int LeftMirror;
  int Right;
  int RightMirror;
};
RunAnimationIndexes runAnimationIndexes;

int crouchAnimationIota = 0;
class CrouchAnimationIndexes {
public:
  int Forward;
  int Backward;
  int Left;
  int LeftMirror;
  int Right;
  int RightMirror;
};
CrouchAnimationIndexes crouchAnimationIndexes;

// ---

int skydiveAnimationIota = 0;
class SkydiveAnimationIndexes {
public:
  int Forward;
  int Backward;
  int Left;
  int Right;
};
SkydiveAnimationIndexes skydiveAnimationIndexes;

int gliderAnimationIota = 0;
class GliderAnimationIndexes {
public:
  int Forward;
  int Backward;
  int Left;
  int Right;
};
GliderAnimationIndexes gliderAnimationIndexes;

// ---

int activateAnimationIota = 0;
class ActivateAnimationIndexes {
public:
  int Grab_forward;
  int Grab_down;
  int Grab_up;
  int Grab_left;
  int Grab_right;
  int Pick_up;
};
ActivateAnimationIndexes activateAnimationIndexes;

int aimAnimationIota = 0;
class AimAnimationIndexes {
public:
  int SwordSideIdle;
  int SwordSideSlash;
  int SwordSideSlashStep;
  int SwordTopDownSlash;
  int SwordTopDownSlashStep;
};
AimAnimationIndexes aimAnimationIndexes;

int danceAnimationIota = 0;
class DanceAnimationIndexes {
public:
  int Dansu;
  int Powerup;
};
DanceAnimationIndexes danceAnimationIndexes;

int emoteAnimationIota = 0;
class EmoteAnimationIndexes {
public:
  int Alert;
  int AlertSoft;
  int Angry;
  int AngrySoft;
  int Embarrassed;
  int EmbarrassedSoft;
  int HeadNod;
  int HeadNodSoft;
  int HeadShake;
  int HeadShakeSoft;
  int Sad;
  int SadSoft;
  int Surprise;
  int SurpriseSoft;
  int Victory;
  int VictorySoft;
};
EmoteAnimationIndexes emoteAnimationIndexes;

int holdAnimationIota = 0;
class HoldAnimationIndexes {
public:
  int Pick_up_idle;
};
HoldAnimationIndexes holdAnimationIndexes;

int hurtAnimationIota = 0;
class HurtAnimationIndexes {
public:
  int Pain_back;
  int Pain_arch;
};
HurtAnimationIndexes hurtAnimationIndexes;

int landAnimationIota = 0;
class LandAnimationIndexes {
public:
  int Landing;
  int Landing2;
};
LandAnimationIndexes landAnimationIndexes;

int narutoRunAnimationIota = 0;
class NarutoRunAnimationIndexes {
public:
  int NarutoRun;
};
NarutoRunAnimationIndexes narutoRunAnimationIndexes;

int pickUpAnimationIota = 0;
class PickUpAnimationIndexes {
public:
  int PickUp;
  int PickUpIdle;
  int PickUpThrow;
  int PutDown;
  int PickUpZelda;
  int PickUpIdleZelda;
  int PutDownZelda;
};
PickUpAnimationIndexes pickUpAnimationIndexes;

int sitAnimationIota = 0;
class SitAnimationIndexes {
public:
  int Chair;
  int Saddle;
  int Stand;
};
SitAnimationIndexes sitAnimationIndexes;

int swimAnimationIota = 0;
class SwimAnimationIndexes {
public:
  int Breaststroke;
  int Freestyle;
};
SwimAnimationIndexes swimAnimationIndexes;

int useAnimationIota = 0;
class UseAnimationIndexes {
public:
  int Combo;
  int Slash;
  int Rifle;
  int Pistol;
  int Magic;
  int Eat;
  int Drink;
  int Throw; // note: Have to use uppercase, lower case "throw" will cause key word conflict error "error: expected identifier".
  int PickUpThrow;
  int BowDraw;
  int BowIdle;
  int BowLoose;
  int Pickaxe;
  int SwordSideIdle;
  int SwordSideSlash;
  int SwordSideSlashStep;
  int SwordTopDownSlash;
  int SwordTopDownSlashStep;
};
UseAnimationIndexes useAnimationIndexes;

// ------

AnimationGroupDeclarations declarations = {
  {
    "single",
    animationGroupIndexes.Single = animationGroupIota++,
    {
      {
        "idle",
        singleAnimationIndexes.Idle = singleAnimationIota++,
        "idle.fbx"
      },
      {
        "crouchIdle",
        singleAnimationIndexes.CrouchIdle = singleAnimationIota++,
        "Crouch Idle.fbx"
      },
      {
        "SkydiveIdle",
        singleAnimationIndexes.SkydiveIdle = singleAnimationIota++,
        "glide_idle.fbx"
      },
      {
        "GliderIdle",
        singleAnimationIndexes.GliderIdle = singleAnimationIota++,
        "glider_forward.fbx"
      },
      {
        "jump",
        singleAnimationIndexes.Jump = singleAnimationIota++,
        "jump.fbx"
      },
      {
        "doubleJump",
        singleAnimationIndexes.DoubleJump = singleAnimationIota++,
        "jump_double.fbx"
      },
      {
        "fallLoop",
        singleAnimationIndexes.FallLoop = singleAnimationIota++,
        "falling.fbx"
      },
      {
        "float",
        singleAnimationIndexes.Float = singleAnimationIota++,
        "treading water.fbx"
      },
    }
  },
  //
  {
    "walk",
    animationGroupIndexes.Walk = animationGroupIota++,
    {
      {
        "forward",
        walkAnimationIndexes.Forward = walkAnimationIota++,
        "walking.fbx"
      },
      {
        "backward",
        walkAnimationIndexes.Backward = walkAnimationIota++,
        "walking backwards.fbx"
      },
      {
        "left",
        walkAnimationIndexes.Left = walkAnimationIota++,
        "left strafe walking.fbx"
      },
      {
        "leftMirror",
        walkAnimationIndexes.LeftMirror = walkAnimationIota++,
        "right strafe walking reverse.fbx"
      },
      {
        "right",
        walkAnimationIndexes.Right = walkAnimationIota++,
        "right strafe walking.fbx"
      },
      {
        "rightMirror",
        walkAnimationIndexes.RightMirror = walkAnimationIota++,
        "left strafe walking reverse.fbx"
      },
    }
  },
  {
    "run",
    animationGroupIndexes.Run = animationGroupIota++,
    {
      {
        "forward",
        runAnimationIndexes.Forward = runAnimationIota++,
        "Fast Run.fbx"
      },
      {
        "backward",
        runAnimationIndexes.Backward = runAnimationIota++,
        "running backwards.fbx"
      },
      {
        "left",
        runAnimationIndexes.Left = runAnimationIota++,
        "left strafe.fbx"
      },
      {
        "leftMirror",
        runAnimationIndexes.LeftMirror = runAnimationIota++,
        "right strafe reverse.fbx"
      },
      {
        "right",
        runAnimationIndexes.Right = runAnimationIota++,
        "right strafe.fbx"
      },
      {
        "rightMirror",
        runAnimationIndexes.RightMirror = runAnimationIota++,
        "left strafe reverse.fbx"
      },
    }
  },
  {
    "crouch",
    animationGroupIndexes.Crouch = animationGroupIota++,
    {
      {
        "forward",
        crouchAnimationIndexes.Forward = crouchAnimationIota++,
        "Sneaking Forward.fbx"
      },
      {
        "backward",
        crouchAnimationIndexes.Backward = crouchAnimationIota++,
        "Sneaking Forward reverse.fbx"
      },
      {
        "left",
        crouchAnimationIndexes.Left = crouchAnimationIota++,
        "Crouched Sneaking Left.fbx"
      },
      {
        "leftMirror",
        crouchAnimationIndexes.LeftMirror = crouchAnimationIota++,
        "Crouched Sneaking Right reverse.fbx"
      },
      {
        "right",
        crouchAnimationIndexes.Right = crouchAnimationIota++,
        "Crouched Sneaking Right.fbx"
      },
      {
        "rightMirror",
        crouchAnimationIndexes.RightMirror = crouchAnimationIota++,
        "Crouched Sneaking Left reverse.fbx"
      },
    }
  },
  //
  {
    "Skydive",
    animationGroupIndexes.Skydive = animationGroupIota++,
    {
      {
        "Forward",
        skydiveAnimationIndexes.Forward = skydiveAnimationIota++,
        "glide_forward.fbx"
      },
      {
        "Backward",
        skydiveAnimationIndexes.Backward = skydiveAnimationIota++,
        "glide_backward.fbx"
      },
      {
        "Left",
        skydiveAnimationIndexes.Left = skydiveAnimationIota++,
        "glide_left.fbx"
      },
      {
        "Right",
        skydiveAnimationIndexes.Right = skydiveAnimationIota++,
        "glide_right.fbx"
      },
    }
  },
  {
    "Glider",
    animationGroupIndexes.Glider = animationGroupIota++,
    {
      {
        "Forward",
        gliderAnimationIndexes.Forward = gliderAnimationIota++,
        "glider_forward.fbx"
      },
      {
        "Backward",
        gliderAnimationIndexes.Backward = gliderAnimationIota++,
        "glider_backward.fbx"
      },
      {
        "Left",
        gliderAnimationIndexes.Left = gliderAnimationIota++,
        "glider_left.fbx"
      },
      {
        "Right",
        gliderAnimationIndexes.Right = gliderAnimationIota++,
        "glider_right.fbx"
      },
    }
  },
  //
  {
    "activate",
    animationGroupIndexes.Activate = animationGroupIota++,
    {
      {
        "grab_forward",
        activateAnimationIndexes.Grab_forward = activateAnimationIota++,
        "grab_forward.fbx"
      },
      {
        "grab_down",
        activateAnimationIndexes.Grab_down = activateAnimationIota++,
        "grab_down.fbx"
      },
      {
        "grab_up",
        activateAnimationIndexes.Grab_up = activateAnimationIota++,
        "grab_up.fbx"
      },
      {
        "grab_left",
        activateAnimationIndexes.Grab_left = activateAnimationIota++,
        "grab_left.fbx"
      },
      {
        "grab_right",
        activateAnimationIndexes.Grab_right = activateAnimationIota++,
        "grab_right.fbx"
      },
      {
        "pick_up",
        activateAnimationIndexes.Pick_up = activateAnimationIota++,
        "pick_up.fbx"
      },
    }
  },
  {
    "aim",
    animationGroupIndexes.Aim = animationGroupIota++,
    {
      {
        "swordSideIdle",
        aimAnimationIndexes.SwordSideIdle = aimAnimationIota++,
        "sword_idle_side.fbx"
      },
      {
        "swordSideSlash",
        aimAnimationIndexes.SwordSideSlash = aimAnimationIota++,
        "sword_side_slash.fbx"
      },
      {
        "swordSideSlashStep",
        aimAnimationIndexes.SwordSideSlashStep = aimAnimationIota++,
        "sword_side_slash_step.fbx"
      },
      {
        "swordTopDownSlash",
        aimAnimationIndexes.SwordTopDownSlash = aimAnimationIota++,
        "sword_topdown_slash.fbx"
      },
      {
        "swordTopDownSlashStep",
        aimAnimationIndexes.SwordTopDownSlashStep = aimAnimationIota++,
        "sword_topdown_slash_step.fbx"
      },
    }
  },
  {
    "dance",
    animationGroupIndexes.Dance = animationGroupIota++,
    {
      {
        "dansu",
        danceAnimationIndexes.Dansu = danceAnimationIota++,
        "Hip Hop Dancing.fbx"
      },
      {
        "powerup",
        danceAnimationIndexes.Powerup = danceAnimationIota++,
        "powerup.fbx"
      },
    }
  },
  {
    "emote",
    animationGroupIndexes.Emote = animationGroupIota++,
    {
      {
        "alert",
        emoteAnimationIndexes.Alert = emoteAnimationIota++,
        "alert.fbx"
      },
      {
        "alertSoft",
        emoteAnimationIndexes.AlertSoft = emoteAnimationIota++,
        "alert_soft.fbx"
      },
      {
        "angry",
        emoteAnimationIndexes.Angry = emoteAnimationIota++,
        "angry.fbx"
      },
      {
        "angrySoft",
        emoteAnimationIndexes.AngrySoft = emoteAnimationIota++,
        "angry_soft.fbx"
      },
      {
        "embarrassed",
        emoteAnimationIndexes.Embarrassed = emoteAnimationIota++,
        "embarrassed.fbx"
      },
      {
        "embarrassedSoft",
        emoteAnimationIndexes.EmbarrassedSoft = emoteAnimationIota++,
        "embarrassed_soft.fbx"
      },
      {
        "headNod",
        emoteAnimationIndexes.HeadNod = emoteAnimationIota++,
        "head_nod.fbx"
      },
      {
        "headNodSoft",
        emoteAnimationIndexes.HeadNodSoft = emoteAnimationIota++,
        "head_nod_single.fbx"
      },
      {
        "headShake",
        emoteAnimationIndexes.HeadShake = emoteAnimationIota++,
        "head_shake.fbx"
      },
      {
        "headShakeSoft",
        emoteAnimationIndexes.HeadShakeSoft = emoteAnimationIota++,
        "head_shake_single.fbx"
      },
      {
        "sad",
        emoteAnimationIndexes.Sad = emoteAnimationIota++,
        "sad.fbx"
      },
      {
        "sadSoft",
        emoteAnimationIndexes.SadSoft = emoteAnimationIota++,
        "sad_soft.fbx"
      },
      {
        "surprise",
        emoteAnimationIndexes.Surprise = emoteAnimationIota++,
        "surprise.fbx"
      },
      {
        "surpriseSoft",
        emoteAnimationIndexes.SurpriseSoft = emoteAnimationIota++,
        "surprise_soft.fbx"
      },
      {
        "victory",
        emoteAnimationIndexes.Victory = emoteAnimationIota++,
        "victory.fbx"
      },
      {
        "victorySoft",
        emoteAnimationIndexes.VictorySoft = emoteAnimationIota++,
        "victory_soft.fbx"
      },
    }
  },
  {
    "hold",
    animationGroupIndexes.Hold = animationGroupIota++,
    {
      {
        "pick_up_idle",
        holdAnimationIndexes.Pick_up_idle = holdAnimationIota++,
        "pick_up_idle.fbx"
      },
    }
  },
  {
    "hurt",
    animationGroupIndexes.Hurt = animationGroupIota++,
    {
      {
        "pain_back",
        hurtAnimationIndexes.Pain_back = hurtAnimationIota++,
        "pain_back.fbx"
      },
      {
        "pain_arch",
        hurtAnimationIndexes.Pain_arch = hurtAnimationIota++,
        "pain_arch.fbx"
      },
    }
  },
  {
    "land",
    animationGroupIndexes.Land = animationGroupIota++,
    {
      {
        "landing",
        landAnimationIndexes.Landing = landAnimationIota++,
        "landing.fbx"
      },
      {
        "landing2",
        landAnimationIndexes.Landing2 = landAnimationIota++,
        "landing 2.fbx"
      },
    }
  },
  {
    "narutoRun",
    animationGroupIndexes.NarutoRun = animationGroupIota++,
    {
      {
        "narutoRun",
        narutoRunAnimationIndexes.NarutoRun = narutoRunAnimationIota++,
        "naruto run.fbx"
      },
    }
  },
  {
    "pickUp",
    animationGroupIndexes.PickUp = animationGroupIota++,
    {
      {
        "pickUp",
        pickUpAnimationIndexes.PickUp = pickUpAnimationIota++,
        "pick_up.fbx"
      },
      {
        "pickUpIdle",
        pickUpAnimationIndexes.PickUpIdle = pickUpAnimationIota++,
        "pick_up_idle.fbx"
      },
      {
        "pickUpThrow",
        pickUpAnimationIndexes.PickUpThrow = pickUpAnimationIota++,
        "pick_up_throw.fbx"
      },
      {
        "putDown",
        pickUpAnimationIndexes.PutDown = pickUpAnimationIota++,
        "put_down.fbx"
      },
      {
        "pickUpZelda",
        pickUpAnimationIndexes.PickUpZelda = pickUpAnimationIota++,
        "pick_up_zelda.fbx"
      },
      {
        "pickUpIdleZelda",
        pickUpAnimationIndexes.PickUpIdleZelda = pickUpAnimationIota++,
        "pick_up_idle_zelda.fbx"
      },
      {
        "putDownZelda",
        pickUpAnimationIndexes.PutDownZelda = pickUpAnimationIota++,
        "put_down_zelda.fbx"
      },
    }
  },
  {
    "sit",
    animationGroupIndexes.Sit = animationGroupIota++,
    {
      {
        "chair",
        sitAnimationIndexes.Chair = sitAnimationIota++,
        "sitting idle.fbx"
      },
      {
        "saddle",
        sitAnimationIndexes.Saddle = sitAnimationIota++,
        "sitting idle.fbx"
      },
      {
        "stand",
        sitAnimationIndexes.Stand = sitAnimationIota++,
        "Skateboarding.fbx"
      },
    }
  },
  {
    "swim",
    animationGroupIndexes.Swim = animationGroupIota++,
    {
      {
        "breaststroke",
        swimAnimationIndexes.Breaststroke = swimAnimationIota++,
        "Swimming.fbx"
      },
      {
        "freestyle",
        swimAnimationIndexes.Freestyle = swimAnimationIota++,
        "freestyle.fbx"
      },
    }
  },
  {
    "use",
    animationGroupIndexes.Use = animationGroupIota++,
    {
      {
        "combo",
        useAnimationIndexes.Combo = useAnimationIota++,
        "One Hand Sword Combo.fbx"
      },
      {
        "slash",
        useAnimationIndexes.Slash = useAnimationIota++,
        "sword and shield slash.fbx"
      },
      {
        "rifle",
        useAnimationIndexes.Rifle = useAnimationIota++,
        "Rifle Aiming Idle.fbx"
      },
      {
        "pistol",
        useAnimationIndexes.Pistol = useAnimationIota++,
        "Pistol Aiming Idle.fbx"
      },
      {
        "magic",
        useAnimationIndexes.Magic = useAnimationIota++,
        "magic cast.fbx"
      },
      {
        "eat",
        useAnimationIndexes.Eat = useAnimationIota++,
        "eating.fbx"
      },
      {
        "drink",
        useAnimationIndexes.Drink = useAnimationIota++,
        "drinking.fbx"
      },
      {
        "throw",
        useAnimationIndexes.Throw = useAnimationIota++,
        "pick_up_throw.fbx"
      },
      {
        "pickUpThrow",
        useAnimationIndexes.PickUpThrow = useAnimationIota++,
        "pick_up_throw.fbx"
      },
      {
        "bowDraw",
        useAnimationIndexes.BowDraw = useAnimationIota++,
        "bow draw.fbx"
      },
      {
        "bowIdle",
        useAnimationIndexes.BowIdle = useAnimationIota++,
        "bow idle.fbx"
      },
      {
        "bowLoose",
        useAnimationIndexes.BowLoose = useAnimationIota++,
        "bow loose.fbx"
      },
      {
        "pickaxe",
        useAnimationIndexes.Pickaxe = useAnimationIota++,
        "pickaxe_swing.fbx"
      },
      {
        "swordSideIdle",
        useAnimationIndexes.SwordSideIdle = useAnimationIota++,
        "sword_idle_side.fbx"
      },
      {
        "swordSideSlash",
        useAnimationIndexes.SwordSideSlash = useAnimationIota++,
        "sword_side_slash.fbx"
      },
      {
        "swordSideSlashStep",
        useAnimationIndexes.SwordSideSlashStep = useAnimationIota++,
        "sword_side_slash_step.fbx"
      },
      {
        "swordTopDownSlash",
        useAnimationIndexes.SwordTopDownSlash = useAnimationIota++,
        "sword_topdown_slash.fbx"
      },
      {
        "swordTopDownSlashStep",
        useAnimationIndexes.SwordTopDownSlashStep = useAnimationIota++,
        "sword_topdown_slash_step.fbx"
      },
    }
  },
};