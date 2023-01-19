#ifndef _PATHFINDER_H
#define _PATHFINDER_H

#include "physics.h"
#include <vector>

using namespace physx;

struct Voxel {
  Vec position;
  bool _isStart = false;
  bool _isDest = false;
  bool _isReached = false;
  float _priority = 0;
  float _costSoFar = 0;
  Voxel *_prev = NULL;
  Voxel *_next = NULL;
  Voxel *_leftVoxel = NULL;
  Voxel *_rightVoxel = NULL;
  Voxel *_btmVoxel = NULL;
  Voxel *_topVoxel = NULL;
  Voxel *_backVoxel = NULL;
  Voxel *_frontVoxel = NULL;
  bool _canLeft = false;
  bool _canRight = false;
  bool _canBtm = false;
  bool _canTop = false;
  bool _canBack = false;
  bool _canFront = false;
  bool _isPath = false;
  bool _isFrontier = false;
};

enum DETECT_DIR {
  UNKNOWN = 0,
  UP = 1,
  DOWN = -1,
};

class PathFinder {
public:
PathFinder(std::vector<PxRigidActor *> _actors, float _hy, float _heightTolerance, unsigned int _maxIterdetect, unsigned int _maxIterStep, unsigned int _numIgnorePhysicsIds, unsigned int *_ignorePhysicsIds);
void resetVoxelAStar(Voxel *voxel);
void reset();
float roundToHeightTolerance(float y);
void interpoWaypointResult();
int getIndex(std::vector<Voxel *> v, Voxel * K);
void simplifyWaypointResult(Voxel *result);
Voxel *getVoxel(Vec position);
void setVoxelo(Voxel *voxel);
bool detect(Vec *position, bool isGlobal);
bool detect(Vec *position);
Voxel *createVoxel(Vec position);
void setNextOfPathVoxel(Voxel *voxel);
void found(Voxel *voxel);
void generateVoxelMapLeft(Voxel *currentVoxel);
void generateVoxelMapRight(Voxel *currentVoxel);
void generateVoxelMapBtm(Voxel *currentVoxel);
void generateVoxelMapTop(Voxel *currentVoxel);
void generateVoxelMapBack(Voxel *currentVoxel);
void generateVoxelMapFront(Voxel *currentVoxel);
void stepVoxel(Voxel *voxel, Voxel *prevVoxel, float cost);
void step();
void untilFound();
void detectDestGlobal(Vec *position, DETECT_DIR detectDir);
std::vector<Voxel *> getPath(Vec _start, Vec _dest, bool _isWalk);

//

std::vector<PxRigidActor *> actors;
Vec up = Vec(0, 1, 0);
float heightTolerance;
unsigned int maxIterStep;
unsigned int *ignorePhysicsIds;
unsigned int iterStep = 0;
bool allowNearest = true;
unsigned int iterDetect = 0;
unsigned int maxIterDetect;
Vec start;
Vec dest;
Vec startGlobal;
Vec destGlobal;
float voxelHeightHalf;
std::vector<Voxel *> frontiers;
std::vector<Voxel *> voxels;
std::map<std::string, Voxel *> voxelo;
Quat startDestQuaternion;
bool isWalk = true;
bool isFound = false;
std::vector<Voxel *> waypointResult;
Voxel *startVoxel;
Voxel *destVoxel;
PxBoxGeometry geom;
unsigned int numIgnorePhysicsIds;
bool canLeft, canRight, canBtm, canTop, canBack, canFront;
};

#endif
