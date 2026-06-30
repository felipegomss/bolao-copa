// Fallback de CALENDÁRIO (domínio público, sem key). Atualizado ~1x/dia, então
// serve pro calendário, não pra resultado ao vivo. Sem TLAs nem ids estáveis:
// siglas são aproximadas e o externalId é sintético (prefixo "of:").
import type { JogoSeed } from "./football-data";

const URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

type OfMatch = {
  round: string;
  date: string; // "2026-06-11"
  time: string; // "13:00 UTC-6"
  team1: string;
  team2: string;
  score?: { ft?: [number, number] };
  group?: string; // "Group A"
  ground?: string;
};

function parseUtc(date: string, time: string): Date {
  const m = time.match(/(\d{1,2}):(\d{2})\s*UTC\s*([+-]\d{1,2})?/i);
  const [y, mo, d] = date.split("-").map(Number);
  if (!m) return new Date(`${date}T00:00:00Z`);
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const offset = m[3] ? Number(m[3]) : 0; // horário local = UTC + offset
  return new Date(Date.UTC(y, mo - 1, d, hh - offset, mm));
}

function faseFromRound(round: string): { fase: string; matchday: number | null } {
  const md = round.match(/matchday\s*(\d+)/i);
  if (md) return { fase: "grupos", matchday: Number(md[1]) };
  const r = round.toLowerCase();
  if (r.includes("round of 32")) return { fase: "16avos", matchday: null };
  if (r.includes("round of 16")) return { fase: "8avos", matchday: null };
  if (r.includes("quarter")) return { fase: "quartas", matchday: null };
  if (r.includes("semi")) return { fase: "semis", matchday: null };
  if (r.includes("third")) return { fase: "3lugar", matchday: null };
  if (r.includes("final")) return { fase: "final", matchday: null };
  return { fase: "grupos", matchday: null };
}

function sigla(name: string): string {
  return name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "?";
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function fetchOpenfootballMatches(): Promise<JogoSeed[]> {
  const res = await fetch(URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`openfootball ${res.status}`);
  const data = (await res.json()) as { matches?: OfMatch[] };
  const matches = data.matches ?? [];

  return matches.map((m) => {
    const { fase, matchday } = faseFromRound(m.round);
    const finished = Array.isArray(m.score?.ft);
    return {
      externalId: `of:${m.date}:${slug(m.team1)}-${slug(m.team2)}`,
      kickoff: parseUtc(m.date, m.time),
      fase,
      grupo: m.group?.replace(/group\s*/i, "").trim() || null,
      time1: m.team1,
      time2: m.team2,
      sigla1: sigla(m.team1),
      sigla2: sigla(m.team2),
      estadio: m.ground ?? null,
      status: finished ? "encerrado" : "agendado",
      gols1: finished ? m.score!.ft![0] : null,
      gols2: finished ? m.score!.ft![1] : null,
      classificado: null, // fallback não tem dado de quem classificou
      matchday,
    };
  });
}
