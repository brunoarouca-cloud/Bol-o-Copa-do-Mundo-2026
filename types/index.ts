import { Timestamp } from "firebase/firestore";

export type GamePhase =
  | "Fase de Grupos"
  | "Oitavas"
  | "Quartas"
  | "Semifinal"
  | "Terceiro Lugar"
  | "Final";

export type GameStatus = "upcoming" | "locked" | "finished";

export interface Game {
  id: string; // "GS01" | "R32_01" | "QF1" | ...
  matchNumber: number; // 1..104
  phase: GamePhase;
  group: string | null; // "A".."L" ou null
  homeTeam: string; // "Brasil" ou placeholder "1º Grupo A"
  awayTeam: string;
  homeFlag: string | null; // emoji ou código ISO
  awayFlag: string | null;
  date: Timestamp; // armazenado em UTC
  venue: string;
  city: string;
  country: "EUA" | "Canadá" | "México";
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
}

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  createdAt: Timestamp;
  totalPoints: number;
  exactHits: number; // desempate
  rank: number; // calculado
  isAdmin: boolean; // espelha custom claim para UI
}

export interface Bet {
  id: string; // `${uid}_${gameId}`
  userId: string;
  gameId: string;
  homeScore: number;
  awayScore: number;
  points: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NominalCategory =
  | "topScorer"
  | "champion"
  | "runnerUp"
  | "thirdPlace";

export interface NominalBet {
  id: string; // `${uid}_${category}`
  userId: string;
  category: NominalCategory;
  prediction: string;
  points: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NominalResults {
  topScorer: string | null;
  champion: string | null;
  runnerUp: string | null;
  thirdPlace: string | null;
  updatedAt: Timestamp | null;
}

export interface ScoringSettings {
  exactScore: number; // 20
  correctWinnerOneScore: number; // 15
  correctWinner: number; // 10
  oneTeamScore: number; // 5
  correctDraw: number; // 13
  nominalBet: number; // 50
  nominalDeadline: Timestamp; // 12/06/2026 23:59 BRT em UTC
  lockMinutesBefore: number; // 5
}

export interface NewsArticle {
  id: string;
  date: string; // "2026-06-14"
  title: string;
  content: string; // markdown
  highlights: string[];
  generatedAt: Timestamp;
}

// Tipos auxiliares para formulários (sem Timestamp)
export interface ScoringSettingsForm {
  exactScore: number;
  correctWinnerOneScore: number;
  correctWinner: number;
  oneTeamScore: number;
  correctDraw: number;
  nominalBet: number;
  lockMinutesBefore: number;
}
