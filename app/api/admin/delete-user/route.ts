import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

/**
 * DELETE /api/admin/delete-user
 * Body: { userId: string }
 * Remove o usuário do Firebase Auth + documento Firestore users/
 * + todas as apostas (bets) e apostas nominais (nominalBets) do usuário.
 * Requer token de admin.
 */
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearerToken) return NextResponse.json({ error: "Token ausente" }, { status: 401 });

  try {
    const decoded = await getAdminAuth().verifyIdToken(bearerToken);
    if (!decoded.admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

  const db = getAdminFirestore();
  const errors: string[] = [];

  // 1. Remove da Firebase Auth (ignora se já não existir)
  try {
    await getAdminAuth().deleteUser(userId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("USER_NOT_FOUND") && !msg.includes("user-not-found")) {
      errors.push(`Auth: ${msg}`);
    }
  }

  // 2. Remove documento users/
  try {
    await db.collection("users").doc(userId).delete();
  } catch (err) {
    errors.push(`users: ${err instanceof Error ? err.message : err}`);
  }

  // 3. Remove todas as apostas de jogos (bets)
  try {
    const betsSnap = await db.collection("bets").where("userId", "==", userId).get();
    if (!betsSnap.empty) {
      // Firestore limita batches a 500 operações
      const chunks: QueryDocumentSnapshot[][] = [];
      for (let i = 0; i < betsSnap.docs.length; i += 500) {
        chunks.push(betsSnap.docs.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
  } catch (err) {
    errors.push(`bets: ${err instanceof Error ? err.message : err}`);
  }

  // 4. Remove apostas nominais (nominalBets)
  try {
    const nominalSnap = await db.collection("nominalBets").where("userId", "==", userId).get();
    if (!nominalSnap.empty) {
      const batch = db.batch();
      nominalSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    errors.push(`nominalBets: ${err instanceof Error ? err.message : err}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" | ") }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
