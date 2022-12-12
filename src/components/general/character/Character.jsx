import React, {useEffect, useState, useContext} from "react";
import { Vector3 } from 'three';
import classnames from "classnames";

import {defaultPlayerName} from "../../../../ai/lore/lore-model.js";
import * as sounds from "../../../../sounds.js";

import {
    hp,
    mp,
    atk,
    def,
    vit,
    spr,
    dex,
    lck,
    xp,
    limit
} from "../../../../player-stats.js";

import {AppContext} from "../../app";

import styles from "./character.module.css";
import CustomButton from "../custom-button/index.jsx";
import {TokenBox} from "../token-box/TokenBox.jsx";

import {Emotions} from './Emotions';
import {Poses} from './Poses';

const localVector3 = new Vector3();

const mainStatSpecs = [
    {
        imgSrc: "assets/icons/health.svg",
        name: "Health",
        className: "hp",
        progress: hp,
    },
    {
        imgSrc: "assets/icons/mana.svg",
        name: "Mana",
        className: "mp",
        progress: mp,
    },
    {
        imgSrc: "assets/icons/exp.svg",
        name: "Exp.",
        className: "xp",
        progress: xp,
    },
    {
        imgSrc: "assets/icons/limit.svg",
        name: "Limit",
        className: "lm",
        progress: limit,
    },
];
const statSpecs = [
    {
        imgSrc: "images/stats/noun-skill-sword-swing-2360242.svg",
        name: "Attack",
        value: atk,
    },
    {
        imgSrc: "images/stats/noun-abnormal-burned-2359995.svg",
        name: "Defence",
        value: def,
    },
    {
        imgSrc: "images/stats/noun-skill-dna-2360269.svg",
        name: "Vitality",
        value: vit,
    },
    {
        imgSrc: "images/stats/noun-skill-magic-chain-lightning-2360268.svg",
        name: "Sprint",
        value: spr,
    },
    {
        imgSrc: "images/stats/noun-skill-speed-down-2360205.svg",
        name: "Dexterity",
        value: dex,
    },
    {
        imgSrc: "images/stats/noun-effect-circle-strike-2360022.svg",
        name: "Luck",
        value: lck,
    },
];

const Stat2 = ({statSpec}) => {
    return (
        <div className={classnames(styles.stat, styles[statSpec.className])}>
            <div className={styles.name}>
                {statSpec?.name}
                <img className={styles.icon} src={statSpec.imgSrc} />
            </div>
            <div className={styles.progressBar}>
                <div style={{width: `${statSpec?.progress}%`}} />
            </div>
            <div className={styles.value}>
                {statSpec?.progress}
                {statSpec.className === "lm" && "%"}
            </div>
        </div>
    );
};

const Stat = ({statSpec}) => {
    return (
        <div className={classnames(styles.stat, styles.columns)}>
            <div className={styles.name}>{statSpec.name}</div>
            <div className={styles.value}>{statSpec.value}</div>
        </div>
    );
};

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

//

const AvatarEquipBox = ({dioramaCanvasRef, onClick}) => {
    const sideSize = 48;
    return (
        <div className={styles.avatarEquipBoxWrap}>
            <div className={styles.bg} />
            <div className={styles.mask}>
                <canvas
                    className={styles.item}
                    ref={dioramaCanvasRef}
                    width={sideSize}
                    height={sideSize}
                    onClick={onClick}
                />
            </div>
        </div>
    );
};

export const Character = ({game, /* wearActions, */ dioramaCanvasRef}) => {
    const {state, setState} = useContext(AppContext);
    const [open, setOpen] = useState(false);
    const [characterSelectOpen, setCharacterSelectOpen] = useState(false);

    const sideSize = 400;

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
        const lastCharacterSelectOpen = characterSelectOpen;

        const newOpen = state.openedPanel === "CharacterPanel";
        const newCharacterSelectOpen = state.openedPanel === "CharacterSelect";

        if (!lastOpen && newOpen) {
            sounds.playSoundName("menuOpen");
        } else if (lastOpen && !newOpen) {
            sounds.playSoundName("menuClose");
        }

        setOpen(newOpen);
        setCharacterSelectOpen(newCharacterSelectOpen);
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

    function onCharacterSelectClick(e) {
        setState({
            openedPanel:
                state.openedPanel === "CharacterSelect"
                    ? null
                    : "CharacterSelect",
        });
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

                <div className={styles.infoWrap}>
                    <div className={styles.row}>
                        {mainStatSpecs.map((statSpec, i) => {
                            return <Stat2 statSpec={statSpec} key={i} />;
                        })}
                    </div>
                    <div className={styles.row}>
                        {statSpecs.map((statSpec, i) => {
                            return <Stat statSpec={statSpec} key={i} />;
                        })}
                    </div>
                    <div className={styles.row}>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                        Quisque lacinia rutrum scelerisque. Vivamus sem ipsum,
                        pellentesque nec augue sed, molestie dapibus libero.
                    </div>
                </div>
            </div>
            <div className={styles.actionsWrap}>
                <CustomButton
                    theme="light"
                    text="Change Avatar"
                    size={14}
                    className={styles.button}
                    onClick={onCharacterSelectClick}
                />
            </div>
        </div>
    ) : null;
};