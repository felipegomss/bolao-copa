// Pesos dos mercados do bolão. Centralizado pra ficar fácil de ajustar.
export const PESOS = {
  resultado: 3, // acertar 1X2 (time1 / empate / time2)
  ambasMarcam: 2, // acertar ambas marcam (sim/não)
  overDoisMeio: 2, // acertar mais de 2.5 gols (sim/não)
  placarExato: 8, // acertar os dois números
  bonusJogoCheio: 3, // acertar os 3 obrigatórios no mesmo jogo
  bonusClassificacao: 3, // mata-mata: previu empate e acertou quem classifica
} as const;

export type Resultado = "time1" | "empate" | "time2";
export type Lado = "time1" | "time2";

export type PalpiteParaCalculo = {
  resultado: Resultado;
  ambasMarcam: boolean;
  overDoisMeio: boolean;
  placar1: number | null;
  placar2: number | null;
  classificado?: Lado | null; // quem o jogador acha que avança (palpite de empate)
};

export type DetalhePontos = {
  // pontos por mercado
  resultado: number;
  ambasMarcam: number;
  overDoisMeio: number;
  placarExato: number;
  bonus: number;
  classificacao: number;
  total: number;
  // flags de acerto (pra UI do histórico)
  acertouResultado: boolean;
  acertouAmbas: boolean;
  acertouOver: boolean;
  acertouPlacar: boolean;
  jogoCheio: boolean;
  acertouClassificacao: boolean;
};

export function resultadoReal(gols1: number, gols2: number): Resultado {
  if (gols1 > gols2) return "time1";
  if (gols1 < gols2) return "time2";
  return "empate";
}

// Calcula a pontuação de um palpite dado o placar final (bola rolando). Pura.
// classificadoReal = quem avançou no mata-mata (null nos jogos de grupo).
export function calcularPontos(
  p: PalpiteParaCalculo,
  gols1: number,
  gols2: number,
  classificadoReal: Lado | null = null,
): DetalhePontos {
  const real = resultadoReal(gols1, gols2);
  const ambasReal = gols1 > 0 && gols2 > 0;
  const overReal = gols1 + gols2 >= 3; // mais de 2.5

  const acertouResultado = p.resultado === real;
  const acertouAmbas = p.ambasMarcam === ambasReal;
  const acertouOver = p.overDoisMeio === overReal;
  const acertouPlacar =
    p.placar1 != null &&
    p.placar2 != null &&
    p.placar1 === gols1 &&
    p.placar2 === gols2;
  const jogoCheio = acertouResultado && acertouAmbas && acertouOver;

  // Bônus de classificação (mata-mata): acertar quem avança.
  // Se previu vitória, o classificado é o time que ele apontou pra vencer.
  // Se previu empate, é a escolha manual de quem passa nos pênaltis.
  const classificadoPalpitado: Lado | null =
    p.resultado === "time1"
      ? "time1"
      : p.resultado === "time2"
        ? "time2"
        : (p.classificado ?? null);
  const acertouClassificacao =
    classificadoReal != null && classificadoPalpitado === classificadoReal;

  const resultado = acertouResultado ? PESOS.resultado : 0;
  const ambasMarcam = acertouAmbas ? PESOS.ambasMarcam : 0;
  const overDoisMeio = acertouOver ? PESOS.overDoisMeio : 0;
  const placarExato = acertouPlacar ? PESOS.placarExato : 0;
  const bonus = jogoCheio ? PESOS.bonusJogoCheio : 0;
  const classificacao = acertouClassificacao ? PESOS.bonusClassificacao : 0;

  return {
    resultado,
    ambasMarcam,
    overDoisMeio,
    placarExato,
    bonus,
    classificacao,
    total:
      resultado +
      ambasMarcam +
      overDoisMeio +
      placarExato +
      bonus +
      classificacao,
    acertouResultado,
    acertouAmbas,
    acertouOver,
    acertouPlacar,
    jogoCheio,
    acertouClassificacao,
  };
}
