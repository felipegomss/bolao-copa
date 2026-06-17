import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../lib/generated/prisma/client";

// Lista fixa de jogadores do bolão.
const JOGADORES = ["felipe", "angelim", "luan", "netinho", "ranieri"];

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const nome of JOGADORES) {
    await prisma.jogador.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }
  const total = await prisma.jogador.count();
  console.log(`Seed OK — ${total} jogadores no banco.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
