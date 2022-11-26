import React, {useState, useEffect, useContext} from 'react';
import classnames from 'classnames';
import {AppContext} from './components/app';

import styles from './ClaimsNotification.module.css';

import dropManager from '../drop-manager.js';

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

  const open = numClaims > 0 && state.openedPanel === null;

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
        open ? styles.open : null,
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