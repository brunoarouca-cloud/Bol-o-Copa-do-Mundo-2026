import { describe, it, expect } from "vitest";
import { calculatePoints } from "./scoring";
import type { ScoringSettings } from "@/types";
import { Timestamp } from "firebase/firestore";

// Settings de teste com valores padrão
const mockSettings: ScoringSettings = {
  exactScore: 20,
  correctWinnerOneScore: 15,
  correctWinner: 10,
  oneTeamScore: 5,
  correctDraw: 13,
  nominalBet: 50,
  lockMinutesBefore: 5,
  nominalDeadline: Timestamp.fromDate(new Date("2026-06-13T02:59:00Z")),
};

describe("calculatePoints", () => {
  it("retorna exactScore quando o placar é exato", () => {
    expect(
      calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 }, mockSettings)
    ).toBe(20);
  });

  it("retorna exactScore para empate exato (0-0)", () => {
    expect(
      calculatePoints({ homeScore: 0, awayScore: 0 }, { homeScore: 0, awayScore: 0 }, mockSettings)
    ).toBe(20);
  });

  it("retorna correctDraw quando acertou o empate mas não o placar", () => {
    expect(
      calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 2, awayScore: 2 }, mockSettings)
    ).toBe(13);
  });

  it("retorna correctWinnerOneScore quando acertou o vencedor e um dos gols", () => {
    // Apostou 2-0, resultado 2-1 — acertou o vencedor (casa) e o gol do time da casa
    expect(
      calculatePoints({ homeScore: 2, awayScore: 0 }, { homeScore: 2, awayScore: 1 }, mockSettings)
    ).toBe(15);
  });

  it("retorna correctWinnerOneScore quando acertou vencedor e gol do visitante", () => {
    // Apostou 1-3, resultado 0-3 — acertou o vencedor (fora) e o gol do visitante
    expect(
      calculatePoints({ homeScore: 1, awayScore: 3 }, { homeScore: 0, awayScore: 3 }, mockSettings)
    ).toBe(15);
  });

  it("retorna correctWinner quando acertou apenas o vencedor sem nenhum gol", () => {
    // Apostou 1-0, resultado 3-2 — acertou o vencedor mas nenhum gol
    expect(
      calculatePoints({ homeScore: 1, awayScore: 0 }, { homeScore: 3, awayScore: 2 }, mockSettings)
    ).toBe(10);
  });

  it("retorna oneTeamScore quando acertou apenas um gol mas errou o vencedor", () => {
    // Apostou 0-0 (empate), resultado 2-0 (casa) — acertou gol do visitante (0)
    expect(
      calculatePoints({ homeScore: 0, awayScore: 0 }, { homeScore: 2, awayScore: 0 }, mockSettings)
    ).toBe(5);
  });

  it("retorna oneTeamScore quando acertou só gol do time da casa mas errou vencedor", () => {
    // Apostou 2-0 (casa), resultado 2-3 (fora) — acertou gol da casa mas errou vencedor
    expect(
      calculatePoints({ homeScore: 2, awayScore: 0 }, { homeScore: 2, awayScore: 3 }, mockSettings)
    ).toBe(5);
  });

  it("retorna 0 quando não acertou nada", () => {
    // Apostou 1-0, resultado 0-2
    expect(
      calculatePoints({ homeScore: 1, awayScore: 0 }, { homeScore: 0, awayScore: 2 }, mockSettings)
    ).toBe(0);
  });

  it("retorna 0 para empate apostado vs vitória (sem gol comum)", () => {
    // Apostou 1-1, resultado 3-0
    expect(
      calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 3, awayScore: 0 }, mockSettings)
    ).toBe(0);
  });
});
