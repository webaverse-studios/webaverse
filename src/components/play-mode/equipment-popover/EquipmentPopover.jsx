import React from 'react';
import classnames from 'classnames';
import styles from './EquipmentPopover.module.css';
import {PlaceholderImg} from '../../../PlaceholderImg.jsx';

export const EquipmentPopover = ({
  open = true,
}) => {
  return (
    <div className={ classnames(styles.equipmentPopover, open ? styles.open : null) } >
      <PlaceholderImg className={styles.placeholderImg} src='./images/arc-white.svg' />
    </div>
  );
};