import type { ScoringSettings } from "@/types";

/**
 * Determina o vencedor de um placar: "home" | "away" | "draw"
 */
function winner(home: number, away: number): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/**
 * Calcula pontos de uma aposta de placar vs resultado real.
 *
 * Tabela de pontuação (padrão):
 * - Placar exato:                exactScore (20)
 * - Empate certo (não exato):    correctDraw (13)
 * - Vencedor certo + 1 gol:      correctWinnerOneScore (15)
 * - Vencedor certo:              correctWinner (10)
 * - Só 1 gol certo:              oneTeamScore (5)
 * - Nada:                        0
 */
export function calculatePoints(
  bet: { homeScore: number; awayScore: number },
  result: { homeScore: number; awayScore: number },
  s: ScoringSettings
): number {
  const { homeScore: bh, awayScore: ba } = bet;
  const { homeScore: rh, awayScore: ra } = result;

  // Placar exato
  if (bh === rh && ba === ra) return s.exactScore;

  const bw = winner(bh, ba);
  const rw = winner(rh, ra);
  const oneTeamHit = bh === rh || ba === ra;

  // Empate certo (mas não placar exato, senão cairia na primeira condição)
  if (bw === "draw" && rw === "draw") return s.correctDraw;

  // Vencedor certo
  if (bw === rw) {
    return oneTeamHit ? s.correctWinnerOneScore : s.correctWinner;
  }

  // Só um gol certo (vencedor errado ou um empate certo mas errou tudo mais)
  if (oneTeamHit) return s.oneTeamScore;

  return 0;
}

/**
 * Pontuação padrão do sistema
 */
export const defaultScoringSettings: Omit<ScoringSettings, "nominalDeadline"> = {
  exactScore: 20,
  correctWinnerOneScore: 15,
  correctWinner: 10,
  oneTeamScore: 5,
  correctDraw: 13,
  nominalBet: 50,
  lockMinutesBefore: 5,
};
