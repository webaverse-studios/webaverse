import React, {useEffect, useState, useContext} from "react";
import {Vector3} from 'three';
import classnames from "classnames";

import {defaultPlayerName} from "@webaverse-studios/engine/ai/lore/lore-model.js";
import * as sounds from "@webaverse-studios/engine/sounds.js";

import {AppContext} from "./App";

import styles from "./Character.module.css";
import {TokenBox} from "./TokenBox.jsx";

import {Emotions} from './Emotions';
import {Poses} from './Poses';

const localVector3 = new Vector3();

const AvatarPreviewBox = ({dioramaCanvasRef, onClick}) => {
    const width = 160;
    const height = 330;
    return (
        <div className={styles.avatarPreviewWrap}>
            <div className={styles.bg} />
            <div className={styles.mask}>
                <canvas
                    className={styles.avatar}
                    ref={dioramaCanvasRef}
                    width={width}
                    height={height}
                    onClick={onClick}
                />
            </div>
        </div>
    );
};

export const Character = ({game, /* wearActions, */ dioramaCanvasRef}) => {
    const {state, setState} = useContext(AppContext);
    const [open, setOpen] = useState(false);

    useEffect(() => { 
        const canvas = dioramaCanvasRef.current;

        if (canvas && state.openedPanel === "CharacterPanel") {
            const playerDiorama = game.getPlayerDiorama();
            playerDiorama.setCameraOffset(localVector3.set(0.3, -0.64, -1.9))
            playerDiorama.addCanvas(canvas);
            return () => {
                playerDiorama.removeCanvas(canvas);
            };
        }
    }, [dioramaCanvasRef, state.openedPanel]);

    useEffect(() => {
        const lastOpen = open;

        const newOpen = state.openedPanel === "CharacterPanel";

        if (!lastOpen && newOpen) {
            sounds.playSoundName("menuOpen");
        } else if (lastOpen && !newOpen) {
            sounds.playSoundName("menuClose");
        }

        setOpen(newOpen);
    }, [state.openedPanel]);

    function onCanvasClick() {
        const playerDiorama = game.getPlayerDiorama();
        playerDiorama.setCameraOffset(localVector3.set(0.3, -0.64, -1.9))
        playerDiorama.toggleShader();

        const soundFiles = sounds.getSoundFiles();
        const audioSpec =
            soundFiles.menuNext[
                Math.floor(Math.random() * soundFiles.menuNext.length)
            ];
        sounds.playSound(audioSpec);
    }

    // Zoom in when editing emotions
    function onEmotionsEdit(isEmotionEdit) {
        const playerDiorama = game.getPlayerDiorama();
        if (isEmotionEdit) {
            playerDiorama.setCameraOffset(localVector3.set(0.3, 0, -0.7))
        } else {
            playerDiorama.setCameraOffset(localVector3.set(0.3, -0.64, -1.9))
        }
    }

    function onDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        game.handleDropJsonItemToPlayer(e.dataTransfer.items[0]);
    }

    //

    return state.openedPanel === "CharacterPanel" ? (
        <div className={classnames(styles.characterPanelWrap)} onDrop={onDrop}>
            <div className={styles.characterPanel}>
                <div className={styles.characterTitleBox}>
                    Character Details
                </div>
                <Poses
                    parentOpened={true}
                />
                <Emotions
                    parentOpened={true}
                    cameraOffset={onEmotionsEdit}
                />
                <div className={styles.avatarWrap}>
                    <div className={styles.avatarName}>
                        <img
                            src="/assets/icons/crown.svg"
                            className={styles.crownIcon}
                        />
                        {defaultPlayerName}

                        <span>
                            <img
                                src="/assets/icons/class-drop-hunter.svg"
                                className={styles.classIcon}
                            />
                            Drop Hunter
                        </span>
                    </div>
                    <div className={styles.previewBoxWrap}>
                        <AvatarPreviewBox
                            dioramaCanvasRef={dioramaCanvasRef}
                            onClick={onCanvasClick}
                        />
                        <ul className={styles.leftEquipColumn}>
                            <li className={styles.columnTitle}>Party</li>
                            <li>
                                <TokenBox
                                    size={48}
                                    resolution={2048}
                                    numFrames={128}
                                    level={12}
                                    active={true}
                                    rarity={"common"}
                                />
                            </li>
                            <li>
                                <TokenBox
                                    size={48}
                                    resolution={2048}
                                    numFrames={128}
                                    rarity={"common"}
                                />
                            </li>
                            <li>
                                <TokenBox
                                    size={48}
                                    resolution={2048}
                                    numFrames={128}
                                    rarity={"common"}
                                />
                            </li>
                        </ul>
                        <ul className={styles.rightEquipColumn}>
                            <li className={styles.columnTitle}>Equipment</li>
                            <li>
                                <TokenBox
                                    size={48}
                                    resolution={2048}
                                    numFrames={128}
                                    id="head"
                                    emptyIcon={"/assets/icons/slotHead.svg"}
                                    rarity={"none"}
                                />
                            </li>
                            <li>
                                <TokenBox
                                    size={48}
                                    resolution={2048}
                                    numFrames={128}
                                    id="body"
                                    emptyIcon={"/assets/icons/slotBody.svg"}
                                    rarity={"none"}
                                />
                            </li>
                            <li>
                                <TokenBox
                                    size={48}
                                    resolution={2048}
                                    numFrames={128}
                                    id="legs"
                                    emptyIcon={"/assets/icons/slotLegs.svg"}
                                    rarity={"none"}
                                />
                            </li>
                            <li>
                                <TokenBox
                                    size={48}
                                    resolution={2048}
                                    numFrames={128}
                                    id="leftHand"
                                    emptyIcon={"/assets/icons/slotLeftHand.svg"}
                                    rarity={"none"}
                                />
                            </li>
                            <li>
                                <TokenBox
                                    size={48}
                                    resolution={2048}
                                    numFrames={128}
                                    id="rightHand"
                                    emptyIcon={"/assets/icons/slotRightHand.svg"}
                                    rarity={"none"}
                                />
                            </li>
                            <li>
                                <TokenBox
                                    size={48}
                                    resolution={2048}
                                    numFrames={128}
                                    id="mount"
                                    emptyIcon={"/assets/icons/slotMount.svg"}
                                    rarity={"none"}
                                />
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    ) : null;
};