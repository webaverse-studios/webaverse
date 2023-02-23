export const setPerspectiveCameraFromJson = (camera, cameraJson) => {
  camera.position.fromArray(cameraJson.position);
  camera.quaternion.fromArray(cameraJson.quaternion);
  camera.scale.fromArray(cameraJson.scale);
  camera.updateMatrixWorld();
  camera.near = cameraJson.near;
  camera.far = cameraJson.far;
  camera.fov = cameraJson.fov;
  camera.updateProjectionMatrix();
  return camera;
};
export const getPerspectiveCameraJson = camera => {
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    scale: camera.scale.toArray(),
    near: camera.near,
    far: camera.far,
    fov: camera.fov,
  };
};

//

export const setOrthographicCameraFromJson = (camera, cameraJson) => {
  camera.position.fromArray(cameraJson.position);
  camera.quaternion.fromArray(cameraJson.quaternion);
  camera.scale.fromArray(cameraJson.scale);
  camera.updateMatrixWorld();
  camera.near = cameraJson.near;
  camera.far = cameraJson.far;
  camera.left = cameraJson.left;
  camera.right = cameraJson.right;
  camera.top = cameraJson.top;
  camera.bottom = cameraJson.bottom;
  camera.updateProjectionMatrix();
  return camera;
};
export const getOrthographicCameraJson = camera => {
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    scale: camera.scale.toArray(),
    near: camera.near,
    far: camera.far,
    left: camera.left,
    right: camera.right,
    top: camera.top,
    bottom: camera.bottom,
  };
};