import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

/**
 * POST /api/admin/password-reset-link
 * Body: { email: string }
 * Retorna o link de redefinição de senha gerado pelo Admin SDK.
 * O admin pode copiar e enviar diretamente ao usuário (WhatsApp, etc.).
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

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });

  try {
    const link = await getAdminAuth().generatePasswordResetLink(email);
    return NextResponse.json({ link });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
