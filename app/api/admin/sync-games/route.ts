import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
import { syncKnockoutGames } from "@/lib/sync-games";

/**
 * POST /api/admin/sync-games
 *
 * Sincroniza os jogos eliminatórios (16 avos → Final) com a football-data.org.
 * Atualiza: nomes dos times (PT), escudos, sede, externalId.
 * Nunca sobrescreve: placar, status, pontos.
 *
 * Requer token de admin no header Authorization.
 */
export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token ausente" }, { status: 401 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
    if (!decoded.admin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // ── API Key ─────────────────────────────────────────────────────────────────
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FOOTBALL_DATA_API_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  // ── Sync ────────────────────────────────────────────────────────────────────
  try {
    const db = getAdminFirestore();
    const result = await syncKnockoutGames(db, apiKey);

    return NextResponse.json({
      message: `Sincronização concluída: ${result.updated} atualizados, ${result.unchanged} sem mudança, ${result.skipped} ignorados.`,
      updated: result.updated,
      unchanged: result.unchanged,
      skipped: result.skipped,
      errors: result.errors,
      details: result.details,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[admin/sync-games] Erro:", msg);
    return NextResponse.json({ error: `Erro interno: ${msg}` }, { status: 500 });
  }
}
