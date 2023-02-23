import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const localVector = new THREE.Vector3();
const localVector2D = new THREE.Vector2();

function RectangleRounded( w, h, r, s ) { // width, height, radiusCorner, smoothness
  const pi2 = Math.PI * 2;
  const n = ( s + 1 ) * 4; // number of segments    
  let indices = [];
  let positions = [];
 let uvs = [];   
  let qu, sgx, sgy, x, y;
  
for ( let j = 1; j < n + 1; j ++ ) indices.push( 0, j, j + 1 ); // 0 is center
  indices.push( 0, n, 1 );   
  positions.push( 0, 0, 0 ); // rectangle center
  uvs.push( 0.5, 0.5 );   
  for ( let j = 0; j < n ; j ++ ) contour( j );
  
  const geometry = new THREE.BufferGeometry( );
  geometry.setIndex( new THREE.BufferAttribute( new Uint32Array( indices ), 1 ) );
geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( positions ), 3 ) );
geometry.setAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( uvs ), 2 ) );
geometry.computeVertexNormals();
  
  return geometry;
  
  function contour( j ) {
      
      qu = Math.trunc( 4 * j / n ) + 1 ;      // quadrant  qu: 1..4         
      sgx = ( qu === 1 || qu === 4 ? 1 : -1 ) // signum left/right
      sgy =  qu < 3 ? 1 : -1;                 // signum  top / bottom
      x = sgx * ( w / 2 - r ) + r * Math.cos( pi2 * ( j - qu + 1 ) / ( n - 4 ) ); // corner center + circle
      y = sgy * ( h / 2 - r ) + r * Math.sin( pi2 * ( j - qu + 1 ) / ( n - 4 ) );   

      positions.push( x, y, 0 );       
      uvs.push( 0.5 + x / w, 0.5 + y / h );       
      
  }
}

export class SpeechBubbleMesh extends THREE.Mesh {
  constructor({
    // renderer,
    // portalScene,
    // portalCamera,
    // noiseImage,
    text = `I'm going places...`,
    rng = Math.random,
  } = {}) {
    const geometry = (() => {
      const w = 2;
      const h = 0.4;
      const r = 0.05;
      const s = 4;
      const roundedRectGeometry = new RectangleRounded(w, h, r, s);

      const tailShapeGeometry = (() => {
        const shape = new THREE.Shape();

        const tw = 0.1;
        const th = 0.2;
        
        const topLeft = (w - r - tw) * (-0.5 + 0.25 + rng() * 0.25);
        const bottomLeft = (w - r - tw) * (-0.5 + 0.25 + rng() * 0.25);
        const startCenterPoint = new THREE.Vector2(topLeft, -h/2);
        const startLeftPoint = new THREE.Vector2(topLeft - tw, startCenterPoint.y);
        const startRightPoint = new THREE.Vector2(topLeft + tw, startCenterPoint.y);
        const startBottomPoint = new THREE.Vector2(bottomLeft, startCenterPoint.y - th);

        const moveTo = p => shape.moveTo(p.x, p.y);
        const lineTo = p => shape.lineTo(p.x, p.y);
        moveTo(startLeftPoint);
        lineTo(startBottomPoint);
        lineTo(startRightPoint);
        lineTo(startLeftPoint);

        const shapeGeometry = new THREE.ShapeGeometry(shape);
        const uvs = shapeGeometry.attributes.uv.array;
        for (let i = 0; i < uvs.length; i += 2) {
          const positionIndex = i / 2;
          const position = localVector.fromArray(shapeGeometry.attributes.position.array, positionIndex * 3);

          uvs[i] = (position.x - (-w/2)) / w;
          uvs[i + 1] = 0.;
        }
        return shapeGeometry;
      })();

      return BufferGeometryUtils.mergeBufferGeometries([
        roundedRectGeometry,
        tailShapeGeometry,
      ]);
    })();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        // iTime: {
        //   value: 0,
        //   needsUpdate: true,
        // },
        // iChannel0: {
        //   value: iChannel0,
        //   needsUpdate: true,
        // },
        // iChannel1: {
        //   value: null,
        //   needsUpdate: true,
        // },
        // iResolution: {
        //   value: new THREE.Vector2(1024, 1024),
        //   needsUpdate: true,
        // },
        // scale: {
        //   value: 1,
        //   needsUpdate: true,
        // },
      },
      vertexShader: `\
        varying vec2 vUv;

        void main() {
          vec3 p = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);

          vUv = uv;
        }
      `,
      fragmentShader: `\
        varying vec2 vUv;
        
        #define PI 3.1415926535897932384626433832795
        
        void main() {
          // vec2 uv = vUv;
          gl_FragColor = vec4(vUv, 0., 1.);
        }
      `,
      transparent: true,
    });

    super(geometry, material);
  }
  /* update(timestamp) {
    
  } */
}