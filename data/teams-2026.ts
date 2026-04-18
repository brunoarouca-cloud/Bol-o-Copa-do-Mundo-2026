/**
 * 48 seleções classificadas para a Copa do Mundo 2026
 * Nota: 2 vagas do playoff intercontinental ainda pendentes (marcadas com *)
 *
 * Fonte: FIFA (classificação oficial até abril/2026)
 */
export interface Team {
  name: string;
  flag: string; // emoji de bandeira
  confederation: "UEFA" | "CONMEBOL" | "CONCACAF" | "CAF" | "AFC" | "OFC";
}

export const TEAMS_2026: Team[] = [
  // CONMEBOL (6)
  { name: "Brasil", flag: "🇧🇷", confederation: "CONMEBOL" },
  { name: "Argentina", flag: "🇦🇷", confederation: "CONMEBOL" },
  { name: "Colômbia", flag: "🇨🇴", confederation: "CONMEBOL" },
  { name: "Uruguai", flag: "🇺🇾", confederation: "CONMEBOL" },
  { name: "Equador", flag: "🇪🇨", confederation: "CONMEBOL" },
  { name: "Venezuela", flag: "🇻🇪", confederation: "CONMEBOL" },

  // UEFA (16)
  { name: "Espanha", flag: "🇪🇸", confederation: "UEFA" },
  { name: "França", flag: "🇫🇷", confederation: "UEFA" },
  { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", confederation: "UEFA" },
  { name: "Alemanha", flag: "🇩🇪", confederation: "UEFA" },
  { name: "Portugal", flag: "🇵🇹", confederation: "UEFA" },
  { name: "Países Baixos", flag: "🇳🇱", confederation: "UEFA" },
  { name: "Bélgica", flag: "🇧🇪", confederation: "UEFA" },
  { name: "Itália", flag: "🇮🇹", confederation: "UEFA" },
  { name: "Croácia", flag: "🇭🇷", confederation: "UEFA" },
  { name: "Dinamarca", flag: "🇩🇰", confederation: "UEFA" },
  { name: "Áustria", flag: "🇦🇹", confederation: "UEFA" },
  { name: "Suíça", flag: "🇨🇭", confederation: "UEFA" },
  { name: "Escócia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", confederation: "UEFA" },
  { name: "Turquia", flag: "🇹🇷", confederation: "UEFA" },
  { name: "Hungria", flag: "🇭🇺", confederation: "UEFA" },
  { name: "Sérvia", flag: "🇷🇸", confederation: "UEFA" },

  // CONCACAF (6 + 3 anfitriões já classificados)
  { name: "EUA", flag: "🇺🇸", confederation: "CONCACAF" },
  { name: "México", flag: "🇲🇽", confederation: "CONCACAF" },
  { name: "Canadá", flag: "🇨🇦", confederation: "CONCACAF" },
  { name: "Costa Rica", flag: "🇨🇷", confederation: "CONCACAF" },
  { name: "Jamaica", flag: "🇯🇲", confederation: "CONCACAF" },
  { name: "Honduras", flag: "🇭🇳", confederation: "CONCACAF" },
  { name: "Panamá", flag: "🇵🇦", confederation: "CONCACAF" },
  { name: "Guatemala", flag: "🇬🇹", confederation: "CONCACAF" },
  { name: "Trinidad e Tobago", flag: "🇹🇹", confederation: "CONCACAF" },

  // CAF (9)
  { name: "Marrocos", flag: "🇲🇦", confederation: "CAF" },
  { name: "Egito", flag: "🇪🇬", confederation: "CAF" },
  { name: "Senegal", flag: "🇸🇳", confederation: "CAF" },
  { name: "Mali", flag: "🇲🇱", confederation: "CAF" },
  { name: "Costa do Marfim", flag: "🇨🇮", confederation: "CAF" },
  { name: "República Democrática do Congo", flag: "🇨🇩", confederation: "CAF" },
  { name: "Cabo Verde", flag: "🇨🇻", confederation: "CAF" },
  { name: "Camarões", flag: "🇨🇲", confederation: "CAF" },
  { name: "Tanzânia", flag: "🇹🇿", confederation: "CAF" },

  // AFC (8)
  { name: "Japão", flag: "🇯🇵", confederation: "AFC" },
  { name: "Coreia do Sul", flag: "🇰🇷", confederation: "AFC" },
  { name: "Austrália", flag: "🇦🇺", confederation: "AFC" },
  { name: "Irã", flag: "🇮🇷", confederation: "AFC" },
  { name: "Arábia Saudita", flag: "🇸🇦", confederation: "AFC" },
  { name: "Uzbequistão", flag: "🇺🇿", confederation: "AFC" },
  { name: "Jordânia", flag: "🇯🇴", confederation: "AFC" },
  { name: "Qatar", flag: "🇶🇦", confederation: "AFC" },

  // Playoff Intercontinental (2 vagas pendentes — editável pelo admin)
  { name: "Vaga Playoff 1 *", flag: "🌍", confederation: "OFC" },
  { name: "Vaga Playoff 2 *", flag: "🌍", confederation: "OFC" },
];

export const TEAM_NAMES = TEAMS_2026.map((t) => t.name);

export function getTeamByName(name: string): Team | undefined {
  return TEAMS_2026.find((t) => t.name === name);
}
