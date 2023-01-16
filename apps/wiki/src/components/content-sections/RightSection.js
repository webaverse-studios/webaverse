import React, { useState, useEffect, useContext } from "react";
import classnames from "classnames";
import Markdown from "marked-react";
import styles from "./Sections.module.css";

export const RightSection = (props) => {
    const { title, content, index } = props;
    return (
        <div className={styles.rightSection} key={index}>
            <div className={styles.label}>{title}:</div>
            <div className={styles.value}>
                <Markdown gfm openLinksInNewTab={false}>
                    {content}
                </Markdown>
            </div>
        </div>
    );
};
