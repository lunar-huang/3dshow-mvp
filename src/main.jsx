import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './App.jsx';
import { PRIVY_ENABLED } from './lib/auth.js';
import './index.css';

const routedApp = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

const root = PRIVY_ENABLED ? (
  <PrivyProvider
    appId={import.meta.env.VITE_PRIVY_APP_ID}
    config={{
      loginMethods: ['email', 'google'],
      embeddedWallets: { createOnLogin: 'users-without-wallets' },
    }}
  >
    {routedApp}
  </PrivyProvider>
) : (
  routedApp
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{root}</React.StrictMode>
);
