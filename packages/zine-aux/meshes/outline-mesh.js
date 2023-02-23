import * as THREE from 'three';

//

const offsetDepthSmall = 0.000075;
const offsetDepthLarge = 0.00035;

//

const highlightVertexShader = `\
    precision highp float;
    precision highp int;
    // uniform float uVertexOffset;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying vec2 vWorldUv;
    varying vec3 vPos;
    varying vec3 vNormal;

    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      // vec3 newPosition = position + normal * vec3( uVertexOffset, uVertexOffset, uVertexOffset );
      vec3 newPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);

      vViewPosition = -mvPosition.xyz;
      vUv = uv;
      vPos = position;
      vNormal = normal;
    }
  `;

const highlightGridFragmentShader = `\
    
  uniform vec3 uColor;
  uniform float uTime;

  varying vec3 vViewPosition;
  varying vec2 vUv;

  varying vec3 vPos;
  varying vec3 vNormal;

  float edgeFactor(vec2 uv) {
    float divisor = 0.5;
    float power = 0.5;
    return min(
      pow(abs(uv.x - round(uv.x/divisor)*divisor), power),
      pow(abs(uv.y - round(uv.y/divisor)*divisor), power)
    ) > 0.1 ? 0.0 : 1.0;
  }

  vec3 getTriPlanarBlend(vec3 _wNorm){
    // in wNorm is the world-space normal of the fragment
    vec3 blending = abs( _wNorm );
    blending = normalize(blending);
    return blending;
  }

  void main() {

    vec3 diffuseColor2 = uColor;
    float normalRepeat = 1.0;

    vec3 blending = getTriPlanarBlend(vNormal);
    float xaxis = edgeFactor(vPos.yz * normalRepeat);
    float yaxis = edgeFactor(vPos.xz * normalRepeat);
    float zaxis = edgeFactor(vPos.xy * normalRepeat);
    float f = xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;

    if (abs(length(vViewPosition) - uTime * 20.) < 0.1) {
      f = 1.0;
    }

    float d = gl_FragCoord.z/gl_FragCoord.w;
    vec3 c = diffuseColor2; // mix(diffuseColor1, diffuseColor2, abs(vPos.y/10.));
    float f2 = 1. + d/10.0;
    gl_FragColor = vec4(c, 0.5 + max(f, 0.3) * f2 * 0.5);

    #include <tonemapping_fragment>
    #include <encodings_fragment>
  }
`;

const buildMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: {
      type: 'c',
      value: new THREE.Color(0x64b5f6),
      needsUpdate: true,
    },
    uTime: {
      type: 'f',
      value: 0,
      needsUpdate: true,
    },
    uVertexOffset: {
      type: 'f',
      value: offsetDepthSmall,
    },
  },
  vertexShader: highlightVertexShader,
  fragmentShader: highlightGridFragmentShader,
  transparent: true,
});

export class OutlineMesh extends THREE.Mesh {
  constructor({
    geometry,
  }) {    
    const material = buildMaterial.clone();
    super(geometry, material);
  }
  update(timestamp) {
    const timestampS = timestamp / 1000;
    this.material.uniforms.uTime.value = timestampS;
    this.material.uniforms.uTime.needsUpdate = true;
  }
}