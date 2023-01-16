import React, { useState, useEffect, useContext } from "react";
import classnames from "classnames";
import styles from "./EditSource.module.css";

export const EditSource = (content) => {
    //console.log("Content: ",content);
    return (
        <div className={styles.sourceWrap}>
            <p>
                You do not have permission to edit this page, please log to do
                so. Please <a>log in</a>!
            </p>
            <p>You can only view and copy the source of this page.</p>
            <textarea className={styles.textarea} readOnly>
                {content?.content}
            </textarea>
        </div>
    );
};
