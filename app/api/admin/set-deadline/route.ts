import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * POST /api/admin/set-deadline
 * Body: { deadlineISO: string }  — data em formato ISO UTC
 * Atualiza nominalDeadline em settings/scoring.
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

  const { deadlineISO } = await request.json();
  if (!deadlineISO) return NextResponse.json({ error: "deadlineISO obrigatório" }, { status: 400 });

  const db = getAdminFirestore();
  const ts = Timestamp.fromDate(new Date(deadlineISO));
  await db.collection("settings").doc("scoring").update({ nominalDeadline: ts });

  return NextResponse.json({ ok: true, deadline: deadlineISO });
}
