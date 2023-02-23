import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, usePhysics, useLocalPlayer, getAppByInstanceId, useUse, useWear, useCleanup} = metaversefile;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localBox = new THREE.Box3();
const localBox2 = new THREE.Box3();
const localEuler = new THREE.Euler();

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const beamShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: {
      value: 0,
    },
    iResolution: { value: new THREE.Vector3() },
    distance: { value: 0 }
  },
  vertexShader: `\
      
    ${THREE.ShaderChunk.common}
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}

    uniform float uTime;

    varying vec2 vUv;
    varying vec3 vPos;

    void main() {
    vUv = uv;
    vPos = position;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;
    ${THREE.ShaderChunk.logdepthbuf_vertex}
    }
  `,
  fragmentShader: `\
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    uniform float uTime;
    uniform vec3 iResolution;
    uniform float distance;

    varying vec2 vUv;
    varying vec3 vPos;

    #define S smoothstep
    #define T uTime * 2.

    mat2 Rot(float a) {
      float s=sin(a), c=cos(a);
      return mat2(c, -s, s, c);
    }

    float range(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
      float oldRange = oldMax - oldMin;
      float newRange = newMax - newMin;
      return (((oldValue - oldMin) * newRange) / oldRange) + newMin;
    }

    float cnoise(vec3 v) {
      float t = v.z * 0.3;
      v.y *= 0.8;
      float noise = 0.0;
      float s = 0.5;
      noise += range(sin(v.x * 0.9 / s + t * 10.0) + sin(v.x * 2.4 / s + t * 15.0) + sin(v.x * -3.5 / s + t * 4.0) + sin(v.x * -2.5 / s + t * 7.1), -1.0, 1.0, -0.3, 0.3);
      noise += range(sin(v.y * -0.3 / s + t * 18.0) + sin(v.y * 1.6 / s + t * 18.0) + sin(v.y * 2.6 / s + t * 8.0) + sin(v.y * -2.6 / s + t * 4.5), -1.0, 1.0, -0.3, 0.3);
      return noise;
    }

    float BallGyroid(vec3 p) {
      p.yz *= Rot(T * .2);
      p *= 2.;
      return abs(cnoise(p) * dot(sin(p), cos(p.yzx)) / 10.) - .02;
    }

    vec3 GetRayDir(vec2 uv, vec3 p, vec3 l, float z) {
      vec3 f = normalize(l-p),
        r = normalize(cross(vec3(0,1,0), f)),
        u = cross(f, r),
        c = f * z,
        i = c + uv.x * r + uv.y * u,
        d = normalize(i);
      return d;
    }

    vec3 RayPlane(vec3 ro, vec3 rd, vec3 p, vec3 n) {
      float t = dot(p - ro, n) / dot(rd, n);
      t = max(0., t);
      return ro  + rd * t;
    }
    void mainImage( out vec4 fragColor, in vec2 fragCoord )
    {
      vec2 uv = (fragCoord-.5*iResolution.xy)/iResolution.y;
      float cds = dot(uv, uv); //center distance squared

      vec3 ro = vec3(cnoise(vec3(T * 0.5)), 3, -3)*.6;
      
      vec3 rd = GetRayDir(uv, ro, vec3(0,0.,0), 1.);
      vec3 col = vec3(0);

      float light = .005 / cds;
      vec3 lightCol = vec3(1., .8, .7);
      float s = BallGyroid(normalize(ro));
      col += light * .3 * S(.2, .01, s) * lightCol;
  
      //volumetrics
      vec3 pp = RayPlane(ro, rd, vec3(0), normalize(ro));
      float sb = BallGyroid(normalize(pp));
      sb *= S(0.5, .1, cds);
      col += max(0., sb * 2.);
      
      col = pow(col, vec3(.4545));	// gamma correction
      col *= 1. - cds*.5;
      
      fragColor = vec4(col,1.0);
    }
    
    void main() {
      mainImage(gl_FragColor, vUv * iResolution.xy);
      gl_FragColor *= vec4(0.120, 0.280, 1.920, 1.0) * (2. + (vPos.y + 1.8));
      float scanline = sin((vPos.y + 1.8) * 80.0 * distance) * gl_FragColor.b * 0.04;
      gl_FragColor -= scanline;
      gl_FragColor.a *= pow(vPos.y + 1.8, 2.0);
        
    ${THREE.ShaderChunk.logdepthbuf_fragment}
    }
  `,
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

export default e => {
  const app = useApp();
  const physics = usePhysics()
  const localPlayer = useLocalPlayer();
  
  const {components} = app;

  let phoneApp = null;
  let beamApp = null;
  let coneMesh = null;

  e.waitUntil((async () => {
    let u2 = baseUrl + 'assets/iphone.glb';
    if (/^https?:/.test(u2)) {
      u2 = '/@proxy/' + u2;
    }
    const phoneModel = await metaversefile.import(u2);
    phoneApp = metaversefile.createApp({
      name: u2,
    });
    phoneApp.name = 'phone';
    phoneApp.scale.set(0.07, 0.07, 0.07);
    
    app.add(phoneApp);
    phoneApp.updateMatrixWorld();
    phoneApp.contentId = u2;
    phoneApp.instanceId = app.instanceId;

    for (const {key, value} of components) {
      phoneApp.setComponent(key, value);
    }
    await phoneApp.addModule(phoneModel);

    let u3 = baseUrl + 'assets/cone.glb';
    if (/^https?:/.test(u3)) {
      u3 = '/@proxy/' + u3;
    }
    const coneModel = await metaversefile.import(u3);
    beamApp = metaversefile.createApp({
      name: u3,
    });
    beamApp.name = 'beam effect';
    
    app.add(beamApp);
    beamApp.updateMatrixWorld();
    beamApp.contentId = u3;
    beamApp.instanceId = app.instanceId;

    await beamApp.addModule(coneModel);
    beamApp.position.y = 0.13;
    beamApp.position.z = -0.02;
    coneMesh = beamApp.children[0].children[0];
    coneMesh.material = beamShaderMaterial;
    coneMesh.rotation.x = -Math.PI / 2;
    coneMesh.castShadow = false;
    coneMesh.receiveShadow = false;
  })());

  let wearing = false;
  useWear(e => {
    const {wear} = e;
    wearing = !!wear;
  });

  let using = false;
  useUse(e => {
    using = e.use;
  });

  const getBBCenter = bb => {
    const x = (bb.min.x + bb.max.x) / 2;
    const y = (bb.min.y + bb.max.y) / 2;
    const z = (bb.min.z + bb.max.z) / 2;
    return localVector.set(x, y, z);
  };

  const getPhysicalBoundingBox = o => {
    const physicsObjects = o.getPhysicsObjects();

    // Compute physical local bounding box and it's position offset from app.position.
    // THREE.Box3.getCenter() has a console error, so I calculate manually.
    if(physicsObjects) {
      localBox2.makeEmpty();
      for(const physicsObject of physicsObjects) {
        physics.getBoundingBoxForPhysicsId(physicsObject.physicsId, localBox);
        localBox2.union(localBox);
      }
      return localBox2;
    }
  };

  useFrame(({timestamp}) => {
    const grabAction = localPlayer.getAction('grab');
    if(wearing && grabAction && coneMesh) {
      beamApp.matrixWorld.decompose(localVector2, localQuaternion, localVector3);
      const o = getAppByInstanceId(grabAction.instanceId);
      const box = getPhysicalBoundingBox(o);
      const center = getBBCenter(box);

      beamApp.lookAt(center);
      const distance = localVector2.distanceTo(center);
      beamApp.scale.set(1, 1, distance).divideScalar(2);
      beamApp.updateMatrixWorld();

      coneMesh.material.uniforms.uTime.value = timestamp / 1000;
      coneMesh.material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
      coneMesh.material.uniforms.distance.value = distance;
    } else if(!grabAction && coneMesh && coneMesh.material.uniforms.uTime.value > 0) {
      coneMesh.material.uniforms.uTime.value = 0;
      coneMesh.material.uniforms.iResolution.value.set(0, 0, 0);
    }
  });

  useCleanup(() => {
    phoneApp && phoneApp.destroy();
    beamApp && beamApp.destroy();
  });

  app.getPhysicsObjects = () => phoneApp ? phoneApp.getPhysicsObjects() : [];

  return app;
};
