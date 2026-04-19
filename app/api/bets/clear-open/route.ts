import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";

/**
 * POST /api/bets/clear-open
 * Body: { userId: string; betIds: string[] }
 *
 * Deleta apostas específicas do usuário (IDs enviados pelo cliente).
 * Verifica que cada aposta pertence ao userId informado.
 * Admin SDK é usado para contornar a regra "allow delete: if false".
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
    if (!Array.isArray(betIds) || betIds.length === 0) {
      return NextResponse.json({ deleted: 0, message: "Nenhuma aposta para remover" });
    }

    // Só pode limpar as próprias apostas (admins podem limpar de qualquer um)
    if (decodedToken.uid !== userId && !decodedToken.admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const db = getAdminFirestore();

    // Deleta em lotes de 500 (limite do Firestore batch)
    const BATCH_SIZE = 500;
    let deleted = 0;

    for (let i = 0; i < betIds.length; i += BATCH_SIZE) {
      const batch = db.batch();
      betIds.slice(i, i + BATCH_SIZE).forEach((id: string) => {
        // Garante formato correto: betId = `${userId}_${gameId}`
        if (id.startsWith(userId + "_")) {
          batch.delete(db.collection("bets").doc(id));
          deleted++;
        }
      });
      await batch.commit();
    }

    return NextResponse.json({
      deleted,
      message: `${deleted} aposta(s) removida(s) com sucesso`,
    });
  } catch (error) {
    console.error("[bets/clear-open] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
