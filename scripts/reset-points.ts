/**
 * Script para zerar pontuação de todos os usuários.
 * Execução: pnpm tsx scripts/reset-points.ts
 *
 * Use quando houver pontuações residuais de testes.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readdirSync, readFileSync } from "fs";

if (!getApps().length) {
  const files = readdirSync(".");
  const saFile = files.find(
    (f) => f.endsWith(".json") && (f.includes("firebase-adminsdk") || f.startsWith("serviceAccount"))
  );
  if (!saFile) throw new Error("Arquivo serviceAccount não encontrado na pasta raiz.");
  const serviceAccount = JSON.parse(readFileSync(saFile, "utf-8"));
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function resetPoints() {
  console.log("🔄 Buscando usuários...");
  const usersSnap = await db.collection("users").get();

  if (usersSnap.empty) {
    console.log("Nenhum usuário encontrado.");
    return;
  }

  const BATCH_SIZE = 500;
  let total = 0;

  for (let i = 0; i < usersSnap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = usersSnap.docs.slice(i, i + BATCH_SIZE);
    chunk.forEach((doc) => {
      batch.update(doc.ref, { totalPoints: 0, exactHits: 0, rank: 0 });
    });
    await batch.commit();
    total += chunk.length;
  }

  console.log(`✅ ${total} usuário(s) zerado(s).`);

  // Também zera pontos de todas as apostas
  console.log("🔄 Zerando apostas...");
  const betsSnap = await db.collection("bets").get();
  if (!betsSnap.empty) {
    for (let i = 0; i < betsSnap.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = betsSnap.docs.slice(i, i + BATCH_SIZE);
      chunk.forEach((doc) => {
        batch.update(doc.ref, { points: null });
      });
      await batch.commit();
    }
    console.log(`✅ ${betsSnap.size} aposta(s) zerada(s).`);
  }

  console.log("🏁 Reset completo!");
}

resetPoints().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
