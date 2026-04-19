/**
 * 48 seleções classificadas para a Copa do Mundo 2026
 *
 * Grupos (sorteio FIFA):
 *   A: México, Coreia do Sul, República Tcheca, África do Sul
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
 */
export interface Team {
  name: string;
  flag: string; // emoji de bandeira
  confederation: "UEFA" | "CONMEBOL" | "CONCACAF" | "CAF" | "AFC" | "OFC";
}

export const TEAMS_2026: Team[] = [
  // CONMEBOL (6)
  { name: "Brasil",    flag: "🇧🇷", confederation: "CONMEBOL" },
  { name: "Argentina", flag: "🇦🇷", confederation: "CONMEBOL" },
  { name: "Colômbia",  flag: "🇨🇴", confederation: "CONMEBOL" },
  { name: "Uruguai",   flag: "🇺🇾", confederation: "CONMEBOL" },
  { name: "Equador",   flag: "🇪🇨", confederation: "CONMEBOL" },
  { name: "Paraguai",  flag: "🇵🇾", confederation: "CONMEBOL" },

  // UEFA (16)
  { name: "Espanha",              flag: "🇪🇸", confederation: "UEFA" },
  { name: "França",               flag: "🇫🇷", confederation: "UEFA" },
  { name: "Inglaterra",           flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", confederation: "UEFA" },
  { name: "Alemanha",             flag: "🇩🇪", confederation: "UEFA" },
  { name: "Portugal",             flag: "🇵🇹", confederation: "UEFA" },
  { name: "Países Baixos",        flag: "🇳🇱", confederation: "UEFA" },
  { name: "Bélgica",              flag: "🇧🇪", confederation: "UEFA" },
  { name: "Croácia",              flag: "🇭🇷", confederation: "UEFA" },
  { name: "Áustria",              flag: "🇦🇹", confederation: "UEFA" },
  { name: "Suíça",                flag: "🇨🇭", confederation: "UEFA" },
  { name: "Escócia",              flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", confederation: "UEFA" },
  { name: "Turquia",              flag: "🇹🇷", confederation: "UEFA" },
  { name: "Noruega",              flag: "🇳🇴", confederation: "UEFA" },
  { name: "Suécia",               flag: "🇸🇪", confederation: "UEFA" },
  { name: "República Tcheca",     flag: "🇨🇿", confederation: "UEFA" },
  { name: "Bósnia e Herzegovina", flag: "🇧🇦", confederation: "UEFA" },

  // CONCACAF (6)
  { name: "EUA",     flag: "🇺🇸", confederation: "CONCACAF" },
  { name: "México",  flag: "🇲🇽", confederation: "CONCACAF" },
  { name: "Canadá",  flag: "🇨🇦", confederation: "CONCACAF" },
  { name: "Panamá",  flag: "🇵🇦", confederation: "CONCACAF" },
  { name: "Curaçao", flag: "🇨🇼", confederation: "CONCACAF" },
  { name: "Haiti",   flag: "🇭🇹", confederation: "CONCACAF" },

  // CAF (10)
  { name: "Marrocos",           flag: "🇲🇦", confederation: "CAF" },
  { name: "Egito",              flag: "🇪🇬", confederation: "CAF" },
  { name: "Senegal",            flag: "🇸🇳", confederation: "CAF" },
  { name: "Costa do Marfim",    flag: "🇨🇮", confederation: "CAF" },
  { name: "Rep. Dem. do Congo", flag: "🇨🇩", confederation: "CAF" },
  { name: "Cabo Verde",         flag: "🇨🇻", confederation: "CAF" },
  { name: "África do Sul",      flag: "🇿🇦", confederation: "CAF" },
  { name: "Gana",               flag: "🇬🇭", confederation: "CAF" },
  { name: "Argélia",            flag: "🇩🇿", confederation: "CAF" },
  { name: "Tunísia",            flag: "🇹🇳", confederation: "CAF" },

  // AFC (9)
  { name: "Japão",          flag: "🇯🇵", confederation: "AFC" },
  { name: "Coreia do Sul",  flag: "🇰🇷", confederation: "AFC" },
  { name: "Austrália",      flag: "🇦🇺", confederation: "AFC" },
  { name: "Irã",            flag: "🇮🇷", confederation: "AFC" },
  { name: "Arábia Saudita", flag: "🇸🇦", confederation: "AFC" },
  { name: "Uzbequistão",    flag: "🇺🇿", confederation: "AFC" },
  { name: "Jordânia",       flag: "🇯🇴", confederation: "AFC" },
  { name: "Catar",          flag: "🇶🇦", confederation: "AFC" },
  { name: "Iraque",         flag: "🇮🇶", confederation: "AFC" },

  // OFC (1)
  { name: "Nova Zelândia", flag: "🇳🇿", confederation: "OFC" },
];

export const TEAM_NAMES = TEAMS_2026.map((t) => t.name);

export function getTeamByName(name: string): Team | undefined {
  return TEAMS_2026.find((t) => t.name === name);
}
