const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, options) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  getCard: (slug) => request(`/card/${slug}`),
  getHistory: (slug) => request(`/card/${slug}/history`),
  claim: (cardSlug, userWallet, collectorName) =>
    request('/claim', {
      method: 'POST',
      body: JSON.stringify({ cardSlug, userWallet, collectorName }),
    }),
  getDemoState: () => request('/demo/state'),
  resetDemo: () => request('/demo/reset', { method: 'POST' }),
  getConfig: () => request('/config'),
  syncChain: () => request('/chain/sync', { method: 'POST' }),
  getCollections: () => request('/collections'),
  createCollection: (name) =>
    request('/collections', { method: 'POST', body: JSON.stringify({ name }) }),
  mintCard: (collectionSlug) =>
    request(`/collections/${collectionSlug}/cards`, { method: 'POST', body: JSON.stringify({}) }),
};
