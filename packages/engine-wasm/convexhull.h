#ifndef _CONVEX_HULL_H_
#define _CONVEX_HULL_H_

#include <vector>
#include <deque>

bool isTurnRight(const std::array<float, 2> &point1, const std::array<float, 2> &point2, const std::array<float, 2> &point3) {
  float x1 = point1[0],
    x2 = point2[0],
    x3 = point3[0],
    y1 = point1[1],
    y2 = point2[1],
    y3 = point3[1];

  return ((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)) > 0;
}

void removePoints(std::deque<int> &arr, const std::vector<std::array<float, 2>> &points) {
  while (arr.size() >= 3 && !isTurnRight(points[arr[arr.size()-3]], points[arr[arr.size()-2]], points[arr[arr.size()-1]])) {
    arr.erase(arr.begin() + (arr.size() - 2));
    // arr.splice(arr.size()-2, 1);
  }
}

std::vector<int> convexHull(const std::vector<std::array<float, 2>> &points) {
  std::deque<int> upperArr;
  std::deque<int> lowerArr;

  std::vector<int> clone(points.size());
  for (int i = 0; i < clone.size(); i++) {
    clone[i] = i;
  }
  std::sort(clone.begin(), clone.end(), [&](int a, int b) -> bool {
    const std::array<float, 2> &pa = points[a];
    const std::array<float, 2> &pb = points[b];
    return pa[0] < pb[0];
  });

  // calculate the upper hull
  for (int i = 0; i < clone.size(); i++) {
    int pointIndex = clone[i];
    upperArr.push_back(pointIndex);
    removePoints(upperArr, points);
  }

  // calculate the lower hull
  for (int j = clone.size() - 1; j >= 0; j--) {
    int pointIndex = clone[j];
    lowerArr.push_back(pointIndex);
    removePoints(lowerArr, points);
  }

  lowerArr.pop_front();
  lowerArr.pop_back();

  // concat hulls
  std::vector<int> result(upperArr.size() + lowerArr.size());
  unsigned int index = 0;
  for (unsigned int i = 0; i < upperArr.size(); i++) {
    result[index++] = upperArr[i];
  }
  for (unsigned int i = 0; i < lowerArr.size(); i++) {
    result[index++] = lowerArr[i];
  }
  return std::move(result);
}

#endif