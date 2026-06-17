import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { agendarApuracao } from "@/lib/apuracao";
import { agoraMs } from "@/lib/datas";
import { bandeira } from "@/lib/bandeiras";
import { calcularRanking } from "@/lib/ranking";
import { TabelaRanking } from "@/components/tabela-ranking";
import { ComoPontua } from "@/components/como-pontua";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function TabelaPage() {
  agendarApuracao();
  const session = await auth();
  const ranking = await calcularRanking();

  // Próximo jogo que vale + quem ainda não palpitou (pressão social 😅).
  const proximo = await prisma.jogo.findFirst({
    where: {
      valePontos: true,
      status: "agendado",
      kickoff: { gt: new Date(agoraMs()) },
    },
    orderBy: { kickoff: "asc" },
  });
  let pendentes: string[] = [];
  if (proximo) {
    const palps = await prisma.palpite.findMany({
      where: { jogoId: proximo.id },
      select: { jogadorId: true },
    });
    const fez = new Set(palps.map((p) => p.jogadorId));
    pendentes = ranking.filter((r) => !fez.has(r.jogadorId)).map((r) => r.nome);
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-5 py-5">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">Tabela</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Ranking do bolão e os critérios de desempate.
        </p>
      </header>

      <TabelaRanking ranking={ranking} jogadorId={session?.user?.id} />

      {proximo ? (
        <div className="rounded-[var(--radius-base)] border-[2.5px] border-border bg-card p-4 shadow-[4px_4px_0_0_var(--border)]">
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            Próximo jogo · {bandeira(proximo.sigla1)} {proximo.sigla1} ×{" "}
            {bandeira(proximo.sigla2)} {proximo.sigla2}
          </p>
          {pendentes.length === 0 ? (
            <p className="mt-1 text-sm font-extrabold text-brand-green-dark">
              Todo mundo já palpitou! 🎯
            </p>
          ) : (
            <p className="mt-1 text-sm font-bold capitalize text-foreground">
              Faltam palpitar: {pendentes.join(", ")}
            </p>
          )}
        </div>
      ) : null}

      <p className="text-xs font-medium text-muted-foreground">
        Desempate: pontos → placares exatos → resultados (1X2) → jogos cheios →
        nome.
      </p>

      <ComoPontua defaultOpen />
      </div>
    </AppShell>
  );
}
