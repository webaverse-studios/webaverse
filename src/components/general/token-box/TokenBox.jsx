import React, {useState, useContext, useEffect} from 'react';
import classnames from 'classnames';
import styles from './TokenBox.module.css';
import {Spritesheet} from '../spritesheet';

export const TokenBox = props => {
  const {
    size,
    resolution,
    active,
    claimed,
    spawnCopy,
    onClick,
    canvasRef,
    object,
    enabled,
    numFrames,
    level,
    value,
    url,
  } = props;
  return (
    <div
      className={styles.tokenBoxWrap}
      style={{width: size, height: size}}
      onClick={onClick}
    >
      <div
        className={classnames(
          styles.frame,
          styles.frameActive,
          active && styles.open,
        )}
      />
      <div
        className={classnames(
          styles.frame,
          styles.frameEmptyNotToken,
          !url && styles.open,
        )}
      />
      <div
        className={classnames(
          styles.frame,
          styles.frameNotClaimed,
          !claimed && url && styles.open,
        )}
      >
        <img src="/assets/icons/notClaimed.svg" className={styles.badge} />
      </div>
      <div
        className={classnames(
          styles.frame,
          styles.frameCopy,
          spawnCopy && styles.open,
        )}
      />
      <div
        className={classnames(
          styles.frame,
          styles.frameDefault,
          claimed && url && styles.open,
        )}
      />
      <div className={styles.mask}>
        <Spritesheet
          className={styles.item}
          startUrl={object?.start_url}
          enabled={enabled}
          size={resolution}
          numFrames={numFrames}
        />
        {level && <div className={styles.level}>{level}</div>}
        {value && <div className={styles.value}>{value}</div>}
      </div>
    </div>
  );
};
