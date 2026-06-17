// Configurações de regra do bolão.

// Corte de pontuação: jogos com kickoff ANTES disso não valem pontos
// (o bolão começa a valer na 2ª rodada da fase de grupos).
// Pode ser fixado via env PONTUACAO_INICIA_EM (ISO UTC). Se vazio, o seed
// deriva automaticamente do 1º jogo da 2ª rodada de grupos.
export const PONTUACAO_INICIA_EM: Date | null = process.env.PONTUACAO_INICIA_EM
  ? new Date(process.env.PONTUACAO_INICIA_EM)
  : null;

// Esconder no histórico os jogos que não valem pontos?
// false (padrão) = mostra marcados como "não valeu". true = oculta.
export const OCULTAR_JOGOS_SEM_PONTOS =
  process.env.OCULTAR_JOGOS_SEM_PONTOS === "true";
