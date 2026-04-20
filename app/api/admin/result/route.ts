import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
import { resultSchema } from "@/lib/zod-schemas";
import { calculatePoints } from "@/lib/scoring";
import type { ScoringSettings } from "@/types";

/**
 * POST /api/admin/result
 * Body: { gameId, homeScore, awayScore }
 *
 * Salva resultado e recalcula pontos inline.
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
    const parsed = resultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { gameId, homeScore, awayScore } = parsed.data;
    const db = getAdminFirestore();

    const gameRef = db.collection("games").doc(gameId);
    const gameSnap = await gameRef.get();
    if (!gameSnap.exists) {
      return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
    }

    // 1. Salva o resultado (passo crítico — deve sempre funcionar)
    await gameRef.update({ homeScore, awayScore, status: "finished" });

    // 2. Recalcula pontos (best-effort — não falha o request se der erro)
    try {
      const settingsSnap = await db.collection("settings").doc("scoring").get();
      if (!settingsSnap.exists) throw new Error("settings/scoring não encontrado");
      const settings = settingsSnap.data() as ScoringSettings;

      // Busca todas as apostas deste jogo (sem paginação — suficiente para bolão)
      const betsSnap = await db
        .collection("bets")
        .where("gameId", "==", gameId)
        .get();

      const userDeltas = new Map<string, { pointsDelta: number; exactHitsDelta: number }>();

      if (!betsSnap.empty) {
        const betBatch = db.batch();

        for (const betDoc of betsSnap.docs) {
          const bet = betDoc.data();
          const oldPoints: number = bet.points ?? 0;
          const newPoints = calculatePoints(
            { homeScore: bet.homeScore, awayScore: bet.awayScore },
            { homeScore, awayScore },
            settings
          );
          betBatch.update(betDoc.ref, { points: newPoints });

          const curr = userDeltas.get(bet.userId) ?? { pointsDelta: 0, exactHitsDelta: 0 };
          curr.pointsDelta += newPoints - oldPoints;
          if (newPoints === settings.exactScore && oldPoints !== settings.exactScore) {
            curr.exactHitsDelta += 1;
          } else if (newPoints !== settings.exactScore && oldPoints === settings.exactScore) {
            curr.exactHitsDelta -= 1;
          }
          userDeltas.set(bet.userId, curr);
        }

        await betBatch.commit();
      }

      // Atualiza pontos dos usuários (só se houver deltas)
      if (userDeltas.size > 0) {
        const userBatch = db.batch();
        for (const [userId, delta] of userDeltas.entries()) {
          const userSnap = await db.collection("users").doc(userId).get();
          if (!userSnap.exists) continue;
          const data = userSnap.data()!;
          userBatch.update(userSnap.ref, {
            totalPoints: (data.totalPoints ?? 0) + delta.pointsDelta,
            exactHits: Math.max(0, (data.exactHits ?? 0) + delta.exactHitsDelta),
          });
        }
        await userBatch.commit();
      }

      // Recalcula ranking (ordena em memória para não depender de índice composto)
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

      return NextResponse.json({
        message: "Resultado salvo e pontuação recalculada!",
        game: { gameId, homeScore, awayScore },
        betsProcessed: betsSnap.size ?? 0,
      });
    } catch (recalcError) {
      console.error("[admin/result] Recálculo falhou (resultado já salvo):", recalcError);
      return NextResponse.json({
        message: "Resultado salvo! Recálculo será refeito na próxima atualização.",
        game: { gameId, homeScore, awayScore },
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[admin/result] Erro:", msg);
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}
