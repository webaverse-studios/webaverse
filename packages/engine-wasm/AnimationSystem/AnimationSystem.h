#ifndef _ANIMATIONSYSTEM_H
#define _ANIMATIONSYSTEM_H
#include "physics.h"
#include <iostream>
#include "nlohmann/json.hpp"
using json = nlohmann::json;

// --- actionInterpolants
class ScalarInterpolant {
public:
  bool evaluatee;
  float value;
  float minValue;
  float maxValue;
  ScalarInterpolant(float minValue, float maxValue) {
    this->value = minValue;
    this->minValue = minValue;
    this->maxValue = maxValue;
  }
  virtual float get() {
    return this->value;
  }
  virtual float getNormalized() {
    return this->value / (this->maxValue - this->minValue);
  }
  virtual float getInverse() {
    return this->maxValue - this->value;
  }
  virtual void update(float timeDiff, bool evaluatee) { }
};
class BiActionInterpolant: public ScalarInterpolant {
public:
  using ScalarInterpolant::ScalarInterpolant;
  void update(float timeDiff, bool evaluatee) {
    this->value += (evaluatee ? 1 : -1) * timeDiff;
    this->value = fmin(fmax(this->value, this->minValue), this->maxValue);
  }
};
class UniActionInterpolant: public ScalarInterpolant {
public:
  using ScalarInterpolant::ScalarInterpolant;
  void update(float timeDiff, bool evaluatee) {
    if (evaluatee) {
      this->value += timeDiff;
      this->value = fmin(fmax(this->value, this->minValue), this->maxValue);
    } else {
      this->value = this->minValue;
    }
  }
};
class InfiniteActionInterpolant: public ScalarInterpolant {
public:
  InfiniteActionInterpolant(float minValue): ScalarInterpolant(minValue, std::numeric_limits<float>::infinity()) { }
  void update(float timeDiff, bool evaluatee) {
    if (evaluatee) {
      this->value += timeDiff;
    } else {
      this->value = this->minValue;
    }
  }
};
// --- End: actionInterpolants

namespace AnimationSystem {
  struct Interpolant;
  struct Animation;
  struct AnimationMapping;
  class Avatar;
  class AnimationNode;
  class AnimationMixer;

  struct Interpolant {
    unsigned int numParameterPositions;
    float *parameterPositions;
    float resultBuffer[4];
    unsigned int numSampleValues;
    float *sampleValues;
    unsigned int valueSize;
  };
  struct Animation {
    float duration;
    std::vector<Interpolant *> interpolants;
    unsigned int currentInterpolantIndex = 0;
    unsigned int index;
    std::string name;
  };
  struct AnimationMapping { // spec
    float dst[4];
    bool isPosition;
    unsigned int index;
    std::string boneName;
    bool isTop;
    bool isArm;
  };

  class Avatar {
  public:

    std::unordered_map<std::string, json> actions;
    std::unordered_map<std::string, ScalarInterpolant *> actionInterpolants;

    AnimationMixer *mixer;

    // values
    float activateTime;
    float landTime;
    float fallLoopFactor;
    float fallLoopTime;
    float flyTime;
    float doubleJumpTime;
    float jumpTime;
    float narutoRunTime;
    float danceFactor;
    float emoteFactor;
    float lastEmoteTime;
    float idleWalkFactor;
    float useTime;
    float useAnimationEnvelopeLength;
    float hurtTime;
    float unuseTime;
    float aimTime;
    float aimMaxTime;
    float walkRunFactor;
    float crouchFactor;
    float pickUpTime;
    float forwardFactor;
    float backwardFactor;
    float leftFactor;
    float rightFactor;
    float mirrorLeftFactorReverse;
    float mirrorLeftFactor;
    float mirrorRightFactorReverse;
    float mirrorRightFactor;
    float landTimeS;
    float timeSinceLastMoveS;
    float swimTime;
    float movementsTime;
    float sprintFactor;
    float movementsTransitionFactor;

    // states
    bool jumpState;
    bool doubleJumpState;
    bool flyState;
    bool crouchState;
    bool narutoRunState;
    bool sitState;
    bool holdState;
    bool pickUpState;
    bool swimState;
    bool activateState;
    bool useState;
    bool aimState;
    bool fallLoopState;
    bool danceState;
    bool emoteState;
    bool hurtState;
    bool rightHandState;
    bool leftHandState;
    bool sprintState;
    bool movementsState;

    //
    bool landWithMoving;
    bool fallLoopFromJump;

    int activateAnimationIndex;
    int sitAnimationIndex;
    int danceAnimationIndex;
    int emoteAnimationIndex;
    int useAnimationIndex;
    int useAnimationComboIndex;
    int hurtAnimationIndex;
    int unuseAnimationIndex;
    int aimAnimationIndex;

    std::vector<int> useAnimationEnvelopeIndices;

    //
    
    void updateInterpolation(float timeDiff); // note: call before `update()`
    void update(float *scratchStack);
    void addAction(char *scratchStack, unsigned int stringByteLength);
    void removeAction(char *scratchStack, unsigned int stringByteLength);
    float getActionInterpolant(char *scratchStack, unsigned int stringByteLength, unsigned int type = 0); // 0: get(), 1: getNormalized(), 2: getInverse()
  };
  class AnimationMixer {
  public:
    static float nowS;

    Avatar *avatar;
    float *animationValues;

    float *update(float now, float nowS);
  };

  // ------
  // need run in this order
  void createAnimationMapping(bool isPosition, unsigned int index, bool isTop, bool isArm, char *scratchStack, unsigned int nameByteLength);
  Animation *createAnimation(char *scratchStack, unsigned int nameByteLength, float duration);
  void createAnimationInterpolant(Animation *animation, unsigned int numParameterPositions, float *parameterPositions, unsigned int numSampleValues, float *sampleValues, unsigned int valueSize);
  unsigned int initAnimationSystem(char *scratchStack);
  AnimationMixer *createAnimationMixer();
  Avatar *createAnimationAvatar(AnimationMixer *mixer);
  // end: need run in this order
};

#endif // _ANIMATIONSYSTEM_H
