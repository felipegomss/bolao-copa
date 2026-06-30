import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { bandeira } from "@/lib/bandeiras";
import {
  calcularPontos,
  resultadoReal,
  type Resultado,
  type Lado,
} from "@/lib/pontuacao";

export type HistoricoJogo = {
  id: string;
  fase: string;
  grupo: string | null;
  dataLabel: string;
  time1: string;
  time2: string;
  sigla1: string;
  sigla2: string;
  gols1: number;
  gols2: number;
  classificado: Lado | null;
  valePontos: boolean;
};

export type HistoricoPalpite = {
  resultado: Resultado;
  ambasMarcam: boolean;
  overDoisMeio: boolean;
  placar1: number | null;
  placar2: number | null;
  classificado: Lado | null;
} | null;

const FASE_LABEL: Record<string, string> = {
  grupos: "Fase de grupos",
  "16avos": "16-avos de final",
  "8avos": "Oitavas de final",
  quartas: "Quartas de final",
  semis: "Semifinal",
  "3lugar": "Disputa de 3º lugar",
  final: "Final",
};

export function HistoricoCard({
  jogo,
  palpite,
}: {
  jogo: HistoricoJogo;
  palpite: HistoricoPalpite;
}) {
  const cabecalho = jogo.grupo
    ? `Grupo ${jogo.grupo}`
    : (FASE_LABEL[jogo.fase] ?? jogo.fase);

  const real = resultadoReal(jogo.gols1, jogo.gols2);
  const detalhe =
    palpite && jogo.valePontos
      ? calcularPontos(palpite, jogo.gols1, jogo.gols2, jogo.classificado)
      : null;

  const resultadoRealLabel =
    real === "time1" ? jogo.sigla1 : real === "time2" ? jogo.sigla2 : "Empate";

  return (
    <article className="overflow-hidden rounded-[var(--radius-base)] border-[2.5px] border-border bg-card shadow-[4px_4px_0_0_var(--border)]">
      <header className="flex items-center justify-between gap-2 border-b-[2.5px] border-border bg-foreground px-4 py-2 text-background">
        <span className="text-xs font-extrabold uppercase tracking-wide">
          {cabecalho}
        </span>
        <span className="flex items-center gap-2 text-xs font-bold">
          {!jogo.valePontos ? (
            <span className="rounded border border-background/60 px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
              não valeu
            </span>
          ) : null}
          {jogo.dataLabel}
        </span>
      </header>

      <div className="flex flex-col gap-3 p-4">
        {/* Placar real */}
        <div className="flex items-center justify-center gap-3 text-center font-extrabold">
          <span className="flex-1 text-right text-foreground">
            {bandeira(jogo.sigla1)} {jogo.sigla1}
          </span>
          <span className="tabular-nums rounded-md border-2 border-border bg-secondary-background px-3 py-1 text-lg text-foreground">
            {jogo.gols1} <span className="text-muted-foreground">x</span>{" "}
            {jogo.gols2}
          </span>
          <span className="flex-1 text-left text-foreground">
            {bandeira(jogo.sigla2)} {jogo.sigla2}
          </span>
        </div>

        {!palpite ? (
          <p className="rounded-md border-2 border-dashed border-border bg-muted px-3 py-3 text-center text-sm font-bold text-muted-foreground">
            Você não palpitou — {jogo.valePontos ? "0 pts" : "não valeu"}.
          </p>
        ) : !detalhe ? (
          // Tem palpite mas o jogo não vale pontos.
          <div className="flex flex-col gap-1.5 rounded-md border-2 border-border bg-muted px-3 py-3 text-sm font-bold text-muted-foreground">
            <Linha rotulo="Quem vence" valor={palpiteResultadoLabel(palpite.resultado, jogo)} />
            <Linha rotulo="Ambas marcam" valor={palpite.ambasMarcam ? "Sim" : "Não"} />
            <Linha rotulo="Mais de 2.5" valor={palpite.overDoisMeio ? "Sim" : "Não"} />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Mercado
              rotulo="Quem vence"
              palpite={palpiteResultadoLabel(palpite.resultado, jogo)}
              certo={detalhe.acertouResultado}
              pts={detalhe.resultado}
            />
            <Mercado
              rotulo="Ambas marcam"
              palpite={palpite.ambasMarcam ? "Sim" : "Não"}
              certo={detalhe.acertouAmbas}
              pts={detalhe.ambasMarcam}
            />
            <Mercado
              rotulo="Mais de 2.5"
              palpite={palpite.overDoisMeio ? "Sim" : "Não"}
              certo={detalhe.acertouOver}
              pts={detalhe.overDoisMeio}
            />
            {palpite.placar1 != null && palpite.placar2 != null ? (
              <Mercado
                rotulo="Placar exato"
                palpite={`${palpite.placar1} x ${palpite.placar2}`}
                certo={detalhe.acertouPlacar}
                pts={detalhe.placarExato}
              />
            ) : null}
            {palpite.classificado ? (
              <Mercado
                rotulo="Quem classifica"
                palpite={
                  palpite.classificado === "time1" ? jogo.sigla1 : jogo.sigla2
                }
                certo={detalhe.acertouClassificacao}
                pts={detalhe.classificacao}
              />
            ) : null}
            {detalhe.jogoCheio ? (
              <div className="flex items-center justify-between rounded-md border-2 border-border bg-accent px-2.5 py-1.5 text-sm font-extrabold text-accent-foreground">
                <span>🔥 Jogo cheio!</span>
                <span>+{detalhe.bonus}</span>
              </div>
            ) : null}
            <div className="mt-1 flex items-center justify-between border-t-2 border-border pt-2 text-base font-extrabold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{detalhe.total} pts</span>
            </div>
          </div>
        )}

        {/* Resultado real resumido pra contexto */}
        <p className="text-center text-xs font-bold text-muted-foreground">
          Deu: {resultadoRealLabel}
        </p>
      </div>
    </article>
  );
}

function palpiteResultadoLabel(r: Resultado, jogo: HistoricoJogo): string {
  return r === "time1" ? jogo.sigla1 : r === "time2" ? jogo.sigla2 : "Empate";
}

function Mercado({
  rotulo,
  palpite,
  certo,
  pts,
}: {
  rotulo: string;
  palpite: string;
  certo: boolean;
  pts: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm font-bold">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="flex items-center gap-2">
        <span className="text-foreground">{palpite}</span>
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full border-2 border-border",
            certo ? "bg-brand-green-dark text-white" : "bg-destructive text-white",
          )}
          aria-label={certo ? "acertou" : "errou"}
        >
          {certo ? (
            <Check className="size-3" strokeWidth={3} />
          ) : (
            <X className="size-3" strokeWidth={3} />
          )}
        </span>
        <span className="w-7 text-right tabular-nums text-foreground">+{pts}</span>
      </span>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between text-foreground">
      <span className="text-muted-foreground">{rotulo}</span>
      <span>{valor}</span>
    </div>
  );
}
