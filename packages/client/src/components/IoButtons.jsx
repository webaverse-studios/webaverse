import React, {useState, useEffect, useContext} from "react";
import voiceInput from '@webaverse-studios/engine/voice-input/voice-input';
import classNames from "classnames";

import styles from "./IoButtons.module.css";
import CustomButton from "./CustomButton";
import {AppContext} from "./App";

export const IoButtons = ({showUI, setShowUI}) => {
    const {setState} = useContext(AppContext);
    const [ micEnabled, setMicEnabled ] = useState(false);
    const [ sttEnabled, setSttEnabled ] = useState(false);

    const handleMicBtnClick = async () => {
        setState({openedPanel: null});

        if (!voiceInput.micEnabled()) {
            await voiceInput.enableMic();
        } else {
            voiceInput.disableMic();
        }
    };

    const hideUi = () => {
        setShowUI(!showUI);
    }


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
        <div className={classNames(styles.locationMenu)} onClick={ stopPropagation }>
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
                    icon="hide"
                    className={styles.button}
                    size={24}
                    onClick={hideUi}
                />
            </div>
        </div>
    );
};