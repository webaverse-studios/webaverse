import React, { useEffect, useRef, useState } from "react";
import { IconCollection } from "./IconCollection";
import styles from "./CustomIcon.module.css";
import classnames from "classnames";

async function getSVG(iconName) {
    const icon = IconCollection.find((item) => item.name === iconName);
    return await fetch(icon.file)
        .then((res) => res.text())
        .then((res) => {
            const parser = new DOMParser();
            const svgDom = parser.parseFromString(res, "image/svg+xml");
            return svgDom.firstElementChild;
        });
}

export default function CustomIcon(props) {
    const { size, icon, className } = props;
    const svgRef = useRef(null);

    useEffect(() => {
        if (icon) {
            getSVG(icon).then((res) => {
                svgRef.current.innerHTML = "";
                if (res) {
                    res.classList.add("icon");
                    svgRef.current.append(res);
                }
            });
        }
    }, []);

    return (
        <span ref={svgRef} style={{height: size, width: size}} className={className}></span>
    );
}
