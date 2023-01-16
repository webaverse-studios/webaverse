
import React, {useState, useEffect, useRef, useContext, createContext, Fragment} from 'react';
import classnames from 'classnames';

import {game} from '@webaverse-studios/engine/game.js';
import {parseQuery} from '@webaverse-studios/engine/util.js'
import Webaverse from '@webaverse-studios/engine/webaverse.js';
import universe from '@webaverse-studios/engine/universe.js';
import cameraManager from '@webaverse-studios/engine/camera-manager';
import {world} from '@webaverse-studios/engine/world';

import {Crosshair} from '../general/crosshair';
import {IoHandler, registerIoEventHandler, unregisterIoEventHandler} from '../general/io-handler';
import {LoadingBox} from '../../LoadingBox.jsx';
import {FocusBar} from '../../FocusBar.jsx';
import {DragAndDrop} from '../../DragAndDrop.jsx';
import {EditorMode} from '../editor-mode';
import {GrabKeyIndicators} from '../../GrabKeyIndicators.jsx'
import Header from '../../Header.jsx';
import QuickMenu from '../../QuickMenu.jsx';
import {DomRenderer} from '../../DomRenderer.jsx';
import {handleStoryKeyControls} from '@webaverse-studios/engine/story';
import {scenesBaseUrl, defaultSceneName} from '@webaverse-studios/engine/endpoints.js';

import styles from './App.module.css';
import '../../../styles/globals.css';
import raycastManager from '@webaverse-studios/engine/raycast-manager';
import grabManager from '@webaverse-studios/engine/grab-manager';

import {AccountContext} from '../../hooks/web3AccountProvider';
import {ChainContext} from '../../hooks/chainProvider';
import Modals from '../modals';
import dropManager from '@webaverse-studios/engine/drop-manager';
import useNFTContract from '../../hooks/useNFTContract';

import {Hotbar} from './play-mode/hotbar';
import {Infobox} from './play-mode/infobox';
import {Chat} from './chat';

import {AiMenu} from './ai-menu';
import {SceneMenu} from './scene-menu';
import {Inspector} from './inspector';
import {AppContext} from '../app';
//

const _startApp = async (weba, canvas) => {

    weba.setContentLoaded();

    weba.bindCanvas(canvas);

    await weba.waitForLoad();
    await game.load();

    await weba.startLoop();

};

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

const useWebaverseApp = (() => {
  let webaverse = null;
  return () => {
        if (webaverse === null) {
            webaverse = new Webaverse();
        }
        return webaverse;
  };
})();

let appStarted = false;

export const App = () => {
    const multiplayerConnected = !! selectedRoom;
    const [ state, setState ] = useState({openedPanel: null, openedModal: null});
    const [ showUI, setShowUI ] = useState('normal');

    const canvasRef = useRef(null);
    const app = useWebaverseApp();
    const [ selectedApp, setSelectedApp ] = useState(null);
    const [ selectedScene, setSelectedScene ] = useState(_getCurrentSceneSrc());
    const [ selectedRoom, setSelectedRoom ] = useState(_getCurrentRoom());
    const [ editMode, setEditMode ] = useState(false);
    const [ claimableToken, setClaimableToken ] = useState([]);
    const [ mintedToken, setMintedToken ] = useState([]);
    const [ apps, setApps ] = useState(world.appManager.getApps().slice());
    const account = useContext(AccountContext);
    const chain = useContext(ChainContext);
    const {getTokens} = useNFTContract(account.currentAddress);
    //
    
    useEffect(() => {
        if(canvasRef.current && !appStarted) {

            _startApp(app, canvasRef.current);

            appStarted = true;
        }
    }, [ canvasRef ]);

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

        const handleStoryKeyUp = (event) => {

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

        const handleKeyDown = (event) => {

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
        const claimschange = async (e) => {
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
                level
            }))

            setClaimableToken(claimableItem);
        };
        dropManager.addEventListener('claimschange', claimschange);
        return () => {
            dropManager.removeEventListener('claimschange', claimschange);
        };
    }, []);

    useEffect(() => {
        if (account && account.currentAddress) {
            getWalletItems();
        } else {
            setMintedToken([]);
            console.log('could not query NFT collections')
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
              level: 15
          }
        ))
        setMintedToken(nftData)
      }

    //
    
    useEffect(() => {
        const setEditModeState = async (e) => {
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
        app,
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
        mintedToken,
        setMintedToken,
        getWalletItems
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
        <DragAndDrop />
        <IoHandler />
        {showUI &&
            <Fragment>
                <Modals />
                <Header setSelectedApp={ setSelectedApp } selectedApp={ selectedApp } />
                <Crosshair />
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