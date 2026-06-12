import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

const updateGameSchema = z.object({
  gameId: z.string().min(1),
  status: z.enum(["upcoming", "locked", "live", "finished"]).optional(),
  dateUTC: z.string().datetime().optional(),
});

/**
 * POST /api/admin/update-game
 * Body: { gameId, status?, dateUTC? }
 *
 * Atualiza status e/ou data/hora de um jogo.
 * Útil para testes e correções de horário.
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
    const parsed = updateGameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { gameId, status, dateUTC } = parsed.data;

    if (!status && !dateUTC) {
      return NextResponse.json(
        { error: "Informe ao menos status ou dateUTC" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const gameRef = db.collection("games").doc(gameId);
    const gameSnap = await gameRef.get();

    if (!gameSnap.exists) {
      return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (status) {
      updates.status = status;
      // Se forçar "live" e não tiver placar, inicializa 0×0
      if (status === "live" && gameSnap.data()?.homeScore == null) {
        updates.homeScore = 0;
        updates.awayScore = 0;
      }
      // Se voltar para "upcoming" ou "locked", limpa placar se estava live
      if ((status === "upcoming" || status === "locked") && gameSnap.data()?.status === "live") {
        updates.homeScore = null;
        updates.awayScore = null;
      }
    }

    if (dateUTC) {
      updates.date = Timestamp.fromDate(new Date(dateUTC));
    }

    await gameRef.update(updates);

    return NextResponse.json({
      message: "Jogo atualizado com sucesso",
      gameId,
      updates: { status, dateUTC },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[admin/update-game] Erro:", msg);
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}
