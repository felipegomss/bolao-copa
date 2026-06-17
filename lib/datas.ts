// Helpers de data no fuso do Brasil (os jogadores são brasileiros).
const TZ = "America/Sao_Paulo";

// "2026-06-18" no fuso BR — usado pra agrupar/comparar dias.
export function chaveData(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// "qua, 18 de jun" — cabeçalho de grupo de jogos.
export function rotuloData(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(d);
}

// "16:00" no fuso BR.
export function horaBR(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function chaveHoje(): string {
  return chaveData(new Date());
}

// Timestamp do servidor no momento do request (Server Component).
export function agoraMs(): number {
  return Date.now();
}
