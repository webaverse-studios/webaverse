import * as THREE from 'three';

import React, {useState, useEffect, useRef, useContext, createContext, Fragment} from 'react';
import classnames from 'classnames';

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
    const _setSize = () => {
        renderer.setSize(globalThis.innerWidth, globalThis.innerHeight);
    };
    _setSize();
    renderer.setPixelRatio(window.devicePixelRatio);

    globalThis.addEventListener('resize', e => {
        _setSize();
    });

    const camera = new THREE.PerspectiveCamera();

    const scene = new THREE.Scene();
    scene.autoUpdate = false;

    (async () => {
        const imageUrl = `https://local.webaverse.com/packages/zine/resources/images/Kalila_anime_cyberpunk_bright_empty_city_alley_upper_view_high__67930432-4de8-4b77-b7c4-7a5bb5a84c1c.png`;
        const res = await fetch(imageUrl);
        const arrayBuffer = await res.arrayBuffer();
        const uint8Array = await compileScene(arrayBuffer);

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
    })();

    const _frame = () => {
      requestAnimationFrame(_frame);

      renderer.render(scene, camera);
    };
    _frame();
};

export const TitleScreen = () => {

    const [appStarted, setAppStarted] = useState(false);

    const canvasRef = useRef(null);

    //
    
    // useEffect(() => {
    //     if (canvasRef.current && !appStarted) {

    //         _startApp(canvasRef.current);

    //         appStarted = true;
    //     }
    // }, [canvasRef.current]);

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