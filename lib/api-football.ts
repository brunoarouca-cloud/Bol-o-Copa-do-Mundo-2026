/**
 * Cliente para api-football.com (v3)
 * Usado para amistosos e jogos de teste que não estão na football-data.org
 * Free tier: 100 req/dia
 * Env var: API_FOOTBALL_KEY
 */

const BASE_URL = "https://v3.football.api-sports.io";

export interface ApiFootballMatch {
  fixtureId: number;
  homeTeamEn: string;
  awayTeamEn: string;
  homeScore: number;
  awayScore: number;
  status: "NS" | "1H" | "HT" | "2H" | "ET" | "PEN" | "FT" | "AET" | "PEN" | "SUSP" | "INT" | "PST" | "CANC" | "ABD" | "AWD" | "WO" | "LIVE";
  elapsed: number | null;
}

/** Nomes PT → EN para times brasileiros e comuns em amistosos */
const PT_TO_EN_FRIENDLY: Record<string, string[]> = {
  "Brasil":         ["Brazil"],
  "Argentina":      ["Argentina"],
  "França":         ["France"],
  "Alemanha":       ["Germany"],
  "Espanha":        ["Spain"],
  "Portugal":       ["Portugal"],
  "Inglaterra":     ["England"],
  "Itália":         ["Italy"],
  "Países Baixos":  ["Netherlands"],
  "Bélgica":        ["Belgium"],
  "Croácia":        ["Croatia"],
  "Uruguai":        ["Uruguay"],
  "Colômbia":       ["Colombia"],
  "México":         ["Mexico"],
  "EUA":            ["USA", "United States"],
  "Japão":          ["Japan"],
  "Coreia do Sul":  ["South Korea"],
  "Marrocos":       ["Morocco"],
  "Senegal":        ["Senegal"],
  "Egito":          ["Egypt"],
  "Nigéria":        ["Nigeria"],
  "Gana":           ["Ghana"],
  "Camarões":       ["Cameroon"],
  "Costa do Marfim":["Ivory Coast", "Côte d'Ivoire"],
  "Tunísia":        ["Tunisia"],
  "Argélia":        ["Algeria"],
  "África do Sul":  ["South Africa"],
  "Arábia Saudita": ["Saudi Arabia"],
  "Irã":            ["Iran"],
  "Austrália":      ["Australia"],
  "Suíça":          ["Switzerland"],
  "Suécia":         ["Sweden"],
  "Dinamarca":      ["Denmark"],
  "Noruega":        ["Norway"],
  "Áustria":        ["Austria"],
  "Polônia":        ["Poland"],
  "Turquia":        ["Turkey", "Türkiye"],
  "Sérvia":         ["Serbia"],
  "Escócia":        ["Scotland"],
  "Rep. Tcheca":    ["Czech Republic", "Czechia"],
};

function normalize(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function teamsMatch(apiName: string, ptName: string): boolean {
  const normApi = normalize(apiName);
  const aliases = PT_TO_EN_FRIENDLY[ptName] ?? [ptName];
  return aliases.some((alias) => normalize(alias) === normApi);
}

/**
 * Busca todas as partidas ao vivo e recentes na API-Football.
 * Retorna LIVE + partidas de hoje (para pegar jogos que acabaram de encerrar).
 */
export async function fetchLiveMatchesApiFootball(): Promise<ApiFootballMatch[]> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.warn("[api-football] API_FOOTBALL_KEY não configurada");
    return [];
  }

  try {
    // Busca partidas ao vivo
    const res = await fetch(`${BASE_URL}/fixtures?live=all`, {
      headers: {
        "x-apisports-key": apiKey,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error(`[api-football] Erro ${res.status}: ${await res.text()}`);
      return [];
    }

    const data = await res.json();
    const matches: ApiFootballMatch[] = [];

    for (const fixture of data.response ?? []) {
      const statusShort = fixture.fixture?.status?.short ?? "NS";
      const isLiveOrFinished = ["1H","HT","2H","ET","PEN","FT","AET","LIVE"].includes(statusShort);
      if (!isLiveOrFinished) continue;

      matches.push({
        fixtureId:   fixture.fixture?.id,
        homeTeamEn:  fixture.teams?.home?.name ?? "",
        awayTeamEn:  fixture.teams?.away?.name ?? "",
        homeScore:   fixture.goals?.home ?? 0,
        awayScore:   fixture.goals?.away ?? 0,
        status:      statusShort,
        elapsed:     fixture.fixture?.status?.elapsed ?? null,
      });
    }

    return matches;
  } catch (err) {
    console.error("[api-football] Erro:", err);
    return [];
  }
}

/**
 * Verifica se um LiveMatch da API-Football corresponde a um jogo do Firestore (por nomes PT).
 */
export function matchesGameApiFootball(
  match: ApiFootballMatch,
  homePt: string,
  awayPt: string
): boolean {
  return teamsMatch(match.homeTeamEn, homePt) && teamsMatch(match.awayTeamEn, awayPt);
}

/**
 * Traduz status da API-Football para o status interno do Firestore.
 */
export function apiFootballStatusToInternal(status: ApiFootballMatch["status"]): "live" | "finished" {
  return status === "FT" || status === "AET" || status === "PEN" ? "finished" : "live";
}
