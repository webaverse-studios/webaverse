import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  entranceExitWidth,
  entranceExitHeight,
  entranceExitDepth,
} from 'zine/zine-constants.js';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();

//

const entranceExitMaterial = new THREE.ShaderMaterial({
  vertexShader: `\
    attribute vec3 color;
    varying vec2 vUv;
    varying vec3 vColor;

    void main() {
      vUv = uv;
      vColor = color;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `\
    varying vec2 vUv;
    varying vec3 vColor;

    void main() {
      // vec3 c = vec3(1., 0., 1.);
      vec3 c = vColor;
      gl_FragColor = vec4(c, 0.5);
      gl_FragColor.rg += vUv * 0.2;
    }
  `,
  transparent: true,
});
export class EntranceExitMesh extends THREE.Mesh {
  constructor({
    entranceExitLocations,
  }) {
    const baseGeometry = new THREE.BoxGeometry(entranceExitWidth, entranceExitHeight, entranceExitDepth)
      .translate(0, entranceExitHeight / 2, entranceExitDepth / 2);
    // fill colors
    const colors = new Float32Array(baseGeometry.attributes.position.array.length);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i + 0] = 1;
      colors[i + 1] = 0;
      colors[i + 2] = 1;
    }
    baseGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const geometries = entranceExitLocations.map(portalLocation => {
      const g = baseGeometry.clone();
      g.applyMatrix4(
        localMatrix.compose(
          localVector.fromArray(portalLocation.position),
          localQuaternion.fromArray(portalLocation.quaternion),
          localVector2.setScalar(1)
        )
      );
      return g;
    });
    const geometry = geometries.length > 0 ? BufferGeometryUtils.mergeBufferGeometries(geometries) : new THREE.BufferGeometry();

    const material = entranceExitMaterial
    super(geometry, material);

    // const hasGeometry = geometries.length > 0;

    const entranceExitMesh = this;
    entranceExitMesh.frustumCulled = false;
    const blueColor = new THREE.Color(0x8000FF);
    const purpleColor = new THREE.Color(0xFF00FF);
    entranceExitMesh.setHighlights = highlights => {
      for (let i = 0; i < highlights.length; i++) {
        const highlight = highlights[i];
        const color = highlight ? blueColor : purpleColor;
        for (let j = 0; j < baseGeometry.attributes.color.array.length / 3; j++) {
          const baseJ = i * baseGeometry.attributes.color.array.length + j * 3;
          // set rgb
          geometry.attributes.color.array[baseJ + 0] = color.r;
          geometry.attributes.color.array[baseJ + 1] = color.g;
          geometry.attributes.color.array[baseJ + 2] = color.b;
        }
      }
      geometry.attributes.color.needsUpdate = true;
    };
    // entranceExitMesh.enabled = false;
    // entranceExitMesh.visible = false;
    // entranceExitMesh.updateVisibility = () => {
    //   entranceExitMesh.visible = entranceExitMesh.enabled && hasGeometry;
    // };
  }
}