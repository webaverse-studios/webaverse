import * as THREE from 'three';
import {
  StreetLineGeometry,
} from '../geometries/StreetGeometry.js';

export class PathMesh extends THREE.Mesh {
  static makeGeometry(splinePoints) {
    let geometry;
    const hasPoints = splinePoints.length > 0;
    if (hasPoints) {
      const curve = new THREE.CatmullRomCurve3(splinePoints);
      const numPoints = splinePoints.length;
      geometry = new StreetLineGeometry(
        curve, // path
        numPoints, // tubularSegments
        0.05, // radiusX
        0, // radiusY
      );
    } else {
      geometry = new THREE.BufferGeometry();
    }
    return geometry;
  }
  constructor(splinePoints = [], {
    animate = false,
  } = {}) {
    const geometry = PathMesh.makeGeometry(splinePoints);

    let material;
    const map = new THREE.Texture();
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    (async () => {
      const img = await new Promise((accept, reject) => {
        const img = new Image();
        img.onload = () => {
          accept(img);
        };
        img.onerror = err => {
          reject(err);
        };
        img.src = '/images/arrowtail.png';
      });
      map.image = img;
      map.needsUpdate = true;
    })();

    if (animate) {
      material = new THREE.ShaderMaterial({
        uniforms: {
          map: {
            value: map,
            needsUpdate: true,
          },
          uTime: {
            value: 0,
            needsUpdate: true,
          },
          uShift: {
            value: 0,
            needsUpdate: true,
          },
        },
        vertexShader: `\
          varying vec2 vUv;
          varying float vDistance;
          
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            
            // get distance to camera
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vDistance = -mvPosition.z;
          }
        `,
        fragmentShader: `\
          #define PI 3.1415926535897932384626433832795
          
          uniform sampler2D map;
          uniform float uTime;
          uniform float uShift;
          varying vec2 vUv;
          varying float vDistance;

          // hue rotate color by radians
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
            gl_FragColor = texture2D(map, vUv);

            vec4 topColor = texture2D(map, vec2(0.5, 1.));
            topColor.rgb = hueShift(topColor.rgb, uShift * PI * 2.);
            /* const vec3 materialDesignBlue400 = vec3(${
              new THREE.Color(0x2196F3).toArray().map(n => n.toFixed(8)).join(',')
            }); */
            
            const float maxDistance = 100.;
            const float animationTime = 1.;
            const float distanceWidth = 1.;
            const float tailWidth = 1.;
            // gl_FragColor.r = vDistance / maxDistance;
            float targetDistance = mod(uTime, animationTime) * maxDistance;
            // float distanceDelta = abs(vDistance - targetDistance);
            float distanceDelta = abs(vUv.y - targetDistance);
            if (distanceDelta < distanceWidth) {
              // float f = 1. - distanceDelta / distanceWidth;

              // gl_FragColor.rgb = 1. - gl_FragColor.rgb;
              gl_FragColor.rgb = hueShift(gl_FragColor.rgb, uShift * PI * 2.);
              gl_FragColor.a = 1.;
            } else {
              if (vUv.y < targetDistance) {
                gl_FragColor.rgb = topColor.rgb;
                // gl_FragColor.rgb = materialDesignBlue400;
                gl_FragColor.a = 1. - min(max((targetDistance - vUv.y  - distanceWidth) * 0.1, 0.), 1.);
              } else {
                gl_FragColor.a = 0.;  
              }
            }
          }
        `,
        // side: THREE.DoubleSide,
        transparent: true,
        alphaToCoverage: true,
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        map,
      });
    }
    super(geometry, material);

    this.visible = splinePoints.length > 0;

    let lastShiftSnap = 0;
    this.onBeforeRender = () => {
      const now = performance.now();
      
      if (animate) {
        material.uniforms.uTime.value = now / 1000;
        material.uniforms.uTime.needsUpdate = true;

        const shiftSnap = Math.floor(now / 1000);
        if (shiftSnap !== lastShiftSnap) {
          material.uniforms.uShift.value = Math.random();
          material.uniforms.uShift.needsUpdate = true;
          
          lastShiftSnap = shiftSnap;
        }
      }
    };
  }
}