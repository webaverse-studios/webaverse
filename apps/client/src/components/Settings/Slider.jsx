
import classNames from 'classnames';
import React from 'react';
import CustomButton from '../../custom-button';

import styles from './Slider.module.css';

//

export const Slider = ({className, value, setValue, max = 100, min = 0}) => {

    const handleMinusBtnClick = () => {

        const newValue = Math.max(min, value - 10);
        setValue(newValue);

    };

    const handlePlusBtnClick = () => {

        const newValue = Math.min(max, value + 10);
        setValue(newValue);

    };

    //

    return (
        <div className={ classNames(styles.slider, className) }>
            <CustomButton
                type="icon"
                theme="dark"
                icon="minus"
                className={styles.minus}
                onClick={handleMinusBtnClick}
                size={24}
            />
            <div className={ styles.progressWrapper }>
                <div className={ styles.progressFill } style={{width: `${ 100 * value / max }%`}}></div>
            </div>
            <div className={ styles.value }>{ value }</div>
            <CustomButton
                type="icon"
                theme="dark"
                icon="plus"
                className={styles.plus}
                onClick={handlePlusBtnClick}
                size={24}
            />
            <div className={ styles.clearfix }/>
        </div>
    );

};