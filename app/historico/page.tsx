import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rotuloData, horaBR } from "@/lib/datas";
import { OCULTAR_JOGOS_SEM_PONTOS } from "@/lib/config";
import {
  HistoricoCard,
  type HistoricoPalpite,
} from "@/components/historico-card";
import type { Resultado } from "@/lib/pontuacao";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  const session = await auth();
  const jogadorId = session?.user?.id ?? "";

  const jogos = await prisma.jogo.findMany({
    where: {
      status: "encerrado",
      gols1: { not: null },
      gols2: { not: null },
      ...(OCULTAR_JOGOS_SEM_PONTOS ? { valePontos: true } : {}),
    },
    orderBy: { kickoff: "desc" },
  });

  const palpites = await prisma.palpite.findMany({
    where: { jogadorId, jogoId: { in: jogos.map((j) => j.id) } },
  });
  const palpitePorJogo = new Map<string, HistoricoPalpite>();
  for (const p of palpites) {
    palpitePorJogo.set(p.jogoId, {
      resultado: p.resultado as Resultado,
      ambasMarcam: p.ambasMarcam,
      overDoisMeio: p.overDoisMeio,
      placar1: p.placar1,
      placar2: p.placar2,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col gap-5 px-4 py-5">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">Histórico</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Jogos encerrados, seu palpite e os pontos.
        </p>
      </header>

      {jogos.length === 0 ? (
        <p className="rounded-[var(--radius-base)] border-2 border-dashed border-border bg-muted px-4 py-8 text-center text-sm font-bold text-muted-foreground">
          Nenhum jogo encerrado ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {jogos.map((j) => (
            <HistoricoCard
              key={j.id}
              jogo={{
                id: j.id,
                fase: j.fase,
                grupo: j.grupo,
                dataLabel: `${rotuloData(j.kickoff)} · ${horaBR(j.kickoff)}`,
                time1: j.time1,
                time2: j.time2,
                sigla1: j.sigla1,
                sigla2: j.sigla2,
                gols1: j.gols1!,
                gols2: j.gols2!,
                valePontos: j.valePontos,
              }}
              palpite={palpitePorJogo.get(j.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
