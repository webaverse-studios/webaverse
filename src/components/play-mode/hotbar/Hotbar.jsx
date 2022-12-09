import React, {useContext, useEffect} from 'react';
import classnames from 'classnames';
import {AppContext} from '../../app';
import styles from './hotbar.module.css';
import {HotBox} from '../hotbox/HotBox.jsx';

import game from '../../../../game.js';
import loadoutManager from '../../../../loadout-manager.js';
import {registerIoEventHandler, unregisterIoEventHandler} from '../../general/io-handler/IoHandler.jsx';
import {hotbarSize, numLoadoutSlots} from '../../../../constants.js';
import {ResourcesBox} from '../resources-box';

export const Hotbar = ({className}) => {
    const {setState} = useContext(AppContext);

    useEffect(() => {
            const keydown = e => {
                if (game.inputFocused()) return true;
                if (!e.ctrlKey) {
                    switch (e.which) {
                        case 82: { // R
                            game.dropSelectedApp();
                            return false;
                        }
                        case 46: { // delete
                            game.deleteSelectedApp();
                            return false;
                        }
                    }
                }
            };
            registerIoEventHandler('keydown', keydown);

            return () => {
                unregisterIoEventHandler('keydown', keydown);
            };
    }, []);

    const onDragOver = index => e => {
        e.preventDefault();
    };
    const onDrop = index => e => {
        e.preventDefault();
        e.stopPropagation();
        
        game.handleDropJsonItemToPlayer(e.dataTransfer.items[0], index);
    };
    const onTopClick = e => {
        e.preventDefault();
        e.stopPropagation();

        setState({
            openedPanel: 'CharacterPanel',
        });
    };
    const onBottomClick = index => e => {
        loadoutManager.setSelectedIndex(index);
    };

    return (
        <div
            className={ classnames(className, styles.hotbar) }
            onClick={onTopClick}
        >
            <div className={styles.leftSlot}>
                <div className={styles.background} />
                <div className={styles.phone}>
                    <img src="/assets/icons/phone.svg" />
                    <span>~</span>
                </div>
            </div>

            <div className={styles.rightSlot}></div>

            {
                (() => {

                    const items = Array(numLoadoutSlots);

                    for (let i = 0; i < numLoadoutSlots; i ++) {

                        items[ i ] = (
                            <HotBox
                              size={hotbarSize}
                              onDragOver={onDragOver(i)}
                              onDrop={onDrop(i)}
                              onClick={onBottomClick(i)}
                              index={i}
                              key={i}
                            />
                        );

                    }

                    return items;

                })()
            }

            <ResourcesBox />

        </div>
    );
};