import * as THREE from 'three';

import React, {useState, useEffect, useRef, useContext, createContext, Fragment} from 'react';
// import classnames from 'classnames';

import styles from './TitleScreen.module.css';

// let appStarted = false;

import {
    ZineRenderer,
} from 'zine/zine-renderer.js';
import {
    ZineStoryboard,
} from 'zine/zine-format.js';
// import {
//     zbdecode,
// } from 'zine/encoding.js';
import {
    compileScene,
} from '../../../zine-runtime/zine-remote-compiler.js';

const _startApp = canvas => {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });

    const camera = new THREE.PerspectiveCamera();

    const scene = new THREE.Scene();
    scene.autoUpdate = false;

    let video = null;
    let videoFrameReady = false;
    let videoCanvas = null;
    let videoContext = null;
    let videoTexture = null;
    let videoMesh = null;
    (async () => {
        const _loadImageArrayBuffer = async u => {
            const res = await fetch(u);
            const arrayBuffer = await res.arrayBuffer();
            return arrayBuffer;
        };
        const _loadVideo = async u => {
            const v = document.createElement('video');
            v.src = u;
            // v.oncanplay = e => {console.log('can play', e); };
            await new Promise((accept, reject) => {
                v.oncanplaythrough = accept;
                v.onerror = reject;
            });
            // v.play();
            return v;
        };
        const [
            imageArrayBuffer,
            videoElement,
        ] = await Promise.all([
            _loadImageArrayBuffer(`https://local.webaverse.com/packages/zine/resources/images/Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__67930432-4de8-4b77-b7c4-7a5bb5a84c1c.png`),
            // _loadVideo('./packages/zine/resources/videos/upstreet.mp4'),
            _loadVideo('./packages/zine/resources/videos/upstreet2.mp4'),
        ]);
        
        const uint8Array = await compileScene(imageArrayBuffer);

        const zineStoryboard = new ZineStoryboard();
        zineStoryboard.load(uint8Array);

        const panel0 = zineStoryboard.getPanel(0);
        const zineRenderer = new ZineRenderer({
            panel: panel0,
            alignFloor: true,
        });

        scene.add(zineRenderer.scene);
        zineRenderer.scene.updateMatrixWorld();

        camera.copy(zineRenderer.camera);

        // video
        {
            video = videoElement;
            video.muted = true;
            video.play();
            video.loop = true;
            // video.playbackRate = 2;
            video.style.cssText = `\
                position: absolute;
                top: 0;
                left: 0;
            `;
            // document.body.appendChild(video);

            const _recurseVideoFrameReady = () => {
              video.requestVideoFrameCallback(() => {
                videoFrameReady = true;
                _recurseVideoFrameReady();
              });
            };
            _recurseVideoFrameReady();

            // full screen video mesh
            const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
            
            // videoCanvas = document.createElement('canvas');
            // videoCanvas.width = 1980;
            // videoCanvas.height = 1080;
            // videoContext = videoCanvas.getContext('2d');

            videoTexture = new THREE.VideoTexture(video);
            const videoMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    map: {
                        value: videoTexture,
                        needsUpdate: true,
                    },
                    screenResolution: {
                        value: new THREE.Vector2(canvas.width, canvas.height),
                        needsUpdate: true,
                    },
                    videoResolution: {
                        value: new THREE.Vector2(1980, 1080),
                        needsUpdate: true,
                    },
                    offset: {
                        value: new THREE.Vector2(0, -0.3),
                        needsUpdate: true,
                    },
                },
                vertexShader: `\
                    varying vec2 vUv;

                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
                fragmentShader: `\
                    uniform sampler2D map;
                    uniform vec2 screenResolution;
                    uniform vec2 videoResolution;
                    uniform vec2 offset;
                    varying vec2 vUv;

                    const vec3 baseColor = vec3(${
                        new THREE.Color(0xd3d3d3).toArray().map(n => n.toFixed(8)).join(', ')
                    });
                    // const vec3 baseColor = vec3(0., 1., 0.);
                    /* const vec3 baseColor = vec3(${
                        new THREE.Color(0x01b140).toArray().map(n => n.toFixed(8)).join(', ')
                    }); */

                    void main() {
                        // adjust uv for the video aspect ratios of the screen and the video
                        // to keep the video centered and unstretched regardless of the screen aspect ratio
                        float screenAspectRatio = screenResolution.x / screenResolution.y;
                        float videoAspectRatio = videoResolution.x / videoResolution.y;

                        vec2 uv = vUv;
                        uv = (uv - 0.5) * 2.0; // [-1, 1]
                        uv.y /= screenAspectRatio;
                        uv.y *= videoAspectRatio;
                        uv += offset;
                        uv = (uv + 1.0) / 2.0; // [0, 1]
                        
                        gl_FragColor = texture2D(map, uv);

                        // float colorDistance = abs(gl_FragColor.r - baseColor.r) +
                        //     abs(gl_FragColor.g - baseColor.g) +
                        //     abs(gl_FragColor.b - baseColor.b);
                        float colorDistance = distance(gl_FragColor.rgb, baseColor);
                        if (colorDistance < 0.01) {
                            discard;
                        } else {
                            gl_FragColor.a = min(max(colorDistance * 4., 0.0), 1.0);
                        }
                    }
                `,
                side: THREE.DoubleSide,
                transparent: true,
                alphaToCoverage: true,
                // alphaTest: 0.1,
            });

            videoMesh = new THREE.Mesh(geometry, videoMaterial);
            videoMesh.frustumCulled = false;
            scene.add(videoMesh);
        }
    })();

    const _setSize = () => {
        renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);

        if (videoMesh) {
            videoMesh.material.uniforms.screenResolution.value.set(
                globalThis.innerWidth,
                globalThis.innerHeight
            );
            videoMesh.material.uniforms.screenResolution.needsUpdate = true;
        }
    };
    _setSize();
    renderer.setPixelRatio(window.devicePixelRatio);

    globalThis.addEventListener('resize', e => {
        _setSize();
    });

    // const _getNextPlaybackRateSpec = (now = performance.now()) => {
    //   const rate = Math.random() * 3;
    //   const timestamp = now + Math.random() * 1000 + 500;
    //   return {
    //     rate,
    //     timestamp,
    //   };
    // };
    // let nextPlaybackRateSpec = _getNextPlaybackRateSpec();

    let loadingTexture = false;
    const _frame = () => {
      requestAnimationFrame(_frame);

      if (!document.hidden) {
        renderer.render(scene, camera);
      }
    };
    _frame();
};

export const TitleScreen = () => {

    const [appStarted, setAppStarted] = useState(false);

    const canvasRef = useRef(null);

    //

    return (
        <div
            className={styles.titleScreen}
        >
            <canvas className={styles.canvas} ref={canvasRef} />
            {appStarted ? null : (
                <button className={styles.button} onClick={e => {
                    // console.log('got click', canvasRef.current, appStarted);
                    
                    if (canvasRef.current && !appStarted) {
                        setAppStarted(true);
                        _startApp(canvasRef.current);
                    }
                }}>Load</button>
            )}
        </div>
    );

};