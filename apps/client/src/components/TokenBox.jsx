import React, {useState, useEffect} from "react";
import classnames from "classnames";
import styles from "./TokenBox.module.css";
import {Spritesheet} from "../spritesheet";

export const TokenBox = (props) => {
    const {
        size,
        resolution,
        active,
        claimed,
        onClick,
        object,
        canvasRef,
        numFrames,
        level,
        value,
        timerTimestamp,
        emptyIcon,
        rarity,
    } = props;

    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        if (timerTimestamp) {
            var countDownDate =
                new Date(parseInt(timerTimestamp)).getTime() * 1000;
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
                if (hours < 1) {
                    setTimeLeft(minutes + ":" + seconds);
                } else {
                    setTimeLeft(hours + ":" + minutes);
                }
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
            style={{width: size, height: size}}
            onClick={onClick}
        >
            {active && (
                <div className={classnames(styles.frame, styles.frameActive)} />
            )}
            <div
                className={classnames(styles.frame, rarity && styles[rarity])}
                style={{opacity: timerTimestamp ? 0.6 : 1}}
            />
            <img src={emptyIcon} className={styles.emptyIcon} />
            {!claimed && object && (
                <img
                    src="/assets/icons/notClaimed.svg"
                    className={styles.badge}
                />
            )}
            <div
                className={styles.mask}
                style={{opacity: timerTimestamp ? 0.6 : 1}}
            >
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
                {timerTimestamp && (
                    <div className={styles.timer}>{timeLeft}</div>
                )}
                {value && <div className={styles.value}>{value}</div>}
            </div>
            {level && (
                <div
                    className={classnames(
                        styles.level,
                        rarity && styles[rarity]
                    )}
                    style={{opacity: timerTimestamp ? 0.6 : 1}}
                >
                    Lv.{level}
                </div>
            )}
        </div>
    );
};