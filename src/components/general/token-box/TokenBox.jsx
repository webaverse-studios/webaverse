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
    object,
    canvasRef,
    enabled,
    numFrames,
    level,
    value,
  } = props;
  return (
    <div
      className={styles.tokenBoxWrap}
      style={{width: size, height: size}}
      onClick={onClick}
    >
      {active &&
        <div
          className={classnames(
            styles.frame,
            styles.frameActive,
            active && styles.open,
          )}
        />
      }
      {!object &&
        <div
          className={classnames(
            styles.frame,
            styles.frameEmptyNotToken,
            styles.open,
          )}
        />
      }
      {!claimed && object &&
        <div
          className={classnames(
            styles.frame,
            styles.frameNotClaimed,
            styles.open,
          )}
        >
          <img src="/assets/icons/notClaimed.svg" className={styles.badge} />
        </div>
      }
      {spawnCopy &&
        <div
          className={classnames(
            styles.frame,
            styles.frameCopy,
            styles.open,
          )}
        />
      }
      {claimed && object &&
        <div
          className={classnames(
            styles.frame,
            styles.frameDefault,
            styles.open,
          )}
        />
      }
      <div className={styles.mask}>
        {object &&
          <Spritesheet
            className={styles.item}
            startUrl={object.start_url}
            enabled={enabled}
            size={resolution}
            numFrames={numFrames}
          />
        }
        {canvasRef && 
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            style={{
              width: resolution,
              height: resolution,
            }}
            />
        }
        {level && <div className={styles.level}>{level}</div>}
        {value && <div className={styles.value}>{value}</div>}
      </div>
    </div>
  );
}