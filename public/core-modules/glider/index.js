import * as THREE from 'three';
import metaversefile from 'metaversefile';
/****************************************************** trail ******************************************************/
import { Trail } from './trail.js';
/****************************************************** end trail ******************************************************/


const {useApp, useFrame, useLoaders, useLocalPlayer} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1'); 
const textureLoader = new THREE.TextureLoader();

const noiseTexture = textureLoader.load(`${baseUrl}textures/Noise28.png`);
noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;

/****************************************************** trail ******************************************************/
const maskTexture = textureLoader.load(`${baseUrl}textures/Trail11.png`);
maskTexture.wrapS = maskTexture.wrapT = THREE.RepeatWrapping;

const gradientMaskTexture = textureLoader.load(`${baseUrl}textures/gradient-mask.png`);
const gradientMaskTexture2 = textureLoader.load(`${baseUrl}textures/gradient-mask3.png`);
// gradientMaskTexture.wrapS = gradientMaskTexture.wrapT = THREE.RepeatWrapping;

const trailTexture = textureLoader.load(`${baseUrl}textures/trail.png`);
trailTexture.wrapS = trailTexture.wrapT = THREE.RepeatWrapping;

const voronoiNoiseTexture = textureLoader.load(`${baseUrl}textures/voronoiNoise.jpg`);
voronoiNoiseTexture.wrapS = voronoiNoiseTexture.wrapT = THREE.RepeatWrapping;
/****************************************************** end trail ******************************************************/

export default () => {  
    const app = useApp();
    const localPlayer = app.getComponent('player') || useLocalPlayer();

    const uniforms = {
      uTime: {
        value: 0
      },
      noiseTexture: {
        value: noiseTexture
      }
    };


    (async () => {
      const u = `${baseUrl}./glider2.glb`;
      const glider = await new Promise((accept, reject) => {
          const {gltfLoader} = useLoaders();
          gltfLoader.load(u, accept, function onprogress() {}, reject);
      });
      app.mainModel = glider.scene;
      glider.scene.traverse(o => {
        if (o.isMesh) {
          if (o.name === 'Fabric') {
            const mapTexture = o.material.map;
            o.material = new THREE.MeshStandardMaterial( {map: mapTexture} );
            o.material.onBeforeCompile = shader => {
              shader.uniforms.uTime = uniforms.uTime;
              shader.uniforms.noiseTexture = uniforms.noiseTexture;
              shader.vertexShader = `
                uniform float uTime;
                uniform sampler2D noiseTexture;
              `
              + shader.vertexShader;

              shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `#include <begin_vertex>

                  vec4 tempPos = modelMatrix * vec4(transformed, 1.0);
                  float uvScale = 0.1;
                  float speed = 0.1;
                  vec2 texUv = vec2(
                    tempPos.x * uvScale + uTime * speed,
                    tempPos.z * uvScale + uTime * speed
                  );
                  vec4 noise = texture2D(noiseTexture, texUv);
                  float noiseScale = 0.1;
                  float fl = smoothstep(2.5, 2., transformed.x);
                  float fr = smoothstep(-2.5, -2., transformed.x);
                  float ff = smoothstep(-1.3, -.8, transformed.z);
                  float fb = smoothstep(2.9, 2.4, transformed.z);
                  float f = min(fl, fr);
                  f = min(f, ff);
                  f = min(f, fb);
                  transformed.y += noise.r * noiseScale * f;
                `
              );
            };
          }
        }
      });
      app.add(glider.scene);
    })();
    useFrame(({timestamp}) => {
      uniforms.uTime.value = timestamp / 1000;
      app.updateMatrixWorld();
    });
    
    /****************************************************** trail ******************************************************/
    // gliderInfo
    let gliderWidth = 2.6;
    let gliderHeight = 0.6;
    let gliderPosZ = 0;
    const _setGliderInfo = (value) => {
      gliderWidth = value.width;
      gliderHeight = value.height;
      gliderPosZ = value.posZ;
    }

    for (const component of app.components) {
      switch (component.key) {
        case 'gliderInfo': {
          _setGliderInfo(component.value)
          break;
        }
        default: {
          break;
        }
      }
    }
    // left trail
    {
      
      const leftTrail = new Trail(localPlayer);
      app.add(leftTrail);

      const rightTrail = new Trail(localPlayer);
      app.add(rightTrail);

      leftTrail.material.uniforms.maskTexture.value = maskTexture;
      leftTrail.material.uniforms.gradientMaskTexture.value = gradientMaskTexture;
      leftTrail.material.uniforms.gradientMaskTexture2.value = gradientMaskTexture2;
      leftTrail.material.uniforms.trailTexture.value = trailTexture;
      leftTrail.material.uniforms.voronoiNoiseTexture.value = voronoiNoiseTexture;

      rightTrail.material.uniforms.maskTexture.value = maskTexture;
      rightTrail.material.uniforms.gradientMaskTexture.value = gradientMaskTexture;
      rightTrail.material.uniforms.gradientMaskTexture2.value = gradientMaskTexture2;
      rightTrail.material.uniforms.trailTexture.value = trailTexture;
      rightTrail.material.uniforms.voronoiNoiseTexture.value = voronoiNoiseTexture;


      
      const localVector = new THREE.Vector3();
      const localVector2 = new THREE.Vector3();
      const localVector3 = new THREE.Vector3();

      const leftTrailPos = new THREE.Vector3();
      const rightTrailPos = new THREE.Vector3();

      let localQuaternion = new THREE.Quaternion();
      const localRotationVetor = new THREE.Vector3(0, 1, 0);
      
      let rotDegree = 0.;
      let trailAlpha = 0; 
      let resetTrailPosition = false;
      useFrame(({timestamp}) => {
        
        // get player direction
        localVector.set(0, 0, -1);
        const currentDir = localVector.applyQuaternion(localPlayer.quaternion);
        currentDir.normalize();

        // get player speed
        const currentSpeed = localVector3.set(localPlayer.avatar.velocity.x, 0, localPlayer.avatar.velocity.z).length();
        
        const hasGlider = localPlayer.hasAction('glider');
        const sprintSpeed = 10;
        if (hasGlider && currentSpeed > sprintSpeed) {
          if (trailAlpha < 1) {
            resetTrailPosition = true;
            trailAlpha = 1;
          }          
        }
        else {
          if (trailAlpha > 0) {
            trailAlpha = 0;
          }
        }

        if (trailAlpha > 0 && hasGlider) {
          leftTrail.visible = true;
          rightTrail.visible = true;
          // rotate trail
          const rotatedSpeed = 0.06;
          rotDegree += rotatedSpeed;
          localQuaternion.setFromAxisAngle(localRotationVetor, -Math.PI / 2);
          localVector2.set(currentDir.x, currentDir.y, currentDir.z).applyQuaternion(localQuaternion);
          
          leftTrailPos.set(gliderWidth, gliderHeight, gliderPosZ).applyMatrix4(app.mainModel.matrixWorld);
          rightTrailPos.set(-gliderWidth, gliderHeight, gliderPosZ).applyMatrix4(app.mainModel.matrixWorld);

          if (resetTrailPosition) {
            leftTrail.resetTrail(leftTrailPos);
            rightTrail.resetTrail(rightTrailPos);
            resetTrailPosition = false;
          }

          leftTrail.update(rotDegree, localVector2, leftTrailPos);
          rightTrail.update(rotDegree, localVector2, rightTrailPos);

          leftTrail.material.uniforms.uTime.value = timestamp / 1000;
          rightTrail.material.uniforms.uTime.value = timestamp / 1000;

          leftTrail.material.uniforms.uOpacity.value = trailAlpha;
          rightTrail.material.uniforms.uOpacity.value = trailAlpha;

        }
        else {
          leftTrail.visible = false;
          rightTrail.visible = false;
        }

        app.updateMatrixWorld();
      });
    }
    
    
    app.setComponent('renderPriority', 'low');
    /****************************************************** end trail ******************************************************/

    return app;
}