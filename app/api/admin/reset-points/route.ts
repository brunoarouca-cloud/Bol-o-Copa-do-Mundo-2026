import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
import { calculatePoints } from "@/lib/scoring";
import type { ScoringSettings } from "@/types";

/**
 * POST /api/admin/reset-points
 *
 * Recalcula toda a pontuação do bolão do zero:
 * 1. Zera totalPoints, exactHits de todos os usuários
 * 2. Zera points de todas as apostas
 * 3. Relê todos os jogos com resultado (finished ou live com score)
 * 4. Recalcula pontos de cada aposta desses jogos
 * 5. Recalcula totalPoints e exactHits de cada usuário
 * 6. Recalcula ranking
 *
 * Requer token de admin.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    if (!decodedToken.admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const db = getAdminFirestore();

    // ── 1. Busca configurações de pontuação ───────────────────
    const settingsSnap = await db.collection("settings").doc("scoring").get();
    if (!settingsSnap.exists) {
      return NextResponse.json({ error: "Configurações de pontuação não encontradas" }, { status: 500 });
    }
    const settings = settingsSnap.data() as ScoringSettings;

    // ── 2. Zera pontos de TODAS as apostas ────────────────────
    const allBetsSnap = await db.collection("bets").get();
    const BATCH_SIZE = 400;

    for (let i = 0; i < allBetsSnap.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      allBetsSnap.docs.slice(i, i + BATCH_SIZE).forEach((d) => {
        batch.update(d.ref, { points: null });
      });
      await batch.commit();
    }

    // ── 3. Zera totalPoints e exactHits de TODOS os usuários ──
    const allUsersSnap = await db.collection("users").get();
    for (let i = 0; i < allUsersSnap.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      allUsersSnap.docs.slice(i, i + BATCH_SIZE).forEach((d) => {
        batch.update(d.ref, { totalPoints: 0, exactHits: 0 });
      });
      await batch.commit();
    }

    // ── 4. Recalcula pontos dos jogos com resultado válido ────
    // Considera apenas jogos finished ou live com placar definido
    const gamesSnap = await db.collection("games").get();
    const gamesWithResult = gamesSnap.docs.filter((d) => {
      const g = d.data();
      return (
        (g.status === "finished" || g.status === "live") &&
        g.homeScore !== null &&
        g.awayScore !== null
      );
    });

    const userAccum = new Map<string, { totalPoints: number; exactHits: number }>();

    for (const gameDoc of gamesWithResult) {
      const game = gameDoc.data();
      const gameBetsSnap = await db
        .collection("bets")
        .where("gameId", "==", gameDoc.id)
        .get();

      if (gameBetsSnap.empty) continue;

      const betBatch = db.batch();
      for (const betDoc of gameBetsSnap.docs) {
        const bet = betDoc.data();
        const pts = calculatePoints(
          { homeScore: bet.homeScore, awayScore: bet.awayScore },
          { homeScore: game.homeScore, awayScore: game.awayScore },
          settings
        );
        betBatch.update(betDoc.ref, { points: pts });

        const curr = userAccum.get(bet.userId) ?? { totalPoints: 0, exactHits: 0 };
        curr.totalPoints += pts;
        if (pts === settings.exactScore) curr.exactHits += 1;
        userAccum.set(bet.userId, curr);
      }
      await betBatch.commit();
    }

    // ── 5. Grava totalPoints e exactHits recalculados ─────────
    if (userAccum.size > 0) {
      const userBatch = db.batch();
      for (const [userId, accum] of userAccum.entries()) {
        const ref = db.collection("users").doc(userId);
        userBatch.update(ref, {
          totalPoints: accum.totalPoints,
          exactHits: accum.exactHits,
        });
      }
      await userBatch.commit();
    }

    // ── 6. Recalcula ranking ──────────────────────────────────
    const usersSnap = await db.collection("users").get();
    const sorted = [...usersSnap.docs].sort((a, b) => {
      const aData = a.data();
      const bData = b.data();
      const diff = (bData.totalPoints ?? 0) - (aData.totalPoints ?? 0);
      if (diff !== 0) return diff;
      return (bData.exactHits ?? 0) - (aData.exactHits ?? 0);
    });
    const rankBatch = db.batch();
    sorted.forEach((u, i) => rankBatch.update(u.ref, { rank: i + 1 }));
    await rankBatch.commit();

    return NextResponse.json({
      message: "Pontuação recalculada do zero com sucesso.",
      gamesProcessed: gamesWithResult.length,
      usersRecalculated: userAccum.size,
      totalBetsZeroed: allBetsSnap.size,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[admin/reset-points] Erro:", msg);
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}
