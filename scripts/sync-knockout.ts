/**
 * Script: sync-knockout
 *
 * Sincroniza os jogos eliminatórios (16 avos em diante) com a football-data.org.
 * Busca o calendário oficial da Copa 2026 e atualiza times, sedes e IDs externos
 * no Firestore, sem tocar em placares ou status já definidos.
 *
 * Uso:
 *   pnpm sync-knockout
 *
 * Requer:
 *   - .env.local com FOOTBALL_DATA_API_KEY e credenciais Firebase
 *   - Arquivo serviceAccount JSON na raiz do projeto
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, readdirSync } from "fs";
import { config } from "dotenv";
import { syncKnockoutGames } from "../lib/sync-games";

// Carrega variáveis de ambiente do .env.local
config({ path: ".env.local" });

// ── Inicializa Firebase Admin ─────────────────────────────────────────────────
if (!getApps().length) {
  const files = readdirSync(".");
  const saFile = files.find(
    (f) =>
      f.endsWith(".json") &&
      (f.includes("firebase-adminsdk") || f.startsWith("serviceAccount"))
  );
  if (!saFile) {
    console.error("❌  Arquivo de service account não encontrado.");
    console.error("   Baixe em Firebase Console > Configurações > Contas de serviço.");
    process.exit(1);
  }
  const sa = JSON.parse(readFileSync(saFile, "utf-8"));
  console.log(`🔑  Service account: ${saFile}`);
  initializeApp({ credential: cert(sa) });
}

const db = getFirestore();

// ── Execução ──────────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.error("❌  FOOTBALL_DATA_API_KEY não encontrada no .env.local");
    process.exit(1);
  }

  console.log("⚽  Sincronizando jogos eliminatórios com football-data.org...\n");

  const result = await syncKnockoutGames(db, apiKey);

  // ── Relatório ───────────────────────────────────────────────────────────────
  const updated   = result.details.filter((d) => d.action === "updated");
  const unchanged = result.details.filter((d) => d.action === "unchanged");

  if (updated.length > 0) {
    console.log("✅  Jogos atualizados:");
    for (const d of updated) {
      console.log(`   #${String(d.matchNumber).padStart(3, "0")}  ${d.homeTeam} × ${d.awayTeam}  [${d.gameId}]`);
    }
    console.log();
  }

  if (unchanged.length > 0) {
    console.log(`ℹ️   ${unchanged.length} jogo(s) sem alterações.`);
  }

  if (result.skipped > 0) {
    console.log(`⚠️   ${result.skipped} jogo(s) ignorados (sem correspondência ou erro).`);
  }

  if (result.errors.length > 0) {
    console.log("\n⚠️  Avisos/Erros:");
    for (const e of result.errors) {
      console.log(`   • ${e}`);
    }
  }

  console.log(`\n📊  Resumo: ${result.updated} atualizados · ${result.unchanged} sem mudança · ${result.skipped} ignorados`);
}

main().catch((err) => {
  console.error("❌  Erro fatal:", err);
  process.exit(1);
});
