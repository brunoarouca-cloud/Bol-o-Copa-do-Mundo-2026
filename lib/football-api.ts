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
  /** null = API ainda não preencheu fullTime (delay ao encerrar). Usar placar atual do Firestore. */
  homeScore: number | null;
  /** null = API ainda não preencheu fullTime (delay ao encerrar). Usar placar atual do Firestore. */
  awayScore: number | null;
  status: "SCHEDULED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "SUSPENDED" | "POSTPONED";
  minute: number | null;
}

/**
 * Mapeamento nome PT → nome primário em inglês (football-data.org).
 * Para cada equipe, usamos o nome mais provável da API.
 */
const PT_TO_EN: Record<string, string> = {
  "México": "Mexico",
  "África do Sul": "South Africa",
  "Coreia do Sul": "Korea Republic",
  "República Tcheca": "Czechia",
  "Canadá": "Canada",
  "Bósnia e Herzegovina": "Bosnia and Herzegovina",
  "Catar": "Qatar",
  "Suíça": "Switzerland",
  // EUA: football-data.org usa "United States" (não "USA")
  "EUA": "United States",
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
  "Rep. Dem. do Congo": "Congo DR",
  "Inglaterra": "England",
  "Croácia": "Croatia",
  "Gana": "Ghana",
  "Panamá": "Panama",
};

/**
 * Aliases adicionais: variantes que a API pode retornar para o mesmo time.
 * Mapeamento: variante em inglês (lowercase normalizado) → nome primário do PT_TO_EN
 */
const API_ALIASES: Record<string, string> = {
  // EUA
  "usa": "United States",
  "united states of america": "United States",
  "us": "United States",
  // Coreia
  "south korea": "Korea Republic",
  "korea, republic of": "Korea Republic",
  // Congo
  "dr congo": "Congo DR",
  "democratic republic of congo": "Congo DR",
  "congo, dr": "Congo DR",
  "congo dr": "Congo DR",
  // Costa do Marfim
  "ivory coast": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire",
  // Turquia
  "turkey": "Türkiye",
  // República Tcheca
  "czech republic": "Czechia",
  // Bósnia
  "bosnia & herzegovina": "Bosnia and Herzegovina",
  // Irã
  "iran, islamic republic of": "Iran",
  "iran (islamic republic of)": "Iran",
  // Países Baixos
  "holland": "Netherlands",
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
    console.error(`[football-api] football-data.org error ${res.status}: ${text}`);
    return [];
  }

  const data = await res.json();
  const matches: LiveMatch[] = [];

  console.log(`[football-api] ${data.matches?.length ?? 0} partida(s) retornada(s) para ${date}`);

  for (const m of data.matches ?? []) {
    // football-data.org: score.fullTime é o placar atual (ao vivo) e o placar final.
    // score.halfTime é APENAS o placar do intervalo (45 min) — não deve ser usado
    // como fallback para partidas FINISHED, pois daria o placar errado.
    //
    // Para FINISHED: usar apenas fullTime. Se for null (delay da API ao encerrar),
    // retornamos null → live-scores.ts manterá o placar atual do Firestore como final.
    // Para IN_PLAY/PAUSED: fullTime tem o placar ao vivo; halfTime como fallback razoável.
    const isMatchFinished = m.status === "FINISHED";

    const fullTimeHome = m.score?.fullTime?.home ?? null;
    const fullTimeAway = m.score?.fullTime?.away ?? null;
    const halfTimeHome = m.score?.halfTime?.home ?? null;
    const halfTimeAway = m.score?.halfTime?.away ?? null;

    // Para encerradas: só fullTime. Para ao vivo: fullTime ou halfTime (exibe placar do 1º tempo).
    const homeScore: number | null = isMatchFinished
      ? fullTimeHome                                 // null se API ainda não preencheu
      : (fullTimeHome ?? halfTimeHome ?? 0);
    const awayScore: number | null = isMatchFinished
      ? fullTimeAway
      : (fullTimeAway ?? halfTimeAway ?? 0);

    // Captura name e shortName (a API pode usar um ou outro dependendo da competição)
    const homeName = m.homeTeam?.name ?? m.homeTeam?.shortName ?? m.homeTeam?.tla ?? "";
    const awayName = m.awayTeam?.name ?? m.awayTeam?.shortName ?? m.awayTeam?.tla ?? "";

    console.log(`[football-api]   ${homeName} ${homeScore ?? "?"}×${awayScore ?? "?"} ${awayName} (${m.status})`);

    matches.push({
      externalId: m.id,
      homeTeamEn: homeName,
      awayTeamEn: awayName,
      homeScore,   // pode ser null para FINISHED com delay
      awayScore,
      status: m.status,
      minute: m.minute ?? null,
    });
  }

  return matches;
}

/**
 * Resolve o nome primário em inglês a partir do nome retornado pela API.
 * Tenta: mapeamento direto → aliases → passthrough.
 */
function resolveApiName(apiName: string): string {
  const norm = normalize(apiName);
  // 1. Busca direta no mapa invertido (EN → EN)
  for (const [en] of Object.entries(PT_TO_EN)) {
    if (normalize(PT_TO_EN[en]) === norm) return PT_TO_EN[en];
  }
  // 2. Busca em aliases
  if (API_ALIASES[norm]) return API_ALIASES[norm];
  // Busca parcial em aliases
  for (const [alias, primary] of Object.entries(API_ALIASES)) {
    if (norm.includes(alias) || alias.includes(norm)) return primary;
  }
  // 3. Fallback: devolve como veio
  return apiName;
}

/**
 * Verifica se um game do Firestore (por nomes PT) corresponde a um LiveMatch da API.
 * Usa matching em múltiplas camadas para robustez com variações de nome.
 */
export function matchesGame(
  liveMatch: LiveMatch,
  homePt: string,
  awayPt: string
): boolean {
  const homeEnExpected = PT_TO_EN[homePt];
  const awayEnExpected = PT_TO_EN[awayPt];
  if (!homeEnExpected || !awayEnExpected) {
    console.warn(`[football-api] matchesGame: sem mapeamento PT→EN para "${homePt}" ou "${awayPt}"`);
    return false;
  }

  // Normaliza o que veio da API (resolve aliases)
  const homeApiNorm = normalize(resolveApiName(liveMatch.homeTeamEn));
  const awayApiNorm = normalize(resolveApiName(liveMatch.awayTeamEn));
  const homeExpNorm = normalize(homeEnExpected);
  const awayExpNorm = normalize(awayEnExpected);

  // Match exato (após normalização)
  if (homeApiNorm === homeExpNorm && awayApiNorm === awayExpNorm) return true;

  // Match por substring (fallback para nomes parciais da API)
  const homeMatch =
    homeApiNorm.includes(homeExpNorm) || homeExpNorm.includes(homeApiNorm);
  const awayMatch =
    awayApiNorm.includes(awayExpNorm) || awayExpNorm.includes(awayApiNorm);

  return homeMatch && awayMatch;
}
