"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { bandeira } from "@/lib/bandeiras";
import { PESOS, type Resultado } from "@/lib/pontuacao";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { salvarPalpite } from "@/app/jogos/actions";

export type JogoCardData = {
  id: string;
  fase: string;
  grupo: string | null;
  kickoffMs: number;
  hora: string;
  time1: string;
  time2: string;
  sigla1: string;
  sigla2: string;
};

export type PalpiteData = {
  resultado: Resultado;
  ambasMarcam: boolean;
  overDoisMeio: boolean;
  placar1: number | null;
  placar2: number | null;
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

function dois(n: number) {
  return String(n).padStart(2, "0");
}

function formataCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSeg = Math.floor(ms / 1000);
  const dias = Math.floor(totalSeg / 86400);
  const h = Math.floor((totalSeg % 86400) / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  // Mais de 24h: mostra só os dias. Menos de 24h: contagem cheia HH:MM:SS.
  if (dias > 0) return `${dias}d`;
  return `${dois(h)}:${dois(m)}:${dois(s)}`;
}

export function JogoCard({
  jogo,
  palpite,
  serverNowMs,
}: {
  jogo: JogoCardData;
  palpite: PalpiteData;
  serverNowMs: number;
}) {
  const [nowMs, setNowMs] = useState(serverNowMs);
  const [resultado, setResultado] = useState<Resultado | null>(
    palpite?.resultado ?? null,
  );
  const [ambas, setAmbas] = useState<boolean | null>(
    palpite?.ambasMarcam ?? null,
  );
  const [over, setOver] = useState<boolean | null>(
    palpite?.overDoisMeio ?? null,
  );
  const [placar1, setPlacar1] = useState(
    palpite?.placar1 != null ? String(palpite.placar1) : "",
  );
  const [placar2, setPlacar2] = useState(
    palpite?.placar2 != null ? String(palpite.placar2) : "",
  );
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Countdown: tick a cada segundo (sincronização externa no mount).
  useMountEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  });

  const restante = jogo.kickoffMs - nowMs;
  const travado = restante <= 0;
  const urgente = !travado && restante < 60 * 60 * 1000; // fecha em menos de 1h
  const cabecalho = jogo.grupo
    ? `Grupo ${jogo.grupo}`
    : (FASE_LABEL[jogo.fase] ?? jogo.fase);

  const obrigatoriosOk = resultado != null && ambas != null && over != null;

  function handleSalvar() {
    setMsg(null);
    const p1 = placar1.trim() === "" ? null : Number(placar1);
    const p2 = placar2.trim() === "" ? null : Number(placar2);
    startTransition(async () => {
      const res = await salvarPalpite({
        jogoId: jogo.id,
        resultado: resultado as Resultado,
        ambasMarcam: ambas as boolean,
        overDoisMeio: over as boolean,
        placar1: p1,
        placar2: p2,
      });
      setMsg({
        ok: res.ok,
        texto: res.ok ? "Palpite salvo!" : (res.error ?? "Erro ao salvar."),
      });
    });
  }

  return (
    <article className="overflow-hidden rounded-[var(--radius-base)] border-[2.5px] border-border bg-card shadow-[4px_4px_0_0_var(--border)]">
      {/* Header */}
      <header
        className={cn(
          "flex items-center justify-between gap-2 border-b-[2.5px] border-border px-4 py-2.5",
          travado ? "bg-foreground text-background" : "bg-primary text-primary-foreground",
        )}
      >
        <span className="text-xs font-extrabold uppercase tracking-wide">
          {cabecalho}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-bold">
          {travado ? (
            <>
              <Lock className="size-3.5" aria-hidden /> PALPITES FECHADOS
            </>
          ) : (
            jogo.hora
          )}
        </span>
      </header>

      <div className="flex flex-col gap-4 p-4">
        {/* Times */}
        <div className="flex items-center justify-center gap-3 text-center">
          <Time sigla={jogo.sigla1} nome={jogo.time1} />
          <span className="text-sm font-extrabold text-muted-foreground">x</span>
          <Time sigla={jogo.sigla2} nome={jogo.time2} />
        </div>

        {/* Countdown */}
        {!travado ? (
          <p
            className={cn(
              "text-center text-sm font-bold",
              urgente ? "text-destructive" : "text-foreground",
            )}
          >
            <span className={urgente ? "" : "text-muted-foreground"}>
              fecha em{" "}
            </span>
            <span className="tabular-nums">{formataCountdown(restante)}</span>
            {urgente ? " ⏰" : ""}
          </p>
        ) : null}

        {travado ? (
          <PalpiteCarimbado palpite={palpite} jogo={jogo} />
        ) : (
          <>
            {/* Resultado */}
            <Mercado titulo="Quem vence?" peso={PESOS.resultado}>
              <Toggle
                ativo={resultado === "time1"}
                onClick={() => setResultado("time1")}
              >
                {jogo.sigla1}
              </Toggle>
              <Toggle
                ativo={resultado === "empate"}
                onClick={() => setResultado("empate")}
              >
                Empate
              </Toggle>
              <Toggle
                ativo={resultado === "time2"}
                onClick={() => setResultado("time2")}
              >
                {jogo.sigla2}
              </Toggle>
            </Mercado>

            {/* Ambas marcam */}
            <Mercado titulo="Ambas marcam?" peso={PESOS.ambasMarcam}>
              <Toggle ativo={ambas === true} onClick={() => setAmbas(true)}>
                Sim
              </Toggle>
              <Toggle ativo={ambas === false} onClick={() => setAmbas(false)}>
                Não
              </Toggle>
            </Mercado>

            {/* Over 2.5 */}
            <Mercado titulo="Mais de 2.5 gols?" peso={PESOS.overDoisMeio}>
              <Toggle ativo={over === true} onClick={() => setOver(true)}>
                Sim
              </Toggle>
              <Toggle ativo={over === false} onClick={() => setOver(false)}>
                Não
              </Toggle>
            </Mercado>

            {/* Placar exato */}
            <Mercado titulo="Placar exato (opcional)" peso={PESOS.placarExato} center>
              <PlacarInput
                aria-label={`Gols ${jogo.sigla1}`}
                value={placar1}
                onChange={setPlacar1}
              />
              <span className="px-1 text-lg font-extrabold text-muted-foreground">
                x
              </span>
              <PlacarInput
                aria-label={`Gols ${jogo.sigla2}`}
                value={placar2}
                onChange={setPlacar2}
              />
            </Mercado>

            {msg ? (
              <p
                role="status"
                className={cn(
                  "rounded-md border-2 border-border px-3 py-2 text-sm font-bold",
                  msg.ok
                    ? "bg-brand-green-dark text-white"
                    : "bg-destructive text-destructive-foreground",
                )}
              >
                {msg.texto}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleSalvar}
              disabled={!obrigatoriosOk || isPending}
              className={cn(
                "h-11 rounded-md border-2 border-border bg-secondary text-base font-extrabold text-secondary-foreground shadow-[3px_3px_0_0_var(--border)] transition-all",
                "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                "disabled:opacity-50 disabled:pointer-events-none",
              )}
            >
              {isPending
                ? "Salvando..."
                : palpite
                  ? "Atualizar palpite"
                  : "Salvar palpite"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function Time({ sigla, nome }: { sigla: string; nome: string }) {
  const flag = bandeira(sigla);
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className="flex size-12 items-center justify-center rounded-full border-[2.5px] border-border bg-secondary-background text-sm font-extrabold text-foreground">
        {sigla}
      </span>
      <span className="text-xs font-bold text-foreground">
        {flag ? `${flag} ${nome}` : nome}
      </span>
    </div>
  );
}

function Mercado({
  titulo,
  peso,
  center,
  children,
}: {
  titulo: string;
  peso: number;
  center?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">{titulo}</span>
        <span className="rounded border-2 border-border bg-accent px-1.5 py-0.5 text-xs font-extrabold text-accent-foreground">
          {`+${peso}`}
        </span>
      </div>
      <div
        className={cn(
          "flex items-center gap-2",
          center && "justify-center",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Toggle({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        "h-10 flex-1 rounded-md border-2 border-border text-sm font-bold transition-all",
        ativo
          ? "translate-x-[2px] translate-y-[2px] bg-main text-main-foreground shadow-none"
          : "bg-secondary-background text-foreground shadow-[2px_2px_0_0_var(--border)]",
      )}
    >
      {children}
    </button>
  );
}

function PlacarInput({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  "aria-label": string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={99}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-16 rounded-md border-2 border-border bg-secondary-background text-center text-xl font-extrabold text-foreground shadow-[2px_2px_0_0_var(--border)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      {...rest}
    />
  );
}

function PalpiteCarimbado({
  palpite,
  jogo,
}: {
  palpite: PalpiteData;
  jogo: JogoCardData;
}) {
  if (!palpite) {
    return (
      <p className="rounded-md border-2 border-dashed border-border bg-muted px-3 py-3 text-center text-sm font-bold text-muted-foreground">
        Você não palpitou neste jogo.
      </p>
    );
  }
  const resultadoLabel =
    palpite.resultado === "time1"
      ? jogo.sigla1
      : palpite.resultado === "time2"
        ? jogo.sigla2
        : "Empate";
  const temPlacar = palpite.placar1 != null && palpite.placar2 != null;
  return (
    <div className="flex flex-col gap-1.5 rounded-md border-2 border-border bg-muted px-3 py-3 text-sm">
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
        Seu palpite
      </p>
      <Linha rotulo="Quem vence" valor={resultadoLabel} />
      <Linha rotulo="Ambas marcam" valor={palpite.ambasMarcam ? "Sim" : "Não"} />
      <Linha rotulo="Mais de 2.5" valor={palpite.overDoisMeio ? "Sim" : "Não"} />
      {temPlacar ? (
        <Linha
          rotulo="Placar exato"
          valor={`${palpite.placar1} x ${palpite.placar2}`}
        />
      ) : null}
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between font-bold text-foreground">
      <span className="text-muted-foreground">{rotulo}</span>
      <span>{valor}</span>
    </div>
  );
}
