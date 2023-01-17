import React, {useContext} from 'react';
import {ChainContext} from '../hooks/chainProvider';
import {isChainSupported} from '../hooks/useChain';
import classnames from 'classnames';
import {AppContext} from './App';

import styles from './Chains.module.css';

export default function Chains() {
  const {state, setState} = useContext(AppContext);
  const {chains, selectedChain, selectChain} = useContext(ChainContext);

  const setOpen = newOpen => {
      setState({openedPanel: newOpen ? 'ChainsPanel' : null});
  };

  return state.openedPanel === 'ChainsPanel' ? (<div className={classnames(styles.chainSelector)}>
    <div className={styles.selectedChain} onClick={() => setOpen(!open)}>
      <img className={styles.img} src={'/images/ui/repeat.svg'} />
      {selectedChain.name}
    </div>
    <div className={[styles.chainDropDown, open ? styles.showChainSelector : styles.hideChainSelector].join(' ')}>
      <ul id='chains' className={styles.chains}>
        {Object.keys(chains)
          .map(key => chains[key])
          .filter(isChainSupported)
          .map(c => (
            <li key={c.chainId} className={selectedChain.chainId === c.chainId ? styles.selected : undefined}>
                <button onClick={() => {
                    selectChain(c);
                    setOpen(false);
                }}>
                {c.name}
                </button>
            </li>
          ))}
      </ul>
    </div>
  </div>
  ) : null;
}