import React, { useState, useContext, useEffect } from "react";
import classnames from "classnames";
import styles from "./TokenBox.module.css";
import { Spritesheet } from "../spritesheet";

export const TokenBox = (props) => {
    const {
        size,
        resolution,
        active,
        claimed,
        spawnCopy,
        onClick,
        object,
        canvasRef,
        numFrames,
        level,
        value,
        type,
        timerTimestamp,
        emptyIcon
    } = props;

    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        if (timerTimestamp) {
            var countDownDate = new Date(parseInt(timerTimestamp)).getTime() * 1000;
            var x = setInterval(function () {
                var now = new Date().getTime();
                var distance = countDownDate - now;
                var hours = Math.floor(
                    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                );
                var minutes = Math.floor(
                    (distance % (1000 * 60 * 60)) / (1000 * 60)
                );
                var seconds = Math.floor((distance % (1000 * 60)) / 1000);
                setTimeLeft(hours + ":" + minutes + ":" + seconds);

                if (distance < 0) {
                    clearInterval(x);
                    setTimeLeft("EXPIRED");
                }
            }, 1000);
        }
    }, []);

    return (
        <div
            className={styles.tokenBoxWrap}
            style={{ width: size, height: size }}
            onClick={onClick}
        >
            {active && (
                <div className={classnames(styles.frame, styles.frameActive)} />
            )}
            <div className={classnames(styles.frame, type && styles[type])} />
            <img src={emptyIcon} className={styles.emptyIcon} />
            {!claimed && object && (
                <img
                    src="/assets/icons/notClaimed.svg"
                    className={styles.badge}
                />
            )}
            {spawnCopy && (
                <div className={classnames(styles.frame, styles.frameCopy)} />
            )}
            <div className={styles.mask}>
                {object && (
                    <Spritesheet
                        className={styles.item}
                        startUrl={object.start_url}
                        size={resolution}
                        numFrames={numFrames}
                    />
                )}
                {canvasRef && (
                    <canvas
                        ref={canvasRef}
                        className={styles.canvas}
                        style={{
                            width: resolution,
                            height: resolution,
                        }}
                    />
                )}
                <div className={styles.timer}>{timeLeft}</div>
                {value && <div className={styles.value}>{value}</div>}
            </div>
            {level && (
                <div className={classnames(styles.level, type && styles[type])}>
                    Lv.{level}
                </div>
            )}
        </div>
    );
};
