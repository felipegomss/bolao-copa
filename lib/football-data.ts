// Cliente da API football-data.org (free tier) para a Copa 2026 (código WC).
// Usado tanto pelo seed de jogos quanto pela apuração (Etapa 5).

const API = "https://api.football-data.org/v4";

export type ApiTeam = {
  id: number | null;
  name: string | null;
  tla: string | null;
};

export type ApiMatch = {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | ...
  matchday: number | null;
  stage: string; // GROUP_STAGE | LAST_32 | LAST_16 | QUARTER_FINALS | SEMI_FINALS | THIRD_PLACE | FINAL
  group: string | null; // "GROUP_A" ...
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    winner: string | null; // HOME_TEAM | AWAY_TEAM | DRAW | null
    duration?: string; // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
    fullTime: { home: number | null; away: number | null };
    regularTime?: { home: number | null; away: number | null } | null;
    extraTime?: { home: number | null; away: number | null } | null;
    penalties?: { home: number | null; away: number | null } | null;
  };
};

// Representação interna, pronta pra gravar em Jogo (sem o valePontos,
// que é calculado a partir do corte).
export type JogoSeed = {
  externalId: string;
  kickoff: Date;
  fase: string;
  grupo: string | null;
  time1: string;
  time2: string;
  sigla1: string;
  sigla2: string;
  estadio: string | null;
  status: "agendado" | "encerrado";
  gols1: number | null;
  gols2: number | null;
  classificado: "time1" | "time2" | null; // quem avançou (mata-mata)
  matchday: number | null; // transiente: só pra derivar o corte; não vai pro banco
};

const STAGE_TO_FASE: Record<string, string> = {
  GROUP_STAGE: "grupos",
  LAST_32: "16avos", // Copa de 48 seleções: rodada de 32 = 16-avos
  LAST_16: "8avos", // oitavas
  QUARTER_FINALS: "quartas",
  SEMI_FINALS: "semis",
  THIRD_PLACE: "3lugar",
  FINAL: "final",
};

export function faseFromStage(stage: string): string {
  return STAGE_TO_FASE[stage] ?? stage.toLowerCase();
}

export function grupoFromApi(group: string | null): string | null {
  if (!group) return null;
  const m = group.match(/([A-Z])\s*$/i); // "GROUP_A" -> "A"
  return m ? m[1].toUpperCase() : group;
}

export function statusFromApi(status: string): "agendado" | "encerrado" {
  return status === "FINISHED" ? "encerrado" : "agendado";
}

// Sigla de 3 letras quando a API não trouxe TLA (raro). Aproximação.
function siglaFallback(name: string | null): string {
  if (!name) return "?";
  return name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "?";
}

// Placar de BOLA ROLANDO (sem pênaltis). Se o jogo foi pra prorrogação/pênaltis,
// a API traz regularTime + extraTime separados; o fullTime soma os pênaltis.
function golsBolaRolando(m: ApiMatch): { home: number | null; away: number | null } {
  const s = m.score;
  if (s.regularTime && s.regularTime.home != null && s.regularTime.away != null) {
    return {
      home: s.regularTime.home + (s.extraTime?.home ?? 0),
      away: s.regularTime.away + (s.extraTime?.away ?? 0),
    };
  }
  return { home: s.fullTime.home, away: s.fullTime.away };
}

// Quem avançou no mata-mata, a partir do winner da API.
function classificadoDoMatch(m: ApiMatch): "time1" | "time2" | null {
  if (m.stage === "GROUP_STAGE") return null; // grupos não tem "classificado"
  if (m.score.winner === "HOME_TEAM") return "time1";
  if (m.score.winner === "AWAY_TEAM") return "time2";
  return null;
}

export function mapApiMatchToJogo(m: ApiMatch): JogoSeed {
  const finished = m.status === "FINISHED";
  const gols = finished ? golsBolaRolando(m) : { home: null, away: null };
  return {
    externalId: String(m.id),
    kickoff: new Date(m.utcDate),
    fase: faseFromStage(m.stage),
    grupo: grupoFromApi(m.group),
    // Mata-mata ainda indefinido vem com name null -> placeholder.
    time1: m.homeTeam.name ?? "A definir",
    time2: m.awayTeam.name ?? "A definir",
    sigla1: m.homeTeam.tla ?? siglaFallback(m.homeTeam.name),
    sigla2: m.awayTeam.tla ?? siglaFallback(m.awayTeam.name),
    estadio: null, // free tier não traz o estádio
    status: statusFromApi(m.status),
    gols1: gols.home,
    gols2: gols.away,
    classificado: finished ? classificadoDoMatch(m) : null,
    matchday: m.matchday,
  };
}

export async function fetchWorldCupMatches(token: string): Promise<ApiMatch[]> {
  const res = await fetch(`${API}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`football-data ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { matches?: ApiMatch[] };
  return data.matches ?? [];
}

// Busca um único jogo pelo externalId (id da partida) — usado na apuração.
export async function fetchMatchById(
  token: string,
  externalId: string,
): Promise<ApiMatch> {
  const res = await fetch(`${API}/matches/${externalId}`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`football-data ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as ApiMatch;
}
