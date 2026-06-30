import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../lib/generated/prisma/client";
import {
  fetchWorldCupMatches,
  mapApiMatchToJogo,
  type JogoSeed,
} from "../lib/football-data";
import { fetchOpenfootballMatches } from "../lib/openfootball";
import { PONTUACAO_INICIA_EM } from "../lib/config";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function carregarJogos(): Promise<{ jogos: JogoSeed[]; fonte: string }> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (token) {
    try {
      const matches = await fetchWorldCupMatches(token);
      if (matches.length) {
        return { jogos: matches.map(mapApiMatchToJogo), fonte: "football-data" };
      }
      console.warn("football-data retornou vazio; tentando fallback openfootball.");
    } catch (e) {
      console.warn(
        "football-data falhou; tentando fallback openfootball:",
        (e as Error).message,
      );
    }
  } else {
    console.warn("FOOTBALL_DATA_TOKEN ausente; usando fallback openfootball.");
  }
  return { jogos: await fetchOpenfootballMatches(), fonte: "openfootball" };
}

// Corte: env explícito ou 1º kickoff da 2ª rodada de grupos.
function resolverCorte(jogos: JogoSeed[]): Date {
  if (PONTUACAO_INICIA_EM) return PONTUACAO_INICIA_EM;
  const rodada2 = jogos
    .filter((j) => j.fase === "grupos" && j.matchday === 2)
    .map((j) => j.kickoff.getTime());
  if (rodada2.length) return new Date(Math.min(...rodada2));
  throw new Error(
    "Não foi possível derivar o corte (sem rodada 2). Defina PONTUACAO_INICIA_EM no .env.",
  );
}

async function main() {
  const { jogos, fonte } = await carregarJogos();
  const corte = resolverCorte(jogos);
  console.log(`Fonte: ${fonte} — ${jogos.length} jogos.`);
  console.log(`Corte de pontuação: ${corte.toISOString()}`);

  let vale = 0;
  for (const j of jogos) {
    const valePontos = j.kickoff.getTime() >= corte.getTime();
    if (valePontos) vale++;
    const dados = {
      kickoff: j.kickoff,
      fase: j.fase,
      grupo: j.grupo,
      time1: j.time1,
      time2: j.time2,
      sigla1: j.sigla1,
      sigla2: j.sigla2,
      estadio: j.estadio,
      status: j.status,
      gols1: j.gols1,
      gols2: j.gols2,
      classificado: j.classificado,
      valePontos,
    };
    await prisma.jogo.upsert({
      where: { externalId: j.externalId },
      create: { externalId: j.externalId, ...dados },
      update: dados,
    });
  }

  const total = await prisma.jogo.count();
  console.log(
    `Seed de jogos OK — ${total} no banco (${vale} valem pontos, ${jogos.length - vale} não valem).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
