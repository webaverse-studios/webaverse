
import classnames from 'classnames';
import React, {createContext, Fragment, useContext, useEffect, useRef, useState} from 'react';

import cameraManager from '@webaverse-studios/engine/camera-manager';
import game from '@webaverse-studios/engine/game.js';
import universe from '@webaverse-studios/engine/universe.js';
import {parseQuery} from '@webaverse-studios/engine/util.js';
import {world} from '@webaverse-studios/engine/world';

import {defaultSceneName, scenesBaseUrl} from '@webaverse-studios/engine/endpoints.js';
import {handleStoryKeyControls} from '@webaverse-studios/engine/story';
import {Crosshair} from './Crosshair';
import {DomRenderer} from './DomRenderer.jsx';
import {FocusBar} from './FocusBar.jsx';
import {GrabKeyIndicators} from './GrabKeyIndicators.jsx';
import Header from './Header.jsx';
import {IoHandler, registerIoEventHandler, unregisterIoEventHandler} from './IoHandler';
import {LoadingBox} from './LoadingBox.jsx';
import QuickMenu from './QuickMenu.jsx';

import grabManager from '@webaverse-studios/engine/grab-manager';
import raycastManager from '@webaverse-studios/engine/raycast-manager';
import '../../styles/globals.css';
import styles from './App.module.css';

import dropManager from '@webaverse-studios/engine/drop-manager';
import {ChainContext} from '../hooks/chainProvider';
import useNFTContract from '../hooks/useNFTContract';
import {AccountContext} from '../hooks/web3AccountProvider';
import Modals from './Modals';

import {Chat} from './Chat';
import {Hotbar} from './Hotbar';
import {Infobox} from './Infobox';

import {AiMenu} from './AiMenu';
import {SceneMenu} from './SceneMenu';

import {IoButtons} from './IoButtons';
import {DragAndDrop} from './DragAndDrop';

//

const _getCurrentSceneSrc = () => {

    const q = parseQuery(window.location.search);
    let {src} = q;

    if (src === undefined) {

        src = scenesBaseUrl + defaultSceneName;

    }

    return src;

};

const _getCurrentRoom = () => {

    const q = parseQuery(window.location.search);
    const {room} = q;
    return room || '';

};

export const AppContext = createContext();

export const App = () => {
    const [ state, setState ] = useState({openedPanel: null, openedModal: null});
    const [ showUI, setShowUI ] = useState('normal');

    const canvasRef = useRef(null);
    const [ selectedApp, setSelectedApp ] = useState(null);
    const [ selectedScene, setSelectedScene ] = useState(_getCurrentSceneSrc());
    const [ selectedRoom, setSelectedRoom ] = useState(_getCurrentRoom());
    const multiplayerConnected = !! selectedRoom;
    const [ editMode, setEditMode ] = useState(false);
    const [ claimableToken, setClaimableToken ] = useState([]);
    const [ spawnItem, setSpawnItem ] = useState([]);
    const [ mintedToken, setMintedToken ] = useState([]);
    const [ resourceToken, setResourceToken ] = useState([]);
    const [ apps, setApps ] = useState(world.appManager.getApps().slice());
    const account = useContext(AccountContext);
    const chain = useContext(ChainContext);
    const {getTokens, getOTtokens} = useNFTContract(account.currentAddress);

    const [domHover, setDomHover] = useState(null)

    useEffect(() => {
        const domhoverchange = e => {
            const {domHover} = e.data;
            // console.log('dom hover change', domHover);
            setDomHover(domHover);
        };
        raycastManager.addEventListener('domhoverchange', domhoverchange);

        return () => {
            raycastManager.removeEventListener('domhoverchange', domhoverchange);
        };
    }, []);

    const selectApp = (app, physicsId, position) => {

        game.setMouseSelectedObject(app, physicsId, position);

    };

    const _loadUrlState = () => {

        const src = _getCurrentSceneSrc();
        setSelectedScene(src);

        const roomName = _getCurrentRoom();
        setSelectedRoom(roomName);

    };

    useEffect(() => {

        if (state.openedPanel && state.openedPanel !== 'ChatPanel' && cameraManager.pointerLockElement) {

            cameraManager.exitPointerLock();

        }

        if (state.openedPanel) {

            setShowUI(true);

        }

    }, [ state.openedPanel ]);

    useEffect(() => {

        const handleStoryKeyUp = event => {

            if (game.inputFocused()) return;
            handleStoryKeyControls(event);

        };

        registerIoEventHandler('keyup', handleStoryKeyUp);

        return () => {

            unregisterIoEventHandler('keyup', handleStoryKeyUp);

        };

    }, []);

    useEffect(() => {

        if (showUI === 'none') {

            setState({openedPanel: null});

        }

        const handleKeyDown = event => {

            if (event.ctrlKey && event.code === 'KeyH') {

                setShowUI(!showUI);
                return false;

            }

            return true;

        };

        registerIoEventHandler('keydown', handleKeyDown);
 
        return () => {

            unregisterIoEventHandler('keydown', handleKeyDown);

        };

    }, [ showUI ]);

    useEffect(() => {

        const handleClick = () => {

            const hoverObject = game.getMouseHoverObject();

            if (hoverObject) {

                const physicsId = game.getMouseHoverPhysicsId();
                const position = game.getMouseHoverPosition();
                selectApp(hoverObject, physicsId, position);
                return false;

            }

            return true;

        };

        registerIoEventHandler('click', handleClick);

        return () => {

            unregisterIoEventHandler('click', handleClick);

        };

    }, []);

    useEffect(() => {

        const update = e => {

            setApps(world.appManager.getApps().slice());

        };

        world.appManager.addEventListener('appadd', update);
        world.appManager.addEventListener('appremove', update);

    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const pushstate = e => {

            _loadUrlState();

        };

        const popstate = e => {

            _loadUrlState();
            universe.handleUrlUpdate();

        };

        window.addEventListener('pushstate', pushstate);
        window.addEventListener('popstate', popstate);

        return () => {

            window.removeEventListener('pushstate', pushstate);
            window.removeEventListener('popstate', popstate);

        };

    }, []);

    useEffect(_loadUrlState, []);

    useEffect(() => {
        const claimsChange = async e => {
            const {claims, addedClaim} = e.data;
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
                level,
            }))

            setClaimableToken(claimableItem);
        };
        const spawnsChange = async e => {
            const {spawns} = e.data;
            const spawnItem = spawns.map(({name, start_url}) => ({
                name,
                start_url: start_url.split("index.js")[0],
                description: "This is the Spawn Drop",
                params: [
                    {
                        label: 'Token type',
                        value: 'Seasonal Spawn Drop (Not Token)',
                    },
                ],
                isSpawn: true,
                claimed: true,
                // type,
                // voucher,
                // serverDrop,
                // level
            }))

            setSpawnItem(spawnItem);
        };
        dropManager.addEventListener('claimsChange', claimsChange);
        dropManager.addEventListener('spawnschange', spawnsChange);
        return () => {
            dropManager.removeEventListener('claimsChange', claimsChange);
            dropManager.removeEventListener('spawnschange', spawnsChange);
        };
    }, []);

    useEffect(() => {
        if (account && account.currentAddress) {
            getWalletItems();
        } else {
            setMintedToken([]);
            // console.log('could not query NFT collections')
        }
    }, [account])

    const getWalletItems = async () => {
        const nftList = await getTokens();
        const nftData = nftList.map(({tokenId, url}) => (
          {
              tokenId,
              name: "Webaverse Drop",
              start_url: url.split("index.js")[0],
              description: "",
              params: [
              ],
              claimed: true,
              rarity: "common",
              type: "major",
              level: 15,
          }
        ))
        setMintedToken(nftData)

        const OTTokens = await getOTtokens(); // will add more Resource
        if(OTTokens.nftList.totalCount) {
            setResourceToken([{
                name: "OT",
                start_url: "https://webaverse.github.io/ot-shard/shard.glb",
                claimed: true,
                value: OTTokens.nftList.totalCount,
            }])
        }
      }

    //
    
    useEffect(() => {
        const setEditModeState = async e => {
            const {editMode} = e.target;
            setEditMode(editMode);
        };
        grabManager.addEventListener('setgridsnap', setEditModeState);
        return () => {
            grabManager.addEventListener('setgridsnap', setEditModeState);
        };
    }, []);

    //

    const onDragOver = e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    const onDragStart = e => {
        // console.log('drag start', e);
    };
    const onDragEnd = e => {
        // console.log('drag end', e);
    };

    const AppContextValues = {
        state,
        setState,
        setSelectedApp,
        selectedApp,
        editMode,
        showUI,
        account,
        chain,
        claimableToken,
        setClaimableToken,
        spawnItem,
        setSpawnItem,
        mintedToken,
        setMintedToken,
        resourceToken,
        getWalletItems,
    }

    return (
        <AppContext.Provider value={AppContextValues}>
        <div
            className={ styles.App }
            id="app"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
        >
        <DomRenderer />
        <canvas className={ classnames(styles.canvas, domHover ? styles.domHover : null) } ref={ canvasRef } />
        <IoHandler />
        {showUI &&
            <Fragment>
            <DragAndDrop />
                <Modals />
                <Header setSelectedApp={ setSelectedApp } selectedApp={ selectedApp } />
                <Crosshair />
                <IoButtons showUI={showUI} setShowUI={setShowUI} />
                <Hotbar />
                <Infobox />
                <Chat />
                <SceneMenu
                    multiplayerConnected={ multiplayerConnected }
                    selectedScene={ selectedScene }
                    setSelectedScene={ setSelectedScene }
                    selectedRoom={ selectedRoom }
                    setSelectedRoom={ setSelectedRoom }
                />
                <AiMenu />
                <QuickMenu />
                <LoadingBox />
                <FocusBar />
                <GrabKeyIndicators />
            </Fragment>
        }
            </div>
        </AppContext.Provider>
    );

};