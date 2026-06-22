"use client";

import { type ReactNode, useState, useTransition } from "react";
import { Check, Lock, Receipt, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { bandeira } from "@/lib/bandeiras";
import { confirmarBilhete } from "@/app/jogos/actions";
import { TabelaRanking } from "@/components/tabela-ranking";
import { ComoPontua } from "@/components/como-pontua";
import type { LinhaRanking } from "@/lib/ranking";

export type JogoBilhete = {
  id: string;
  grupo: string | null;
  faseLabel: string;
  kickoffMs: number;
  hora: string;
  dataKey: string;
  dataLabel: string;
  time1: string;
  time2: string;
  sigla1: string;
  sigla2: string;
};

type Selecao = { p1: string; p2: string };
type ItemView = { jogo: JogoBilhete; p1: number; p2: number };

function valido(s: Selecao | undefined): s is Selecao {
  if (!s) return false;
  if (s.p1.trim() === "" || s.p2.trim() === "") return false;
  const a = Number(s.p1);
  const b = Number(s.p2);
  return (
    Number.isInteger(a) &&
    Number.isInteger(b) &&
    a >= 0 &&
    b >= 0 &&
    a <= 99 &&
    b <= 99
  );
}

function deriva(p1: number, p2: number, sigla1: string, sigla2: string) {
  return {
    resultado: p1 > p2 ? sigla1 : p1 < p2 ? sigla2 : "Empate",
    ambas: p1 > 0 && p2 > 0,
    over: p1 + p2 >= 3,
  };
}

export function Bilhete({
  jogos,
  palpitesSalvos,
  ranking,
  jogadorId,
  serverNowMs,
  hoje,
  nome,
}: {
  jogos: JogoBilhete[];
  palpitesSalvos: Record<string, { placar1: number; placar2: number }>;
  ranking: LinhaRanking[];
  jogadorId: string;
  serverNowMs: number;
  hoje: string;
  nome: string;
}) {
  const [selecoes, setSelecoes] = useState<Record<string, Selecao>>(() => {
    const init: Record<string, Selecao> = {};
    for (const [id, p] of Object.entries(palpitesSalvos)) {
      init[id] = { p1: String(p.placar1), p2: String(p.placar2) };
    }
    return init;
  });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [isPending, startTransition] = useTransition();

  function setPlacar(id: string, lado: "p1" | "p2", v: string) {
    setMsg(null);
    setSelecoes((prev) => {
      const atual = prev[id] ?? { p1: "", p2: "" };
      return { ...prev, [id]: { ...atual, [lado]: v } };
    });
  }

  function difereDoSalvo(id: string, s: Selecao): boolean {
    const sv = palpitesSalvos[id];
    return !sv || sv.placar1 !== Number(s.p1) || sv.placar2 !== Number(s.p2);
  }

  const pendentes = jogos.filter(
    (j) => valido(selecoes[j.id]) && difereDoSalvo(j.id, selecoes[j.id]),
  );
  const pendentesView: ItemView[] = pendentes.map((j) => ({
    jogo: j,
    p1: Number(selecoes[j.id]!.p1),
    p2: Number(selecoes[j.id]!.p2),
  }));
  const feitasView: ItemView[] = jogos
    .filter((j) => palpitesSalvos[j.id])
    .map((j) => ({
      jogo: j,
      p1: palpitesSalvos[j.id].placar1,
      p2: palpitesSalvos[j.id].placar2,
    }));

  function handleConfirmar() {
    setMsg(null);
    const payload = pendentes.map((j) => ({
      jogoId: j.id,
      placar1: Number(selecoes[j.id].p1),
      placar2: Number(selecoes[j.id].p2),
    }));
    startTransition(async () => {
      const res = await confirmarBilhete(payload);
      setMsg(
        res.ok
          ? {
              ok: true,
              texto: `${res.salvos} ${res.salvos === 1 ? "palpite confirmado" : "palpites confirmados"}!`,
            }
          : {
              ok: false,
              texto: `${res.salvos} salvos, ${res.erros.length} com erro.`,
            },
      );
    });
  }

  // Agrupa por dia (jogos já vêm ordenados).
  const grupos: { dataKey: string; dataLabel: string; jogos: JogoBilhete[] }[] =
    [];
  for (const j of jogos) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dataKey === j.dataKey) ultimo.jogos.push(j);
    else grupos.push({ dataKey: j.dataKey, dataLabel: j.dataLabel, jogos: [j] });
  }

  function estadoDoJogo(j: JogoBilhete) {
    const s = selecoes[j.id];
    const ok = valido(s);
    return {
      selecao: s,
      travado: serverNowMs >= j.kickoffMs,
      pendente: ok && difereDoSalvo(j.id, s),
      salvo: !!palpitesSalvos[j.id],
    };
  }

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold text-foreground">Jogos</h1>
        <p className="text-sm font-medium text-muted-foreground">
          E aí, {nome}! Monte seu bilhete e confirme.
        </p>
      </header>

      {/* ===================== DESKTOP ===================== */}
      <div className="hidden grid-cols-[minmax(0,1fr)_320px] gap-6 lg:grid">
        <div className="flex flex-col gap-5">
          {grupos.map((g) => (
            <section key={g.dataKey} className="flex flex-col gap-3">
              <h2 className="sticky top-0 z-10 -mx-2 border-b-2 border-border bg-background px-2 py-2 text-sm font-extrabold uppercase tracking-wide text-foreground">
                {g.dataLabel}
                {g.dataKey === hoje ? <PillHoje /> : null}
              </h2>
              {g.jogos.map((j) => (
                <LinhaJogo
                  key={j.id}
                  jogo={j}
                  {...estadoDoJogo(j)}
                  onChange={setPlacar}
                />
              ))}
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-5">
          <div className="sticky top-4 flex flex-col gap-5">
            <TabelaRanking ranking={ranking} jogadorId={jogadorId} />
            <div className="overflow-hidden rounded-[var(--radius-base)] border-[2.5px] border-border bg-card shadow-[4px_4px_0_0_var(--border)]">
              <header className="flex items-center gap-2 border-b-[2.5px] border-border bg-primary px-4 py-2.5 text-primary-foreground">
                <Receipt className="size-4" />
                <span className="text-sm font-extrabold uppercase tracking-wide">
                  Bilhete
                </span>
              </header>
              <BilheteConteudo
                pendentes={pendentesView}
                feitas={feitasView}
                isPending={isPending}
                msg={msg}
                onConfirmar={handleConfirmar}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===================== MOBILE ===================== */}
      <div className="lg:hidden">
        {pendentes.length > 0 ? (
          <div className="sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between gap-2 border-b-[2.5px] border-border bg-primary px-4 py-2.5 text-primary-foreground">
            <button
              type="button"
              onClick={() => setSheetAberto(true)}
              className="flex items-center gap-2 text-sm font-extrabold"
            >
              <Receipt className="size-4" /> Bilhete · {pendentes.length}{" "}
              {pendentes.length === 1 ? "pendente" : "pendentes"}
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={isPending}
              className="rounded-md border-2 border-border bg-secondary px-3 py-1.5 text-sm font-extrabold text-secondary-foreground shadow-[2px_2px_0_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
            >
              {isPending ? "..." : "Confirmar"}
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-5">
          {grupos.map((g) => (
            <section key={g.dataKey} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-foreground">
                {g.dataLabel}
                {g.dataKey === hoje ? <PillHoje /> : null}
              </h2>
              {g.jogos.map((j) => (
                <CardMobile
                  key={j.id}
                  jogo={j}
                  {...estadoDoJogo(j)}
                  onChange={setPlacar}
                />
              ))}
            </section>
          ))}
        </div>

        {msg ? (
          <p
            role="status"
            className={cn(
              "mt-4 rounded-md border-2 border-border px-3 py-2 text-center text-sm font-bold",
              msg.ok
                ? "bg-brand-green-dark text-white"
                : "bg-destructive text-destructive-foreground",
            )}
          >
            {msg.texto}
          </p>
        ) : null}

        {sheetAberto ? (
          <Sheet titulo="Bilhete" onFechar={() => setSheetAberto(false)}>
            <BilheteConteudo
              pendentes={pendentesView}
              feitas={feitasView}
              isPending={isPending}
              msg={msg}
              onConfirmar={handleConfirmar}
            />
          </Sheet>
        ) : null}
      </div>

      <div className="mt-6 max-w-[640px]">
        <ComoPontua />
      </div>
    </>
  );
}

function PillHoje() {
  return (
    <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-extrabold text-secondary-foreground">
      hoje
    </span>
  );
}

function ScoreInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={99}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-12 rounded-md border-2 border-border bg-secondary-background text-center text-lg font-extrabold text-foreground shadow-[2px_2px_0_0_var(--border)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border-2 border-border bg-secondary-background px-1.5 py-0.5 text-[11px] font-bold text-foreground">
      {children}
    </span>
  );
}

function StatusBadge({
  travado,
  pendente,
  salvo,
}: {
  travado: boolean;
  pendente: boolean;
  salvo: boolean;
}) {
  if (travado) return null;
  if (pendente)
    return (
      <span className="ml-auto rounded border-2 border-border bg-secondary px-1.5 py-0.5 text-[11px] font-extrabold text-secondary-foreground">
        no bilhete
      </span>
    );
  if (salvo)
    return (
      <span className="ml-auto flex items-center gap-1 rounded border-2 border-border bg-brand-green-dark px-1.5 py-0.5 text-[11px] font-extrabold text-white">
        <Check className="size-3" strokeWidth={3} /> salvo
      </span>
    );
  return null;
}

function CabecalhoJogo({
  jogo,
  travado,
}: {
  jogo: JogoBilhete;
  travado: boolean;
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-2 border-b-2 border-border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide",
        travado
          ? "bg-foreground text-background"
          : "bg-primary text-primary-foreground",
      )}
    >
      <span>{jogo.grupo ? `Grupo ${jogo.grupo}` : jogo.faseLabel}</span>
      <span className="flex items-center gap-1.5">
        {travado ? (
          <>
            <Lock className="size-3" /> fechado
          </>
        ) : (
          jogo.hora
        )}
      </span>
    </header>
  );
}

// Linha de jogo do desktop (formato largo, time | placar | time).
function LinhaJogo({
  jogo,
  selecao,
  travado,
  pendente,
  salvo,
  onChange,
}: {
  jogo: JogoBilhete;
  selecao: Selecao | undefined;
  travado: boolean;
  pendente: boolean;
  salvo: boolean;
  onChange: (id: string, lado: "p1" | "p2", v: string) => void;
}) {
  const ok = valido(selecao);
  const d =
    ok && selecao
      ? deriva(Number(selecao.p1), Number(selecao.p2), jogo.sigla1, jogo.sigla2)
      : null;

  return (
    <article className="overflow-hidden rounded-[var(--radius-base)] border-[2.5px] border-border bg-card shadow-[4px_4px_0_0_var(--border)]">
      <CabecalhoJogo jogo={jogo} travado={travado} />
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="flex flex-1 items-center justify-end gap-2 text-right text-sm font-bold text-foreground">
          {jogo.time1} <span className="text-base">{bandeira(jogo.sigla1)}</span>
        </span>
        {travado ? (
          <span className="text-lg font-extrabold tabular-nums text-foreground">
            {selecao ? `${selecao.p1} x ${selecao.p2}` : "– x –"}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <ScoreInput
              ariaLabel={`Gols ${jogo.sigla1}`}
              value={selecao?.p1 ?? ""}
              onChange={(v) => onChange(jogo.id, "p1", v)}
            />
            <span className="font-extrabold text-muted-foreground">x</span>
            <ScoreInput
              ariaLabel={`Gols ${jogo.sigla2}`}
              value={selecao?.p2 ?? ""}
              onChange={(v) => onChange(jogo.id, "p2", v)}
            />
          </span>
        )}
        <span className="flex flex-1 items-center gap-2 text-sm font-bold text-foreground">
          <span className="text-base">{bandeira(jogo.sigla2)}</span> {jogo.time2}
        </span>
      </div>
      {d ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t-2 border-border px-3 py-2">
          <Chip>vence {d.resultado}</Chip>
          <Chip>ambas {d.ambas ? "sim" : "não"}</Chip>
          <Chip>+2.5 {d.over ? "sim" : "não"}</Chip>
          <StatusBadge travado={travado} pendente={pendente} salvo={salvo} />
        </div>
      ) : null}
    </article>
  );
}

// Card de jogo do mobile (placar centralizado, siglas + bandeira).
function CardMobile({
  jogo,
  selecao,
  travado,
  pendente,
  salvo,
  onChange,
}: {
  jogo: JogoBilhete;
  selecao: Selecao | undefined;
  travado: boolean;
  pendente: boolean;
  salvo: boolean;
  onChange: (id: string, lado: "p1" | "p2", v: string) => void;
}) {
  const ok = valido(selecao);
  const d =
    ok && selecao
      ? deriva(Number(selecao.p1), Number(selecao.p2), jogo.sigla1, jogo.sigla2)
      : null;

  return (
    <article className="overflow-hidden rounded-[var(--radius-base)] border-[2.5px] border-border bg-card shadow-[4px_4px_0_0_var(--border)]">
      <CabecalhoJogo jogo={jogo} travado={travado} />
      <div className="flex items-center justify-center gap-3 px-3 py-3">
        <span className="flex flex-1 items-center justify-end gap-1.5 text-right text-sm font-extrabold text-foreground">
          {jogo.time1}{" "}
          <span className="text-xl leading-none">{bandeira(jogo.sigla1)}</span>
        </span>
        {travado ? (
          <span className="text-xl font-extrabold tabular-nums text-foreground">
            {selecao ? `${selecao.p1} x ${selecao.p2}` : "– x –"}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <ScoreInput
              ariaLabel={`Gols ${jogo.sigla1}`}
              value={selecao?.p1 ?? ""}
              onChange={(v) => onChange(jogo.id, "p1", v)}
            />
            <span className="font-extrabold text-muted-foreground">x</span>
            <ScoreInput
              ariaLabel={`Gols ${jogo.sigla2}`}
              value={selecao?.p2 ?? ""}
              onChange={(v) => onChange(jogo.id, "p2", v)}
            />
          </span>
        )}
        <span className="flex flex-1 items-center gap-1.5 text-sm font-extrabold text-foreground">
          <span className="text-xl leading-none">{bandeira(jogo.sigla2)}</span>{" "}
          {jogo.time2}
        </span>
      </div>
      {d ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t-2 border-border px-3 py-2">
          <Chip>vence {d.resultado}</Chip>
          <Chip>ambas {d.ambas ? "sim" : "não"}</Chip>
          <Chip>+2.5 {d.over ? "sim" : "não"}</Chip>
          <StatusBadge travado={travado} pendente={pendente} salvo={salvo} />
        </div>
      ) : null}
    </article>
  );
}

function Sheet({
  titulo,
  onFechar,
  children,
}: {
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-overlay"
      />
      <div className="relative flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[18px] border-t-[2.5px] border-border bg-card">
        <header className="flex items-center justify-between border-b-[2.5px] border-border bg-primary px-4 py-3 text-primary-foreground">
          <span className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide">
            <Receipt className="size-4" /> {titulo}
          </span>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onFechar}
            className="flex size-8 items-center justify-center rounded-md border-2 border-border bg-secondary-background text-foreground"
          >
            <X className="size-4" strokeWidth={3} />
          </button>
        </header>
        <div className="overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  );
}

function ItemLinha({ item, marcador }: { item: ItemView; marcador: ReactNode }) {
  const d = deriva(item.p1, item.p2, item.jogo.sigla1, item.jogo.sigla2);
  return (
    <li className="px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-sm font-extrabold text-foreground">
        <span>
          {item.jogo.sigla1} {item.p1} x {item.p2} {item.jogo.sigla2}
        </span>
        {marcador}
      </div>
      <p className="text-[11px] font-bold text-muted-foreground">
        vence {d.resultado} · ambas {d.ambas ? "sim" : "não"} · +2.5{" "}
        {d.over ? "sim" : "não"}
      </p>
    </li>
  );
}

function Aba({
  ativa,
  onClick,
  label,
  n,
}: {
  ativa: boolean;
  onClick: () => void;
  label: string;
  n: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 py-2.5 text-sm font-extrabold transition-colors",
        ativa
          ? "bg-secondary-background text-foreground"
          : "bg-card text-muted-foreground",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded border-2 border-border px-1.5 text-xs",
          ativa ? "bg-brand-yellow text-brand-black" : "bg-muted text-foreground",
        )}
      >
        {n}
      </span>
    </button>
  );
}

// Conteúdo do bilhete (abas + listas + confirmar). Usado no desktop e no sheet.
function BilheteConteudo({
  pendentes,
  feitas,
  isPending,
  msg,
  onConfirmar,
}: {
  pendentes: ItemView[];
  feitas: ItemView[];
  isPending: boolean;
  msg: { ok: boolean; texto: string } | null;
  onConfirmar: () => void;
}) {
  const [aba, setAba] = useState<"pendentes" | "feitas">("pendentes");

  return (
    <div>
      <div className="grid grid-cols-2 border-b-2 border-border">
        <Aba
          ativa={aba === "pendentes"}
          onClick={() => setAba("pendentes")}
          label="Pendentes"
          n={pendentes.length}
        />
        <Aba
          ativa={aba === "feitas"}
          onClick={() => setAba("feitas")}
          label="Feitas"
          n={feitas.length}
        />
      </div>

      {aba === "pendentes" ? (
        <>
          {pendentes.length === 0 ? (
            <p className="px-4 py-4 text-center text-xs font-bold text-muted-foreground">
              Preencha o placar dos jogos pra montar seu bilhete.
            </p>
          ) : (
            <ul className="max-h-[46dvh] divide-y-2 divide-border overflow-y-auto lg:max-h-[300px]">
              {pendentes.map((it) => (
                <ItemLinha
                  key={it.jogo.id}
                  item={it}
                  marcador={
                    <span
                      className="size-2 shrink-0 rounded-full bg-secondary"
                      aria-label="pendente"
                    />
                  }
                />
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2 border-t-2 border-border p-3">
            {msg ? (
              <p
                role="status"
                className={cn(
                  "rounded-md border-2 border-border px-3 py-2 text-center text-sm font-bold",
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
              onClick={onConfirmar}
              disabled={pendentes.length === 0 || isPending}
              className="flex h-11 items-center justify-center gap-2 rounded-md border-2 border-border bg-secondary text-base font-extrabold text-secondary-foreground shadow-[3px_3px_0_0_var(--border)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-50"
            >
              {isPending
                ? "Confirmando..."
                : pendentes.length > 0
                  ? `Confirmar bilhete (${pendentes.length})`
                  : "Nada pendente"}
            </button>
          </div>
        </>
      ) : feitas.length === 0 ? (
        <p className="px-4 py-4 text-center text-xs font-bold text-muted-foreground">
          Você ainda não confirmou nenhuma aposta.
        </p>
      ) : (
        <ul className="max-h-[60dvh] divide-y-2 divide-border overflow-y-auto lg:max-h-[380px]">
          {feitas.map((it) => (
            <ItemLinha
              key={it.jogo.id}
              item={it}
              marcador={
                <Check
                  className="size-3.5 shrink-0 text-brand-green-dark"
                  strokeWidth={3}
                  aria-label="confirmada"
                />
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
