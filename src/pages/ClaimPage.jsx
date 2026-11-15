import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import CardFlip from '../components/CardFlip.jsx';
import { PRIVY_ENABLED, usePrivyAuth, useAnonymousAuth } from '../lib/auth.js';

function formatWallet(address) {
  if (!address) return null;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function ClaimPageWithAuth({ useAuth }) {
  const auth = useAuth();
  const { slug } = useParams();
  const [card, setCard] = useState(null);
  const [history, setHistory] = useState([]);
  const [demoMode, setDemoMode] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);

  function refresh() {
    return Promise.all([api.getCard(slug), api.getHistory(slug)]).then(([cardRes, historyRes]) => {
      setCard(cardRes.card);
      setHistory(historyRes.history);
    });
  }

  useEffect(() => {
    api.getConfig().then((c) => setDemoMode(c.demoMode));
    refresh().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handleClaim() {
    if (!auth.wallet) return;
    setClaiming(true);
    setClaimError(null);
    try {
      await api.claim(slug, auth.wallet, name || undefined);
      await refresh();
    } catch (e) {
      setClaimError(e.message);
    } finally {
      setClaiming(false);
    }
  }

  if (error) {
    return (
      <main className="claim-page">
        <p>Card not found. {error}</p>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="claim-page">
        <p>Loading card...</p>
      </main>
    );
  }

  return (
    <main className="claim-page">
      <CardFlip front={card.image} back="/back.svg" alt={card.collectionName} />
      <h2>{card.collectionName}</h2>
      <p>Serial: {card.serialDisplay}</p>
      <p>Status: {card.status}</p>

      <div className="chain-info">
        {demoMode ? (
          <p className="hint">Demo mode — claims are database-only, not on-chain.</p>
        ) : card.chainOwner ? (
          <p>
            On-chain owner: <code>{card.chainOwner}</code>
          </p>
        ) : (
          <p className="hint">Not yet claimed on-chain.</p>
        )}
        {card.ownerWallet && card.ownerWallet !== card.chainOwner && (
          <p className="hint">
            DB-recorded wallet: <code>{card.ownerWallet}</code>
          </p>
        )}
      </div>

      {card.status === 'UNCLAIMED' && (
        <div className="claim-form">
          {PRIVY_ENABLED && !auth.authenticated ? (
            <button className="btn" disabled={!auth.ready} onClick={auth.login}>
              Login to Claim
            </button>
          ) : (
            <>
              <input
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="wallet-note">
                {PRIVY_ENABLED
                  ? `Logged in as ${auth.label || 'wallet'} — ${formatWallet(auth.wallet)}`
                  : `Demo wallet: ${formatWallet(auth.wallet) || '...'}`}
                {PRIVY_ENABLED && (
                  <button className="link-btn" onClick={auth.logout}>
                    Log out
                  </button>
                )}
              </p>
              <button className="btn" disabled={claiming || !auth.wallet} onClick={handleClaim}>
                {claiming ? 'Claiming...' : 'Claim card'}
              </button>
              {claimError && <p className="error">{claimError}</p>}
            </>
          )}
        </div>
      )}

      {card.status === 'CLAIMED' && (
        <p className="claimed">
          Already claimed{card.ownerName ? ` by ${card.ownerName}` : ''}.
        </p>
      )}

      {history.length > 0 && (
        <div className="history">
          <h3>History</h3>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                <strong>{h.eventType}</strong>
                {h.toWallet && ` → ${formatWallet(h.toWallet)}`}
                {h.txHash && !h.txHash.startsWith('demo-') && (
                  <span className="hint"> ({h.txHash.slice(0, 10)}…)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

export default function ClaimPage() {
  return PRIVY_ENABLED ? (
    <ClaimPageWithAuth useAuth={usePrivyAuth} />
  ) : (
    <ClaimPageWithAuth useAuth={useAnonymousAuth} />
  );
}
