#include <math.h>
#include <vector>
#include <map>
#include <string>

#include "PathFinder.h"

using namespace physx;

PathFinder::PathFinder(std::vector<PxRigidActor *> _actors, float _hy, float _heightTolerance, unsigned int _maxIterdetect, unsigned int _maxIterStep, unsigned int _numIgnorePhysicsIds, unsigned int *_ignorePhysicsIds) {
  actors = _actors;
  voxelHeightHalf = _hy;
  heightTolerance = _heightTolerance;
  maxIterStep = _maxIterStep;
  maxIterDetect = _maxIterdetect;
  geom = PxBoxGeometry(0.5, voxelHeightHalf, 0.5);
  numIgnorePhysicsIds = _numIgnorePhysicsIds;
  ignorePhysicsIds = _ignorePhysicsIds;
}

float PathFinder::roundToHeightTolerance(float y) {
  y = round(y * (1 / heightTolerance)) / (1 / heightTolerance);
  return y;
}

void PathFinder::interpoWaypointResult() {
  Voxel *tempResult = waypointResult[0];
  waypointResult.erase(waypointResult.begin());
  Vec position = tempResult->position;
  while (tempResult->_next) {
    Vec positions2 = tempResult->_next->position;

    tempResult->_next->position.x += position.x;
    tempResult->_next->position.x /= 2;
    tempResult->_next->position.y += position.y;
    tempResult->_next->position.y /= 2;
    tempResult->_next->position.z += position.z;
    tempResult->_next->position.z /= 2;

    tempResult = tempResult->_next;
    position = positions2;
  }
}

// https://stackoverflow.com/a/4609795/3596736
template <typename T> int sgn(T val) {
    return (T(0) < val) - (val < T(0));
}

// https://www.geeksforgeeks.org/how-to-find-index-of-a-given-element-in-a-vector-in-cpp/
int PathFinder::getIndex(std::vector<Voxel *> v, Voxel * K) {
    auto it = find(v.begin(), v.end(), K);
    if (it != v.end()) { // If element was found
        int index = it - v.begin();
        return index;
    }
    else {
        return -1;
    }
}

void PathFinder::simplifyWaypointResult(Voxel *result) {
  if (result && result->_next && result->_next->_next) {
    if (
      sgn(result->_next->_next->position.x - result->_next->position.x) == sgn(result->_next->position.x - result->position.x) &&
      sgn(result->_next->_next->position.z - result->_next->position.z) == sgn(result->_next->position.z - result->position.z)
    ) {
      // js: waypointResult.splice(waypointResult.indexOf(result->_next), 1);
      int index = getIndex(waypointResult, result->_next);
      waypointResult.erase(waypointResult.begin() + index);

      result->_next = result->_next->_next;
      result->_next->_prev = result;
      simplifyWaypointResult(result);
    } else {
      simplifyWaypointResult(result->_next);
    }
  }
}

Voxel *PathFinder::getVoxel(Vec position) {
  if (position.y == -0) position.y = 0;
  // round y and multiply 10 to solve y = such as 0.6000000238418579 problem. why js no such problem?
  std::string key = std::to_string(position.x)+"_"+std::to_string(round(position.y*10))+"_"+std::to_string(position.z);
  return voxelo[key];
}

void PathFinder::setVoxelo(Voxel *voxel) {
  if (voxel->position.y == -0) voxel->position.y = 0;
  // round y and multiply 10 to solve y = such as 0.6000000238418579 problem. why js no such problem?
  std::string key = std::to_string(voxel->position.x)+"_"+std::to_string(round(voxel->position.y*10))+"_"+std::to_string(voxel->position.z);
  voxelo[key] = voxel;
}

bool PathFinder::detect(Vec *position, bool isGlobal) {

  Vec vec;
  if(isGlobal) {
    vec = *position;
  } else {
    vec = *position;
    vec.applyQuaternion(startDestQuaternion);
    vec += startGlobal;
  }
  PxTransform geomPose(PxVec3{vec.x, vec.y, vec.z});
  
  bool anyHadHit = false;
  {
    for (unsigned int i = 0; i < actors.size(); i++) {
      PxRigidActor *actor = actors[i];
      PxShape *shape;
      actor->getShapes(&shape, 1);

      if (shape->getFlags().isSet(PxShapeFlag::eSCENE_QUERY_SHAPE)) {
        PxGeometryHolder holder = shape->getGeometry();
        PxGeometry &geometry = holder.any();

        PxTransform meshPose = actor->getGlobalPose();

        bool result = PxGeometryQuery::overlap(geom, geomPose, geometry, meshPose);
        if (result) {
          const unsigned int id = (unsigned int)actor->userData;
          
          bool includedInIgnores = false;
          for (int i = 0; i < numIgnorePhysicsIds; i++) {
            if (ignorePhysicsIds[i] == id) {
              includedInIgnores = true;
              break;
            }
          }

          if (!includedInIgnores) {
            anyHadHit = true;
            break;
          }
        }
      }
    }
  }
  return anyHadHit;
}

bool PathFinder::detect(Vec *position) {
  return detect(position, false);
}

Voxel *PathFinder::createVoxel(Vec position) {
  Voxel *voxel = (Voxel *)malloc(sizeof(Voxel)); // https://stackoverflow.com/a/18041130/3596736
  *voxel = Voxel();
  voxels.push_back(voxel);

  voxel->position = position;
  setVoxelo(voxel);

  return voxel;
}

void PathFinder::setNextOfPathVoxel(Voxel *voxel) {
  if (voxel != NULL) {
    voxel->_isPath = true;
    if (voxel->_prev) voxel->_prev->_next = voxel;

    setNextOfPathVoxel(voxel->_prev);
  }
}

void PathFinder::found(Voxel *voxel) {
  isFound = true;
  setNextOfPathVoxel(voxel);

  Voxel wayPoint = *startVoxel;
  Voxel *result = (Voxel *)malloc(sizeof(Voxel)); // https://stackoverflow.com/a/18041130/3596736
  *result = wayPoint;
  waypointResult.push_back(result);
  while (wayPoint._next) {
    wayPoint = *wayPoint._next;

    result->_next = (Voxel *)malloc(sizeof(Voxel)); // https://stackoverflow.com/a/18041130/3596736
    *result->_next = wayPoint;
    waypointResult.push_back(result->_next);

    result->_next->_prev = result;

    result = result->_next;
  }
}

void PathFinder::generateVoxelMapLeft(Voxel *currentVoxel) {
  Vec position = currentVoxel->position;
  position.x += -1;
  position.y = roundToHeightTolerance(position.y);

  Voxel *neighborVoxel = getVoxel(position);
  if (!neighborVoxel) {
    bool collide = detect(&position);
    if (!collide) {
      neighborVoxel = createVoxel(position);
    }
  }

  if (neighborVoxel) {
    currentVoxel->_leftVoxel = neighborVoxel;
    currentVoxel->_canLeft = true;
  }
}

void PathFinder::generateVoxelMapRight(Voxel *currentVoxel) {
  Vec position = currentVoxel->position;
  position.x += 1;
  position.y = roundToHeightTolerance(position.y);

  Voxel *neighborVoxel = getVoxel(position);
  if (!neighborVoxel) {
    bool collide = detect(&position);
    if (!collide) {
      neighborVoxel = createVoxel(position);
    }
  }

  if (neighborVoxel) {
    currentVoxel->_rightVoxel = neighborVoxel;
    currentVoxel->_canRight = true;
  }
}

void PathFinder::generateVoxelMapBtm(Voxel *currentVoxel) {
  Vec position = currentVoxel->position;
  position.y += -heightTolerance;
  position.y = roundToHeightTolerance(position.y);

  Voxel *neighborVoxel = getVoxel(position);
  if (!neighborVoxel) {
    bool collide = detect(&position);
    if (!collide) {
      neighborVoxel = createVoxel(position);
    }
  }

  if (neighborVoxel) {
    currentVoxel->_btmVoxel = neighborVoxel;
    currentVoxel->_canBtm = true;
  }
}

void PathFinder::generateVoxelMapTop(Voxel *currentVoxel) {
  Vec position = currentVoxel->position;
  position.y += heightTolerance;
  position.y = roundToHeightTolerance(position.y);

  Voxel *neighborVoxel = getVoxel(position);
  if (!neighborVoxel) {
    bool collide = detect(&position);
    if (!collide) {
      neighborVoxel = createVoxel(position);
    }
  }

  if (neighborVoxel) {
    currentVoxel->_topVoxel = neighborVoxel;
    currentVoxel->_canTop = true;
  }
}

void PathFinder::generateVoxelMapBack(Voxel *currentVoxel) {
  Vec position = currentVoxel->position;
  position.z += -1;
  position.y = roundToHeightTolerance(position.y);

  Voxel *neighborVoxel = getVoxel(position);
  if (!neighborVoxel) {
    bool collide = detect(&position);
    if (!collide) {
      neighborVoxel = createVoxel(position);
    }
  }

  if (neighborVoxel) {
    currentVoxel->_backVoxel = neighborVoxel;
    currentVoxel->_canBack = true;
  }
}

void PathFinder::generateVoxelMapFront(Voxel *currentVoxel) {
  Vec position = currentVoxel->position;
  position.z += 1;
  position.y = roundToHeightTolerance(position.y);

  Voxel *neighborVoxel = getVoxel(position);
  if (!neighborVoxel) {
    bool collide = detect(&position);
    if (!collide) {
      neighborVoxel = createVoxel(position);
    }
  }

  if (neighborVoxel) {
    currentVoxel->_frontVoxel = neighborVoxel;
    currentVoxel->_canFront = true;
  }
}

bool compareVoxelPriority(Voxel *a, Voxel *b) {
  return (a->_priority < b->_priority);
}

void PathFinder::stepVoxel(Voxel *voxel, Voxel *prevVoxel, float cost) {
  float newCost = prevVoxel->_costSoFar + cost;

  if (voxel->_isReached == false) {
    voxel->_isReached = true;
    voxel->_costSoFar = newCost;
    voxel->_priority = voxel->position.distanceTo(dest);
    voxel->_priority += newCost;
    frontiers.push_back(voxel);
    // js: frontiers.sort((a, b) => a._priority - b._priority);
    sort(frontiers.begin(), frontiers.end(), compareVoxelPriority);

    voxel->_isFrontier = true;
    voxel->_prev = prevVoxel;

    if (voxel->_isDest) {
      found(voxel);
    }
  }
}

void PathFinder::step() {
  if (frontiers.size() <= 0) {
    return;
  }
  if (isFound) return;

  Voxel *currentVoxel = frontiers[0];
  frontiers.erase(frontiers.begin()); // js: shift
  currentVoxel->_isFrontier = false;
  
  if (isWalk) {
    Vec position = currentVoxel->position;
    position.y -= heightTolerance;
    bool btmEmpty = !detect(&position);
    Voxel *btmVoxel = getVoxel(position);
    if (btmEmpty) {
      if (btmVoxel && btmVoxel == currentVoxel->_prev) {
        canLeft = true;
        canRight = true;
        canBtm = true;
        canTop = false;
        canBack = true;
        canFront = true;
      } else {
        canLeft = false;
        canRight = false;
        canBtm = true;
        canTop = false;
        canBack = false;
        canFront = false;
      }
    } else {
      canLeft = true;
      canRight = true;
      canBtm = true;
      canTop = true;
      canBack = true;
      canFront = true;
    }
  } else {
    canLeft = true;
    canRight = true;
    canBtm = true;
    canTop = true;
    canBack = true;
    canFront = true;
  }

  if (canLeft) {
    if (!currentVoxel->_leftVoxel) generateVoxelMapLeft(currentVoxel);
    if (currentVoxel->_canLeft) {
      stepVoxel(currentVoxel->_leftVoxel, currentVoxel, 1);
      if (isFound) return;
    }
  }

  if (canRight) {
    if (!currentVoxel->_rightVoxel) generateVoxelMapRight(currentVoxel);
    if (currentVoxel->_canRight) {
      stepVoxel(currentVoxel->_rightVoxel, currentVoxel, 1);
      if (isFound) return;
    }
  }

  if (canBtm) {
    if (!currentVoxel->_btmVoxel) generateVoxelMapBtm(currentVoxel);
    if (currentVoxel->_canBtm) {
      stepVoxel(currentVoxel->_btmVoxel, currentVoxel, heightTolerance);
      if (isFound) return;
    }
  }

  if (canTop) {
    if (!currentVoxel->_topVoxel) generateVoxelMapTop(currentVoxel);
    if (currentVoxel->_canTop) {
      stepVoxel(currentVoxel->_topVoxel, currentVoxel, heightTolerance);
      if (isFound) return;
    }
  }

  if (canBack) {
    if (!currentVoxel->_backVoxel) generateVoxelMapBack(currentVoxel);
    if (currentVoxel->_canBack) {
      stepVoxel(currentVoxel->_backVoxel, currentVoxel, 1);
      if (isFound) return;
    }
  }

  if (canFront) {
    if (!currentVoxel->_frontVoxel) generateVoxelMapFront(currentVoxel);
    if (currentVoxel->_canFront) {
      stepVoxel(currentVoxel->_frontVoxel, currentVoxel, 1);
      if (isFound) return;
    }
  }

}

void PathFinder::untilFound() {
  iterStep = 0;
  while (frontiers.size() > 0 && !isFound) {
    if (iterStep >= maxIterStep) {

      if (allowNearest) {
        float minDistanceSquared = std::numeric_limits<float>::infinity();
        Voxel *minDistanceSquaredFrontier;
        int len = frontiers.size();
        for (int i = 0; i < len; i++) {
          Voxel *frontier = frontiers[i];
          float distanceSquared = frontier->position.distanceToSq(dest);
          if (distanceSquared < minDistanceSquared) {
            minDistanceSquared = distanceSquared;
            minDistanceSquaredFrontier = frontier;
          }
        }
        if (minDistanceSquaredFrontier) { // May all frontiers disappeared because of enclosed by obstacles, thus no minDistanceSquaredFrontier.
          found(minDistanceSquaredFrontier);
        }
      }

      return;
    }
    iterStep++;

    step();
  }
}

void PathFinder::detectDestGlobal(Vec *position, DETECT_DIR detectDir) {
  if (iterDetect >= maxIterDetect) {
    return;
  }
  iterDetect++;

  bool collide = detect(position, true);

  if (detectDir == DETECT_DIR::UNKNOWN) {
    if (collide) {
      detectDir = DETECT_DIR::UP;
    } else {
      detectDir = DETECT_DIR::DOWN;
    }
  }

  if (detectDir == DETECT_DIR::UP) {
    if (collide) {
      position->y += detectDir * heightTolerance;
      detectDestGlobal(position, detectDir);
    } else {
      // do nothing, stop recur
    }
  } else if (detectDir == DETECT_DIR::DOWN) {
    if (collide) {
      position->y += heightTolerance;
      // do nothing, stop recur
    } else {
      position->y += detectDir * heightTolerance;
      detectDestGlobal(position, detectDir);
    }
  }
}

std::vector<Voxel *> PathFinder::getPath(Vec _start, Vec _dest, bool _isWalk) {
  isWalk = _isWalk;

  startGlobal = _start;
  destGlobal = _dest;
  if(isWalk) {
    detectDestGlobal(&destGlobal, DETECT_DIR::DOWN);
  }

  Matrix matrix;
  matrix.identity();
  if(isWalk) {
    Vec vec = destGlobal;
    vec.y = startGlobal.y;
    matrix.lookAt(vec, startGlobal, up);
  } else {
    matrix.lookAt(destGlobal, startGlobal, up);
  }

  startDestQuaternion.setFromRotationMatrix(matrix);

  start.x = 0;
  start.y = 0;
  start.z = 0;
  if(isWalk) {
    dest.x = 0;
    dest.y = roundToHeightTolerance(destGlobal.y - startGlobal.y);
    Vec vec = destGlobal - startGlobal;
    vec.y = 0;
    dest.z = round(vec.magnitude());
  } else {
    dest.x = 0;
    dest.y = 0;
    Vec vec = destGlobal - startGlobal;
    dest.z = round(vec.magnitude());
  }

  startVoxel = createVoxel(start);
  startVoxel->_isStart = true;
  startVoxel->_isReached = true;
  startVoxel->_priority = start.distanceTo(dest);
  startVoxel->_costSoFar = 0;
  frontiers.push_back(startVoxel);

  destVoxel = createVoxel(dest);
  destVoxel->_isDest = true;

  if (startVoxel == destVoxel) {
    found(destVoxel);
  } else {
    untilFound();
    if (isFound) {
      interpoWaypointResult();
      simplifyWaypointResult(waypointResult[0]);
      waypointResult.erase(waypointResult.begin()); // js: waypointResult.shift();
    }
  }

  if (isFound) {
    for (int i = 0; i < waypointResult.size(); i++) {
      Voxel *result = waypointResult[i];
      result->position.applyQuaternion(startDestQuaternion);
      result->position += startGlobal;
    }
  }

  return waypointResult;
}
