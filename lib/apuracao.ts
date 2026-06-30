import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { calcularPontos } from "@/lib/pontuacao";
import type { Resultado, Lado } from "@/lib/pontuacao";
import {
  fetchWorldCupMatches,
  mapApiMatchToJogo,
  type ApiMatch,
} from "@/lib/football-data";

// Intervalos entre sincronizações on-access (respeita o rate limit do free tier).
const INTERVALO_VIVO = 90_000; // 1,5 min quando há jogo rolando
const INTERVALO_OCIOSO = 30 * 60_000; // 30 min sem jogo (só refresca calendário)

export type ApuracaoResultado = {
  externalId: string;
  status: string;
  mudou: boolean;
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
      mudou: false,
      palpitesAtualizados: 0,
      pulado: "jogo não está no banco",
    };
  }

  // Só escreve se o calendário/placar realmente mudou (evita writes à toa
  // no sync periódico). Pega o mata-mata quando a fonte define os times.
  const mudou =
    jogo.kickoff.getTime() !== dados.kickoff.getTime() ||
    jogo.fase !== dados.fase ||
    jogo.grupo !== dados.grupo ||
    jogo.time1 !== dados.time1 ||
    jogo.time2 !== dados.time2 ||
    jogo.sigla1 !== dados.sigla1 ||
    jogo.sigla2 !== dados.sigla2 ||
    jogo.status !== dados.status ||
    jogo.gols1 !== dados.gols1 ||
    jogo.gols2 !== dados.gols2 ||
    jogo.classificado !== dados.classificado;

  if (mudou) {
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
        classificado: dados.classificado,
      },
    });
  }

  // Apura só quando encerrado, com placar, e algo relevante mudou (placar ou
  // quem classificou) — assim não reescreve os pontos a cada sync.
  const golsMudou = jogo.gols1 !== dados.gols1 || jogo.gols2 !== dados.gols2;
  const classifMudou = jogo.classificado !== dados.classificado;
  if (
    dados.status !== "encerrado" ||
    dados.gols1 == null ||
    dados.gols2 == null ||
    !(golsMudou || classifMudou)
  ) {
    return {
      externalId: dados.externalId,
      status: dados.status,
      mudou,
      palpitesAtualizados: 0,
      pulado: "sem apuração",
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
            classificado: p.classificado as Lado | null,
          },
          dados.gols1,
          dados.gols2,
          dados.classificado,
        ).total
      : null;
    await prisma.palpite.update({ where: { id: p.id }, data: { pontos } });
  }

  return {
    externalId: dados.externalId,
    status: dados.status,
    mudou: true,
    palpitesAtualizados: palpites.length,
  };
}

// Sincroniza com a API: atualiza o calendário (times/horário/status — pega o
// mata-mata quando a fonte define) e apura os finalizados. Throttle dinâmico:
// rápido com jogo rolando, lento (30 min) ocioso. Nunca lança (roda em after()).
export async function apurarSeNecessario(): Promise<void> {
  try {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) return;

    const agora = new Date();

    // Tem jogo rolando (começou e não encerrou)? -> sincroniza mais rápido.
    const jogoVivo = await prisma.jogo.findFirst({
      where: { status: { not: "encerrado" }, kickoff: { lt: agora } },
      select: { id: true },
    });
    const intervalo = jogoVivo ? INTERVALO_VIVO : INTERVALO_OCIOSO;

    // Throttle entre instâncias serverless.
    const estado = await prisma.estadoApuracao.findUnique({
      where: { id: "singleton" },
    });
    if (estado && agora.getTime() - estado.rodadaEm.getTime() < intervalo) {
      return;
    }

    // Marca a rodada ANTES de chamar a API (reduz corrida/estouro).
    await prisma.estadoApuracao.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", rodadaEm: agora },
      update: { rodadaEm: agora },
    });

    // Processa TODOS os jogos (o processarMatch só escreve o que mudou).
    const matches = await fetchWorldCupMatches(token);
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
