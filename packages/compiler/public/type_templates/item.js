import * as THREE from 'three';

// import metaversefile from 'metaversefile';
// const {
//   useApp,
//   usePhysics,
//   useFrame,
//   useLoaders,
// } = metaversefile;

const upVector = new THREE.Vector3(0, 1, 0);
const baseHeight = 0.5;

export default ctx => {
  const {
    useApp,
    usePhysics,
    useFrame,
    useLoaders,
  } = ctx;
  const app = useApp();
  const physics = usePhysics();

  const srcUrl = ${this.srcUrl};

  const itemMode = app.getComponent('itemMode') ?? 'static';
  // console.log('load item app', {srcUrl, itemMode});

  const physicsIds = [];
  app.physicsIds = physicsIds;

  let frameCb = null;
  useFrame(e => {
    frameCb && frameCb(e);
  });

  ctx.waitUntil((async () => {
    const res = await fetch(srcUrl);
    if (res.ok) {
      const itemJson = await res.json();
      const {
        name,
        modelUrl,
      } = itemJson;
      // console.log('got item json', itemJson);
      const gltf = await new Promise((accept, reject) => {
        const {gltfLoader} = useLoaders();
        gltfLoader.load(modelUrl, accept, function onprogress() {}, reject);
      });
      // console.log('item model load', {modelUrl, name, gltf});
      const model = gltf.scene;
      model.name = name;
      app.add(model);
      app.updateMatrixWorld();

      if (itemMode === 'static') {
        // add physics
        const physicsId = physics.addGeometry(model);
        physicsIds.push(physicsId);
      } else if (itemMode === 'float') {
        model.traverse(o => {
          if (o.isMesh) {
            o.geometry.computeVertexNormals();
            o.material = new THREE.MeshPhongMaterial({
              vertexColors: true,
            });
            // o.castShadow = true;
            // o.receiveShadow = true;
          }
        });

        // set up floating animation
        const floatSpeed = 0.5;
        frameCb = (e) => {
          // console.log('got frame', e);
          const {
            timestamp,
          } = e;
          model.position.y = baseHeight + Math.sin(timestamp / 1000 * Math.PI * 2 * floatSpeed) * 0.2;
          model.quaternion.setFromAxisAngle(
            upVector,
            timestamp / 1000 * Math.PI * 2 * floatSpeed
          )
          model.updateMatrixWorld();
        };
      }
    } else {
      console.warn('error loading item', res.status, res.statusText);
    }
  })());

  return app;
};
export const contentId = ${this.contentId};
export const name = ${this.name};
export const description = ${this.description};
export const type = 'item';
export const components = ${this.components};