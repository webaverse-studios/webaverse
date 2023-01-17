import React, {useEffect, useState, useRef, useContext} from 'react';
import styles from './GrabKeyIndicators.module.css';
import {AppContext} from './components/app';
import {KeyIndicator} from './KeyIndicator';
import grabManager from '@webaverse-studios/engine/grab-manager';

export const GrabKeyIndicators = () => {
  const {editMode} = useContext(AppContext);
  const [gridSnapEnabled, setGridSnapEnabled] = useState(0);

  useEffect(() => {
    const setGridSnap = e => {
      setGridSnapEnabled(e.data.gridSnap);
    };
    grabManager.addEventListener('setgridsnap', setGridSnap);
  });

  return (
    <div>
      {editMode ? (
        <ul className={styles.indicatorlist}>
          <li>
            <KeyIndicator
              indicatorSvg="./images/ui/lmb.svg"
              label="Take or place object"
            ></KeyIndicator>
          </li>
          <li>
            <KeyIndicator indicator="X" label="Remove object"></KeyIndicator>
          </li>
          <li>
            <KeyIndicator
              indicator="V"
              label="Grid Snapping: "
              gridSnapEnabled={gridSnapEnabled}
            ></KeyIndicator>
          </li>
        </ul>
      ) : null}
    </div>
  );
};