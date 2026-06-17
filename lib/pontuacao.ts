// Pesos dos mercados do bolão. Centralizado pra ficar fácil de ajustar.
export const PESOS = {
  resultado: 3, // acertar 1X2 (time1 / empate / time2)
  ambasMarcam: 2, // acertar ambas marcam (sim/não)
  overDoisMeio: 2, // acertar mais de 2.5 gols (sim/não)
  placarExato: 8, // acertar os dois números
  bonusJogoCheio: 3, // acertar os 3 obrigatórios no mesmo jogo
} as const;

export type Resultado = "time1" | "empate" | "time2";
