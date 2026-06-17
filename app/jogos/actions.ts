"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Resultado } from "@/lib/pontuacao";

export type SalvarPalpiteInput = {
  jogoId: string;
  resultado: Resultado;
  ambasMarcam: boolean;
  overDoisMeio: boolean;
  placar1: number | null;
  placar2: number | null;
};

export type SalvarPalpiteResult = { ok: boolean; error?: string };

const RESULTADOS_VALIDOS: Resultado[] = ["time1", "empate", "time2"];

export async function salvarPalpite(
  input: SalvarPalpiteInput,
): Promise<SalvarPalpiteResult> {
  // jogadorId SEMPRE vem da sessão (server-side), nunca do cliente.
  const session = await auth();
  const jogadorId = session?.user?.id;
  if (!jogadorId) {
    return { ok: false, error: "Sessão expirada. Faça login de novo." };
  }

  if (!RESULTADOS_VALIDOS.includes(input.resultado)) {
    return { ok: false, error: "Palpite de resultado inválido." };
  }
  if (typeof input.ambasMarcam !== "boolean" || typeof input.overDoisMeio !== "boolean") {
    return { ok: false, error: "Preencha todos os mercados obrigatórios." };
  }

  // Placar exato é opcional, mas se preencher um, preenche os dois.
  const temPlacar = input.placar1 != null || input.placar2 != null;
  if (temPlacar) {
    const p1 = input.placar1;
    const p2 = input.placar2;
    if (p1 == null || p2 == null || !Number.isInteger(p1) || !Number.isInteger(p2) || p1 < 0 || p2 < 0 || p1 > 99 || p2 > 99) {
      return { ok: false, error: "Placar exato inválido." };
    }
  }

  const jogo = await prisma.jogo.findUnique({ where: { id: input.jogoId } });
  if (!jogo) {
    return { ok: false, error: "Jogo não encontrado." };
  }

  // Jogos pré-corte não valem pontos — não são palpitáveis.
  if (!jogo.valePontos) {
    return { ok: false, error: "Esse jogo não vale pontos no bolão." };
  }

  // TRAVA no servidor: só aceita enquanto agora < kickoff.
  if (Date.now() >= jogo.kickoff.getTime()) {
    return { ok: false, error: "Jogo já começou — palpites fechados." };
  }

  const dados = {
    resultado: input.resultado,
    ambasMarcam: input.ambasMarcam,
    overDoisMeio: input.overDoisMeio,
    placar1: temPlacar ? input.placar1 : null,
    placar2: temPlacar ? input.placar2 : null,
  };

  await prisma.palpite.upsert({
    where: { jogadorId_jogoId: { jogadorId, jogoId: input.jogoId } },
    create: { jogadorId, jogoId: input.jogoId, ...dados },
    update: dados,
  });

  revalidatePath("/jogos");
  return { ok: true };
}
