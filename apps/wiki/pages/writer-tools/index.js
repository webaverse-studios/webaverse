import styles from "./WriterTools.module.css";
import React, {useContext, useState} from "react";
import {WikiContext} from "../_app";
import {Character} from "./characters";

//

const datasets = {
    
}

//

const ContentObject = ({url}) => {
    return (
            <div className={styles.editorWrap}>
                <div className={styles.contentWrap}>
                    <Character />
                </div>
            </div>
    );
};

ContentObject.getInitialProps = async ctx => {
    const {req} = ctx;
    const url = req.url;
    return {
        url,
    };
};

export default ContentObject;