export const demoCollection = {
  name: 'Singapore GP 2026',
  slug: 'singapore-gp-2026',
  editionSize: 99,
  cards: [
    { slug: 'test-card', serialNumber: 1, tokenId: 1 },
    { slug: 'sgp-002', serialNumber: 2, tokenId: 2 },
    { slug: 'sgp-003', serialNumber: 3, tokenId: 3 },
  ],
};

export async function resetDemoData(prisma) {
  await prisma.ownershipHistory.deleteMany();
  await prisma.cardVersion.deleteMany();
  await prisma.card.deleteMany();
  await prisma.user.deleteMany();
  await prisma.collection.deleteMany();

  const collection = await prisma.collection.create({
    data: { name: demoCollection.name, slug: demoCollection.slug },
  });

  for (const c of demoCollection.cards) {
    const card = await prisma.card.create({
      data: {
        collectionId: collection.id,
        slug: c.slug,
        tokenId: c.tokenId,
        serialNumber: c.serialNumber,
        editionSize: demoCollection.editionSize,
        image: '/front.svg',
        status: 'UNCLAIMED',
      },
    });

    const version = await prisma.cardVersion.create({
      data: { cardId: card.id, versionNumber: 1, status: 'ACTIVE' },
    });

    await prisma.card.update({
      where: { id: card.id },
      data: { currentVersionId: version.id },
    });

    await prisma.ownershipHistory.create({
      data: { cardId: card.id, eventType: 'mint', notes: 'Issuer mint (demo seed)' },
    });
  }
}
