// Mapa da sigla FIFA (3 letras, vinda do football-data) -> ISO 3166-1 alpha-2,
// usado pra gerar a bandeira-emoji (par de regional indicators).
const ISO2: Record<string, string> = {
  ALG: "DZ", // Algeria
  ARG: "AR",
  AUS: "AU",
  AUT: "AT",
  BEL: "BE",
  BIH: "BA",
  BRA: "BR",
  CAN: "CA",
  CIV: "CI", // Ivory Coast
  COD: "CD", // Congo DR
  COL: "CO",
  CPV: "CV", // Cape Verde
  CRO: "HR",
  CUW: "CW", // Curaçao
  CZE: "CZ",
  ECU: "EC",
  EGY: "EG",
  ESP: "ES",
  FRA: "FR",
  GER: "DE",
  GHA: "GH",
  HAI: "HT",
  IRN: "IR",
  IRQ: "IQ",
  JOR: "JO",
  JPN: "JP",
  KOR: "KR",
  KSA: "SA", // Saudi Arabia
  MAR: "MA",
  MEX: "MX",
  NED: "NL",
  NOR: "NO",
  NZL: "NZ",
  PAN: "PA",
  PAR: "PY",
  POR: "PT",
  QAT: "QA",
  RSA: "ZA", // South Africa
  SEN: "SN",
  SUI: "CH",
  SWE: "SE",
  TUN: "TN",
  TUR: "TR",
  URU: "UY",
  URY: "UY",
  USA: "US",
  UZB: "UZ",
};

// Inglaterra e Escócia não têm ISO2 — usam emoji de subdivisão (tag sequence).
function subdivisao(code: string): string {
  return String.fromCodePoint(
    0x1f3f4,
    ...[...code].map((c) => 0xe0000 + c.charCodeAt(0)),
    0xe007f,
  );
}

const ESPECIAIS: Record<string, string> = {
  ENG: subdivisao("gbeng"),
  SCO: subdivisao("gbsct"),
};

function iso2ParaEmoji(iso2: string): string {
  return iso2.replace(/./g, (c) =>
    String.fromCodePoint(127397 + c.charCodeAt(0)),
  );
}

// Retorna a bandeira-emoji da sigla, ou "" se desconhecida (ex.: "?" do mata-mata).
export function bandeira(sigla: string): string {
  if (ESPECIAIS[sigla]) return ESPECIAIS[sigla];
  const iso = ISO2[sigla];
  return iso ? iso2ParaEmoji(iso) : "";
}
