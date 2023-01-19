
import React from 'react';

import styles from './Crosshair.module.css';

//

export const Crosshair = () => (

    <div className={ styles.crosshair } id="crosshair">
        <img src="./assets/crosshair.svg" width={ 30 } height={ 30 } />
    </div>

);