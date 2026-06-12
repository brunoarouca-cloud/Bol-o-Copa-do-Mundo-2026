/**
 * lib/sync-games.ts
 *
 * Lógica central de sincronização dos jogos eliminatórios com a football-data.org API.
 * Usada pelo script CLI (scripts/sync-knockout.ts) e pelo endpoint admin
 * (/api/admin/sync-games).
 *
 * Estratégia de matching: cada jogo tem uma data+hora UTC única → usamos
 * isso para parear o registro da API com o documento Firestore correspondente.
 *
 * Campos atualizados:
 *  - homeTeam / awayTeam  (nomes em PT, ou placeholder "A definir" se TBD)
 *  - homeFlag / awayFlag  (URL do escudo via football-data.org)
 *  - venue / city / country
 *  - date                 (Timestamp — por segurança de eventuais ajustes)
 *  - externalId           (ID numérico da API para futuro uso no live-scores)
 *
 * Campos NUNCA sobrescritos:
 *  - homeScore / awayScore / status / points (geridos pelo fluxo de resultados)
 */

import type { Firestore, Timestamp } from "firebase-admin/firestore";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SyncResult {
  updated: number;
  skipped: number;
  unchanged: number;
  errors: string[];
  details: Array<{
    gameId: string;
    matchNumber: number;
    homeTeam: string;
    awayTeam: string;
    action: "updated" | "unchanged" | "skipped";
  }>;
}

interface ApiMatch {
  id: number;
  utcDate: string;
  stage: string;
  homeTeam: { name: string; shortName?: string; crest?: string };
  awayTeam: { name: string; shortName?: string; crest?: string };
  venue?: string;
}

// ── Mapeamentos ───────────────────────────────────────────────────────────────

/** Stages da API → fases do app (em PT) */
const STAGE_TO_PHASE: Record<string, string> = {
  ROUND_OF_32:    "16 avos",
  LAST_32:        "16 avos",
  ROUND_OF_16:    "Oitavas",
  LAST_16:        "Oitavas",
  QUARTER_FINALS: "Quartas",
  SEMI_FINALS:    "Semis",
  THIRD_PLACE:    "Terceiro Lugar",
  PLAY_OFF_FOR_THIRD_PLACE: "Terceiro Lugar",
  FINAL:          "Final",
};

/** Knockout stages a sincronizar (exclui fase de grupos) */
const KNOCKOUT_STAGES = new Set(Object.keys(STAGE_TO_PHASE));

/** Nome em inglês (API) → português (app) */
const EN_TO_PT: Record<string, string> = {
  "mexico":                 "México",
  "south africa":           "África do Sul",
  "south korea":            "Coreia do Sul",
  "czechia":                "República Tcheca",
  "czech republic":         "República Tcheca",
  "canada":                 "Canadá",
  "bosnia and herzegovina": "Bósnia e Herzegovina",
  "qatar":                  "Catar",
  "switzerland":            "Suíça",
  "usa":                    "EUA",
  "united states":          "EUA",
  "paraguay":               "Paraguai",
  "australia":              "Austrália",
  "türkiye":                "Turquia",
  "turkey":                 "Turquia",
  "brazil":                 "Brasil",
  "morocco":                "Marrocos",
  "haiti":                  "Haiti",
  "scotland":               "Escócia",
  "germany":                "Alemanha",
  "curaçao":                "Curaçao",
  "curacao":                "Curaçao",
  "côte d'ivoire":          "Costa do Marfim",
  "ivory coast":            "Costa do Marfim",
  "ecuador":                "Equador",
  "netherlands":            "Países Baixos",
  "japan":                  "Japão",
  "tunisia":                "Tunísia",
  "sweden":                 "Suécia",
  "belgium":                "Bélgica",
  "egypt":                  "Egito",
  "iran":                   "Irã",
  "new zealand":            "Nova Zelândia",
  "spain":                  "Espanha",
  "cape verde":             "Cabo Verde",
  "saudi arabia":           "Arábia Saudita",
  "uruguay":                "Uruguai",
  "france":                 "França",
  "senegal":                "Senegal",
  "norway":                 "Noruega",
  "iraq":                   "Iraque",
  "argentina":              "Argentina",
  "algeria":                "Argélia",
  "austria":                "Áustria",
  "jordan":                 "Jordânia",
  "portugal":               "Portugal",
  "uzbekistan":             "Uzbequistão",
  "colombia":               "Colômbia",
  "dr congo":               "Rep. Dem. do Congo",
  "democratic republic of congo": "Rep. Dem. do Congo",
  "england":                "Inglaterra",
  "croatia":                "Croácia",
  "ghana":                  "Gana",
  "panama":                 "Panamá",
};

/** Mapa cidade API (venue substring) → cidade PT / país */
const VENUE_CITY: Record<string, { city: string; country: string }> = {
  "metlife":        { city: "Nova York",        country: "EUA" },
  "at&t":           { city: "Dallas",            country: "EUA" },
  "rose bowl":      { city: "Los Angeles",       country: "EUA" },
  "nrg":            { city: "Houston",           country: "EUA" },
  "hard rock":      { city: "Miami",             country: "EUA" },
  "levi":           { city: "São Francisco",     country: "EUA" },
  "lumen":          { city: "Seattle",           country: "EUA" },
  "lincoln":        { city: "Filadélfia",        country: "EUA" },
  "azteca":         { city: "Cidade do México",  country: "México" },
  "bc place":       { city: "Vancouver",         country: "Canadá" },
  "mercedes":       { city: "Atlanta",           country: "EUA" },
  "arrowhead":      { city: "Kansas City",       country: "EUA" },
  "bbva":           { city: "Monterrey",         country: "México" },
  "sofi":           { city: "Los Angeles",       country: "EUA" },
  "bmo":            { city: "Toronto",           country: "Canadá" },
  "gillette":       { city: "Boston",            country: "EUA" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function resolveTeamPt(apiName: string): string | null {
  if (!apiName || apiName === "TBD" || apiName === "") return null;
  const norm = normalize(apiName);
  // Busca direta
  if (EN_TO_PT[norm]) return EN_TO_PT[norm];
  // Busca parcial
  for (const [en, pt] of Object.entries(EN_TO_PT)) {
    if (normalize(en) === norm || norm.includes(normalize(en))) return pt;
  }
  // Retorna o nome original se não encontrou tradução (pode ser correto)
  return apiName;
}

function resolveCityCountry(venue: string): { city: string; country: string } | null {
  const vLow = venue.toLowerCase();
  for (const [key, val] of Object.entries(VENUE_CITY)) {
    if (vLow.includes(key)) return val;
  }
  return null;
}

/** Converte UTC ISO string para timestamp em segundos (para comparação) */
function toSec(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

// ── Fetch da API ──────────────────────────────────────────────────────────────

async function fetchAllMatches(apiKey: string): Promise<ApiMatch[]> {
  const BASE = "https://api.football-data.org/v4";
  const COMP = 2000; // FIFA World Cup

  // Busca todos os jogos — API retorna até 100 por página; com 104 jogos
  // pode ser necessário paginar. Usamos limit=120 para cobrir de uma vez.
  const res = await fetch(
    `${BASE}/competitions/${COMP}/matches?limit=120`,
    { headers: { "X-Auth-Token": apiKey } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data.org ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.matches ?? []) as ApiMatch[];
}

// ── Sync principal ────────────────────────────────────────────────────────────

export async function syncKnockoutGames(
  db: Firestore,
  apiKey: string
): Promise<SyncResult> {
  const result: SyncResult = {
    updated: 0,
    skipped: 0,
    unchanged: 0,
    errors: [],
    details: [],
  };

  // 1. Busca todos os jogos da API
  const allMatches = await fetchAllMatches(apiKey);

  // 2. Filtra apenas fases eliminatórias
  const knockoutMatches = allMatches.filter((m) => KNOCKOUT_STAGES.has(m.stage));

  if (knockoutMatches.length === 0) {
    result.errors.push("Nenhum jogo eliminatório encontrado na API. Verifique se a Copa 2026 está cadastrada na football-data.org (ID 2000).");
    return result;
  }

  // 3. Busca todos os jogos eliminatórios do Firestore
  const gamesSnap = await db
    .collection("games")
    .where("phase", "in", ["16 avos", "Oitavas", "Quartas", "Semis", "Terceiro Lugar", "Final"])
    .get();

  // Indexa Firestore por timestamp UTC (arredondado ao minuto)
  const firestoreByMinute = new Map<
    number,
    { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData }
  >();

  for (const doc of gamesSnap.docs) {
    const d = doc.data();
    const dateTs = (d.date as Timestamp).toDate();
    const minute = Math.floor(dateTs.getTime() / 60000);
    firestoreByMinute.set(minute, { ref: doc.ref, data: d });
  }

  // 4. Para cada jogo da API, localiza o documento Firestore e atualiza
  for (const apiMatch of knockoutMatches) {
    const apiMinute = Math.floor(new Date(apiMatch.utcDate).getTime() / 60000);

    // Tolera ±1 minuto
    let found: { ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData } | undefined;
    for (const delta of [0, 1, -1]) {
      found = firestoreByMinute.get(apiMinute + delta);
      if (found) break;
    }

    if (!found) {
      result.skipped++;
      result.errors.push(
        `Jogo da API sem correspondência no Firestore: ${apiMatch.homeTeam.name} × ${apiMatch.awayTeam.name} em ${apiMatch.utcDate}`
      );
      continue;
    }

    const { ref, data: existing } = found;
    const updates: Record<string, unknown> = {};

    // ── Times ──────────────────────────────────────────────────────────────
    const homePt = resolveTeamPt(apiMatch.homeTeam.name);
    const awayPt = resolveTeamPt(apiMatch.awayTeam.name);

    // Só sobrescreve se veio um nome real (não TBD)
    if (homePt && homePt !== existing.homeTeam) {
      updates.homeTeam = homePt;
    }
    if (awayPt && awayPt !== existing.awayTeam) {
      updates.awayTeam = awayPt;
    }

    // ── Escudos ────────────────────────────────────────────────────────────
    if (apiMatch.homeTeam.crest && apiMatch.homeTeam.crest !== existing.homeFlag) {
      updates.homeFlag = apiMatch.homeTeam.crest;
    }
    if (apiMatch.awayTeam.crest && apiMatch.awayTeam.crest !== existing.awayFlag) {
      updates.awayFlag = apiMatch.awayTeam.crest;
    }

    // ── Sede ───────────────────────────────────────────────────────────────
    if (apiMatch.venue) {
      if (apiMatch.venue !== existing.venue) {
        updates.venue = apiMatch.venue;
      }
      const loc = resolveCityCountry(apiMatch.venue);
      if (loc) {
        if (loc.city !== existing.city)       updates.city    = loc.city;
        if (loc.country !== existing.country) updates.country = loc.country;
      }
    }

    // ── External ID (para live-scores) ────────────────────────────────────
    if (apiMatch.id && apiMatch.id !== existing.externalId) {
      updates.externalId = apiMatch.id;
    }

    // ── Fase (por segurança) ───────────────────────────────────────────────
    const correctPhase = STAGE_TO_PHASE[apiMatch.stage];
    if (correctPhase && correctPhase !== existing.phase) {
      updates.phase = correctPhase;
    }

    if (Object.keys(updates).length === 0) {
      result.unchanged++;
      result.details.push({
        gameId: ref.id,
        matchNumber: existing.matchNumber,
        homeTeam: existing.homeTeam,
        awayTeam: existing.awayTeam,
        action: "unchanged",
      });
      continue;
    }

    try {
      await ref.update(updates);
      result.updated++;
      result.details.push({
        gameId: ref.id,
        matchNumber: existing.matchNumber,
        homeTeam: (updates.homeTeam as string) ?? existing.homeTeam,
        awayTeam: (updates.awayTeam as string) ?? existing.awayTeam,
        action: "updated",
      });
    } catch (err) {
      result.errors.push(`Erro ao atualizar ${ref.id}: ${String(err)}`);
      result.skipped++;
    }
  }

  return result;
}
