import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
// import alea from 'alea';
import {
  mainImageKey,
} from './zine-data-specs.js';
import {
  // makePromise,
  makeDefaultCamera,
  range,
} from './zine-utils.js';
import {
  reconstructPointCloudFromDepthField,
  // getDepthFloatsFromIndexedGeometry,
  // reinterpretFloatImageData,
  pointCloudArrayBufferToGeometry,
  decorateGeometryTriangleIds,
  depthFloat32ArrayToOrthographicGeometry,
  getColorArrayFromValueArray,
  getHighlightArrayFromValueArray,
} from '../zine/zine-geometry-utils.js';
import {
  setOrthographicCameraFromJson,
} from './zine-camera-utils.js';
import {
  floorNetPixelSize,
  pointcloudStride,
  physicsPixelStride,
} from './zine-constants.js';
// import {
//   categoryClassIndices,
// } from './zine-classes.js';

//

// const zeroVector = new THREE.Vector3(0, 0, 0);
const oneVector = new THREE.Vector3(1, 1, 1);
const upVector = new THREE.Vector3(0, 1, 0);
const y180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const y180Matrix = new THREE.Matrix4().makeRotationY(Math.PI);

const fakeMaterial = new THREE.MeshBasicMaterial({
  color: 0x0000FF,
  transparent: true,
  opacity: 0.2,
});

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localColor = new THREE.Color();

//

class SceneMaterial extends THREE.ShaderMaterial {
  constructor({
    map,
  }) {
    super({
      uniforms: {
        map: {
          value: map,
          needsUpdate: true,
        },
        selectedIndicesMap: {
          value: null,
          needsUpdate: false,
        },
        iSelectedIndicesMapResolution: {
          value: new THREE.Vector2(),
          needsUpdate: false,
        },
        uEraser: {
          value: 0,
          needsUpdate: true,
        },
        uMouseDown: {
          value: 0,
          needsUpdate: true,
        },
      },
      vertexShader: `\
        attribute float triangleId;
        varying vec2 vUv;
        varying float vTriangleId;
        
        void main() {
          vUv = uv;
          vTriangleId = triangleId;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `\
        uniform sampler2D map;
        uniform sampler2D selectedIndicesMap;
        uniform vec2 iSelectedIndicesMapResolution;
        uniform int uEraser;
        uniform int uMouseDown;

        varying vec2 vUv;
        varying float vTriangleId;

        void main() {
          gl_FragColor = texture2D(map, vUv);
          
          if (uEraser == 1) {
            // check for selection
            float x = mod(vTriangleId, iSelectedIndicesMapResolution.x);
            float y = floor(vTriangleId / iSelectedIndicesMapResolution.x);
            vec2 uv = (vec2(x, y) + 0.5) / iSelectedIndicesMapResolution;
            vec4 selectedIndexRgba = texture2D(selectedIndicesMap, uv);
            bool isSelected = selectedIndexRgba.r > 0.5;
            if (isSelected) {
              if (uMouseDown == 1) {
                gl_FragColor.rgb = vec3(${new THREE.Color(0xFF3333).toArray().join(', ')});
              } else {
                gl_FragColor.rgb *= 0.2;
              }
            }
          }
        }
      `,
    });
  }
}
const reconstructValueMaskFromLabelsIndices = (labels, labelIndices) => {
  const result = new Float32Array(labelIndices.length);
  for (let i = 0; i < labelIndices.length; i++) {
    const labelIndex = labelIndices[i];
    if (labelIndex !== 255) {
      const label = labels[labelIndex];
      result[i] = label.value;
    } else {
      result[i] = -1;
    }
  }
  return result;
};
class SceneMesh extends THREE.Mesh {
  constructor({
    pointCloudArrayBuffer,
    imgArrayBuffer,
    width,
    height,
    segmentLabels,
    segmentLabelIndices,
    planeLabels,
    planeLabelIndices,
    portalLabels,
    // segmentSpecs,
    // planeSpecs,
    // portalSpecs,
    firstFloorPlaneIndex,
  }) {
    const map = new THREE.Texture();
    const material = new SceneMaterial({
      map,
    });

    // scene mesh
    let geometry = pointCloudArrayBufferToGeometry(
      pointCloudArrayBuffer,
      width,
      height,
    );
    const segmentArray = reconstructValueMaskFromLabelsIndices(segmentLabels, segmentLabelIndices);
    geometry.setAttribute('segment', new THREE.BufferAttribute(segmentArray, 1));
    const segmentColor = getColorArrayFromValueArray(segmentArray);
    geometry.setAttribute('segmentColor', new THREE.BufferAttribute(segmentColor, 3));
    const planeArray = reconstructValueMaskFromLabelsIndices(planeLabels, planeLabelIndices);
    geometry.setAttribute('plane', new THREE.BufferAttribute(planeArray, 1));
    const planeColor = getColorArrayFromValueArray(planeArray);
    geometry.setAttribute('planeColor', new THREE.BufferAttribute(planeColor, 3));
    // const portalColor = getHighlightArrayFromValueArray(portalArray);
    // geometry.setAttribute('portalColor', new THREE.BufferAttribute(portalColor, 3));
    const indexedGeometry = geometry;
    geometry = geometry.toNonIndexed();
    decorateGeometryTriangleIds(geometry);

    super(geometry, material);

    const sceneMesh = this;
    sceneMesh.name = 'sceneMesh';
    sceneMesh.frustumCulled = false;
    sceneMesh.indexedGeometry = indexedGeometry;
    sceneMesh.segmentLabels = segmentLabels;
    sceneMesh.segmentLabelIndices = segmentLabelIndices;
    sceneMesh.planeLabels = planeLabels;
    sceneMesh.planeLabelIndices = planeLabelIndices;
    sceneMesh.portalLabels = portalLabels;
    sceneMesh.segmentArray = segmentArray;
    sceneMesh.firstFloorPlaneIndex = firstFloorPlaneIndex;
    sceneMesh.update = (selector) => {
      sceneMesh.material.uniforms.uMouseDown.value = +selector.mousedown;
      sceneMesh.material.uniforms.uMouseDown.needsUpdate = true;
    };
    (async () => { // load the texture image
      sceneMesh.visible = false;

      const imgBlob = new Blob([imgArrayBuffer], {
        type: 'image/png',
      });
      map.image = await createImageBitmap(imgBlob, {
        imageOrientation: 'flipY',
      });
      // map.encoding = THREE.sRGBEncoding;
      map.needsUpdate = true;

      sceneMesh.visible = true;

      this.dispatchEvent({
        type: 'load',
      });
    })();
  }
}

//

class CapSceneMesh extends THREE.Mesh {
  constructor({
    edgeDepths,
    map,
    width,
    height,
  }) {
    const numTriangles = (
      (width - 1) * 2 + (height - 1) * 2
    );

    // geometry
    const geometry = new THREE.BufferGeometry();
    // positions
    const positions = new Float32Array(
      (
        width + width + height + height +
        // one center point per triangle, for distinct uv coordinates
        numTriangles
      ) * 3
    );
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // uvs
    const uvs = new Float32Array(positions.length / 3 * 2);
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    // indices
    const indices = new Uint16Array(numTriangles * 3);
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    {
      // fill in the center points
      const centerPoint = new THREE.Vector3(0, 0, 0);
      const centerPointVertexStartIndex = (width + width + height + height);
      for (let i = 0; i < numTriangles; i++) {
        positions[centerPointVertexStartIndex * 3 + i * 3 + 0] = centerPoint.x;
        positions[centerPointVertexStartIndex * 3 + i * 3 + 1] = centerPoint.y;
        positions[centerPointVertexStartIndex * 3 + i * 3 + 2] = centerPoint.z;
        // uvs[centerPointVertexStartIndex * 2 + i * 2 + 0] = 0.5;
        // uvs[centerPointVertexStartIndex * 2 + i * 2 + 1] = 0.5;
      }

      // fill in remaining points
      let positionIndex = 0;
      let uvIndex = 0;
      let uvCenterPointIndex = (width + width + height + height) * 2;
      let indexIndex = 0;
      for (const edgeSpec of [
        {
          pointsArray: edgeDepths.tops,
          uvStart: new THREE.Vector2(0, 0),
          uvEnd: new THREE.Vector2(1, 0),
          flip: false,
        },
        {
          pointsArray: edgeDepths.bottoms,
          uvStart: new THREE.Vector2(0, 1),
          uvEnd: new THREE.Vector2(1, 1),
          flip: true,
        },
        {
          pointsArray: edgeDepths.lefts,
          uvStart: new THREE.Vector2(0, 0),
          uvEnd: new THREE.Vector2(0, 1),
          flip: true,
        },
        {
          pointsArray: edgeDepths.rights,
          uvStart: new THREE.Vector2(1, 0),
          uvEnd: new THREE.Vector2(1, 1),
          flip: false,
        },
      ]) {
        const {
          pointsArray,
          uvStart,
          uvEnd,
          flip,
        } = edgeSpec;
        // indices
        // connect the points to the center point
        for (let i = 0; i < pointsArray.length - 1; i++) {
          const a = positionIndex / 3 + i;
          const b = a + 1;
          const c = centerPointVertexStartIndex + indexIndex / 3;
          if (!flip) {
            indices[indexIndex++] = a;
            indices[indexIndex++] = b;
            indices[indexIndex++] = c;
          } else {
            indices[indexIndex++] = a;
            indices[indexIndex++] = c;
            indices[indexIndex++] = b;
          }
        }

        // positions
        for (let i = 0; i < pointsArray.length; i++) {
          const pointArray = pointsArray[i];
          localVector.fromArray(pointArray)
            // .applyMatrix4(matrixWorld)
            .toArray(positions, positionIndex);
          positionIndex += 3;
        }

        // uvs
        for (let i = 0; i < pointsArray.length; i++) {
          const uv = uvStart.clone()
            .lerp(uvEnd, i / (pointsArray.length - 1));
          uvs[uvIndex++] = uv.x;
          uvs[uvIndex++] = 1 - uv.y;
        }
        // center point uvs
        for (let i = 0; i < pointsArray.length - 1; i++) {
          const uv = uvStart.clone()
            .lerp(uvEnd, i / (pointsArray.length - 1));
          uvs[uvCenterPointIndex++] = uv.x;
          uvs[uvCenterPointIndex++] = 1 - uv.y;
        }
      }
    }

    // material
    // const map = new THREE.Texture(image);
    // map.needsUpdate = true;
    // const material = new THREE.MeshBasicMaterial({
    //   // color: 0x000000,
    //   map,
    //   side: THREE.DoubleSide,
    // });
    const material = new SceneMaterial({
      map,
    });

    // mesh
    super(geometry, material);
  }
}

//

class ScenePhysicsMesh extends THREE.Mesh {
  constructor({
    pointCloudArrayBuffer,
    width,
    height,
    segmentLabels,
    segmentLabelIndices,
  }) {
    let geometry = pointCloudArrayBufferToGeometry(
      pointCloudArrayBuffer,
      width,
      height,
      physicsPixelStride,
    );

    // maintain strided segments attribute
    const originalSegmentArray = reconstructValueMaskFromLabelsIndices(
      segmentLabels,
      segmentLabelIndices
    );
    const segments = new originalSegmentArray.constructor( // Float32Array
      originalSegmentArray.length / (physicsPixelStride * physicsPixelStride)
    );

    // if (segments.length * 3 !== geometry.attributes.position.array.length) {
    //   console.log('mismatch', segments.length, geometry.attributes.position.array.length);
    //   debugger;
    // }

    const arrayBuffer = pointCloudArrayBuffer;
    const pixelStride = physicsPixelStride;
    for (let i = 0, j = 0; i < arrayBuffer.byteLength; i += pointcloudStride) {
      if (pixelStride !== 1) {
        const i2 = i / pointcloudStride;
        const sx = i2 % width;
        const sy = Math.floor(i2 / width);
        if (sx % pixelStride !== 0 || sy % pixelStride !== 0) { // skip non-stride points
          continue;
        }
      }

      const s = originalSegmentArray[i / pointcloudStride];
      segments[j] = s;

      j++;
    }
    geometry.setAttribute('segment', new THREE.BufferAttribute(segments, 1));

    super(geometry, fakeMaterial);

    const scenePhysicsMesh = this;
    scenePhysicsMesh.name = 'scenePhysicsMesh';
    scenePhysicsMesh.visible = false;
    scenePhysicsMesh.enabled = false;
    scenePhysicsMesh.updateVisibility = () => {
      scenePhysicsMesh.visible = scenePhysicsMesh.enabled;
    };
  }
}

//

class FloorNetMesh extends THREE.Mesh {
  constructor() {
    const geometry = new THREE.PlaneBufferGeometry(1, 1);

    const material = new THREE.MeshPhongMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 0.7,
      side: THREE.BackSide,
    });

    super(geometry, material);

    const floorNetMesh = this;
    floorNetMesh.enabled = false;
    let hasGeometry = false;
    floorNetMesh.setGeometry = ({
      floorNetDepths,
      floorNetCamera,
    }) => {
      const geometry = depthFloat32ArrayToOrthographicGeometry(
        floorNetDepths,
        floorNetPixelSize,
        floorNetPixelSize,
        floorNetCamera,
      );
      geometry.computeVertexNormals();
      floorNetMesh.geometry = geometry;

      hasGeometry = true;
      floorNetMesh.updateVisibility();
    };
    floorNetMesh.updateVisibility = () => {
      floorNetMesh.visible = floorNetMesh.enabled && hasGeometry;
    };
    floorNetMesh.frustumCulled = false;
    floorNetMesh.visible = false;
  }
}

//

class EdgeDepthMesh extends THREE.InstancedMesh {
  constructor({
    edgeDepths,
    width,
    height,
  }) {
    const depthCubesGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    // instanced color attribute
    const maxSize = width + width + height + height +
      2 * 4; // min/max for each edge
    const colors = new Float32Array(maxSize * 3);
    depthCubesGeometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3, false));
    const depthCubesMaterial = new THREE.MeshBasicMaterial({
      // color: 0x0000FF,
      vertexColors: true,
    });

    super(depthCubesGeometry, depthCubesMaterial, maxSize);
    const depthCubesMesh = this;
    depthCubesMesh.count = 0;
    depthCubesMesh.frustumCulled = false;
    let index = 0;
    [
      edgeDepths.tops,
      edgeDepths.bottoms,
      edgeDepths.lefts,
      edgeDepths.rights,
    ].forEach(ps => {
      for (let i = 0; i < ps.length; i++) {
        const pointArray = ps[i];
        localMatrix.compose(
          localVector.fromArray(pointArray),
          localQuaternion.identity(),
          localVector2.set(1, 1, 1)
        );
        depthCubesMesh.setMatrixAt(index, localMatrix);
        localColor.setHex(0x0000FF)
          .toArray(colors, index * 3);
        index++;
        depthCubesMesh.count++;
      }
    });
    [
      edgeDepths.top,
      edgeDepths.bottom,
      edgeDepths.left,
      edgeDepths.right,
    ].forEach(point => {
      // min
      localMatrix.compose(
        localVector.fromArray(point.min),
        localQuaternion.identity(),
        localVector2.set(4, 4, 4)
      );
      depthCubesMesh.setMatrixAt(index, localMatrix);
      localColor.setHex(0xFF0000)
          .toArray(colors, index * 3);
      index++;
      depthCubesMesh.count++;

      // max
      localMatrix.compose(
        localVector.fromArray(point.max),
        localQuaternion.identity(),
        localVector2.set(2, 2, 2)
      );
      depthCubesMesh.setMatrixAt(index, localMatrix);
      localColor.setHex(0xFF0000)
          .toArray(colors, index * 3);
      index++;
      depthCubesMesh.count++;
    });

    depthCubesMesh.instanceMatrix.needsUpdate = true;
  }
}

//

class WallPlaneMesh extends THREE.Mesh {
  constructor(wallPlane) {
    let {
      color,
    } = wallPlane;
    
    const geometry = new THREE.PlaneGeometry(2, 2)
      .rotateY(Math.PI / 2); // match physx convention
    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    super(geometry, material);
    this.frustumCulled = false;
  }
}

//

class LightMesh extends THREE.Mesh {
  constructor({
    sphericalHarmonics: sh,
  }) {
    const _addMonocolor = (geometry, v) => {
      const monocolor = new Float32Array(geometry.attributes.position.array.length / 3).fill(v);
      geometry.setAttribute('monocolor', new THREE.BufferAttribute(monocolor, 1));
    };

    const sh0_r = new THREE.Vector3(sh[0], sh[1], sh[2]);
    const sh1_r = new THREE.Vector3(sh[3], sh[4], sh[5]);
    const sh2_r = new THREE.Vector3(sh[6], sh[7], sh[8]);
    const sh0_g = new THREE.Vector3(sh[9], sh[10], sh[11]);
    const sh1_g = new THREE.Vector3(sh[12], sh[13], sh[14]);
    const sh2_g = new THREE.Vector3(sh[15], sh[16], sh[17]);
    const sh0_b = new THREE.Vector3(sh[18], sh[19], sh[20]);
    const sh1_b = new THREE.Vector3(sh[21], sh[22], sh[23]);
    const sh2_b = new THREE.Vector3(sh[24], sh[25], sh[26]);

    const lightDirR = new THREE.Vector3(-sh1_r.x, -sh0_r.y, sh0_r.z).normalize();
    const lightDirG = new THREE.Vector3(-sh1_g.x, -sh0_g.y, sh0_g.z).normalize();
    const lightDirB = new THREE.Vector3(-sh1_b.x, -sh0_b.y, sh0_b.z).normalize();
    const lightDir = new THREE.Vector3()
      .add(lightDirR.clone().multiplyScalar(0.3))
      .add(lightDirG.clone().multiplyScalar(0.59))
      .add(lightDirB.clone().multiplyScalar(0.11))
      .normalize();

    // console.log('light dir', lightDir.toArray());

    const sh0_light = new THREE.Vector3(0.282094791, -0.488602511 * lightDir.y, 0.488602511 * lightDir.z);
    const sh1_light = new THREE.Vector3(-0.488602511 * lightDir.x, 1.092548431 * lightDir.y * lightDir.x, -1.092548431 * lightDir.y * lightDir.z);
    const sh2_light = new THREE.Vector3(0.315391565 * (3.0 * lightDir.z * lightDir.z - 1.0), -1.092548431 * lightDir.x * lightDir.z, 0.546274215 * (lightDir.x * lightDir.x - lightDir.y * lightDir.y));
    sh0_light.multiplyScalar(2.956793086);
    sh1_light.multiplyScalar(2.956793086);
    sh2_light.multiplyScalar(2.956793086);
    const denom = sh0_light.dot(sh0_light) + sh1_light.dot(sh1_light) + sh2_light.dot(sh2_light);
    const lightColor = new THREE.Vector3(
      sh0_r.dot(sh0_light) + sh1_r.dot(sh1_light) + sh2_r.dot(sh2_light),
      sh0_g.dot(sh0_light) + sh1_g.dot(sh1_light) + sh2_g.dot(sh2_light),
      sh0_b.dot(sh0_light) + sh1_b.dot(sh1_light) + sh2_b.dot(sh2_light)
    ).divideScalar(denom);
    lightColor.x = Math.min(Math.max(lightColor.x, 0), 1);
    lightColor.y = Math.min(Math.max(lightColor.y, 0), 1);
    lightColor.z = Math.min(Math.max(lightColor.z, 0), 1);

    // console.log('light color', lightColor.toArray());

    // geometry
    const width = 0.02;
    const length = 0.1;
    const size = 0.2;
    const planeGeometryFront = new THREE.BoxGeometry(size, size, width)
    const rodGeometryFront = new THREE.BoxGeometry(width, width, length);
    const _makeGeometry = ({
      planeGeometry,
      rodGeometry,
      scale,
    }) => {
      const frontGeometries = [
        planeGeometry.clone()
          .scale(scale, scale, scale),
      ].concat(
        [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ].map(([dx, dy]) =>
          rodGeometry.clone()
            .scale(scale, scale, scale)
            .translate(0, 0, (-length * 0.5 - width * 0.5) * scale)
            .translate(
              (dx * size * 0.5 - dx * width * 0.5),
              (dy * size * 0.5 - dy * width * 0.5),
              0
            )
        )
      );
      const geometry = BufferGeometryUtils.mergeBufferGeometries(frontGeometries);
      return geometry;
    };
    const frontGeometry = _makeGeometry({
      planeGeometry: planeGeometryFront,
      rodGeometry: rodGeometryFront,
      scale: 1,
    });
    _addMonocolor(frontGeometry, 0);

    const invertGeometry = g => {
      return g.clone()
        .scale(-1, -1, -1)
        // .scale(1.5, 1.5, 1.5);
    };
    const backGeometry = _makeGeometry({
      planeGeometry: invertGeometry(planeGeometryFront),
      rodGeometry: invertGeometry(rodGeometryFront),
      scale: 1.3,
    });
    _addMonocolor(backGeometry, 1);

    // merge
    const geometry = BufferGeometryUtils.mergeBufferGeometries([
      frontGeometry,
      backGeometry,
    ]);

    // material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: {
          value: lightColor,
          needsUpdate: true,
        }
      },
      vertexShader: `\
        attribute float y;
        attribute vec3 direction;
        attribute float monocolor;
        varying float vY;
        varying float vMonocolor;

        void main() {
          vY = uv.y;
          vMonocolor = monocolor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `\
        uniform vec3 uColor;
        varying float vY;
        varying float vMonocolor;

        void main() {
          gl_FragColor = vec4(uColor, 1.);
          gl_FragColor.rgb += vY * 0.15;
          gl_FragColor.rgb += vMonocolor;

          if (vMonocolor > 0.5) {
            gl_FragColor.a = 0.5;
          } else {
            gl_FragColor.a = 1.;
          }
        }
      `,
      transparent: true,
    });

    super(geometry, material);

    this.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().lookAt(
        new THREE.Vector3(),
        lightDir.clone(),
          // .negate(),
        upVector
      )
    );
    this.frustumCulled = false;
  }
}

//

export class ZineRenderer extends EventTarget {
  constructor({
    panel,
    alignFloor = false,
  }) {
    super();

    // members
    this.panel = panel;
    const layer0 = panel.getLayer(0);
    const layer1 = panel.getLayer(1);
    const imgArrayBuffer = layer0.getData(mainImageKey);
    const resolution = layer1.getData('resolution');
    const position = layer1.getData('position');
    const quaternion = layer1.getData('quaternion');
    const scale = layer1.getData('scale');
    const depthFieldHeaders = layer1.getData('depthFieldHeaders');
    const depthFieldArrayBuffer = layer1.getData('depthField');
    const sphericalHarmonics = layer1.getData('sphericalHarmonics');
    const planesJson = layer1.getData('planesJson');
    const portalJson = layer1.getData('portalJson');
    const segmentLabels = layer1.getData('segmentLabels');
    const segmentLabelIndices = layer1.getData('segmentLabelIndices');
    const planeLabels = layer1.getData('planeLabels');
    const planeLabelIndices = layer1.getData('planeLabelIndices');
    const portalLabels = layer1.getData('portalLabels');
    // const segmentSpecs = layer1.getData('segmentSpecs');
    // const planeSpecs = layer1.getData('planeSpecs');
    // const portalSpecs = layer1.getData('portalSpecs');
    const firstFloorPlaneIndex = layer1.getData('firstFloorPlaneIndex');
    const floorNetDepths = layer1.getData('floorNetDepths');
    const floorNetCameraJson = layer1.getData('floorNetCameraJson');
    const floorPlaneLocation = layer1.getData('floorPlaneLocation');
    const cameraEntranceLocation = layer1.getData('cameraEntranceLocation');
    const entranceExitLocations = layer1.getData('entranceExitLocations');
    const portalLocations = layer1.getData('portalLocations');
    const candidateLocations = layer1.getData('candidateLocations');
    const predictedHeight = layer1.getData('predictedHeight');
    const edgeDepths = layer1.getData('edgeDepths');
    const wallPlanes = layer1.getData('wallPlanes');
    const outlineJson = layer1.getData('outlineJson');
    const paths = layer1.getData('paths');

    const [
      width,
      height,
    ] = resolution;

    // scene
    const scene = new THREE.Object3D();
    // scene.autoUpdate = false;
    this.scene = scene;

    // scale scene
    const transformScene = new THREE.Object3D();
    transformScene.autoUpdate = false;
    transformScene.position.fromArray(position);
    transformScene.quaternion.fromArray(quaternion);
    transformScene.scale.fromArray(scale);
    transformScene.updateMatrixWorld();
    this.scene.add(transformScene);
    this.transformScene = transformScene;

    // edge depths
    const edgeDepthMesh = new EdgeDepthMesh({
      edgeDepths,
      width,
      height,
    });
    edgeDepthMesh.visible = false;
    this.transformScene.add(edgeDepthMesh);
    edgeDepthMesh.updateMatrixWorld();
    this.edgeDepthMesh = edgeDepthMesh;

    // wall plane meshes
    this.wallPlaneMeshes = [];
    for (let i = 0; i < wallPlanes.length; i++) {
      const wallPlane = wallPlanes[i];
      const wallPlaneMesh = new WallPlaneMesh(wallPlane);
      wallPlaneMesh.position.fromArray(wallPlane.position);
      wallPlaneMesh.quaternion.fromArray(wallPlane.quaternion);
      wallPlaneMesh.visible = false;
      this.transformScene.add(wallPlaneMesh);
      wallPlaneMesh.updateMatrixWorld();
      this.wallPlaneMeshes.push(wallPlaneMesh);
    }

    // camera
    const camera = makeDefaultCamera();
    this.camera = camera;
    const fov = Number(depthFieldHeaders['x-fov']);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();

    // scene mesh
    const pointCloudFloat32Array = reconstructPointCloudFromDepthField(
      depthFieldArrayBuffer,
      width,
      height,
      fov,
    );
    const pointCloudArrayBuffer = pointCloudFloat32Array.buffer;
    const sceneMesh = new SceneMesh({
      pointCloudArrayBuffer,
      imgArrayBuffer,
      width,
      height,
      segmentLabels,
      segmentLabelIndices,
      planeLabels,
      planeLabelIndices,
      portalLabels,
      // segmentSpecs,
      // planeSpecs,
      // portalSpecs,
      firstFloorPlaneIndex,
    });
    this.transformScene.add(sceneMesh);
    sceneMesh.addEventListener('load', e => {
      this.dispatchEvent(new MessageEvent('load'));
    });
    this.sceneMesh = sceneMesh;

    // cap mesh
    const capSceneMesh = new CapSceneMesh({
      edgeDepths,
      matrixWorld: transformScene.matrixWorld,
      map: sceneMesh.material.uniforms.map.value,
      width,
      height,
    });
    // capSceneMesh.frustumCulled = false;
    capSceneMesh.visible = false;
    this.transformScene.add(capSceneMesh);
    this.capSceneMesh = capSceneMesh;

    // scene physics mesh
    const scenePhysicsMesh = new ScenePhysicsMesh({
      pointCloudArrayBuffer,
      width,
      height,
      segmentLabels,
      segmentLabelIndices,
    });
    this.transformScene.add(scenePhysicsMesh);
    this.scenePhysicsMesh = scenePhysicsMesh;

    // floor net mesh
    const floorNetMesh = new FloorNetMesh();
    const floorNetCamera = setOrthographicCameraFromJson(
      new THREE.OrthographicCamera(),
      floorNetCameraJson
    );
    floorNetMesh.setGeometry({
      floorNetDepths,
      floorNetCamera,
    });
    this.transformScene.add(floorNetMesh);
    this.floorNetMesh = floorNetMesh;

    // light mesh
    const lightMesh = new LightMesh({
      sphericalHarmonics,
    });
    lightMesh.position.y = 3;
    lightMesh.visible = false;
    this.transformScene.add(lightMesh);
    lightMesh.updateMatrixWorld();
    this.lightMesh = lightMesh;

    // align to floor
    if (alignFloor) {
      const floorInverseQuaternion = localQuaternion
        .fromArray(floorPlaneLocation.quaternion)
        .invert();

      scene.quaternion.copy(floorInverseQuaternion);
      scene.updateMatrixWorld();
      
      camera.quaternion.copy(floorInverseQuaternion);
      camera.updateMatrixWorld();
    }
 
    // update transforms
    this.scene.updateMatrixWorld();

    // metadata
    this.metadata = {
      position,
      quaternion,
      scale,
      floorPlaneLocation,
      cameraEntranceLocation,
      entranceExitLocations,
      portalLocations,
      candidateLocations,
      edgeDepths,
      outlineJson,
      paths,
    };

    this.#listen();
  }
  #listen() {
    const layer1 = this.panel.getLayer(1);
    layer1.addEventListener('update', e => {
      // console.log('layer 1 got update event', e);

      const {key, value, keyPath} = e.data;
      const transformKeys = [
        'position',
        'quaternion',
        'scale',
      ];
      if (transformKeys.includes(key)) {
        this.#syncTransformToData();
      }
    });
  }
  #syncTransformToData() { // update scene transform to match panel data
    const layer1 = this.panel.getLayer(1);
    const position = layer1.getData('position');
    const quaternion = layer1.getData('quaternion');
    const scale = layer1.getData('scale');

    this.transformScene.position.fromArray(position);
    this.transformScene.quaternion.fromArray(quaternion);
    this.transformScene.scale.fromArray(scale);
    this.transformScene.updateMatrixWorld();

    this.dispatchEvent(new MessageEvent('transformchange'));
  }

  /**
   * Get a portion of a zine image by specifying a center,
   * width and height.
   *
   * @param {number} sx Screen-space x coordinate
   * @param {number} sy Screen-space y coordinate
   * @param {number} width Width of the image
   * @param {number} height Height of the image
   * @return {Promise} Resolves to an image
   */
  async getColorImage(sx = 0, sy = 0, width, height) {
    // Get zine image.
    const {image} = this.sceneMesh.material.uniforms.map.value;

    // Convert screen space coordinates to pixel coordinates.
    let x = Math.round((sx + 1) / 2 * image.width);
    let y = Math.round((sy + 1) / 2 * image.height);

    // Get width and height, defaulting to image dimensions.
    const w = width ?? image.width;
    const h = height ?? image.height;

    // We will create a bounding box around this coordinate.

    // Adjust the coordinate to ensure that the bounding box
    // is within the image.
    x = range(x, w / 2, image.width - w / 2);
    y = range(y, h / 2, image.height - h / 2);

    // Convert to bitmap.
    const bmp = await createImageBitmap(
      image,
      x - w / 2,
      y - h / 2,
      w,
      h,
      // Image is flipped vertically.
      {imageOrientation: 'flipY'},
    );

    // Create an offscreen canvas to draw the image on.
    const canvas = new OffscreenCanvas(w, h);

    // Blit the image to the canvas.
    const ctx = canvas.getContext('bitmaprenderer');
    ctx.transferFromImageBitmap(bmp);

    // Get blob.
    const blob = await canvas.convertToBlob({
      quality: 0.5,
      type: 'image/jpeg',
    });

    // Clean up.
    bmp.close();

    return blob;
  }

  async getColorImageFromPosition(
    position = new THREE.Vector3(),
    width,
    height
  ) {
    // Map position to screen space.
    const {x,y} = position
      .clone()
      .project(this.camera);

    return this.getColorImage(x,y,width,height);
  }

  getScale() {
    const layer1 = this.panel.getLayer(1);
    const scale = layer1.getData('scale');
    return scale[0];
  }
  setScale(scale) {
    const layer1 = this.panel.getLayer(1);
    layer1.setData('scale', [scale, scale, scale]);
  }
  connect(targetZineRenderer, exitIndex = 1, entranceIndex = 0) {
    const exitLocation = this.metadata.entranceExitLocations[exitIndex];
    const exitMatrix = new THREE.Matrix4().compose(
      new THREE.Vector3().fromArray(exitLocation.position),
      new THREE.Quaternion().fromArray(exitLocation.quaternion),
      oneVector
    );
    const exitMatrixWorld = exitMatrix.clone()
      .premultiply(this.transformScene.matrixWorld);
    exitMatrixWorld.decompose(
      localVector,
      localQuaternion,
      localVector2
    );
    exitMatrixWorld.compose(
      localVector,
      localQuaternion,
      oneVector
    );

    const entranceLocation = targetZineRenderer.metadata.entranceExitLocations[entranceIndex];
    const entranceMatrix = new THREE.Matrix4().compose(
      localVector.fromArray(entranceLocation.position),
      localQuaternion.fromArray(entranceLocation.quaternion),
      oneVector
    );
    const entranceMatrixWorld = entranceMatrix.clone()
      .premultiply(targetZineRenderer.transformScene.matrixWorld);
    entranceMatrixWorld.decompose(
        localVector,
        localQuaternion,
        localVector2
      );
    entranceMatrixWorld.compose(
      localVector,
      localQuaternion,
      oneVector
    );
    const entranceMatrixWorldInverse = entranceMatrixWorld.clone()
      .invert();

    // undo the target entrance transform
    // then, apply the exit transform
    const transformMatrix = new THREE.Matrix4()
      .copy(entranceMatrixWorldInverse)
      .premultiply(y180Matrix)
      .premultiply(exitMatrixWorld)
    targetZineRenderer.scene.matrix
      .premultiply(transformMatrix)
      .decompose(
        targetZineRenderer.scene.position,
        targetZineRenderer.scene.quaternion,
        targetZineRenderer.scene.scale
      );
    targetZineRenderer.scene.updateMatrixWorld();

    targetZineRenderer.camera.matrix
      .premultiply(transformMatrix)
      .decompose(
        targetZineRenderer.camera.position,
        targetZineRenderer.camera.quaternion,
        targetZineRenderer.camera.scale
      );
    targetZineRenderer.camera.updateMatrixWorld();

    // XXX resize the exit rectangle to match scale of the next rectangle,
    // so that we only enter the next panel in an area that's in bounds
  }
  alignEntranceToFloorPosition(floorPosition, exitWorldLocation, entranceLocalLocation) {
    // if (floorPosition === undefined || exitWorldLocation === undefined || entranceLocalLocation === undefined) {
    //   console.warn('bad args', {floorPosition, exitWorldLocation, entranceLocalLocation});
    //   debugger;
    // }
    // console.log('exit matrix world', exitWorldLocation.position);
    const exitDropMatrixWorld = new THREE.Matrix4().compose(
      floorPosition,
      localQuaternion.fromArray(exitWorldLocation.quaternion)
        .premultiply(y180Quaternion),
      oneVector
    );

    const entranceLocalMatrixInverse = new THREE.Matrix4().compose(
      localVector.fromArray(entranceLocalLocation.position),
      // zeroVector,
      localQuaternion.fromArray(entranceLocalLocation.quaternion),
      oneVector
    ).invert();
    const entranceLocalMatrix = new THREE.Matrix4().compose(
      localVector.fromArray(entranceLocalLocation.position),
      new THREE.Quaternion(),
      oneVector
    );
    // const entranceLocalMatrixInverse = entranceLocalMatrix.clone()
    //   .invert();
    // const entranceMatrixWorld = entranceMatrix.clone()
    //   .premultiply(this.transformScene.matrixWorld);
    // entranceMatrixWorld.decompose(
    //   localVector,
    //   localQuaternion,
    //   localVector2
    // );
    // entranceMatrixWorld.compose(
    //   localVector,
    //   localQuaternion,
    //   oneVector
    // );
    // const entranceMatrixWorldInverse = entranceMatrixWorld.clone()
    //   .invert();
    
    // const floorMatrix = new THREE.Matrix4().compose(
    //   floorPosition,
    //   new THREE.Quaternion(),
    //   oneVector
    // );

    // undo the target entrance transform
    // then, apply the floor transform
    const transformMatrix = entranceLocalMatrixInverse.clone()
      .premultiply(exitDropMatrixWorld)
    // const transformMatrix = exitDropMatrixWorld;

    this.scene.matrix
      .copy(transformMatrix)
      .decompose(
        this.scene.position,
        this.scene.quaternion,
        this.scene.scale
      );
    this.scene.updateMatrixWorld();

    this.camera.matrix
      .copy(transformMatrix)
      .decompose(
        this.camera.position,
        this.camera.quaternion,
        this.camera.scale
      );
    this.camera.updateMatrixWorld();
  }
}