
import React from 'react';
import classNames from 'classnames';
import CustomButton from '../../custom-button';

import styles from './switch.module.css';

//

export const Switch = ({value, setValue, values, className}) => {

    const handleLeftArrowClick = () => {

        const oldValueId = values.indexOf(value);
        const newValueId = (oldValueId === 0 ? values.length - 1 : oldValueId - 1);
        setValue(values[ newValueId ]);

    };

    const handleRightArrowClick = () => {

        const oldValueId = values.indexOf(value);
        const newValueId = (oldValueId >= values.length - 1 ? 0 : oldValueId + 1);
        setValue(values[ newValueId ]);

    };

    return (
        <div className={ classNames( styles.switch, className ) } >
            <CustomButton
                type="icon"
                theme="dark"
                icon="arrowLeft"
                className={styles.left}
                onClick={handleLeftArrowClick}
                size={24}
            />
            <div className={ styles.value } onClick={ handleRightArrowClick }>{ value }</div>
            <CustomButton
                type="icon"
                theme="dark"
                icon="arrowRight"
                className={styles.right}
                onClick={handleRightArrowClick}
                size={24}
            />
        </div>
    );

};
