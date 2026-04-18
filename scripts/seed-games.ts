/**
 * Seed script — popula jogos e configurações padrão no Firestore
 * Execução: pnpm seed
 *
 * Idempotente: usa set com merge:true, pode rodar várias vezes sem duplicar dados.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import GAMES_2026 from "../data/games-2026";
import { NOMINAL_DEADLINE_UTC } from "../lib/time";

// Inicializa Firebase Admin
if (!getApps().length) {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 não definido em .env.local");
  const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  initializeApp({ credential: cert(sa) });
}

const db = getFirestore();

async function seedGames() {
  console.log("🌱 Iniciando seed dos jogos...");
  const batch = db.batch();
  let count = 0;

  for (const g of GAMES_2026) {
    const ref = db.collection("games").doc(g.id);
    batch.set(
      ref,
      {
        id: g.id,
        matchNumber: g.matchNumber,
        phase: g.phase,
        group: g.group,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        homeFlag: g.homeFlag,
        awayFlag: g.awayFlag,
        date: Timestamp.fromDate(new Date(g.dateUTC)),
        venue: g.venue,
        city: g.city,
        country: g.country,
        homeScore: null,
        awayScore: null,
        status: "upcoming",
      },
      { merge: true }
    );
    count++;

    // Firestore limita batch a 500 operações
    if (count % 490 === 0) {
      await batch.commit();
      console.log(`   ${count} jogos escritos...`);
    }
  }

  await batch.commit();
  console.log(`✅ ${count} jogos seeded com sucesso!`);
}

async function seedScoringSettings() {
  console.log("🌱 Configurando pontuação padrão...");

  await db
    .collection("settings")
    .doc("scoring")
    .set(
      {
        exactScore: 20,
        correctWinnerOneScore: 15,
        correctWinner: 10,
        oneTeamScore: 5,
        correctDraw: 13,
        nominalBet: 50,
        nominalDeadline: Timestamp.fromDate(NOMINAL_DEADLINE_UTC),
        lockMinutesBefore: 5,
      },
      { merge: true }
    );

  console.log("✅ Configurações de pontuação salvas!");
}

async function seedNominalResults() {
  console.log("🌱 Criando documento de resultados nominais...");

  await db
    .collection("nominalResults")
    .doc("global")
    .set(
      {
        topScorer: null,
        champion: null,
        runnerUp: null,
        thirdPlace: null,
        updatedAt: null,
      },
      { merge: true }
    );

  console.log("✅ Resultados nominais inicializados!");
}

async function main() {
  try {
    await seedGames();
    await seedScoringSettings();
    await seedNominalResults();
    console.log("\n🎉 Seed completo!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro no seed:", err);
    process.exit(1);
  }
}

main();
