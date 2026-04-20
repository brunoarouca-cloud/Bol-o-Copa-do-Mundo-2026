import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";

/**
 * POST /api/admin/clear-result
 * Body: { gameId }
 *
 * Remove o resultado de um jogo:
 * - Zera homeScore/awayScore, volta status para "upcoming"
 * - Subtrai os pontos que cada aposta deste jogo havia gerado
 * - Atualiza totalPoints e exactHits de cada usuário afetado
 * - Recalcula ranking
 *
 * Requer token de admin no header Authorization.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const adminAuth = getAdminAuth();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    if (!decodedToken.admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const { gameId } = body;
    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json({ error: "gameId inválido" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const gameRef = db.collection("games").doc(gameId);
    const gameSnap = await gameRef.get();

    if (!gameSnap.exists) {
      return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
    }

    // 1. Busca as configurações de pontuação para saber o valor de exactScore
    const settingsSnap = await db.collection("settings").doc("scoring").get();
    const exactScoreValue: number = settingsSnap.exists
      ? (settingsSnap.data()?.exactScore ?? 20)
      : 20;

    // 2. Busca todas as apostas deste jogo que já têm pontos computados
    const betsSnap = await db
      .collection("bets")
      .where("gameId", "==", gameId)
      .get();

    // 3. Calcula o delta de pontos a subtrair de cada usuário
    const userDeltas = new Map<string, { pointsDelta: number; exactHitsDelta: number }>();

    if (!betsSnap.empty) {
      const betBatch = db.batch();

      for (const betDoc of betsSnap.docs) {
        const bet = betDoc.data();
        const oldPoints: number = bet.points ?? 0;

        if (oldPoints === 0) continue; // sem pontos para descontar

        // Zera pontos da aposta
        betBatch.update(betDoc.ref, { points: null });

        const curr = userDeltas.get(bet.userId) ?? { pointsDelta: 0, exactHitsDelta: 0 };
        curr.pointsDelta -= oldPoints;
        if (oldPoints === exactScoreValue) {
          curr.exactHitsDelta -= 1;
        }
        userDeltas.set(bet.userId, curr);
      }

      await betBatch.commit();
    }

    // 4. Atualiza pontos dos usuários afetados
    if (userDeltas.size > 0) {
      const userBatch = db.batch();
      for (const [userId, delta] of userDeltas.entries()) {
        const userSnap = await db.collection("users").doc(userId).get();
        if (!userSnap.exists) continue;
        const data = userSnap.data()!;
        userBatch.update(userSnap.ref, {
          totalPoints: Math.max(0, (data.totalPoints ?? 0) + delta.pointsDelta),
          exactHits: Math.max(0, (data.exactHits ?? 0) + delta.exactHitsDelta),
        });
      }
      await userBatch.commit();
    }

    // 5. Recalcula ranking (ordena em memória para não depender de índice composto)
    const usersSnap = await db.collection("users").get();

    if (usersSnap.docs.length > 0) {
      const sorted = [...usersSnap.docs].sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        const pointsDiff = (bData.totalPoints ?? 0) - (aData.totalPoints ?? 0);
        if (pointsDiff !== 0) return pointsDiff;
        return (bData.exactHits ?? 0) - (aData.exactHits ?? 0);
      });

      const rankBatch = db.batch();
      sorted.forEach((u, i) => {
        rankBatch.update(u.ref, { rank: i + 1 });
      });
      await rankBatch.commit();
    }

    // 6. Zera o placar do jogo e volta para "upcoming"
    await gameRef.update({
      homeScore: null,
      awayScore: null,
      status: "upcoming",
    });

    return NextResponse.json({
      message: "Resultado removido e pontos descontados.",
      gameId,
      usersAffected: userDeltas.size,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[admin/clear-result] Erro:", msg);
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}
