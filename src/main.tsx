import React from 'react';
import ReactDOM from 'react-dom/client';
import './fonts.css';
import './index.css';
import { App } from './app/App';
import { Providers } from './app/providers';
import { registerServiceWorker } from './app/sw-register';

// Register service worker for PWA offline support
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
