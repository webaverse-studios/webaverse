import * as THREE from 'three';
import React, {useState, useEffect, useRef} from 'react';
import classnames from 'classnames';
import style from './DragAndDrop.module.css';
import {world} from '../world.js';
import {getRandomString, handleUpload} from '../util.js';
import {registerIoEventHandler, unregisterIoEventHandler} from './components/general/io-handler/IoHandler.jsx';
import {registerLoad} from './LoadingBox.jsx';
import game from '../game.js';
import metaversefile from 'metaversefile';

const _upload = () => new Promise((accept, reject) => {
  const input = document.createElement('input');
  input.type = 'file';
  // input.setAttribute('webkitdirectory', '');
  // input.setAttribute('directory', '');
  input.setAttribute('multiple', '');
  input.click();
  input.addEventListener('change', async e => {
    const name = 'Loading';
    const description = e.target.files ? e.target.files[0].name : `${e.target.files.length} files`;
    const load = registerLoad(name, description, 0);
    const o = await uploadCreateApp(e.target.files);
    load.end();
  });
});
const uploadCreateApp = async item => {
  const u = await handleUpload(item);
  let o = null;
  try {
    o = await metaversefile.createAppAsync({
      start_url: u,
    });
  } catch(err) {
    console.warn(err);
  }
  if (o) {
    o.contentId = u;
    o.instanceId = getRandomString();
    o.setComponent('physics', true);
    return o;
  } else {
    return null;
  }
};

const canvasWidth = 300;
const canvasHeight = 400;

const DragAndDrop = () => {
  const [queue, setQueue] = useState([]);
  const [currentApp, setCurrentApp] = useState(null);
  const canvasRef = useRef();

  useEffect(() => {
    function keydown(e) {
      if (game.inputFocused()) return true;

      if (e.which === 85) { // U
        (async () => {
          const app = await _upload();
          setQueue(queue.concat([app]));
        })();

        return false;
      }
    }
    registerIoEventHandler('keydown', keydown);
    return () => {
      unregisterIoEventHandler('keydown');
    };
  }, []);

  useEffect(() => {
    function dragover(e) {
      e.preventDefault();
    }
    window.addEventListener('dragover', dragover);
    const drop = async e => {
      e.preventDefault();
    
      /* const renderer = getRenderer();
      const rect = renderer.domElement.getBoundingClientRect();
      localVector2D.set(
        ( e.clientX / rect.width ) * 2 - 1,
        - ( e.clientY / rect.height ) * 2 + 1
      );
      localRaycaster.setFromCamera(localVector2D, camera);
      const dropZOffset = 2;
      const position = localRaycaster.ray.origin.clone()
        .add(
          localVector2.set(0, 0, -dropZOffset)
            .applyQuaternion(
              localQuaternion
                .setFromRotationMatrix(localMatrix.lookAt(
                  localVector3.set(0, 0, 0),
                  localRaycaster.ray.direction,
                  localVector4.set(0, 1, 0)
                ))
            )
        );
      const quaternion = camera.quaternion.clone(); */

      const items = Array.from(e.dataTransfer.items);
      await Promise.all(items.map(async item => {
        const name = 'Loading';
        const description = item.name;
        const load = registerLoad(name, description, 0);
        const app = await uploadCreateApp(item/*, {
          position,
          quaternion,
        }*/);
        load.end();
        if (app) {
          setQueue(queue.concat([app]));
        }
      }));
    
      /* let arrowLoader = metaverseUi.makeArrowLoader();
      arrowLoader.position.copy(position);
      arrowLoader.quaternion.copy(quaternion);
      scene.add(arrowLoader);
      arrowLoader.updateMatrixWorld();
    
      if (arrowLoader) {
        scene.remove(arrowLoader);
        arrowLoader.destroy();
      } */
    };
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', dragover);
      window.removeEventListener('drop', drop);
    };
  }, []);

  useEffect(() => {
    if (queue.length > 0 && !currentApp) {
      const app = queue[0];
      console.log('set app', app);
      setCurrentApp(app);
      setQueue(queue.slice(1));
    }
  }, [queue, currentApp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      console.log('bind canvas');
    }
  }, [canvasRef]);

  const _currentAppClick = e => {
    e.preventDefault();
    e.stopPropagation();
  };
  const _drop = async e => {
    e.preventDefault();
    e.stopPropagation();

    if (currentApp) {
      const localPlayer = metaversefile.useLocalPlayer();
      const position = localPlayer.position.clone()
        .add(new THREE.Vector3(0, 0, -2).applyQuaternion(localPlayer.quaternion));
      const quaternion = localPlayer.quaternion;

      currentApp.position.copy(position);
      currentApp.quaternion.copy(quaternion);
      currentApp.updateMatrixWorld();

      world.appManager.importApp(currentApp);
      
      setCurrentApp(null);
    }
  };
  const _equip = e => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('equip', currentApp);
  };
  const _mint = e => {
    e.preventDefault();
    e.stopPropagation();

    console.log('mint', currentApp);
  };

  return (
    <div className={style.dragAndDrop}>
      {currentApp ? (
        <div className={style.currentApp} onClick={_currentAppClick}>
          <h1 className={style.heading}>Upload object</h1>
          <div className={style.body}>
            <canvas className={style.canvas} width={canvasWidth} height={canvasHeight} ref={canvasRef} />
            <div className={style.wrap}>
              <div className={style.row}>
                <div className={style.label}>Name: </div>
                <div className={style.value}>{currentApp.name}</div>
              </div>
              <div className={style.row}>
                <div className={style.label}>Type: </div>
                <div className={style.value}>{currentApp.appType}</div>
              </div>
            </div>
          </div>
          <div className={classnames(style.buttons, style.footer)}>
            <div className={style.button} onClick={_drop}>
              <span>Drop</span>
              <sub>to world</sub>
            </div>
            <div className={style.button} onClick={_equip}>
              <span>Equip</span>
              <sub>to self</sub>
            </div>
            <div className={style.button} disabled onClick={_mint}>
              <span>Mint</span>
              <sub>on chain</sub>
            </div>
          </div>
        </div>
      ): null}
    </div>
  );
};
export {
  DragAndDrop,
};