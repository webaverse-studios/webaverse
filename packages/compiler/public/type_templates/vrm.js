import * as THREE from 'three';

// const q180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

const _fetchArrayBuffer = async srcUrl => {
  const res = await fetch(srcUrl);
  if (res.ok) {
    const arrayBuffer = await res.arrayBuffer();
    return arrayBuffer;
  } else {
    throw new Error('failed to load: ' + res.status + ' ' + srcUrl);
  }
};

export default ctx => {
  // const app = useApp();
  // const camera = useCamera();
  // const physics = usePhysics();
  // console.log('got context', ctx);
  const {
    useApp,
    useFrame,
    useActivate,
    useCleanup,
    useCamera,
    usePhysics,
    useExport,
    useLoaders,
    useAvatarManager,
    useTempManager,
    useEngine,
  } = ctx;
  // const THREE = ctx.useTHREE();
  const app = useApp();
  const camera = useCamera();
  const physics = usePhysics();
  const loaders = useLoaders();
  const avatarManager = useAvatarManager();
  const tmpManager = useTempManager();
  const engine = useEngine();

  const localVector = tmpManager.get(THREE.Vector3);
  const localVector2 = tmpManager.get(THREE.Vector3);
  const localQuaternion = tmpManager.get(THREE.Quaternion);
  const localMatrix = tmpManager.get(THREE.Matrix4);

  const srcUrl = ${this.srcUrl};
  const quality = app.getComponent('quality') ?? undefined;

  let avatarRenderer = null;
  let physicsIds = [];
  let activateCb = null;
  let frameCb = null;
  ctx.waitUntil((async () => {
    const {
      gltfLoader,
    } = loaders;

    const arrayBuffer = await _fetchArrayBuffer(srcUrl);
    const gltf = await new Promise((accept, reject) => {
      gltfLoader.parse(arrayBuffer, srcUrl, accept, reject);
    });
    // console.log('got gltf', gltf);

    const avatarQuality = avatarManager.makeQuality(gltf);
    // avatarQuality = avatarManager.makeQuality({
    //   arrayBuffer,
    //   srcUrl,
    //   camera,
    //   quality,
    // });
    app.avatarQuality = avatarQuality;
    // await avatarRenderer.waitForLoad();
    app.add(avatarQuality.scene);
    avatarQuality.scene.updateMatrixWorld();

    // globalThis.app = app;
    // globalThis.avatarRenderer = avatarRenderer;

     /* const _addPhysics = () => {
      const {height, width} = app.avatarRenderer.getAvatarSize();
      const widthPadding = 0.5; // Padding around the avatar since the base width is computed from shoulder distance

      const capsuleRadius = (width / 2) + widthPadding;
      const capsuleHalfHeight = height / 2;

      const halfAvatarCapsuleHeight = (height + width) / 2; // (full world height of the capsule) / 2

      localMatrix.compose(
        localVector.set(0, halfAvatarCapsuleHeight, 0), // start position
        localQuaternion.setFromAxisAngle(localVector2.set(0, 0, 1), Math.PI / 2), // rotate 90 degrees 
        localVector2.set(capsuleRadius, halfAvatarCapsuleHeight, capsuleRadius)
      )
        .premultiply(app.matrixWorld)
        .decompose(localVector, localQuaternion, localVector2);

      const physicsId = physics.addCapsuleGeometry(
        localVector,
        localQuaternion,
        capsuleRadius,
        capsuleHalfHeight,
        false
      );
      physicsIds.push(physicsId);
    };

    if (app.getComponent('physics')) {
      console.log('load physics');
      debugger;
      _addPhysics();
    } */

    // we don't want to have per-frame bone updates for unworn avatars
    const _disableSkeletonMatrixUpdates = () => {
      avatarQuality.scene.traverse(o => {
        if (o.isBone) {
          o.matrixAutoUpdate = false;
        }
      });
    };
    _disableSkeletonMatrixUpdates();

    // handle wearing
    activateCb = async () => {
      const {
        playersManager,
      } = engine;
      const localPlayer = playersManager.getLocalPlayer();
      localPlayer.setAvatarApp(app);
    };

    // frameCb = ({timestamp, timeDiff}) => {
    //   if (!avatarRenderer.isControlled) {
    //     avatarRenderer.scene.updateMatrixWorld();
    //     avatarRenderer.update(timestamp, timeDiff);
    //   }
    // };
  })());

  useActivate(() => {
    activateCb && activateCb();
  });

  // useFrame((e) => {
  //   frameCb && frameCb(e);
  // });

  // controlled tracking
  const _setPhysicsEnabled = enabled => {
    if (enabled) {
      for (const physicsId of physicsIds) {
        physics.disableGeometry(physicsId);
        physics.disableGeometryQueries(physicsId);
      }
    } else {
      for (const physicsId of physicsIds) {
        physics.enableGeometry(physicsId);
        physics.enableGeometryQueries(physicsId);
      }
    }
  };
  /* const _setControlled = controlled => {
    avatarRenderer && avatarRenderer.setControlled(controlled);
    _setPhysicsEnabled(controlled);
  };
  _setControlled(!!app.getComponent('controlled'));
  app.addEventListener('componentupdate', e => {
    const {key, value} = e;
    if (key === 'controlled') {
      _setControlled(value);
    }
  }); */

  // cleanup
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    physicsIds.length = 0;
  });

  useExport(async (opts) => {
    // console.log('use export', JSON.stringify(opts));
    const {mimeType} = opts;
    if (mimeType === 'image/png+icon') {
      // console.log('yes mime type', JSON.stringify({mimeType}));
      const avatarIconer = useAvatarIconer();
      const {getDefaultCanvas} = avatarIconer;
      
      const canvas = await getDefaultCanvas(srcUrl, 300, 300);
      let blob;
      try {
        blob = await new Promise((accept, reject) => {
          canvas.toBlob(accept, 'image/png');
        });
      } catch(err) {
        console.warn(err);
      }
      return blob;
    } else {
      return null;
    }
  });

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'vrm';
export const components = ${this.components};