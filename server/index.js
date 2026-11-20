import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { resetDemoData } from './demo-data.js';
import { syncFromChain } from './sync.js';
import * as chain from './chain.js';

const prisma = new PrismaClient();
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

const DEMO_MODE = process.env.DEMO_MODE !== 'false';
const PORT = process.env.PORT || 3001;

if (!DEMO_MODE) {
  chain.initChain();
}

function serialDisplay(card) {
  return `${String(card.serialNumber).padStart(3, '0')}/${String(card.editionSize).padStart(3, '0')}`;
}

function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

async function uniqueSlug(base, exists) {
  const candidate = slugify(base) || `c${Date.now().toString(36)}`;
  let slug = candidate;
  let n = 2;
  while (await exists(slug)) {
    slug = `${candidate}-${n}`;
    n += 1;
  }
  return slug;
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/config', (req, res) => {
  res.json({ ok: true, demoMode: DEMO_MODE, contractAddress: process.env.CONTRACT_ADDRESS || null });
});

app.get('/collection/:slug', async (req, res) => {
  const collection = await prisma.collection.findUnique({
    where: { slug: req.params.slug },
    include: { cards: true },
  });
  if (!collection) return res.status(404).json({ ok: false, error: 'Collection not found' });

  res.json({
    ok: true,
    collection: {
      name: collection.name,
      slug: collection.slug,
      cards: collection.cards.map((c) => ({
        slug: c.slug,
        serialDisplay: serialDisplay(c),
        status: c.status,
      })),
    },
  });
});

app.get('/collections', async (req, res) => {
  const collections = await prisma.collection.findMany({ include: { cards: true } });
  res.json({
    ok: true,
    collections: collections.map((col) => ({
      name: col.name,
      slug: col.slug,
      cardCount: col.cards.length,
    })),
  });
});

app.post('/collections', async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ ok: false, error: 'name is required' });
  }

  const slug = await uniqueSlug(name, (s) => prisma.collection.findUnique({ where: { slug: s } }));
  const collection = await prisma.collection.create({ data: { name: name.trim(), slug } });

  res.json({ ok: true, collection: { name: collection.name, slug: collection.slug } });
});

app.post('/collections/:slug/cards', async (req, res) => {
  const collection = await prisma.collection.findUnique({ where: { slug: req.params.slug } });
  if (!collection) return res.status(404).json({ ok: false, error: 'Collection not found' });

  const existingCount = await prisma.card.count({ where: { collectionId: collection.id } });
  const { editionSize } = req.body || {};

  let tokenId;
  try {
    if (DEMO_MODE) {
      const maxCard = await prisma.card.findFirst({ orderBy: { tokenId: 'desc' } });
      tokenId = (maxCard?.tokenId || 0) + 1;
    } else {
      tokenId = await chain.mintCard(1);
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }

  const cardSlug = await uniqueSlug(`${collection.slug}-${existingCount + 1}`, (s) =>
    prisma.card.findUnique({ where: { slug: s } })
  );

  const card = await prisma.card.create({
    data: {
      collectionId: collection.id,
      slug: cardSlug,
      tokenId,
      serialNumber: existingCount + 1,
      editionSize: editionSize || 99,
      status: 'UNCLAIMED',
    },
  });

  const version = await prisma.cardVersion.create({
    data: { cardId: card.id, versionNumber: 1, status: 'ACTIVE' },
  });
  await prisma.card.update({ where: { id: card.id }, data: { currentVersionId: version.id } });

  await prisma.ownershipHistory.create({
    data: { cardId: card.id, eventType: 'mint', notes: DEMO_MODE ? 'Demo mint' : 'Minted via studio' },
  });

  res.json({
    ok: true,
    card: { slug: card.slug, tokenId: String(card.tokenId), serialDisplay: serialDisplay(card) },
  });
});

app.get('/card/:slug', async (req, res) => {
  const card = await prisma.card.findUnique({
    where: { slug: req.params.slug },
    include: { collection: true, currentOwner: true },
  });
  if (!card) return res.status(404).json({ ok: false, error: 'Card not found' });

  let status = card.status;
  if (!DEMO_MODE) {
    try {
      status = await chain.deriveStatus(card.tokenId);
    } catch (e) {
      // chain unreachable: fall back to DB status
    }
  }

  res.json({
    ok: true,
    card: {
      slug: card.slug,
      tokenId: String(card.tokenId),
      collectionName: card.collection.name,
      serialNumber: card.serialNumber,
      serialDisplay: serialDisplay(card),
      status,
      image: card.image,
      ownerName: card.ownerName,
      ownerWallet: card.currentOwner?.walletAddress || null,
      chainOwner: card.chainOwner,
      chainSyncedAt: card.chainSyncedAt,
      claimedAt: card.claimedAt,
    },
  });
});

app.get('/card/:slug/history', async (req, res) => {
  const card = await prisma.card.findUnique({ where: { slug: req.params.slug } });
  if (!card) return res.status(404).json({ ok: false, error: 'Card not found' });

  const history = await prisma.ownershipHistory.findMany({
    where: { cardId: card.id },
    orderBy: { createdAt: 'asc' },
  });

  const userIds = [...new Set(history.flatMap((h) => [h.fromUserId, h.toUserId]).filter(Boolean))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const walletById = Object.fromEntries(users.map((u) => [u.id, u.walletAddress]));

  res.json({
    ok: true,
    history: history.map((h) => ({
      ...h,
      fromWallet: h.fromUserId ? walletById[h.fromUserId] || null : null,
      toWallet: h.toUserId ? walletById[h.toUserId] || null : null,
    })),
  });
});

app.post('/claim', async (req, res) => {
  const { cardSlug, userWallet, collectorName } = req.body || {};
  if (!cardSlug || !userWallet) {
    return res.status(400).json({ ok: false, error: 'cardSlug and userWallet are required' });
  }

  const card = await prisma.card.findUnique({ where: { slug: cardSlug } });
  if (!card) return res.status(404).json({ ok: false, error: 'Card not found' });
  if (card.status !== 'UNCLAIMED') {
    return res.status(400).json({ ok: false, error: 'Card already claimed' });
  }

  let txHash;
  try {
    txHash = DEMO_MODE ? `demo-${Date.now()}` : await chain.claimTo(userWallet, card.tokenId);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }

  const user = await prisma.user.upsert({
    where: { walletAddress: userWallet },
    update: {},
    create: { walletAddress: userWallet },
  });

  await prisma.card.update({
    where: { slug: cardSlug },
    data: {
      status: 'CLAIMED',
      currentOwnerUserId: user.id,
      ownerName: collectorName || null,
      claimedAt: new Date(),
      chainOwner: DEMO_MODE ? null : userWallet,
      chainSyncedAt: DEMO_MODE ? null : new Date(),
    },
  });

  await prisma.ownershipHistory.create({
    data: { cardId: card.id, toUserId: user.id, eventType: 'claim', txHash },
  });

  res.json({ ok: true, cardSlug, userWallet, txHash, status: 'CLAIMED' });
});

app.post('/chain/sync', async (req, res) => {
  if (DEMO_MODE) return res.status(403).json({ ok: false, error: 'Not available in demo mode' });
  try {
    const result = await syncFromChain(prisma);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/demo/reset', async (req, res) => {
  if (!DEMO_MODE) return res.status(403).json({ ok: false, error: 'Not in demo mode' });
  await resetDemoData(prisma);
  res.json({ ok: true });
});

app.post('/demo/cards/:slug/status', async (req, res) => {
  if (!DEMO_MODE) return res.status(403).json({ ok: false, error: 'Not in demo mode' });

  const { status } = req.body || {};
  const allowed = ['UNCLAIMED', 'CLAIMED', 'LOST', 'REPLACED'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ ok: false, error: `status must be one of ${allowed.join(', ')}` });
  }

  const card = await prisma.card
    .update({ where: { slug: req.params.slug }, data: { status } })
    .catch(() => null);
  if (!card) return res.status(404).json({ ok: false, error: 'Card not found' });

  res.json({ ok: true, card: { slug: card.slug, status: card.status } });
});

app.get('/demo/state', async (req, res) => {
  const collections = await prisma.collection.findMany({ include: { cards: true } });

  const data = await Promise.all(
    collections.map(async (col) => ({
      name: col.name,
      slug: col.slug,
      cards: await Promise.all(
        col.cards.map(async (c) => {
          let status = c.status;
          if (!DEMO_MODE) {
            try {
              status = await chain.deriveStatus(c.tokenId);
            } catch (e) {
              // chain unreachable: fall back to DB status
            }
          }
          return { slug: c.slug, status, serialDisplay: serialDisplay(c), chainOwner: c.chainOwner };
        })
      ),
    }))
  );

  res.json({ ok: true, demoMode: DEMO_MODE, collections: data });
});

app.listen(PORT, () => {
  console.log(`3Dshow API listening on http://localhost:${PORT} (DEMO_MODE=${DEMO_MODE})`);
});
