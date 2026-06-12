/**
 * Script: seed-missing-games
 *
 * Insere no Firestore os jogos 89, 90, 91, 92, 101 e 102 que estavam
 * ausentes. Usa set com merge:true — seguro de rodar mesmo se algum já
 * existir (não sobrescreve placares/status já definidos).
 *
 * Uso:
 *   pnpm seed-missing
 *
 * Datas e horários conforme planilha (horário de Brasília, gravado como-está).
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync, readdirSync } from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });

// ── Firebase Admin ─────────────────────────────────────────────────────────────
if (!getApps().length) {
  const files = readdirSync(".");
  const saFile = files.find(
    (f) =>
      f.endsWith(".json") &&
      (f.includes("firebase-adminsdk") || f.startsWith("serviceAccount"))
  );

  if (saFile) {
    const sa = JSON.parse(readFileSync(saFile, "utf-8"));
    console.log(`🔑  Service account: ${saFile}`);
    initializeApp({ credential: cert(sa) });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const sa = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf-8")
    );
    console.log("🔑  Service account: FIREBASE_SERVICE_ACCOUNT_B64");
    initializeApp({ credential: cert(sa) });
  } else {
    console.error("❌  Service account não encontrado.");
    process.exit(1);
  }
}

const db = getFirestore();

// ── Helper ─────────────────────────────────────────────────────────────────────

/** Grava data/hora exatamente como na planilha (horário de Brasília) */
function ts(date: string, time: string): Timestamp {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return Timestamp.fromMillis(Date.UTC(y, mo - 1, d, h, mi, 0));
}

// ── Jogos a inserir ────────────────────────────────────────────────────────────

const MISSING_GAMES = [
  // ── Oitavas ──────────────────────────────────────────────────────────────────
  {
    id: "R16_01",
    matchNumber: 89,
    phase: "Oitavas",
    group: null,
    homeTeam: "Vencedor Jogo 74",
    awayTeam: "Vencedor Jogo 77",
    homeFlag: null,
    awayFlag: null,
    date: ts("2026-07-04", "18:00"),
    venue: "Lincoln Financial Field",
    city: "Filadélfia",
    country: "EUA",
  },
  {
    id: "R16_02",
    matchNumber: 90,
    phase: "Oitavas",
    group: null,
    homeTeam: "Vencedor Jogo 73",
    awayTeam: "Vencedor Jogo 75",
    homeFlag: null,
    awayFlag: null,
    date: ts("2026-07-04", "14:00"),
    venue: "NRG Stadium",
    city: "Houston",
    country: "EUA",
  },
  {
    id: "R16_03",
    matchNumber: 91,
    phase: "Oitavas",
    group: null,
    homeTeam: "Vencedor Jogo 76",
    awayTeam: "Vencedor Jogo 78",
    homeFlag: null,
    awayFlag: null,
    date: ts("2026-07-05", "17:00"),
    venue: "MetLife Stadium",
    city: "Nova York",
    country: "EUA",
  },
  {
    id: "R16_04",
    matchNumber: 92,
    phase: "Oitavas",
    group: null,
    homeTeam: "Vencedor Jogo 79",
    awayTeam: "Vencedor Jogo 80",
    homeFlag: null,
    awayFlag: null,
    date: ts("2026-07-05", "20:00"),
    venue: "Estadio Azteca",
    city: "Cidade do México",
    country: "México",
  },
  // ── Semis ─────────────────────────────────────────────────────────────────────
  {
    id: "SF1",
    matchNumber: 101,
    phase: "Semis",
    group: null,
    homeTeam: "Vencedor Jogo 97",
    awayTeam: "Vencedor Jogo 98",
    homeFlag: null,
    awayFlag: null,
    date: ts("2026-07-14", "16:00"),
    venue: "AT&T Stadium",
    city: "Dallas",
    country: "EUA",
  },
  {
    id: "SF2",
    matchNumber: 102,
    phase: "Semis",
    group: null,
    homeTeam: "Vencedor Jogo 99",
    awayTeam: "Vencedor Jogo 100",
    homeFlag: null,
    awayFlag: null,
    date: ts("2026-07-15", "16:00"),
    venue: "Mercedes-Benz Stadium",
    city: "Atlanta",
    country: "EUA",
  },
];

// ── Execução ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`⚽  Inserindo ${MISSING_GAMES.length} jogos no Firestore...\n`);

  const batch = db.batch();

  for (const g of MISSING_GAMES) {
    const ref = db.collection("games").doc(g.id);
    batch.set(
      ref,
      {
        ...g,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
      },
      { merge: true }
    );
    console.log(`  #${String(g.matchNumber).padStart(3, "0")}  ${g.homeTeam} × ${g.awayTeam}  [${g.id}]`);
  }

  await batch.commit();
  console.log(`\n✅  ${MISSING_GAMES.length} jogos inseridos com sucesso!`);
}

main().catch((err) => {
  console.error("❌  Erro:", err);
  process.exit(1);
});
