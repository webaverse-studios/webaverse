import React, {useState, useEffect, useContext} from 'react';
import classnames from 'classnames';
import {AppContext} from './App';

import styles from './ClaimsNotification.module.css';

import dropManager from '@webaverse-studios/engine/DropManager.js';

const ClaimsNotification = () => {
  const {state, setState} = useContext(AppContext);
  const [numClaims, setNumClaims] = useState(0);

  useEffect(() => {
    const claimschange = e => {
      console.log('set num claims', e.data.claims.length);
      setNumClaims(e.data.claims.length);
    };
    dropManager.addEventListener('claimschange', claimschange);
    return () => {
      dropManager.removeEventListener('claimschange', claimschange);
    };
  }, []);

  const onClick = e => {
    e.preventDefault();
    e.stopPropagation();

    setState({
      openedPanel: 'CharacterPanel',
    });
  };

  return (
    <div
      className={classnames(
        styles.claimsNotification,
      )}
      onClick={onClick}
    >
      <div className={styles.value}>{numClaims}</div>
      <div className={styles.label}>Claims</div>
    </div>
  );
};
export {
  ClaimsNotification,
};