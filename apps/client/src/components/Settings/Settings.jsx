import React, {useContext, useState} from 'react';
import classNames from 'classnames';

import {TabGeneral} from './TabGeneral';
import {TabControls} from './TabControls';
import {TabAudio} from './TabAudio';
import {TabGraphics} from './TabGraphics';
import {TabAi} from './TabAi';
import {AppContext} from '../App';

import styles from './Settings.module.css';

//

export const Settings = () => {

    const {state, setState} = useContext(AppContext);
    const [ activeTab, setActiveTab ] = useState('general');

    //

    const stopPropagation = (event) => {

        event.stopPropagation();

    };

    const handleCloseBtnClick = () => {

        setState({openedPanel: null});

    };

    const handleTabClick = (event) => {
        const tabName = event.currentTarget.getAttribute('data-tab-name');
        setActiveTab(tabName);
    };

    //

    return (

        <div className={ classNames(styles.settings) } onClick={ stopPropagation } >

            <div className={ styles.closeBtn } onClick={ handleCloseBtnClick } >X</div>

            <div className={ styles.wrapper } >
                <div className={ styles.title } >SETTINGS</div>

                <div className={ styles.tabs } >
                    <div className={ classNames(styles.tab, activeTab === 'general' ? styles.active : null) } onClick={ handleTabClick } data-tab-name='general' >GENERAL</div>
                    <div className={ classNames(styles.tab, activeTab === 'controls' ? styles.active : null) } onClick={ handleTabClick } data-tab-name='controls' >CONTROLS</div>
                    <div className={ classNames(styles.tab, activeTab === 'audio' ? styles.active : null) } onClick={ handleTabClick } data-tab-name='audio' >AUDIO</div>
                    <div className={ classNames(styles.tab, activeTab === 'graphics' ? styles.active : null) } onClick={ handleTabClick } data-tab-name='graphics' >GRAPHICS</div>
                    <div className={ classNames(styles.tab, activeTab === 'ai' ? styles.active : null) } onClick={ handleTabClick } data-tab-name='ai' >AI</div>
                    <div className={ styles.clearfix } />
                </div>

                <div className={ styles.tabContentWrapper }>
                    {activeTab === 'general' && <TabGeneral /> }
                    {activeTab === 'controls' && <TabControls /> }
                    {activeTab === 'audio' && <TabAudio /> }
                    {activeTab === 'graphics' && <TabGraphics /> }
                    {activeTab === 'ai' && <TabAi active={ activeTab === 'ai' } />}
                </div>

            </div>

        </div>

    );

};