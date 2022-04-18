import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useFrame, useMaterials, useLocalPlayer, useMathUtils} = metaversefile;

const cardWidth = 0.063;
// const cardHeight = cardWidth / 2.5 * 3.5;
const cardHeight = cardWidth;
const cardsBufferFactor = 1.1;
const menuWidth = cardWidth * cardsBufferFactor * 4;
const menuHeight = cardHeight * cardsBufferFactor * 4;
const menuRadius = 0.025;
function makeShape(shape, x, y, width, height, radius) {
  shape.absarc(x - width/2, y + height/2, radius, Math.PI, Math.PI / 2, true);
  shape.absarc(x + width/2, y + height/2, radius, Math.PI / 2, 0, true);
  shape.absarc(x + width/2, y - height/2, radius, 0, -Math.PI / 2, true);
  shape.absarc(x - width/2, y - height/2, radius, -Math.PI / 2, -Math.PI, true);
  return shape;
}
function createBoxWithRoundedEdges(width, height, radius, innerFactor) {
  const shape = makeShape(new THREE.Shape(), 0, 0, width, height, radius);
  const hole = makeShape(new THREE.Path(), 0, 0, width * innerFactor, height * innerFactor, radius);
  shape.holes.push(hole);

  const geometry = new THREE.ShapeGeometry(shape);
  return geometry;
}
function createAngledBox() {
  const radius = 0.175;
  const lineWidth = 0.01;

  const a = new THREE.Vector2(0, radius);
  const b = new THREE.Vector2(-radius, radius);
  const c = new THREE.Vector2(-radius * 0.75, radius * 0.25);

  const a2 = a.clone().add(new THREE.Vector2(0, lineWidth));
  const b2 = b.clone().add(new THREE.Vector2(-lineWidth, lineWidth));
  const c2 = c.clone().add(new THREE.Vector2(-lineWidth, 0));

  const a3 = a.clone().add(new THREE.Vector2(0, -lineWidth));
  const b3 = b.clone().add(new THREE.Vector2(lineWidth, -lineWidth));
  const c3 = c.clone().add(new THREE.Vector2(lineWidth, 0));

  const d = new THREE.Vector2(0, -radius);
  const e = new THREE.Vector2(radius, -radius);
  const f = new THREE.Vector2(radius * 0.75, -radius * 0.25);

  const d2 = d.clone().add(new THREE.Vector2(0, -lineWidth));
  const e2 = e.clone().add(new THREE.Vector2(lineWidth, -lineWidth));
  const f2 = f.clone().add(new THREE.Vector2(lineWidth, 0));

  const d3 = d.clone().add(new THREE.Vector2(0, lineWidth));
  const e3 = e.clone().add(new THREE.Vector2(-lineWidth, lineWidth));
  const f3 = f.clone().add(new THREE.Vector2(-lineWidth, 0));

  const shape = new THREE.Shape();
  shape.moveTo(a.x, a.y);
  shape.lineTo(b.x, b.y);
  shape.lineTo(c.x, c.y);
  shape.lineTo(c2.x, c2.y);
  shape.lineTo(b2.x, b2.y);
  shape.lineTo(a2.x, a2.y);
  shape.lineTo(a.x, a.y);

  shape.moveTo(d.x, d.y);
  shape.lineTo(e.x, e.y);
  shape.lineTo(f.x, f.y);
  shape.lineTo(f2.x, f2.y);
  shape.lineTo(e2.x, e2.y);
  shape.lineTo(d2.x, d2.y);
  shape.lineTo(d.x, d.y);

  /* makeShape(new THREE.Shape(), 0, 0, width, height, 0);
  const hole = makeShape(new THREE.Path(), 0, 0, width * innerFactor, height * innerFactor, 0);
  shape.holes.push(hole); */

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.translate(0, radius * 0.25, 0);
  // geometry.applyMatrix(new THREE.Matrix4().makeRotationZ(angle));
  return geometry;
}
export default () => {
  const {WebaverseShaderMaterial} = useMaterials();
  const localPlayer = useLocalPlayer();
  const {easing} = useMathUtils();
  const cubicBezier = easing(0, 1, 0, 1);

  const w = menuWidth + menuRadius*2;
  const h = menuHeight + menuRadius*2;
  // const geometry = createBoxWithRoundedEdges(w, h, menuRadius, 0.95);
  const geometry = createAngledBox();
  const boundingBox = new THREE.Box3().setFromObject(new THREE.Mesh(geometry));
  // console.log('got bounding box', boundingBox);
  const material = new WebaverseShaderMaterial({
    uniforms: {
      uBoundingBox: {
        type: 'vec4',
        value: new THREE.Vector4(
          boundingBox.min.x,
          boundingBox.min.y,
          boundingBox.max.x - boundingBox.min.x,
          boundingBox.max.y - boundingBox.min.y
        ),
        needsUpdate: true,
      },
      uTime: {
        type: 'f',
        value: 0,
        needsUpdate: true,
      },
      uTimeCubic: {
        type: 'f',
        value: 0,
        needsUpdate: true,
      },
    },
    vertexShader: `\
      precision highp float;
      precision highp int;

      // uniform float uTime;
      uniform vec4 uBoundingBox;
      varying vec3 vPosition;
      // varying vec3 vNormal;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        vPosition = (
          position - vec3(uBoundingBox.x, uBoundingBox.y, 0.)
        ) / vec3(uBoundingBox.z, uBoundingBox.w, 1.);
        // vNormal = normal;
      }
    `,
    fragmentShader: `\
      precision highp float;
      precision highp int;

      #define PI 3.1415926535897932384626433832795

      // uniform vec4 uBoundingBox;
      uniform float uTime;
      uniform float uTimeCubic;
      varying vec3 vPosition;
      // varying vec3 vNormal;

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
        if (
          (1. - vPosition.y) < uTimeCubic &&
          abs(vPosition.x - 0.5) < uTimeCubic
        ) {
          gl_FragColor = vec4(hueShift(vPosition, uTime * PI * 2.), 1.);
        } else {
          discard;
        }
      }
    `,
    // transparent: true,
    // polygonOffset: true,
    // polygonOffsetFactor: -1,
    // polygonOffsetUnits: 1,
    side: THREE.DoubleSide,
  });
  /* const m = new THREE.MeshBasicMaterial({
    color: 0xFF0000,
    side: THREE.DoubleSide,
  }); */
  const mesh = new THREE.Mesh(geometry, material);
  // mesh.frustumCulled = false;

  useFrame(() => {
    // console.log('update', );
    const maxTime = 2000;
    const f = (performance.now() % maxTime) / maxTime;

    mesh.position.copy(localPlayer.position);
    mesh.quaternion.copy(localPlayer.quaternion);
    mesh.updateMatrixWorld();

    material.uniforms.uTime.value = f;
    material.uniforms.uTime.needsUpdate = true;
    material.uniforms.uTimeCubic.value = cubicBezier(f);
    material.uniforms.uTimeCubic.needsUpdate = true;
  });
  
  return mesh;
};