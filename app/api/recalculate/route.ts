import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { calculatePoints } from "@/lib/scoring";
import type { ScoringSettings } from "@/types";

/**
 * POST /api/recalculate
 * Body: { gameId: string }
 *
 * Recalcula pontos de todas as apostas de um jogo e atualiza o ranking.
 * Chamado automaticamente após inserção de resultado pelo admin.
 * Protegido por CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  // Verifica autorização
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json({ error: "gameId obrigatório" }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Carrega o jogo
    const gameSnap = await db.collection("games").doc(gameId).get();
    if (!gameSnap.exists) {
      return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
    }

    const game = gameSnap.data()!;
    if (game.homeScore === null || game.awayScore === null) {
      return NextResponse.json({ error: "Resultado não disponível" }, { status: 400 });
    }

    // Carrega configurações
    const settingsSnap = await db.collection("settings").doc("scoring").get();
    const settings = settingsSnap.data() as ScoringSettings;

    // Carrega todas as apostas deste jogo (com paginação)
    const PAGE_SIZE = 300;
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let totalProcessed = 0;

    // Mapas para acumular deltas por usuário
    const userDeltas: Map<string, { pointsDelta: number; exactHitsDelta: number }> = new Map();

    while (true) {
      let q = db
        .collection("bets")
        .where("gameId", "==", gameId)
        .limit(PAGE_SIZE);

      if (lastDoc) q = q.startAfter(lastDoc);

      const betsSnap = await q.get();
      if (betsSnap.empty) break;

      const batch = db.batch();

      for (const betDoc of betsSnap.docs) {
        const bet = betDoc.data();
        const oldPoints = bet.points ?? 0;

        const newPoints = calculatePoints(
          { homeScore: bet.homeScore, awayScore: bet.awayScore },
          { homeScore: game.homeScore, awayScore: game.awayScore },
          settings
        );

        // Atualiza a aposta com os pontos calculados
        batch.update(betDoc.ref, { points: newPoints });

        // Acumula delta para o usuário
        const existing = userDeltas.get(bet.userId) ?? { pointsDelta: 0, exactHitsDelta: 0 };
        existing.pointsDelta += newPoints - oldPoints;
        if (newPoints === settings.exactScore && oldPoints !== settings.exactScore) {
          existing.exactHitsDelta += 1;
        } else if (newPoints !== settings.exactScore && oldPoints === settings.exactScore) {
          existing.exactHitsDelta -= 1;
        }
        userDeltas.set(bet.userId, existing);

        totalProcessed++;
      }

      await batch.commit();

      if (betsSnap.docs.length < PAGE_SIZE) break;
      lastDoc = betsSnap.docs[betsSnap.docs.length - 1];
    }

    // Atualiza pontos dos usuários
    const userBatch = db.batch();
    for (const [userId, delta] of userDeltas.entries()) {
      const userRef = db.collection("users").doc(userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) continue;

      const userData = userSnap.data()!;
      userBatch.update(userRef, {
        totalPoints: (userData.totalPoints ?? 0) + delta.pointsDelta,
        exactHits: Math.max(0, (userData.exactHits ?? 0) + delta.exactHitsDelta),
      });
    }
    await userBatch.commit();

    // Recalcula ranking (ordena por totalPoints desc, exactHits desc)
    await recalculateRanks(db);

    return NextResponse.json({
      processed: totalProcessed,
      usersUpdated: userDeltas.size,
      message: `Recálculo concluído: ${totalProcessed} apostas processadas`,
    });
  } catch (error) {
    console.error("[recalculate] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

async function recalculateRanks(db: FirebaseFirestore.Firestore) {
  const usersSnap = await db
    .collection("users")
    .orderBy("totalPoints", "desc")
    .orderBy("exactHits", "desc")
    .get();

  const batch = db.batch();
  usersSnap.docs.forEach((userDoc, index) => {
    batch.update(userDoc.ref, { rank: index + 1 });
  });
  await batch.commit();
}
