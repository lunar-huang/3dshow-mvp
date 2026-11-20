import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function StudioPage() {
  const [collections, setCollections] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [minting, setMinting] = useState(null);
  const [error, setError] = useState(null);
  const [lastMinted, setLastMinted] = useState(null);

  function load() {
    return api.getCollections().then((d) => setCollections(d.collections));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function handleCreateCollection() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.createCollection(newName.trim());
      setNewName('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleMint(slug) {
    setMinting(slug);
    setError(null);
    setLastMinted(null);
    try {
      const res = await api.mintCard(slug);
      setLastMinted(res.card);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setMinting(null);
    }
  }

  return (
    <main className="studio-page">
      <h2>Creator Studio</h2>
      <p className="hint">Create a collection, then mint numbered cards into it.</p>

      <div className="studio-form">
        <input
          placeholder="New collection name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn" disabled={creating || !newName.trim()} onClick={handleCreateCollection}>
          {creating ? 'Creating...' : 'Create collection'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {lastMinted && (
        <p className="claimed">
          Minted <Link to={`/card/${lastMinted.slug}`}>{lastMinted.slug}</Link> (
          {lastMinted.serialDisplay})
        </p>
      )}

      {collections === null ? (
        <p>Loading...</p>
      ) : (
        collections.map((col) => (
          <div key={col.slug} className="studio-collection">
            <h3>{col.name}</h3>
            <p className="hint">{col.cardCount} card(s)</p>
            <button className="btn" disabled={minting === col.slug} onClick={() => handleMint(col.slug)}>
              {minting === col.slug ? 'Minting...' : 'Mint new card'}
            </button>
          </div>
        ))
      )}
    </main>
  );
}
