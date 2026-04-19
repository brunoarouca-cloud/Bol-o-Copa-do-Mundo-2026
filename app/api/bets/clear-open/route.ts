import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";

/**
 * POST /api/bets/clear-open
 * Body: { userId: string; betIds: string[] }
 *
 * Deleta apostas específicas pelo ID. Só pode ser chamado pelo próprio usuário.
 * Admin SDK usado para contornar "allow delete: if false" nas Firestore rules.
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

    const body = await request.json();
    const { userId, betIds } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId inválido" }, { status: 400 });
    }

    // Só pode limpar as próprias apostas
    if (decodedToken.uid !== userId && !decodedToken.admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (!Array.isArray(betIds) || betIds.length === 0) {
      return NextResponse.json({ deleted: 0, message: "Nenhuma aposta para remover" });
    }

    const db = getAdminFirestore();
    const BATCH_SIZE = 500;
    let deleted = 0;

    for (let i = 0; i < betIds.length; i += BATCH_SIZE) {
      const chunk = betIds.slice(i, i + BATCH_SIZE).filter(
        (id): id is string => typeof id === "string" && id.length > 0
      );

      if (chunk.length === 0) continue; // pula batch vazio

      const batch = db.batch();
      chunk.forEach((id) => {
        batch.delete(db.collection("bets").doc(id));
      });
      await batch.commit();
      deleted += chunk.length;
    }

    return NextResponse.json({
      deleted,
      message: `${deleted} aposta(s) removida(s) com sucesso`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[bets/clear-open] Erro:", msg);
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}
