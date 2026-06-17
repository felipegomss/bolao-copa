import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { agendarApuracao } from "@/lib/apuracao";
import { chaveData, chaveHoje, rotuloData, horaBR, agoraMs } from "@/lib/datas";
import { calcularRanking } from "@/lib/ranking";
import { JogoCard, type PalpiteData } from "@/components/jogo-card";
import { AppShell } from "@/components/app-shell";
import { TabelaRanking } from "@/components/tabela-ranking";
import type { Resultado } from "@/lib/pontuacao";

export const dynamic = "force-dynamic";

export default async function JogosPage() {
  agendarApuracao();
  const session = await auth();
  const jogadorId = session?.user?.id ?? "";

  const [jogosRaw, palpitesRaw, ranking] = await Promise.all([
    prisma.jogo.findMany({ orderBy: { kickoff: "asc" } }),
    prisma.palpite.findMany({ where: { jogadorId } }),
    calcularRanking(),
  ]);

  const palpitePorJogo = new Map<string, PalpiteData>();
  for (const p of palpitesRaw) {
    palpitePorJogo.set(p.jogoId, {
      resultado: p.resultado as Resultado,
      ambasMarcam: p.ambasMarcam,
      overDoisMeio: p.overDoisMeio,
      placar1: p.placar1,
      placar2: p.placar2,
    });
  }

  const hoje = chaveHoje();
  const agora = agoraMs();

  // Só jogos que valem pontos (a partir do corte) e de hoje em diante.
  // Jogos pré-corte não são palpitáveis — aparecem no histórico.
  const jogos = jogosRaw.filter(
    (j) => j.valePontos && chaveData(j.kickoff) >= hoje,
  );

  // Agrupa por dia.
  const grupos = new Map<string, typeof jogos>();
  for (const j of jogos) {
    const k = chaveData(j.kickoff);
    const arr = grupos.get(k);
    if (arr) arr.push(j);
    else grupos.set(k, [j]);
  }

  // Jogos de HOJE que valem e ainda dá pra palpitar.
  const jogosHojeAbertos = jogos.filter(
    (j) => chaveData(j.kickoff) === hoje && j.kickoff.getTime() > agora,
  );
  const faltamHoje = jogosHojeAbertos.filter(
    (j) => !palpitePorJogo.has(j.id),
  ).length;
  const temJogoHoje = jogosHojeAbertos.length > 0;

  return (
    <AppShell aside={<TabelaRanking ranking={ranking} jogadorId={jogadorId} />}>
      <div className="flex flex-col gap-5 py-5">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">Jogos</h1>
        <p className="text-sm font-medium text-muted-foreground">
          E aí, {session?.user?.name}!
        </p>
      </header>

      <div
        className={
          faltamHoje > 0
            ? "rounded-[var(--radius-base)] border-[2.5px] border-border bg-accent px-4 py-3 text-sm font-extrabold text-accent-foreground shadow-[4px_4px_0_0_var(--brand-black)]"
            : "rounded-[var(--radius-base)] border-[2.5px] border-border bg-brand-green-dark px-4 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_0_var(--brand-black)]"
        }
      >
        {!temJogoHoje
          ? "Sem jogo valendo hoje. Já deixa os próximos palpitados! 👀"
          : faltamHoje > 0
            ? `Faltam ${faltamHoje} ${faltamHoje === 1 ? "jogo" : "jogos"} pra palpitar hoje!`
            : "Tudo palpitado por hoje. 👊"}
      </div>

      {jogos.length === 0 ? (
        <p className="rounded-[var(--radius-base)] border-2 border-dashed border-border bg-muted px-4 py-8 text-center text-sm font-bold text-muted-foreground">
          Nenhum jogo por vir. Confira o histórico e a tabela.
        </p>
      ) : (
        [...grupos.entries()].map(([k, jogosDoDia]) => (
          <section key={k} className="flex flex-col gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">
              {rotuloData(jogosDoDia[0].kickoff)}
              {k === hoje ? " · hoje" : ""}
            </h2>
            {jogosDoDia.map((j) => (
              <JogoCard
                key={j.id}
                serverNowMs={agora}
                jogo={{
                  id: j.id,
                  fase: j.fase,
                  grupo: j.grupo,
                  kickoffMs: j.kickoff.getTime(),
                  hora: horaBR(j.kickoff),
                  time1: j.time1,
                  time2: j.time2,
                  sigla1: j.sigla1,
                  sigla2: j.sigla2,
                }}
                palpite={palpitePorJogo.get(j.id) ?? null}
              />
            ))}
          </section>
        ))
      )}
      </div>
    </AppShell>
  );
}
