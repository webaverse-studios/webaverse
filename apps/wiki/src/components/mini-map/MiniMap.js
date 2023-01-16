import React, { useState, useEffect, useContext } from "react";
import classnames from "classnames";
import styles from "./MiniMap.module.css";

export const MiniMap = (coordinates) => {
    return (
        <div className={styles.rightSection}>
            <div className={styles.label}>Location</div>
            <a href={"/map"}>
                <div className={styles.value}>
                    {
                        '"The Woods" A gloomy forest where sunlight seems to disappear'
                    }
                    <div className={styles.locationMap}>
                        <div className={styles.mapBg} />
                        <div className={styles.mapWrap}>{/* CANVAS */}</div>
                    </div>
                </div>
            </a>
        </div>
    );
};
