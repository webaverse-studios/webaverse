import React, { useState, useEffect, useContext } from "react";
import classnames from "classnames";
import Markdown from "marked-react";
import styles from "./Sections.module.css";
import { Gallery } from "../gallery";

export const LeftSection = (props) => {
    const { title, content, index, editSection, gallery } = props;
    const [editSource, setEditSource] = useState(false);
    const [iniContent, setIniContent] = useState(content);
    const [editedContent, setEditedContent] = useState(content);
    const [showEdit, setShowEdit] = useState(true);
    const handleContentChange = (e) => {
        setEditedContent(e.target.value);
    };
    const saveSectionContent = () => {
        editSection(editedContent);
    };
    return (
        <div className={classnames(styles.leftSection)} key={index}>
            <div>
                <h2>
                    {title}
                    <div className={styles.actionsBox}>
                        <div
                            className={styles.action}
                            onClick={() => setEditSource(true)}
                        >
                            <img src="/assets/edit.svg" />
                        </div>
                        <div className={styles.action}>
                            <img src="/assets/refresh.svg" />
                        </div>
                    </div>
                </h2>
                {editSource ? (
                    <div>
                        <div className={styles.actionsWrap}>
                            <div className={styles.actions}>
                                <button
                                    className={styles.cancel}
                                    onClick={() => setEditSource(false)}
                                >
                                    Cancel
                                </button>
                                <button onClick={saveSectionContent}>
                                    Save
                                </button>
                            </div>
                            <div className={styles.tabs}>
                                <button
                                    className={showEdit && styles.active}
                                    onClick={() => setShowEdit(true)}
                                >
                                    Edit
                                </button>
                                <button
                                    className={!showEdit && styles.active}
                                    onClick={() => setShowEdit(false)}
                                >
                                    Preview
                                </button>
                            </div>
                        </div>
                        <div className={styles.editPreviewWrap}>
                            {showEdit ? (
                                <textarea
                                    className={styles.sectionTextarea}
                                    onChange={(e) => handleContentChange(e)}
                                    value={editedContent}
                                />
                            ) : (
                                <>
                                    {title.toLowerCase() === "image gallery" ? (
                                        <Gallery gallery={gallery} />
                                    ) : (
                                        <Markdown gfm openLinksInNewTab={false}>
                                            {editedContent}
                                        </Markdown>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {title.toLowerCase() === "image gallery" ? (
                            <Gallery gallery={gallery} />
                        ) : (
                            <Markdown gfm openLinksInNewTab={false}>
                                {content}
                            </Markdown>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
