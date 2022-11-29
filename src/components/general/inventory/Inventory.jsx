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

//

const size = 48;
const resolution = 2048;
const numFrames = 128;
const width = 400;

const objects = {
  notClaimed: [
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
      start_url: 'https://webaverse.github.io/uzi/',
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


const Token = ({object}) => {
  const [rendered, setRendered] = useState(false);
  const canvasRef = useRef();

  const pixelRatio = window.devicePixelRatio;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !rendered) {
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
          const {name, tokens} = section;
          return (
            <React.Fragment key={i}>
              {tokens.map((object, i) => (
                <li
                  draggable
                  selected={selectObject}
                  onMouseEnter={onMouseEnter(object)}
                  onMouseDown={onMouseDown(object)}
                  onDragStart={onDragStart(object)}
                  onDoubleClick={onDoubleClick(object)}
                  onClick={onClick(object)}
                  key={i}
                >
                {open &&
                  <Token object={object} />
                }
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
  const {state, setState} = useContext(AppContext);
  const [hoverObject, setHoverObject] = useState(null);
  const [selectObject, setSelectObject] = useState(null);
  // const [ spritesheet, setSpritesheet ] = useState(null);
  const [faceIndex, setFaceIndex] = useState(1);
  const [claims, setClaims] = useState([]);
  const [cachedLoader, setCachedLoader] = useState(
    () =>
      new CachedLoader({
        async loadFn(url, value, {signal}) {
          const {start_url} = value;
          const imageBitmap = await cardsManager.getCardsImage(start_url, {
            width,
            signal,
          });
          return imageBitmap;
        },
      }),
  );
  const [loading, setLoading] = useState(false);
  const [imageBitmap, setImageBitmap] = useState(null);

  const selectedMenuIndex = mod(faceIndex, 4);

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
  const onDoubleClick = object => () => {
    game.handleDropJsonToPlayer(object);

    setSelectObject(object);
  };
  const menuLeft = () => {
    setFaceIndex(faceIndex - 1);

    sounds.playSoundName('menuNext');
  };
  const menuRight = () => {
    setFaceIndex(faceIndex + 1);

    sounds.playSoundName('menuNext');
  };
  const selectClassName = styles[`select-${selectedMenuIndex}`];

  useEffect(() => {
    const claimschange = e => {
      const {claims} = e.data;
      setClaims(claims.slice());
    };
    dropManager.addEventListener('claimschange', claimschange);
    return () => {
      dropManager.removeEventListener('claimschange', claimschange);
    };
  }, [claims]);

  useEffect(() => {
    if (cachedLoader) {
      const loadingchange = e => {
        setLoading(e.data.loading);
      };
      cachedLoader.addEventListener('loadingchange', loadingchange);
      return () => {
        cachedLoader.removeEventListener('loadingchange', loadingchange);
      };
    }
  }, [cachedLoader]);

  useEffect(() => {
      const start_url = selectObject ? selectObject.start_url : '';
      if (start_url) {
        const abortController = new AbortController();
        (async () => {
          const imageBitmap = await cachedLoader.loadItem(
            start_url,
            selectObject,
            {
              signal: abortController.signal,
            },
          );
          if (imageBitmap !== null) {
            setImageBitmap(imageBitmap);
          }
        })();
        setImageBitmap(null);
        return () => {
          abortController.abort();
        };
      }
      return (() => {
        setSelectObject(null);
      })
  }, [selectObject]);

  useEffect(() => {
    sounds.playSoundName('menuOpen');
    return () => {
      sounds.playSoundName('menuClose');
      setOpenPreview(false);
    }
  }, []);

  useEffect(() => {
    setSelectObject(null);
  }, [faceIndex]);

  return (
    <>
      <div
        className={classnames(
          styles.inventoryPanelWrap,
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
                  tokens: objects.resources,
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
                  name: 'Not Claimed',
                  tokens: objects.notClaimed,
                },
                {
                  name: 'From Upstreet',
                  tokens: objects.upstreet,
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
      {/** Item Preview Panel */}
      {openPreview && previewObject && 
      <div
        className={classnames(
          styles.inventoryPanelWrap,
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
                <h2>{previewObject.name}</h2>
                <div className={styles.itemPreviewBoxWrap}>
                  <div className={styles.itemPreviewBox}>
                    <div className={styles.bg} />
                    <div className={styles.mask}>
                      <Spritesheet
                        className={styles.canvas}
                        startUrl={previewObject.start_url}
                        size={resolution}
                        numFrames={numFrames}
                        animationLoop={true}
                      />
                    </div>
                  </div>
                </div>
                {previewObject && previewObject.params &&
                  previewObject.params.map((param, i) => {
                    return param ? (
                      <div className={styles.stat} key={i}>
                        <span className={styles.label}>{param.label}</span>
                        {param.value}
                      </div>
                    ) : null;
                  })}
                <p>{previewObject.description}</p>
              </div>
              <div className={styles.actionsWrap}>
                <CustomButton
                  theme="light"
                  text="Claim"
                  size={14}
                  className={styles.button}
                />
                <CustomButton
                  theme="dark"
                  text="Drop"
                  size={14}
                  className={styles.button}
                />
              </div>
            </>
          )}
        </div>
      </div>
                }
    </>
  ); 
};