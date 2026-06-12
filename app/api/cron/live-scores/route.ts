import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
import { calculatePoints } from "@/lib/scoring";
import { fetchLiveMatches, matchesGame } from "@/lib/football-api";
import {
  fetchLiveMatchesApiFootball,
  matchesGameApiFootball,
  apiFootballStatusToInternal,
} from "@/lib/api-football";
import type { ScoringSettings } from "@/types";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

/**
 * GET /api/cron/live-scores
 *
 * Otimizado para minimizar leituras no Firestore (limite do plano Spark: 50k/dia):
 * - Lê todos os usuários UMA vez (não por jogo)
 * - Recalcula ranking UMA vez no final (não por jogo)
 * - Agrupa todas as escritas em batches únicos
 *
 * Auth: Bearer <CRON_SECRET> | query ?key= | Firebase ID Token (client poll)
 */
export async function GET(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET;
    const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const queryKey = request.nextUrl.searchParams.get("key");

    let authorized = false;
    if (!cronSecret) {
      authorized = true;
    } else if (queryKey === cronSecret || bearerToken === cronSecret) {
      authorized = true;
    } else if (bearerToken) {
      try {
        await getAdminAuth().verifyIdToken(bearerToken);
        authorized = true;
      } catch {
        authorized = false;
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const db = getAdminFirestore();

    // ── 1. Jogos ao vivo + settings em paralelo (2 leituras) ────────────────
    const [liveGamesSnap, settingsSnap] = await Promise.all([
      db.collection("games").where("status", "==", "live").get(),
      db.collection("settings").doc("scoring").get(),
    ]);

    if (liveGamesSnap.empty) {
      return NextResponse.json({ message: "Nenhum jogo ao vivo.", updated: 0 });
    }
    if (!settingsSnap.exists) {
      return NextResponse.json({ error: "settings/scoring não encontrado" }, { status: 500 });
    }
    const settings = settingsSnap.data() as ScoringSettings;

    // ── 2. Placares externos em paralelo ────────────────────────────────────
    const copaGames     = liveGamesSnap.docs.filter((d) => d.data().phase !== "Amistoso");
    const friendlyGames = liveGamesSnap.docs.filter((d) => d.data().phase === "Amistoso");
    const todayUTC = new Date().toISOString().slice(0, 10);

    const [liveMatches, friendlyMatches] = await Promise.all([
      copaGames.length > 0 ? fetchLiveMatches(todayUTC) : Promise.resolve([]),
      friendlyGames.length > 0 ? fetchLiveMatchesApiFootball() : Promise.resolve([]),
    ]);

    // ── 3. Determina quais jogos mudaram de placar ou status ─────────────────
    type GameUpdate = {
      doc: QueryDocumentSnapshot;
      newHomeScore: number;
      newAwayScore: number;
      newStatus: "live" | "finished";
      liveMinute?: number;
    };

    const gameUpdates: GameUpdate[] = [];

    for (const gameDoc of liveGamesSnap.docs) {
      const game = gameDoc.data();
      const isFriendly = game.phase === "Amistoso";

      // Pontuação inicial 0×0: check-lock sinaliza com initialScoreCalculated=false
      // para que, ao primeiro cron após o início do jogo, as apostas recebam pontos
      // mesmo sem mudança de placar (1×0 ainda não saiu, mas 0×0 já vale pontuação).
      // Dispara se false (novo fluxo via check-lock) OU se undefined (jogos que já
      // estavam ao vivo antes do campo existir — cobre o primeiro deploy).
      const needsInitialScore = game.initialScoreCalculated !== true;

      let newHomeScore: number;
      let newAwayScore: number;
      let isFinished: boolean;
      let liveMinute: number | undefined;

      // Placar atual do Firestore (fallback de segurança)
      const currentHome: number = game.homeScore ?? 0;
      const currentAway: number = game.awayScore ?? 0;

      if (isFriendly) {
        const apiMatch = friendlyMatches.find((m) =>
          matchesGameApiFootball(m, game.homeTeam, game.awayTeam)
        );
        if (!apiMatch) {
          // Sem match na API: só processa se for pontuação inicial (0×0)
          if (!needsInitialScore) continue;
          newHomeScore = currentHome;
          newAwayScore = currentAway;
          isFinished = false;
        } else {
          newHomeScore = apiMatch.homeScore;
          newAwayScore = apiMatch.awayScore;
          isFinished = apiFootballStatusToInternal(apiMatch.status) === "finished";
        }
      } else {
        const apiMatch = liveMatches.find((m) =>
          matchesGame(m, game.homeTeam, game.awayTeam)
        );
        if (!apiMatch) {
          // Sem match na API: só processa se for pontuação inicial (0×0)
          if (!needsInitialScore) continue;
          newHomeScore = currentHome;
          newAwayScore = currentAway;
          isFinished = false;
        } else {
          isFinished = apiMatch.status === "FINISHED";

          if (isFinished && apiMatch.homeScore === null) {
            // API ainda não preencheu fullTime (delay ao encerrar).
            // Mantém o placar atual do Firestore como placar final e só atualiza o status.
            console.log(`[live-scores] ${game.homeTeam}×${game.awayTeam}: FINISHED mas fullTime=null → mantendo placar ${currentHome}×${currentAway}`);
            newHomeScore = currentHome;
            newAwayScore = currentAway;
          } else {
            // homeScore não-null: usa o valor da API (incluindo 0×0 legítimos)
            newHomeScore = apiMatch.homeScore ?? currentHome;
            newAwayScore = apiMatch.awayScore ?? currentAway;

            // Guarda extra: placar não pode regredir durante um jogo ao vivo.
            // Se a API retornar um placar menor que o já registrado, mantém o atual.
            if (!isFinished) {
              newHomeScore = Math.max(newHomeScore, currentHome);
              newAwayScore = Math.max(newAwayScore, currentAway);
            }
          }

          if (apiMatch.minute != null) liveMinute = apiMatch.minute;
        }
      }

      const scoreChanged = currentHome !== newHomeScore || currentAway !== newAwayScore;
      const statusChanged = isFinished && game.status !== "finished";

      if (!scoreChanged && !statusChanged && !needsInitialScore) continue;

      if (needsInitialScore) {
        console.log(`[live-scores] ${game.homeTeam}×${game.awayTeam}: calculando pontuação inicial 0×0`);
      }

      gameUpdates.push({
        doc: gameDoc,
        newHomeScore,
        newAwayScore,
        newStatus: isFinished ? "finished" : "live",
        liveMinute,
      });
    }

    if (gameUpdates.length === 0) {
      return NextResponse.json({ message: "Sem mudanças de placar.", updated: 0 });
    }

    // ── 4. Lê apostas de todos os jogos que mudaram em paralelo (N leituras) ─
    const betsSnaps = await Promise.all(
      gameUpdates.map((g) =>
        db.collection("bets").where("gameId", "==", g.doc.id).get()
      )
    );

    // ── 5. Atualiza bet.points para todos os jogos que mudaram ──────────────
    // Usamos pontos ABSOLUTOS (não delta) para evitar condição de corrida
    // quando dois cron runs ocorrem em paralelo e leem o estado antes do commit.
    const betBatch = db.batch();
    for (let i = 0; i < gameUpdates.length; i++) {
      const { newHomeScore, newAwayScore } = gameUpdates[i];
      for (const betDoc of betsSnaps[i].docs) {
        const bet = betDoc.data();
        const newPoints = calculatePoints(
          { homeScore: bet.homeScore, awayScore: bet.awayScore },
          { homeScore: newHomeScore, awayScore: newAwayScore },
          settings
        );
        betBatch.update(betDoc.ref, { points: newPoints });
      }
    }

    // ── 6. Atualiza jogos em batch ────────────────────────────────────────────
    const gameBatch = db.batch();
    for (const g of gameUpdates) {
      const updateData: Record<string, unknown> = {
        homeScore: g.newHomeScore,
        awayScore: g.newAwayScore,
        status: g.newStatus,
        // Marca a pontuação inicial como calculada para não repetir na próxima execução.
        initialScoreCalculated: true,
      };
      if (g.liveMinute != null) updateData.liveMinute = g.liveMinute;
      gameBatch.update(g.doc.ref, updateData);
    }

    // ── 7. Commit apostas e jogos antes de ler o estado final ────────────────
    // Necessário para que a leitura de todas as apostas reflita os novos pontos.
    await Promise.all([betBatch.commit(), gameBatch.commit()]);

    // ── 8. Lê TODAS as apostas para calcular totais absolutos por usuário ─────
    // Soma absoluta elimina race condition: dois runs paralelos produzem o mesmo
    // resultado em vez de duplicar deltas.
    const [allBetsSnap, usersSnap] = await Promise.all([
      db.collection("bets").get(),
      db.collection("users").get(),
    ]);

    const userTotalPoints = new Map<string, number>();
    const userExactHits = new Map<string, number>();
    for (const betDoc of allBetsSnap.docs) {
      const bet = betDoc.data();
      const pts: number = bet.points ?? 0;
      userTotalPoints.set(bet.userId, (userTotalPoints.get(bet.userId) ?? 0) + pts);
      if (pts === settings.exactScore) {
        userExactHits.set(bet.userId, (userExactHits.get(bet.userId) ?? 0) + 1);
      }
    }

    // ── 9. Atualiza usuários com totais absolutos e recalcula ranking ─────────
    const updatedUserData = new Map<string, { totalPoints: number; exactHits: number }>();
    const userBatch = db.batch();
    for (const userDoc of usersSnap.docs) {
      const newTotal = userTotalPoints.get(userDoc.id) ?? 0;
      const newExact = userExactHits.get(userDoc.id) ?? 0;
      userBatch.update(userDoc.ref, { totalPoints: newTotal, exactHits: newExact });
      updatedUserData.set(userDoc.id, { totalPoints: newTotal, exactHits: newExact });
    }

    // ── 10. Recalcula ranking ─────────────────────────────────────────────────
    const sorted = usersSnap.docs.slice().sort((a, b) => {
      const aData = updatedUserData.get(a.id)!;
      const bData = updatedUserData.get(b.id)!;
      const diff = bData.totalPoints - aData.totalPoints;
      return diff !== 0 ? diff : bData.exactHits - aData.exactHits;
    });
    const rankBatch = db.batch();
    sorted.forEach((u, i) => rankBatch.update(u.ref, { rank: i + 1 }));

    // ── 11. Commit usuários e ranking ─────────────────────────────────────────
    await Promise.all([userBatch.commit(), rankBatch.commit()]);

    for (const g of gameUpdates) {
      const game = g.doc.data();
      console.log(
        `[live-scores] ${game.homeTeam} ${g.newHomeScore}×${g.newAwayScore} ${game.awayTeam} → ${g.newStatus}`
      );
    }

    return NextResponse.json({ message: "OK", updated: gameUpdates.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[live-scores] Erro:", msg);
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}
