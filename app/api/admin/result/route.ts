import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
import { resultSchema } from "@/lib/zod-schemas";
import { calculatePoints } from "@/lib/scoring";
import type { ScoringSettings } from "@/types";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

/**
 * POST /api/admin/result
 * Body: { gameId, homeScore, awayScore }
 *
 * Insere resultado de um jogo e recalcula pontos inline (sem HTTP interno).
 * Requer token de admin no header Authorization.
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticação e claim de admin
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

    // Valida body
    const body = await request.json();
    const parsed = resultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { gameId, homeScore, awayScore } = parsed.data;
    const db = getAdminFirestore();

    // Verifica se o jogo existe
    const gameRef = db.collection("games").doc(gameId);
    const gameSnap = await gameRef.get();
    if (!gameSnap.exists) {
      return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
    }

    // Salva resultado e atualiza status
    await gameRef.update({ homeScore, awayScore, status: "finished" });

    // ─── Recalcula pontos inline (evita HTTP interno que pode causar timeout) ───
    try {
      const settingsSnap = await db.collection("settings").doc("scoring").get();
      const settings = settingsSnap.data() as ScoringSettings;

      const PAGE_SIZE = 300;
      let lastDoc: QueryDocumentSnapshot | null = null;
      let totalProcessed = 0;
      const userDeltas = new Map<string, { pointsDelta: number; exactHitsDelta: number }>();

      while (true) {
        let q = db.collection("bets").where("gameId", "==", gameId).limit(PAGE_SIZE);
        if (lastDoc) q = q.startAfter(lastDoc);

        const betsSnap = await q.get();
        if (betsSnap.empty) break;

        const batch = db.batch();
        for (const betDoc of betsSnap.docs) {
          const bet = betDoc.data();
          const oldPoints = bet.points ?? 0;
          const newPoints = calculatePoints(
            { homeScore: bet.homeScore, awayScore: bet.awayScore },
            { homeScore, awayScore },
            settings
          );
          batch.update(betDoc.ref, { points: newPoints });

          const existing = userDeltas.get(bet.userId) ?? {
            pointsDelta: 0,
            exactHitsDelta: 0,
          };
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
        message: "Resultado salvo e pontuação recalculada!",
        game: { gameId, homeScore, awayScore },
        processed: totalProcessed,
        usersUpdated: userDeltas.size,
      });
    } catch (recalcError) {
      // Resultado já foi salvo — informa mas não falha
      console.error("[admin/result] Recálculo falhou:", recalcError);
      return NextResponse.json({
        message: "Resultado salvo. Recálculo pendente — acesse /admin/jogos para re-salvar.",
        game: { gameId, homeScore, awayScore },
        recalcError: "falha no recálculo",
      });
    }
  } catch (error) {
    console.error("[admin/result] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
