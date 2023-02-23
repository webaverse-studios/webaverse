import React from 'react';
import ReactDOM from 'react-dom/client';

import {Engine} from './engine.jsx';
import '../styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Engine />
  </React.StrictMode>,
);