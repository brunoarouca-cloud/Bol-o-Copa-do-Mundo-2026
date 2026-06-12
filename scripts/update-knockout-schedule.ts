/**
 * Script: update-knockout-schedule
 *
 * Corrige em uma única passagem todos os jogos eliminatórios (73–104):
 *   - phase   → valor correto baseado no matchNumber
 *   - date    → horário da planilha oficial (gravado como-está, sem conversão)
 *   - homeTeam / awayTeam → label do bracket
 *   - city / country / venue
 *
 * Também detecta e remove documentos duplicados (mesmo matchNumber,
 * IDs diferentes) mantendo apenas o documento com ID canônico.
 *
 * A query busca TODOS os jogos (sem filtrar por phase), garantindo que
 * jogos com phase incorreta sejam encontrados e corrigidos.
 *
 * Campos NUNCA sobrescritos: homeScore, awayScore, status, points.
 *
 * Uso:
 *   pnpm update-schedule
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

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Converte horário BRT (UTC-3) para UTC adicionando 3 horas */
function toTimestamp(date: string, time: string): Timestamp {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return Timestamp.fromMillis(Date.UTC(y, mo - 1, d, h + 3, mi, 0));
}

function correctPhase(n: number): string | null {
  if (n >= 73  && n <= 88)  return "16 avos";
  if (n >= 89  && n <= 96)  return "Oitavas";
  if (n >= 97  && n <= 100) return "Quartas";
  if (n >= 101 && n <= 102) return "Semis";
  if (n === 103) return "Terceiro Lugar";
  if (n === 104) return "Final";
  return null;
}

function bracketLabel(raw: string): string {
  raw = raw.trim();
  if (/^W\d+$/.test(raw))  return `Vencedor Jogo ${raw.slice(1)}`;
  if (/^L\d+$/.test(raw))  return `Perdedor Jogo ${raw.slice(1)}`;
  if (/^3\s/.test(raw))    return `Melhor 3º ${raw.replace(/^3\s+/, "")}`;
  const m = raw.match(/^([12])([A-L])$/);
  if (m) return `${m[1]}º Grupo ${m[2]}`;
  return raw;
}

// ── Calendário oficial (horário conforme planilha) ─────────────────────────────

interface Sched {
  matchNumber: number;
  canonicalId: string;
  phase: string;
  date: string;
  time: string;
  homeRaw: string;
  awayRaw: string;
  city: string;
  country: string;
  venue: string;
}

const SCHEDULE: Sched[] = [
  // ── 16 avos ──────────────────────────────────────────────────────────────────
  { matchNumber: 73,  canonicalId: "R32_01", phase: "16 avos", date: "2026-06-28", time: "16:00", homeRaw: "2A",   awayRaw: "2B",           city: "Los Angeles",      country: "EUA",    venue: "SoFi Stadium" },
  { matchNumber: 74,  canonicalId: "R32_02", phase: "16 avos", date: "2026-06-29", time: "13:00", homeRaw: "1E",   awayRaw: "3 A/B/C/D/F",  city: "Boston",           country: "EUA",    venue: "Gillette Stadium" },
  { matchNumber: 75,  canonicalId: "R32_03", phase: "16 avos", date: "2026-06-29", time: "19:30", homeRaw: "1F",   awayRaw: "2C",           city: "Monterrey",        country: "México", venue: "Estadio BBVA" },
  { matchNumber: 76,  canonicalId: "R32_04", phase: "16 avos", date: "2026-06-29", time: "21:00", homeRaw: "1C",   awayRaw: "2F",           city: "Houston",          country: "EUA",    venue: "NRG Stadium" },
  { matchNumber: 77,  canonicalId: "R32_05", phase: "16 avos", date: "2026-06-30", time: "18:00", homeRaw: "1I",   awayRaw: "3 C/D/F/G/H", city: "Nova York",        country: "EUA",    venue: "MetLife Stadium" },
  { matchNumber: 78,  canonicalId: "R32_06", phase: "16 avos", date: "2026-06-30", time: "14:00", homeRaw: "2E",   awayRaw: "2I",           city: "Dallas",           country: "EUA",    venue: "AT&T Stadium" },
  { matchNumber: 79,  canonicalId: "R32_07", phase: "16 avos", date: "2026-06-30", time: "22:00", homeRaw: "1A",   awayRaw: "3 C/E/F/H/I", city: "Cidade do México", country: "México", venue: "Estadio Azteca" },
  { matchNumber: 80,  canonicalId: "R32_08", phase: "16 avos", date: "2026-07-01", time: "13:00", homeRaw: "1L",   awayRaw: "3 E/H/I/J/K", city: "Atlanta",          country: "EUA",    venue: "Mercedes-Benz Stadium" },
  { matchNumber: 81,  canonicalId: "R32_09", phase: "16 avos", date: "2026-07-01", time: "21:00", homeRaw: "1D",   awayRaw: "3 B/E/F/I/J", city: "São Francisco",    country: "EUA",    venue: "Levi's Stadium" },
  { matchNumber: 82,  canonicalId: "R32_10", phase: "16 avos", date: "2026-07-01", time: "19:00", homeRaw: "1G",   awayRaw: "3 A/E/H/I/J", city: "Seattle",          country: "EUA",    venue: "Lumen Field" },
  { matchNumber: 83,  canonicalId: "R32_11", phase: "16 avos", date: "2026-07-02", time: "13:00", homeRaw: "2K",   awayRaw: "2L",           city: "Toronto",          country: "Canadá", venue: "BMO Field" },
  { matchNumber: 84,  canonicalId: "R32_12", phase: "16 avos", date: "2026-07-02", time: "16:00", homeRaw: "1H",   awayRaw: "2J",           city: "Los Angeles",      country: "EUA",    venue: "SoFi Stadium" },
  { matchNumber: 85,  canonicalId: "R32_13", phase: "16 avos", date: "2026-07-02", time: "00:00", homeRaw: "1B",   awayRaw: "3 E/F/G/I/J", city: "Vancouver",        country: "Canadá", venue: "BC Place" },
  { matchNumber: 86,  canonicalId: "R32_14", phase: "16 avos", date: "2026-07-03", time: "19:00", homeRaw: "1J",   awayRaw: "2H",           city: "Miami",            country: "EUA",    venue: "Hard Rock Stadium" },
  { matchNumber: 87,  canonicalId: "R32_15", phase: "16 avos", date: "2026-07-03", time: "22:30", homeRaw: "1K",   awayRaw: "3 D/E/I/J/L", city: "Kansas City",      country: "EUA",    venue: "Arrowhead Stadium" },
  { matchNumber: 88,  canonicalId: "R32_16", phase: "16 avos", date: "2026-07-03", time: "15:00", homeRaw: "2D",   awayRaw: "2G",           city: "Dallas",           country: "EUA",    venue: "AT&T Stadium" },
  // ── Oitavas ───────────────────────────────────────────────────────────────────
  { matchNumber: 89,  canonicalId: "R16_01", phase: "Oitavas", date: "2026-07-04", time: "18:00", homeRaw: "W74",  awayRaw: "W77",          city: "Filadélfia",       country: "EUA",    venue: "Lincoln Financial Field" },
  { matchNumber: 90,  canonicalId: "R16_02", phase: "Oitavas", date: "2026-07-04", time: "14:00", homeRaw: "W73",  awayRaw: "W75",          city: "Houston",          country: "EUA",    venue: "NRG Stadium" },
  { matchNumber: 91,  canonicalId: "R16_03", phase: "Oitavas", date: "2026-07-05", time: "17:00", homeRaw: "W76",  awayRaw: "W78",          city: "Nova York",        country: "EUA",    venue: "MetLife Stadium" },
  { matchNumber: 92,  canonicalId: "R16_04", phase: "Oitavas", date: "2026-07-05", time: "20:00", homeRaw: "W79",  awayRaw: "W80",          city: "Cidade do México", country: "México", venue: "Estadio Azteca" },
  { matchNumber: 93,  canonicalId: "R16_05", phase: "Oitavas", date: "2026-07-06", time: "16:00", homeRaw: "W83",  awayRaw: "W84",          city: "Dallas",           country: "EUA",    venue: "AT&T Stadium" },
  { matchNumber: 94,  canonicalId: "R16_06", phase: "Oitavas", date: "2026-07-06", time: "21:00", homeRaw: "W81",  awayRaw: "W82",          city: "Seattle",          country: "EUA",    venue: "Lumen Field" },
  { matchNumber: 95,  canonicalId: "R16_07", phase: "Oitavas", date: "2026-07-07", time: "13:00", homeRaw: "W86",  awayRaw: "W88",          city: "Atlanta",          country: "EUA",    venue: "Mercedes-Benz Stadium" },
  { matchNumber: 96,  canonicalId: "R16_08", phase: "Oitavas", date: "2026-07-07", time: "19:00", homeRaw: "W85",  awayRaw: "W87",          city: "Vancouver",        country: "Canadá", venue: "BC Place" },
  // ── Quartas ───────────────────────────────────────────────────────────────────
  { matchNumber: 97,  canonicalId: "QF1",    phase: "Quartas", date: "2026-07-09", time: "17:00", homeRaw: "W89",  awayRaw: "W90",          city: "Boston",           country: "EUA",    venue: "Gillette Stadium" },
  { matchNumber: 98,  canonicalId: "QF2",    phase: "Quartas", date: "2026-07-10", time: "16:00", homeRaw: "W93",  awayRaw: "W94",          city: "Los Angeles",      country: "EUA",    venue: "SoFi Stadium" },
  { matchNumber: 99,  canonicalId: "QF3",    phase: "Quartas", date: "2026-07-11", time: "18:00", homeRaw: "W91",  awayRaw: "W92",          city: "Miami",            country: "EUA",    venue: "Hard Rock Stadium" },
  { matchNumber: 100, canonicalId: "QF4",    phase: "Quartas", date: "2026-07-11", time: "22:00", homeRaw: "W95",  awayRaw: "W96",          city: "Kansas City",      country: "EUA",    venue: "Arrowhead Stadium" },
  // ── Semis ─────────────────────────────────────────────────────────────────────
  { matchNumber: 101, canonicalId: "SF1",    phase: "Semis",   date: "2026-07-14", time: "16:00", homeRaw: "W97",  awayRaw: "W98",          city: "Dallas",           country: "EUA",    venue: "AT&T Stadium" },
  { matchNumber: 102, canonicalId: "SF2",    phase: "Semis",   date: "2026-07-15", time: "16:00", homeRaw: "W99",  awayRaw: "W100",         city: "Atlanta",          country: "EUA",    venue: "Mercedes-Benz Stadium" },
  // ── 3º Lugar ──────────────────────────────────────────────────────────────────
  { matchNumber: 103, canonicalId: "3PL",    phase: "Terceiro Lugar", date: "2026-07-18", time: "19:00", homeRaw: "L101", awayRaw: "L102", city: "Miami",    country: "EUA", venue: "Hard Rock Stadium" },
  // ── Final ─────────────────────────────────────────────────────────────────────
  { matchNumber: 104, canonicalId: "FIN",    phase: "Final",   date: "2026-07-19", time: "16:00", homeRaw: "W101", awayRaw: "W102",         city: "Nova York",        country: "EUA",    venue: "MetLife Stadium" },
];

// ── Execução ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("📅  Corrigindo calendário + fases dos jogos eliminatórios...\n");

  // Busca TODOS os jogos (sem filtrar por phase — garante encontrar mesmo com phase errada)
  const snap = await db.collection("games").get();

  // Agrupa documentos por matchNumber (detecta duplicatas)
  const byMatchNumber = new Map<number, FirebaseFirestore.QueryDocumentSnapshot[]>();
  for (const doc of snap.docs) {
    const n = doc.data().matchNumber as number;
    if (n < 73) continue; // fase de grupos — ignora
    if (!byMatchNumber.has(n)) byMatchNumber.set(n, []);
    byMatchNumber.get(n)!.push(doc);
  }

  let updated = 0;
  let unchanged = 0;
  let notFound = 0;
  let deleted = 0;

  for (const sched of SCHEDULE) {
    const docs = byMatchNumber.get(sched.matchNumber);

    if (!docs || docs.length === 0) {
      console.warn(`⚠️   Jogo #${sched.matchNumber} não encontrado no Firestore — ignorado.`);
      notFound++;
      continue;
    }

    // ── Remove duplicatas (mantém o documento com ID canônico, ou o primeiro) ──
    if (docs.length > 1) {
      const canonical = docs.find((d) => d.id === sched.canonicalId) ?? docs[0];
      const duplicates = docs.filter((d) => d.id !== canonical.id);

      console.log(`  🗑️   Jogo #${sched.matchNumber}: removendo ${duplicates.length} duplicata(s) [${duplicates.map((d) => d.id).join(", ")}]`);
      const delBatch = db.batch();
      for (const dup of duplicates) delBatch.delete(dup.ref);
      await delBatch.commit();
      deleted += duplicates.length;

      // Continua com o documento canônico
      byMatchNumber.set(sched.matchNumber, [canonical]);
    }

    const docSnap = byMatchNumber.get(sched.matchNumber)![0];
    const existing = docSnap.data();

    const newDate     = toTimestamp(sched.date, sched.time);
    const homeLabel   = bracketLabel(sched.homeRaw);
    const awayLabel   = bracketLabel(sched.awayRaw);

    const updates: Record<string, unknown> = {};

    if (existing.phase    !== sched.phase)         updates.phase    = sched.phase;
    if (existing.homeTeam !== homeLabel)            updates.homeTeam = homeLabel;
    if (existing.awayTeam !== awayLabel)            updates.awayTeam = awayLabel;
    if (existing.city     !== sched.city)           updates.city     = sched.city;
    if (existing.country  !== sched.country)        updates.country  = sched.country;
    if (existing.venue    !== sched.venue)          updates.venue    = sched.venue;
    if (existing.date?.seconds !== newDate.seconds) updates.date     = newDate;

    const tag = `#${String(sched.matchNumber).padStart(3, "0")}  [${docSnap.id}]`;

    if (Object.keys(updates).length === 0) {
      console.log(`  ${tag}  ✓`);
      unchanged++;
    } else {
      await docSnap.ref.update(updates);
      const changes = Object.keys(updates).join(", ");
      console.log(`  ${tag}  ✅  ${homeLabel} × ${awayLabel}  (${changes})`);
      updated++;
    }
  }

  console.log(
    `\n📊  Resumo: ${updated} atualizados · ${unchanged} sem mudança · ${notFound} não encontrados · ${deleted} duplicata(s) removida(s)`
  );
}

main().catch((err) => {
  console.error("❌  Erro fatal:", err);
  process.exit(1);
});
