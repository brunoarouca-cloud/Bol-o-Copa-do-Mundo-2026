import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";

/**
 * POST /api/admin/toggle-payment
 * Body: { userId: string; hasPaid: boolean }
 *
 * Atualiza o status de pagamento de um usuário.
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
    const { userId, hasPaid } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId inválido" }, { status: 400 });
    }
    if (typeof hasPaid !== "boolean") {
      return NextResponse.json({ error: "hasPaid deve ser boolean" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    await userRef.update({ hasPaid });

    return NextResponse.json({
      message: `Usuário ${hasPaid ? "marcado como pago" : "marcado como pendente"}`,
      userId,
      hasPaid,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[admin/toggle-payment] Erro:", msg);
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}
