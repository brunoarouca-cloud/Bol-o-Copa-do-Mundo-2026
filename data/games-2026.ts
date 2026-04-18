/**
 * Calendário da Copa do Mundo FIFA 2026
 * 104 jogos — 11/jun a 19/jul/2026
 * Sedes: EUA (60 jogos), Canadá (13), México (10)
 *
 * ⚠️  SKELETON com datas plausíveis baseadas no calendário FIFA oficial.
 *      Horários como aproximações BRT convertidos para UTC.
 *      Times do mata-mata são placeholders ("1º Grupo A" etc.).
 *      Use o painel Admin para ajustar datas/horários exatos após divulgação oficial.
 *
 * Formato de id:
 *   Fase de Grupos:    GS{nn}  (01..72)
 *   Oitavas:           R32_{nn} (01..16)
 *   Quartas:           QF{n}  (1..8)
 *   Semifinal:         SF{n}  (1..4)
 *   Terceiro Lugar:    3PL
 *   Final:             FIN
 */

// Datas em UTC (horários aproximados baseados no calendário FIFA)
// Copa 2026: 11/jun (abertura) → 19/jul (final)

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
  // =========================================================
  // FASE DE GRUPOS — Rodada 1 (11–17 jun)
  // =========================================================
  // GRUPO A (México, EUA, Canadá, Holanda, Escócia, Marrocos) — exemplo fictício
  { id: "GS01", matchNumber: 1, phase: "Fase de Grupos", group: "A", homeTeam: "México", awayTeam: "Escócia", homeFlag: "🇲🇽", awayFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", dateUTC: "2026-06-11T23:00:00Z", venue: "Estadio Azteca", city: "Cidade do México", country: "México" },
  { id: "GS02", matchNumber: 2, phase: "Fase de Grupos", group: "A", homeTeam: "EUA", awayTeam: "Países Baixos", homeFlag: "🇺🇸", awayFlag: "🇳🇱", dateUTC: "2026-06-12T00:00:00Z", venue: "MetLife Stadium", city: "Nova York", country: "EUA" },
  { id: "GS03", matchNumber: 3, phase: "Fase de Grupos", group: "A", homeTeam: "Canadá", awayTeam: "Marrocos", homeFlag: "🇨🇦", awayFlag: "🇲🇦", dateUTC: "2026-06-12T02:00:00Z", venue: "BC Place", city: "Vancouver", country: "Canadá" },
  { id: "GS04", matchNumber: 4, phase: "Fase de Grupos", group: "A", homeTeam: "Escócia", awayTeam: "Países Baixos", homeFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", awayFlag: "🇳🇱", dateUTC: "2026-06-16T20:00:00Z", venue: "AT&T Stadium", city: "Dallas", country: "EUA" },
  { id: "GS05", matchNumber: 5, phase: "Fase de Grupos", group: "A", homeTeam: "EUA", awayTeam: "México", homeFlag: "🇺🇸", awayFlag: "🇲🇽", dateUTC: "2026-06-16T23:00:00Z", venue: "Rose Bowl", city: "Los Angeles", country: "EUA" },
  { id: "GS06", matchNumber: 6, phase: "Fase de Grupos", group: "A", homeTeam: "Marrocos", awayTeam: "Escócia", homeFlag: "🇲🇦", awayFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", dateUTC: "2026-06-17T02:00:00Z", venue: "Stade de Saputo", city: "Montreal", country: "Canadá" },
  { id: "GS07", matchNumber: 7, phase: "Fase de Grupos", group: "A", homeTeam: "Países Baixos", awayTeam: "Canadá", homeFlag: "🇳🇱", awayFlag: "🇨🇦", dateUTC: "2026-06-20T20:00:00Z", venue: "Lumen Field", city: "Seattle", country: "EUA" },
  { id: "GS08", matchNumber: 8, phase: "Fase de Grupos", group: "A", homeTeam: "Marrocos", awayTeam: "México", homeFlag: "🇲🇦", awayFlag: "🇲🇽", dateUTC: "2026-06-20T20:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  { id: "GS09", matchNumber: 9, phase: "Fase de Grupos", group: "A", homeTeam: "Escócia", awayTeam: "EUA", homeFlag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", awayFlag: "🇺🇸", dateUTC: "2026-06-20T20:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },
  { id: "GS10", matchNumber: 10, phase: "Fase de Grupos", group: "A", homeTeam: "Países Baixos", awayTeam: "México", homeFlag: "🇳🇱", awayFlag: "🇲🇽", dateUTC: "2026-06-20T20:00:00Z", venue: "Estadio BBVA", city: "Monterrey", country: "México" },

  // GRUPO B (Brasil, Argentina, ...)
  { id: "GS11", matchNumber: 11, phase: "Fase de Grupos", group: "B", homeTeam: "Brasil", awayTeam: "Sérvia", homeFlag: "🇧🇷", awayFlag: "🇷🇸", dateUTC: "2026-06-12T20:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  { id: "GS12", matchNumber: 12, phase: "Fase de Grupos", group: "B", homeTeam: "Argentina", awayTeam: "Arábia Saudita", homeFlag: "🇦🇷", awayFlag: "🇸🇦", dateUTC: "2026-06-12T23:00:00Z", venue: "MetLife Stadium", city: "Nova York", country: "EUA" },
  { id: "GS13", matchNumber: 13, phase: "Fase de Grupos", group: "B", homeTeam: "Colômbia", awayTeam: "Costa do Marfim", homeFlag: "🇨🇴", awayFlag: "🇨🇮", dateUTC: "2026-06-13T02:00:00Z", venue: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  { id: "GS14", matchNumber: 14, phase: "Fase de Grupos", group: "B", homeTeam: "Sérvia", awayTeam: "Colômbia", homeFlag: "🇷🇸", awayFlag: "🇨🇴", dateUTC: "2026-06-17T20:00:00Z", venue: "AT&T Stadium", city: "Dallas", country: "EUA" },
  { id: "GS15", matchNumber: 15, phase: "Fase de Grupos", group: "B", homeTeam: "Brasil", awayTeam: "Costa do Marfim", homeFlag: "🇧🇷", awayFlag: "🇨🇮", dateUTC: "2026-06-17T23:00:00Z", venue: "Rose Bowl", city: "Los Angeles", country: "EUA" },
  { id: "GS16", matchNumber: 16, phase: "Fase de Grupos", group: "B", homeTeam: "Arábia Saudita", awayTeam: "Sérvia", homeFlag: "🇸🇦", awayFlag: "🇷🇸", dateUTC: "2026-06-18T02:00:00Z", venue: "Gillette Stadium", city: "Boston", country: "EUA" },
  { id: "GS17", matchNumber: 17, phase: "Fase de Grupos", group: "B", homeTeam: "Costa do Marfim", awayTeam: "Argentina", homeFlag: "🇨🇮", awayFlag: "🇦🇷", dateUTC: "2026-06-21T20:00:00Z", venue: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  { id: "GS18", matchNumber: 18, phase: "Fase de Grupos", group: "B", homeTeam: "Brasil", awayTeam: "Arábia Saudita", homeFlag: "🇧🇷", awayFlag: "🇸🇦", dateUTC: "2026-06-21T20:00:00Z", venue: "NRG Stadium", city: "Houston", country: "EUA" },
  { id: "GS19", matchNumber: 19, phase: "Fase de Grupos", group: "B", homeTeam: "Colômbia", awayTeam: "Argentina", homeFlag: "🇨🇴", awayFlag: "🇦🇷", dateUTC: "2026-06-21T20:00:00Z", venue: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  { id: "GS20", matchNumber: 20, phase: "Fase de Grupos", group: "B", homeTeam: "Sérvia", awayTeam: "Costa do Marfim", homeFlag: "🇷🇸", awayFlag: "🇨🇮", dateUTC: "2026-06-21T20:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },

  // GRUPO C
  { id: "GS21", matchNumber: 21, phase: "Fase de Grupos", group: "C", homeTeam: "Espanha", awayTeam: "Qatar", homeFlag: "🇪🇸", awayFlag: "🇶🇦", dateUTC: "2026-06-13T20:00:00Z", venue: "AT&T Stadium", city: "Dallas", country: "EUA" },
  { id: "GS22", matchNumber: 22, phase: "Fase de Grupos", group: "C", homeTeam: "Portugal", awayTeam: "Costa Rica", homeFlag: "🇵🇹", awayFlag: "🇨🇷", dateUTC: "2026-06-13T23:00:00Z", venue: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  { id: "GS23", matchNumber: 23, phase: "Fase de Grupos", group: "C", homeTeam: "Uruguai", awayTeam: "Venezuela", homeFlag: "🇺🇾", awayFlag: "🇻🇪", dateUTC: "2026-06-14T02:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },
  { id: "GS24", matchNumber: 24, phase: "Fase de Grupos", group: "C", homeTeam: "Qatar", awayTeam: "Uruguai", homeFlag: "🇶🇦", awayFlag: "🇺🇾", dateUTC: "2026-06-18T20:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  { id: "GS25", matchNumber: 25, phase: "Fase de Grupos", group: "C", homeTeam: "Espanha", awayTeam: "Venezuela", homeFlag: "🇪🇸", awayFlag: "🇻🇪", dateUTC: "2026-06-18T23:00:00Z", venue: "MetLife Stadium", city: "Nova York", country: "EUA" },
  { id: "GS26", matchNumber: 26, phase: "Fase de Grupos", group: "C", homeTeam: "Costa Rica", awayTeam: "Qatar", homeFlag: "🇨🇷", awayFlag: "🇶🇦", dateUTC: "2026-06-19T02:00:00Z", venue: "Estadio Azteca", city: "Cidade do México", country: "México" },
  { id: "GS27", matchNumber: 27, phase: "Fase de Grupos", group: "C", homeTeam: "Espanha", awayTeam: "Uruguai", homeFlag: "🇪🇸", awayFlag: "🇺🇾", dateUTC: "2026-06-22T20:00:00Z", venue: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  { id: "GS28", matchNumber: 28, phase: "Fase de Grupos", group: "C", homeTeam: "Costa Rica", awayTeam: "Venezuela", homeFlag: "🇨🇷", awayFlag: "🇻🇪", dateUTC: "2026-06-22T20:00:00Z", venue: "Rose Bowl", city: "Los Angeles", country: "EUA" },
  { id: "GS29", matchNumber: 29, phase: "Fase de Grupos", group: "C", homeTeam: "Portugal", awayTeam: "Qatar", homeFlag: "🇵🇹", awayFlag: "🇶🇦", dateUTC: "2026-06-22T20:00:00Z", venue: "NRG Stadium", city: "Houston", country: "EUA" },
  { id: "GS30", matchNumber: 30, phase: "Fase de Grupos", group: "C", homeTeam: "Venezuela", awayTeam: "Uruguai", homeFlag: "🇻🇪", awayFlag: "🇺🇾", dateUTC: "2026-06-22T20:00:00Z", venue: "BC Place", city: "Vancouver", country: "Canadá" },

  // GRUPO D
  { id: "GS31", matchNumber: 31, phase: "Fase de Grupos", group: "D", homeTeam: "França", awayTeam: "Jamaica", homeFlag: "🇫🇷", awayFlag: "🇯🇲", dateUTC: "2026-06-14T20:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  { id: "GS32", matchNumber: 32, phase: "Fase de Grupos", group: "D", homeTeam: "Alemanha", awayTeam: "Japão", homeFlag: "🇩🇪", awayFlag: "🇯🇵", dateUTC: "2026-06-14T23:00:00Z", venue: "Lumen Field", city: "Seattle", country: "EUA" },
  { id: "GS33", matchNumber: 33, phase: "Fase de Grupos", group: "D", homeTeam: "Bélgica", awayTeam: "Egito", homeFlag: "🇧🇪", awayFlag: "🇪🇬", dateUTC: "2026-06-15T02:00:00Z", venue: "AT&T Stadium", city: "Dallas", country: "EUA" },
  { id: "GS34", matchNumber: 34, phase: "Fase de Grupos", group: "D", homeTeam: "Jamaica", awayTeam: "Alemanha", homeFlag: "🇯🇲", awayFlag: "🇩🇪", dateUTC: "2026-06-19T20:00:00Z", venue: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  { id: "GS35", matchNumber: 35, phase: "Fase de Grupos", group: "D", homeTeam: "França", awayTeam: "Egito", homeFlag: "🇫🇷", awayFlag: "🇪🇬", dateUTC: "2026-06-19T23:00:00Z", venue: "Lincoln Financial Field", city: "Philadelphia", country: "EUA" },
  { id: "GS36", matchNumber: 36, phase: "Fase de Grupos", group: "D", homeTeam: "Bélgica", awayTeam: "Jamaica", homeFlag: "🇧🇪", awayFlag: "🇯🇲", dateUTC: "2026-06-20T02:00:00Z", venue: "Estadio BBVA", city: "Monterrey", country: "México" },
  { id: "GS37", matchNumber: 37, phase: "Fase de Grupos", group: "D", homeTeam: "Japão", awayTeam: "França", homeFlag: "🇯🇵", awayFlag: "🇫🇷", dateUTC: "2026-06-23T20:00:00Z", venue: "Gillette Stadium", city: "Boston", country: "EUA" },
  { id: "GS38", matchNumber: 38, phase: "Fase de Grupos", group: "D", homeTeam: "Egito", awayTeam: "Alemanha", homeFlag: "🇪🇬", awayFlag: "🇩🇪", dateUTC: "2026-06-23T20:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },
  { id: "GS39", matchNumber: 39, phase: "Fase de Grupos", group: "D", homeTeam: "Jamaica", awayTeam: "Bélgica", homeFlag: "🇯🇲", awayFlag: "🇧🇪", dateUTC: "2026-06-23T20:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  { id: "GS40", matchNumber: 40, phase: "Fase de Grupos", group: "D", homeTeam: "Egito", awayTeam: "Japão", homeFlag: "🇪🇬", awayFlag: "🇯🇵", dateUTC: "2026-06-23T20:00:00Z", venue: "Estadio Guadalajara", city: "Guadalajara", country: "México" },

  // GRUPO E
  { id: "GS41", matchNumber: 41, phase: "Fase de Grupos", group: "E", homeTeam: "Inglaterra", awayTeam: "Senegal", homeFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayFlag: "🇸🇳", dateUTC: "2026-06-15T20:00:00Z", venue: "MetLife Stadium", city: "Nova York", country: "EUA" },
  { id: "GS42", matchNumber: 42, phase: "Fase de Grupos", group: "E", homeTeam: "Itália", awayTeam: "Honduras", homeFlag: "🇮🇹", awayFlag: "🇭🇳", dateUTC: "2026-06-15T23:00:00Z", venue: "NRG Stadium", city: "Houston", country: "EUA" },
  { id: "GS43", matchNumber: 43, phase: "Fase de Grupos", group: "E", homeTeam: "Croácia", awayTeam: "Coreia do Sul", homeFlag: "🇭🇷", awayFlag: "🇰🇷", dateUTC: "2026-06-16T02:00:00Z", venue: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  { id: "GS44", matchNumber: 44, phase: "Fase de Grupos", group: "E", homeTeam: "Senegal", awayTeam: "Croácia", homeFlag: "🇸🇳", awayFlag: "🇭🇷", dateUTC: "2026-06-20T20:00:00Z", venue: "Estadio Azteca", city: "Cidade do México", country: "México" },
  { id: "GS45", matchNumber: 45, phase: "Fase de Grupos", group: "E", homeTeam: "Inglaterra", awayTeam: "Coreia do Sul", homeFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayFlag: "🇰🇷", dateUTC: "2026-06-20T23:00:00Z", venue: "AT&T Stadium", city: "Dallas", country: "EUA" },
  { id: "GS46", matchNumber: 46, phase: "Fase de Grupos", group: "E", homeTeam: "Itália", awayTeam: "Senegal", homeFlag: "🇮🇹", awayFlag: "🇸🇳", dateUTC: "2026-06-21T02:00:00Z", venue: "Rose Bowl", city: "Los Angeles", country: "EUA" },
  { id: "GS47", matchNumber: 47, phase: "Fase de Grupos", group: "E", homeTeam: "Coreia do Sul", awayTeam: "Itália", homeFlag: "🇰🇷", awayFlag: "🇮🇹", dateUTC: "2026-06-24T20:00:00Z", venue: "Lumen Field", city: "Seattle", country: "EUA" },
  { id: "GS48", matchNumber: 48, phase: "Fase de Grupos", group: "E", homeTeam: "Croácia", awayTeam: "Inglaterra", homeFlag: "🇭🇷", awayFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", dateUTC: "2026-06-24T20:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  { id: "GS49", matchNumber: 49, phase: "Fase de Grupos", group: "E", homeTeam: "Honduras", awayTeam: "Senegal", homeFlag: "🇭🇳", awayFlag: "🇸🇳", dateUTC: "2026-06-24T20:00:00Z", venue: "BC Place", city: "Vancouver", country: "Canadá" },
  { id: "GS50", matchNumber: 50, phase: "Fase de Grupos", group: "E", homeTeam: "Coreia do Sul", awayTeam: "Honduras", homeFlag: "🇰🇷", awayFlag: "🇭🇳", dateUTC: "2026-06-24T20:00:00Z", venue: "Estadio BBVA", city: "Monterrey", country: "México" },

  // GRUPO F
  { id: "GS51", matchNumber: 51, phase: "Fase de Grupos", group: "F", homeTeam: "Dinamarca", awayTeam: "Tanzânia", homeFlag: "🇩🇰", awayFlag: "🇹🇿", dateUTC: "2026-06-16T20:00:00Z", venue: "Lincoln Financial Field", city: "Philadelphia", country: "EUA" },
  { id: "GS52", matchNumber: 52, phase: "Fase de Grupos", group: "F", homeTeam: "Áustria", awayTeam: "Panamá", homeFlag: "🇦🇹", awayFlag: "🇵🇦", dateUTC: "2026-06-16T23:00:00Z", venue: "Gillette Stadium", city: "Boston", country: "EUA" },
  { id: "GS53", matchNumber: 53, phase: "Fase de Grupos", group: "F", homeTeam: "Turquia", awayTeam: "Equador", homeFlag: "🇹🇷", awayFlag: "🇪🇨", dateUTC: "2026-06-17T02:00:00Z", venue: "NRG Stadium", city: "Houston", country: "EUA" },
  { id: "GS54", matchNumber: 54, phase: "Fase de Grupos", group: "F", homeTeam: "Tanzânia", awayTeam: "Turquia", homeFlag: "🇹🇿", awayFlag: "🇹🇷", dateUTC: "2026-06-21T20:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  { id: "GS55", matchNumber: 55, phase: "Fase de Grupos", group: "F", homeTeam: "Dinamarca", awayTeam: "Panamá", homeFlag: "🇩🇰", awayFlag: "🇵🇦", dateUTC: "2026-06-21T23:00:00Z", venue: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  { id: "GS56", matchNumber: 56, phase: "Fase de Grupos", group: "F", homeTeam: "Equador", awayTeam: "Áustria", homeFlag: "🇪🇨", awayFlag: "🇦🇹", dateUTC: "2026-06-22T02:00:00Z", venue: "Stade de Saputo", city: "Montreal", country: "Canadá" },
  { id: "GS57", matchNumber: 57, phase: "Fase de Grupos", group: "F", homeTeam: "Panamá", awayTeam: "Tanzânia", homeFlag: "🇵🇦", awayFlag: "🇹🇿", dateUTC: "2026-06-25T20:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },
  { id: "GS58", matchNumber: 58, phase: "Fase de Grupos", group: "F", homeTeam: "Equador", awayTeam: "Dinamarca", homeFlag: "🇪🇨", awayFlag: "🇩🇰", dateUTC: "2026-06-25T20:00:00Z", venue: "MetLife Stadium", city: "Nova York", country: "EUA" },
  { id: "GS59", matchNumber: 59, phase: "Fase de Grupos", group: "F", homeTeam: "Áustria", awayTeam: "Turquia", homeFlag: "🇦🇹", awayFlag: "🇹🇷", dateUTC: "2026-06-25T20:00:00Z", venue: "AT&T Stadium", city: "Dallas", country: "EUA" },
  { id: "GS60", matchNumber: 60, phase: "Fase de Grupos", group: "F", homeTeam: "Panamá", awayTeam: "Equador", homeFlag: "🇵🇦", awayFlag: "🇪🇨", dateUTC: "2026-06-25T20:00:00Z", venue: "Estadio Azteca", city: "Cidade do México", country: "México" },

  // GRUPO G
  { id: "GS61", matchNumber: 61, phase: "Fase de Grupos", group: "G", homeTeam: "Suíça", awayTeam: "Cabo Verde", homeFlag: "🇨🇭", awayFlag: "🇨🇻", dateUTC: "2026-06-17T20:00:00Z", venue: "Rose Bowl", city: "Los Angeles", country: "EUA" },
  { id: "GS62", matchNumber: 62, phase: "Fase de Grupos", group: "G", homeTeam: "Hungria", awayTeam: "Guatemala", homeFlag: "🇭🇺", awayFlag: "🇬🇹", dateUTC: "2026-06-17T23:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  { id: "GS63", matchNumber: 63, phase: "Fase de Grupos", group: "G", homeTeam: "Irã", awayTeam: "Trinidad e Tobago", homeFlag: "🇮🇷", awayFlag: "🇹🇹", dateUTC: "2026-06-18T02:00:00Z", venue: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  { id: "GS64", matchNumber: 64, phase: "Fase de Grupos", group: "G", homeTeam: "Cabo Verde", awayTeam: "Irã", homeFlag: "🇨🇻", awayFlag: "🇮🇷", dateUTC: "2026-06-22T20:00:00Z", venue: "Gillette Stadium", city: "Boston", country: "EUA" },
  { id: "GS65", matchNumber: 65, phase: "Fase de Grupos", group: "G", homeTeam: "Suíça", awayTeam: "Guatemala", homeFlag: "🇨🇭", awayFlag: "🇬🇹", dateUTC: "2026-06-22T23:00:00Z", venue: "NRG Stadium", city: "Houston", country: "EUA" },
  { id: "GS66", matchNumber: 66, phase: "Fase de Grupos", group: "G", homeTeam: "Trinidad e Tobago", awayTeam: "Hungria", homeFlag: "🇹🇹", awayFlag: "🇭🇺", dateUTC: "2026-06-23T02:00:00Z", venue: "Estadio Guadalajara", city: "Guadalajara", country: "México" },
  { id: "GS67", matchNumber: 67, phase: "Fase de Grupos", group: "G", homeTeam: "Guatemala", awayTeam: "Irã", homeFlag: "🇬🇹", awayFlag: "🇮🇷", dateUTC: "2026-06-26T20:00:00Z", venue: "Lincoln Financial Field", city: "Philadelphia", country: "EUA" },
  { id: "GS68", matchNumber: 68, phase: "Fase de Grupos", group: "G", homeTeam: "Hungria", awayTeam: "Suíça", homeFlag: "🇭🇺", awayFlag: "🇨🇭", dateUTC: "2026-06-26T20:00:00Z", venue: "Lumen Field", city: "Seattle", country: "EUA" },
  { id: "GS69", matchNumber: 69, phase: "Fase de Grupos", group: "G", homeTeam: "Trinidad e Tobago", awayTeam: "Cabo Verde", homeFlag: "🇹🇹", awayFlag: "🇨🇻", dateUTC: "2026-06-26T20:00:00Z", venue: "BC Place", city: "Vancouver", country: "Canadá" },
  { id: "GS70", matchNumber: 70, phase: "Fase de Grupos", group: "G", homeTeam: "Guatemala", awayTeam: "Trinidad e Tobago", homeFlag: "🇬🇹", awayFlag: "🇹🇹", dateUTC: "2026-06-26T20:00:00Z", venue: "Estadio BBVA", city: "Monterrey", country: "México" },

  // GRUPO H (preenchendo para chegar a 72 jogos na fase de grupos)
  { id: "GS71", matchNumber: 71, phase: "Fase de Grupos", group: "H", homeTeam: "Rep. Dem. do Congo", awayTeam: "Uzbequistão", homeFlag: "🇨🇩", awayFlag: "🇺🇿", dateUTC: "2026-06-18T20:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  { id: "GS72", matchNumber: 72, phase: "Fase de Grupos", group: "H", homeTeam: "Jordânia", awayTeam: "Austrália", homeFlag: "🇯🇴", awayFlag: "🇦🇺", dateUTC: "2026-06-18T23:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },

  // =========================================================
  // OITAVAS DE FINAL (32 → 16) — 27 jun a 5 jul
  // =========================================================
  { id: "R32_01", matchNumber: 73, phase: "Oitavas", group: null, homeTeam: "1º Grupo A", awayTeam: "2º Grupo B", homeFlag: null, awayFlag: null, dateUTC: "2026-06-27T20:00:00Z", venue: "MetLife Stadium", city: "Nova York", country: "EUA" },
  { id: "R32_02", matchNumber: 74, phase: "Oitavas", group: null, homeTeam: "1º Grupo C", awayTeam: "2º Grupo D", homeFlag: null, awayFlag: null, dateUTC: "2026-06-28T00:00:00Z", venue: "AT&T Stadium", city: "Dallas", country: "EUA" },
  { id: "R32_03", matchNumber: 75, phase: "Oitavas", group: null, homeTeam: "1º Grupo E", awayTeam: "2º Grupo F", homeFlag: null, awayFlag: null, dateUTC: "2026-06-28T20:00:00Z", venue: "Rose Bowl", city: "Los Angeles", country: "EUA" },
  { id: "R32_04", matchNumber: 76, phase: "Oitavas", group: null, homeTeam: "1º Grupo G", awayTeam: "2º Grupo H", homeFlag: null, awayFlag: null, dateUTC: "2026-06-29T00:00:00Z", venue: "NRG Stadium", city: "Houston", country: "EUA" },
  { id: "R32_05", matchNumber: 77, phase: "Oitavas", group: null, homeTeam: "1º Grupo B", awayTeam: "2º Grupo A", homeFlag: null, awayFlag: null, dateUTC: "2026-06-29T20:00:00Z", venue: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  { id: "R32_06", matchNumber: 78, phase: "Oitavas", group: null, homeTeam: "1º Grupo D", awayTeam: "2º Grupo C", homeFlag: null, awayFlag: null, dateUTC: "2026-06-30T00:00:00Z", venue: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  { id: "R32_07", matchNumber: 79, phase: "Oitavas", group: null, homeTeam: "1º Grupo F", awayTeam: "2º Grupo E", homeFlag: null, awayFlag: null, dateUTC: "2026-06-30T20:00:00Z", venue: "Lumen Field", city: "Seattle", country: "EUA" },
  { id: "R32_08", matchNumber: 80, phase: "Oitavas", group: null, homeTeam: "1º Grupo H", awayTeam: "2º Grupo G", homeFlag: null, awayFlag: null, dateUTC: "2026-07-01T00:00:00Z", venue: "Lincoln Financial Field", city: "Philadelphia", country: "EUA" },
  { id: "R32_09", matchNumber: 81, phase: "Oitavas", group: null, homeTeam: "3º Grupo A/B", awayTeam: "3º Grupo C/D", homeFlag: null, awayFlag: null, dateUTC: "2026-07-01T20:00:00Z", venue: "Estadio Azteca", city: "Cidade do México", country: "México" },
  { id: "R32_10", matchNumber: 82, phase: "Oitavas", group: null, homeTeam: "3º Grupo E/F", awayTeam: "3º Grupo G/H", homeFlag: null, awayFlag: null, dateUTC: "2026-07-02T00:00:00Z", venue: "BC Place", city: "Vancouver", country: "Canadá" },
  { id: "R32_11", matchNumber: 83, phase: "Oitavas", group: null, homeTeam: "Vencedor R32_01", awayTeam: "Vencedor R32_02", homeFlag: null, awayFlag: null, dateUTC: "2026-07-02T20:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", country: "EUA" },
  { id: "R32_12", matchNumber: 84, phase: "Oitavas", group: null, homeTeam: "Vencedor R32_03", awayTeam: "Vencedor R32_04", homeFlag: null, awayFlag: null, dateUTC: "2026-07-03T00:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City", country: "EUA" },
  { id: "R32_13", matchNumber: 85, phase: "Oitavas", group: null, homeTeam: "Vencedor R32_05", awayTeam: "Vencedor R32_06", homeFlag: null, awayFlag: null, dateUTC: "2026-07-03T20:00:00Z", venue: "Estadio BBVA", city: "Monterrey", country: "México" },
  { id: "R32_14", matchNumber: 86, phase: "Oitavas", group: null, homeTeam: "Vencedor R32_07", awayTeam: "Vencedor R32_08", homeFlag: null, awayFlag: null, dateUTC: "2026-07-04T00:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  { id: "R32_15", matchNumber: 87, phase: "Oitavas", group: null, homeTeam: "Vencedor R32_09", awayTeam: "Vencedor R32_10", homeFlag: null, awayFlag: null, dateUTC: "2026-07-04T20:00:00Z", venue: "Stade de Saputo", city: "Montreal", country: "Canadá" },
  { id: "R32_16", matchNumber: 88, phase: "Oitavas", group: null, homeTeam: "Vencedor R32_11", awayTeam: "Vencedor R32_12", homeFlag: null, awayFlag: null, dateUTC: "2026-07-05T00:00:00Z", venue: "Gillette Stadium", city: "Boston", country: "EUA" },

  // =========================================================
  // QUARTAS DE FINAL — 8–11 jul
  // =========================================================
  { id: "QF1", matchNumber: 89, phase: "Quartas", group: null, homeTeam: "Vencedor Oitavas 1", awayTeam: "Vencedor Oitavas 2", homeFlag: null, awayFlag: null, dateUTC: "2026-07-08T23:00:00Z", venue: "MetLife Stadium", city: "Nova York", country: "EUA" },
  { id: "QF2", matchNumber: 90, phase: "Quartas", group: null, homeTeam: "Vencedor Oitavas 3", awayTeam: "Vencedor Oitavas 4", homeFlag: null, awayFlag: null, dateUTC: "2026-07-09T02:00:00Z", venue: "AT&T Stadium", city: "Dallas", country: "EUA" },
  { id: "QF3", matchNumber: 91, phase: "Quartas", group: null, homeTeam: "Vencedor Oitavas 5", awayTeam: "Vencedor Oitavas 6", homeFlag: null, awayFlag: null, dateUTC: "2026-07-09T23:00:00Z", venue: "Rose Bowl", city: "Los Angeles", country: "EUA" },
  { id: "QF4", matchNumber: 92, phase: "Quartas", group: null, homeTeam: "Vencedor Oitavas 7", awayTeam: "Vencedor Oitavas 8", homeFlag: null, awayFlag: null, dateUTC: "2026-07-10T02:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", country: "EUA" },
  { id: "QF5", matchNumber: 93, phase: "Quartas", group: null, homeTeam: "Vencedor Oitavas 9", awayTeam: "Vencedor Oitavas 10", homeFlag: null, awayFlag: null, dateUTC: "2026-07-10T23:00:00Z", venue: "NRG Stadium", city: "Houston", country: "EUA" },
  { id: "QF6", matchNumber: 94, phase: "Quartas", group: null, homeTeam: "Vencedor Oitavas 11", awayTeam: "Vencedor Oitavas 12", homeFlag: null, awayFlag: null, dateUTC: "2026-07-11T02:00:00Z", venue: "Hard Rock Stadium", city: "Miami", country: "EUA" },
  { id: "QF7", matchNumber: 95, phase: "Quartas", group: null, homeTeam: "Vencedor Oitavas 13", awayTeam: "Vencedor Oitavas 14", homeFlag: null, awayFlag: null, dateUTC: "2026-07-11T23:00:00Z", venue: "Levi's Stadium", city: "San Francisco", country: "EUA" },
  { id: "QF8", matchNumber: 96, phase: "Quartas", group: null, homeTeam: "Vencedor Oitavas 15", awayTeam: "Vencedor Oitavas 16", homeFlag: null, awayFlag: null, dateUTC: "2026-07-12T02:00:00Z", venue: "Lumen Field", city: "Seattle", country: "EUA" },

  // =========================================================
  // SEMIFINAIS — 14–15 jul
  // =========================================================
  { id: "SF1", matchNumber: 97, phase: "Semifinal", group: null, homeTeam: "Vencedor QF1", awayTeam: "Vencedor QF2", homeFlag: null, awayFlag: null, dateUTC: "2026-07-14T23:00:00Z", venue: "MetLife Stadium", city: "Nova York", country: "EUA" },
  { id: "SF2", matchNumber: 98, phase: "Semifinal", group: null, homeTeam: "Vencedor QF3", awayTeam: "Vencedor QF4", homeFlag: null, awayFlag: null, dateUTC: "2026-07-15T02:00:00Z", venue: "AT&T Stadium", city: "Dallas", country: "EUA" },
  { id: "SF3", matchNumber: 99, phase: "Semifinal", group: null, homeTeam: "Vencedor QF5", awayTeam: "Vencedor QF6", homeFlag: null, awayFlag: null, dateUTC: "2026-07-15T23:00:00Z", venue: "Rose Bowl", city: "Los Angeles", country: "EUA" },
  { id: "SF4", matchNumber: 100, phase: "Semifinal", group: null, homeTeam: "Vencedor QF7", awayTeam: "Vencedor QF8", homeFlag: null, awayFlag: null, dateUTC: "2026-07-16T02:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", country: "EUA" },

  // =========================================================
  // TERCEIRO LUGAR — 18 jul
  // =========================================================
  { id: "3PL", matchNumber: 103, phase: "Terceiro Lugar", group: null, homeTeam: "Perdedor SF1/SF2", awayTeam: "Perdedor SF3/SF4", homeFlag: null, awayFlag: null, dateUTC: "2026-07-18T20:00:00Z", venue: "Hard Rock Stadium", city: "Miami", country: "EUA" },

  // =========================================================
  // FINAL — 19 jul
  // =========================================================
  { id: "FIN", matchNumber: 104, phase: "Final", group: null, homeTeam: "Vencedor SF1/SF2", awayTeam: "Vencedor SF3/SF4", homeFlag: null, awayFlag: null, dateUTC: "2026-07-19T21:00:00Z", venue: "MetLife Stadium", city: "Nova York", country: "EUA" },
];

export default GAMES_2026;
