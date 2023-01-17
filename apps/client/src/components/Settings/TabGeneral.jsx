
import React from 'react';
import classNames from 'classnames';

import {Button} from './Button';

import styles from './Settings.module.css';

//

export const TabGeneral = ({active}) => {

    const handleLogoutBtnClick = () => {

        // WebaWallet.logout();

    };

    return (
        <div className={ classNames(styles.tabContent, active ? styles.active : null) }>
            <div className={ styles.blockTitle }>Account</div>
            <div className={ styles.row }>
                <Button className={ styles.logoutBtn } label="Logout" onClick={ handleLogoutBtnClick } />
                <div className={ styles.clearfix } />
            </div>
        </div>
    );

};