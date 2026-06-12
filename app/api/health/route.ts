import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/health
 * Diagnóstico do Firebase Admin SDK — sem autenticação necessária.
 * Testa cada passo isoladamente para identificar onde está falhando.
 */
export async function GET(_request: NextRequest) {
  const steps: Record<string, string> = {};

  // Passo 1: variável de ambiente
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) {
    steps.env = "AUSENTE";
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }
  steps.env = "ok";

  // Passo 2: parse do JSON base64
  let serviceAccount: Record<string, string>;
  try {
    serviceAccount = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
    steps.parseJson = `ok (project_id: ${serviceAccount.project_id ?? "N/A"})`;
  } catch (e) {
    steps.parseJson = `ERRO: ${e instanceof Error ? e.message : String(e)}`;
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  // Passo 3: inicializar Firebase Admin + configurar preferRest
  let db: import("firebase-admin/firestore").Firestore;
  try {
    const { getAdminFirestore } = await import("@/lib/firebase/admin");
    db = getAdminFirestore();
    steps.adminInit = "ok (preferRest=true)";
  } catch (e) {
    steps.adminInit = `ERRO: ${e instanceof Error ? e.message : String(e)}`;
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  // Passo 4: leitura simples no Firestore (com timeout manual de 10s)
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout 10s - Firestore inacessivel")), 10000)
    );
    const read = db.collection("settings").doc("scoring").get();
    const snap = await Promise.race([read, timeout]);
    steps.firestoreRead = `ok (exists: ${snap.exists})`;
  } catch (e) {
    steps.firestoreRead = `ERRO: ${e instanceof Error ? e.message : String(e)}`;
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }

  return NextResponse.json({ ok: true, steps });
}
