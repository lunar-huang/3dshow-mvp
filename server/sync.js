import * as chain from './chain.js';

async function upsertOwnerUser(prisma, address) {
  return prisma.user.upsert({
    where: { walletAddress: address },
    update: {},
    create: { walletAddress: address },
  });
}

async function createCardFromChain(prisma, collection, tokenId, owner, issuer) {
  const isUnclaimed = owner.toLowerCase() === issuer.toLowerCase();
  const status = isUnclaimed ? 'UNCLAIMED' : 'CLAIMED';

  const card = await prisma.card.create({
    data: {
      collectionId: collection.id,
      slug: `card-${tokenId}`,
      tokenId,
      serialNumber: tokenId,
      status,
      chainOwner: isUnclaimed ? null : owner,
      chainSyncedAt: new Date(),
    },
  });

  const version = await prisma.cardVersion.create({
    data: { cardId: card.id, versionNumber: 1, status: 'ACTIVE' },
  });
  await prisma.card.update({ where: { id: card.id }, data: { currentVersionId: version.id } });

  await prisma.ownershipHistory.create({
    data: { cardId: card.id, eventType: 'mint', notes: 'Discovered via chain sync' },
  });

  if (!isUnclaimed) {
    const user = await upsertOwnerUser(prisma, owner);
    await prisma.card.update({ where: { id: card.id }, data: { currentOwnerUserId: user.id } });
    await prisma.ownershipHistory.create({
      data: {
        cardId: card.id,
        toUserId: user.id,
        eventType: 'claim',
        notes: 'Already claimed on-chain, discovered via sync',
      },
    });
  }
}

async function reconcileExistingCard(prisma, card, owner, issuer) {
  const isUnclaimed = owner.toLowerCase() === issuer.toLowerCase();
  const status = isUnclaimed ? 'UNCLAIMED' : 'CLAIMED';
  const chainOwnerValue = isUnclaimed ? null : owner;

  const statusChanged = card.status !== status;
  const ownerChanged = (card.chainOwner || null) !== chainOwnerValue;

  if (!statusChanged && !ownerChanged) {
    await prisma.card.update({ where: { id: card.id }, data: { chainSyncedAt: new Date() } });
    return false;
  }

  let currentOwnerUserId = card.currentOwnerUserId;
  if (!isUnclaimed && ownerChanged) {
    const user = await upsertOwnerUser(prisma, owner);
    currentOwnerUserId = user.id;
    if (statusChanged) {
      await prisma.ownershipHistory.create({
        data: { cardId: card.id, toUserId: user.id, eventType: 'claim', notes: 'Reconciled from chain' },
      });
    }
  }

  await prisma.card.update({
    where: { id: card.id },
    data: {
      status,
      chainOwner: chainOwnerValue,
      chainSyncedAt: new Date(),
      currentOwnerUserId: isUnclaimed ? null : currentOwnerUserId,
      ...(isUnclaimed ? { claimedAt: null, ownerName: null } : {}),
    },
  });
  return true;
}

export async function syncFromChain(prisma) {
  const nextTokenId = await chain.getNextTokenId();
  const issuer = await chain.getIssuer();
  const collection = await prisma.collection.findFirst();
  if (!collection) return { created: 0, updated: 0, mintedOnChain: nextTokenId - 1 };

  let created = 0;
  let updated = 0;

  for (let tokenId = 1; tokenId < nextTokenId; tokenId++) {
    const owner = await chain.getOwner(tokenId);
    const card = await prisma.card.findUnique({ where: { tokenId } });

    if (!card) {
      await createCardFromChain(prisma, collection, tokenId, owner, issuer);
      created += 1;
    } else if (await reconcileExistingCard(prisma, card, owner, issuer)) {
      updated += 1;
    }
  }

  return { created, updated, mintedOnChain: nextTokenId - 1 };
}
