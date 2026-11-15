import { PrismaClient } from '@prisma/client';
import { resetDemoData } from './demo-data.js';

const prisma = new PrismaClient();

resetDemoData(prisma)
  .then(() => console.log('Seeded demo data.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
