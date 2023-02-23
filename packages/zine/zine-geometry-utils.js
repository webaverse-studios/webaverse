import * as THREE from 'three';
import {
  pointcloudStride,
} from './zine-constants.js';
import {colors, rainbowColors, detectronColors} from './zine-colors.js';

//

const localVector = new THREE.Vector3();
const localBox = new THREE.Box3();
const localColor = new THREE.Color();

//

export function bilinearInterpolate(
  values,
  width,
  height,
  px,
  pz,
) {
  // first, compute the sample coordinates:
  const x = Math.floor(px * width);
  const z = Math.floor(pz * height);
  const x1 = Math.min(x + 1, width - 1);
  const z1 = Math.min(z + 1, height - 1);
  const index = z * width + x;
  const index1 = z * width + x1;
  const index2 = z1 * width + x;
  const index3 = z1 * width + x1;
  
  // then, compute the interpolation coefficients:
  const fx = px * width - x;
  const fz = pz * height - z;
  const fx1 = 1 - fx;
  const fz1 = 1 - fz;

  // and finally, interpolate:
  return (
    values[index] * fx1 * fz1 +
    values[index1] * fx * fz1 +
    values[index2] * fx1 * fz +
    values[index3] * fx * fz
  );
}
export function bilinearInterpolateChecked(
  values,
  width,
  height,
  px,
  pz,
  checkFn,
) {
  // first, compute the sample coordinates:
  const x = Math.floor(px * width);
  const z = Math.floor(pz * height);
  const x1 = Math.min(x + 1, width - 1);
  const z1 = Math.min(z + 1, height - 1);
  const index = z * width + x;
  const index1 = z * width + x1;
  const index2 = z1 * width + x;
  const index3 = z1 * width + x1;
  
  // then, compute the interpolation coefficients:
  const fx = px * width - x;
  const fz = pz * height - z;
  const fx1 = 1 - fx;
  const fz1 = 1 - fz;

  // sample
  let a = values[index];
  let b = values[index1];
  let c = values[index2];
  let d = values[index3];

  // check validity
  const aValid = checkFn(a);
  const bValid = checkFn(b);
  const cValid = checkFn(c);
  const dValid = checkFn(d);
  const validPoints = [
    aValid ? a : null,
    bValid ? b : null,
    cValid ? c : null,
    dValid ? d : null,
  ].filter(v => v !== null);
  if (validPoints.length > 0) {
    const sum = validPoints.reduce((a, b) => a + b, 0);
    const avgValid = sum / validPoints.length;
    if (!aValid) {
      a = avgValid;
    }
    if (!bValid) {
      b = avgValid;6
    }
    if (!cValid) {
      c = avgValid;
    }
    if (!dValid) {
      d = avgValid;
    }

    // interpolate
    return (
      a * fx1 * fz1 +
      b * fx * fz1 +
      c * fx1 * fz +
      d * fx * fz
    );
  } else {
    return null;
  }
}
export const bilinearInterpolate3 = (() => {
  const localVector = new THREE.Vector3();
  const localVector2 = new THREE.Vector3();
  const localVector3 = new THREE.Vector3();
  const localVector4 = new THREE.Vector3();
  const localVector5 = new THREE.Vector3();

  return (
    values,
    width,
    height,
    px,
    pz,
    targetVector,
  ) => {
    // first, compute the sample coordinates:
    const x = Math.floor(px * (width - 1));
    const z = Math.floor(pz * (height - 1));
    const x1 = Math.min(x + 1, width - 1);
    const z1 = Math.min(z + 1, height - 1);
    const index = (z * width + x) * 3;
    const index1 = (z * width + x1) * 3;
    const index2 = (z1 * width + x) * 3;
    const index3 = (z1 * width + x1) * 3;
    
    // then, compute the interpolation coefficients:
    const fx = px * width - x;
    const fz = pz * height - z;
    const fx1 = 1 - fx;
    const fz1 = 1 - fz;

    // look up the points:
    const p1 = localVector.fromArray(values, index);
    const p2 = localVector2.fromArray(values, index1);
    const p3 = localVector3.fromArray(values, index2);
    const p4 = localVector4.fromArray(values, index3);

    // and finally, interpolate:
    return targetVector.copy(p1).multiplyScalar(fx1 * fz1)
      .add(localVector5.copy(p2).multiplyScalar(fx * fz1))
      .add(localVector5.copy(p3).multiplyScalar(fx1 * fz))
      .add(localVector5.copy(p4).multiplyScalar(fx * fz));
  };
})();

//

function pointCloudArrayBufferToPositionAttributeArray(
  srcArrayBuffer,
  width,
  height,
  scaleFactor,
  dstFloat32Array,
) { 
  const srcFloat32Array = new Float32Array(srcArrayBuffer);
  for (let i = 0, j = 0; i < srcFloat32Array.length; i += 3) {
    let x = srcFloat32Array[i];
    let y = srcFloat32Array[i + 1];
    let z = srcFloat32Array[i + 2];

    x *= scaleFactor;
    y *= -scaleFactor;
    z *= -scaleFactor;

    dstFloat32Array[j + 0] = x;
    dstFloat32Array[j + 1] = y;
    dstFloat32Array[j + 2] = z;

    j += 3;
  }
}
export function pointCloudArrayBufferToPositionAttributeArrayResized(
  srcArrayBuffer,
  width,
  height,
  targetWidth,
  targetHeight,
  scaleFactor,
  dstFloat32Array,
) {
  const srcFloat32Array = new Float32Array(srcArrayBuffer);
  for (let dy = 0; dy < targetHeight; dy++) {
    for (let dx = 0; dx < targetWidth; dx++) {
      // bilinear interpolate
      const px = dx / (targetWidth - 1);
      const py = dy / (targetHeight - 1);

      bilinearInterpolate3(
        srcFloat32Array,
        width,
        height,
        px,
        py,
        localVector,
      );

      let {x, y, z} = localVector;
      // if (isNaN(x) || isNaN(y) || isNaN(z)) {
      //   console.warn('got NaN', {x, y, z, srcFloat32Array, width, height, px, py, localVector});
      //   debugger;
      // }
      x *= scaleFactor;
      y *= -scaleFactor;
      z *= -scaleFactor;

      const dstIndex = (dy * targetWidth + dx) * 3;
      dstFloat32Array[dstIndex] = x;
      dstFloat32Array[dstIndex + 1] = y;
      dstFloat32Array[dstIndex + 2] = z;
    }
  }
  
  // for (let i = 0, j = 0; i < srcArrayBuffer.byteLength; i += pointcloudStride) {
  //   let x = srcDataView.getFloat32(i + 0, true);
  //   let y = srcDataView.getFloat32(i + 4, true);
  //   let z = srcDataView.getFloat32(i + 8, true);

  //   x *= scaleFactor;
  //   y *= -scaleFactor;
  //   z *= -scaleFactor;

  //   dstFloat32Array[j + 0] = x;
  //   dstFloat32Array[j + 1] = y;
  //   dstFloat32Array[j + 2] = z;

  //   j += 3;
  // }
}
function getScaleFactor(width, height) {
  return 1 / width;
}
export function pointCloudArrayBufferToGeometry(
  arrayBuffer,
  width,
  height,
  targetWidth = width,
  targetHeight = height,
) {
  const scaleFactor = getScaleFactor(width, height);
  
  // const width2 = width / pixelStride;
  // const height2 = height / pixelStride;

  // // check that width and height are whole
  // if (width2 % 1 !== 0 || height2 % 1 !== 0) {
  //   throw new Error('width and height must be whole after division by pixelStride');
  // }

  const widthSegments = targetWidth - 1;
  const heightSegments = targetHeight - 1;
  let geometry = new THREE.PlaneGeometry(1, 1, widthSegments, heightSegments);
  // interpolate instead of striding, to support different resolutions
  pointCloudArrayBufferToPositionAttributeArrayResized(
    arrayBuffer,
    width,
    height,
    targetWidth,
    targetHeight,
    scaleFactor,
    geometry.attributes.position.array,
  );
  return geometry;
}

//

export function getBoundingBoxFromPointCloud(pointCloudArrayBuffer, width, height, matrixWorld = null) {
  const pointCloudFloat32Array = new Float32Array(pointCloudArrayBuffer);
  const scaleFactor = getScaleFactor(width, height);
  localBox.min.setScalar(0);
  localBox.max.setScalar(0);
  for (let i = 0; i < pointCloudFloat32Array.length; i += 3) {
    localVector.fromArray(pointCloudFloat32Array, i);
    localVector.x *= scaleFactor;
    localVector.y *= -scaleFactor;
    localVector.z *= -scaleFactor;
    if (matrixWorld) {
      localVector.applyMatrix4(matrixWorld);
    }
    localBox.expandByPoint(localVector);
  }
  return {
    min: localBox.min.toArray(),
    max: localBox.max.toArray(),
  };
}

//

export const reinterpretFloatImageData = imageData => {
  const result = new Float32Array(
    imageData.data.buffer,
    imageData.data.byteOffset,
    imageData.data.byteLength / Float32Array.BYTES_PER_ELEMENT
  );
  const {width, height} = imageData;
  // flip Y
  for (let y = 0; y < height / 2; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const j = (height - 1 - y) * width + x;
      const tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
  }
  return result;
};

//

export function depthFloat32ArrayToPositionAttributeArray(
  depthFloat32Array,
  width,
  height,
  camera,
  float32Array,
) { // result in float32Array
  for (let i = 0; i < depthFloat32Array.length; i++) {
    const x = (i % width) / width;
    let y = Math.floor(i / width) / height;
    y = 1 - y;
  
    const viewZ = depthFloat32Array[i];
    const worldPoint = setCameraViewPositionFromViewZ(x, y, viewZ, camera, localVector);
    const target = worldPoint.applyMatrix4(camera.matrixWorld);

    target.toArray(float32Array, i * 3);
  }
}
export function depthFloat32ArrayToGeometry(
  depthFloat32Array,
  width,
  height,
  camera,
) { // result in float32Array
  const widthSegments = width - 1;
  const heightSegments = height - 1;
  // geometry is camera-relative
  const geometry = new THREE.PlaneGeometry(1, 1, widthSegments, heightSegments);
  depthFloat32ArrayToPositionAttributeArray(
    depthFloat32Array,
    width,
    height,
    camera,
    geometry.attributes.position.array,
  );
  return geometry;
}

//

export function getDepthFloat32ArrayViewPositionPx(
  depthFloat32Array,
  px,
  py,
  width,
  height,
  camera,
  scale,
  target
) {
  px = Math.min(Math.max(px, 0), width - 1);
  py = Math.min(Math.max(py, 0), height - 1);

  let x = px / width;
  let y = py / height;

  const i = py * width + px;
  y = 1 - y;

  const viewZ = depthFloat32Array[i];
  const worldPoint = setCameraViewPositionFromViewZ(x, y, viewZ, camera, target);
  worldPoint.multiply(scale);
  // worldPoint.applyMatrix4(camera.matrixWorld);
  return target;
}
export function getDepthFloat32ArrayWorldPositionPx(
  depthFloat32Array,
  px,
  py,
  width,
  height,
  camera,
  scale,
  target
) {
  px = Math.min(Math.max(px, 0), width - 1);
  py = Math.min(Math.max(py, 0), height - 1);

  let x = px / width;
  let y = py / height;

  const i = py * width + px;
  y = 1 - y;

  const viewZ = depthFloat32Array[i];
  const worldPoint = setCameraViewPositionFromViewZ(x, y, viewZ, camera, target);
  worldPoint.multiply(scale);
  worldPoint.applyMatrix4(camera.matrixWorld);
  return target;
}
export function getDepthFloat32ArrayWorldPosition(
  depthFloat32Array,
  x, // 0..1
  y, // 0..1
  width,
  height,
  camera,
  scale,
  target
) { // result in target
  // compute the snapped pixel index
  let px = Math.floor(x * width);
  let py = Math.floor(y * height);

  px = Math.min(Math.max(px, 0), width - 1);
  py = Math.min(Math.max(py, 0), height - 1);

  const i = py * width + px;
  y = 1 - y;

  const viewZ = depthFloat32Array[i];
  const worldPoint = setCameraViewPositionFromViewZ(x, y, viewZ, camera, target);
  worldPoint.multiply(scale);
  worldPoint.applyMatrix4(camera.matrixWorld);
  return target;
}

//

export function depthFloat32ArrayToOrthographicPositionAttributeArray(
  depthFloat32Array,
  width,
  height,
  camera,
  float32Array,
) { // result in float32Array
  for (let i = 0; i < depthFloat32Array.length; i++) {
    const x = (i % width) / width;
    let y = Math.floor(i / width) / height;
    y = 1 - y;
  
    const viewZ = depthFloat32Array[i];
    const worldPoint = setCameraViewPositionFromOrthographicViewZ(x, y, viewZ, camera, localVector);
    const target = worldPoint.applyMatrix4(camera.matrixWorld);

    target.toArray(float32Array, i * 3);
  }
}
export function depthFloat32ArrayToOrthographicGeometry(
  depthFloat32Array,
  width,
  height,
  camera,
) { // result in float32Array
  const widthSegments = width - 1;
  const heightSegments = height - 1;
  // geometry is camera-relative
  const geometry = new THREE.PlaneGeometry(1, 1, widthSegments, heightSegments);
  depthFloat32ArrayToOrthographicPositionAttributeArray(
    depthFloat32Array,
    width,
    height,
    camera,
    geometry.attributes.position.array,
  );
  return geometry;
}

//

export function depthFloat32ArrayToHeightfield(
  depthFloat32Array,
  width,
  height,
  camera,
) {
  const heightfield = new Float32Array(width * height);
  for (let i = 0; i < depthFloat32Array.length; i++) {
    let x = (i % width);
    let y = Math.floor(i / width);
    x = width - 1 - x;

    const index = x + y * width;

    const viewZ = depthFloat32Array[i];
    const height = camera.position.y - viewZ;
    heightfield[index] = height;
  }
  return heightfield;
}

//

export const getGepthFloatsFromGeometryPositions = geometryPositions => {
  const newDepthFloatImageData = new Float32Array(geometryPositions.length / 3);
  for (let i = 0; i < newDepthFloatImageData.length; i++) {
    newDepthFloatImageData[i] = geometryPositions[i * 3 + 2];
  }
  return newDepthFloatImageData;
};
export const getDepthFloatsFromPointCloud = (pointCloudArrayBuffer, width, height) => {
  const geometryPositions = new Float32Array(width * height * 3);
  const scaleFactor = getScaleFactor(width, height);
  pointCloudArrayBufferToPositionAttributeArray(
    pointCloudArrayBuffer,
    width,
    height,
    scaleFactor,
    geometryPositions,
  );
  return getGepthFloatsFromGeometryPositions(geometryPositions);
};
export const getDepthFloatsFromIndexedGeometry = geometry => getGepthFloatsFromGeometryPositions(geometry.attributes.position.array);

//

export const snapPointCloudToCamera = (pointCloudArrayBuffer, width, height, camera) => {
  pointCloudArrayBuffer = pointCloudArrayBuffer.slice();

  const frustum = localFrustum.setFromProjectionMatrix(camera.projectionMatrix);
  const offset = camera.near;
  // for (const plane of frustum.planes) {
  //   // plane.translate(localVector.set(0, 0, offset));
  // }

  // THREE.JS planes are in the following order:
  // 0: left
  // 1: right
  // 2: top
  // 3: bottom
  // 4: near
  // 5: far

  const scaleFactor = 1 / width;
  const dataView = new DataView(pointCloudArrayBuffer);
  for (let i = 0; i < pointCloudArrayBuffer.byteLength; i += pointcloudStride) {
    let x = dataView.getFloat32(i + 0, true);
    let y = dataView.getFloat32(i + 4, true);
    let z = dataView.getFloat32(i + 8, true);

    x *= scaleFactor;
    y *= -scaleFactor;
    z *= -scaleFactor;

    const p = localVector.set(x, y, z);

    p.z += offset;

    // clamp the point to the camera frustum
    let modified = false;
    // for (let j = 0; j < frustum.planes.length; j++) { // ignore near and far planes?
    for (let j = 0; j < 4; j++) {
      const plane = frustum.planes[j];
      const distance = plane.distanceToPoint(p);
      if (distance < 0) {
        // adjust outwards
        const outerPlane = plane;
        const outerDistance = outerPlane.distanceToPoint(p);
        p.addScaledVector(outerPlane.normal, -outerDistance);
        modified = true;
      }
    }

    // if (modified) {
      // p.z += offset;

      p.x /= scaleFactor;
      p.y /= -scaleFactor;
      p.z /= -scaleFactor;

      dataView.setFloat32(i + 0, p.x, true);
      dataView.setFloat32(i + 4, p.y, true);
      dataView.setFloat32(i + 8, p.z, true);
    // }
  }

  return pointCloudArrayBuffer;
};

//

export function decorateGeometryTriangleIds(geometry) {
  const triangleIdAttribute = new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count), 1);
  for (let i = 0; i < triangleIdAttribute.count; i++) {
    triangleIdAttribute.array[i] = Math.floor(i / 3);
  }
  geometry.setAttribute('triangleId', triangleIdAttribute);
}

//

function viewZToOrthographicDepth(viewZ, near, far) {
  return ( viewZ + near ) / ( near - far );
}
function orthographicDepthToViewZ(orthoZ, near, far) {
  return orthoZ * ( near - far ) - near;
}
export const setCameraViewPositionFromViewZ = (x, y, viewZ, camera, target) => {
  const {near, far, projectionMatrix, projectionMatrixInverse} = camera;
  
  const depth = viewZToOrthographicDepth(viewZ, near, far);

  const clipW = projectionMatrix.elements[2 * 4 + 3] * viewZ + projectionMatrix.elements[3 * 4 + 3];
  const clipPosition = new THREE.Vector4(
    (x - 0.5) * 2,
    (y - 0.5) * 2,
    (depth - 0.5) * 2,
    1
  );
  clipPosition.multiplyScalar(clipW);
  const viewPosition = clipPosition.applyMatrix4(projectionMatrixInverse);
  
  target.x = viewPosition.x;
  target.y = viewPosition.y;
  target.z = viewPosition.z;
  return target;
};
export const setCameraViewPositionFromOrthographicViewZ = (x, y, viewZ, camera, target) => {
  const {near, far, projectionMatrix, projectionMatrixInverse} = camera;

  // if (isNaN(viewZ)) {
  //   console.warn('viewZ is nan', viewZ, near, far);
  //   debugger;
  // }

  const depth = viewZToOrthographicDepth(viewZ, near, far);
  // const depth = viewZ;
  // if (isNaN(depth)) {
  //   console.warn('depth is nan', depth, viewZ, near, far);
  //   debugger;
  // }

  // get the ndc point, which we will use for the unproject
  const ndcPoint = new THREE.Vector3(
    (x - 0.5) * 2,
    (y - 0.5) * 2,
    (depth - 0.5) * 2
  );
  // if (isNaN(ndcPoint.x)) {
  //   console.warn('ndcPoint.x is nan', ndcPoint.toArray());
  //   debugger;
  // }

  // apply the unprojection
  const worldPoint = ndcPoint.clone()
    // .unproject(camera);
    .applyMatrix4(projectionMatrixInverse);

  // if (isNaN(worldPoint.x)) {
  //   console.warn('worldPoint.x is nan', worldPoint.toArray());
  //   debugger;
  // }

  target.x = worldPoint.x;
  target.y = worldPoint.y;
  target.z = worldPoint.z;
  return target;
}

//

export const getDoubleSidedGeometry = geometry => {
  const geometry2 = geometry.clone();
  // double-side the geometry
  const indices = geometry2.index.array;
  const newIndices = new indices.constructor(indices.length * 2);
  newIndices.set(indices);
  // the second set of indices is flipped
  for (let i = 0; i < indices.length; i += 3) {
    newIndices[indices.length + i + 0] = indices[i + 2];
    newIndices[indices.length + i + 1] = indices[i + 1];
    newIndices[indices.length + i + 2] = indices[i + 0];
  }
  geometry2.setIndex(new THREE.BufferAttribute(newIndices, 1));
  return geometry2;
};

//

export const getGeometryHeights = (geometry, width, height, heightfieldScale) => {
  const heights = new Int16Array(geometry.attributes.position.array.length / 3);
  let writeIndex = 0;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const ax = dx;
      const ay = height - 1 - dy;
      // XXX this is WRONG!
      // we should index by ay * width + ax
      // however, because of a bug which computes this wrong, we have to do it this way
      const readIndex = ax * width + ay;

      const y = geometry.attributes.position.array[readIndex * 3 + 1];
      heights[writeIndex] = Math.round(y / heightfieldScale);

      writeIndex++;
    }
  }
  return heights;
};

export const reconstructPointCloudFromDepthField = (
  depthFieldArrayBuffer,
  width,
  height,
  fov,
) => {
  const depthField = new Float32Array(depthFieldArrayBuffer);
  const focal = height / 2 / Math.tan((fov / 2.0) * Math.PI / 180);
  const pointCloud = new Float32Array(width * height * 3);
  const cu = width / 2;
  const cv = height / 2;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const index = dy * width + dx;
      const depth = depthField[index];

      const u = dx;
      const v = dy;
      const x = (u - cu) * depth / focal;
      const y = (v - cv) * depth / focal;
      const z = depth;

      pointCloud[index * 3 + 0] = x;
      pointCloud[index * 3 + 1] = y;
      pointCloud[index * 3 + 2] = z;
    }
  }
  return pointCloud;
};

//

export const getColorArrayFromValueArray = (mask) => {
  const colorArray = new Float32Array(mask.length * 3);
  for (let i = 0; i < mask.length; i++) {
    const value = mask[i];
    if (value !== -1) {
      const c = localColor.setHex(colors[value % colors.length]);
      colorArray[i * 3 + 0] = c.r;
      colorArray[i * 3 + 1] = c.g;
      colorArray[i * 3 + 2] = c.b;
    }
  }
  return colorArray;
};
export const getHighlightArrayFromValueArray = (mask) => {
  const colorArray = new Float32Array(mask.length * 3);
  for (let i = 0; i < mask.length; i++) {
    const value = mask[i];
    const highlight = value !== 0;

    const c = localColor.setHex(highlight ? 0xFFFFFF : 0x000000);
    colorArray[i * 3 + 0] = c.r;
    colorArray[i * 3 + 1] = c.g;
    colorArray[i * 3 + 2] = c.b;
  }
  return colorArray;
};