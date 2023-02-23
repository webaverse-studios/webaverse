import uuidByString from "uuid-by-string";
import Head from "next/head";

import styles from "../../styles/ContentObject.module.css";
import { Ctx, saveContent } from "../../clients/context.js";
import {
    cleanName,
    formatImages,
    formatUrls,
    getGalleryArray,
    getSections,
} from "../../utils.js";
import { generateItem } from "../../datasets/dataset-generator.js";
import { formatItemText } from "../../datasets/dataset-parser.js";
import { getDatasetSpecs } from "../../datasets/dataset-specs.js";
import React, { useState } from "react";
import { UserBox } from "../../src/components/user-box/UserBox";
import { EditSource } from "../../src/components/edit-source";
import {
    LeftSection,
    RightSection,
} from "../../src/components/content-sections";
import { MiniMap } from "../../src/components/mini-map/MiniMap";
import { ImageLoader } from "../../src/components/image-loader/ImageLoader";
import { MetaTags } from "../../src/components/meta-tags/MetaTags";

//

const rightColumn = [
    "Alignment",
    "Price",
    "Stats",
    "Properties",
    "Has",
    "Abilities",
    "Limit Break",
];

const hideSections = ["Name", "Class", "Image"];

//

const ContentObject = ({ type, title, content }) => {
    const [itemName, setItemName] = useState("");
    const [itemClass, setItemClass] = useState("");
    const [featuredImage, setFeaturedImage] = useState("");
    const [description, setDecription] = useState("");
    const [gallery, setGallery] = useState([]);

    const [sections, setSections] = useState([]);
    const [editSource, setEditSource] = useState(false);
    const [formatedContent, setFormatedContent] = useState();

    React.useEffect(() => {
        if (content) {
            formatImages(content, type).then((fiContent) => {
                formatUrls(fiContent).then((fuContent) => {
                    setFormatedContent(fuContent);
                });
            });
        }
    }, [content]);

    React.useEffect(() => {
        if (formatedContent) {
            getSections(formatedContent).then((res) => {
                setSections(res);
                setItemName(
                    res.filter((item) => item.title === "Name")[0]?.content
                );
                setItemClass(
                    res.filter((item) => item.title === "Class")[0]?.content
                );
            });
            getGalleryArray(formatedContent).then((res) => {
                if (res) {
                    setGallery(res);
                }
            });
        }
    }, [formatedContent]);

    React.useEffect(() => {
        const imageContent = sections.filter(
            (item) => item.title === "Image"
        )[0]?.content;
        if (imageContent) {
            const match = imageContent.match(/(?<=\().+?(?=\))/g);
            if (match) {
                setFeaturedImage(match[0] + ".png");
            } else {
                setFeaturedImage(`/api/images/${type}s/${imageContent}.png`);
            }
        } else {
            if (gallery) {
                let randIndex = Math.floor(Math.random() * gallery.length);
                setFeaturedImage(gallery[randIndex]?.url);
            }
        }
    }, [sections]);

    const editContentSource = () => {
        setEditSource(true);
    };

    const backToPage = () => {
        setEditSource(false);
    };

    const editSection = async (content) => {
        saveContent();
    };

    return (
        <div className={styles.character}>
            <MetaTags
                title={`${itemName} ${itemClass && `- ${itemClass}`}`}
                description={description}
                image={featuredImage}
            />
            <UserBox />
            <img
                src={"/assets/logo.svg"}
                className={styles.logo}
                alt="Webaverse Wiki"
            />
            <div className={styles.contentWrap}>
                <div className={styles.name}>
                    <span>{`${type}s`}</span>
                    {itemName}
                    {!editSource ? (
                        <div className={styles.sourceActions}>
                            <div
                                className={styles.edit}
                                onClick={editContentSource}
                            >
                                <img
                                    src={"/assets/edit-source-lock.svg"}
                                    className={styles.icon}
                                />
                                Edit Source
                            </div>
                        </div>
                    ) : (
                        <div className={styles.sourceActions}>
                            <div className={styles.back} onClick={backToPage}>
                                <img
                                    src={"/assets/arrowBack.svg"}
                                    className={styles.iconBack}
                                />
                                Back to Page
                            </div>
                            <button className={styles.button}>Save</button>
                        </div>
                    )}
                </div>
                {!editSource ? (
                    <React.Fragment>
                        <div className={styles.rightContent}>
                            <div className={styles.title}>{itemName}</div>
                            {itemClass && (
                                <div className={styles.subtitle}>
                                    {itemClass}
                                </div>
                            )}
                            <div className={styles.previewImageWrap}>
                                <img
                                    src={"/assets/image-frame.svg"}
                                    className={styles.frame}
                                />
                                <div className={styles.mask}>
                                    <ImageLoader
                                        url={featuredImage}
                                        className={styles.image}
                                        rerollable={true}
                                    />
                                </div>
                            </div>
                            <div>
                                {sections &&
                                    sections.map((section, i) => {
                                        if (rightColumn.includes(section.title))
                                            return (
                                                <RightSection
                                                    title={section.title}
                                                    content={section.content}
                                                    index={i}
                                                />
                                            );
                                    })}
                                <MiniMap coordinates={""} />
                            </div>
                        </div>
                        <div className={styles.leftContent}>
                            <div className={styles.markdown}>
                                {sections &&
                                    sections.map((section, i) => {
                                        if (
                                            !rightColumn.includes(
                                                section.title
                                            ) &&
                                            !hideSections.includes(
                                                section.title
                                            )
                                        ) {
                                            return (
                                                <LeftSection
                                                    title={section.title}
                                                    content={section.content}
                                                    editSection={editSection}
                                                    gallery={gallery}
                                                    index={i}
                                                    key={i}
                                                />
                                            );
                                        }
                                    })}
                            </div>
                        </div>
                    </React.Fragment>
                ) : (
                    <EditSource content={content} />
                )}
            </div>
        </div>
    );
};

ContentObject.getInitialProps = async (ctx) => {
    const { req } = ctx;
    const match = req.url.match(/^\/([^\/]*)\/([^\/]*)/);
    let type = match ? match[1].replace(/s$/, "") : "";
    let name = match ? match[2] : "";
    name = decodeURIComponent(name);
    name = cleanName(name);

    const c = new Ctx();
    const title = `${type}/${name}`;
    const id = uuidByString(title);
    const query = await c.databaseClient.getByName("Content", title);
    if (query) {
        const { content } = query;
        return {
            type,
            id,
            title,
            content,
        };
    } else {
        const c = new Ctx();
        const [datasetSpecs, generatedItem] = await Promise.all([
            getDatasetSpecs(),
            generateItem(type, name),
        ]);
        const datasetSpec = datasetSpecs.find((ds) => ds.type === type);
        // console.log('got datset spec', {datasetSpec});
        const itemText = formatItemText(generatedItem, datasetSpec);

        // const imgUrl = `/api/characters/${name}/images/main.png`;

        const content = `\
${itemText}
`;
        // ![](${encodeURI(imgUrl)})

        await c.databaseClient.setByName("Content", title, content);

        return {
            type,
            id,
            title,
            content,
        };
    }
};

export default ContentObject;
