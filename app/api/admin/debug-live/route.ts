import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
import { fetchLiveMatches, matchesGame } from "@/lib/football-api";

/**
 * GET /api/admin/debug-live
 * Diagnóstico completo do pipeline de atualização de placares.
 * Requer: query ?key=<CRON_SECRET> ou Bearer token de admin.
 */
export async function GET(request: NextRequest) {
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const queryKey = request.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET;

  let authorized = false;
  if (!cronSecret) authorized = true;
  else if (queryKey === cronSecret || bearerToken === cronSecret) authorized = true;
  else if (bearerToken) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(bearerToken);
      if (decoded.admin) authorized = true;
    } catch { /* noop */ }
  }
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminFirestore();
  const todayUTC = new Date().toISOString().slice(0, 10);
  const nowMs = Date.now();

  // 1. Jogos ao vivo no Firestore
  const liveSnap = await db.collection("games").where("status", "==", "live").get();
  const liveGames = liveSnap.docs.map((d) => ({
    id: d.id,
    homeTeam: d.data().homeTeam,
    awayTeam: d.data().awayTeam,
    homeScore: d.data().homeScore,
    awayScore: d.data().awayScore,
    phase: d.data().phase,
    date: d.data().date?.toDate?.()?.toISOString(),
    status: d.data().status,
  }));

  // 2. Jogos "locked" (podem precisar ir para "live")
  const lockedSnap = await db.collection("games").where("status", "==", "locked").get();
  const lockedGames = lockedSnap.docs.map((d) => ({
    id: d.id,
    homeTeam: d.data().homeTeam,
    awayTeam: d.data().awayTeam,
    phase: d.data().phase,
    date: d.data().date?.toDate?.()?.toISOString(),
    shouldBeLive: (d.data().date?.toMillis?.() ?? 0) <= nowMs,
  }));

  // 3. Jogos "upcoming" próximos (próximas 3h)
  const upcomingSnap = await db.collection("games").where("status", "==", "upcoming").get();
  const threeHours = nowMs + 3 * 60 * 60 * 1000;
  const upcomingSoon = upcomingSnap.docs
    .filter((d) => {
      const t = d.data().date?.toMillis?.() ?? 0;
      return t <= threeHours && t > 0;
    })
    .map((d) => ({
      id: d.id,
      homeTeam: d.data().homeTeam,
      awayTeam: d.data().awayTeam,
      date: d.data().date?.toDate?.()?.toISOString(),
      minsUntilStart: Math.round(((d.data().date?.toMillis?.() ?? 0) - nowMs) / 60000),
    }));

  // 4. O que a API retornou hoje
  let apiMatches: object[] = [];
  let apiError: string | null = null;
  try {
    const matches = await fetchLiveMatches(todayUTC);
    apiMatches = matches.map((m) => ({
      homeTeam: m.homeTeamEn,
      awayTeam: m.awayTeamEn,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      minute: m.minute,
    }));
  } catch (e) {
    apiError = e instanceof Error ? e.message : String(e);
  }

  // 5. Testa matchesGame para cada jogo ao vivo
  type MatchAttempt = {
    firestoreGame: string;
    apiMatchFound: string;
    newScore?: string;
  };
  const matchAttempts: MatchAttempt[] = liveGames.map((game) => {
    const typedApiMatches = apiMatches as Array<{
      homeTeam: string;
      awayTeam: string;
      homeScore: number;
      awayScore: number;
      status: string;
    }>;

    // Usa a mesma lógica de matchesGame
    const apiMatch = typedApiMatches.find((m) =>
      matchesGame(
        { homeTeamEn: m.homeTeam, awayTeamEn: m.awayTeam, homeScore: m.homeScore, awayScore: m.awayScore, status: m.status as "IN_PLAY" | "PAUSED" | "FINISHED" | "SCHEDULED" | "SUSPENDED" | "POSTPONED", minute: null, externalId: 0 },
        game.homeTeam,
        game.awayTeam
      )
    );

    return {
      firestoreGame: `${game.homeTeam} × ${game.awayTeam}`,
      apiMatchFound: apiMatch
        ? `${apiMatch.homeTeam} × ${apiMatch.awayTeam} (${apiMatch.status})`
        : "NÃO ENCONTRADO",
      newScore: apiMatch ? `${apiMatch.homeScore}×${apiMatch.awayScore}` : undefined,
    };
  });

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    todayUTC,
    summary: {
      liveCount: liveGames.length,
      lockedCount: lockedGames.length,
      lockedShouldBeLive: lockedGames.filter((g) => g.shouldBeLive).length,
      apiMatchCount: apiMatches.length,
      apiError,
    },
    liveGamesInFirestore: liveGames,
    lockedGamesInFirestore: lockedGames,
    upcomingSoon,
    apiMatchesReturned: apiMatches,
    matchAttempts,
  });
}
