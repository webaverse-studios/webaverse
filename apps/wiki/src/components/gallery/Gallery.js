import React, { useState, useEffect, useContext } from "react";
import classnames from "classnames";
import styles from "./Gallery.module.css";
import { ImageLoader } from "../image-loader/ImageLoader";

export const Gallery = ({ gallery, className }) => {
    
    const [ reroll, setReroll ] = useState(true);

    return (
        <div className={classnames(className)}>
            <div className={styles.galleryWrap}>
                {gallery &&
                    gallery.length > 0 &&
                    gallery.map((image, i) => {
                        return (
                            <div className={styles.galleryItem} key={i}>
                                <div className={styles.imageWrap}>
                                { image.url && (
                                        <ImageLoader url={image.url} title={image.caption} rerollable={reroll} />
                                )}
                                </div>
                                <p>{image?.caption}</p>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
