import { prisma } from "@/lib/prisma";
import { calcularPontos, type Resultado } from "@/lib/pontuacao";

export type LinhaRanking = {
  jogadorId: string;
  nome: string;
  pontos: number;
  placaresExatos: number;
  resultados: number;
  jogosCheios: number;
  palpitados: number;
};

// Monta o ranking do bolão. Conta os critérios de desempate recalculando
// cada palpite com a função pura (consistente com o pontos gravado).
export async function calcularRanking(): Promise<LinhaRanking[]> {
  const [jogadores, jogos] = await Promise.all([
    prisma.jogador.findMany(),
    prisma.jogo.findMany({
      where: {
        status: "encerrado",
        valePontos: true,
        gols1: { not: null },
        gols2: { not: null },
      },
    }),
  ]);

  const jogoById = new Map(jogos.map((j) => [j.id, j]));
  const palpites = await prisma.palpite.findMany({
    where: { jogoId: { in: jogos.map((j) => j.id) } },
  });

  const linhas = new Map<string, LinhaRanking>();
  for (const j of jogadores) {
    linhas.set(j.id, {
      jogadorId: j.id,
      nome: j.nome,
      pontos: 0,
      placaresExatos: 0,
      resultados: 0,
      jogosCheios: 0,
      palpitados: 0,
    });
  }

  for (const p of palpites) {
    const jogo = jogoById.get(p.jogoId);
    const linha = linhas.get(p.jogadorId);
    if (!jogo || !linha || jogo.gols1 == null || jogo.gols2 == null) continue;

    const d = calcularPontos(
      {
        resultado: p.resultado as Resultado,
        ambasMarcam: p.ambasMarcam,
        overDoisMeio: p.overDoisMeio,
        placar1: p.placar1,
        placar2: p.placar2,
      },
      jogo.gols1,
      jogo.gols2,
    );

    linha.pontos += d.total;
    if (d.acertouPlacar) linha.placaresExatos++;
    if (d.acertouResultado) linha.resultados++;
    if (d.jogoCheio) linha.jogosCheios++;
    linha.palpitados++;
  }

  return [...linhas.values()].sort(compararRanking);
}

// Critérios de desempate, nesta ordem:
// 1) pontos  2) placares exatos  3) resultados  4) jogos cheios  5) nome (asc)
export function compararRanking(a: LinhaRanking, b: LinhaRanking): number {
  return (
    b.pontos - a.pontos ||
    b.placaresExatos - a.placaresExatos ||
    b.resultados - a.resultados ||
    b.jogosCheios - a.jogosCheios ||
    a.nome.localeCompare(b.nome, "pt-BR")
  );
}
