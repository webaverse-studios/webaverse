import * as THREE from 'three';

// note: total height of the capsule is capsuleHeight + 2 * capsuleRadius
// the capsule is vertical, with capsulePosition in the center
// the distance from the center to the top and bottom is capsuleHeight / 2 + capsuleRadius
// check whether the given capsule intersects the given transformed box
export function capsuleIntersectsBox(
  capsulePosition,
  capsuleRadius,
  capsuleHeight,
  boxPosition,
  boxQuaternion,
  boxSize
) {
  // first, transform the capsule line into the box's local space
  const capsuleLine = new THREE.Line3(
    capsulePosition.clone().add(
      new THREE.Vector3(0, capsuleHeight / 2 + capsuleRadius, 0)
    ),
    capsulePosition.clone().add(
      new THREE.Vector3(0, -capsuleHeight / 2 - capsuleRadius, 0)
    )
  );
  capsuleLine.start.sub(boxPosition).applyQuaternion(boxQuaternion.clone().invert());
  capsuleLine.end.sub(boxPosition).applyQuaternion(boxQuaternion.clone().invert());
  // then, get the intersection in the box's local space
  return capsuleIntersectsAABB(
    capsuleLine,
    capsuleRadius,
    boxSize
  );
}
function capsuleIntersectsAABB(capsuleLine, capsuleRadius, boxSize) {
  const closestPointToCenter = capsuleLine.closestPointToPoint(
    new THREE.Vector3(0, 0, 0),
    true,
    new THREE.Vector3()
  );
  if (
    Math.abs(closestPointToCenter.x) <= boxSize.x / 2 + capsuleRadius &&
    Math.abs(closestPointToCenter.y) <= boxSize.y / 2 + capsuleRadius &&
    Math.abs(closestPointToCenter.z) <= boxSize.z / 2 + capsuleRadius
  ) {
    return true;
  } else {
    return false;
  }
}