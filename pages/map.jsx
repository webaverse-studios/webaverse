// import * as THREE from 'three';
// import {useState, useMemo, useEffect} from 'react';

import { useState } from "react";
import styles from "../styles/Map.module.css";
import { MapCanvas } from "../src/components/MapCanvas.jsx";
import { MapSidebar } from "../src/components/MapSidebar.jsx";
import { UserBox } from "../src/components/user-box/UserBox.jsx";

//

const arrayEquals = (a, b) => {
    if (a.length !== b.length) {
        return false;
    } else {
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
};

//

export const Map = () => {
    const [minMax, setMinMax] = useState([0, 0, 0, 0]);

    return (
        <div className={styles.map}>
            <UserBox className={styles.mapUserBox} />
            <MapCanvas
                minMax={minMax}
                onLoad={(u) => {
                    // console.log('load url', {u});
                    window.location.href = u;
                }}
                onSelectChange={(o) => {
                    // console.log('check array', minMax.slice(), o.minMax.slice(), !arrayEquals(minMax, o.minMax));
                    if (!arrayEquals(minMax, o.minMax)) {
                        setMinMax(o.minMax.slice());
                    } else {
                        setMinMax([0, 0, 0, 0]);
                    }
                }}
            />
            <MapSidebar minMax={minMax} />
        </div>
    );
};