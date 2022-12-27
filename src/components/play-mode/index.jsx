
import React from 'react';

import {Minimap} from './minimap';
import {Hotbar} from './hotbar';
import {Infobox} from './infobox';
import {Chat} from './chat';

import styles from './play-mode.module.css';

//

export const PlayMode = ({setShowUI}) => {

    //

    return (
        <div className={ styles.playMode }>
            <Minimap setShowUI={setShowUI} />
            <Hotbar />
            <Infobox />
            <Chat />
        </div>
    );

};