/**
 * Cliente para football-data.org API v4
 * Free tier: 10 req/min — suficiente para pooling a cada 60s
 * Env var: FOOTBALL_DATA_API_KEY
 *
 * Competition ID para FIFA World Cup: 2000
 */

const BASE_URL = "https://api.football-data.org/v4";
const COMPETITION_ID = 2000; // FIFA World Cup

export interface LiveMatch {
  externalId: number;
  homeTeamEn: string;
  awayTeamEn: string;
  homeScore: number;
  awayScore: number;
  status: "SCHEDULED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "SUSPENDED" | "POSTPONED";
  minute: number | null;
}

/**
 * Mapeamento nome PT → nome em inglês (usado pela football-data.org)
 * Adicione variações caso a API retorne nomes diferentes.
 */
const PT_TO_EN: Record<string, string> = {
  "México": "Mexico",
  "África do Sul": "South Africa",
  "Coreia do Sul": "South Korea",
  "República Tcheca": "Czechia",
  "Canadá": "Canada",
  "Bósnia e Herzegovina": "Bosnia and Herzegovina",
  "Catar": "Qatar",
  "Suíça": "Switzerland",
  "EUA": "USA",
  "Paraguai": "Paraguay",
  "Austrália": "Australia",
  "Turquia": "Türkiye",
  "Brasil": "Brazil",
  "Marrocos": "Morocco",
  "Haiti": "Haiti",
  "Escócia": "Scotland",
  "Alemanha": "Germany",
  "Curaçao": "Curaçao",
  "Costa do Marfim": "Côte d'Ivoire",
  "Equador": "Ecuador",
  "Países Baixos": "Netherlands",
  "Japão": "Japan",
  "Tunísia": "Tunisia",
  "Suécia": "Sweden",
  "Bélgica": "Belgium",
  "Egito": "Egypt",
  "Irã": "Iran",
  "Nova Zelândia": "New Zealand",
  "Espanha": "Spain",
  "Cabo Verde": "Cape Verde",
  "Arábia Saudita": "Saudi Arabia",
  "Uruguai": "Uruguay",
  "França": "France",
  "Senegal": "Senegal",
  "Noruega": "Norway",
  "Iraque": "Iraq",
  "Argentina": "Argentina",
  "Argélia": "Algeria",
  "Áustria": "Austria",
  "Jordânia": "Jordan",
  "Portugal": "Portugal",
  "Uzbequistão": "Uzbekistan",
  "Colômbia": "Colombia",
  "Rep. Dem. do Congo": "DR Congo",
  "Inglaterra": "England",
  "Croácia": "Croatia",
  "Gana": "Ghana",
  "Panamá": "Panama",
};

/** Inverso: EN → PT (para resolver o match depois) */
const EN_TO_PT: Record<string, string> = Object.fromEntries(
  Object.entries(PT_TO_EN).map(([pt, en]) => [en.toLowerCase(), pt])
);

/**
 * Normaliza nome de time para comparação (lowercase, sem acentos, sem espaços extras)
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Tenta encontrar o nome PT a partir de um nome retornado pela API
 */
export function resolveTeamPt(apiName: string): string | null {
  const norm = normalize(apiName);
  // Busca direta no mapa EN→PT
  for (const [en, pt] of Object.entries(EN_TO_PT)) {
    if (normalize(en) === norm) return pt;
  }
  // Busca por substring (fallback)
  for (const [en, pt] of Object.entries(EN_TO_PT)) {
    if (normalize(en).includes(norm) || norm.includes(normalize(en))) return pt;
  }
  return null;
}

/**
 * Busca partidas ao vivo e pausadas da Copa do Mundo para uma data específica.
 * Se dateStr for omitido usa a data de hoje (UTC).
 */
export async function fetchLiveMatches(dateStr?: string): Promise<LiveMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.warn("[football-api] FOOTBALL_DATA_API_KEY não configurada");
    return [];
  }

  const date = dateStr ?? new Date().toISOString().slice(0, 10);

  const url = `${BASE_URL}/competitions/${COMPETITION_ID}/matches?dateFrom=${date}&dateTo=${date}&status=IN_PLAY,PAUSED,FINISHED`;

  const res = await fetch(url, {
    headers: { "X-Auth-Token": apiKey },
    next: { revalidate: 0 }, // sem cache no Next.js
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data.org API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const matches: LiveMatch[] = [];

  for (const m of data.matches ?? []) {
    const homeScore = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0;
    const awayScore = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0;
    matches.push({
      externalId: m.id,
      homeTeamEn: m.homeTeam?.name ?? "",
      awayTeamEn: m.awayTeam?.name ?? "",
      homeScore: homeScore ?? 0,
      awayScore: awayScore ?? 0,
      status: m.status,
      minute: m.minute ?? null,
    });
  }

  return matches;
}

/**
 * Verifica se um game do Firestore (por nomes PT) corresponde a um LiveMatch da API.
 */
export function matchesGame(
  liveMatch: LiveMatch,
  homePt: string,
  awayPt: string
): boolean {
  const homeEn = PT_TO_EN[homePt];
  const awayEn = PT_TO_EN[awayPt];
  if (!homeEn || !awayEn) return false;

  return (
    normalize(liveMatch.homeTeamEn) === normalize(homeEn) &&
    normalize(liveMatch.awayTeamEn) === normalize(awayEn)
  );
}
