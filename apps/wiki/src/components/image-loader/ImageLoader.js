import React, {useState, useEffect, useContext, useRef} from "react";
import classnames from "classnames";
import styles from "./ImageLoader.module.css";

export const ImageLoader = ({url, className, rerollable}) => {
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState("0%");
    const [imageUrl, setImageUrl] = useState("");
    const [reroll, setReroll] = useState(false);
    const [triggerLoader, setTriggerLoader] = useState(true);
    const [timestamp, setTimestamp] = useState("");

    const imgLoad = loadUrl => {
        return new Promise(function (resolve, reject) {
            var request = new XMLHttpRequest();
            // console.log(loadUrl)
            request.open("GET", loadUrl);
            request.responseType = "blob";
            request.onprogress = function (pr) {
                setLoadingProgress(
                    `${Math.round((pr.loaded * 100) / pr.total)}%`,
                );
            };
            request.onload = function () {
                if (request.status === 200) {
                    setLoading(false);
                    resolve(request.response);
                } else {
                    reject(new Error("Error code:" + request.statusText));
                }
            };
            request.onerror = function () {
                reject(new Error("Network error."));
            };
            request.send();
        });
    };

    useEffect(() => {
        /* if (url && triggerLoader) {
            setImageUrl();
            setLoadingProgress('Generating');
            setLoading(true)
            let xmlHTTP = new XMLHttpRequest();
            console.log(`${url}${reroll && '?reroll=true'}`);
            xmlHTTP.open("GET", `${url}${reroll && '?reroll=true'}`, true);
            xmlHTTP.onprogress = function (pr) {
                setLoadingProgress(`${Math.round((pr.loaded * 100) / pr.total)}%`);
            };
            xmlHTTP.onloadend = function (e) {
                console.log(e.target.response)
                setImageUrl(`data:image/png;base64,${e.target.response}`);
                if(reroll) {
                    setTimestamp(Date.now());
                }
                setLoadingProgress(100);
                setTriggerLoader(false);
                setReroll(false);
                setLoading(false);
            };
            xmlHTTP.send();
        } */
        if (url && triggerLoader) {
            setLoadingProgress("Generating");
            setLoading(true);
            imgLoad(`${url}${reroll ? '?reroll=true' : ''}`).then(
                function (response) {
                    setImageUrl(window.URL.createObjectURL(response));
                },
                function (Error) {
                    console.log(Error);
                },
            );
        }
    }, [url, triggerLoader]);

    useEffect(() => {
        if (reroll) {
            setTriggerLoader(true);
        }
    }, [reroll]);

    return (
        <div className={styles.mainWrap}>
            <img
                src={"/assets/refresh.svg"}
                onClick={() => setReroll(true)}
                className={styles.reroll}
            />
            {!loading ? (
                <img
                    src={imageUrl}
                    className={classnames(styles.image, className)}
                />
            ) : (
                <div className={styles.loaderWrap}>
                    <svg
                        viewBox="0 0 190 190"
                        fill="#FFFFFF"
                        className={styles.loaderIcon}
                    >
                        <path d="M95,7.71V0a95.13,95.13,0,0,1,95,95h-7.71A87.39,87.39,0,0,0,95,7.71Z" />
                    </svg>
                    <div className={styles.percentage}>
                        {loadingProgress && loadingProgress}
                    </div>
                </div>
            )}
        </div>
    );
};