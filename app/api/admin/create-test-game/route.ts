import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { fromZonedTime } from "date-fns-tz";

const BRT_TZ = "America/Sao_Paulo";

/**
 * POST /api/admin/create-test-game
 * Cria um jogo de teste no Firestore — totalmente funcional no sistema
 * (travamento, placar ao vivo, pontuação, etc.)
 * Body: { homeTeam, awayTeam, dateLocalBRT, venue?, phase? }
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearerToken) {
    return NextResponse.json({ error: "Token ausente" }, { status: 401 });
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(bearerToken);
    if (!decoded.admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  try {
    const { homeTeam, awayTeam, dateLocalBRT, venue, phase } = await request.json();

    if (!homeTeam || !awayTeam || !dateLocalBRT) {
      return NextResponse.json({ error: "homeTeam, awayTeam e dateLocalBRT são obrigatórios" }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Gera ID único para jogo de teste
    const existingTests = await db.collection("games")
      .where("phase", "==", "Amistoso")
      .get();
    const testNumber = existingTests.size + 1;
    const gameId = `TEST_${String(testNumber).padStart(3, "0")}`;
    const matchNumber = 900 + testNumber;

    // Converte BRT → UTC
    const dateUTC = fromZonedTime(new Date(dateLocalBRT), BRT_TZ);

    await db.collection("games").doc(gameId).set({
      id: gameId,
      matchNumber,
      phase: phase ?? "Amistoso",
      group: null,
      homeTeam,
      awayTeam,
      homeFlag: null,
      awayFlag: null,
      date: Timestamp.fromDate(dateUTC),
      venue: venue ?? "Estádio de Teste",
      city: "Teste",
      country: "EUA",
      homeScore: null,
      awayScore: null,
      status: "upcoming",
    });

    return NextResponse.json({ success: true, gameId, matchNumber });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-test-game]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/create-test-game
 * Remove todos os jogos de teste (phase == "Amistoso")
 */
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearerToken) return NextResponse.json({ error: "Token ausente" }, { status: 401 });
  try {
    const decoded = await getAdminAuth().verifyIdToken(bearerToken);
    if (!decoded.admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.collection("games").where("phase", "==", "Amistoso").get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return NextResponse.json({ deleted: snap.size });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
