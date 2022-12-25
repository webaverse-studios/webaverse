import React, {useState, useRef, useEffect, useContext} from "react";
import minimapManager from "../../../../minimap.js";
import voiceInput from '../../../../voice-input/voice-input';
import classNames from "classnames";

import styles from "./minimap.module.css";
import CustomButton from "../../general/custom-button/index.jsx";
import {AppContext} from "../../app/index.jsx";

//

let minimap = null;
const canvasSize = 180 * window.devicePixelRatio;
const minimapSize = 2048 * 3;
const minimapWorldSize = 400;
const minimapMinZoom = 0.1;
const minimapBaseSpeed = 30;

export const Minimap = ({setShowUI, className}) => {
    const ref = useRef();
    const canvasRef = useRef();
    const {setState} = useContext(AppContext);
    const [ micEnabled, setMicEnabled ] = useState(false);
    const [ sttEnabled, setSttEnabled ] = useState(false);

    useEffect(() => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;

            if (!minimap) {
                minimap = minimapManager.createMiniMap(
                    minimapSize,
                    minimapSize,
                    minimapWorldSize,
                    minimapWorldSize,
                    minimapMinZoom,
                    minimapBaseSpeed
                );
            }
            minimap.resetCanvases();
            minimap.addCanvas(canvas);
        }
    }, [canvasRef.current]);

    const handleMicBtnClick = async () => {
        setState({openedPanel: null});

        if (!voiceInput.micEnabled()) {
            await voiceInput.enableMic();
        } else {
            voiceInput.disableMic();
        }
    };

    const stopPropagation = (event) => {

        event.stopPropagation();

    };

    const handleSpeakBtnClick = async () => {
        setState({openedPanel: null});

        if (!voiceInput.speechEnabled()) {
            await voiceInput.enableSpeech();
        } else {
            voiceInput.disableSpeech();
        }
    };

    const handleHideBtnClick = async () => {
      setShowUI(false);
    }

    useEffect(() => {
        function michange(event) {
            setMicEnabled(event.data.enabled);
        }

        function speechchange(event) {
            setSttEnabled(event.data.enabled);
        }

        voiceInput.addEventListener("micchange", michange);
        voiceInput.addEventListener("speechchange", speechchange);

        return () => {
            voiceInput.removeEventListener("micchange", michange);
            voiceInput.removeEventListener("speechchange", speechchange);
        };
    }, []);

    return (
        <div className={classNames(className, styles.locationMenu)} ref={ref} onClick={ stopPropagation }>
            <div className={styles.controls}>
                <CustomButton
                    type="icon"
                    theme="dark"
                    icon="microphone"
                    className={styles.button}
                    active={micEnabled && "active"}
                    onClick={handleMicBtnClick}
                    size={24}
                />
                <CustomButton
                    type="icon"
                    theme="dark"
                    icon="speechToText"
                    className={styles.button}
                    active={sttEnabled && "active"}
                    onClick={handleSpeakBtnClick}
                    size={24}
                />
                <CustomButton
                    type="icon"
                    theme="dark"
                    icon="vr"
                    disabled
                    className={styles.button}
                    size={24}
                />
                <CustomButton
                    type="icon"
                    theme="dark"
                    icon="hide"
                    className={styles.button}
                    onClick={handleHideBtnClick}
                    size={24}
                />
            </div>
            <div className={styles.mapWrap}>
                <canvas
                    width={canvasSize}
                    height={canvasSize}
                    className={styles.map}
                    ref={canvasRef}
                />
            </div>
        </div>
    );
};