import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";

/**
 * POST /api/admin/clear-result
 * Body: { gameId }
 *
 * Remove o resultado de um jogo (zera placar, volta status para upcoming).
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
    const { gameId } = body;
    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json({ error: "gameId inválido" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const gameRef = db.collection("games").doc(gameId);
    const gameSnap = await gameRef.get();

    if (!gameSnap.exists) {
      return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
    }

    await gameRef.update({
      homeScore: null,
      awayScore: null,
      status: "upcoming",
    });

    return NextResponse.json({ message: "Resultado removido com sucesso", gameId });
  } catch (error) {
    console.error("[admin/clear-result] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
