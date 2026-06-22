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

// --- Bilhete (desktop): salva vários palpites de uma vez ---

export type BilheteItem = { jogoId: string; placar1: number; placar2: number };
export type ConfirmarBilheteResult = {
  ok: boolean;
  salvos: number;
  erros: { jogoId: string; motivo: string }[];
};

export async function confirmarBilhete(
  itens: BilheteItem[],
): Promise<ConfirmarBilheteResult> {
  const session = await auth();
  const jogadorId = session?.user?.id;
  if (!jogadorId) {
    return {
      ok: false,
      salvos: 0,
      erros: itens.map((i) => ({ jogoId: i.jogoId, motivo: "Sessão expirada." })),
    };
  }
  if (!itens.length) return { ok: true, salvos: 0, erros: [] };

  const jogos = await prisma.jogo.findMany({
    where: { id: { in: itens.map((i) => i.jogoId) } },
  });
  const jogoById = new Map(jogos.map((j) => [j.id, j]));
  const agora = Date.now();
  const erros: { jogoId: string; motivo: string }[] = [];
  let salvos = 0;

  for (const it of itens) {
    const jogo = jogoById.get(it.jogoId);
    const p1 = it.placar1;
    const p2 = it.placar2;
    if (!jogo) {
      erros.push({ jogoId: it.jogoId, motivo: "Jogo não encontrado." });
      continue;
    }
    if (!jogo.valePontos) {
      erros.push({ jogoId: it.jogoId, motivo: "Não vale pontos." });
      continue;
    }
    if (agora >= jogo.kickoff.getTime()) {
      erros.push({ jogoId: it.jogoId, motivo: "Jogo já começou." });
      continue;
    }
    if (
      !Number.isInteger(p1) ||
      !Number.isInteger(p2) ||
      p1 < 0 ||
      p2 < 0 ||
      p1 > 99 ||
      p2 > 99
    ) {
      erros.push({ jogoId: it.jogoId, motivo: "Placar inválido." });
      continue;
    }
    const resultado: Resultado = p1 > p2 ? "time1" : p1 < p2 ? "time2" : "empate";
    const dados = {
      resultado,
      ambasMarcam: p1 > 0 && p2 > 0,
      overDoisMeio: p1 + p2 >= 3,
      placar1: p1,
      placar2: p2,
    };
    await prisma.palpite.upsert({
      where: { jogadorId_jogoId: { jogadorId, jogoId: it.jogoId } },
      create: { jogadorId, jogoId: it.jogoId, ...dados },
      update: dados,
    });
    salvos++;
  }

  revalidatePath("/jogos");
  return { ok: erros.length === 0, salvos, erros };
}
