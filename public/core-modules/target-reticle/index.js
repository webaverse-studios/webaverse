import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useThreeUtils, useFrame, useMaterials, useCamera, useLocalPlayer} = metaversefile;

// const cardWidth = 0.063;
// const cardHeight = cardWidth / 2.5 * 3.5;
// const cardHeight = cardWidth;
// const cardsBufferFactor = 1.1;
/* const menuWidth = cardWidth * cardsBufferFactor * 4;
const menuHeight = cardHeight * cardsBufferFactor * 4;
const menuRadius = 0.025; */

const {BufferGeometryUtils} = useThreeUtils();

const localVector = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localQuaternion = new THREE.Quaternion();

/* const targetTypes = [
  'object',
  'enemy',
  'friend',
]; */
const targetTypeColors = [
  {
    name: 'object',
    colors: [
      new THREE.Color(0x42a5f5),
      new THREE.Color(0x1976d2),
    ],
  },
  {
    name: 'enemy',
    colors: [
      new THREE.Color(0xffca28),
      new THREE.Color(0xffa000),
    ],
  },
  {
    name: 'friend',
    colors: [
      new THREE.Color(0x66bb6a),
      new THREE.Color(0x388e3c),
    ],
  },
];
const triangleHalfSize = 0.08;
const triangleSize = triangleHalfSize * 2;
const innerRadius = 0.3;
const targetScale = 0.2;

function createTargetReticleGeometry() {
  const a = new THREE.Vector2(-triangleHalfSize, triangleHalfSize);
  const b = new THREE.Vector2(0, 0);
  const c = new THREE.Vector2(triangleHalfSize, triangleHalfSize);

  const shape = new THREE.Shape();
  shape.moveTo(a.x, a.y);
  shape.lineTo(b.x, b.y);
  shape.lineTo(c.x, c.y);
  shape.lineTo(a.x, a.y);

  const baseGeometry = new THREE.ShapeGeometry(shape);

  const _setOffsets = g => {
    const offsets = new Float32Array(g.attributes.position.count * 3);
    baseGeometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 3));
  };
  _setOffsets(baseGeometry);

  const _setQuaternions = g => {
    const quaternions = new Float32Array(g.attributes.position.count * 4);
    baseGeometry.setAttribute('quaternion', new THREE.BufferAttribute(quaternions, 4));
  };
  _setQuaternions(baseGeometry);

  const _setTypes = g => {
    const types = new Int32Array(g.attributes.position.count);
    baseGeometry.setAttribute('type', new THREE.BufferAttribute(types, 1));
  };
  _setTypes(baseGeometry);

  const _setZooms = g => {
    const zooms = new Float32Array(g.attributes.position.count);
    baseGeometry.setAttribute('zoom', new THREE.BufferAttribute(zooms, 1));
  }
  _setZooms(baseGeometry);
  
  const _setUvs = g => {
    const positions = g.attributes.position.array;
    const uvs = g.attributes.uv.array;
    for (let i = 0; i < g.attributes.position.count; i++) {
      localVector.fromArray(positions, i * 3);
      localVector2D.set(
        (localVector.x + triangleHalfSize) / triangleSize,
        localVector.y / triangleHalfSize
      ).toArray(uvs, i * 2);
    }
    return g;
  };
  _setUvs(baseGeometry);

  const _setNormal2s = (g, normal2D) => {
    const normal2s = new Float32Array(g.attributes.position.count * 2);
    g.setAttribute('normal2', new THREE.BufferAttribute(normal2s, 2));
    for (let i = 0; i < g.attributes.normal2.count; i++) {
      normal2D.toArray(normal2s, i * 2);
    }
    g.attributes.normal2.needsUpdate = true;
    return g;
  };

  const geometries = [
    _setNormal2s(
      baseGeometry.clone()
        .rotateZ(0)
        .translate(0, innerRadius, 0),
      new THREE.Vector2(0, 1)
    ),
    _setNormal2s(
      baseGeometry.clone()
        .rotateZ(Math.PI / 2)
        .translate(-innerRadius, 0, 0),
      new THREE.Vector2(-1, 0)
    ),
    _setNormal2s(
      baseGeometry.clone()
        .rotateZ(Math.PI)
        .translate(0, -innerRadius, 0),
      new THREE.Vector2(0, -1)
    ),
    _setNormal2s(
      baseGeometry.clone()
        .rotateZ(Math.PI * 3 / 2)
        .translate(innerRadius, 0, 0),
      new THREE.Vector2(1, 0)
    ),
  ];
  const geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
  geometry.scale(targetScale, targetScale, targetScale);
  return geometry;
};
function createTargetReticleGeometries(count) {
  const geometry = createTargetReticleGeometry();
  const geometries = Array(count);
  for (let i = 0; i < count; i++) {
    geometries[i] = geometry;
  }
  const result = BufferGeometryUtils.mergeBufferGeometries(geometries);
  result.drawStride = geometry.attributes.position.count;
  return result;
}
const _makeTargetReticleMesh = () => {
  const {WebaverseShaderMaterial} = useMaterials();
  const camera = useCamera();
  // const localPlayer = useLocalPlayer();

  const geometry = createTargetReticleGeometries(16);
  geometry.setDrawRange(0, 0);
  const material = new WebaverseShaderMaterial({
    uniforms: {
      uColor1: {
        value: new THREE.Color(0x000000),
        needsUpdate: true,
      },
      uColor2: {
        value: new THREE.Color(0xFFFFFF),
        needsUpdate: true,
      },
      uAspect: {
        value: camera.aspect,
        needsUpdate: true,
      },
      uZoom: {
        value: 0,
        needsUpdate: true,
      },
      uTime: {
        value: 0,
        needsUpdate: true,
      },
    },
    vertexShader: `\
      precision highp float;
      precision highp int;

      #define PI 3.1415926535897932384626433832795

      uniform float uAspect;
      attribute vec3 offset;
      attribute vec4 quaternion;
      attribute int type;
      attribute vec2 normal2;
      attribute float zoom;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vBarycentric;
      varying vec3 vPosition;
      flat varying int vType;

      const float zoomDistance = 5.;

      vec2 rotate2D(vec2 v, float a) {
        return vec2(
          v.x * cos(a) - v.y * sin(a),
          v.x * sin(a) + v.y * cos(a)
        );
      }
      vec3 rotateVec3Quat( vec3 v, vec4 q ) { 
        return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
      }

      void main() {
        float uZoom = zoom;

        vec3 p = position;
        {
          float angle = uTime * PI * 2.;
          p = vec3(rotate2D(p.xy, angle) + rotate2D(normal2 * uZoom * zoomDistance, angle), p.z);
        }
        p.y *= uAspect;
        // p = rotateVec3Quat(p, quaternion);
        p += offset;

        vPosition = offset;

        gl_Position = vec4(p.xy, 0., 1.);
        
        // const float radius = 0.175;
        vUv = uv;

        float vid = float(gl_VertexID);
        if (mod(vid, 3.) < 0.5) {
          vBarycentric = vec3(1., 0., 0.);
        } else if (mod(vid, 3.) < 1.5) {
          vBarycentric = vec3(0., 1., 0.);
        } else {
          vBarycentric = vec3(0., 0., 1.);
        }

        vType = type;
      }
    `,
    fragmentShader: `\
      precision highp float;
      precision highp int;

      #define PI 3.1415926535897932384626433832795

      uniform float uTime;
      varying vec2 vUv;
      flat varying int vType;
      varying vec3 vBarycentric;
      varying vec3 vPosition;

      // compute the distance to edge of the triangle from its barycentric coordinates
      float distanceToEdge(vec3 barycentric) {
        return length(
          vec3(
            barycentric.x * 2. - 1.,
            barycentric.y * 2. - 1.,
            barycentric.z * 2. - 1.
          )
        );
      }

      /* float edgeFactor() {
        vec3 d = fwidth(vBarycentric);
        vec3 a3 = smoothstep(vec3(0.0), d, vBarycentric);
        return min(min(a3.x, a3.y), a3.z);
      } */
      
      // const float lineWidth = 1.;
      float edgeFactor(vec3 vbc, float lineWidth) {
        vec3 d = fwidth(vbc);
        vec3 f = step(d * lineWidth, vbc);
        return min(min(f.x, f.y), f.z);
      }

      vec3 hueShift( vec3 color, float hueAdjust ){
        const vec3  kRGBToYPrime = vec3 (0.299, 0.587, 0.114);
        const vec3  kRGBToI      = vec3 (0.596, -0.275, -0.321);
        const vec3  kRGBToQ      = vec3 (0.212, -0.523, 0.311);

        const vec3  kYIQToR     = vec3 (1.0, 0.956, 0.621);
        const vec3  kYIQToG     = vec3 (1.0, -0.272, -0.647);
        const vec3  kYIQToB     = vec3 (1.0, -1.107, 1.704);

        float   YPrime  = dot (color, kRGBToYPrime);
        float   I       = dot (color, kRGBToI);
        float   Q       = dot (color, kRGBToQ);
        float   hue     = atan (Q, I);
        float   chroma  = sqrt (I * I + Q * Q);

        hue += hueAdjust;

        Q = chroma * sin (hue);
        I = chroma * cos (hue);

        vec3    yIQ   = vec3 (YPrime, I, Q);

        return vec3( dot (yIQ, kYIQToR), dot (yIQ, kYIQToG), dot (yIQ, kYIQToB) );
    }

      void main() {
        // if outside of view
        if (vPosition.z < 0. || vPosition.z > 1.) {
          discard;
        }
        
        vec3 uColor1;
        vec3 uColor2;
        if (vType == 0) {
          uColor1 = vec3(${targetTypeColors[0].colors[0].toArray().join(', ')});
          uColor2 = vec3(${targetTypeColors[0].colors[1].toArray().join(', ')});
        } else if (vType == 1) {
          uColor1 = vec3(${targetTypeColors[1].colors[0].toArray().join(', ')});
          uColor2 = vec3(${targetTypeColors[1].colors[1].toArray().join(', ')});
        } else if (vType == 2) {
          uColor1 = vec3(${targetTypeColors[2].colors[0].toArray().join(', ')});
          uColor2 = vec3(${targetTypeColors[2].colors[1].toArray().join(', ')});
        }

        vec3 c = mix(uColor1, uColor2, vUv.y);
        c *= (0.5 + 0.5 * (1. - vUv.y));
        if (edgeFactor(vBarycentric, 1.) < 0.2) {
          c = vec3(0.);
        }

        c = hueShift(c, sin(uTime * 5. * PI * 2.) * 0.1 * PI * 2.);

        gl_FragColor = vec4(c, 1.);

        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }
    `,
    side: THREE.DoubleSide,
    // depthTest: false,
    // depthWrite: true,
    // transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.update = (timestamp, timeDiff) => {
    const maxTime = 3000;
    const f = (timestamp % maxTime) / maxTime;

    material.uniforms.uTime.value = f;
    material.uniforms.uTime.needsUpdate = true;

    material.uniforms.uAspect.value = camera.aspect;
    material.uniforms.uAspect.needsUpdate = true;
  };

  mesh.setReticles = reticles => {
    const numReticles = reticles.length;
    for (let i = 0; i < numReticles; i++) {
      const reticle = reticles[i];
      
      const position = reticle.position;
      const quaternion = localQuaternion.copy(camera.quaternion).invert();
      const type = reticle.type;
      const typeIndex = targetTypeColors.findIndex(t => t.name === type);
      const zoom = reticle.zoom;

      // project the position into the camera
      const projectedPosition = localVector.copy(position)
        .applyMatrix4(camera.matrixWorldInverse)
        .applyMatrix4(camera.projectionMatrix);
      
      for (let j = 0; j < geometry.drawStride; j++) {
        projectedPosition.toArray(geometry.attributes.offset.array, (i * geometry.drawStride * 3) + (j * 3));
        quaternion.toArray(geometry.attributes.quaternion.array, (i * geometry.drawStride * 3) + (j * 4));
        geometry.attributes.type.array[i * geometry.drawStride + j] = typeIndex;
        geometry.attributes.zoom.array[i * geometry.drawStride + j] = zoom;
      }
    }
    geometry.attributes.offset.needsUpdate = true;
    geometry.attributes.quaternion.needsUpdate = true;
    geometry.attributes.type.needsUpdate = true;
    geometry.attributes.zoom.needsUpdate = true;
    geometry.setDrawRange(0, geometry.drawStride * numReticles);
  };
  return mesh;
};
export default () => {
  const mesh = _makeTargetReticleMesh();

  useFrame(({timestamp, timeDiff}) => {
    mesh.update(timestamp, timeDiff);
  });
  
  return mesh;
};