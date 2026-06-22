import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { agendarApuracao } from "@/lib/apuracao";
import { chaveData, chaveHoje, rotuloData, horaBR, agoraMs } from "@/lib/datas";
import { calcularRanking } from "@/lib/ranking";
import { AppShell } from "@/components/app-shell";
import { Bilhete, type JogoBilhete } from "@/components/bilhete";

export const dynamic = "force-dynamic";

const FASE_LABEL: Record<string, string> = {
  grupos: "Fase de grupos",
  "16avos": "16-avos de final",
  "8avos": "Oitavas de final",
  quartas: "Quartas de final",
  semis: "Semifinal",
  "3lugar": "Disputa de 3º lugar",
  final: "Final",
};

export default async function JogosPage() {
  agendarApuracao();
  const session = await auth();
  const jogadorId = session?.user?.id ?? "";

  const [jogosRaw, palpitesRaw, ranking] = await Promise.all([
    prisma.jogo.findMany({ orderBy: { kickoff: "asc" } }),
    prisma.palpite.findMany({ where: { jogadorId } }),
    calcularRanking(),
  ]);

  const palpitesSalvos: Record<string, { placar1: number; placar2: number }> =
    {};
  for (const p of palpitesRaw) {
    if (p.placar1 != null && p.placar2 != null) {
      palpitesSalvos[p.jogoId] = { placar1: p.placar1, placar2: p.placar2 };
    }
  }

  const hoje = chaveHoje();
  const agora = agoraMs();

  // Só jogos que valem pontos e ainda não começaram (dá pra palpitar).
  const jogos = jogosRaw.filter(
    (j) => j.valePontos && j.kickoff.getTime() > agora,
  );

  const jogosBilhete: JogoBilhete[] = jogos.map((j) => ({
    id: j.id,
    grupo: j.grupo,
    faseLabel: FASE_LABEL[j.fase] ?? j.fase,
    kickoffMs: j.kickoff.getTime(),
    hora: horaBR(j.kickoff),
    dataKey: chaveData(j.kickoff),
    dataLabel: rotuloData(j.kickoff),
    time1: j.time1,
    time2: j.time2,
    sigla1: j.sigla1,
    sigla2: j.sigla2,
  }));

  return (
    <AppShell wide>
      <div className="py-5">
        {jogos.length === 0 ? (
          <>
            <header className="mb-5">
              <h1 className="text-2xl font-extrabold text-foreground">Jogos</h1>
              <p className="text-sm font-medium text-muted-foreground">
                E aí, {session?.user?.name}!
              </p>
            </header>
            <p className="rounded-[var(--radius-base)] border-2 border-dashed border-border bg-muted px-4 py-8 text-center text-sm font-bold text-muted-foreground">
              Nenhum jogo por vir. Confira o histórico e a tabela.
            </p>
          </>
        ) : (
          <Bilhete
            jogos={jogosBilhete}
            palpitesSalvos={palpitesSalvos}
            ranking={ranking}
            jogadorId={jogadorId}
            serverNowMs={agora}
            hoje={hoje}
            nome={session?.user?.name ?? ""}
          />
        )}
      </div>
    </AppShell>
  );
}
