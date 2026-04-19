import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";

/**
 * POST /api/bets/clear-open
 * Body: { userId: string }
 *
 * Deleta todas as apostas do usuário em jogos com status "upcoming".
 * Apostas em jogos travados ou encerrados não são afetadas.
 * Só pode ser chamado pelo próprio usuário (token verificado).
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
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId inválido" }, { status: 400 });
    }

    // Usuário só pode limpar as próprias apostas (admins podem limpar de qualquer um)
    if (decodedToken.uid !== userId && !decodedToken.admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const db = getAdminFirestore();

    // Busca apostas do usuário
    const betsSnap = await db
      .collection("bets")
      .where("userId", "==", userId)
      .get();

    if (betsSnap.empty) {
      return NextResponse.json({ deleted: 0, message: "Nenhuma aposta encontrada" });
    }

    // Filtra apenas apostas em jogos "upcoming"
    const betIds: string[] = [];

    // Coleta gameIds únicos
    const gameIds = [...new Set(betsSnap.docs.map((d) => d.data().gameId as string))];

    // Busca status dos jogos em lote
    const gameSnaps = await Promise.all(
      gameIds.map((id) => db.collection("games").doc(id).get())
    );

    const upcomingGameIds = new Set(
      gameSnaps
        .filter((snap) => snap.exists && snap.data()?.status === "upcoming")
        .map((snap) => snap.id)
    );

    for (const betDoc of betsSnap.docs) {
      if (upcomingGameIds.has(betDoc.data().gameId)) {
        betIds.push(betDoc.id);
      }
    }

    if (betIds.length === 0) {
      return NextResponse.json({
        deleted: 0,
        message: "Nenhuma aposta em jogo aberto encontrada",
      });
    }

    // Deleta em lotes de 500 (limite do Firestore batch)
    const BATCH_SIZE = 500;
    let deleted = 0;

    for (let i = 0; i < betIds.length; i += BATCH_SIZE) {
      const batch = db.batch();
      betIds.slice(i, i + BATCH_SIZE).forEach((id) => {
        batch.delete(db.collection("bets").doc(id));
      });
      await batch.commit();
      deleted += Math.min(BATCH_SIZE, betIds.length - i);
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
