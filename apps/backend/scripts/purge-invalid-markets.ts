import { PrismaClient } from "@prisma/client";
import { backfillQueue } from "../src/server/jobs/queues";
import { getRedis } from "../src/lib/redis";

const prisma = new PrismaClient();

async function run() {
  console.log("Czyszczenie błędu CCXT (opcje i delivery)...");
  
  // 1. Usunięcie niepoprawnych rynków z bazy
  const res = await prisma.market.deleteMany({
    where: {
      symbol: {
        contains: "-"
      }
    }
  });
  console.log(`Usunięto ${res.count} niepoprawnych rynków z bazy danych.`);

  // 2. Twarde wyczyszczenie kolejki zadań Backfill
  console.log("Czyszczenie kolejki backfillQueue (BullMQ)...");
  await backfillQueue.obliterate({ force: true });
  console.log("Kolejka backfill wyczyszczona.");

  // 3. Usunięcie starych kluczy subskrypcji WebSocket z Redis
  console.log("Czyszczenie rejestru subskrypcji (deps:*)...");
  const redis = getRedis();
  const keys = await redis.keys("deps:*");
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`Usunięto ${keys.length} kluczy powiązań z Redis.`);
  }

  console.log("Gotowe. Serwer teraz zbuduje powiązania od zera tylko na liniowych perpetualach.");
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
