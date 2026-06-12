import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

/**
 * POST /api/admin/cleanup-orphan-bets
 * Remove todas as apostas (bets + nominalBets) cujo userId
 * não corresponde a nenhum documento em users/.
 * Requer token de admin.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!bearerToken) return NextResponse.json({ error: "Token ausente" }, { status: 401 });

  try {
    const decoded = await getAdminAuth().verifyIdToken(bearerToken);
    if (!decoded.admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const db = getAdminFirestore();

  // 1. Carrega todos os UIDs existentes em users/
  const usersSnap = await db.collection("users").get();
  const validUids = new Set(usersSnap.docs.map((d) => d.id));

  // Helper: deleta docs em batches de 500
  async function deleteDocs(docs: QueryDocumentSnapshot[]) {
    for (let i = 0; i < docs.length; i += 500) {
      const batch = db.batch();
      docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // 2. Varre bets
  const betsSnap = await db.collection("bets").get();
  const orphanBets = betsSnap.docs.filter((d) => !validUids.has(d.data().userId));

  // 3. Varre nominalBets
  const nominalSnap = await db.collection("nominalBets").get();
  const orphanNominal = nominalSnap.docs.filter((d) => !validUids.has(d.data().userId));

  await deleteDocs(orphanBets);
  await deleteDocs(orphanNominal);

  return NextResponse.json({
    ok: true,
    deletedBets: orphanBets.length,
    deletedNominalBets: orphanNominal.length,
  });
}
