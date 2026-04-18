import { describe, it, expect } from "vitest";
import { generateShareText } from "./share-text";
import type { Bet, Game } from "@/types";
import { Timestamp } from "firebase/firestore";

const makeTimestamp = (d: string) => Timestamp.fromDate(new Date(d));

const games: Game[] = [
  {
    id: "GS01",
    matchNumber: 1,
    phase: "Fase de Grupos",
    group: "A",
    homeTeam: "México",
    awayTeam: "Holanda",
    homeFlag: "🇲🇽",
    awayFlag: "🇳🇱",
    date: makeTimestamp("2026-06-11T20:00:00Z"),
    venue: "SoFi Stadium",
    city: "Los Angeles",
    country: "EUA",
    homeScore: 1,
    awayScore: 2,
    status: "finished",
  },
  {
    id: "GS02",
    matchNumber: 2,
    phase: "Fase de Grupos",
    group: "A",
    homeTeam: "Brasil",
    awayTeam: "Argentina",
    homeFlag: "🇧🇷",
    awayFlag: "🇦🇷",
    date: makeTimestamp("2026-06-12T00:00:00Z"),
    venue: "MetLife Stadium",
    city: "Nova York",
    country: "EUA",
    homeScore: null,
    awayScore: null,
    status: "upcoming",
  },
  {
    id: "GS03",
    matchNumber: 3,
    phase: "Fase de Grupos",
    group: "B",
    homeTeam: "Portugal",
    awayTeam: "Espanha",
    homeFlag: "🇵🇹",
    awayFlag: "🇪🇸",
    date: makeTimestamp("2026-06-12T23:00:00Z"),
    venue: "AT&T Stadium",
    city: "Dallas",
    country: "EUA",
    homeScore: null,
    awayScore: null,
    status: "locked",
  },
];

const bets: Bet[] = [
  {
    id: "user1_GS01",
    userId: "user1",
    gameId: "GS01",
    homeScore: 1,
    awayScore: 2,
    points: 20,
    createdAt: makeTimestamp("2026-06-10T10:00:00Z"),
    updatedAt: makeTimestamp("2026-06-10T10:00:00Z"),
  },
  {
    id: "user1_GS02",
    userId: "user1",
    gameId: "GS02",
    homeScore: 2,
    awayScore: 1,
    points: null,
    createdAt: makeTimestamp("2026-06-11T10:00:00Z"),
    updatedAt: makeTimestamp("2026-06-11T10:00:00Z"),
  },
  {
    id: "user1_GS03",
    userId: "user1",
    gameId: "GS03",
    homeScore: 1,
    awayScore: 1,
    points: null,
    createdAt: makeTimestamp("2026-06-11T10:00:00Z"),
    updatedAt: makeTimestamp("2026-06-11T10:00:00Z"),
  },
];

describe("generateShareText", () => {
  it("não inclui apostas de jogos upcoming", () => {
    const text = generateShareText("João", 20, 1, bets, games);

    // GS02 está upcoming — não deve aparecer
    expect(text).not.toContain("Brasil");
    expect(text).not.toContain("Argentina");
  });

  it("inclui apostas de jogos finished", () => {
    const text = generateShareText("João", 20, 1, bets, games);
    expect(text).toContain("México");
    expect(text).toContain("Holanda");
  });

  it("inclui apostas de jogos locked (já travados)", () => {
    const text = generateShareText("João", 20, 1, bets, games);
    expect(text).toContain("Portugal");
    expect(text).toContain("Espanha");
  });

  it("inclui nome do usuário e pontuação", () => {
    const text = generateShareText("Maria", 45, 3, bets, games);
    expect(text).toContain("Maria");
    expect(text).toContain("45");
    expect(text).toContain("3º lugar");
  });

  it("retorna mensagem de fallback quando não há apostas reveladas", () => {
    const upcomingOnly = bets.filter((b) => b.gameId === "GS02");
    const gamesWithOnlyUpcoming = [games[1]];
    const text = generateShareText("João", 0, 10, upcomingOnly, gamesWithOnlyUpcoming);
    expect(text).toContain("Sem apostas encerradas");
  });
});
