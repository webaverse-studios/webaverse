import React from 'react';
import ReactDOM from 'react-dom/client';

import {Map} from './map.jsx';
import '../styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Map />
  </React.StrictMode>,
);