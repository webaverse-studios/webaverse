import React, {useState, useRef, useEffect} from 'react';
import classnames from 'classnames';
import styles from './ResourcesBox.module.css';

const resources = [
  {
    name: 'Silk',
    icon: '/assets/icons/silk.png',
    claimed: 100,
    notClaimed: 240,
  },
  {
    name: 'Aqualith',
    icon: '/assets/icons/aqualith.png',
    claimed: 56,
    notClaimed: 322,
  },
  {
    name: 'Moonstone',
    icon: '/assets/icons/moonstone.png',
    claimed: 20,
    notClaimed: 560,
  },
  {
    name: 'Venturine',
    icon: '/assets/icons/venturine.png',
    claimed: 16,
    notClaimed: 456,
  },
  {
    name: 'Fyrite',
    icon: '/assets/icons/fyrite.png',
    claimed: 77,
    notClaimed: 234,
  },
  {
    name: 'Obsidian',
    icon: '/assets/icons/obsidian.png',
    claimed: 98,
    notClaimed: 547,
  },
];

export const ResourcesBox = () => {
  useEffect(() => {}, []);
  return (
    <div className={classnames(styles.resourcesBoxWrap)}>
      <ul>
        {resources.map((item, i) => (
          <li key={i}>
            <img src={item.icon} alt={item.name} />
            <p>
              <span>{item.notClaimed}</span>
              {item.claimed}
            </p>
          </li>
        ))}
        <li key={'claim'}>
          <button>
            <img src={'/assets/icons/exclamation.svg'} />
          </button>
        </li>
      </ul>
    </div>
  );
};