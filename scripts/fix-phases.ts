/**
 * Script: fix-phases
 *
 * Corrige o campo `phase` dos jogos eliminatórios no Firestore de acordo
 * com a estrutura da Copa 2026 (48 seleções):
 *
 *   73–88  → "16 avos"        (Round of 32 — 16 jogos)
 *   89–96  → "Oitavas"        (Round of 16 — 8 jogos)
 *   97–100 → "Quartas"        (Quarter-finals — 4 jogos)
 *  101–102 → "Semis"          (Semi-finals — 2 jogos)
 *      103 → "Terceiro Lugar"
 *      104 → "Final"
 *
 * Uso:
 *   pnpm fix-phases
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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

// ── Mapa matchNumber → fase correta ───────────────────────────────────────────

function correctPhase(matchNumber: number): string | null {
  if (matchNumber >= 73  && matchNumber <= 88)  return "16 avos";
  if (matchNumber >= 89  && matchNumber <= 96)  return "Oitavas";
  if (matchNumber >= 97  && matchNumber <= 100) return "Quartas";
  if (matchNumber >= 101 && matchNumber <= 102) return "Semis";
  if (matchNumber === 103) return "Terceiro Lugar";
  if (matchNumber === 104) return "Final";
  return null; // fase de grupos — não tocar
}

// ── Execução ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔧  Verificando fases dos jogos eliminatórios...\n");

  // Busca todos os jogos (incluindo os que estão com fase errada)
  const snap = await db.collection("games").get();

  let fixed = 0;
  let ok = 0;
  let skipped = 0;

  const batch = db.batch();

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const matchNumber = data.matchNumber as number;

    if (matchNumber < 73) {
      skipped++;
      continue; // fase de grupos — ignora
    }

    const expected = correctPhase(matchNumber);
    if (!expected) {
      skipped++;
      continue;
    }

    if (data.phase === expected) {
      console.log(`  #${String(matchNumber).padStart(3, "0")}  ✓  ${expected}`);
      ok++;
    } else {
      console.log(
        `  #${String(matchNumber).padStart(3, "0")}  ✏️   ${data.phase ?? "(vazio)"}  →  ${expected}`
      );
      batch.update(docSnap.ref, { phase: expected });
      fixed++;
    }
  }

  if (fixed > 0) {
    await batch.commit();
    console.log(`\n✅  ${fixed} fase(s) corrigida(s), ${ok} já estavam corretas.`);
  } else {
    console.log(`\n✅  Todas as fases já estavam corretas (${ok} jogos verificados).`);
  }
}

main().catch((err) => {
  console.error("❌  Erro:", err);
  process.exit(1);
});
