#include "AnimationSystem.h"
#include "CubicBezierEasing.h"
#include "constants.h"

namespace AnimationSystem {
  std::vector<Avatar *> avatars;
  std::vector<AnimationMixer *> _animationMixers;
  std::vector<AnimationMapping> _animationMappings;
  std::map<std::string, Animation *> animationAll;

  std::vector<std::vector<Animation *>> animationGroups;
  std::unordered_map<std::string, std::unordered_map<std::string, AnimationDeclaration>> animationGroupsMap;

  float AnimationMixer::nowS;

  unsigned int defaultSitAnimationIndex;
  unsigned int defaultEmoteAnimationIndex;
  unsigned int defaultDanceAnimationIndex;
  unsigned int defaultHoldAnimationIndex;
  unsigned int defaultActivateAnimationIndex;
  unsigned int defaultNarutoRunAnimationIndex;

  float localVectorArr[3];
  float localQuaternionArr[4];
  float localVecQuatArr[4];

  float *localVecQuatPtr;
  float *localVecQuatPtr2;

  float directionsWeightsWithReverse[6];

  float identityQuaternion[4] = {0, 0, 0, 1};

  bool isInitedAnimationSystem = false;

  // functions:

  // Utils ------

  float min(float a, float b) {
    if (a > b) {
      return b;
    } else {
      return a;
    }
  }
  float max(float a, float b) {
    if (a > b) {
      return a;
    } else {
      return b;
    }
  }
  float clamp(float value, float minValue, float maxValue) {
    return max( minValue, min( maxValue, value ) );
  }
  void _clearXZ(float *dst, bool isPosition) {
    if (isPosition) {
      dst[0] = 0;
      dst[2] = 0;
    }
  }
  void copyValue(float *dst, float *src, bool isPosition) {
    dst[0] = src[0];
    dst[1] = src[1];
    dst[2] = src[2];
    if (!isPosition) dst[3] = src[3];
  }
  void lerpFlat(float *dst, unsigned int dstOffset, float *src0, unsigned int srcOffset0, float *src1, unsigned int srcOffset1, float t) {
    float x0 = src0[srcOffset0 + 0];
    float y0 = src0[srcOffset0 + 1];
    float z0 = src0[srcOffset0 + 2];

    float x1 = src1[srcOffset1 + 0];
    float y1 = src1[srcOffset1 + 1];
    float z1 = src1[srcOffset1 + 2];

    dst[dstOffset + 0] = x0 + (x1 - x0) * t;
    dst[dstOffset + 1] = y0 + (y1 - y0) * t;
    dst[dstOffset + 2] = z0 + (z1 - z0) * t;
  };
  void slerpFlat(float *dst, unsigned int dstOffset, float *src0, unsigned int srcOffset0, float *src1, unsigned int srcOffset1, float t) {

    // fuzz-free, array-based Quaternion SLERP operation

    float x0 = src0[srcOffset0 + 0],
          y0 = src0[srcOffset0 + 1],
          z0 = src0[srcOffset0 + 2],
          w0 = src0[srcOffset0 + 3];

    float x1 = src1[srcOffset1 + 0],
          y1 = src1[srcOffset1 + 1],
          z1 = src1[srcOffset1 + 2],
          w1 = src1[srcOffset1 + 3];

    if (t == 0) {

      dst[dstOffset + 0] = x0;
      dst[dstOffset + 1] = y0;
      dst[dstOffset + 2] = z0;
      dst[dstOffset + 3] = w0;
      return;
    }

    if (t == 1) {

      dst[dstOffset + 0] = x1;
      dst[dstOffset + 1] = y1;
      dst[dstOffset + 2] = z1;
      dst[dstOffset + 3] = w1;
      return;
    }

    if (w0 != w1 || x0 != x1 || y0 != y1 || z0 != z1) {

      float s = 1 - t;
      float cos = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1,
            dir = (cos >= 0 ? 1 : -1),
            sqrSin = 1 - cos * cos;

      // Skip the Slerp for tiny steps to avoid numeric problems:
      float EPSILON = 2.220446049250313e-16;
      if (sqrSin > EPSILON) {

        float sinVal = sqrt(sqrSin),
              len = atan2(sinVal, cos * dir);

        s = sin(s * len) / sinVal;
        t = sin(t * len) / sinVal;
      }

      float tDir = t * dir;

      x0 = x0 * s + x1 * tDir;
      y0 = y0 * s + y1 * tDir;
      z0 = z0 * s + z1 * tDir;
      w0 = w0 * s + w1 * tDir;

      // Normalize in case we just did a lerp:
      if (s == 1 - t) {

        float f = 1 / sqrt(x0 * x0 + y0 * y0 + z0 * z0 + w0 * w0);

        x0 *= f;
        y0 *= f;
        z0 *= f;
        w0 *= f;
      }
    }

    dst[dstOffset] = x0;
    dst[dstOffset + 1] = y0;
    dst[dstOffset + 2] = z0;
    dst[dstOffset + 3] = w0;
  }
  void interpolateFlat(float *dst, unsigned int dstOffset, float *src0, unsigned int srcOffset0, float *src1, unsigned int srcOffset1, float t, bool isPosition) {
    if (isPosition) {
      lerpFlat(dst, dstOffset, src0, srcOffset0, src1, srcOffset1, t);
    } else {
      slerpFlat(dst, dstOffset, src0, srcOffset0, src1, srcOffset1, t);
    }
  }
  void multiplyQuaternionsFlat(float *dst, unsigned int dstOffset, float *src0, unsigned int srcOffset0, float *src1, unsigned int srcOffset1) {
    float x0 = src0[ srcOffset0 ];
    float y0 = src0[ srcOffset0 + 1 ];
    float z0 = src0[ srcOffset0 + 2 ];
    float w0 = src0[ srcOffset0 + 3 ];

    float x1 = src1[ srcOffset1 ];
    float y1 = src1[ srcOffset1 + 1 ];
    float z1 = src1[ srcOffset1 + 2 ];
    float w1 = src1[ srcOffset1 + 3 ];

    dst[ dstOffset ] = x0 * w1 + w0 * x1 + y0 * z1 - z0 * y1;
    dst[ dstOffset + 1 ] = y0 * w1 + w0 * y1 + z0 * x1 - x0 * z1;
    dst[ dstOffset + 2 ] = z0 * w1 + w0 * z1 + x0 * y1 - y0 * x1;
    dst[ dstOffset + 3 ] = w0 * w1 - x0 * x1 - y0 * y1 - z0 * z1;
  }
  void invertQuaternionFlat(float *dst, unsigned int dstOffset) {
    dst[ dstOffset ] *= -1;
    dst[ dstOffset + 1 ] *= -1;
    dst[ dstOffset + 2 ] *= -1;
  }
  void addVectorsFlat(float *dst, float *src0, float *src1) {
    dst[0] = src0[0] + src1[0];
    dst[1] = src0[1] + src1[1];
    dst[2] = src0[2] + src1[2];
  }
  void subVectorsFlat(float *dst, float *src0, float *src1) {
    dst[0] = src0[0] - src1[0];
    dst[1] = src0[1] - src1[1];
    dst[2] = src0[2] - src1[2];
  }

  // Main ------

  Avatar *createAnimationAvatar(AnimationMixer *mixer) {
    Avatar *avatar = new Avatar();
    avatars.push_back(avatar);
    avatar->mixer = mixer;
    mixer->avatar = avatar;

    // ActionInterpolants
    avatar->actionInterpolants["crouch"] = new BiActionInterpolant(0, 200);
    avatar->actionInterpolants["activate"] = new UniActionInterpolant(0, 750);
    avatar->actionInterpolants["use"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["pickUp"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["unuse"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["aim"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["narutoRun"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["fly"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["swim"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["jump"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["doubleJump"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["land"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["dance"] = new BiActionInterpolant(0, 200);
    avatar->actionInterpolants["emote"] = new BiActionInterpolant(0, 200);
    avatar->actionInterpolants["fallLoop"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["fallLoopTransition"] = new BiActionInterpolant(0, 300);
    avatar->actionInterpolants["hurt"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["aimRightTransition"] = new BiActionInterpolant(0, 150);
    avatar->actionInterpolants["aimLeftTransition"] = new BiActionInterpolant(0, 150);
    avatar->actionInterpolants["sprint"] = new BiActionInterpolant(0, 200);
    avatar->actionInterpolants["movements"] = new InfiniteActionInterpolant(0);
    avatar->actionInterpolants["movementsTransition"] = new BiActionInterpolant(0, 200);

    return avatar;
  }
  unsigned int initAnimationSystem(char *scratchStack) { // only need init once globally
    std::string jsonStr;

    if (!isInitedAnimationSystem) {
      // -------------------------------------------------------------------------

      for (unsigned int i = 0; i < _animationMappings.size(); i++) {
        if (_animationMappings[i].isPosition) {
          boneIndexes.HipsPosition = i;
        } else {
          std::string boneName = _animationMappings[i].boneName;
          if (boneName == "Hips") boneIndexes.Hips = i;
          else if (boneName == "Spine") boneIndexes.Spine = i;
          else if (boneName == "Chest") boneIndexes.Chest = i;
          else if (boneName == "UpperChest") boneIndexes.UpperChest = i;
          else if (boneName == "Neck") boneIndexes.Neck = i;
          else if (boneName == "Head") boneIndexes.Head = i;
          else if (boneName == "Left_shoulder") boneIndexes.Left_shoulder = i;
          else if (boneName == "Left_arm") boneIndexes.Left_arm = i;
          else if (boneName == "Left_elbow") boneIndexes.Left_elbow = i;
          else if (boneName == "Left_wrist") boneIndexes.Left_wrist = i;
          else if (boneName == "Left_middleFinger1") boneIndexes.Left_middleFinger1 = i;
          else if (boneName == "Left_middleFinger2") boneIndexes.Left_middleFinger2 = i;
          else if (boneName == "Left_middleFinger3") boneIndexes.Left_middleFinger3 = i;
          else if (boneName == "Left_thumb0") boneIndexes.Left_thumb0 = i;
          else if (boneName == "Left_thumb1") boneIndexes.Left_thumb1 = i;
          else if (boneName == "Left_thumb2") boneIndexes.Left_thumb2 = i;
          else if (boneName == "Left_indexFinger1") boneIndexes.Left_indexFinger1 = i;
          else if (boneName == "Left_indexFinger2") boneIndexes.Left_indexFinger2 = i;
          else if (boneName == "Left_indexFinger3") boneIndexes.Left_indexFinger3 = i;
          else if (boneName == "Left_ringFinger1") boneIndexes.Left_ringFinger1 = i;
          else if (boneName == "Left_ringFinger2") boneIndexes.Left_ringFinger2 = i;
          else if (boneName == "Left_ringFinger3") boneIndexes.Left_ringFinger3 = i;
          else if (boneName == "Left_littleFinger1") boneIndexes.Left_littleFinger1 = i;
          else if (boneName == "Left_littleFinger2") boneIndexes.Left_littleFinger2 = i;
          else if (boneName == "Left_littleFinger3") boneIndexes.Left_littleFinger3 = i;
          else if (boneName == "Right_shoulder") boneIndexes.Right_shoulder = i;
          else if (boneName == "Right_arm") boneIndexes.Right_arm = i;
          else if (boneName == "Right_elbow") boneIndexes.Right_elbow = i;
          else if (boneName == "Right_wrist") boneIndexes.Right_wrist = i;
          else if (boneName == "Right_middleFinger1") boneIndexes.Right_middleFinger1 = i;
          else if (boneName == "Right_middleFinger2") boneIndexes.Right_middleFinger2 = i;
          else if (boneName == "Right_middleFinger3") boneIndexes.Right_middleFinger3 = i;
          else if (boneName == "Right_thumb0") boneIndexes.Right_thumb0 = i;
          else if (boneName == "Right_thumb1") boneIndexes.Right_thumb1 = i;
          else if (boneName == "Right_thumb2") boneIndexes.Right_thumb2 = i;
          else if (boneName == "Right_indexFinger1") boneIndexes.Right_indexFinger1 = i;
          else if (boneName == "Right_indexFinger2") boneIndexes.Right_indexFinger2 = i;
          else if (boneName == "Right_indexFinger3") boneIndexes.Right_indexFinger3 = i;
          else if (boneName == "Right_ringFinger1") boneIndexes.Right_ringFinger1 = i;
          else if (boneName == "Right_ringFinger2") boneIndexes.Right_ringFinger2 = i;
          else if (boneName == "Right_ringFinger3") boneIndexes.Right_ringFinger3 = i;
          else if (boneName == "Right_littleFinger1") boneIndexes.Right_littleFinger1 = i;
          else if (boneName == "Right_littleFinger2") boneIndexes.Right_littleFinger2 = i;
          else if (boneName == "Right_littleFinger3") boneIndexes.Right_littleFinger3 = i;
          else if (boneName == "Right_leg") boneIndexes.Right_leg = i;
          else if (boneName == "Right_knee") boneIndexes.Right_knee = i;
          else if (boneName == "Right_ankle") boneIndexes.Right_ankle = i;
          else if (boneName == "Right_toe") boneIndexes.Right_toe = i;
          else if (boneName == "Left_leg") boneIndexes.Left_leg = i;
          else if (boneName == "Left_knee") boneIndexes.Left_knee = i;
          else if (boneName == "Left_ankle") boneIndexes.Left_ankle = i;
          else if (boneName == "Left_toe") boneIndexes.Left_toe = i;
        }
      }

      // -------------------------------------------------------------------------

      json jAnimationGroups;

      for (unsigned int i = 0; i < declarations.size(); i++) {
        AnimationGroupDeclaration declaration = declarations[i];
        std::vector<Animation *> animationGroup;

        json jAnimationGroup;
        jAnimationGroup["name"] = declaration.groupName;
        jAnimationGroup["index"] = declaration.index;

        json jAnimations;
        for (unsigned int j = 0; j < declaration.animationDeclarations.size(); j++) {
          AnimationDeclaration animationDeclaration = declaration.animationDeclarations[j];
          animationGroup.push_back(animationAll[animationDeclaration.fileName]);
          animationGroupsMap[declaration.groupName][animationDeclaration.keyName] = animationDeclaration;

          json jAnimation;
          jAnimation["keyName"] = animationDeclaration.keyName;
          jAnimation["index"] = animationDeclaration.index;
          jAnimation["fileName"] = animationDeclaration.fileName;

          jAnimations.push_back(jAnimation);
        }
        jAnimationGroup["animations"] = jAnimations;

        jAnimationGroups.push_back(jAnimationGroup);
        animationGroups.push_back(animationGroup);
      }

      jsonStr = jAnimationGroups.dump();
      // -------------------------------------------------------------------------

      defaultSitAnimationIndex = sitAnimationIndexes.Chair;
      defaultEmoteAnimationIndex = emoteAnimationIndexes.Angry;
      defaultDanceAnimationIndex = danceAnimationIndexes.Dansu;
      defaultHoldAnimationIndex = holdAnimationIndexes.Pick_up_idle;
      defaultActivateAnimationIndex = activateAnimationIndexes.Grab_forward;
      defaultNarutoRunAnimationIndex = narutoRunAnimationIndexes.NarutoRun;

      // -------------------------------------------------------------------------

      CubicBezierEasing::init(0, 1, 0, 1);

      //
      isInitedAnimationSystem = true;
    }
    
    unsigned int jsonStrByteLength = jsonStr.length();
    for (unsigned int i = 0; i < jsonStrByteLength; i++)
    {
      scratchStack[i] = jsonStr.at(i);
    }
    return jsonStrByteLength;
  }
  void Avatar::updateInterpolation(float timeDiff) {
    this->actionInterpolants["crouch"]->update(timeDiff, this->crouchState);
    this->actionInterpolants["activate"]->update(timeDiff, this->activateState);
    this->actionInterpolants["use"]->update(timeDiff, this->useState);
    this->actionInterpolants["pickUp"]->update(timeDiff, this->pickUpState);
    this->actionInterpolants["unuse"]->update(timeDiff, !this->useState);
    this->actionInterpolants["aim"]->update(timeDiff, this->aimState);
    this->actionInterpolants["narutoRun"]->update(timeDiff, this->narutoRunState);
    this->actionInterpolants["fly"]->update(timeDiff, this->flyState);
    this->actionInterpolants["swim"]->update(timeDiff, this->swimState);
    this->actionInterpolants["jump"]->update(timeDiff, this->jumpState);
    this->actionInterpolants["doubleJump"]->update(timeDiff, this->doubleJumpState);
    this->actionInterpolants["land"]->update(timeDiff, !this->jumpState && !this->fallLoopState && !this->flyState);
    this->actionInterpolants["dance"]->update(timeDiff, this->danceState);
    this->actionInterpolants["emote"]->update(timeDiff, this->emoteState);
    this->actionInterpolants["fallLoop"]->update(timeDiff, this->fallLoopState);
    this->actionInterpolants["fallLoopTransition"]->update(timeDiff, this->fallLoopState);
    this->actionInterpolants["hurt"]->update(timeDiff, this->hurtState);
    this->actionInterpolants["aimRightTransition"]->update(timeDiff, this->aimState && this->rightHandState);
    this->actionInterpolants["aimLeftTransition"]->update(timeDiff, this->aimState && this->leftHandState);
    this->actionInterpolants["sprint"]->update(timeDiff, this->sprintState);
    this->actionInterpolants["movements"]->update(timeDiff, this->movementsState);
    this->actionInterpolants["movementsTransition"]->update(timeDiff, this->movementsState);
  }
  void Avatar::update(float *scratchStack) {
    unsigned int index = 0;

    // values ---
    this->forwardFactor = scratchStack[index++];
    this->backwardFactor = scratchStack[index++];
    this->leftFactor = scratchStack[index++];
    this->rightFactor = scratchStack[index++];
    this->mirrorLeftFactorReverse = scratchStack[index++];
    this->mirrorLeftFactor = scratchStack[index++];
    this->mirrorRightFactorReverse = scratchStack[index++];
    this->mirrorRightFactor = scratchStack[index++];

    this->idleWalkFactor = scratchStack[index++];
    this->walkRunFactor = scratchStack[index++];
    this->movementsTransitionFactor = scratchStack[index++];
    this->movementsTime = scratchStack[index++];

    this->landWithMoving = scratchStack[index++];
    this->lastEmoteTime = scratchStack[index++];
    this->useAnimationEnvelopeLength = scratchStack[index++];

    this->useAnimationIndex = (int)(scratchStack[index++]);
    this->useAnimationComboIndex = (int)(scratchStack[index++]);
    this->unuseAnimationIndex = (int)(scratchStack[index++]);

    this->fallLoopFromJump = scratchStack[index++];
    this->landTimeS = scratchStack[index++];
    this->timeSinceLastMoveS = scratchStack[index++];

    this->useAnimationEnvelopeIndices.clear();
    for (unsigned int i = 0; i < useAnimationEnvelopeLength; i++) {
      this->useAnimationEnvelopeIndices.push_back((int)(scratchStack[index++]));
    }

    //
    
    directionsWeightsWithReverse[0] = this->forwardFactor;
    directionsWeightsWithReverse[1] = this->backwardFactor;
    directionsWeightsWithReverse[2] = this->mirrorLeftFactorReverse;
    directionsWeightsWithReverse[3] = this->mirrorLeftFactor;
    directionsWeightsWithReverse[4] = this->mirrorRightFactorReverse;
    directionsWeightsWithReverse[5] = this->mirrorRightFactor;

    // --- Update & Get value of ActionInterpolants

    this->crouchFactor = this->actionInterpolants["crouch"]->getNormalized();

    this->activateTime = this->actionInterpolants["activate"]->get();

    this->useTime = this->actionInterpolants["use"]->get();

    this->pickUpTime = this->actionInterpolants["pickUp"]->get();

    this->unuseTime = this->actionInterpolants["unuse"]->get();

    this->aimTime = this->actionInterpolants["aim"]->get();

    this->narutoRunTime = this->actionInterpolants["narutoRun"]->get();

    this->flyTime = this->flyState ? this->actionInterpolants["fly"]->get() : -1;

    this->swimTime = this->swimState ? this->actionInterpolants["swim"]->get() : -1;

    this->jumpTime = this->actionInterpolants["jump"]->get();

    this->doubleJumpTime = this->actionInterpolants["doubleJump"]->get();

    this->landTime = this->actionInterpolants["land"]->get();

    this->danceFactor = this->actionInterpolants["dance"]->get();

    this->emoteFactor = this->actionInterpolants["emote"]->get();

    this->fallLoopTime = this->actionInterpolants["fallLoop"]->get();

    this->fallLoopFactor = this->actionInterpolants["fallLoopTransition"]->getNormalized();

    this->hurtTime = this->actionInterpolants["hurt"]->get();

    float sprintTime = this->actionInterpolants["sprint"]->get();
    this->sprintFactor = fmin(fmax(sprintTime / 200, 0), 1);

    this->movementsTime = this->actionInterpolants["movements"]->get();

    float movementsTransitionTime = this->actionInterpolants["movementsTransition"]->get();
    this->movementsTransitionFactor = fmin(fmax(movementsTransitionTime / 200, 0), 1);

    // --- end: Update & Get value of ActionInterpolants

    if (this->actions["emote"] == nullptr) {
      this->emoteAnimationIndex = -1;
    } else {
      this->emoteAnimationIndex = animationGroupsMap["emote"][this->actions["emote"]["animation"]].index;
    }

    if (this->actions["sit"] == nullptr) {
      this->sitAnimationIndex = -1;
    } else {
      this->sitAnimationIndex = animationGroupsMap["sit"][this->actions["sit"]["animation"]].index;
    }

    if (this->actions["dance"] == nullptr) {
      this->danceAnimationIndex = -1;
    } else {
      this->danceAnimationIndex = animationGroupsMap["dance"][this->actions["dance"]["animation"]].index;
    }

    if (this->actions["activate"] == nullptr) {
      this->activateAnimationIndex = -1;
    } else {
      this->activateAnimationIndex = animationGroupsMap["activate"][this->actions["activate"]["animationName"]].index;
    }

    if (this->actions["hurt"] == nullptr) {
      this->hurtAnimationIndex = -1;
    } else {
      this->hurtAnimationIndex = animationGroupsMap["hurt"][this->actions["hurt"]["animation"]].index;
    }

    if (this->actions["aim"] == nullptr) {
      this->aimAnimationIndex = -1;
    } else {
      if (this->actions["aim"]["characterAnimation"] == nullptr) {
        this->aimAnimationIndex = -1;
      } else {
        this->aimAnimationIndex = animationGroupsMap["aim"][this->actions["aim"]["characterAnimation"]].index;
      }
    }
  }
  void Avatar::addAction(char *scratchStack, unsigned int stringByteLength) {

    std::string jsonStr = "";
    for (unsigned int i = 0; i < stringByteLength; i++) {
      jsonStr += scratchStack[i];
    }

    json j = json::parse(jsonStr);
    this->actions[j["type"]] = j;

    // note: for performance reason, only check string when add/remove action.
    if (j["type"] == "jump") {
      this->jumpState = true;
    } else if (j["type"] == "doubleJump") {
      this->doubleJumpState = true;
    } else if (j["type"] == "fly") {
      this->flyState = true;
    } else if (j["type"] == "crouch") {
      this->crouchState = true;
    } else if (j["type"] == "narutoRun") {
      this->narutoRunState = true;
    } else if (j["type"] == "sit") {
      this->sitState = true;
    } else if (j["type"] == "wear") {
      this->holdState = j["holdAnimation"] == "pick_up_idle";
    } else if (j["type"] == "pickUp") {
      this->pickUpState = true;
    } else if (j["type"] == "swim") {
      this->swimState = true;
    } else if (j["type"] == "activate") {
      this->activateState = true;
    } else if (j["type"] == "use") {
      this->useState = true;
    } else if (j["type"] == "aim") {
      this->aimState = true;
    } else if (j["type"] == "fallLoop") {
      this->fallLoopState = true;
    } else if (j["type"] == "dance") {
      this->danceState = true;
    } else if (j["type"] == "emote") {
      this->emoteState = true;
    } else if (j["type"] == "hurt") {
      this->hurtState = true;
    } else if (j["type"] == "rightHand") {
      this->rightHandState = true;
    } else if (j["type"] == "leftHand") {
      this->leftHandState = true;
    } else if (j["type"] == "sprint") {
      this->sprintState = true;
    } else if (j["type"] == "movements") {
      this->movementsState = true;
    }
  }
  void Avatar::removeAction(char *scratchStack, unsigned int stringByteLength) {
    std::string jsonStr = "";
    for (unsigned int i = 0; i < stringByteLength; i++) {
      jsonStr += scratchStack[i];
    }

    json j = json::parse(jsonStr);

    this->actions.erase(j["type"]);

    // note: for performance reason, only check string when add/remove action.
    if (j["type"] == "jump") {
      this->jumpState = false;
    } else if (j["type"] == "doubleJump") {
      this->doubleJumpState = false;
    } else if (j["type"] == "fly") {
      this->flyState = false;
    } else if (j["type"] == "crouch") {
      this->crouchState = false;
    } else if (j["type"] == "narutoRun") {
      this->narutoRunState = false;
    } else if (j["type"] == "sit") {
      this->sitState = false;
    } else if (j["type"] == "wear") {
      this->holdState = false;
    } else if (j["type"] == "pickUp") {
      this->pickUpState = false;
    } else if (j["type"] == "swim") {
      this->swimState = false;
    } else if (j["type"] == "activate") {
      this->activateState = false;
    } else if (j["type"] == "use") {
      this->useState = false;
    } else if (j["type"] == "aim") {
      this->aimState = false;
    } else if (j["type"] == "fallLoop") {
      this->fallLoopState = false;
    } else if (j["type"] == "dance") {
      this->danceState = false;
    } else if (j["type"] == "emote") {
      this->emoteState = false;
    } else if (j["type"] == "hurt") {
      this->hurtState = false;
    } else if (j["type"] == "rightHand") {
      this->rightHandState = false;
    } else if (j["type"] == "leftHand") {
      this->leftHandState = false;
    } else if (j["type"] == "sprint") {
      this->sprintState = false;
    } else if (j["type"] == "movements") {
      this->movementsState = false;
    }
  }
  float Avatar::getActionInterpolant(char *scratchStack, unsigned int stringByteLength, unsigned int type) { // 0: get(), 1: getNormalized(), 2: getInverse()
    std::string actionName = "";
    for (unsigned int i = 0; i < stringByteLength; i++) {
      actionName += scratchStack[i];
    }

    if (type == 0) {
      float interpolantValue = this->actionInterpolants[actionName]->get();
      return interpolantValue;
    } else if (type == 1) {
      float interpolantValue = this->actionInterpolants[actionName]->getNormalized();
      return interpolantValue;
    } else if (type == 2) {
      float interpolantValue = this->actionInterpolants[actionName]->getInverse();
      return interpolantValue;
    }
    return -1;
  }
  AnimationMixer *createAnimationMixer() {
    AnimationMixer *animationMixer = new AnimationMixer();
    _animationMixers.push_back(animationMixer);
    animationMixer->animationValues = new float[_animationMappings.size() * 4];
    return animationMixer;
  }
  void createAnimationMapping(bool isPosition, unsigned int index, bool isTop, bool isArm, char *scratchStack, unsigned int nameByteLength) {
    AnimationMapping animationMapping;

    animationMapping.isPosition = isPosition;
    animationMapping.index = index;
    animationMapping.isTop = isTop;
    animationMapping.isArm = isArm;

    std::string boneName = "";
    for (unsigned int i = 0; i < nameByteLength; i++) {
      boneName += scratchStack[i];
    }
    animationMapping.boneName = boneName;

    _animationMappings.push_back(animationMapping);
  }
  Animation *createAnimation(char *scratchStack, unsigned int nameByteLength, float duration) {
    Animation *animation = new Animation();

    animation->duration = duration;

    std::string name = "";
    for (unsigned int i = 0; i < nameByteLength; i++) {
      name += scratchStack[i];
    }
    animation->name = name;

    animationAll[name] = animation;

    return animation;
  }
  void createAnimationInterpolant(Animation *animation, unsigned int numParameterPositions, float *parameterPositions, unsigned int numSampleValues, float *sampleValues, unsigned int valueSize) {
    Interpolant *interpolant = new Interpolant;
    interpolant->numParameterPositions = numParameterPositions;
    interpolant->parameterPositions = new float[numParameterPositions];
    for (unsigned int i = 0; i < numParameterPositions; i++) {
      interpolant->parameterPositions[i] = parameterPositions[i];
    }
    interpolant->numSampleValues = numSampleValues;
    interpolant->sampleValues = new float[numSampleValues];
    for (unsigned int i = 0; i < numSampleValues; i++) {
      interpolant->sampleValues[i] = sampleValues[i];
    }
    interpolant->valueSize = valueSize; // only support 3 (vector) or 4 (quaternion)

    animation->interpolants.push_back(interpolant);
  }
  float *evaluateInterpolant(Animation *animation, unsigned int interpolantIndex, float t) {
    Interpolant *interpolant = animation->interpolants[interpolantIndex];

    if (interpolant->numParameterPositions == 1) {
      interpolant->resultBuffer[0] = interpolant->sampleValues[0];
      interpolant->resultBuffer[1] = interpolant->sampleValues[1];
      interpolant->resultBuffer[2] = interpolant->sampleValues[2];
      if (interpolant->valueSize == 4) {
        interpolant->resultBuffer[3] = interpolant->sampleValues[3];
      }
    } else {
      int index = 0;
      for (; index < interpolant->numParameterPositions; index++) {
        if (interpolant->parameterPositions[index] > t) {
          break;
        }
      }

      if (index == 0) { // note: Handle situation that, parameterPositions[0] > 0, and t == 0 or t < parameterPositions[0].
        interpolant->resultBuffer[0] = interpolant->sampleValues[0];
        interpolant->resultBuffer[1] = interpolant->sampleValues[1];
        interpolant->resultBuffer[2] = interpolant->sampleValues[2];
        if (interpolant->valueSize == 4) {
          interpolant->resultBuffer[3] = interpolant->sampleValues[3];
        }
      } else if (index > interpolant->numParameterPositions - 1) { // note: Handle situation that, t > max parameterPosition.
        unsigned int maxIndex = interpolant->numParameterPositions - 1;
        interpolant->resultBuffer[0] = interpolant->sampleValues[maxIndex * interpolant->valueSize + 0];
        interpolant->resultBuffer[1] = interpolant->sampleValues[maxIndex * interpolant->valueSize + 1];
        interpolant->resultBuffer[2] = interpolant->sampleValues[maxIndex * interpolant->valueSize + 2];
        if (interpolant->valueSize == 4) {
          interpolant->resultBuffer[3] = interpolant->sampleValues[maxIndex * interpolant->valueSize + 3];
        }
      } else {
        unsigned int index0 = index - 1;
        unsigned int index1 = index;

        float time0 = interpolant->parameterPositions[index0];
        float time1 = interpolant->parameterPositions[index1];
        float f = (t - time0) / (time1 - time0);

        interpolateFlat(
          interpolant->resultBuffer, 0,
          interpolant->sampleValues, index0 * interpolant->valueSize,
          interpolant->sampleValues, index1 * interpolant->valueSize,
          f,
          interpolant->valueSize == 3
        );
      }
    }

    return interpolant->resultBuffer;
  }

  float *doBlendList(AnimationMapping &spec, std::vector<Animation *> &animations, float *weights, float &timeS) { // note: Big performance influnce!!! Use `&` to prevent copy parameter's values!!!
    float *resultVecQuat;
    unsigned int indexWeightBigThanZero = 0;
    float currentWeight = 0;
    for (int i = 0; i < animations.size(); i++) {
      float weight = weights[i];
      if (weight > 0) {
        Animation *animation = animations[i];
        float *vecQuat = evaluateInterpolant(animation, spec.index, fmod(timeS, animation->duration));
        if (indexWeightBigThanZero == 0) {
          resultVecQuat = vecQuat;

          indexWeightBigThanZero++;
          currentWeight = weight;
        } else {
          float t = weight / (currentWeight + weight);
          interpolateFlat(resultVecQuat, 0, resultVecQuat, 0, vecQuat, 0, t, spec.isPosition);

          indexWeightBigThanZero++;
          currentWeight += weight;
        }
      }
    }
    return resultVecQuat;
  }

  void _handleDefault(AnimationMapping &spec, Avatar *avatar) {
    // note: Big performance influnce!!! Do not update `directionsWeightsWithReverse` here, because of will run 53 times ( 53 bones )!!! todo: Notice codes which will run 53 times!!!
    // directionsWeightsWithReverse["forward"] = avatar->forwardFactor;
    // directionsWeightsWithReverse["backward"] = avatar->backwardFactor;
    // directionsWeightsWithReverse["left"] = avatar->mirrorLeftFactorReverse;
    // directionsWeightsWithReverse["leftMirror"] = avatar->mirrorLeftFactor;
    // directionsWeightsWithReverse["right"] = avatar->mirrorRightFactorReverse;
    // directionsWeightsWithReverse["rightMirror"] = avatar->mirrorRightFactor;

    // walkAnimations
    localVecQuatPtr2 = doBlendList(spec, animationGroups[animationGroupIndexes.Walk], directionsWeightsWithReverse, avatar->landTimeS);
    copyValue(spec.dst, localVecQuatPtr2, spec.isPosition);

    // runAnimations
    localVecQuatPtr2 = doBlendList(spec, animationGroups[animationGroupIndexes.Run], directionsWeightsWithReverse, avatar->landTimeS);

    // blend walk run
    interpolateFlat(spec.dst, 0, spec.dst, 0, localVecQuatPtr2, 0, avatar->walkRunFactor, spec.isPosition);
    _clearXZ(spec.dst, spec.isPosition);

    // blend idle ---
    localVecQuatPtr = evaluateInterpolant(animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Idle], spec.index, fmod(avatar->timeSinceLastMoveS, animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Idle]->duration));
    interpolateFlat(spec.dst, 0, spec.dst, 0, localVecQuatPtr, 0, 1 - avatar->idleWalkFactor, spec.isPosition);

    // crouchAnimations
    localVecQuatPtr2 = doBlendList(spec, animationGroups[animationGroupIndexes.Crouch], directionsWeightsWithReverse, avatar->landTimeS);
    copyValue(localVecQuatArr, localVecQuatPtr2, spec.isPosition);
    _clearXZ(localVecQuatArr, spec.isPosition);

    // blend crouch idle ---
    localVecQuatPtr = evaluateInterpolant(animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.CrouchIdle], spec.index, fmod(avatar->timeSinceLastMoveS, animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.CrouchIdle]->duration));
    interpolateFlat(localVecQuatArr, 0, localVecQuatArr, 0, localVecQuatPtr, 0, 1 - avatar->idleWalkFactor, spec.isPosition);

    // blend walkRun and crouch
    interpolateFlat(spec.dst, 0, spec.dst, 0, localVecQuatArr, 0, avatar->crouchFactor, spec.isPosition);
  }

  void _blendDoubleJump(AnimationMapping &spec, Avatar *avatar) {
    float t2 = avatar->doubleJumpTime / 1000;
    float *v2 = evaluateInterpolant(animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.DoubleJump], spec.index, t2);

    copyValue(spec.dst, v2, spec.isPosition);

    _clearXZ(spec.dst, spec.isPosition);
  }

  void _blendJump(AnimationMapping &spec, Avatar *avatar) {
    float t2 = avatar->jumpTime / 1000;
    float *v2 = evaluateInterpolant(animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Jump], spec.index, t2);

    copyValue(spec.dst, v2, spec.isPosition);

    _clearXZ(spec.dst, spec.isPosition);

    if (avatar->holdState && spec.isArm) {
      Animation *holdAnimation = animationGroups[animationGroupIndexes.Hold][defaultHoldAnimationIndex];
      float t2 = fmod(AnimationMixer::nowS, holdAnimation->duration);
      float *v2 = evaluateInterpolant(holdAnimation, spec.index, t2);
      copyValue(spec.dst, v2, spec.isPosition);
    }
  }

  void _blendSit(AnimationMapping &spec, Avatar *avatar) {

    Animation *sitAnimation = animationGroups[animationGroupIndexes.Sit][avatar->sitAnimationIndex == -1 ? defaultSitAnimationIndex : avatar->sitAnimationIndex];
    float *v2 = evaluateInterpolant(sitAnimation, spec.index, 1);

    copyValue(spec.dst, v2, spec.isPosition);
  }

  void _blendNarutoRun(AnimationMapping &spec, Avatar *avatar) {

    if (spec.index == boneIndexes.Chest || spec.index == boneIndexes.UpperChest) {
      // const down10QuaternionArray = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI * 0.1).toArray();
      spec.dst[0] = 0.15643446504023087;
      spec.dst[1] = 0;
      spec.dst[2] = 0;
      spec.dst[3] = 0.9876883405951378;
    } else {
      Animation *narutoRunAnimation = animationGroups[animationGroupIndexes.NarutoRun][defaultNarutoRunAnimationIndex];
      float t2 = fmod((avatar->narutoRunTime / 1000 * narutoRunTimeFactor), narutoRunAnimation->duration);
      float *v2 = evaluateInterpolant(narutoRunAnimation, spec.index, t2);

      copyValue(spec.dst, v2, spec.isPosition);
    }

    _clearXZ(spec.dst, spec.isPosition);
  }

  void _blendDance(AnimationMapping &spec, Avatar *avatar) {
    _handleDefault(spec, avatar);

    Animation *danceAnimation = animationGroups[animationGroupIndexes.Dance][avatar->danceAnimationIndex < 0 ? defaultDanceAnimationIndex : avatar->danceAnimationIndex];
    float t2 = fmod(AnimationMixer::nowS, danceAnimation->duration);
    float *v2 = evaluateInterpolant(danceAnimation, spec.index, t2);

    float danceFactorS = avatar->danceFactor / crouchMaxTime;
    float f = min(max(danceFactorS, 0), 1);
    
    interpolateFlat(spec.dst, 0, spec.dst, 0, v2, 0, f, spec.isPosition);

    _clearXZ(spec.dst, spec.isPosition);
  }

  void _blendEmote(AnimationMapping &spec, Avatar *avatar) {
    _handleDefault(spec, avatar);

    Animation *emoteAnimation = animationGroups[animationGroupIndexes.Emote][avatar->emoteAnimationIndex < 0 ? defaultEmoteAnimationIndex : avatar->emoteAnimationIndex];
    float emoteTime = AnimationMixer::nowS * 1000 - avatar->lastEmoteTime;
    float t2 = min(emoteTime / 1000, emoteAnimation->duration);
    float *v2 = evaluateInterpolant(emoteAnimation, spec.index, t2);

    float emoteFactorS = avatar->emoteFactor / crouchMaxTime;
    float f = min(max(emoteFactorS, 0), 1);

    if (spec.index == boneIndexes.Spine || spec.index == boneIndexes.Chest || spec.index == boneIndexes.UpperChest || spec.index == boneIndexes.Neck || spec.index == boneIndexes.Head) {
      if (!spec.isPosition) {
        multiplyQuaternionsFlat(spec.dst, 0, v2, 0, spec.dst, 0);
      } else {
        interpolateFlat(spec.dst, 0, spec.dst, 0, v2, 0, f, spec.isPosition);
      }
    } else {
      if (!spec.isTop) {
        f *= (1 - avatar->idleWalkFactor);
      }

      interpolateFlat(spec.dst, 0, spec.dst, 0, v2, 0, f, spec.isPosition);
    }

    _clearXZ(spec.dst, spec.isPosition);
  }

  void _blendUse(AnimationMapping &spec, Avatar *avatar) {
    Animation *useAnimation = nullptr;
    float t2;
    float useTimeS = avatar->useTime / 1000;
    if (avatar->useAnimationIndex >= 0) {
      useAnimation = animationGroups[animationGroupIndexes.Use][avatar->useAnimationIndex];
      t2 = min(useTimeS, useAnimation->duration);
    } else if(avatar->useAnimationComboIndex >= 0) {
      useAnimation = animationGroups[animationGroupIndexes.Use][avatar->useAnimationComboIndex];
      t2 = min(useTimeS, useAnimation->duration);
    } else if (avatar->useAnimationEnvelopeIndices.size() > 0) {
      float totalTime = 0;
      for (unsigned int i = 0; i < avatar->useAnimationEnvelopeIndices.size() - 1; i++) {
        int animationIndex = avatar->useAnimationEnvelopeIndices[i];
        Animation *animation = animationGroups[animationGroupIndexes.Use][animationIndex];
        totalTime += animation->duration;
      }

      if (totalTime > 0) {
        float animationTimeBase = 0;
        for (unsigned int i = 0; i < avatar->useAnimationEnvelopeIndices.size() - 1; i++) {
          int animationIndex = avatar->useAnimationEnvelopeIndices[i];
          Animation *animation = animationGroups[animationGroupIndexes.Use][animationIndex];
          if (useTimeS < (animationTimeBase + animation->duration)) {
            useAnimation = animation;
            break;
          }
          animationTimeBase += animation->duration;
        }
        if (useAnimation != nullptr) { // first iteration
          t2 = min(useTimeS - animationTimeBase, useAnimation->duration);
        } else { // loop
          int secondLastAnimationIndex = avatar->useAnimationEnvelopeIndices[avatar->useAnimationEnvelopeIndices.size() - 2];
          useAnimation = animationGroups[animationGroupIndexes.Use][secondLastAnimationIndex];
          t2 = fmod((useTimeS - animationTimeBase), useAnimation->duration);
        }
      }
    }
    
    _handleDefault(spec, avatar);

    if (useAnimation) {
      if (!spec.isPosition) {
        float *v2 = evaluateInterpolant(useAnimation, spec.index, t2);

        Animation *idleAnimation = animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Idle];
        float t3 = 0;
        float *v3 = evaluateInterpolant(idleAnimation, spec.index, t3);

        invertQuaternionFlat(v3, 0);
        multiplyQuaternionsFlat(spec.dst, 0, v3, 0, spec.dst, 0);
        multiplyQuaternionsFlat(spec.dst, 0, v2, 0, spec.dst, 0);
      } else {
        float *v2 = evaluateInterpolant(useAnimation, spec.index, t2);
        _clearXZ(v2, spec.isPosition);

        Animation *idleAnimation = animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Idle];
        float t3 = 0;
        float *v3 = evaluateInterpolant(idleAnimation, spec.index, t3);

        subVectorsFlat(spec.dst, spec.dst, v3);
        addVectorsFlat(spec.dst, spec.dst, v2);
      }
    }
  }

  void _blendHurt(AnimationMapping &spec, Avatar *avatar) {
    _handleDefault(spec, avatar);

    Animation *hurtAnimation = animationGroups[animationGroupIndexes.Hurt][avatar->hurtAnimationIndex];
    float hurtTimeS = avatar->hurtTime / 1000;
    float t2 = min(hurtTimeS, hurtAnimation->duration);
    if (!spec.isPosition) {
      if (hurtAnimation) {
        float *v2 = evaluateInterpolant(hurtAnimation, spec.index, t2);

        Animation *idleAnimation = animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Idle];
        float t3 = 0;
        float *v3 = evaluateInterpolant(idleAnimation, spec.index, t3);
        
        invertQuaternionFlat(v3, 0);
        multiplyQuaternionsFlat(spec.dst, 0, v3, 0, spec.dst, 0);
        multiplyQuaternionsFlat(spec.dst, 0, v2, 0, spec.dst, 0);
      }
    } else {
      float *v2 = evaluateInterpolant(hurtAnimation, spec.index, t2);

      Animation *idleAnimation = animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Idle];
      float t3 = 0;
      float *v3 = evaluateInterpolant(idleAnimation, spec.index, t3);

      subVectorsFlat(spec.dst, spec.dst, v3);
      addVectorsFlat(spec.dst, spec.dst, v2);
    }
  }

  void _blendAim(AnimationMapping &spec, Avatar *avatar) {
    _handleDefault(spec, avatar);

    Animation *aimAnimation = animationGroups[animationGroupIndexes.Aim][avatar->aimAnimationIndex];
    float t2 = fmod((avatar->aimTime / aimMaxTime), aimAnimation->duration);
    if (!spec.isPosition) {
      if (aimAnimation) {
        float *v2 = evaluateInterpolant(aimAnimation, spec.index, t2);

        Animation *idleAnimation = animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Idle];
        float t3 = 0;
        float *v3 = evaluateInterpolant(idleAnimation, spec.index, t3);

        invertQuaternionFlat(v3, 0);
        multiplyQuaternionsFlat(spec.dst, 0, v3, 0, spec.dst, 0);
        multiplyQuaternionsFlat(spec.dst, 0, v2, 0, spec.dst, 0);
      }
    } else {
      float *v2 = evaluateInterpolant(aimAnimation, spec.index, t2);

      Animation *idleAnimation = animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Idle];
      float t3 = 0;
      float *v3 = evaluateInterpolant(idleAnimation, spec.index, t3);

      subVectorsFlat(spec.dst, spec.dst, v3);
      addVectorsFlat(spec.dst, spec.dst, v2);
    }
  }

  void _blendUnuse(AnimationMapping &spec, Avatar *avatar) {
    _handleDefault(spec, avatar);

    float unuseTimeS = avatar->unuseTime / 1000;
    Animation *unuseAnimation = animationGroups[animationGroupIndexes.Use][avatar->unuseAnimationIndex];
    float t2 = min(unuseTimeS, unuseAnimation->duration);
    float f = min(max(unuseTimeS / unuseAnimation->duration, 0), 1);
    float f2 = std::pow(1 - f, 2);

    if (!spec.isPosition) {
      float *v2 = evaluateInterpolant(unuseAnimation, spec.index, t2);

      Animation *idleAnimation = animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Idle];
      float t3 = 0;
      float *v3 = evaluateInterpolant(idleAnimation, spec.index, t3);
        
      copyValue(localQuaternionArr, spec.dst, spec.isPosition);
      invertQuaternionFlat(v3, 0);
      multiplyQuaternionsFlat(localQuaternionArr, 0, v3, 0, localQuaternionArr, 0);
      multiplyQuaternionsFlat(localQuaternionArr, 0, v2, 0, localQuaternionArr, 0);

      interpolateFlat(spec.dst, 0, spec.dst, 0, localQuaternionArr, 0, f2, spec.isPosition);
    } else {
      float *v2 = evaluateInterpolant(unuseAnimation, spec.index, t2);

      Animation *idleAnimation = animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Idle];
      float t3 = 0;
      float *v3 = evaluateInterpolant(idleAnimation, spec.index, t3);
      
      copyValue(localVectorArr, spec.dst, spec.isPosition);
      subVectorsFlat(localVectorArr, localVectorArr, v3);
      addVectorsFlat(localVectorArr, localVectorArr, v2);

      interpolateFlat(spec.dst, 0, spec.dst, 0, localVectorArr, 0, f2, spec.isPosition);
    }
  }

  void _blendHold(AnimationMapping &spec, Avatar *avatar) {
    _handleDefault(spec, avatar);

    Animation *holdAnimation = animationGroups[animationGroupIndexes.Hold][defaultHoldAnimationIndex];
    float t2 = fmod(AnimationMixer::nowS, holdAnimation->duration);
    float *v2 = evaluateInterpolant(holdAnimation, spec.index, t2);

    if (spec.isTop) {
      if (spec.index == boneIndexes.Left_arm || spec.index == boneIndexes.Right_arm) {
        copyValue(spec.dst, v2, spec.isPosition);
      } else {
        if (spec.isArm) {
          float f = avatar->walkRunFactor * 0.7 + avatar->crouchFactor * (1 - avatar->idleWalkFactor) * 0.5;
          interpolateFlat(spec.dst, 0, spec.dst, 0, identityQuaternion, 0, f, spec.isPosition);
          multiplyQuaternionsFlat(spec.dst, 0, v2, 0, spec.dst, 0);
        } else {
          multiplyQuaternionsFlat(spec.dst, 0, v2, 0, spec.dst, 0);
        }
      }
    }
  }

  void _blendPickUp(AnimationMapping &spec, Avatar *avatar) {

    Animation *pickUpAnimation = animationGroups[animationGroupIndexes.PickUp][pickUpAnimationIndexes.PickUpZelda];
    Animation *pickUpIdleAnimation = animationGroups[animationGroupIndexes.PickUp][pickUpAnimationIndexes.PickUpIdleZelda];

    float t2 = avatar->pickUpTime / 1000;
    if (t2 < pickUpAnimation->duration) {
      float *v2 = evaluateInterpolant(pickUpAnimation, spec.index, t2);
      copyValue(spec.dst, v2, spec.isPosition);
    } else {
      float t3 = fmod((t2 - pickUpAnimation->duration), pickUpIdleAnimation->duration);
      float *v2 = evaluateInterpolant(pickUpIdleAnimation, spec.index, t3);
      copyValue(spec.dst, v2, spec.isPosition);
    }
  }

  void _blendFly(AnimationMapping &spec, Avatar *avatar) {
    if (avatar->flyState || (avatar->flyTime >= 0 && avatar->flyTime < 1000)) {
      float t2 = avatar->flyTime / 1000;
      float f = avatar->flyState ? min(CubicBezierEasing::cubicBezier(t2), 1) : (1 - min(CubicBezierEasing::cubicBezier(t2), 1));
      float *v2 = evaluateInterpolant(animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Float], spec.index, fmod(t2, animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Float]->duration));

      interpolateFlat(spec.dst, 0, spec.dst, 0, v2, 0, f, spec.isPosition);

      if (avatar->holdState && spec.isArm) {
        Animation *holdAnimation = animationGroups[animationGroupIndexes.Hold][defaultHoldAnimationIndex];
        float t2 = fmod(AnimationMixer::nowS, holdAnimation->duration);
        float *v2 = evaluateInterpolant(holdAnimation, spec.index, t2);
        copyValue(spec.dst, v2, spec.isPosition);
      }
      _clearXZ(spec.dst, spec.isPosition);
    }
  };

  void _blendLand(AnimationMapping &spec, Avatar *avatar) {
    if (!avatar->landWithMoving) {
      float animationSpeed = 0.75;
      float landTimeS = avatar->landTime / 1000;
      Animation *landingAnimation = animationGroups[animationGroupIndexes.Land][landAnimationIndexes.Landing];
      float landingAnimationDuration = landingAnimation->duration / animationSpeed;
      float landFactor = landTimeS / landingAnimationDuration;

      if (landFactor > 0 && landFactor <= 1) {
        float t2 = landTimeS * animationSpeed;
        float *v2 = evaluateInterpolant(landingAnimation, spec.index, t2);

        float f = (landingAnimationDuration - landTimeS) / 0.05; // 0.05 = 3 frames
        f = clamp(f, 0, 1);

        interpolateFlat(spec.dst, 0, spec.dst, 0, v2, 0, f, spec.isPosition);
        _clearXZ(spec.dst, spec.isPosition);
      }
    } else {
      float animationSpeed = 0.95;
      float landTimeS = avatar->landTime / 1000;
      Animation *landingAnimation = animationGroups[animationGroupIndexes.Land][landAnimationIndexes.Landing2];
      float landingAnimationDuration = landingAnimation->duration / animationSpeed;
      float landFactor = landTimeS / landingAnimationDuration;

      if (landFactor > 0 && landFactor <= 1) {
        float t2 = landTimeS * animationSpeed;
        float *v2 = evaluateInterpolant(landingAnimation, spec.index, t2);

        /* note: Calculating the time since the player landed on the ground. */
        float f3 = landTimeS / 0.1;
        f3 = clamp(f3, 0, 1);

        /* note: Calculating the time remaining until the landing animation is complete. */
        float f2 = (landingAnimationDuration - landTimeS) / 0.15;
        f2 = clamp(f2, 0, 1);

        float f = min(f3, f2);

        interpolateFlat(spec.dst, 0, spec.dst, 0, v2, 0, f, spec.isPosition);
        _clearXZ(spec.dst, spec.isPosition);
      }
    }
  }

  void _blendFallLoop(AnimationMapping &spec, Avatar *avatar) {
    if (avatar->fallLoopFactor > 0) {
      float t2 = (avatar->fallLoopTime / 1000);
      float *v2 = evaluateInterpolant(animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.FallLoop], spec.index, t2);
      float f = clamp(t2 / 0.3, 0, 1);

      if (avatar->fallLoopFromJump) {
        copyValue(spec.dst, v2, spec.isPosition);
      } else {
        interpolateFlat(spec.dst, 0, spec.dst, 0, v2, 0, f, spec.isPosition);
      }

      _clearXZ(spec.dst, spec.isPosition);
    }
  }

  void _blendSwim(AnimationMapping &spec, Avatar *avatar) {
    if (avatar->swimState) {
      float swimTimeS = avatar->swimTime / 1000;
      float movementsTimeS = avatar->movementsTime / 1000;

      float t2 = fmod(swimTimeS, animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Float]->duration);
      float *v2 = evaluateInterpolant(animationGroups[animationGroupIndexes.Single][singleAnimationIndexes.Float], spec.index, t2);

      float t3 = fmod(movementsTimeS * 1, animationGroups[animationGroupIndexes.Swim][swimAnimationIndexes.Breaststroke]->duration);
      float *v3 = evaluateInterpolant(animationGroups[animationGroupIndexes.Swim][swimAnimationIndexes.Breaststroke], spec.index, t3);

      float t4 = fmod(movementsTimeS * 2, animationGroups[animationGroupIndexes.Swim][swimAnimationIndexes.Freestyle]->duration);
      float *v4 = evaluateInterpolant(animationGroups[animationGroupIndexes.Swim][swimAnimationIndexes.Freestyle], spec.index, t4);

      float f = clamp(swimTimeS / 0.2, 0, 1);

      if (!spec.isPosition) {
        // // can't use idleWalkFactor & walkRunFactor here, otherwise "Impulsive breaststroke swim animation" will turn into "freestyle animation" when speed is fast,
        // // and will turn into "floating" a little when speed is slow.
        // // interpolateFlat(localQuaternionArr, 0, v3, 0, v4, 0, avatar->walkRunFactor, spec.isPosition);
        // // interpolateFlat(v2, 0, v2, 0, localQuaternionArr, 0, avatar->idleWalkFactor, spec.isPosition);
        interpolateFlat(localQuaternionArr, 0, v3, 0, v4, 0, avatar->sprintFactor, spec.isPosition);
        interpolateFlat(v2, 0, v2, 0, localQuaternionArr, 0, avatar->movementsTransitionFactor, spec.isPosition);
        interpolateFlat(spec.dst, 0, spec.dst, 0, v2, 0, f, spec.isPosition);
      } else {
        float liftSwims = 0.05; // lift swims height, prevent head sink in water
        v3[1] += 0.03; // align Swimming.fbx's height to freestyle.fbx
        v3[1] += liftSwims;
        v4[1] += liftSwims;
        interpolateFlat(localQuaternionArr, 0, v3, 0, v4, 0, avatar->sprintFactor, spec.isPosition);
        interpolateFlat(v2, 0, v2, 0, localQuaternionArr, 0, avatar->movementsTransitionFactor, spec.isPosition);
        interpolateFlat(spec.dst, 0, spec.dst, 0, v2, 0, f, spec.isPosition);
      }
    }
  }

  void _blendActivate(AnimationMapping &spec, Avatar *avatar) {
    if (avatar->activateTime > 0) {
      int activateAnimationIndex = avatar->activateAnimationIndex < 0 ? defaultActivateAnimationIndex : avatar->activateAnimationIndex;
      Animation *activateAnimation = animationGroups[animationGroupIndexes.Activate][activateAnimationIndex];
      float t2 = fmod((avatar->activateTime / 1000), activateAnimation->duration);
      float *v2 = evaluateInterpolant(activateAnimation, spec.index, t2);

      float f = avatar->activateTime > 0 ? min(CubicBezierEasing::cubicBezier(t2), 1) : (1 - min(CubicBezierEasing::cubicBezier(t2), 1));

      if (spec.index == boneIndexes.Spine || spec.index == boneIndexes.Chest || spec.index == boneIndexes.UpperChest || spec.index == boneIndexes.Neck || spec.index == boneIndexes.Head) {
        if (!spec.isPosition) {
          multiplyQuaternionsFlat(spec.dst, 0, v2, 0, spec.dst, 0);
        } else {
          interpolateFlat(spec.dst, 0, spec.dst, 0, v2, 0, f, spec.isPosition);
        }
      } else {
        if (!spec.isTop) {
          f *= (1 - avatar->idleWalkFactor);
        }
        interpolateFlat(spec.dst, 0, spec.dst, 0, v2, 0, f, spec.isPosition);
      }
    }
  }

  float *AnimationMixer::update(float now, float nowS) {
    AnimationMixer::nowS = nowS;

    for (int i = 0; i < _animationMappings.size(); i++) {
      AnimationMapping spec = _animationMappings[i];

      // note: Use exaclty same early return logic as js version, instead of all cascading, to prevent some bugs. But still want to use all cascading afterwards.
      if (avatar->doubleJumpState) {
        _blendDoubleJump(spec, this->avatar);
      } else if (avatar->jumpState) {
        _blendJump(spec, this->avatar);
      } else if (avatar->sitState) {
        _blendSit(spec, this->avatar);
      } else if (avatar->narutoRunState && !avatar->crouchState) {
        _blendNarutoRun(spec, this->avatar);
      } else if (avatar->danceFactor > 0) {
        _blendDance(spec, this->avatar);
      } else if (avatar->emoteFactor > 0) {
        _blendEmote(spec, this->avatar);
      } else if (
        avatar->useAnimationIndex >= 0 ||
        avatar->useAnimationComboIndex >= 0 ||
        avatar->useAnimationEnvelopeIndices.size() > 0
      ) {
        _blendUse(spec, this->avatar);
      } else if (avatar->hurtAnimationIndex >= 0) {
        _blendHurt(spec, this->avatar);
      } else if (avatar->aimAnimationIndex >= 0) {
        _blendAim(spec, this->avatar);
      } else if (avatar->unuseAnimationIndex >= 0 && avatar->unuseTime >= 0) {
        _blendUnuse(spec, this->avatar);
      } else if (avatar->holdState) {
        _blendHold(spec, this->avatar);
      } else if (avatar->pickUpState) {
        _blendPickUp(spec, this->avatar);
      } else {
        _handleDefault(spec, this->avatar);
      }

      // note: cascading blending, in order to do transition between all kinds of aniamtions.
      _blendFly(spec, this->avatar);
      _blendFallLoop(spec, this->avatar);
      _blendLand(spec, this->avatar);
      _blendActivate(spec, this->avatar);
      _blendSwim(spec, this->avatar);

      animationValues[i * 4] = spec.dst[0];
      animationValues[i * 4 + 1] = spec.dst[1];
      animationValues[i * 4 + 2] = spec.dst[2];
      animationValues[i * 4 + 3] = spec.dst[3];
    }

    return animationValues;
  }
}