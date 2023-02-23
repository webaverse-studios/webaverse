import * as THREE from 'three';

// import metaversefile from 'metaversefile';
// const {
//   useApp,
//   useFrame,
//   useCleanup,
//   useRenderer,
//   useLocalPlayer,
//   usePhysics,
//   useLoaders,
//   useActivate,
//   useExport,
//   useWriters,
// } = metaversefile;

// const wearableScale = 1;

/* const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4(); */

// const z180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

//

const FPS = 60;
const downQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2);

//

export default ctx => {
  const {
    useApp,
    useEngine,
    useFrame,
    useActivate,
    useCleanup,
    useExport,
    useLoaders,
    usePhysics,
    usePhysicsTracker,
  } = ctx;

  const app = useApp();
  
  const {gltfLoader, exrLoader} = useLoaders();
  // const renderer = useRenderer();
  const engine = useEngine();
  const {webaverseRenderer, playersManager} = engine;
  const {renderer} = webaverseRenderer;
  const physics = usePhysics();
  const physicsTracker = usePhysicsTracker();
  const localPlayer = playersManager.getLocalPlayer();

  const srcUrl = ${this.srcUrl};
  for (const {key, value} of components) {
    app.setComponent(key, value);
  }
 
  app.glb = null;
  const animationMixers = [];
  const uvScrolls = [];
  const physicsObjects = [];
  // app.physicsObjects = physicsObjects;
  
  // glb state
  let animations;
  
  // sit state
  let sitSpec = null;
  
  let activateCb = null;
  ctx.waitUntil((async () => {
    let o;
    try {
      o = await new Promise((accept, reject) => {
        gltfLoader.load(srcUrl, accept, function onprogress() {}, reject);
      });
    } catch(err) {
      console.warn(err);
    }
    // console.log('got o', o);

    if (o) {
      app.glb = o;
      const {parser} = o;
      animations = o.animations;
      // console.log('got animations', animations);
      o = o.scene;

      // components
      const envMapComponent = app.getComponent('envMap');

      // * true by default
      let appHasPhysics = true;
      const hasPhysicsComponent = app.hasComponent('physics');
      if (hasPhysicsComponent) {
        const physicsComponent = app.getComponent('physics');
        appHasPhysics = physicsComponent;
      }
      
      const _addAntialiasing = aaLevel => {
        o.traverse(o => {
          if (o.isMesh) {
            ['alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'envMap', 'lightMap', 'map', 'metalnessMap', 'normalMap', 'roughnessMap'].forEach(mapType => {
              if (o.material[mapType]) {
                o.material[mapType].anisotropy = aaLevel;
              }
            });
            if (o.material.transmission !== undefined) {
              o.material.transmission = 0;
              o.material.opacity = 0.25;
            }
          }
        });
      };
      _addAntialiasing(16);
      
      const _loadHubsComponents = () => {
        const _loadAnimations = () => {
          const animationEnabled = !!(app.getComponent('animation') ?? true);
          if (animationEnabled) {
            const idleAnimation = animations.find(a => a.name === 'idle');
            const clips = idleAnimation ? [idleAnimation] : animations;
            for (const clip of clips) {
              const mixer = new THREE.AnimationMixer(o);
              
              const action = mixer.clipAction(clip);
              action.play();

              animationMixers.push(mixer);
            }
          }
        };
        if (!app.hasComponent('pet')) {
          _loadAnimations();
        }

        const _loadLightmaps = () => {
          const _loadLightmap = async (parser, materialIndex) => {
            const lightmapDef = parser.json.materials[materialIndex].extensions.MOZ_lightmap;
            const [material, lightMap] = await Promise.all([
              parser.getDependency('material', materialIndex),
              parser.getDependency('texture', lightmapDef.index)
            ]);
            material.lightMap = lightMap;
            material.lightMapIntensity = lightmapDef.intensity !== undefined ? lightmapDef.intensity : 1;
            material.needsUpdate = true;
            return lightMap;
          };
          if (parser.json.materials) {
            for (let i = 0; i < parser.json.materials.length; i++) {
              const materialNode = parser.json.materials[i];

              if (!materialNode.extensions) continue;

              if (materialNode.extensions.MOZ_lightmap) {
                _loadLightmap(parser, i);
              }
            }
          }
        };
        _loadLightmaps();
        
        const _loadUvScroll = o => {
          const textureToData = new Map();
          const registeredTextures = [];
          o.traverse(o => {
            if (o.isMesh && o?.userData?.gltfExtensions?.MOZ_hubs_components?.['uv-scroll']) {
              const uvScrollSpec = o.userData.gltfExtensions.MOZ_hubs_components['uv-scroll'];
              const {increment, speed} = uvScrollSpec;
              
              const mesh = o; // this.el.getObject3D("mesh") || this.el.getObject3D("skinnedmesh");
              const {material} = mesh;
              if (material) {
                const spec = {
                  data: {
                    increment,
                    speed,
                  },
                };

                // We store mesh here instead of the material directly because we end up swapping out the material in injectCustomShaderChunks.
                // We need material in the first place because of MobileStandardMaterial
                const instance = { component: spec, mesh };

                spec.instance = instance;
                spec.map = material.map || material.emissiveMap;

                if (spec.map && !textureToData.has(spec.map)) {
                  textureToData.set(spec.map, {
                    offset: new THREE.Vector2(),
                    instances: [instance]
                  });
                  registeredTextures.push(spec.map);
                } else if (!spec.map) {
                  console.warn("Ignoring uv-scroll added to mesh with no scrollable texture.");
                } else {
                  console.warn(
                    "Multiple uv-scroll instances added to objects sharing a texture, only the speed/increment from the first one will have any effect"
                  );
                  textureToData.get(spec.map).instances.push(instance);
                }
              }
              let lastTimestamp = Date.now();
              const update = now => {
                const dt = now - lastTimestamp;
                for (let i = 0; i < registeredTextures.length; i++) {
                  const map = registeredTextures[i];
                  const { offset, instances } = textureToData.get(map);
                  const { component } = instances[0];

                  offset.addScaledVector(component.data.speed, dt / 1000);

                  offset.x = offset.x % 1.0;
                  offset.y = offset.y % 1.0;

                  const increment = component.data.increment;
                  map.offset.x = increment.x ? offset.x - (offset.x % increment.x) : offset.x;
                  map.offset.y = increment.y ? offset.y - (offset.y % increment.y) : offset.y;
                }
                lastTimestamp = now;
              };
              uvScrolls.push({
                update,
              });
            }
          });
        };
        _loadUvScroll(o);
      };
      _loadHubsComponents();
      
      // console.log('got o', o);
      // o.traverse(o => {
      //   if (o.isMesh) {
      //     // console.log('latch mesh', o);
      //     o.onBeforeRender = renderer => {
      //       debugger;
      //     };
      //   }
      // });

      app.add(o);
      o.updateMatrixWorld();
      
      if (appHasPhysics) {
        const _addPhysics = async () => {
          const physicsObject = physics.addGeometry(o);
          physicsObjects.push(physicsObject);
          physicsTracker.addAppPhysicsObject(app, physicsObject);
        };

        _addPhysics();
      }

      // env map
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader(); 

      const _loadExr = async path => {
        let t;
        try {
          t = await new Promise((accept, reject) => {
            exrLoader.load(path, accept, function onprogress() {}, reject);
          });
        } catch(err) {
          console.warn(err);
        }
        return t;
      };
      const _setupEnvMap = texture => {
        const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
        return exrCubeRenderTarget ? exrCubeRenderTarget.texture : null;
      };
      const _addEnvMap = (o, envMap) => {
        o.material.envMap = envMap;
        o.material.needsUpdate = true;
      };

    if(envMapComponent) {
      const envMapTexture = await Promise.resolve(await _loadExr(envMapComponent));
      app.envMap = _setupEnvMap(envMapTexture);
    }
      o.traverse(o => {
        if (o.isMesh) {
          o.frustumCulled = false;
          o.castShadow = true;
          o.receiveShadow = true;
          if(app.envMap) {
            _addEnvMap(o, app.envMap);
          }
        }
      });
      
      activateCb = () => {
        if (
          app.getComponent('sit')
        ) {
          app.wear();
        }
      };
    }
  })());
  
  const _unwear = () => {
    if (sitSpec) {
      const sitAction = localPlayer.getAction('sit');
      if (sitAction) {
        localPlayer.removeAction('sit');
      }
    }
  };
  app.addEventListener('wearupdate', e => {
    if (e.wear) {
      if (app.glb) {
        // const {animations} = app.glb;

        sitSpec = app.getComponent('sit');
        if (sitSpec) {
          let rideMesh = null;
          app.glb.scene.traverse(o => {
            if (rideMesh === null && o.isSkinnedMesh) {
              rideMesh = o;
            }
          });

          const {instanceId} = app;
          const localPlayer = useLocalPlayer();

          const rideBone = sitSpec.sitBone ? rideMesh.skeleton.bones.find(bone => bone.name === sitSpec.sitBone) : null;
          const sitAction = {
            type: 'sit',
            time: 0,
            animation: sitSpec.subtype,
            controllingId: instanceId,
            controllingBone: rideBone,
          };
          localPlayer.setControlAction(sitAction);
        }
      }
    } else {
      _unwear();
    }
  });
  
  useFrame(({timestamp, timeDiff}) => {
    const _updateAnimation = () => {
      const deltaSeconds = timeDiff / 1000;
      for (const mixer of animationMixers) {
        mixer.update(deltaSeconds);
        app.updateMatrixWorld();
      }
    };
    _updateAnimation();
    
    const _updateUvScroll = () => {
      for (const uvScroll of uvScrolls) {
        uvScroll.update(timestamp);
      }
    };
    _updateUvScroll();
  });
  
  useActivate(() => {
    activateCb && activateCb();
  });
  
  useCleanup(() => {
    for (const physicsObject of physicsObjects) {
      physics.removeGeometry(physicsObject);
      physicsTracker.removeAppPhysicsObject(app, physicsObject);
    }
    _unwear();
  });

  useExport(async ({mimeType, args}) => {
    console.log('got mime type', JSON.stringify(mimeType), JSON.stringify(args));

    const width = 512;
    const height = 512;

    if (mimeType === 'image/png+360-video') {
      const {webmWriter} = useWriters();
      console.log('got webm writer', webmWriter);
      
      // video writer
      const videoWriter = new webmWriter({
        quality: 1,
        fileWriter: null,
        fd: null,
        frameDuration: null,
        frameRate: FPS,
      });

      console.log('video 1');

      // write canvas
      // const writeCanvas = document.createElement('canvas');
      // writeCanvas.width = width;
      // writeCanvas.height = height;
      // const writeCtx = writeCanvas.getContext('2d');
      const _pushFrame = () => {
        // draw
        // writeCtx.drawImage(renderer.domElement, 0, 0);
        videoWriter.addFrame(renderer.domElement);
      };

      console.log('video 2');

      // main canvas
      const localWidth = parseInt(args.width, 10) || width;
      const localHeight = parseInt(args.height, 10) || height;
      const canvas = document.createElement('canvas');
      canvas.width = localWidth;
      canvas.height = localHeight;
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
      });
      renderer.autoClear = false;
      renderer.sortObjects = false;
      renderer.physicallyCorrectLights = true;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.xr.enabled = true;
      
      const scene = new THREE.Scene();
      scene.autoUpdate = false;

      const ambientLight = new THREE.AmbientLight(0xffffff, 2);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
      directionalLight.position.set(0, 1, 2);
      directionalLight.updateMatrixWorld();
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      scene.add(directionalLight);
      
      scene.add(app);

      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      camera.position.set(5, 1.6, 5);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      console.log('video 3');

      const numAngles = 32;
      for (let i = 0; i < numAngles; i++) {
        console.log('render angle', i, numAngles);
        const angle = i * Math.PI * 2 / numAngles;
        const x = Math.cos(angle);
        const z = Math.sin(angle);
        camera.position.set(x * 5, 1.6, z * 5);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        renderer.clear();
        renderer.render(scene, camera);
        _pushFrame();
      }

      console.log('video 4');

      const blob = await videoWriter.complete();
      return blob;
    } else if (mimeType === 'image/png+profile') {
      const localWidth = parseInt(args.width, 10) || width;
      const localHeight = parseInt(args.height, 10) || height;
      const canvas = new OffscreenCanvas(localWidth, localHeight);
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
      });
      renderer.autoClear = false;
      renderer.sortObjects = false;
      renderer.physicallyCorrectLights = true;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.xr.enabled = true;
      
      const scene = new THREE.Scene();
      scene.autoUpdate = false;

      const ambientLight = new THREE.AmbientLight(0xffffff, 2);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
      directionalLight.position.set(0, 1, 2);
      directionalLight.updateMatrixWorld();
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      scene.add(directionalLight);
      
      scene.add(app);

      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      camera.position.set(5, 1.6, 5);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      // renderer.setClearColor(0xFF0000, 1);
      // renderer.clear();
      renderer.render(scene, camera);

      // get the blob
      const blob = await canvas.convertToBlob();
      return blob;
    } else if (mimeType === 'image/png+birdseye') {
      const localWidth = parseInt(args.width, 10) || width;
      const localHeight = parseInt(args.height, 10) || height;
      const canvas = new OffscreenCanvas(localWidth, localHeight);
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
      });
      renderer.autoClear = false;
      renderer.sortObjects = false;
      renderer.physicallyCorrectLights = true;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.xr.enabled = true;
      
      const scene = new THREE.Scene();
      scene.autoUpdate = false;

      const ambientLight = new THREE.AmbientLight(0xffffff, 2);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
      directionalLight.position.set(0, 1, 2);
      directionalLight.updateMatrixWorld();
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      scene.add(directionalLight);
      
      scene.add(app);

      // const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
      const worldWidth = 40;
      const worldHeight = 40;
      const camera = new THREE.OrthographicCamera(
        worldWidth / - 2, worldWidth / 2,
        worldHeight / 2, worldHeight / - 2,
        0.1, 1000
      );
      camera.position.set(0, 40, 0);
      camera.quaternion.copy(downQuaternion);
      // camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      renderer.setClearColor(0xFFFFFF, 1);
      renderer.clear();
      renderer.render(scene, camera);

      // get the blob
      const blob = await canvas.convertToBlob();
      return blob;
    } else {
      return null;
    }
  });

  app.stop = () => {
    for (const mixer of animationMixers) {
      console.log('got mixer', mixer);
      mixer.stopAllAction();
    }
    animationMixers.length = 0;
  };
  
  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'glb';
export const components = ${this.components};
