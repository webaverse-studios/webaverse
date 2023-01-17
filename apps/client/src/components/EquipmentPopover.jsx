import React from 'react';
import classnames from 'classnames';
import styles from './EquipmentPopover.module.css';
import {PlaceholderImg} from './PlaceholderImg.jsx';

export const EquipmentPopover = ({
  open = true,
}) => {
  return open ? (
    <div className={ classnames(styles.equipmentPopover) } >
      <PlaceholderImg className={styles.placeholderImg} src='./images/arc-white.svg' />
    </div>
  ) : null;
};