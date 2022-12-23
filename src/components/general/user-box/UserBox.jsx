import React, {Fragment, useState, useEffect, useContext} from "react";
import classnames from "classnames";
import {AppContext} from "../../../components/app";
import styles from "./UserBox.module.css";
import * as sounds from "../../../../sounds.js";
import CustomButton from "../custom-button";
import cameraManager from "../../../../camera-manager.js";

export const UserBox = ({className, setLoginFrom}) => {
  const {state, setState, account, chain} = useContext(AppContext);
  const [address, setAddress] = useState("");
  const [ensName, setEnsName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const {
    isConnected,
    currentAddress,
    connectWallet,
    disconnectWallet,
    errorMessage,
    wrongChain,
    getAccounts,
    getAccountDetails,
  } = account;
  const {selectedChain} = chain;

  const openInventory = e => {
    setState({openedPanel: "Inventory"});
  };

  const handleCancelBtnClick = () => {
    setState({openedPanel: null});

    sounds.playSoundName("menuBack");
  };

  useEffect(() => {
    if (!currentAddress) return;
    _setAddress(currentAddress);
  }, [currentAddress, selectedChain]);

  const _setAddress = async address => {
    const {name, avatar} = await getAccountDetails(address);
    setEnsName(name ? shortAddress(name) : "");
    setAvatarUrl(avatar ? resolveAvatar(avatar) : "");
    setAddress(shortAddress(address) || "");
  };

  const shortAddress = address => {
    if (address.length > 12) {
      return address.slice(0, 6) + `...` + address.slice(-5);
    } else {
      return address;
    }
  };

  const resolveAvatar = url => {
    const match = url.match(/^ipfs:\/\/(.+)/);
    if (match) {
      return `https://cloudflare-ipfs.com/ipfs/${match[1]}`;
    } else {
      return url;
    }
  };

  const metaMaskLogin = async event => {
    event.preventDefault();
    event.stopPropagation();

    if (!loggingIn) {
      setLoggingIn(true);
      try {
        await connectWallet();
        setLoginFrom("metamask");
      } catch (err) {
        console.warn(err);
      } finally {
        setState({openedPanel: null});
        setLoggingIn(false);
      }
    }
  };

  const _triggerClickSound = () => {
    sounds.playSoundName("menuClick");
  };

  const loggedIn = isConnected;

  const handleSettingsBtnClick = () => {
    setState({openedModal: "settings"});
  };

  const handleLocationBtnClick = () => {
    setState({openedModal: "location"});
  };

  const handleWorldBtnClick = () => {
    if (state.openedPanel === "WorldPanel") {
      if (!cameraManager.pointerLockElement) {
        cameraManager.requestPointerLock();
      }

      setState({openedPanel: null});
    } else {
      if (cameraManager.pointerLockElement) {
        cameraManager.exitPointerLock();
      }

      setState({openedPanel: "WorldPanel"});
    }
  };

  return (
    <div className={classnames(styles.userBoxWrap)}>
      <div className={styles.leftCorner} />
      <div className={styles.rightCorner} />
      <ul>
        <li>
          <CustomButton
            type="icon"
            theme="light"
            icon="backpack"
            onClick={openInventory}
            size={32}
            onMouseEnter={_triggerClickSound}
          />
        </li>
        <li>
          <CustomButton
            type="icon"
            theme="light"
            icon="tokens"
            size={32}
            onClick={handleWorldBtnClick}
            onMouseEnter={_triggerClickSound}
          />
        </li>
        <li>
          <CustomButton
            type="icon"
            theme="light"
            icon="map"
            size={32}
            onClick={handleLocationBtnClick}
            onMouseEnter={_triggerClickSound}
          />
        </li>
        <li>
          <CustomButton
            type="icon"
            theme="light"
            icon="settings"
            size={32}
            onClick={handleSettingsBtnClick}
            onMouseEnter={_triggerClickSound}
          />
        </li>
        {!loggedIn && (
          <Fragment>
            <li>
              <div className={styles.profileImage}>
                <div className={styles.image}>
                  <img src={"/assets/backgrounds/profile-no-image.png"} />
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
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();

                  setState({openedPanel: state.openedPanel === "LoginPanel" ? null : "LoginPanel"});

                  sounds.playSoundName("menuNext");
                }}
                onMouseEnter={e => {
                  _triggerClickSound();
                }}
              />
            </li>
          </Fragment>
        )}
        {loggedIn && (
          <Fragment>
            <li>
              <div className={styles.profileImage}>
                <div className={styles.image}>
                  <img
                    src={
                      avatarUrl || "/assets/backgrounds/profile-no-image.png"
                    }
                    crossOrigin="Anonymous"
                  />
                </div>
              </div>
            </li>
            <li>
              <div className={styles.loggedInText} onClick={openInventory}>
                <div className={styles.chainName}>Polygon</div>
                <div className={styles.walletAddress}>{ensName || address}</div>
              </div>
              <CustomButton
                type="login"
                theme="dark"
                icon="logout"
                size={28}
                className={styles.loginButton}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  disconnectWallet();
                }}
                onMouseEnter={e => {
                  _triggerClickSound();
                }}
              />
            </li>
          </Fragment>
        )}
      </ul>

      {state.openedPanel === "LoginPanel" &&
        <div
          className={classnames(
            styles.userLoginMethodsModal
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
            onClick={metaMaskLogin}
            onMouseEnter={_triggerClickSound}
          />
          {/* <CustomButton
            theme="light"
            icon="discord"
            text="Discord"
            // url={`https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${window.location.origin}%2Flogin&response_type=code&scope=identify`}
            size={18}
            className={styles.methodButton}
            // onClick={metaMaskLogin}
            onMouseEnter={_triggerClickSound}
          /> */}
          <CustomButton
            theme="light"
            icon="close"
            text="Cancel"
            size={18}
            className={styles.methodButton}
            onClick={handleCancelBtnClick}
            onMouseEnter={_triggerClickSound}
          />
        </div>
        }
    </div>
  );
};