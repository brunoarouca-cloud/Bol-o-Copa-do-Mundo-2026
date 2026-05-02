import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
import { calculatePoints } from "@/lib/scoring";
import { fetchLiveMatches, matchesGame } from "@/lib/football-api";
import type { ScoringSettings } from "@/types";

/**
 * GET /api/cron/live-scores
 *
 * Chamado pelo Vercel Cron (ou por qualquer usuário autenticado via client polling).
 * 1. Busca jogos com status "live" no Firestore.
 * 2. Para cada jogo ao vivo, busca o placar atual na football-data.org.
 * 3. Se o placar mudou, atualiza o jogo e recalcula pontos de todas as apostas.
 * 4. Se a partida encerrou na API, define status = "finished".
 *
 * Auth: Bearer <CRON_SECRET> (Vercel Cron) ou Bearer <Firebase ID Token> (client poll).
 */
export async function GET(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const token = authHeader.slice(7);

    const cronSecret = process.env.CRON_SECRET;
    let authorized = false;

    if (cronSecret && token === cronSecret) {
      authorized = true; // chamada pelo Vercel Cron
    } else {
      try {
        await getAdminAuth().verifyIdToken(token);
        authorized = true; // chamada por usuário autenticado (client poll)
      } catch {
        authorized = false;
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // ── Busca jogos "live" no Firestore ──────────────────────────────────────
    const db = getAdminFirestore();
    const liveGamesSnap = await db
      .collection("games")
      .where("status", "==", "live")
      .get();

    if (liveGamesSnap.empty) {
      return NextResponse.json({ message: "Nenhum jogo ao vivo.", updated: 0 });
    }

    // ── Busca placar atual na API ────────────────────────────────────────────
    const todayUTC = new Date().toISOString().slice(0, 10);
    const liveMatches = await fetchLiveMatches(todayUTC);

    if (liveMatches.length === 0) {
      return NextResponse.json({
        message: "API não retornou partidas ao vivo hoje.",
        updated: 0,
      });
    }

    // ── Configurações de pontuação ───────────────────────────────────────────
    const settingsSnap = await db.collection("settings").doc("scoring").get();
    if (!settingsSnap.exists) {
      return NextResponse.json({ error: "settings/scoring não encontrado" }, { status: 500 });
    }
    const settings = settingsSnap.data() as ScoringSettings;

    let updatedCount = 0;

    for (const gameDoc of liveGamesSnap.docs) {
      const game = gameDoc.data();

      // Encontra a partida correspondente na API
      const apiMatch = liveMatches.find((m) =>
        matchesGame(m, game.homeTeam, game.awayTeam)
      );

      if (!apiMatch) continue;

      const newHomeScore = apiMatch.homeScore;
      const newAwayScore = apiMatch.awayScore;
      const isFinished = apiMatch.status === "FINISHED";

      const scoreChanged =
        game.homeScore !== newHomeScore || game.awayScore !== newAwayScore;
      const statusChanged = isFinished && game.status !== "finished";

      if (!scoreChanged && !statusChanged) continue;

      // ── Atualiza o documento do jogo ───────────────────────────────────────
      const newStatus = isFinished ? "finished" : "live";
      const updateData: Record<string, unknown> = {
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        status: newStatus,
      };
      if (apiMatch.minute !== null) {
        updateData.liveMinute = apiMatch.minute;
      }
      await gameDoc.ref.update(updateData);

      // ── Recalcula pontos das apostas ───────────────────────────────────────
      const betsSnap = await db
        .collection("bets")
        .where("gameId", "==", gameDoc.id)
        .get();

      if (betsSnap.empty) {
        updatedCount++;
        continue;
      }

      const userDeltas = new Map<string, { pointsDelta: number; exactHitsDelta: number }>();
      const betBatch = db.batch();

      for (const betDoc of betsSnap.docs) {
        const bet = betDoc.data();
        const oldPoints: number = bet.points ?? 0;
        const newPoints = calculatePoints(
          { homeScore: bet.homeScore, awayScore: bet.awayScore },
          { homeScore: newHomeScore, awayScore: newAwayScore },
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

      // ── Atualiza totalPoints dos usuários ─────────────────────────────────
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

      // ── Recalcula ranking em memória ──────────────────────────────────────
      const usersSnap = await db.collection("users").get();
      if (usersSnap.docs.length > 0) {
        const sorted = [...usersSnap.docs].sort((a, b) => {
          const aData = a.data();
          const bData = b.data();
          const diff = (bData.totalPoints ?? 0) - (aData.totalPoints ?? 0);
          return diff !== 0 ? diff : (bData.exactHits ?? 0) - (aData.exactHits ?? 0);
        });
        const rankBatch = db.batch();
        sorted.forEach((u, i) => rankBatch.update(u.ref, { rank: i + 1 }));
        await rankBatch.commit();
      }

      updatedCount++;
      console.log(
        `[live-scores] ${game.homeTeam} ${newHomeScore}×${newAwayScore} ${game.awayTeam} → ${newStatus}`
      );
    }

    return NextResponse.json({ message: "OK", updated: updatedCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[live-scores] Erro:", msg);
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}
