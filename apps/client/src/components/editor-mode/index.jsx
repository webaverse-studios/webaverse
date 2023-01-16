
import React, {useContext} from 'react';

import {AiMenu} from './ai-menu';
import {SceneMenu} from './scene-menu';
import {Inspector} from './inspector';
import {AppContext} from '../app';
//

export const EditorMode = ({selectedScene, setSelectedScene, selectedRoom, setSelectedRoom}) => {
    const {state} = useContext(AppContext);
    const multiplayerConnected = !! selectedRoom;

    //

    return (
        <div>
            <SceneMenu
                multiplayerConnected={ multiplayerConnected }
                selectedScene={ selectedScene }
                setSelectedScene={ setSelectedScene }
                selectedRoom={ selectedRoom }
                setSelectedRoom={ setSelectedRoom }
            />
            <AiMenu />
            {state.openedPanel === 'WorldPanel' &&
                <Inspector />
            }
        </div>
    );

};