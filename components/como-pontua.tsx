import { ChevronDown } from "lucide-react";

import { PESOS } from "@/lib/pontuacao";

const MERCADOS = [
  { nome: "Quem vence (1X2)", pts: PESOS.resultado },
  { nome: "Ambas marcam", pts: PESOS.ambasMarcam },
  { nome: "Mais de 2.5 gols", pts: PESOS.overDoisMeio },
  { nome: "Placar exato", pts: PESOS.placarExato },
  { nome: "🔥 Bônus jogo cheio", pts: PESOS.bonusJogoCheio },
];

const MAX =
  PESOS.resultado +
  PESOS.ambasMarcam +
  PESOS.overDoisMeio +
  PESOS.placarExato +
  PESOS.bonusJogoCheio;

export function ComoPontua({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-[var(--radius-base)] border-[2.5px] border-border bg-card shadow-[4px_4px_0_0_var(--brand-black)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-extrabold text-foreground [&::-webkit-details-marker]:hidden">
        Como funciona a pontuação
        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>

      <div className="flex flex-col gap-3 border-t-2 border-border px-4 py-3">
        <ul className="flex flex-col divide-y divide-border/40">
          {MERCADOS.map((m) => (
            <li
              key={m.nome}
              className="flex items-center justify-between py-1.5 text-sm font-bold text-foreground"
            >
              <span>{m.nome}</span>
              <span className="tabular-nums text-brand-green-dark">+{m.pts}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs font-medium leading-relaxed text-muted-foreground">
          Tudo <strong className="text-foreground">soma</strong> — cada mercado é
          independente. Errar dá <strong className="text-foreground">0</strong>,
          nunca negativo (pode chutar o placar à vontade). O{" "}
          <strong className="text-foreground">bônus jogo cheio</strong> sai quando
          você acerta os 3 obrigatórios no mesmo jogo: quem vence + ambas marcam +
          mais de 2.5. Máximo de{" "}
          <strong className="text-foreground">{MAX} pontos</strong> por jogo.
        </p>
      </div>
    </details>
  );
}
