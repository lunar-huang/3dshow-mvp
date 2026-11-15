import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

export const PRIVY_ENABLED = Boolean(import.meta.env.VITE_PRIVY_APP_ID);

function randomWallet() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function usePrivyAuth() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0]?.address || user?.wallet?.address || null;
  const label = user?.email?.address || user?.google?.email || null;

  return { ready, authenticated, wallet, login, logout, label };
}

export function useAnonymousAuth() {
  const [wallet, setWallet] = useState('');

  useEffect(() => {
    setWallet(randomWallet());
  }, []);

  return {
    ready: true,
    authenticated: Boolean(wallet),
    wallet,
    login: () => {},
    logout: () => {},
    label: null,
  };
}
