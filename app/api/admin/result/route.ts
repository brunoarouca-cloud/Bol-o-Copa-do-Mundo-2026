import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
import { resultSchema } from "@/lib/zod-schemas";

/**
 * POST /api/admin/result
 * Body: { gameId, homeScore, awayScore }
 *
 * Insere resultado de um jogo e dispara recálculo de pontos.
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

    // Atualiza resultado e status
    await gameRef.update({
      homeScore,
      awayScore,
      status: "finished",
    });

    // Dispara recálculo internamente
    const recalcUrl = new URL("/api/recalculate", request.url);
    const cronSecret = process.env.CRON_SECRET ?? "";

    const recalcResponse = await fetch(recalcUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ gameId }),
    });

    const recalcResult = await recalcResponse.json();

    return NextResponse.json({
      message: "Resultado salvo com sucesso",
      game: { gameId, homeScore, awayScore },
      recalculate: recalcResult,
    });
  } catch (error) {
    console.error("[admin/result] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
