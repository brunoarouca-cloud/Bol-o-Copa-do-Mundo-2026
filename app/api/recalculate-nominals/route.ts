import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * POST /api/recalculate-nominals
 * Recalcula pontos de todas as apostas nominais com base em nominalResults/global.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();

    // Carrega resultados nominais e configurações
    const [resultsSnap, settingsSnap] = await Promise.all([
      db.collection("nominalResults").doc("global").get(),
      db.collection("settings").doc("scoring").get(),
    ]);

    const results = resultsSnap.data();
    const nominalBetPoints: number = settingsSnap.data()?.nominalBet ?? 50;

    if (!results) {
      return NextResponse.json({ error: "Resultados nominais não encontrados" }, { status: 404 });
    }

    // Carrega todas as apostas nominais
    const betsSnap = await db.collection("nominalBets").get();

    if (betsSnap.empty) {
      return NextResponse.json({ processed: 0, message: "Sem apostas nominais" });
    }

    const batch = db.batch();
    let processed = 0;

    // Acumula deltas por usuário
    const userDeltas = new Map<string, number>();

    for (const betDoc of betsSnap.docs) {
      const bet = betDoc.data();
      const resultValue = results[bet.category];
      const oldPoints = bet.points ?? 0;

      let newPoints = 0;
      if (resultValue && bet.prediction === resultValue) {
        newPoints = nominalBetPoints;
      }

      batch.update(betDoc.ref, { points: newPoints });

      const existing = userDeltas.get(bet.userId) ?? 0;
      userDeltas.set(bet.userId, existing + (newPoints - oldPoints));

      processed++;
    }

    await batch.commit();

    // Atualiza totalPoints dos usuários
    const userBatch = db.batch();
    for (const [userId, delta] of userDeltas.entries()) {
      if (delta === 0) continue;
      const userRef = db.collection("users").doc(userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) continue;
      const userData = userSnap.data()!;
      userBatch.update(userRef, {
        totalPoints: Math.max(0, (userData.totalPoints ?? 0) + delta),
      });
    }
    await userBatch.commit();

    // Recalcula ranking
    const usersSnap = await db
      .collection("users")
      .orderBy("totalPoints", "desc")
      .orderBy("exactHits", "desc")
      .get();

    const rankBatch = db.batch();
    usersSnap.docs.forEach((userDoc, index) => {
      rankBatch.update(userDoc.ref, { rank: index + 1 });
    });
    await rankBatch.commit();

    return NextResponse.json({
      processed,
      usersUpdated: userDeltas.size,
      message: `Recálculo nominal concluído: ${processed} apostas processadas`,
    });
  } catch (error) {
    console.error("[recalculate-nominals] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
