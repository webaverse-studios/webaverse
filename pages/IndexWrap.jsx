import React from 'react';
import ReactDOM from 'react-dom/client';

import {Index} from './Index.jsx';
import '../packages/client/styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Index />
  </React.StrictMode>,
);