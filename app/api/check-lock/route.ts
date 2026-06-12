import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";

/**
 * GET /api/check-lock
 * Executado a cada minuto via cron-job.org. Faz três coisas automaticamente:
 * 1. Trava jogos "upcoming" dentro da janela de lockMinutesBefore.
 * 2. Marca como "live" jogos "locked" cujo horário de início já passou.
 * 3. Os jogos "live" são então atualizados pelo cron live-scores (football-data.org).
 * Auth: CRON_SECRET (cron) | query ?key= | Firebase admin token (painel).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // Aceita autenticação via: header Authorization, query param ?key= ou token admin Firebase
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const queryKey = request.nextUrl.searchParams.get("key");

  let authorized = false;
  if (!cronSecret) {
    authorized = true;
  } else if (queryKey === cronSecret || bearerToken === cronSecret) {
    authorized = true;
  } else if (bearerToken) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(bearerToken);
      if (decoded.admin === true) authorized = true;
    } catch { /* token inválido */ }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();

    // Carrega configurações
    const settingsSnap = await db.collection("settings").doc("scoring").get();
    const lockMinutesBefore: number = settingsSnap.data()?.lockMinutesBefore ?? 5;

    const now = Date.now();
    const nowMs = now;
    const lockThresholdMs = now + lockMinutesBefore * 60 * 1000;

    // ── 1. Travar jogos "upcoming" dentro da janela ──────────────────────────
    // Filtramos em memória para evitar dependência de índice composto no Firestore
    const upcomingSnap = await db
      .collection("games")
      .where("status", "==", "upcoming")
      .get();

    const toLock = upcomingSnap.docs.filter((d) => {
      const dateMs: number = d.data().date?.toMillis?.() ?? 0;
      return dateMs <= lockThresholdMs;
    });

    let locked = 0;
    if (toLock.length > 0) {
      const lockBatch = db.batch();
      toLock.forEach((d) => {
        lockBatch.update(d.ref, { status: "locked" });
        locked++;
      });
      await lockBatch.commit();
      console.log(`[check-lock] ${locked} jogo(s) travado(s)`);
    }

    // ── 2. Marcar como "live" jogos "locked" cujo horário já passou ──────────
    const lockedSnap = await db
      .collection("games")
      .where("status", "==", "locked")
      .get();

    const toGoLive = lockedSnap.docs.filter((d) => {
      const dateMs: number = d.data().date?.toMillis?.() ?? 0;
      return dateMs <= nowMs;
    });

    let wentLive = 0;
    if (toGoLive.length > 0) {
      const liveBatch = db.batch();
      toGoLive.forEach((d) => {
        liveBatch.update(d.ref, {
          status: "live",
          homeScore: d.data().homeScore ?? 0,
          awayScore: d.data().awayScore ?? 0,
          // Sinaliza que a pontuação inicial 0×0 ainda não foi calculada.
          // live-scores vai detectar este flag e calcular os pontos parciais
          // mesmo sem mudança de placar (partida iniciou com 0×0).
          initialScoreCalculated: false,
        });
        wentLive++;
      });
      await liveBatch.commit();
      console.log(`[check-lock] ${wentLive} jogo(s) marcado(s) como ao vivo`);
    }

    return NextResponse.json({
      locked,
      wentLive,
      message: `${locked} travado(s), ${wentLive} ao vivo`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[check-lock] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
