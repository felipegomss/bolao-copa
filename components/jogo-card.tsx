"use client";

import { useState, useTransition } from "react";
import { Check, Lock, Pencil } from "lucide-react";

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
  proximo = false,
}: {
  jogo: JogoCardData;
  palpite: PalpiteData;
  serverNowMs: number;
  proximo?: boolean;
}) {
  const [nowMs, setNowMs] = useState(serverNowMs);
  const [salvoOk, setSalvoOk] = useState(false);
  // Já palpitou? Campos travados até clicar em "Editar palpite".
  const [editando, setEditando] = useState(false);
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
  // Sem palpite ainda OU clicou em editar -> formulário liberado.
  const editavel = !palpite || editando;
  // Placar completo -> os 3 mercados ficam derivados e travados.
  const temPlacar = placar1.trim() !== "" && placar2.trim() !== "";

  function handleSalvar() {
    setMsg(null);
    // Só conta o placar se os dois números estiverem preenchidos.
    const ambosPlacar = placar1.trim() !== "" && placar2.trim() !== "";
    const p1 = ambosPlacar ? Number(placar1) : null;
    const p2 = ambosPlacar ? Number(placar2) : null;
    startTransition(async () => {
      const res = await salvarPalpite({
        jogoId: jogo.id,
        resultado: resultado as Resultado,
        ambasMarcam: ambas as boolean,
        overDoisMeio: over as boolean,
        placar1: p1,
        placar2: p2,
      });
      if (res.ok) {
        setEditando(false); // volta pro modo travado (palpite carimbado)
        setSalvoOk(true);
        setTimeout(() => setSalvoOk(false), 2200);
      } else {
        setMsg({ ok: false, texto: res.error ?? "Erro ao salvar." });
      }
    });
  }

  function handleCancelar() {
    // Reverte aos valores salvos e tranca de novo.
    setResultado(palpite?.resultado ?? null);
    setAmbas(palpite?.ambasMarcam ?? null);
    setOver(palpite?.overDoisMeio ?? null);
    setPlacar1(palpite?.placar1 != null ? String(palpite.placar1) : "");
    setPlacar2(palpite?.placar2 != null ? String(palpite.placar2) : "");
    setMsg(null);
    setEditando(false);
  }

  // O placar já define os 3 obrigatórios — ao preenchê-lo, marca os toggles.
  function aplicarPlacar(p1str: string, p2str: string) {
    const p1 = p1str.trim() === "" ? null : Number(p1str);
    const p2 = p2str.trim() === "" ? null : Number(p2str);
    if (
      p1 == null ||
      p2 == null ||
      !Number.isInteger(p1) ||
      !Number.isInteger(p2) ||
      p1 < 0 ||
      p2 < 0
    ) {
      return;
    }
    setResultado(p1 > p2 ? "time1" : p1 < p2 ? "time2" : "empate");
    setAmbas(p1 > 0 && p2 > 0);
    setOver(p1 + p2 >= 3);
  }

  function handlePlacar1(v: string) {
    setPlacar1(v);
    aplicarPlacar(v, placar2);
  }

  function handlePlacar2(v: string) {
    setPlacar2(v);
    aplicarPlacar(placar1, v);
  }

  return (
    <article className="overflow-hidden rounded-[var(--radius-base)] border-[2.5px] border-border bg-card shadow-[4px_4px_0_0_var(--border)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
      {/* Header */}
      <header
        className={cn(
          "flex items-center justify-between gap-2 border-b-[2.5px] border-border px-4 py-2.5",
          travado ? "bg-foreground text-background" : "bg-primary text-primary-foreground",
        )}
      >
        <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
          {cabecalho}
          {proximo && !travado ? (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-extrabold text-secondary-foreground">
              PRÓXIMO
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-bold">
          {travado ? (
            <>
              <Lock className="size-3.5" aria-hidden /> PALPITES FECHADOS
            </>
          ) : (
            <>
              {palpite ? (
                <Check className="size-3.5" aria-label="já palpitado" strokeWidth={3} />
              ) : null}
              {jogo.hora}
            </>
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
        ) : !editavel ? (
          /* Já palpitou: campos travados, com botão pra liberar a edição. */
          <>
            {salvoOk ? (
              <p
                role="status"
                className="rounded-md border-2 border-border bg-brand-green-dark px-3 py-2 text-center text-sm font-bold text-white"
              >
                ✓ Palpite salvo!
              </p>
            ) : null}
            <PalpiteCarimbado palpite={palpite} jogo={jogo} />
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-md border-2 border-border bg-secondary-background text-base font-extrabold text-foreground shadow-[3px_3px_0_0_var(--border)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              <Pencil className="size-4" /> Editar palpite
            </button>
          </>
        ) : (
          <>
            {/* Placar exato em destaque — define os 3 mercados abaixo */}
            <Mercado titulo="Cravar o placar?" peso={PESOS.placarExato} center>
              <PlacarInput
                aria-label={`Gols ${jogo.sigla1}`}
                value={placar1}
                onChange={handlePlacar1}
              />
              <span className="px-1 text-lg font-extrabold text-muted-foreground">
                x
              </span>
              <PlacarInput
                aria-label={`Gols ${jogo.sigla2}`}
                value={placar2}
                onChange={handlePlacar2}
              />
            </Mercado>

            <p className="text-center text-xs font-bold text-muted-foreground">
              {temPlacar
                ? "🔒 mercados definidos pelo placar"
                : "sem cravar o placar? escolha na mão 👇"}
            </p>

            {/* Quem vence */}
            <Mercado titulo="Quem vence?" peso={PESOS.resultado}>
              <Toggle
                ativo={resultado === "time1"}
                travado={temPlacar}
                onClick={() => setResultado("time1")}
              >
                {jogo.sigla1}
              </Toggle>
              <Toggle
                ativo={resultado === "empate"}
                travado={temPlacar}
                onClick={() => setResultado("empate")}
              >
                Empate
              </Toggle>
              <Toggle
                ativo={resultado === "time2"}
                travado={temPlacar}
                onClick={() => setResultado("time2")}
              >
                {jogo.sigla2}
              </Toggle>
            </Mercado>

            {/* Ambas marcam */}
            <Mercado titulo="Ambas marcam?" peso={PESOS.ambasMarcam}>
              <Toggle
                ativo={ambas === true}
                travado={temPlacar}
                onClick={() => setAmbas(true)}
              >
                Sim
              </Toggle>
              <Toggle
                ativo={ambas === false}
                travado={temPlacar}
                onClick={() => setAmbas(false)}
              >
                Não
              </Toggle>
            </Mercado>

            {/* Over 2.5 */}
            <Mercado titulo="Mais de 2.5 gols?" peso={PESOS.overDoisMeio}>
              <Toggle
                ativo={over === true}
                travado={temPlacar}
                onClick={() => setOver(true)}
              >
                Sim
              </Toggle>
              <Toggle
                ativo={over === false}
                travado={temPlacar}
                onClick={() => setOver(false)}
              >
                Não
              </Toggle>
            </Mercado>

            {msg && !msg.ok ? (
              <p
                role="alert"
                className="rounded-md border-2 border-border bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground"
              >
                {msg.texto}
              </p>
            ) : null}

            <div className="flex gap-2">
              {editando ? (
                <button
                  type="button"
                  onClick={handleCancelar}
                  disabled={isPending}
                  className="flex h-11 flex-1 items-center justify-center rounded-md border-2 border-border bg-secondary-background text-base font-extrabold text-foreground shadow-[3px_3px_0_0_var(--border)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none"
                >
                  Cancelar
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSalvar}
                disabled={!obrigatoriosOk || isPending}
                className="flex h-11 flex-1 items-center justify-center rounded-md border-2 border-border bg-secondary text-base font-extrabold text-secondary-foreground shadow-[3px_3px_0_0_var(--border)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none"
              >
                {isPending
                  ? "Salvando..."
                  : palpite
                    ? "Atualizar palpite"
                    : "Salvar palpite"}
              </button>
            </div>
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
      <span
        className={cn(
          "flex size-12 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-border bg-secondary-background font-extrabold text-foreground",
          flag ? "text-[26px] leading-none" : "text-sm",
        )}
      >
        {flag || sigla}
      </span>
      <span className="text-xs font-bold text-foreground">
        {nome} - {sigla}
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
  travado = false,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  travado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      disabled={travado}
      className={cn(
        "h-10 flex-1 rounded-md border-2 border-border text-sm font-bold transition-all",
        ativo
          ? "translate-x-[2px] translate-y-[2px] bg-main text-main-foreground shadow-none"
          : "bg-secondary-background text-foreground shadow-[2px_2px_0_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        travado && "pointer-events-none",
        travado && !ativo && "opacity-40",
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
