#ifndef _CONVEX_X_
#define _CONVEX_X_

#include "convexhull.h"
#include <concaveman.h>

class ConvexHullResult {
public:
  float *points;
  unsigned int numPoints;
  Plane plane;
  Vec center;
  Vec tang;
  Vec bitang;
};

ConvexHullResult *doConvexHull(float *positions, unsigned int numPositions, float *cameraPosition) {
  Plane plane;
  Vec center;
  plane.setFromPoints((Vec *)positions, numPositions/3, center);
  Vec cameraPos(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
  // std::cout << "plane normal 1 " << plane.normal.x << " " << plane.normal.y << " " << plane.normal.z << " : " << cameraPos.x << " " << cameraPos.y << " " << cameraPos.z << " : " << center.x << " " << center.y << " " << center.z << " : " << plane.normal.dot(cameraPos) << " " << plane.constant << std::endl;
  if (plane.normal.dot(cameraPos - center) < 0) {
    // std::cout << "flip plane normal" << std::endl;
    plane.normal *= -1;
  }
  // std::cout << "plane normal 2 " << plane.normal.x << " " << plane.normal.y << " " << plane.normal.z << std::endl;

  Quat quaternion;
  quaternion.setFromUnitVectors(Vec{0, 0, 1}, plane.normal);
  Vec tang = Vec{1, 0, 0}.applyQuaternion(quaternion);
  Vec bitang = Vec{0, 1, 0}.applyQuaternion(quaternion);

  std::vector<std::array<float, 2>> points(numPositions/3);
  for (unsigned int i = 0; i < points.size(); i++) {
    Vec position(positions[i*3], positions[i*3+1], positions[i*3+2]);
    Vec dp = position - center;
    float u = dp.dot(tang);
    float v = dp.dot(bitang);
    points[i][0] = u;
    points[i][1] = v;
  }

  // std::cout << "convex hull 1" << std::endl;
  std::vector<int> hull = convexHull(points);
  // std::cout << "convex hull 2" << std::endl;
  std::vector<std::array<float, 2>> concave = concaveman<float, 16>(points, hull, 2, 0.01);
  // std::cout << "convex hull 3" << std::endl;
  std::vector<std::array<float, 2>> *outPointsPtr = new std::vector<std::array<float, 2>>(std::move(concave));
  // std::cout << "convex hull " << points.size() << " " << hull.size() << " " << outPointsPtr->size() << std::endl;

  ConvexHullResult *result = new ConvexHullResult();
  result->points = (float *)outPointsPtr->data();
  result->numPoints = outPointsPtr->size()*2;
  result->plane = plane;
  result->center = center;
  result->tang = tang;
  result->bitang = bitang;
  return result;
}
void doDeleteConvexHullResult(ConvexHullResult *result) {
  delete result;
}

#endif //DAA_CONVEXHULL_CHALGORITHMS_H