
import React, {useState, useEffect, useContext, useRef} from 'react';
import classnames from 'classnames';

import universe from '@webaverse-studios/engine/universe'
import {sceneManager} from '@webaverse-studios/engine/scene-manager';

import {AppContext} from './App';
import {scenesBaseUrl} from '@webaverse-studios/engine/endpoints';
import {makeId} from '@webaverse-studios/engine/util.js';

import styles from './SceneMenu.module.css';

//

export const SceneMenu = ({className, multiplayerConnected, selectedScene, setSelectedScene, selectedRoom, setSelectedRoom}) => {

    const {state, setState} = useContext(AppContext);
    const sceneNameInputRef = useRef(null);
    const [ rooms, setRooms ] = useState([]);
    const [ sceneInputName, setSceneInputName ] = useState(selectedScene);
    const [ origSceneList, setOrigSceneList ] = useState([]);
    const [ scenesList, setScenesList ] = useState([]);

    const sceneRoot = '/scenes/';

    //

    useEffect(() => {
        let live = true;
        (async () => {
            const scenes = await sceneManager.getSceneNamesAsync();
            if (!live) return;
            const origScenes = [];
            scenes.forEach(name => {
                origScenes.push(`${scenesBaseUrl}${name}`);
            });
            setOrigSceneList(origScenes);
            setScenesList(origScenes);
        })();
        return () => {
            live = false;
        };
    }, []);

    //

    const refreshRooms = async () => {
        // const res = await fetch(universe.getWorldsHost());

        // if (res.ok) {

        //     const rooms = await res.json();
        //     setRooms(rooms);

        // } else {

        //     const text = await res.text();
        //     console.warn('failed to fetch', res.status, text);

        // }
    };

    //

    const stopPropagation = event => {

        event.stopPropagation();

    };

    const handleSceneMenuOpen = value => {

        value = (typeof value === 'boolean' ? value : (state.openedPanel === 'SceneMenuPanel'));
        setState({openedPanel: value ? null : 'SceneMenuPanel'});

    };

    const handleSceneSelect = (event, sceneName) => {

        setState({openedPanel: null});

        sceneName = sceneName ?? event.target.value;
        setSelectedScene(sceneName);
        setSceneInputName(sceneName);
        universe.pushUrl(`/?src=${ encodeURIComponent(sceneName) }`);

    };

    const handleRoomMenuOpen = value => {

        value = (typeof value === 'boolean' ? value : (state.openedPanel === 'RoomMenuPanel'));

        if (! multiplayerConnected) {

            setState({openedPanel: value ? null : 'RoomMenuPanel'});

        } else {

            universe.pushUrl(`/?src=${ encodeURIComponent(selectedScene) }`);

        }

    };

    const handleRoomCreateBtnClick = async () => {
        const sceneName = selectedScene.trim();
        const data = null; // Z.encodeStateAsUpdate( world.getState( true ) );

        const roomName = makeId(5);

        const res = await fetch(universe.getWorldsHost() + roomName, {
          method: 'POST',
          body: data,
        });
    
        if (res.ok) {
          refreshRooms();
          setSelectedRoom(roomName);
          universe.pushUrl(
            `/?src=${encodeURIComponent(sceneName)}&room=${roomName}`,
          );
        } else {
          const text = await res.text();
          console.warn('error creating room', res.status, text);
        }
      };

    const handleRoomSelect = room => {

        setState({openedPanel: null});

        if (! universe.isConnected()) {

            universe.pushUrl(`/?src=${ encodeURIComponent(selectedScene) }&room=${ room.name }`);

            /* const isConnected = world.isConnected();
            setMultiplayerConnected(isConnected);
            if (isConnected) {
              setRoomName(room.name);
              setMultiplayerOpen(false);
            } */

        }

    };

    const handleDeleteRoomBtnClick = async (room, event) => {

        event.stopPropagation();

        const res = await fetch(universe.getWorldsHost() + room.name, {method: 'DELETE'});

        if (res.ok) {

            refreshRooms();

        } else {

            const text = await res.text();
            console.warn('failed to fetch', res.status, text);

        }

    };

    const handleSceneInputKeyDown = event => {

        const newList = (event.target.value ? origSceneList.filter(sceneName => (sceneName.indexOf(event.target.value) !== -1)) : origSceneList);
        setScenesList(newList);
        setSceneInputName(event.target.value);

    };

    const handleSceneMenuKeyUp = event => {

        switch (event.which) {

            case 27: { // escape

                event.preventDefault();
                event.stopPropagation();
                setState({openedPanel: null});
                sceneNameInputRef.current.blur();
                break;

            }

            case 13: { // enter

                event.preventDefault();
                event.stopPropagation();
                universe.pushUrl(`/?src=${ encodeURIComponent(sceneInputName) }`);
                setState({openedPanel: null});
                sceneNameInputRef.current.blur();
                break;

            }

        }

    };

    // remove everything before and including the last slash, remove the extension
    const sceneName = selectedScene.replace(/^.*[\\\/]/, '').replace(/\.[^/.]+$/, '');

    return (
        <div className={ classnames(className, styles.location) } onClick={ stopPropagation } >
            <div className={styles.leftCorner} />
            <div className={styles.rightCorner} />
            <div className={styles.row}>
                <div className={styles.roomName}>
                    {sceneName.replace('./', '/').replace(sceneRoot, '')}
                    {selectedRoom && ` / ${selectedRoom}`}
                </div>
                <div className={styles.title}>Your Location</div>
            </div>

            {
                state.openedPanel === 'SceneMenuPanel' ? (
                    <div className={ styles.rooms }>
                    {
                        scenesList.map((sceneName, i) => (
                            <div className={ styles.room } onMouseDown={ e => { handleSceneSelect(e, sceneName) } } key={ i } >
                                <img className={ styles.image } src="images/world.jpg" />
                                <div className={ styles.name } >{ sceneName }</div>
                            </div>
                        ))
                    }
                    </div>
                ) : null
            }

            {
                state.openedPanel === 'RoomMenuPanel' ? (
                    <div className={ styles.rooms } >
                        <div className={ styles.create } >
                            <button className={ styles.button } onClick={ handleRoomCreateBtnClick }>Create room</button>
                        </div>
                        {
                            rooms.map((room, i) => (
                                <div className={ styles.room } onClick={ e => { handleRoomSelect(room) } } key={ i } >
                                    <img className={ styles.image } src="images/world.jpg" />
                                    <div className={ styles.name } >{ room.name }</div>
                                    <div className={ styles.delete } >
                                        <button className={ classnames(styles.button, styles.warning) } onClick={ handleDeleteRoomBtnClick.bind(null, room) } >Delete</button>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                ) : null
            }

        </div>
    );

};