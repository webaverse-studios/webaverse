import * as THREE from 'three';

import metaversefile from 'metaversefile';
import { customshader } from './customshader.js';

const {useApp, useFrame, useInternals, useMaterials} = metaversefile;
const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const textureLoader = new THREE.TextureLoader();
const sparkle = textureLoader.load(`${baseUrl}textures/sparkle.png`);
const circle = textureLoader.load(`${baseUrl}textures/Circle18.png`);
const splashTexture12 = textureLoader.load(`${baseUrl}textures/splash12.png`);
let playEffect = false;
export default () => {
  let player = null;
  const app = useApp();
  const {camera} = useInternals();
  const {WebaverseShaderMaterial} = useMaterials();
  app.playEffect = (p) =>{
    playEffect = true;
    player = p;
  }
  {
      const flashParticleCount = 3;
      const pixelParticleCount = 15;
      //##################################################### get geometry #####################################################
      const _getFlashGeometry = geometry => {
        const geometry2 = new THREE.BufferGeometry();
        ['position', 'normal', 'uv'].forEach(k => {
          geometry2.setAttribute(k, geometry.attributes[k]);
        });
        geometry2.setIndex(geometry.index);
        
        const positions = new Float32Array(flashParticleCount * 3);
        const positionsAttribute = new THREE.InstancedBufferAttribute(positions, 3);
        geometry2.setAttribute('positions', positionsAttribute);
        
        const swAttribute = new THREE.InstancedBufferAttribute(new Float32Array(flashParticleCount), 1);
        swAttribute.setUsage(THREE.DynamicDrawUsage);
        geometry2.setAttribute('sw', swAttribute);

        const scales = new Float32Array(flashParticleCount);
        const scaleAttribute = new THREE.InstancedBufferAttribute(scales, 1);
        geometry2.setAttribute('scales', scaleAttribute);

        const id = new Float32Array(flashParticleCount);
        const idAttribute = new THREE.InstancedBufferAttribute(id, 1);
        geometry2.setAttribute('id', idAttribute);
    
        return geometry2;
      };
      const pixelGeometry = new THREE.BufferGeometry()
      let group = new THREE.Group();
      {
        const positions = new Float32Array(pixelParticleCount * 3);
        for(let i = 0; i < pixelParticleCount * 3; i++)
          positions[i] = 0;
        pixelGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const opacity = new Float32Array(pixelParticleCount * 1);
        pixelGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacity, 1));

        const scales = new Float32Array(pixelParticleCount * 1);
        pixelGeometry.setAttribute('scales', new THREE.BufferAttribute(scales, 1));

      }
      //##################################################### flash material #####################################################
      const flashMaterial = new WebaverseShaderMaterial({
          uniforms: {
              cameraBillboardQuaternion: {
                  value: new THREE.Quaternion(),
              },
              flashTexture:{value: splashTexture12},
              sparkleTexture: { type: 't', value: sparkle },
              circleTexture: { type: 't', value: circle },
              avatarPos:{
                  value: new THREE.Vector3(0,0,0)
              },
          },
          vertexShader: `\
              
              uniform vec4 cameraBillboardQuaternion;
      
              varying vec2 vUv;
              varying vec3 vPos;
              varying float vId;
              
              attribute vec3 positions;
              attribute float scales;
              attribute float id;
              
              vec3 rotateVecQuat(vec3 position, vec4 q) {
                  vec3 v = position.xyz;
                  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
              }
          
              void main() {
                  vUv=uv;
                  vId=id;
                  vPos = position;
                  vec3 pos = position;
                  if(id>0.5 && id<=1.)
                      pos.y*=0.03;
                  
                  pos = rotateVecQuat(pos, cameraBillboardQuaternion);
                  pos*=scales;
                  pos+=positions;
                  
                  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
                  vec4 viewPosition = viewMatrix * modelPosition;
                  vec4 projectionPosition = projectionMatrix * viewPosition;
          
                  gl_Position = projectionPosition;
              }
          `,
          fragmentShader: `\
              
              
              varying vec2 vUv;
              varying float vId;
              varying vec3 vPos;
            
              uniform sampler2D flashTexture;
              uniform sampler2D sparkleTexture;
              uniform sampler2D circleTexture;
              uniform vec3 avatarPos;
              
              void main() {
                  vec4 flash = texture2D( flashTexture,vUv);
                  vec4 sparkle = texture2D(sparkleTexture, vUv);
                  vec4 circle = texture2D(circleTexture, vUv);
                  
                
                  if(vId>0.2 && vId<=1.)
                      gl_FragColor = flash;
                  else if(vId>=1.5)
                      gl_FragColor = sparkle;
                  else if(vId<0.2)
                      gl_FragColor = circle;
                  if(vId>=0. && vId<=1.)
                      gl_FragColor.rgb *= vec3(0.0376, 0.940, 0.474);
                  else
                      gl_FragColor.rgb *= vec3(0.444, 0.999, 0.777);
                  if(vId<0.2)
                      gl_FragColor.a *= distance(avatarPos,vPos)*0.7;
                  
              }
          `,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,

          clipping: false,
          fog: false,
          lights: false,
        
      });
      //##################################################### pixel material #####################################################
      const pixelMaterial = new WebaverseShaderMaterial({
        vertexShader: `\
           
  
            varying vec2 vUv;
            varying vec3 vPos;
            varying float vOpacity;
            varying float vScales;
            
            attribute vec3 positions;
            attribute float opacity;
            attribute float scales;
            
        
            void main() {
                vUv=uv;
                vPos = position;
                vOpacity = opacity;
                vScales = scales;
                vec3 pos = position;
                
               
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectionPosition = projectionMatrix * viewPosition;
            
                gl_Position = projectionPosition;
                gl_PointSize = 35.0*scales;
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                bool isPerspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 );
                    if ( isPerspective ) gl_PointSize *= (1.0 / - viewPosition.z);
                
            }
        `,
        fragmentShader: `\
            
            
            varying vec2 vUv;
            varying vec3 vPos;
            varying float vOpacity;
            varying float vScales;
            void main() {
                
                gl_FragColor= vec4(0.0,vScales,0.3,1.0);
                gl_FragColor.a *= vOpacity;
                
            }
        `,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,

        clipping: false,
        fog: false,
        lights: false,
        
      });
      //######################################################## initial instanced mesh #################################################################
      let flashMesh = null;
      const addInstancedMesh = () => {
          const geometry2 = new THREE.PlaneGeometry( 0.5, 0.5 );
          const geometry =_getFlashGeometry(geometry2)
          flashMesh = new THREE.InstancedMesh(
              geometry,
              flashMaterial,
              flashParticleCount
          );
          
          const idAttribute = flashMesh.geometry.getAttribute('id');
          for (let i = 0; i < flashParticleCount; i++) {
              idAttribute.setX(i,i);
          }
          idAttribute.needsUpdate = true;
      }
      addInstancedMesh();
      const pixel = new THREE.Points(pixelGeometry, pixelMaterial);
      group.add(pixel);

      app.add(flashMesh);
      app.add(group);

      let circlePlay = false;
      let startEffectTime = -1;
      let currentModel = null;
      let currentQuality = null;
      let dir = new THREE.Vector3();
     
      const getModelType = (avatarRenderer) => {
        switch (avatarRenderer.quality) {
          case 1: {
            return avatarRenderer.spriteAvatarMesh;
          }
          case 2: {
            return avatarRenderer.crunchedModel;
          }
          case 3: {
            return avatarRenderer.optimizedModel;
          }
          case 4: {
            return avatarRenderer.mesh;
          }
          default: {
            return null;
          }
        }

      }

      const bodyMeshUniforms = {
        uTime: {
          value: 0
        },
        rimStrength: {
          value: 0
        },
        eye: {
          value: new THREE.Vector3()
        },
        playerQuaternion: {
          value: new THREE.Quaternion()
        },
        isHealing: {
          value: false
        }
      };
      useFrame(({timestamp}) => {
        if(player !== null){
          //#################### store avatar material ############################
          const avatarRenderer = player.avatar.avatarRenderer;
          const _initHealMaterial = () => {
            const model = getModelType(avatarRenderer);
            model && model.traverse(o => {
              if (o.isMesh) {
                const healEffectMaterial = customshader(o.material, bodyMeshUniforms);
                o.material = healEffectMaterial;
              }
            });
          };

          if(
            currentModel !== player.avatar.model.uuid 
            || currentQuality !== avatarRenderer.quality
          ){
            if (getModelType(avatarRenderer)) {
              _initHealMaterial();
              currentModel = player.avatar.model.uuid;
              currentQuality = avatarRenderer.quality;
            }
          }
          //######################### flash attribute ##############################
          const swAttribute = flashMesh.geometry.getAttribute('sw');
          const positionsAttribute = flashMesh.geometry.getAttribute('positions');
          const scalesAttribute = flashMesh.geometry.getAttribute('scales');
          const idAttribute = flashMesh.geometry.getAttribute('id');

          //######################### pixel attribute ##############################
          const pixelOpacityAttribute = pixel.geometry.getAttribute('opacity');
          const pixelPositionAttribute = pixel.geometry.getAttribute('position');
          const pixelScaleAttribute = pixel.geometry.getAttribute('scales');

          if (playEffect) {
            // console.log('start effect')
            startEffectTime = startEffectTime === -1 ? timestamp : startEffectTime;
            for (let i = 0; i < flashParticleCount; i ++) {
              dir.x = camera.position.x-player.position.x;
              dir.y = camera.position.y-player.position.y;
              dir.z = camera.position.z-player.position.z;
              dir.normalize();
              if(player.avatar)
                positionsAttribute.setXYZ(i, player.position.x+dir.x, player.position.y+dir.y-player.avatar.height/9, player.position.z+dir.z);
              scalesAttribute.setX(i, 0.1);
              swAttribute.setX(i, 1);
            }
            for(let i = 0; i < pixelParticleCount; i ++){
                pixelScaleAttribute.setX(i, 0.5 + 0.5 * Math.random());
                pixelOpacityAttribute.setX(i, 1);
                pixelPositionAttribute.setXYZ(i,(Math.random() - 0.5) * 0.5, -0.5 + (Math.random()) * -1.5, (Math.random() - 0.5) * 0.5);
            }

            flashMesh.visible = true;
            group.visible = true;

            playEffect = false;
          }
          if (startEffectTime > 0) {
            // console.log('playing effect')
            //#################################### handle flash #######################################
            for (let i = 0; i < flashParticleCount; i ++) {
              dir.x = camera.position.x-player.position.x;
              dir.y = camera.position.y-player.position.y;
              dir.z = camera.position.z-player.position.z;
              dir.normalize();
              if(player.avatar)
                positionsAttribute.setXYZ(i, player.position.x+dir.x, player.position.y+dir.y-player.avatar.height/9, player.position.z+dir.z);
              switch (idAttribute.getX(i)) {
                case 0: {
                  if(circlePlay){
                    if(scalesAttribute.getX(i) < 1.5){
                      scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.2);
                    }
                    else{
                      scalesAttribute.setX(i, 0);
                      circlePlay = false;
                    }
                  }
                  
                  break;
                }
                case 1: {
                    if(scalesAttribute.getX(i) < 5){
                      if(swAttribute.getX(i) >= 1)
                        scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.9);
                      else{
                        if(scalesAttribute.getX(i) > 0)
                          scalesAttribute.setX(i, scalesAttribute.getX(i) - 0.8);
                        else{
                          scalesAttribute.setX(i, 0);
                        }
                      }
                    }
                    else{
                      swAttribute.setX(i, 0.95);
                      scalesAttribute.setX(i, 4.9);
                      if(!circlePlay)
                        circlePlay = true;
                    }
                    break;
                }
                case 2: {
                  if(scalesAttribute.getX(i) < 4){
                    if(swAttribute.getX(i) >= 1)
                      scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.9);
                    else{
                      if(scalesAttribute.getX(i) > 0)
                        scalesAttribute.setX(i, scalesAttribute.getX(i) - 0.8);
                      else {
                        scalesAttribute.setX(i, 0);
                      }
                    }
                  }
                  else{
                    swAttribute.setX(i, 0.95);
                    scalesAttribute.setX(i, 3.9);
                  }
                  break;
                }
              }
            }

            idAttribute.needsUpdate = true;
            positionsAttribute.needsUpdate = true;
            swAttribute.needsUpdate = true;
            scalesAttribute.needsUpdate = true;
            flashMesh.material.uniforms.cameraBillboardQuaternion.value.copy(camera.quaternion);
            flashMesh.material.uniforms.avatarPos.x = player.position.x;
            flashMesh.material.uniforms.avatarPos.y = player.position.y;
            flashMesh.material.uniforms.avatarPos.z = player.position.z;

            //#################################### handle pixel #######################################
            for(let i = 0; i < pixelParticleCount; i++){
              if(pixelOpacityAttribute.getX(i)>0){
                pixelScaleAttribute.setX(i,pixelScaleAttribute.getX(i)-0.01);
                pixelOpacityAttribute.setX(i,pixelOpacityAttribute.getX(i)-(0.01+Math.random()*0.03));
                pixelPositionAttribute.setY(i,pixelPositionAttribute.getY(i)+0.02);
              }
                  
              else
                pixelOpacityAttribute.setX(i,0);
            }
            pixelOpacityAttribute.needsUpdate = true;
            pixelPositionAttribute.needsUpdate = true;
            pixelScaleAttribute.needsUpdate = true;
            group.position.copy(player.position);


            if (startEffectTime >= timestamp) {
              bodyMeshUniforms.isHealing.value = true;
              bodyMeshUniforms.rimStrength.value = 0.1;
            }
            bodyMeshUniforms.uTime.value = timestamp / 1000;
            bodyMeshUniforms.eye.value.copy(camera.position);
            bodyMeshUniforms.playerQuaternion.value.copy(player.quaternion);
            bodyMeshUniforms.rimStrength.value *= 1.15;

            if (startEffectTime > 0 && bodyMeshUniforms.rimStrength.value > 10) {
              bodyMeshUniforms.isHealing.value = false;
              startEffectTime = -1;
            }
          }
          else {
            if (flashMesh.visible || group.visible) {
              // console.log('end effect')
              flashMesh.visible = false;
              group.visible = false;
            }
          }
          app.updateMatrixWorld();  
        }
            
      });
  }

  app.setComponent('renderPriority', 'low');
  
  return app;
};


