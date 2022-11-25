import React, {useEffect, useState, useContext} from 'react';
import classnames from 'classnames';

import {defaultPlayerName} from '../../../../ai/lore/lore-model.js';
import * as sounds from '../../../../sounds.js';

import {
    hp,
    mp,
    atk,
    def,
    vit,
    spr,
    dex,
    lck,
    xp,
} from '../../../../player-stats.js';

import {AppContext} from '../../app';

import {Emotions} from './Emotions';
import {Poses} from './Poses';
import {BigButton} from '../../../BigButton';

import styles from './character.module.css';
import CustomButton from '../custom-button/index.jsx';
import {TokenBox} from '../token-box/TokenBox.jsx';

const mainStatSpecs = [
    {
        imgSrc: 'assets/icons/health.svg',
        name: 'Health',
        className: 'hp',
        progress: hp,
    },
    {
        imgSrc: 'assets/icons/mana.svg',
        name: 'Mana',
        className: 'mp',
        progress: mp,
    },
    {
        imgSrc: 'assets/icons/exp.svg',
        name: 'Exp.',
        className: 'xp',
        progress: xp,
      },
      {
        imgSrc: 'assets/icons/limit.svg',
        name: 'Limit',
        className: 'lm',
        progress: 67,
      },
];
const statSpecs = [
    {
        // imgSrc: 'images/noun-abnormal-bleeding-2360001.svg',
        imgSrc: 'images/stats/noun-skill-sword-swing-2360242.svg',
        // imgSrc: 'images/noun-effect-circle-strike-2360022.svg',
        name: 'Attack',
        value: atk,
    },
    {
        imgSrc: 'images/stats/noun-abnormal-burned-2359995.svg',
        name: 'Defence',
        value: def,
    },
    {
        // imgSrc: 'images/stats/noun-skill-magic-shock-2360168.svg',
        // imgSrc: 'images/noun-classes-magician-2360012.svg',
        imgSrc: 'images/stats/noun-skill-dna-2360269.svg',
        name: 'Vitality',
        value: vit,
    },
    {
        imgSrc: 'images/stats/noun-skill-magic-chain-lightning-2360268.svg',
        name: 'Sprint',
        value: spr,
    },
    {
        imgSrc: 'images/stats/noun-skill-speed-down-2360205.svg',
        name: 'Dexterity',
        value: dex,
    },
    {
        imgSrc: 'images/stats/noun-effect-circle-strike-2360022.svg',
        name: 'Luck',
        value: lck,
    },
];

//

// const Stat = ({
//     statSpec,
// }) => {
//     return (
//         <div className={styles.stat}>
//             <img className={styles.icon} src={statSpec.imgSrc} />
//             <div className={styles.wrap}>
//                 <div className={styles.row}>
//                     <div className={styles.statName}>{statSpec.name}</div>
//                     <div className={styles.statValue}>{statSpec.value}</div>
//                 </div>
//                 {statSpec.progress ? (
//                     <progress className={styles.progress} value={statSpec.progress} />
//                 )  : null}
//             </div>
//         </div>
//     );
// };

//

const Stat2 = ({statSpec}) => {
    return (
      <div className={classnames(styles.stat, styles[statSpec.className])}>
        <div className={styles.name}>
          {statSpec?.name}
          <img className={styles.icon} src={statSpec.imgSrc} />
        </div>
        <div className={styles.progressBar}>
          <div style={{width: `${statSpec?.progress}%`}} />
        </div>
        <div className={styles.value}>
          {statSpec?.progress}
          {statSpec.className === 'lm' && '%'}
        </div>
      </div>
    );
};

const Stat = ({statSpec}) => {
    return (
      <div className={classnames(styles.stat, styles.columns)}>
        <div className={styles.name}>{statSpec.name}</div>
        <div className={styles.value}>{statSpec.value}</div>
      </div>
    );
};

const AvatarPreviewBox = ({dioramaCanvasRef, onClick}) => {
    const sideSize = 160;
    return (
      <div className={styles.avatarPreviewWrap}>
        <div className={styles.bg} />
        <div className={styles.mask}>
          <canvas
            className={styles.avatar}
            ref={dioramaCanvasRef}
            width={sideSize}
            height={sideSize}
            onClick={onClick}
          />
        </div>
      </div>
    );
  };
  
  //
  
  const AvatarEquipBox = ({dioramaCanvasRef, onClick}) => {
    const sideSize = 48;
    return (
      <div className={styles.avatarEquipBoxWrap}>
        <div className={styles.bg} />
        <div className={styles.mask}>
          <canvas
            className={styles.item}
            ref={dioramaCanvasRef}
            width={sideSize}
            height={sideSize}
            onClick={onClick}
          />
        </div>
      </div>
    );
  };


export const Character = ({game, /* wearActions, */ dioramaCanvasRef}) => {

    const {state, setState} = useContext(AppContext);
    const [ open, setOpen ] = useState(false);
    const [ characterSelectOpen, setCharacterSelectOpen ] = useState(false);

    const sideSize = 400;

    //

    /* const handleCharacterBtnClick = () => {

        setState({ openedPanel: ( state.openedPanel === 'CharacterPanel' ? null : 'CharacterPanel' ) });

        if ( state.openedPanel === 'CharacterPanel' ) {

            cameraManager.requestPointerLock();

        }

    }; */

    //

    useEffect(() => {

        const canvas = dioramaCanvasRef.current;

        if (canvas && state.openedPanel === 'CharacterPanel') {

            const playerDiorama = game.getPlayerDiorama();

            playerDiorama.addCanvas(canvas);

            return () => {

                playerDiorama.removeCanvas(canvas);

            };

        }

    }, [ dioramaCanvasRef, state.openedPanel ]);


    useEffect(() => {

        const lastOpen = open;
        const lastCharacterSelectOpen = characterSelectOpen;

        const newOpen = state.openedPanel === 'CharacterPanel';
        const newCharacterSelectOpen = state.openedPanel === 'CharacterSelect';

        if (!lastOpen && newOpen) {

            sounds.playSoundName('menuOpen');

        } else if (lastOpen && !newOpen) {

            sounds.playSoundName('menuClose');

        }

        setOpen(newOpen);
        setCharacterSelectOpen(newCharacterSelectOpen);

    }, [ state.openedPanel ]);

    function onCanvasClick () {

        const playerDiorama = game.getPlayerDiorama();
        playerDiorama.toggleShader();

        const soundFiles = sounds.getSoundFiles();
        const audioSpec = soundFiles.menuNext[Math.floor(Math.random() * soundFiles.menuNext.length)];
        sounds.playSound(audioSpec);

    };

    function onCharacterSelectClick(e) {

        setState({openedPanel: (state.openedPanel === 'CharacterSelect' ? null : 'CharacterSelect')});

        /* if ( state.openedPanel === 'CharacterSelect' ) {

            // cameraManager.requestPointerLock();

        } */
    }
    function onDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        game.handleDropJsonItemToPlayer(e.dataTransfer.items[0]);
    }

    //

    return (
        <div
        className={ classnames(styles.characterPanelWrap, open ? styles.opened : null) }
            onDrop={onDrop}
        >
            <div className={ styles.characterPanel } >
                <div className={styles.characterTitleBox}>Character Details</div>
                {/* <Poses
                    parentOpened={open}
                />
                
                <Emotions
                    parentOpened={open}
                /> */}
                <div className={styles.avatarWrap}>
                    <div className={styles.avatarName}>
                    {defaultPlayerName}
                    <span>The Drop Hunter</span>
                    </div>
                    <div className={styles.previewBoxWrap}>
                        <AvatarPreviewBox
                            dioramaCanvasRef={dioramaCanvasRef}
                            onClick={onCanvasClick}
                        />
                        <ul className={styles.leftEquipColumn}>
                            <li>
                            <TokenBox size={48} resolution={2048} numFrames={128} />
                            </li>
                            <li>
                            <TokenBox size={48} resolution={2048} numFrames={128} />
                            </li>
                            <li>
                            <TokenBox size={48} resolution={2048} numFrames={128} />
                            </li>
                        </ul>
                        <ul className={styles.rightEquipColumn}>
                            <li>
                            <TokenBox size={48} resolution={2048} numFrames={128} />
                            </li>
                            <li>
                            <TokenBox size={48} resolution={2048} numFrames={128} />
                            </li>
                            <li>
                            <TokenBox size={48} resolution={2048} numFrames={128} />
                            </li>
                        </ul>
                    </div>
                </div>

                <div className={styles.infoWrap}>
                    <div className={styles.row}>
                    {mainStatSpecs.map((statSpec, i) => {
                        return <Stat2 statSpec={statSpec} key={i} />;
                    })}
                    </div>
                    <div className={styles.row}>
                    {statSpecs.map((statSpec, i) => {
                        return <Stat statSpec={statSpec} key={i} />;
                    })}
                    </div>
                    <div className={styles.row}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque
                    lacinia rutrum scelerisque. Vivamus sem ipsum, pellentesque nec
                    augue sed, molestie dapibus libero.
                    </div>
                </div>
            </div>
            <div className={styles.actionsWrap}>
                <CustomButton
                    theme="light"
                    text="Change Avatar"
                    size={14}
                    className={styles.button}
                    onClick={onCharacterSelectClick}
                />
            </div>
        </div>
    );

};