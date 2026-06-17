import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { calcularPontos } from "@/lib/pontuacao";
import type { Resultado } from "@/lib/pontuacao";
import {
  fetchWorldCupMatches,
  mapApiMatchToJogo,
  type ApiMatch,
} from "@/lib/football-data";

// Tempo mínimo entre apurações on-access (respeita o rate limit do free tier).
const INTERVALO_MS = 90_000;

export type ApuracaoResultado = {
  externalId: string;
  status: string;
  palpitesAtualizados: number;
  pulado?: string;
};

// Atualiza o Jogo (placar/status/times) a partir de um match da API e,
// se encerrado, recalcula os pontos de todos os palpites daquele jogo.
export async function processarMatch(
  m: ApiMatch,
): Promise<ApuracaoResultado> {
  const dados = mapApiMatchToJogo(m);

  const jogo = await prisma.jogo.findUnique({
    where: { externalId: dados.externalId },
  });
  if (!jogo) {
    return {
      externalId: dados.externalId,
      status: dados.status,
      palpitesAtualizados: 0,
      pulado: "jogo não está no banco",
    };
  }

  // Atualiza dados do jogo (não mexe em valePontos, definido no seed).
  await prisma.jogo.update({
    where: { id: jogo.id },
    data: {
      kickoff: dados.kickoff,
      fase: dados.fase,
      grupo: dados.grupo,
      time1: dados.time1,
      time2: dados.time2,
      sigla1: dados.sigla1,
      sigla2: dados.sigla2,
      status: dados.status,
      gols1: dados.gols1,
      gols2: dados.gols2,
    },
  });

  // Só apura jogo encerrado com placar.
  if (dados.status !== "encerrado" || dados.gols1 == null || dados.gols2 == null) {
    return {
      externalId: dados.externalId,
      status: dados.status,
      palpitesAtualizados: 0,
      pulado: "ainda não encerrado",
    };
  }

  const palpites = await prisma.palpite.findMany({ where: { jogoId: jogo.id } });
  for (const p of palpites) {
    // Jogos que não valem pontos ficam com pontos = null (não contam).
    const pontos = jogo.valePontos
      ? calcularPontos(
          {
            resultado: p.resultado as Resultado,
            ambasMarcam: p.ambasMarcam,
            overDoisMeio: p.overDoisMeio,
            placar1: p.placar1,
            placar2: p.placar2,
          },
          dados.gols1,
          dados.gols2,
        ).total
      : null;
    await prisma.palpite.update({ where: { id: p.id }, data: { pontos } });
  }

  return {
    externalId: dados.externalId,
    status: dados.status,
    palpitesAtualizados: palpites.length,
  };
}

// Apura todos os jogos finalizados, mas só se: (a) houver jogo que já começou
// e ainda não foi encerrado, e (b) passou do INTERVALO desde a última apuração.
// Nunca lança — é chamada em background (after()).
export async function apurarSeNecessario(): Promise<void> {
  try {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) return;

    const agora = new Date();

    // (a) tem algo pra apurar? jogo que começou mas não está encerrado.
    const pendente = await prisma.jogo.findFirst({
      where: { status: { not: "encerrado" }, kickoff: { lt: agora } },
      select: { id: true },
    });
    if (!pendente) return;

    // (b) throttle entre instâncias serverless.
    const estado = await prisma.estadoApuracao.findUnique({
      where: { id: "singleton" },
    });
    if (
      estado &&
      agora.getTime() - estado.rodadaEm.getTime() < INTERVALO_MS
    ) {
      return;
    }

    // Marca a rodada ANTES de chamar a API (reduz corrida/estouro).
    await prisma.estadoApuracao.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", rodadaEm: agora },
      update: { rodadaEm: agora },
    });

    const matches = (await fetchWorldCupMatches(token)).filter(
      (m) => m.status === "FINISHED",
    );
    for (const m of matches) {
      await processarMatch(m);
    }
  } catch (e) {
    console.error("apurarSeNecessario falhou:", (e as Error).message);
  }
}

// Agenda a apuração pra rodar DEPOIS da resposta (não bloqueia a página).
// Chamar no topo das páginas (Server Components).
export function agendarApuracao(): void {
  after(apurarSeNecessario);
}
