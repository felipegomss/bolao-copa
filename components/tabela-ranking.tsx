import { cn } from "@/lib/utils";
import type { LinhaRanking } from "@/lib/ranking";

const MEDALHAS = ["🥇", "🥈", "🥉"];
const PODIO_BG = ["bg-brand-yellow", "bg-[#d4d4d8]", "bg-[#e0a35f]"];

export function TabelaRanking({
  ranking,
  jogadorId,
}: {
  ranking: LinhaRanking[];
  jogadorId?: string;
}) {
  const temPontos = ranking.some((l) => l.palpitados > 0);

  return (
    <div className="overflow-hidden rounded-[var(--radius-base)] border-[2.5px] border-border bg-card shadow-[4px_4px_0_0_var(--border)]">
      <header className="flex items-center justify-between border-b-[2.5px] border-border bg-primary px-4 py-2.5 text-primary-foreground">
        <span className="text-sm font-extrabold uppercase tracking-wide">
          Tabela
        </span>
        <span className="text-xs font-bold opacity-90">Bolão da Copa</span>
      </header>

      {!temPontos ? (
        <p className="px-4 py-3 text-center text-xs font-bold text-muted-foreground">
          Ainda não rolou jogo valendo. Todo mundo começa zerado!
        </p>
      ) : null}

      <ol className="divide-y-2 divide-border">
        {ranking.map((l, i) => {
          const pos = i + 1;
          const lider = pos === 1 && temPontos;
          const podio = temPontos && pos <= 3;
          const eu = l.jogadorId === jogadorId;
          return (
            <li
              key={l.jogadorId}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5",
                lider && "bg-accent",
                eu && !lider && "bg-secondary-background",
              )}
            >
              {/* Posição */}
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-border text-sm font-extrabold",
                  podio
                    ? `${PODIO_BG[pos - 1]} text-brand-black`
                    : "bg-secondary-background text-foreground",
                )}
              >
                {pos}
              </span>

              {/* Nome + desempates */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 truncate text-base font-extrabold capitalize text-foreground">
                  {podio ? (
                    <span aria-hidden className="shrink-0">
                      {MEDALHAS[pos - 1]}
                    </span>
                  ) : null}
                  {l.nome}
                  {eu ? (
                    <span className="rounded border border-border px-1 text-[10px] font-bold uppercase text-muted-foreground">
                      você
                    </span>
                  ) : null}
                </span>
                <span className="text-[11px] font-bold text-muted-foreground">
                  placar {l.placaresExatos} · 1X2 {l.resultados} · cheio{" "}
                  {l.jogosCheios}
                </span>
              </div>

              {/* Pontos */}
              <span className="shrink-0 text-right">
                <span className="block text-xl font-extrabold tabular-nums text-foreground">
                  {l.pontos}
                </span>
                <span className="block text-[10px] font-bold uppercase text-muted-foreground">
                  pts
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
