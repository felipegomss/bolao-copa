"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Resultado, Lado } from "@/lib/pontuacao";

// --- Bilhete: salva vários palpites de uma vez ---

export type BilheteItem = {
  jogoId: string;
  placar1: number;
  placar2: number;
  classificado?: Lado | null; // só faz sentido em mata-mata com palpite de empate
};

export type ConfirmarBilheteResult = {
  ok: boolean;
  salvos: number;
  erros: { jogoId: string; motivo: string }[];
};

export async function confirmarBilhete(
  itens: BilheteItem[],
): Promise<ConfirmarBilheteResult> {
  // jogadorId SEMPRE vem da sessão (server-side), nunca do cliente.
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

    const resultado: Resultado =
      p1 > p2 ? "time1" : p1 < p2 ? "time2" : "empate";

    // "Quem classifica" só vale pra mata-mata e quando o palpite é empate.
    const ehMataMata = jogo.fase !== "grupos";
    const classificado =
      ehMataMata &&
      resultado === "empate" &&
      (it.classificado === "time1" || it.classificado === "time2")
        ? it.classificado
        : null;

    const dados = {
      resultado,
      ambasMarcam: p1 > 0 && p2 > 0,
      overDoisMeio: p1 + p2 >= 3,
      placar1: p1,
      placar2: p2,
      classificado,
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
