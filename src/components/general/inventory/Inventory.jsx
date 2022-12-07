import React, { useEffect, useState, useRef, useContext } from "react";
import classnames from "classnames";
import styles from "./Inventory.module.css";
import CustomButton from "../custom-button";
import { TokenBox } from "../token-box/TokenBox";
import { AppContext } from "../../app";
import { CachedLoader } from "../../../CachedLoader.jsx";
import { Spritesheet } from "../spritesheet/";
import { createLandIcon } from "../../../../land-iconer.js";
import game from "../../../../game.js";
import { transparentPngUrl } from "../../../../constants.js";
import * as sounds from "../../../../sounds.js";
import { mod } from "../../../../util.js";
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
            type: "common",
            claimed: true,
        },
        {
          name: "Silsword",
          start_url: "https://webaverse.github.io/silsword/",
          description: "A sword from lore.",
          type: "common",
          timerTimestamp: 1704454645000,
          claimed: false,
      },
    ],
    upstreet: [],

    resources: [
        {
            name: "Silk",
            start_url: "https://webaverse.github.io/silk/",
            claimed: false,
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

const Token = ({ object }) => {
    const [rendered, setRendered] = useState(false);
    const canvasRef = useRef();

    const pixelRatio = window.devicePixelRatio;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && !rendered) {
            (async () => {
                const { seed, renderPosition, lods, minLodRange, clipRange } =
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
            timerTimestamp={object.timerTimestamp}
        />
    ) : null;
};

const TokenList = ({
    title,
    sections,
    open,
    hoverObject,
    selectObject,
    loading,
    onMouseEnter,
    onMouseDown,
    onDragStart,
    onDoubleClick,
    onClick,
    highlights,
    ItemClass,
}) => {
    return (
        <div className={styles.section} key={title}>
            <div className={styles.sectionTitle}>{title}</div>
            <ul className={styles.tokenList}>
                {sections.map((section, i) => {
                    const { name, tokens, type } = section;
                    return (
                        <React.Fragment key={i}>
                            {tokens.map((object, i) => (
                                <li
                                    draggable
                                    selected={selectObject}
                                    onMouseEnter={onMouseEnter(object)}
                                    onMouseDown={onMouseDown(object)}
                                    onDragStart={onDragStart(object)}
                                    onClick={onClick(object)}
                                    onDoubleClick={onDoubleClick(object)}
                                    key={i}
                                >
                                    {open && <Token object={object} />}
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
    const { state, setState, account } = useContext(AppContext);
    const [hoverObject, setHoverObject] = useState(null);
    const [selectObject, setSelectObject] = useState(null);
    const [faceIndex, setFaceIndex] = useState(1);
    const [claims, setClaims] = useState([]);
    const [inventoryItems, setInventoryItems] = useState(objects);

    const [loading, setLoading] = useState(false);
    const [imageBitmap, setImageBitmap] = useState(null);

    const [expand, setExpand] = useState(false);

    const selectedMenuIndex = mod(faceIndex, 4);

    const [openPreview, setOpenPreview] = useState(false);
    const [previewObject, setPreviewObject] = useState(undefined);

    const { getTokens, mintfromVoucher, WebaversecontractAddress } =
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

        const transparentPng = new Image();
        transparentPng.src = transparentPngUrl;
        e.dataTransfer.setDragImage(transparentPng, 0, 0);

        // setSelectObject(object);
    };
    const onClick = (object) => () => {
        //setOpenPreview(true);
        //setPreviewObject(object);
    };
    const closePreview = () => {
        sounds.playSoundName("menuNext");
        setOpenPreview(false);
        setPreviewObject();
    };
    const onDoubleClick = (object) => () => {
        game.handleDropJsonToPlayer(object);
        setSelectObject(object);
    };
    const menuLeft = () => {
        setFaceIndex(faceIndex - 1);

        sounds.playSoundName("menuNext");
    };
    const menuRight = () => {
        setFaceIndex(faceIndex + 1);

        sounds.playSoundName("menuNext");
    };
    const onEquip = (object) => () => {
        game.handleDropJsonToPlayer(object);
    };
    const onSpawn = (object) => () => {
        game.handleDropJsonForSpawn(object);
    };
    const onDrop = (object) => () => {
        game.handleDropJsonForDrop(
            object,
            account.currentAddress,
            WebaversecontractAddress,
            (isclaimed) => {
                if (isclaimed) {
                    // NFT
                    closePreview(); // will add time counter
                } else {
                    dropManager.removeClaim(object);
                    closePreview();
                }
            }
        );
    };
    const mintClaim = async (e) => {
        if (!account.currentAddress) {
            alert("Make sure wallet connected");
            return false;
        }

        await mintfromVoucher(
            e,
            () => {},
            () => {
                dropManager.removeClaim(e);
                closePreview();
            }
        );
    };

    const selectClassName = styles[`select-${selectedMenuIndex}`];

    useEffect(() => {
        const claimschange = async (e) => {
            const { claims, addedClaim } = e.data;
            const claimableItem = claims.map(
                ({ name, start_url, type, voucher, serverDrop, level }) => ({
                    name,
                    start_url: start_url.split("index.js")[0],
                    description: "This is not-claimed drops",
                    params: [
                        {
                            label: "Token type",
                            value: "Seasonal NFT ( ERC-1155 )",
                        },
                    ],
                    type,
                    voucher,
                    serverDrop,
                    claimed: false,
                    level,
                })
            );

            setInventoryItems({
                notClaimed: claimableItem,
                upstreet: inventoryItems.upstreet,
                resources: inventoryItems.resources,
            });
        };
        dropManager.addEventListener("claimschange", claimschange);
        return () => {
            dropManager.removeEventListener("claimschange", claimschange);
        };
    }, [inventoryItems]);

    useEffect(() => {
        if (account && account.currentAddress) {
            async function queryGetNFTFromContract() {
                const nftList = await getTokens();
                const nftData = nftList.map(({ tokenId, url }) => ({
                    tokenId,
                    name: "",
                    start_url: url,
                    description: "",
                    params: [],
                    claimed: true,
                    type: "major",
                }));

                setInventoryItems({
                    notClaimed: inventoryItems.notClaimed,
                    upstreet: nftData,
                    resources: inventoryItems.resources,
                });
            }
            queryGetNFTFromContract();
        }
    }, [open, account]);

    useEffect(() => {
        if (open !== "CharacterPanel") {
            if (open) {
                sounds.playSoundName("menuOpen");
            } else {
                sounds.playSoundName("menuClose");
                setOpenPreview(false);
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
            >
                <div className={styles.inventoryPanel}>
                    <div
                        className={styles.expandWrap}
                        onClick={() => setExpand(expand ? false : true)}
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
                                    tokens: inventoryItems.resources,
                                },
                            ]}
                            open={faceIndex === 1}
                            hoverObject={hoverObject}
                            selectObject={selectObject}
                            loading={loading}
                            onMouseEnter={onMouseEnter}
                            onMouseDown={onMouseDown}
                            onDragStart={onDragStart}
                            onClick={onClick}
                            onDoubleClick={onDoubleClick}
                            menuLeft={menuLeft}
                            menuRight={menuRight}
                            highlights={true}
                        />
                        <TokenList
                            title="Backpack"
                            sections={[
                                {
                                    name: "Not Claimed",
                                    tokens: inventoryItems.notClaimed,
                                },
                                {
                                    name: "From Upstreet",
                                    tokens: inventoryItems.upstreet,
                                },
                            ]}
                            open={faceIndex === 1}
                            hoverObject={hoverObject}
                            selectObject={selectObject}
                            loading={loading}
                            onMouseEnter={onMouseEnter}
                            onMouseDown={onMouseDown}
                            onDragStart={onDragStart}
                            onClick={onClick}
                            onDoubleClick={onDoubleClick}
                            menuLeft={menuLeft}
                            menuRight={menuRight}
                            highlights={false}
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
