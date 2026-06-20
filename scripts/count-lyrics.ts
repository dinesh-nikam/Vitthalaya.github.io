import { db } from '../src/db/client';

async function main() {
  const total = await db.composition.count();
  const verified = await db.composition.count({
    where: { reviewed: true }
  });
  const unverified = total - verified;
  
  console.log('--- DATABASE LYRICS COUNT ---');
  console.log(`Total Compositions in DB: ${total}`);
  console.log(`Verified/Reviewed Compositions: ${verified}`);
  console.log(`Unverified Compositions: ${unverified}`);
}

main().catch(console.error);
