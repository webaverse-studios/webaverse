import * as React from 'react';
import styles from './modal.module.css';

export const Modal = ({component: Component, ...rest}) => {
  return (
    <div className={styles.modalWrap}>
      <div className={styles.modalTitle}>{rest?.title}</div>
      <div className={styles.modalContentWrap}>
        <Component />
      </div>
    </div>
  );
};
