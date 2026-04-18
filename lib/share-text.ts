import type { Bet, Game } from "@/types";

/**
 * Gera texto de compartilhamento WhatsApp.
 * SOMENTE inclui apostas de jogos já terminados ou travados (não vaza palpites de jogos upcoming).
 */
export function generateShareText(
  userName: string,
  totalPoints: number,
  rank: number,
  bets: Bet[],
  games: Game[]
): string {
  // Mapeia jogos por id para lookup rápido
  const gamesById = new Map(games.map((g) => [g.id, g]));

  // Filtra apostas de jogos que NÃO são upcoming (não vaza palpites futuros)
  const revealedBets = bets
    .filter((bet) => {
      const game = gamesById.get(bet.gameId);
      return game && game.status !== "upcoming";
    })
    .sort((a, b) => {
      const ga = gamesById.get(a.gameId);
      const gb = gamesById.get(b.gameId);
      if (!ga || !gb) return 0;
      return ga.matchNumber - gb.matchNumber;
    });

  const header = [
    "⚽ *Bolão Copa do Mundo 2026* ⚽",
    `Meu desempenho: *${userName}*`,
    `🏆 Ranking: *${rank}º lugar* | Pontos: *${totalPoints}*`,
    "",
    "Minhas apostas (jogos encerrados):",
    "─────────────────────",
  ].join("\n");

  const betsText = revealedBets
    .map((bet) => {
      const game = gamesById.get(bet.gameId)!;
      const scoreStr = `${bet.homeScore} × ${bet.awayScore}`;
      const resultStr =
        game.homeScore !== null && game.awayScore !== null
          ? `(Real: ${game.homeScore}×${game.awayScore})`
          : "";
      const pointsStr = bet.points !== null ? `+${bet.points}pts` : "";
      const hitIcon =
        bet.points === null
          ? ""
          : bet.points >= 20
          ? "🎯"
          : bet.points >= 10
          ? "✅"
          : bet.points > 0
          ? "🟡"
          : "❌";

      return `${hitIcon} ${game.homeTeam} ${scoreStr} ${game.awayTeam} ${resultStr} ${pointsStr}`.trim();
    })
    .join("\n");

  const footer = [
    "─────────────────────",
    "Participe você também! 🔗",
    `${process.env.NEXT_PUBLIC_APP_URL ?? "https://bolao-copa-2026.vercel.app"}`,
  ].join("\n");

  return [header, betsText || "(Sem apostas encerradas ainda)", footer].join("\n");
}

/**
 * Abre WhatsApp com o texto formatado
 */
export function shareOnWhatsApp(text: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
