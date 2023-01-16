import React, {useState, useRef} from 'react';
import classnames from 'classnames';

import {setFacePoseValue} from './Emotions';
import styles from './Poses.module.css';

import emoteManager, {emotes} from '../../../../emotes/emote-manager.js';

//

export const Poses = ({
    parentOpened,
}) => {
    const [posesOpen, setPosesOpen] = useState(false);
    const posesRef = useRef();

    const poseClick = emoteName => async e => {
        const emoteSpec = emoteManager.getEmoteSpec(emoteName);
        const {emotion} = emoteSpec;
        setFacePoseValue(emotion, 1);

        await emoteManager.triggerEmote(emoteName);
        
        setFacePoseValue(emotion, 0);
    };

    return (
        <div
            className={classnames(
                styles.poses,
                parentOpened ? styles.parentOpened : null,
                posesOpen ? styles.open : null,
            )}
            onMouseEnter={e => {
                setPosesOpen(true);
            }}
            onMouseLeave={e => {
                setPosesOpen(false);
            }}
            ref={posesRef}
        >
            {emotes.map((emote, emoteIndex) => {
                const {name, icon} = emote;
                return (
                    <div
                        className={styles.pose}
                        onClick={poseClick(name)}
                        key={name}
                    >
                        <img src={`images/poses/${icon}`} className={styles.poseIcon} />
                        <div className={styles.poseName}>{name}</div>
                    </div>
                );
            })}
        </div>
    );
};