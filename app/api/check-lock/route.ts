import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET /api/check-lock
 * Trava jogos que estão a menos de lockMinutesBefore minutos do apito.
 * Chamado via cron (Firebase Cloud Function ou Vercel Cron).
 * Protegido por CRON_SECRET no header Authorization.
 */
export async function GET(request: NextRequest) {
  // Verifica autorização
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();

    // Carrega configurações
    const settingsSnap = await db.collection("settings").doc("scoring").get();
    const lockMinutesBefore: number = settingsSnap.data()?.lockMinutesBefore ?? 5;

    const now = Date.now();
    const lockThreshold = now + lockMinutesBefore * 60 * 1000;

    // Busca jogos que deveriam estar travados mas ainda estão "upcoming"
    const gamesSnap = await db
      .collection("games")
      .where("status", "==", "upcoming")
      .where("date", "<=", Timestamp.fromMillis(lockThreshold))
      .get();

    if (gamesSnap.empty) {
      return NextResponse.json({ locked: 0, message: "Nenhum jogo para travar" });
    }

    // Trava em batch
    const batch = db.batch();
    let count = 0;

    gamesSnap.docs.forEach((gameDoc) => {
      batch.update(gameDoc.ref, { status: "locked" });
      count++;
    });

    await batch.commit();

    console.log(`[check-lock] ${count} jogo(s) travado(s)`);

    return NextResponse.json({
      locked: count,
      message: `${count} jogo(s) travado(s) com sucesso`,
    });
  } catch (error) {
    console.error("[check-lock] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
