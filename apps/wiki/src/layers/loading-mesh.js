import * as THREE from 'three';
// import {IconPackage, IconMesh} from '../meshes/icon-mesh.js';
// import {assetUrls} from '../../assets/asset-urls.js';

//

// export const hudUrls = assetUrls.huds;

//

// const hudLodDistanceCutoff = 4;

//

export class LoadingMesh extends THREE.InstancedMesh {
  constructor(
    // {
    // instance,
    // gpuTaskManager,
    // renderer,
    // }
  ) {
    const size = 128;
    const maxCount = 512;

    const tex = new THREE.Texture();
    // load from /images/arg-white.png
    tex.image = new Image();
    tex.image.src = '/images/arc2.png';
    tex.image.onload = () => {
      tex.needsUpdate = true;
    };
    tex.image.onerror = console.warn;

    // const geometrySize = size - 2;
    const geometrySize = size;
    const geometry = new THREE.PlaneGeometry(geometrySize, geometrySize)
      .rotateX(-Math.PI / 2);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: {
          value: tex,
          needsUpdate: true,
        },
        opacity: {
          value: 0,
          needsUpdate: true,
        },
        uTime: {
          value: 0,
          needsUpdate: true,
        },
      },
      vertexShader: `\
        varying vec2 vUv;
        uniform float uTime;

        void main() {
          vUv = uv;

          // rotate uv around the center
          #define PI 3.1415926535897932384626433832795
          vec2 center = vec2(0.5, 0.5);
          vec2 uv = vUv - center;
          float angle = uTime * 2.0 * PI;
          float s = sin(angle);
          float c = cos(angle);
          mat2 m = mat2(c, -s, s, c);
          uv = m * uv;
          vUv = uv + center;

          vUv -= 0.5;
          vUv *= 2.;
          vUv += 0.5;

          vec4 instancePosition = vec4(position, 1.0);
          instancePosition = instanceMatrix * instancePosition;
          gl_Position = projectionMatrix * modelViewMatrix * instancePosition;
        }
      `,
      fragmentShader: `\
        uniform sampler2D map;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          if (vUv.x >= 0. && vUv.x <= 1. && vUv.y >= 0. && vUv.y <= 1.) {
            gl_FragColor = texture2D(map, vUv);
          } else {
            gl_FragColor = vec4(1., 1., 1., 1.);
          }
          // gl_FragColor.rgb += (1. - opacity);
          gl_FragColor *= opacity;
          // gl_FragColor.a = opacity;
        }
      `,
      transparent: true,
    });
    super(geometry, material, maxCount);
    
    this.count = 0;
    for (let dx = -10; dx <= 10; dx++) {
      for (let dz = -10; dz <= 10; dz++) {
        this.setMatrixAt(this.count, new THREE.Matrix4()
          .makeTranslation(dx * size, 0, dz * size));
        this.count++;
      }
    }
    this.instanceMatrix.needsUpdate = true;

    /* this.iconMesh = new IconMesh({
      instance,
      lodCutoff: hudLodDistanceCutoff,
      renderer,
    });
    this.add(this.iconMesh); */
  }

  setOpacity(opacity) {
    this.material.uniforms.opacity.value = opacity;
    this.material.uniforms.opacity.needsUpdate = true;
  }

  update() {
    this.material.uniforms.uTime.value = performance.now() / 1000;
    this.material.uniforms.uTime.needsUpdate = true;
  }

  async waitForLoad() {
    // const iconPackage = await IconPackage.loadUrls(hudUrls);
    // this.iconMesh.setPackage(iconPackage);
  }
}