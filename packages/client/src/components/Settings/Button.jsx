
import classNames from 'classnames';
import React from 'react';

import styles from './Button.module.css';

//

export const Button = ({className, label, onClick}) => {

    return (
        <div className={ classNames(styles.button, className) } onClick={ onClick }>{ label }</div>
    );

};