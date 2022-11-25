import React, {useEffect, useState, useRef, useContext} from 'react';
import classnames from 'classnames';
import styles from './Inventory.module.css';
import CustomButton from '../custom-button';
import {TokenBox} from '../token-box/TokenBox';
import {AppContext} from '../../app';
import {MegaHotBox} from '../../play-mode/mega-hotbox';
import {CachedLoader} from '../../../CachedLoader.jsx';
import {Spritesheet} from '../spritesheet/';
import {createLandIcon} from '../../../../land-iconer.js';
import game from '../../../../game.js';
import {transparentPngUrl} from '../../../../constants.js';
import * as sounds from '../../../../sounds.js';
import {mod} from '../../../../util.js';
import dropManager from '../../../../drop-manager';
import cardsManager from '../../../../cards-manager.js';
import {CONTRACTS} from '../../../../src/hooks/web3-constants.js';
import {ChainContext} from '../../../../src/hooks/chainProvider';
import useNFTContract from '../../../../src/hooks/useNFTContract';

//

const size = 48;
const resolution = 2048;
const numFrames = 128;
const width = 400;

const objects = {
  notClaimed: [
    {
      name: 'Glavie',
      start_url: 'https://webaverse.github.io/axe/',
      description: 'A sword of greascascascascat lore.',
      params: [
        {
          label: 'Token type',
          value: 'Seasonal NFT ( ERC-20 )',
        },
        {
          label: 'Status',
          value: 'Unequipped',
        },
        {
          label: 'Item Type',
          value: 'Weapon',
        },
        {
          label: 'Rarity',
          value: 'Common',
        },
        {
          label: 'Durability',
          value: '720 / 1000',
        },
      ],
      claimed: false,
      level: 3,
    },
  ],
  upstreet: [
    {
      name: 'Glavie',
      start_url: 'https://webaverse.github.io/glaive/',
      description: 'A sword of greascascascascat lore.',
      params: [
        {
          label: 'Token type',
          value: 'Seasonal NFT ( ERC-20 )',
        },
        {
          label: 'Status',
          value: 'Unequipped',
        },
        {
          label: 'Item Type',
          value: 'Weapon',
        },
        {
          label: 'Rarity',
          value: 'Common',
        },
        {
          label: 'Durability',
          value: '720 / 1000',
        },
      ],
      claimed: true,
      level: 3,
    },
    {
      name: 'Lantern',
      start_url: 'https://webaverse.github.io/lantern/',
      description: 'A lantern.',
      params: [
        {
          label: 'Token type',
          value: 'Seasonal NFT ( ERC-20 )',
        },
        {
          label: 'Status',
          value: 'Unequipped',
        },
        {
          label: 'Item Type',
          value: 'Weapon',
        },
        {
          label: 'Rarity',
          value: 'Common',
        },
        {
          label: 'Durability',
          value: '720 / 1000',
        },
      ],
      claimed: true,
      level: 2,
    },
    {
      name: 'Dragon',
      start_url: 'https://webaverse.github.io/dragon-mount/',
      description: 'A cute dragon. But something is wrong with it...',
      params: [
        {
          label: 'Token type',
          value: 'Seasonal NFT ( ERC-20 )',
        },
        {
          label: 'Status',
          value: 'Unequipped',
        },
        {
          label: 'Item Type',
          value: 'Weapon',
        },
        {
          label: 'Rarity',
          value: 'Common',
        },
        {
          label: 'Durability',
          value: '720 / 1000',
        },
      ],
      claimed: true,
      level: 5,
    },
  ],

  resources: [
    {
      name: 'Silk',
      start_url: 'https://webaverse.github.io/silk/',
      claimed: false,
      value: 50,
      level: 1,
    },
    {
      name: 'Silk',
      start_url: 'https://webaverse.github.io/silk/',
      claimed: true,
      value: 12,
      level: 1,
    },
  ],
};
// const objects = {
//   notClaimed: [],
//   upstreet: [],
//   resources: [],
// };


const Token = ({object, enabled}) => {
  const [rendered, setRendered] = useState(false);
  const canvasRef = useRef();

  const pixelRatio = window.devicePixelRatio;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && enabled && !rendered) {
      (async () => {
        const {seed, renderPosition, lods, minLodRange, clipRange} = object;

        const imageBitmap = await createLandIcon({
          seed,
          renderPosition,
          lods,
          minLodRange,
          clipRange,
          width: 24 * pixelRatio,
          height: 24 * pixelRatio,
        });

        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
      })();

      setRendered(true);
    }
  }, [canvasRef.current, enabled, rendered]);

  return (
    <TokenBox
      size={size}
      object={object}
      level={object?.level}
      claimed={object?.claimed}
      url={object?.start_url}
      enabled={enabled}
      resolution={resolution}
      value={object?.value}
      numFrames={numFrames}
    />
  );
};

const TokenList = ({
  title,
  sections,
  open = true,
  hoverObject,
  selectObject,
  loading,
  onMouseEnter,
  onMouseDown,
  onDragStart,
  onDoubleClick,
  onClick,
  highlights,
//   ItemClass,
}) => {
  return (
    <div className={styles.section} key={title}>
      <div className={styles.sectionTitle}>{title}</div>
      <ul className={styles.tokenList}>
        {sections.map((section, i) => {
          const {name, tokens} = section;
          return (
            <React.Fragment key={i}>
              {tokens.map((object, i) => (
                <li
                  draggable
                  hovered={hoverObject}
                  selected={selectObject}
                  onMouseEnter={onMouseEnter(object)}
                  onMouseDown={onMouseDown(object)}
                  onDragStart={onDragStart(object)}
                  onDoubleClick={onDoubleClick(object)}
                  onClick={onClick(object)}
                  key={i}
                >
                  <Token object={object} enabled={open} />
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
  const {state, account} = useContext(AppContext);
  const {selectedChain} = useContext(ChainContext);
  const [hoverObject, setHoverObject] = useState(null);
  const [selectObject, setSelectObject] = useState(null);
  // const [ spritesheet, setSpritesheet ] = useState(null);
//   const [faceIndex, setFaceIndex] = useState(1);
  const [inventoryItems, setInventoryItems] = useState(objects);
//   const [cachedLoader, setCachedLoader] = useState(
//     () =>
//       new CachedLoader({
//         async loadFn(url, value, {signal}) {
//           const {start_url} = value;
//           const imageBitmap = await cardsManager.getCardsImage(start_url, {
//             width,
//             signal,
//           });
//           return imageBitmap;
//         },
//       }),
//   );
  const [loading, setLoading] = useState(false);
//   const [imageBitmap, setImageBitmap] = useState(null);

  const {getTokens, mintfromVoucher, WebaversecontractAddress} = useNFTContract(account.currentAddress);

  const open =
    state.openedPanel === 'CharacterPanel' || state.openedPanel === 'Inventory';

  const [openPreview, setOpenPreview] = useState(false);
  const [previewObject, setPreviewObject] = useState(undefined);

  const onMouseEnter = object => () => {
    setHoverObject(object);

    sounds.playSoundName('menuClick');
  };
  const onMouseDown = object => () => {
    // const newSelectObject = selectObject !== object ? object : null;
    setSelectObject(object);

    if (object) {
      sounds.playSoundName('menuNext');
    } /* else {
              const audioSpec = soundFiles.menuBack[Math.floor(Math.random() * soundFiles.menuBack.length)];
              sounds.playSoundName('menuBack');
          } */
  };
  const onDragStart = object => e => {
    e.dataTransfer.setData('application/json', JSON.stringify(object));
    e.dataTransfer.effectAllowed = 'all';
    e.dataTransfer.dropEffect = 'move';

    const transparentPng = new Image();
    transparentPng.src = transparentPngUrl;
    e.dataTransfer.setDragImage(transparentPng, 0, 0);

    setSelectObject(object);
  };
  const onClick = object => () => {
    setOpenPreview(true);
    setPreviewObject(object);
  };
  const closePreview = () => {
    sounds.playSoundName('menuNext');
    setOpenPreview(false);
    setPreviewObject();
  };
  const OnEquip = object => () => {
    console.log("equip", object)
    game.handleDropJsonToPlayer(object);

    // setSelectObject(object);
  };
  const onDoubleClick = object => () => {
    console.log("equip", object)
    game.handleDropJsonToPlayer(object);

    // setSelectObject(object);
  };
  const onSpawn = object => () => {
    console.log("Spawn", object)
    game.handleDropJsonForSpawn(object);

    // setSelectObject(object);
  };
  const onDrop = object => () => {
    console.log("drop", object)
    game.handleDropJsonForDrop(object, account.currentAddress, WebaversecontractAddress, (isclaimed) => {
      if(isclaimed) { // NFT
        closePreview(); // will add time counter
      } else {
        dropManager.removeClaim(object);
        closePreview();
      }
    });

    // setSelectObject(object);
  };
  const mintClaim = async (e) => {
    if(!account.currentAddress) {
      alert("Make sure wallet connected");
      return false;
    }

    await mintfromVoucher(e, () => {
    }, () => {
        dropManager.removeClaim(e);
        closePreview();
    });
  }
  useEffect(() => {
    const claimschange = async (e) => {
        const {claims, addedClaim} = e.data;
        console.log("claims", claims)
        // const tokenIds = await getTokenIdsOf();
        // if((addedClaim !== undefined) && tokenIds.includes(addedClaim.voucher.tokenId)) {
            // dropManager.removeClaim(addedClaim);
            // removeVoucherFromBlackList(addedClaim.voucher.tokenId)
        // } else {
            const claimableItem = claims.map(({name, start_url, type, voucher, serverDrop, level}) => ({
              name,
              start_url: start_url.split("index.js")[0],
              description: "This is not-claimed drops",
              params: [
                  {
                      label: 'Token type',
                      value: 'Seasonal NFT ( ERC-1155 )',
                  },
              ],
              type,
              voucher,
              serverDrop,
              claimed: false,
              level
            }))

            setInventoryItems({
              notClaimed: claimableItem,
              upstreet: inventoryItems.upstreet,
              resources: inventoryItems.resources
            });
            // inventoryItems.notClaimed.push(addedClaim)
        // }
    };
    dropManager.addEventListener('claimschange', claimschange);
    return () => {
      dropManager.removeEventListener('claimschange', claimschange);
    };
  }, [inventoryItems]);

  useEffect(() => {
      if (account && account.currentAddress) {
          // async function queryOpensea() {
          //     const {nftList} = await fetch(`https://serverless-backend-blue.vercel.app/api/getPolygonNFTCollection?walletAddress=${account.currentAddress}&collectionAddress=${CONTRACTS[selectedChain.contract_name].NFT}`,
          //         {
          //             method: 'get',
          //             redirect: 'follow'
          //         }).then(response => response.json())
          //     // TODO: params will add more
          //     const nftData = nftList.ownedNfts.map(({id, metadata}) => (
          //         {
          //             tokenId: parseInt(id.tokenId),
          //             name: metadata.name,
          //             start_url: metadata.animation_url ? metadata.animation_url : metadata.image,
          //             description: metadata.description,
          //             params: [
          //                 {
          //                     label: 'Token type',
          //                     value: 'Seasonal NFT ( ERC-1155 )',
          //                 },
          //             ],
          //             claimed: true,
          //             type: "major",
          //             level: 1
          //         }
          //     ))
          //     console.log("nftData", nftData)
          //     // const nftData = [
          //     //   {
          //     //     name: 'Glavie',
          //     //     start_url: 'https://webaverse.github.io/glaive/',
          //     //     description: 'A sword of greascascascascat lore.',
          //     //     params: [
          //     //       {
          //     //         label: 'Token type',
          //     //         value: 'Seasonal NFT ( ERC-20 )',
          //     //       },
          //     //       {
          //     //         label: 'Status',
          //     //         value: 'Unequipped',
          //     //       },
          //     //       {
          //     //         label: 'Item Type',
          //     //         value: 'Weapon',
          //     //       },
          //     //       {
          //     //         label: 'Rarity',
          //     //         value: 'Common',
          //     //       },
          //     //       {
          //     //         label: 'Durability',
          //     //         value: '720 / 1000',
          //     //       },
          //     //     ],
          //     //     claimed: true,
          //     //     level: 3,
          //     //   }
          //     // ]
          //     setInventoryItems({
          //       notClaimed: inventoryItems.notClaimed,
          //       upstreet: nftData,
          //       resources: inventoryItems.resources
          //     })
          // }
          // queryOpensea();
          async function queryNFTList() {
            const nftList = await getTokens();

            const nftData = nftList.ownedNfts.map(({tokenId, url}) => (
              {
                  tokenId,
                  name: "test NFT",
                  start_url: url,
                  description: "This is Webaverse NFT",
                  params: [
                      {
                          label: 'Token type',
                          value: 'Seasonal NFT ( ERC-1155 )',
                      },
                  ],
                  claimed: true,
                  type: "major",
                  level: 1
              }
          ))
          console.log("nftData", nftData)
            setInventoryItems({
              notClaimed: inventoryItems.notClaimed,
              upstreet: nftData,
              resources: inventoryItems.resources
            })
          }
          queryNFTList();
      } else {
          console.log('could not query NFT collections')
      }
  }, [open, account])

  useEffect(() => {
    if (open !== 'CharacterPanel') {
      if (open) {
        sounds.playSoundName('menuOpen');
      } else {
        sounds.playSoundName('menuClose');
        setOpenPreview(false);
      }
    }
  }, [open]);

  return (
    <>
      <div
        className={classnames(
          styles.inventoryPanelWrap,
          open ? styles.opened : null,
        )}
      >
        <div className={styles.inventoryPanel}>
          <div className={styles.titleBox}>Inventory</div>
          <div className={styles.sep} />
          <div className={styles.infoWrap}>
            <TokenList
              title="Resources"
              sections={[
                {
                  name: 'Resources',
                  tokens: inventoryItems.resources,
                },
              ]}
              hoverObject={hoverObject}
              selectObject={selectObject}
            //   loading={loading}
              onMouseEnter={onMouseEnter}
              onMouseDown={onMouseDown}
              onDragStart={onDragStart}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
              highlights={true}
            />
            <TokenList
              title="Backpack"
              sections={[
                {
                  name: 'Not Claimed',
                  tokens: inventoryItems.notClaimed,
                },
                {
                  name: 'From Upstreet',
                  tokens: inventoryItems.upstreet,
                },
              ]}
              hoverObject={hoverObject}
              selectObject={selectObject}
            //   loading={loading}
              onMouseEnter={onMouseEnter}
              onMouseDown={onMouseDown}
              onDragStart={onDragStart}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
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
      {/** Item Preview Panel */}
      <div
        className={classnames(
          styles.inventoryPanelWrap,
          openPreview && previewObject ? styles.opened : null,
        )}
      >
        <div className={styles.inventoryPanel}>
          <div className={styles.titleBox}>
            <img
              src={'/assets/icons/arrowBack.svg'}
              className={styles.back}
              onClick={closePreview}
            />
            Item Info
          </div>
          {previewObject && (
            <>
              <div className={styles.sep} />
              <div className={styles.infoWrap}>
                <h2>{previewObject?.name}</h2>
                <div className={styles.itemPreviewBoxWrap}>
                  <div className={styles.itemPreviewBox}>
                    <div className={styles.bg} />
                    <div className={styles.mask}>
                      <Spritesheet
                        className={styles.canvas}
                        startUrl={previewObject?.start_url}
                        enabled={true}
                        size={resolution}
                        numFrames={numFrames}
                        animationLoop={true}
                      />
                    </div>
                  </div>
                </div>
                {previewObject?.params &&
                  previewObject.params.map((param, i) => {
                    return (
                      <div className={styles.stat} key={i}>
                        <span className={styles.label}>{param?.label}</span>
                        {param?.value}
                      </div>
                    );
                  })}
                <p>{previewObject?.description}</p>
              </div>
              <div className={styles.actionsWrap}>
                { previewObject?.claimed ?
                    <>
                      <CustomButton
                        theme="light"
                        text="SPAWN"
                        onClick={
                          onSpawn(previewObject)
                        }
                        size={14}
                        className={styles.button}
                      />
                      <CustomButton
                        theme="light"
                        text="EQUIP"
                        onClick={
                          OnEquip(previewObject)
                        }
                        size={14}
                        className={styles.button}
                      />
                      <CustomButton
                        theme="dark"
                        text="DROP"
                        onClick={
                          onDrop(previewObject)
                        }
                        size={14}
                        className={styles.button}
                      />
                    </>
                  :
                    <>
                      <CustomButton
                        theme="light"
                        text="Claim"
                        onClick={() => {
                          console.log("preview", previewObject)
                          mintClaim(previewObject)
                        }}
                        size={14}
                        className={styles.button}
                      />
                      <CustomButton
                        theme="light"
                        text="EQUIP"
                        onClick={
                          OnEquip(previewObject)
                        }
                        size={14}
                        className={styles.button}
                      />
                      <CustomButton
                        theme="dark"
                        text="DROP"
                        onClick={
                          onDrop(previewObject)
                        }
                        size={14}
                        className={styles.button}
                      />
                    </>
                }
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};