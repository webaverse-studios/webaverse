import React, {useEffect, useState, useRef, useContext} from "react";
import classnames from "classnames";
import styles from "./Inventory.module.css";
import CustomButton from "../custom-button";
import {TokenBox} from "../token-box/TokenBox";
import {AppContext} from "../../app";
import {CachedLoader} from "../../../CachedLoader.jsx";
import {Spritesheet} from "../spritesheet/";
import {createLandIcon} from "../../../../land-iconer.js";
import game from "../../../../game.js";
import {transparentPngUrl} from "../../../../constants.js";
import * as sounds from "../../../../sounds.js";
import {mod} from "../../../../util.js";
import dropManager from "../../../../drop-manager";
import cardsManager from "../../../../cards-manager.js";
import useNFTContract from "../../../../src/hooks/useNFTContract";

//

const size = 48;
const resolution = 2048;
const numFrames = 128;
const width = 400;

const objects = {
    notClaimed: [
        {
            name: "Silsword",
            start_url: "https://webaverse.github.io/silsword/",
            description: "A sword from lore.",
            rarity: "common",
            claimed: true,
        },
        {
            name: "Silsword",
            start_url: "https://webaverse.github.io/silsword/",
            description: "A sword from lore.",
            rarity: "common",
            timerTimestamp: 1704454645000,
            claimed: false,
        },
    ],
    upstreet: [],

    resources: [
        {
            name: "Silk",
            start_url: "https://webaverse.github.io/ot-shard/shard.glb",
            claimed: false,
            timerTimestamp: 1704454645000,
            value: 50,
        },
        {
            name: "Silk",
            start_url: "https://webaverse.github.io/silk/",
            claimed: true,
            value: 12,
        },
        {
            name: "Silk",
            start_url: "https://webaverse.github.io/silk/",
            claimed: true,
            value: 12,
        },
    ],
};

const Token = ({
    object,
    onMouseEnter,
    onMouseDown,
    onDragStart,
    onDoubleClick,
    onClick,
    showTokenDropDown,
    onEquip,
    onSpawn,
    onDrop,
    mintClaim,
}) => {
    const [rendered, setRendered] = useState(false);
    const canvasRef = useRef();
    const pixelRatio = window.devicePixelRatio;
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && !rendered) {
            (async () => {
                const {seed, renderPosition, lods, minLodRange, clipRange} =
                    object;

                const imageBitmap = await createLandIcon({
                    seed,
                    renderPosition,
                    lods,
                    minLodRange,
                    clipRange,
                    width: 24 * pixelRatio,
                    height: 24 * pixelRatio,
                });

                const ctx = canvas.getContext("2d");
                ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
            })();

            setRendered(true);
        }
    }, [canvasRef.current, rendered]);

    return object ? (
        <div
            draggable
            onMouseEnter={onMouseEnter(object)}
            onMouseDown={onMouseDown(object)}
            onDragStart={onDragStart(object)}
            onClick={(e) => onClick(e)}
            onContextMenu={(e) => onClick(e, object)}
            onDoubleClick={onDoubleClick(object)}
        >
            <TokenBox
                size={size}
                object={object}
                level={object.level}
                claimed={object.claimed}
                url={object.start_url}
                resolution={resolution}
                value={object.value}
                numFrames={numFrames}
                type={object.type}
                rarity={"none"}
                timerTimestamp={object.voucher ? object.voucher.expiry : false}
            />
            <div className={styles.tokenDropdown}>
                { !object.isSpawn && showTokenDropDown && showTokenDropDown === object && (
                    <>
                        <CustomButton
                            theme="dark"
                            text="Spawn"
                            size={10}
                            className={styles.button}
                            onClick={onSpawn(object)}
                        />
                        <CustomButton
                            theme="dark"
                            text="Equip"
                            size={10}
                            className={styles.button}
                            onClick={onEquip(object)}
                        />
                        <CustomButton
                            theme="dark"
                            text="Drop"
                            size={10}
                            className={styles.button}
                            onClick={onDrop(object)}
                        />
                        {!object.claimed && <CustomButton
                            theme="dark"
                            text="Claim"
                            size={10}
                            className={styles.button}
                            onClick={mintClaim(object)}
                        />}
                    </>
                )}
            </div>
        </div>
    ) : null;
};

const TokenList = ({
    title,
    sections,
    open,
    selectObject,
    onMouseEnter,
    onMouseDown,
    onDragStart,
    onDoubleClick,
    onClick,
    showTokenDropDown,
    closeTokenDropDown,
    onEquip,
    onSpawn,
    onDrop,
    mintClaim,
}) => {
    return (
        <div className={styles.section} key={title}>
            <div className={styles.sectionTitle}>{title}</div>
            <ul className={styles.tokenList}>
                {sections.map((section, i) => {
                    const {name, tokens, type} = section;
                    return (
                        <React.Fragment key={i}>
                            {tokens.map((object, i) => (
                                <li selected={selectObject} key={i}>
                                    {open && (
                                        <Token
                                            object={object}
                                            onMouseEnter={onMouseEnter}
                                            onMouseDown={onMouseDown}
                                            onDragStart={onDragStart}
                                            onClick={onClick}
                                            onEquip={onEquip}
                                            onSpawn={onSpawn}
                                            onDrop={onDrop}
                                            mintClaim={mintClaim}
                                            closeTokenDropDown={
                                                closeTokenDropDown
                                            }
                                            onDoubleClick={onDoubleClick}
                                            showTokenDropDown={
                                                showTokenDropDown
                                            }
                                        />
                                    )}
                                </li>
                            ))}
                        </React.Fragment>
                    );
                })}
            </ul>
        </div>
    );
};

export const Inventory = () => {
    const {state, setState, account, claimableToken, setClaimableToken, mintedToken, setMintedToken, spawnItem, resourceToken, getWalletItems} = useContext(AppContext);
    const [hoverObject, setHoverObject] = useState(null);
    const [selectObject, setSelectObject] = useState(null);
    const [loading, setLoading] = useState(false);

    const [expand, setExpand] = useState(false);

    const [showTokenDropDown, setShowTokenDropDown] = useState(false);

    const {getTokens, mintfromVoucher, WebaversecontractAddress} =
        useNFTContract(account.currentAddress);

    const open =
        state.openedPanel === "CharacterPanel" ||
        state.openedPanel === "Inventory";

    const onMouseEnter = (object) => () => {
        setHoverObject(object);

        sounds.playSoundName("menuClick");
    };
    const onMouseDown = (object) => () => {
        // const newSelectObject = selectObject !== object ? object : null;
        setSelectObject(object);

        if (object) {
            sounds.playSoundName("menuNext");
        } /* else {
              const audioSpec = soundFiles.menuBack[Math.floor(Math.random() * soundFiles.menuBack.length)];
              sounds.playSoundName('menuBack');
          } */
    };
    const onDragStart = (object) => (e) => {
        e.dataTransfer.setData("application/json", JSON.stringify(object));
        e.dataTransfer.effectAllowed = "all";
        e.dataTransfer.dropEffect = "move";
        // Do not remove
        /* const transparentPng = new Image();
        const image = e.target.getElementsByTagName("canvas")[0].toDataURL();
        transparentPng.src = image;
        console.log(transparentPng)
        e.dataTransfer.setDragImage(transparentPng, 0, 0); */
    };
    const onClick = (e, object) => {
        e.preventDefault();
        if (e.type === "click") {
            // console.log("Left Click");
        } else if (e.type === "contextmenu") {
            // console.log("Right Click");
            setShowTokenDropDown(object);
        }
    };
    const closeTokenDropDown = () => {
        setShowTokenDropDown();
    };
    const onDoubleClick = (object) => () => {
        game.handleDropJsonToPlayer(object);
        setSelectObject(object);
    };
    const onEquip = (object) => () => {
        game.handleDropJsonToPlayer(object);
        setShowTokenDropDown();
    };
    const onSpawn = (object) => () => {
        game.handleDropJsonForSpawn(object);
        setShowTokenDropDown();
    };
    const onDrop = (object) => () => {
        game.handleDropJsonForDrop(
            object,
            account.currentAddress,
            WebaversecontractAddress,
            (isclaimed) => {
                if (!isclaimed) {
                    dropManager.removeClaim(object);
                }
            }
        );
        setShowTokenDropDown();
    };
    const mintClaim = (object) => async () => {
        if (!account.currentAddress) {
            alert("Make sure wallet connected");
            return false;
        }

        await mintfromVoucher(
            object,
            () => {
                dropManager.removeClaim(object);
                getWalletItems();
            }
        );
    };

    const onInventoryPanelClick = () => {
      setShowTokenDropDown()
    }

    useEffect(() => {
        if (open !== "CharacterPanel") {
            if (open) {
                sounds.playSoundName("menuOpen");
            } else {
                sounds.playSoundName("menuClose");
            }
        }
    }, [open]);

    return open ? (
        <>
            <div
                className={classnames(
                    styles.inventoryPanelWrap,
                    expand && styles.expanded
                )}
                onClick={() => onInventoryPanelClick()}
            >
                <div className={styles.inventoryPanel}>
                    <div
                        className={styles.expandWrap}
                        onClick={() => setExpand(!expand)}
                    >
                        <img
                            src={
                                expand
                                    ? "/assets/icons/expandRight.svg"
                                    : "/assets/icons/expandLeft.svg"
                            }
                        />
                    </div>
                    <div className={styles.titleBox}>Inventory</div>
                    <div className={styles.sep} />
                    <div className={styles.infoWrap}>
                        <TokenList
                            title="Resources"
                            sections={[
                                {
                                    name: "Resources",
                                    tokens: resourceToken,
                                },
                            ]}
                            open={true}
                            hoverObject={hoverObject}
                            selectObject={selectObject}
                            loading={loading}
                            onMouseEnter={onMouseEnter}
                            onMouseDown={onMouseDown}
                            onDragStart={onDragStart}
                            onClick={onClick}
                            closeTokenDropDown={closeTokenDropDown}
                            onDoubleClick={onDoubleClick}
                            onEquip={onEquip}
                            onSpawn={onSpawn}
                            onDrop={onDrop}
                            mintClaim={mintClaim}
                            highlights={true}
                            showTokenDropDown={false}
                        />
                        <TokenList
                            title="Backpack"
                            sections={[
                                {
                                    name: "Not Claimed",
                                    tokens: claimableToken,
                                },
                                {
                                    name: "From Upstreet",
                                    tokens: mintedToken,
                                },
                                {
                                    name: "Spawn",
                                    tokens: spawnItem,
                                }
                            ]}
                            open={true}
                            hoverObject={hoverObject}
                            selectObject={selectObject}
                            loading={loading}
                            onMouseEnter={onMouseEnter}
                            onMouseDown={onMouseDown}
                            onDragStart={onDragStart}
                            onClick={onClick}
                            onDoubleClick={onDoubleClick}
                            onEquip={onEquip}
                            onSpawn={onSpawn}
                            onDrop={onDrop}
                            mintClaim={mintClaim}
                            highlights={false}
                            showTokenDropDown={showTokenDropDown}
                        />
                    </div>
                    <div className={styles.actionsWrap}>
                        <CustomButton
                            theme="light"
                            text="Claim All"
                            size={14}
                            className={styles.button}
                        />
                    </div>
                </div>
            </div>
        </>
    ) : null;
};