import React, {useState, useRef, useEffect} from 'react';
import classnames from 'classnames';
import styles from './HotBox.module.css';
import loadoutManager from '../../../../loadout-manager.js';
import {TokenBox} from '../../general/token-box/TokenBox';

export const HotBox = ({
  index,
  size,
  onDragOver,
  onDrop,
  onClick,
  onDoubleClick,
}) => {
    const canvasRef = useRef();
    const [selected, setSelected] = useState(false);
    
    useEffect(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;

        const hotbarRenderer = loadoutManager.getHotbarRenderer(index);
        hotbarRenderer.addCanvas(canvas);

        return () => {
          hotbarRenderer.removeCanvas(canvas);
        };
      }
    }, [canvasRef]);
    useEffect(() => {
      const idx = index;
      function selectedchange(e) {
        const {index, app} = e.data;
        if (index === -1 || app) {
          setSelected(index === idx);
        }
      }

      loadoutManager.addEventListener('selectedchange', selectedchange);

      return () => {
        loadoutManager.removeEventListener('selectedchange', selectedchange);
      };
    }, []);
    
    const pixelRatio = window.devicePixelRatio;

    return (
      <div
        className={ classnames(styles.hotBox, selected ? styles.selected : null) }
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <TokenBox size={60} canvasRef={canvasRef} active={selected ? true : false} resolution={2048} numFrames={128} />
        <div className={ styles.label }>
          <div className={ styles.background } />
          <div className={ styles.text }>{ index + 1 }</div>
        </div>
      </div>
    );
};