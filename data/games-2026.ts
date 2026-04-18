/**
 * Calendário da Copa do Mundo FIFA 2026
 * 104 jogos — 11/jun a 19/jul/2026
 * Sedes: EUA (60 jogos), Canadá (13), México (10)
 *
 * Grupos reais (sorteio FIFA):
 *   A: México, África do Sul, Coreia do Sul, República Tcheca
 *   B: Canadá, Suíça, Catar, Bósnia e Herzegovina
 *   C: Brasil, Marrocos, Haiti, Escócia
 *   D: EUA, Paraguai, Austrália, Turquia
 *   E: Alemanha, Curaçao, Costa do Marfim, Equador
 *   F: Países Baixos, Japão, Tunísia, Suécia
 *   G: Bélgica, Egito, Irã, Nova Zelândia
 *   H: Espanha, Cabo Verde, Arábia Saudita, Uruguai
 *   I: França, Senegal, Noruega, Iraque
 *   J: Argentina, Argélia, Áustria, Jordânia
 *   K: Portugal, Uzbequistão, Colômbia, Rep. Dem. do Congo
 *   L: Inglaterra, Croácia, Gana, Panamá
 *
 * Fases mata-mata usam placeholders — atualize via painel Admin conforme avança.
 * Horários em UTC. Datas/horários confirmados onde disponíveis; demais são estimativas
 * baseadas no calendário oficial FIFA 2026.
 */

import type { GamePhase } from "@/types";

interface GameSeed {
  id: string;
  matchNumber: number;
  phase: GamePhase;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  dateUTC: string; // ISO string UTC
  venue: string;
  city: string;
  country: "EUA" | "Canadá" | "México";
}

export const GAMES_2026: GameSeed[] = [

  // ===========================================================
  // FASE DE GRUPOS — RODADA 1
  // ===========================================================

  // GRUPO A: México 🇲🇽 · África do Sul 🇿🇦 · Coreia do Sul 🇰🇷 · República Tcheca 🇨🇿
  { id: "GS01", matchNumber: 1,  phase: "Fase de Grupos", group: "A", homeTeam: "México",          awayTeam: "África do Sul",       homeFlag: "🇲🇽", awayFlag: "🇿🇦", dateUTC: "2026-06-11T19:00:00Z", venue: "Estadio Azteca",           city: "Cidade do México", country: "México" },
  { id: "GS02", matchNumber: 2,  phase: "Fase de Grupos", group: "A", homeTeam: "Coreia do Sul",   awayTeam: "República Tcheca",    homeFlag: "🇰🇷", awayFlag: "🇨🇿", dateUTC: "2026-06-12T22:00:00Z", venue: "Estadio Akron",            city: "Guadalajara",      country: "México" },

  // GRUPO B: Canadá 🇨🇦 · Suíça 🇨🇭 · Catar 🇶🇦 · Bósnia e Herzegovina 🇧🇦
  { id: "GS03", matchNumber: 3,  phase: "Fase de Grupos", group: "B", homeTeam: "Canadá",          awayTeam: "Bósnia e Herzegovina",homeFlag: "🇨🇦", awayFlag: "🇧🇦", dateUTC: "2026-06-12T20:00:00Z", venue: "BMO Field",                city: "Toronto",          country: "Canadá" },
  { id: "GS04", matchNumber: 4,  phase: "Fase de Grupos", group: "B", homeTeam: "Catar",           awayTeam: "Suíça",               homeFlag: "🇶🇦", awayFlag: "🇨🇭", dateUTC: "2026-06-13T22:00:00Z", venue: "Levi's Stadium",           city: "São Francisco",    country: "EUA" },

  // GRUPO D: EUA 🇺🇸 · Paraguai 🇵🇾 · Austrália 🇦🇺 · Turquia 🇹🇷
  { id: "GS05", matchNumber: 5,  phase: "Fase de Grupos", group: "D", homeTeam: "EUA",             awayTeam: "Paraguai",            homeFlag: "🇺🇸", awayFlag: "🇵🇾", dateUTC: "2026-06-12T23:00:00Z", venue: "SoFi Stadium",             city: "Los Angeles",      country: "EUA" },
  { id: "GS06", matchNumber: 6,  phase: "Fase de Grupos", group: "D", homeTeam: "Austrália",       awayTeam: "Turquia",             homeFlag: "🇦🇺", awayFlag: "🇹🇷", dateUTC: "2026-06-13T02:00:00Z", venue: "BC Place",                 city: "Vancouver",        country: "Canadá" },

  // GRUPO C: Brasil 🇧🇷 · Marrocos 🇲🇦 · Haiti 🇭🇹 · Escócia 🏴󠁧󠁢󠁳󠁣󠁴󠁿
  { id: "GS07", matchNumber: 7,  phase: "Fase de Grupos", group: "C", homeTeam: "Brasil",          awayTeam: "Marrocos",            homeFlag: "🇧🇷", awayFlag: "🇲🇦", dateUTC: "2026-06-13T22:00:00Z", venue: "MetLife Stadium",          city: "Nova York",        country: "EUA" },
  { id: "GS08", matchNumber: 8,  phase: "Fase de Grupos", group: "C", homeTeam: "Haiti",           awayTeam: "Escócia",             homeFlag: "🇭🇹", awayFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", dateUTC: "2026-06-13T19:00:00Z", venue: "Gillette Stadium",         city: "Boston",           country: "EUA" },

  // GRUPO E: Alemanha 🇩🇪 · Curaçao 🇨🇼 · Costa do Marfim 🇨🇮 · Equador 🇪🇨
  { id: "GS09", matchNumber: 9,  phase: "Fase de Grupos", group: "E", homeTeam: "Alemanha",        awayTeam: "Curaçao",             homeFlag: "🇩🇪", awayFlag: "🇨🇼", dateUTC: "2026-06-14T17:00:00Z", venue: "NRG Stadium",              city: "Houston",          country: "EUA" },
  { id: "GS10", matchNumber: 10, phase: "Fase de Grupos", group: "E", homeTeam: "Costa do Marfim", awayTeam: "Equador",             homeFlag: "🇨🇮", awayFlag: "🇪🇨", dateUTC: "2026-06-14T20:00:00Z", venue: "Lincoln Financial Field",  city: "Filadélfia",       country: "EUA" },

  // GRUPO F: Países Baixos 🇳🇱 · Japão 🇯🇵 · Tunísia 🇹🇳 · Suécia 🇸🇪
  { id: "GS11", matchNumber: 11, phase: "Fase de Grupos", group: "F", homeTeam: "Países Baixos",   awayTeam: "Japão",               homeFlag: "🇳🇱", awayFlag: "🇯🇵", dateUTC: "2026-06-14T23:00:00Z", venue: "AT&T Stadium",             city: "Dallas",           country: "EUA" },
  { id: "GS12", matchNumber: 12, phase: "Fase de Grupos", group: "F", homeTeam: "Suécia",          awayTeam: "Tunísia",             homeFlag: "🇸🇪", awayFlag: "🇹🇳", dateUTC: "2026-06-15T02:00:00Z", venue: "Estadio Akron",            city: "Guadalajara",      country: "México" },

  // GRUPO G: Bélgica 🇧🇪 · Egito 🇪🇬 · Irã 🇮🇷 · Nova Zelândia 🇳🇿
  { id: "GS13", matchNumber: 13, phase: "Fase de Grupos", group: "G", homeTeam: "Bélgica",         awayTeam: "Egito",               homeFlag: "🇧🇪", awayFlag: "🇪🇬", dateUTC: "2026-06-15T17:00:00Z", venue: "Lumen Field",              city: "Seattle",          country: "EUA" },
  { id: "GS14", matchNumber: 14, phase: "Fase de Grupos", group: "G", homeTeam: "Irã",             awayTeam: "Nova Zelândia",       homeFlag: "🇮🇷", awayFlag: "🇳🇿", dateUTC: "2026-06-15T20:00:00Z", venue: "SoFi Stadium",             city: "Los Angeles",      country: "EUA" },

  // GRUPO H: Espanha 🇪🇸 · Cabo Verde 🇨🇻 · Arábia Saudita 🇸🇦 · Uruguai 🇺🇾
  { id: "GS15", matchNumber: 15, phase: "Fase de Grupos", group: "H", homeTeam: "Espanha",         awayTeam: "Cabo Verde",          homeFlag: "🇪🇸", awayFlag: "🇨🇻", dateUTC: "2026-06-15T23:00:00Z", venue: "Hard Rock Stadium",        city: "Miami",            country: "EUA" },
  { id: "GS16", matchNumber: 16, phase: "Fase de Grupos", group: "H", homeTeam: "Arábia Saudita",  awayTeam: "Uruguai",             homeFlag: "🇸🇦", awayFlag: "🇺🇾", dateUTC: "2026-06-16T02:00:00Z", venue: "Rose Bowl",                city: "Los Angeles",      country: "EUA" },

  // GRUPO I: França 🇫🇷 · Senegal 🇸🇳 · Noruega 🇳🇴 · Iraque 🇮🇶
  { id: "GS17", matchNumber: 17, phase: "Fase de Grupos", group: "I", homeTeam: "França",          awayTeam: "Senegal",             homeFlag: "🇫🇷", awayFlag: "🇸🇳", dateUTC: "2026-06-16T17:00:00Z", venue: "MetLife Stadium",          city: "Nova York",        country: "EUA" },
  { id: "GS18", matchNumber: 18, phase: "Fase de Grupos", group: "I", homeTeam: "Iraque",          awayTeam: "Noruega",             homeFlag: "🇮🇶", awayFlag: "🇳🇴", dateUTC: "2026-06-16T20:00:00Z", venue: "AT&T Stadium",             city: "Dallas",           country: "EUA" },

  // GRUPO J: Argentina 🇦🇷 · Argélia 🇩🇿 · Áustria 🇦🇹 · Jordânia 🇯🇴
  { id: "GS19", matchNumber: 19, phase: "Fase de Grupos", group: "J", homeTeam: "Argentina",       awayTeam: "Argélia",             homeFlag: "🇦🇷", awayFlag: "🇩🇿", dateUTC: "2026-06-17T20:00:00Z", venue: "Hard Rock Stadium",        city: "Miami",            country: "EUA" },
  { id: "GS20", matchNumber: 20, phase: "Fase de Grupos", group: "J", homeTeam: "Áustria",         awayTeam: "Jordânia",            homeFlag: "🇦🇹", awayFlag: "🇯🇴", dateUTC: "2026-06-17T23:00:00Z", venue: "Arrowhead Stadium",        city: "Kansas City",      country: "EUA" },

  // GRUPO K: Portugal 🇵🇹 · Uzbequistão 🇺🇿 · Colômbia 🇨🇴 · Rep. Dem. do Congo 🇨🇩
  { id: "GS21", matchNumber: 21, phase: "Fase de Grupos", group: "K", homeTeam: "Portugal",        awayTeam: "Uzbequistão",         homeFlag: "🇵🇹", awayFlag: "🇺🇿", dateUTC: "2026-06-18T20:00:00Z", venue: "Estadio Azteca",           city: "Cidade do México", country: "México" },
  { id: "GS22", matchNumber: 22, phase: "Fase de Grupos", group: "K", homeTeam: "Colômbia",        awayTeam: "Rep. Dem. do Congo",  homeFlag: "🇨🇴", awayFlag: "🇨🇩", dateUTC: "2026-06-18T23:00:00Z", venue: "BC Place",                 city: "Vancouver",        country: "Canadá" },

  // GRUPO L: Inglaterra 🏴󠁧󠁢󠁥󠁮󠁧󠁿 · Croácia 🇭🇷 · Gana 🇬🇭 · Panamá 🇵🇦
  { id: "GS23", matchNumber: 23, phase: "Fase de Grupos", group: "L", homeTeam: "Inglaterra",      awayTeam: "Croácia",             homeFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayFlag: "🇭🇷", dateUTC: "2026-06-19T20:00:00Z", venue: "Mercedes-Benz Stadium",   city: "Atlanta",          country: "EUA" },
  { id: "GS24", matchNumber: 24, phase: "Fase de Grupos", group: "L", homeTeam: "Gana",            awayTeam: "Panamá",              homeFlag: "🇬🇭", awayFlag: "🇵🇦", dateUTC: "2026-06-19T23:00:00Z", venue: "Estadio BBVA",             city: "Monterrey",        country: "México" },

  // ===========================================================
  // FASE DE GRUPOS — RODADA 2
  // ===========================================================

  // GRUPO A
  { id: "GS25", matchNumber: 25, phase: "Fase de Grupos", group: "A", homeTeam: "República Tcheca", awayTeam: "África do Sul",     homeFlag: "🇨🇿", awayFlag: "🇿🇦", dateUTC: "2026-06-18T19:00:00Z", venue: "Mercedes-Benz Stadium",   city: "Atlanta",          country: "EUA" },
  { id: "GS26", matchNumber: 26, phase: "Fase de Grupos", group: "A", homeTeam: "México",          awayTeam: "Coreia do Sul",       homeFlag: "🇲🇽", awayFlag: "🇰🇷", dateUTC: "2026-06-18T22:00:00Z", venue: "Estadio Akron",            city: "Guadalajara",      country: "México" },

  // GRUPO B
  { id: "GS27", matchNumber: 27, phase: "Fase de Grupos", group: "B", homeTeam: "Canadá",          awayTeam: "Catar",               homeFlag: "🇨🇦", awayFlag: "🇶🇦", dateUTC: "2026-06-19T17:00:00Z", venue: "BMO Field",                city: "Toronto",          country: "Canadá" },
  { id: "GS28", matchNumber: 28, phase: "Fase de Grupos", group: "B", homeTeam: "Bósnia e Herzegovina", awayTeam: "Suíça",          homeFlag: "🇧🇦", awayFlag: "🇨🇭", dateUTC: "2026-06-19T20:00:00Z", venue: "Arrowhead Stadium",        city: "Kansas City",      country: "EUA" },

  // GRUPO D
  { id: "GS29", matchNumber: 29, phase: "Fase de Grupos", group: "D", homeTeam: "EUA",             awayTeam: "Austrália",           homeFlag: "🇺🇸", awayFlag: "🇦🇺", dateUTC: "2026-06-20T20:00:00Z", venue: "AT&T Stadium",             city: "Dallas",           country: "EUA" },
  { id: "GS30", matchNumber: 30, phase: "Fase de Grupos", group: "D", homeTeam: "Paraguai",        awayTeam: "Turquia",             homeFlag: "🇵🇾", awayFlag: "🇹🇷", dateUTC: "2026-06-20T23:00:00Z", venue: "Levi's Stadium",           city: "São Francisco",    country: "EUA" },

  // GRUPO C
  { id: "GS31", matchNumber: 31, phase: "Fase de Grupos", group: "C", homeTeam: "Brasil",          awayTeam: "Haiti",               homeFlag: "🇧🇷", awayFlag: "🇭🇹", dateUTC: "2026-06-20T17:00:00Z", venue: "Rose Bowl",                city: "Los Angeles",      country: "EUA" },
  { id: "GS32", matchNumber: 32, phase: "Fase de Grupos", group: "C", homeTeam: "Escócia",         awayTeam: "Marrocos",            homeFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", awayFlag: "🇲🇦", dateUTC: "2026-06-20T14:00:00Z", venue: "Gillette Stadium",         city: "Boston",           country: "EUA" },

  // GRUPO E
  { id: "GS33", matchNumber: 33, phase: "Fase de Grupos", group: "E", homeTeam: "Alemanha",        awayTeam: "Costa do Marfim",     homeFlag: "🇩🇪", awayFlag: "🇨🇮", dateUTC: "2026-06-21T17:00:00Z", venue: "NRG Stadium",              city: "Houston",          country: "EUA" },
  { id: "GS34", matchNumber: 34, phase: "Fase de Grupos", group: "E", homeTeam: "Curaçao",         awayTeam: "Equador",             homeFlag: "🇨🇼", awayFlag: "🇪🇨", dateUTC: "2026-06-21T14:00:00Z", venue: "Lincoln Financial Field",  city: "Filadélfia",       country: "EUA" },

  // GRUPO F
  { id: "GS35", matchNumber: 35, phase: "Fase de Grupos", group: "F", homeTeam: "Países Baixos",   awayTeam: "Suécia",              homeFlag: "🇳🇱", awayFlag: "🇸🇪", dateUTC: "2026-06-21T20:00:00Z", venue: "AT&T Stadium",             city: "Dallas",           country: "EUA" },
  { id: "GS36", matchNumber: 36, phase: "Fase de Grupos", group: "F", homeTeam: "Japão",           awayTeam: "Tunísia",             homeFlag: "🇯🇵", awayFlag: "🇹🇳", dateUTC: "2026-06-21T23:00:00Z", venue: "SoFi Stadium",             city: "Los Angeles",      country: "EUA" },

  // GRUPO G
  { id: "GS37", matchNumber: 37, phase: "Fase de Grupos", group: "G", homeTeam: "Bélgica",         awayTeam: "Irã",                 homeFlag: "🇧🇪", awayFlag: "🇮🇷", dateUTC: "2026-06-21T20:00:00Z", venue: "SoFi Stadium",             city: "Los Angeles",      country: "EUA" },
  { id: "GS38", matchNumber: 38, phase: "Fase de Grupos", group: "G", homeTeam: "Nova Zelândia",   awayTeam: "Egito",               homeFlag: "🇳🇿", awayFlag: "🇪🇬", dateUTC: "2026-06-21T17:00:00Z", venue: "BC Place",                 city: "Vancouver",        country: "Canadá" },

  // GRUPO H
  { id: "GS39", matchNumber: 39, phase: "Fase de Grupos", group: "H", homeTeam: "Espanha",         awayTeam: "Arábia Saudita",      homeFlag: "🇪🇸", awayFlag: "🇸🇦", dateUTC: "2026-06-22T20:00:00Z", venue: "MetLife Stadium",          city: "Nova York",        country: "EUA" },
  { id: "GS40", matchNumber: 40, phase: "Fase de Grupos", group: "H", homeTeam: "Cabo Verde",      awayTeam: "Uruguai",             homeFlag: "🇨🇻", awayFlag: "🇺🇾", dateUTC: "2026-06-22T23:00:00Z", venue: "Lumen Field",              city: "Seattle",          country: "EUA" },

  // GRUPO I
  { id: "GS41", matchNumber: 41, phase: "Fase de Grupos", group: "I", homeTeam: "França",          awayTeam: "Iraque",              homeFlag: "🇫🇷", awayFlag: "🇮🇶", dateUTC: "2026-06-22T17:00:00Z", venue: "Rose Bowl",                city: "Los Angeles",      country: "EUA" },
  { id: "GS42", matchNumber: 42, phase: "Fase de Grupos", group: "I", homeTeam: "Senegal",         awayTeam: "Noruega",             homeFlag: "🇸🇳", awayFlag: "🇳🇴", dateUTC: "2026-06-22T14:00:00Z", venue: "Arrowhead Stadium",        city: "Kansas City",      country: "EUA" },

  // GRUPO J
  { id: "GS43", matchNumber: 43, phase: "Fase de Grupos", group: "J", homeTeam: "Argentina",       awayTeam: "Áustria",             homeFlag: "🇦🇷", awayFlag: "🇦🇹", dateUTC: "2026-06-23T20:00:00Z", venue: "Hard Rock Stadium",        city: "Miami",            country: "EUA" },
  { id: "GS44", matchNumber: 44, phase: "Fase de Grupos", group: "J", homeTeam: "Argélia",         awayTeam: "Jordânia",            homeFlag: "🇩🇿", awayFlag: "🇯🇴", dateUTC: "2026-06-23T23:00:00Z", venue: "Mercedes-Benz Stadium",   city: "Atlanta",          country: "EUA" },

  // GRUPO K
  { id: "GS45", matchNumber: 45, phase: "Fase de Grupos", group: "K", homeTeam: "Portugal",        awayTeam: "Colômbia",            homeFlag: "🇵🇹", awayFlag: "🇨🇴", dateUTC: "2026-06-24T20:00:00Z", venue: "Estadio Azteca",           city: "Cidade do México", country: "México" },
  { id: "GS46", matchNumber: 46, phase: "Fase de Grupos", group: "K", homeTeam: "Uzbequistão",     awayTeam: "Rep. Dem. do Congo",  homeFlag: "🇺🇿", awayFlag: "🇨🇩", dateUTC: "2026-06-24T23:00:00Z", venue: "Stade Saputo",             city: "Montreal",         country: "Canadá" },

  // GRUPO L
  { id: "GS47", matchNumber: 47, phase: "Fase de Grupos", group: "L", homeTeam: "Inglaterra",      awayTeam: "Gana",                homeFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayFlag: "🇬🇭", dateUTC: "2026-06-25T20:00:00Z", venue: "Levi's Stadium",           city: "São Francisco",    country: "EUA" },
  { id: "GS48", matchNumber: 48, phase: "Fase de Grupos", group: "L", homeTeam: "Croácia",         awayTeam: "Panamá",              homeFlag: "🇭🇷", awayFlag: "🇵🇦", dateUTC: "2026-06-25T23:00:00Z", venue: "Gillette Stadium",         city: "Boston",           country: "EUA" },

  // ===========================================================
  // FASE DE GRUPOS — RODADA 3 (simultâneos por grupo)
  // ===========================================================

  // GRUPO A (simultâneos)
  { id: "GS49", matchNumber: 49, phase: "Fase de Grupos", group: "A", homeTeam: "México",          awayTeam: "República Tcheca",    homeFlag: "🇲🇽", awayFlag: "🇨🇿", dateUTC: "2026-06-24T20:00:00Z", venue: "Estadio Azteca",           city: "Cidade do México", country: "México" },
  { id: "GS50", matchNumber: 50, phase: "Fase de Grupos", group: "A", homeTeam: "Coreia do Sul",   awayTeam: "África do Sul",       homeFlag: "🇰🇷", awayFlag: "🇿🇦", dateUTC: "2026-06-24T20:00:00Z", venue: "AT&T Stadium",             city: "Dallas",           country: "EUA" },

  // GRUPO B (simultâneos)
  { id: "GS51", matchNumber: 51, phase: "Fase de Grupos", group: "B", homeTeam: "Canadá",          awayTeam: "Suíça",               homeFlag: "🇨🇦", awayFlag: "🇨🇭", dateUTC: "2026-06-25T20:00:00Z", venue: "BMO Field",                city: "Toronto",          country: "Canadá" },
  { id: "GS52", matchNumber: 52, phase: "Fase de Grupos", group: "B", homeTeam: "Catar",           awayTeam: "Bósnia e Herzegovina",homeFlag: "🇶🇦", awayFlag: "🇧🇦", dateUTC: "2026-06-25T20:00:00Z", venue: "NRG Stadium",              city: "Houston",          country: "EUA" },

  // GRUPO D (simultâneos)
  { id: "GS53", matchNumber: 53, phase: "Fase de Grupos", group: "D", homeTeam: "EUA",             awayTeam: "Turquia",             homeFlag: "🇺🇸", awayFlag: "🇹🇷", dateUTC: "2026-06-25T20:00:00Z", venue: "Arrowhead Stadium",        city: "Kansas City",      country: "EUA" },
  { id: "GS54", matchNumber: 54, phase: "Fase de Grupos", group: "D", homeTeam: "Austrália",       awayTeam: "Paraguai",            homeFlag: "🇦🇺", awayFlag: "🇵🇾", dateUTC: "2026-06-25T20:00:00Z", venue: "BC Place",                 city: "Vancouver",        country: "Canadá" },

  // GRUPO C (simultâneos)
  { id: "GS55", matchNumber: 55, phase: "Fase de Grupos", group: "C", homeTeam: "Brasil",          awayTeam: "Escócia",             homeFlag: "🇧🇷", awayFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", dateUTC: "2026-06-26T20:00:00Z", venue: "MetLife Stadium",          city: "Nova York",        country: "EUA" },
  { id: "GS56", matchNumber: 56, phase: "Fase de Grupos", group: "C", homeTeam: "Marrocos",        awayTeam: "Haiti",               homeFlag: "🇲🇦", awayFlag: "🇭🇹", dateUTC: "2026-06-26T20:00:00Z", venue: "Levi's Stadium",           city: "São Francisco",    country: "EUA" },

  // GRUPO E (simultâneos)
  { id: "GS57", matchNumber: 57, phase: "Fase de Grupos", group: "E", homeTeam: "Alemanha",        awayTeam: "Equador",             homeFlag: "🇩🇪", awayFlag: "🇪🇨", dateUTC: "2026-06-26T20:00:00Z", venue: "Rose Bowl",                city: "Los Angeles",      country: "EUA" },
  { id: "GS58", matchNumber: 58, phase: "Fase de Grupos", group: "E", homeTeam: "Costa do Marfim", awayTeam: "Curaçao",             homeFlag: "🇨🇮", awayFlag: "🇨🇼", dateUTC: "2026-06-26T20:00:00Z", venue: "Estadio BBVA",             city: "Monterrey",        country: "México" },

  // GRUPO F (simultâneos)
  { id: "GS59", matchNumber: 59, phase: "Fase de Grupos", group: "F", homeTeam: "Países Baixos",   awayTeam: "Tunísia",             homeFlag: "🇳🇱", awayFlag: "🇹🇳", dateUTC: "2026-06-26T20:00:00Z", venue: "SoFi Stadium",             city: "Los Angeles",      country: "EUA" },
  { id: "GS60", matchNumber: 60, phase: "Fase de Grupos", group: "F", homeTeam: "Japão",           awayTeam: "Suécia",              homeFlag: "🇯🇵", awayFlag: "🇸🇪", dateUTC: "2026-06-26T20:00:00Z", venue: "Estadio Akron",            city: "Guadalajara",      country: "México" },

  // GRUPO G (simultâneos — confirmados pela FIFA)
  { id: "GS61", matchNumber: 61, phase: "Fase de Grupos", group: "G", homeTeam: "Egito",           awayTeam: "Irã",                 homeFlag: "🇪🇬", awayFlag: "🇮🇷", dateUTC: "2026-06-26T20:00:00Z", venue: "Lumen Field",              city: "Seattle",          country: "EUA" },
  { id: "GS62", matchNumber: 62, phase: "Fase de Grupos", group: "G", homeTeam: "Nova Zelândia",   awayTeam: "Bélgica",             homeFlag: "🇳🇿", awayFlag: "🇧🇪", dateUTC: "2026-06-26T20:00:00Z", venue: "BC Place",                 city: "Vancouver",        country: "Canadá" },

  // GRUPO H (simultâneos)
  { id: "GS63", matchNumber: 63, phase: "Fase de Grupos", group: "H", homeTeam: "Espanha",         awayTeam: "Uruguai",             homeFlag: "🇪🇸", awayFlag: "🇺🇾", dateUTC: "2026-06-27T20:00:00Z", venue: "MetLife Stadium",          city: "Nova York",        country: "EUA" },
  { id: "GS64", matchNumber: 64, phase: "Fase de Grupos", group: "H", homeTeam: "Cabo Verde",      awayTeam: "Arábia Saudita",      homeFlag: "🇨🇻", awayFlag: "🇸🇦", dateUTC: "2026-06-27T20:00:00Z", venue: "Hard Rock Stadium",        city: "Miami",            country: "EUA" },

  // GRUPO I (simultâneos)
  { id: "GS65", matchNumber: 65, phase: "Fase de Grupos", group: "I", homeTeam: "França",          awayTeam: "Noruega",             homeFlag: "🇫🇷", awayFlag: "🇳🇴", dateUTC: "2026-06-27T20:00:00Z", venue: "Rose Bowl",                city: "Los Angeles",      country: "EUA" },
  { id: "GS66", matchNumber: 66, phase: "Fase de Grupos", group: "I", homeTeam: "Senegal",         awayTeam: "Iraque",              homeFlag: "🇸🇳", awayFlag: "🇮🇶", dateUTC: "2026-06-27T20:00:00Z", venue: "AT&T Stadium",             city: "Dallas",           country: "EUA" },

  // GRUPO J (simultâneos)
  { id: "GS67", matchNumber: 67, phase: "Fase de Grupos", group: "J", homeTeam: "Argentina",       awayTeam: "Jordânia",            homeFlag: "🇦🇷", awayFlag: "🇯🇴", dateUTC: "2026-06-28T20:00:00Z", venue: "Hard Rock Stadium",        city: "Miami",            country: "EUA" },
  { id: "GS68", matchNumber: 68, phase: "Fase de Grupos", group: "J", homeTeam: "Argélia",         awayTeam: "Áustria",             homeFlag: "🇩🇿", awayFlag: "🇦🇹", dateUTC: "2026-06-28T20:00:00Z", venue: "Mercedes-Benz Stadium",   city: "Atlanta",          country: "EUA" },

  // GRUPO K (simultâneos)
  { id: "GS69", matchNumber: 69, phase: "Fase de Grupos", group: "K", homeTeam: "Portugal",        awayTeam: "Rep. Dem. do Congo",  homeFlag: "🇵🇹", awayFlag: "🇨🇩", dateUTC: "2026-06-29T20:00:00Z", venue: "Estadio Azteca",           city: "Cidade do México", country: "México" },
  { id: "GS70", matchNumber: 70, phase: "Fase de Grupos", group: "K", homeTeam: "Colômbia",        awayTeam: "Uzbequistão",         homeFlag: "🇨🇴", awayFlag: "🇺🇿", dateUTC: "2026-06-29T20:00:00Z", venue: "Stade Saputo",             city: "Montreal",         country: "Canadá" },

  // GRUPO L (simultâneos)
  { id: "GS71", matchNumber: 71, phase: "Fase de Grupos", group: "L", homeTeam: "Inglaterra",      awayTeam: "Panamá",              homeFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayFlag: "🇵🇦", dateUTC: "2026-06-30T20:00:00Z", venue: "Lumen Field",              city: "Seattle",          country: "EUA" },
  { id: "GS72", matchNumber: 72, phase: "Fase de Grupos", group: "L", homeTeam: "Gana",            awayTeam: "Croácia",             homeFlag: "🇬🇭", awayFlag: "🇭🇷", dateUTC: "2026-06-30T20:00:00Z", venue: "NRG Stadium",              city: "Houston",          country: "EUA" },

  // ===========================================================
  // OITAVAS DE FINAL — Rodada de 32 (16 jogos)
  // 32 classificados → 16 | jul/1–jul/8
  // ===========================================================
  { id: "R32_01", matchNumber: 73,  phase: "Oitavas", group: null, homeTeam: "1º Grupo A", awayTeam: "3º Melhor",    homeFlag: null, awayFlag: null, dateUTC: "2026-07-01T20:00:00Z", venue: "MetLife Stadium",         city: "Nova York",        country: "EUA" },
  { id: "R32_02", matchNumber: 74,  phase: "Oitavas", group: null, homeTeam: "1º Grupo C", awayTeam: "2º Grupo D",   homeFlag: null, awayFlag: null, dateUTC: "2026-07-01T23:00:00Z", venue: "AT&T Stadium",            city: "Dallas",           country: "EUA" },
  { id: "R32_03", matchNumber: 75,  phase: "Oitavas", group: null, homeTeam: "1º Grupo B", awayTeam: "3º Melhor",    homeFlag: null, awayFlag: null, dateUTC: "2026-07-02T20:00:00Z", venue: "Rose Bowl",               city: "Los Angeles",      country: "EUA" },
  { id: "R32_04", matchNumber: 76,  phase: "Oitavas", group: null, homeTeam: "1º Grupo D", awayTeam: "2º Grupo C",   homeFlag: null, awayFlag: null, dateUTC: "2026-07-02T23:00:00Z", venue: "NRG Stadium",             city: "Houston",          country: "EUA" },
  { id: "R32_05", matchNumber: 77,  phase: "Oitavas", group: null, homeTeam: "1º Grupo E", awayTeam: "3º Melhor",    homeFlag: null, awayFlag: null, dateUTC: "2026-07-03T20:00:00Z", venue: "Hard Rock Stadium",       city: "Miami",            country: "EUA" },
  { id: "R32_06", matchNumber: 78,  phase: "Oitavas", group: null, homeTeam: "1º Grupo F", awayTeam: "2º Grupo E",   homeFlag: null, awayFlag: null, dateUTC: "2026-07-03T23:00:00Z", venue: "Levi's Stadium",          city: "São Francisco",    country: "EUA" },
  { id: "R32_07", matchNumber: 79,  phase: "Oitavas", group: null, homeTeam: "1º Grupo G", awayTeam: "3º Melhor",    homeFlag: null, awayFlag: null, dateUTC: "2026-07-04T20:00:00Z", venue: "Lumen Field",             city: "Seattle",          country: "EUA" },
  { id: "R32_08", matchNumber: 80,  phase: "Oitavas", group: null, homeTeam: "1º Grupo H", awayTeam: "2º Grupo G",   homeFlag: null, awayFlag: null, dateUTC: "2026-07-04T23:00:00Z", venue: "Lincoln Financial Field", city: "Filadélfia",       country: "EUA" },
  { id: "R32_09", matchNumber: 81,  phase: "Oitavas", group: null, homeTeam: "1º Grupo I", awayTeam: "3º Melhor",    homeFlag: null, awayFlag: null, dateUTC: "2026-07-05T20:00:00Z", venue: "Estadio Azteca",          city: "Cidade do México", country: "México" },
  { id: "R32_10", matchNumber: 82,  phase: "Oitavas", group: null, homeTeam: "1º Grupo J", awayTeam: "2º Grupo I",   homeFlag: null, awayFlag: null, dateUTC: "2026-07-05T23:00:00Z", venue: "BC Place",                city: "Vancouver",        country: "Canadá" },
  { id: "R32_11", matchNumber: 83,  phase: "Oitavas", group: null, homeTeam: "1º Grupo K", awayTeam: "3º Melhor",    homeFlag: null, awayFlag: null, dateUTC: "2026-07-06T20:00:00Z", venue: "Mercedes-Benz Stadium",  city: "Atlanta",          country: "EUA" },
  { id: "R32_12", matchNumber: 84,  phase: "Oitavas", group: null, homeTeam: "1º Grupo L", awayTeam: "2º Grupo K",   homeFlag: null, awayFlag: null, dateUTC: "2026-07-06T23:00:00Z", venue: "Arrowhead Stadium",       city: "Kansas City",      country: "EUA" },
  { id: "R32_13", matchNumber: 85,  phase: "Oitavas", group: null, homeTeam: "2º Grupo A", awayTeam: "2º Grupo B",   homeFlag: null, awayFlag: null, dateUTC: "2026-07-07T20:00:00Z", venue: "Estadio BBVA",            city: "Monterrey",        country: "México" },
  { id: "R32_14", matchNumber: 86,  phase: "Oitavas", group: null, homeTeam: "2º Grupo F", awayTeam: "2º Grupo J",   homeFlag: null, awayFlag: null, dateUTC: "2026-07-07T23:00:00Z", venue: "SoFi Stadium",            city: "Los Angeles",      country: "EUA" },
  { id: "R32_15", matchNumber: 87,  phase: "Oitavas", group: null, homeTeam: "2º Grupo H", awayTeam: "2º Grupo L",   homeFlag: null, awayFlag: null, dateUTC: "2026-07-08T20:00:00Z", venue: "BMO Field",               city: "Toronto",          country: "Canadá" },
  { id: "R32_16", matchNumber: 88,  phase: "Oitavas", group: null, homeTeam: "3º Melhor",  awayTeam: "3º Melhor",    homeFlag: null, awayFlag: null, dateUTC: "2026-07-08T23:00:00Z", venue: "Gillette Stadium",        city: "Boston",           country: "EUA" },

  // ===========================================================
  // DEZESSEIS AVOS — Oitavas de Final real (8 jogos)
  // 16 classificados → 8 | jul/9–jul/12
  // ===========================================================
  { id: "R16_01", matchNumber: 89,  phase: "Dezesseis", group: null, homeTeam: "Vencedor R32-01", awayTeam: "Vencedor R32-02", homeFlag: null, awayFlag: null, dateUTC: "2026-07-09T20:00:00Z", venue: "MetLife Stadium",         city: "Nova York",        country: "EUA" },
  { id: "R16_02", matchNumber: 90,  phase: "Dezesseis", group: null, homeTeam: "Vencedor R32-03", awayTeam: "Vencedor R32-04", homeFlag: null, awayFlag: null, dateUTC: "2026-07-09T23:00:00Z", venue: "AT&T Stadium",            city: "Dallas",           country: "EUA" },
  { id: "R16_03", matchNumber: 91,  phase: "Dezesseis", group: null, homeTeam: "Vencedor R32-05", awayTeam: "Vencedor R32-06", homeFlag: null, awayFlag: null, dateUTC: "2026-07-10T20:00:00Z", venue: "Rose Bowl",               city: "Los Angeles",      country: "EUA" },
  { id: "R16_04", matchNumber: 92,  phase: "Dezesseis", group: null, homeTeam: "Vencedor R32-07", awayTeam: "Vencedor R32-08", homeFlag: null, awayFlag: null, dateUTC: "2026-07-10T23:00:00Z", venue: "NRG Stadium",             city: "Houston",          country: "EUA" },
  { id: "R16_05", matchNumber: 93,  phase: "Dezesseis", group: null, homeTeam: "Vencedor R32-09", awayTeam: "Vencedor R32-10", homeFlag: null, awayFlag: null, dateUTC: "2026-07-11T20:00:00Z", venue: "SoFi Stadium",            city: "Los Angeles",      country: "EUA" },
  { id: "R16_06", matchNumber: 94,  phase: "Dezesseis", group: null, homeTeam: "Vencedor R32-11", awayTeam: "Vencedor R32-12", homeFlag: null, awayFlag: null, dateUTC: "2026-07-11T23:00:00Z", venue: "Lumen Field",             city: "Seattle",          country: "EUA" },
  { id: "R16_07", matchNumber: 95,  phase: "Dezesseis", group: null, homeTeam: "Vencedor R32-13", awayTeam: "Vencedor R32-14", homeFlag: null, awayFlag: null, dateUTC: "2026-07-12T20:00:00Z", venue: "Estadio Azteca",          city: "Cidade do México", country: "México" },
  { id: "R16_08", matchNumber: 96,  phase: "Dezesseis", group: null, homeTeam: "Vencedor R32-15", awayTeam: "Vencedor R32-16", homeFlag: null, awayFlag: null, dateUTC: "2026-07-12T23:00:00Z", venue: "Hard Rock Stadium",       city: "Miami",            country: "EUA" },

  // ===========================================================
  // QUARTAS DE FINAL (4 jogos) | jul/14–jul/15
  // ===========================================================
  { id: "QF1", matchNumber: 97,  phase: "Quartas", group: null, homeTeam: "Vencedor R16-01", awayTeam: "Vencedor R16-02", homeFlag: null, awayFlag: null, dateUTC: "2026-07-14T20:00:00Z", venue: "MetLife Stadium",         city: "Nova York",        country: "EUA" },
  { id: "QF2", matchNumber: 98,  phase: "Quartas", group: null, homeTeam: "Vencedor R16-03", awayTeam: "Vencedor R16-04", homeFlag: null, awayFlag: null, dateUTC: "2026-07-14T23:00:00Z", venue: "AT&T Stadium",            city: "Dallas",           country: "EUA" },
  { id: "QF3", matchNumber: 99,  phase: "Quartas", group: null, homeTeam: "Vencedor R16-05", awayTeam: "Vencedor R16-06", homeFlag: null, awayFlag: null, dateUTC: "2026-07-15T20:00:00Z", venue: "Rose Bowl",               city: "Los Angeles",      country: "EUA" },
  { id: "QF4", matchNumber: 100, phase: "Quartas", group: null, homeTeam: "Vencedor R16-07", awayTeam: "Vencedor R16-08", homeFlag: null, awayFlag: null, dateUTC: "2026-07-15T23:00:00Z", venue: "SoFi Stadium",            city: "Los Angeles",      country: "EUA" },

  // ===========================================================
  // SEMIFINAIS (2 jogos) | jul/17–jul/18
  // ===========================================================
  { id: "SF1", matchNumber: 101, phase: "Semifinal", group: null, homeTeam: "Vencedor QF1", awayTeam: "Vencedor QF2", homeFlag: null, awayFlag: null, dateUTC: "2026-07-17T23:00:00Z", venue: "MetLife Stadium",         city: "Nova York",        country: "EUA" },
  { id: "SF2", matchNumber: 102, phase: "Semifinal", group: null, homeTeam: "Vencedor QF3", awayTeam: "Vencedor QF4", homeFlag: null, awayFlag: null, dateUTC: "2026-07-18T23:00:00Z", venue: "Rose Bowl",               city: "Los Angeles",      country: "EUA" },

  // ===========================================================
  // TERCEIRO LUGAR — jul/18
  // ===========================================================
  { id: "3PL", matchNumber: 103, phase: "Terceiro Lugar", group: null, homeTeam: "Perdedor SF1", awayTeam: "Perdedor SF2", homeFlag: null, awayFlag: null, dateUTC: "2026-07-18T20:00:00Z", venue: "Hard Rock Stadium",       city: "Miami",            country: "EUA" },

  // ===========================================================
  // FINAL — 19 jul
  // ===========================================================
  { id: "FIN", matchNumber: 104, phase: "Final",          group: null, homeTeam: "Vencedor SF1",  awayTeam: "Vencedor SF2",  homeFlag: null, awayFlag: null, dateUTC: "2026-07-19T20:00:00Z", venue: "MetLife Stadium",         city: "Nova York",        country: "EUA" },
];

export default GAMES_2026;
