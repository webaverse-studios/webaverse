import {
  useState,
  useEffect,
  createRef,
} from 'react';
import React from 'react';

import {
  WebaverseEngine,
} from '../packages/engine/webaverse.js';
import {
  IoHandler,
} from './IoHandler.jsx';

import styles from '../packages/client/styles/Index.module.css';

let loaded = false;

export const Index = () => {
  const [engine, setEngine] = useState(null);
  const [element, setElement] = useState(null);
  const canvasRef = createRef();
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !loaded) {
      loaded = true;

      const engine = new WebaverseEngine({
        dstCanvas: canvas,
      });
      setEngine(engine);
      setElement(canvas);
    }
  }, [canvasRef.current]);

  return (
    <>
      <IoHandler
        element={element}
        ioManager={engine?.ioManager}
      />
      <canvas
        className={styles.canvas}
        ref={canvasRef}
      />
    </>
  );
};