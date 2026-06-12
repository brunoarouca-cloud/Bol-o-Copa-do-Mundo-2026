import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

/**
 * POST /api/admin/update-user
 * Body: { userId: string; displayName?: string; email?: string }
 *
 * Atualiza nome e/ou email do usuário no Firebase Auth + Firestore.
 * Requer token de admin.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token ausente" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const adminAuth = getAdminAuth();

    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { userId, displayName, email } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId inválido" }, { status: 400 });
    }

    const authUpdates: { displayName?: string; email?: string } = {};
    const firestoreUpdates: Record<string, string> = {};

    if (displayName && typeof displayName === "string") {
      const name = displayName.trim();
      if (name.length < 2) {
        return NextResponse.json({ error: "Nome muito curto (mínimo 2 caracteres)" }, { status: 400 });
      }
      authUpdates.displayName = name;
      firestoreUpdates.displayName = name;
    }

    if (email && typeof email === "string") {
      const emailTrimmed = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
      }
      authUpdates.email = emailTrimmed;
      firestoreUpdates.email = emailTrimmed;
    }

    if (Object.keys(authUpdates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
    }

    // Atualiza Firebase Auth
    await adminAuth.updateUser(userId, authUpdates);

    // Atualiza Firestore
    const db = getAdminFirestore();
    await db.collection("users").doc(userId).update(firestoreUpdates);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[update-user]", msg);
    // Erros comuns do Firebase Auth
    if (msg.includes("EMAIL_ALREADY_EXISTS") || msg.includes("email-already-exists")) {
      return NextResponse.json({ error: "Este e-mail já está em uso por outro usuário." }, { status: 409 });
    }
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}
