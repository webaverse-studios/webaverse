import React, {useState, useEffect, useContext} from "react";
import classnames from "classnames";
import styles from "./UserBox.module.css";
import CustomButton from "../custom-button";
import Link from "next/link";

export const UserBox = ({className}) => {
    const loggedIn = false;
    const [ open , setOpen] = useState(false);
    return (
        <div className={classnames(styles.userBoxWrap, className)}>
            <div className={styles.leftCorner} />
            <div className={styles.rightCorner} />
            <ul>
                <li>
                    <CustomButton
                        type="icon"
                        theme="light"
                        icon="backpack"
                        size={32}
                    />
                </li>
                <li>
                    <a href={"/map"}>
                        <CustomButton
                            type="icon"
                            theme="light"
                            icon="map"
                            size={32}
                        />
                    </a>
                </li>
                {!loggedIn && (
                    <>
                        <li>
                            <div className={styles.profileImage}>
                                <div className={styles.image}>
                                    <img src={"/assets/profile-no-image.png"} />
                                </div>
                            </div>
                        </li>
                        <li>
                            <div className={styles.loggedOutText}>
                                Not
                                <br />
                                Logged In
                            </div>
                            <CustomButton
                                type="login"
                                theme="dark"
                                icon="login"
                                size={28}
                                className={styles.loginButton}
                                onClick={() => setOpen(true)}
                            />
                        </li>
                    </>
                )}
                {loggedIn && (
                    <>
                        <li>
                            <div className={styles.profileImage}>
                                <div className={styles.image}>
                                    <img
                                        src={"/assets/profile-no-image.png"}
                                        crossOrigin="Anonymous"
                                    />
                                </div>
                            </div>
                        </li>
                        <li>
                            <div className={styles.loggedInText}>
                                <div className={styles.chainName}>
                                    {"Polygon"}
                                </div>
                                <div className={styles.walletAddress}>
                                    {"0x5d...C26e2d"}
                                </div>
                            </div>
                            <CustomButton
                                type="login"
                                theme="dark"
                                icon="logout"
                                size={28}
                                className={styles.loginButton}
                            />
                        </li>
                    </>
                )}
            </ul>

            <div
                className={classnames(
                    styles.userLoginMethodsModal,
                    open ? styles.opened : null,
                )}
            >
                <div className={styles.title}>
                    <span>Log in</span>
                </div>
                <CustomButton
                    theme="light"
                    icon="metamask"
                    text="Metamask"
                    size={18}
                    className={styles.methodButton}
                />
                <CustomButton
                    theme="light"
                    icon="phantom"
                    text="Phantom"
                    size={18}
                    className={styles.methodButton}
                />
                <CustomButton
                    theme="light"
                    icon="close"
                    text="Cancel"
                    size={18}
                    onClick={() => setOpen(false)}
                    className={styles.methodButton}
                />
            </div>
        </div>
    );
};