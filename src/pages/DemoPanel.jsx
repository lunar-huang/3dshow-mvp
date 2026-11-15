import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

function formatWallet(address) {
  if (!address) return null;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function DemoPanel() {
  const [state, setState] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  async function load() {
    const d = await api.getDemoState();
    setState(d);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleReset() {
    setResetting(true);
    try {
      await api.resetDemo();
      await load();
    } finally {
      setResetting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.syncChain();
      setSyncMessage(
        `Synced: ${res.mintedOnChain} tokens on-chain, ${res.created} new card(s) added, ${res.updated} reconciled.`
      );
      await load();
    } catch (e) {
      setSyncMessage(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  if (!state) {
    return (
      <main className="demo-panel">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="demo-panel">
      <h2>Presenter panel</h2>

      {state.demoMode ? (
        <button className="btn" disabled={resetting} onClick={handleReset}>
          {resetting ? 'Resetting...' : 'Reset demo data'}
        </button>
      ) : (
        <button className="btn" disabled={syncing} onClick={handleSync}>
          {syncing ? 'Syncing...' : 'Sync from chain'}
        </button>
      )}
      {syncMessage && <p className="hint">{syncMessage}</p>}

      {state.collections.map((col) => (
        <div key={col.slug} className="demo-collection">
          <h3>{col.name}</h3>
          <ul>
            {col.cards.map((c) => (
              <li key={c.slug}>
                <Link to={`/card/${c.slug}`}>{c.slug}</Link> — {c.status}
                {c.chainOwner && <span className="hint"> · {formatWallet(c.chainOwner)}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </main>
  );
}
