import { NextResponse } from "next/server";

import {
  fetchWorldCupMatches,
  fetchMatchById,
  type ApiMatch,
} from "@/lib/football-data";
import { processarMatch } from "@/lib/apuracao";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron manda Authorization: Bearer <CRON_SECRET>.
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Modo manual: ?secret=...
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "FOOTBALL_DATA_TOKEN ausente" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const forcarExternalId = url.searchParams.get("externalId");

  try {
    let matches: ApiMatch[];
    if (forcarExternalId) {
      // Força a atualização de um jogo específico (feed atrasado etc.).
      matches = [await fetchMatchById(token, forcarExternalId)];
    } else {
      // Sync completo: atualiza calendário (mata-mata etc.) e apura finalizados.
      matches = await fetchWorldCupMatches(token);
    }

    let palpitesAtualizados = 0;
    let jogosAtualizados = 0;
    for (const m of matches) {
      const r = await processarMatch(m);
      palpitesAtualizados += r.palpitesAtualizados;
      if (r.mudou) jogosAtualizados++;
    }

    return NextResponse.json({
      ok: true,
      modo: forcarExternalId ? "forcado" : "sync-completo",
      jogosProcessados: matches.length,
      jogosAtualizados,
      palpitesAtualizados,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 502 },
    );
  }
}
