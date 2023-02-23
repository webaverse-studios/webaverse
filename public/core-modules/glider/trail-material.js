import * as THREE from 'three';

const _createTrailMaterial = () => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: {
        value: 0
      },
      uOpacity: {
        value: 0
      },
      maskTexture: {
        value: null
      },
      gradientMaskTexture: {
        value: null
      },
      gradientMaskTexture2: {
        value: null
      },
      trailTexture: {
        value: null
      },
      voronoiNoiseTexture: {
        value: null
      },
    },
    vertexShader: `\
        
      ${THREE.ShaderChunk.common}
      ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
    
      uniform float uTime;
      
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vPos;
      varying vec3 vNormal;

      
      void main() {
        vec3 pos = position;
        vPos = position;
        vUv = uv;
        
        vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectionPosition = projectionMatrix * viewPosition;
        vWorldPosition = modelPosition.xyz;
        gl_Position = projectionPosition;
        ${THREE.ShaderChunk.logdepthbuf_vertex}
      }
    `,
    fragmentShader: `\
        ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
        #include <common>
        uniform float uTime;
        uniform float uOpacity;
        
        uniform sampler2D maskTexture;
        uniform sampler2D gradientMaskTexture;
        uniform sampler2D gradientMaskTexture2;
        uniform sampler2D trailTexture;
        uniform sampler2D voronoiNoiseTexture;
        
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPos;
        
        void main() {
          float mask = texture2D(maskTexture, vUv).r;
          // float maskStep = clamp(texture2D(gradientMaskTexture, vUv.yx).r - 0.005, 0.0, 1.0);
          // mask = step(maskStep, mask);
          float headFade = 1. - texture2D(gradientMaskTexture, vUv.yx).r;
          float alphaMask = texture2D(gradientMaskTexture2, vUv.yx).r;

          vec4 voronoiNoise = texture2D(
            voronoiNoiseTexture,
            vec2(
              0.25 * vUv.x,
              0.25 * vUv.y + uTime * 0.5
            )
          );  
          vec4 trail = texture2D(
            trailTexture,
            vec2(
              vUv.x,
              mix(2. * vUv.y + uTime * 1.5, voronoiNoise.g, 0.5)
            )
          );  
          float p = 1.5;
          voronoiNoise = vec4(pow(voronoiNoise.r, p), pow(voronoiNoise.g, p), pow(voronoiNoise.b, p), voronoiNoise.a);
          gl_FragColor.rgb = vec3(0.95);
          gl_FragColor.a = smoothstep(0.2, 0.5, mask * trail.r * voronoiNoise.r * uOpacity) * 0.5 * alphaMask * headFade;
 
          ${THREE.ShaderChunk.logdepthbuf_fragment}
        }
    `,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    // blending: THREE.AdditiveBlending,
  });
  return material;
};

export default _createTrailMaterial;