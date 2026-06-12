"use client";

import { useState, useRef } from "react";
import { useRanking } from "@/hooks/use-ranking";
import { useAuth } from "@/hooks/use-auth";
import { useLivePoll } from "@/hooks/use-live-poll";
import { RankingTable } from "@/components/ranking-table";
import { Button } from "@/components/ui/button";
import { Loader2, ImageDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { UserDoc } from "@/types";

// ── WhatsApp icon ────────────────────────────────────────────────────────────
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ── Text share helpers ────────────────────────────────────────────────────────
function posEmoji(i: number) {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return `${i + 1}º`;
}

// ── Load image helper (returns null on error) ─────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ── Canvas image generator ────────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateRankingCanvas(users: UserDoc[]): Promise<Blob> {
  // Layout em duas colunas para comportar até ~50 participantes visivelmente
  const DISPLAY_USERS = users.slice(0, 50);
  const TWO_COL = DISPLAY_USERS.length > 14; // usa 2 colunas quando há mais de 14

  const DPR = 2;
  const W = TWO_COL ? 820 : 640;
  const PADDING = 24;
  const HEADER_H = 96;
  const FOOTER_H = 40;

  // Dimensões de linha ajustadas conforme número de participantes
  const ROW_H = TWO_COL ? 34 : 58;
  const COL_GAP = 18;
  const NUM_COLS = TWO_COL ? 2 : 1;
  const COL_W = TWO_COL
    ? Math.floor((W - PADDING * 2 - COL_GAP) / 2)
    : W - PADDING * 2;
  const ROWS_PER_COL = TWO_COL
    ? Math.ceil(DISPLAY_USERS.length / 2)
    : DISPLAY_USERS.length;
  const H = HEADER_H + ROWS_PER_COL * ROW_H + FOOTER_H;

  const logoImg = await loadImage("/fifa2026-logo.png");

  const canvas = document.createElement("canvas");
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);

  // ── Background ──────────────────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#0b2416");
  bgGrad.addColorStop(1, "#071610");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 12;
  for (let i = -H; i < W + H; i += 36) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  ctx.restore();

  // ── Header ──────────────────────────────────────────────────────────────────
  const hGrad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  hGrad.addColorStop(0, "#0f7633");
  hGrad.addColorStop(0.6, "#0d6228");
  hGrad.addColorStop(1, "#0a4d1f");
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, W, HEADER_H);

  const goldGrad = ctx.createLinearGradient(0, 0, W, 0);
  goldGrad.addColorStop(0, "#c9a01b");
  goldGrad.addColorStop(0.5, "#f5d060");
  goldGrad.addColorStop(1, "#c9a01b");
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, HEADER_H - 4, W, 4);

  ctx.fillStyle = "#ffffff";
  const EMOJI_FONT = `20px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  const TEXT_FONT_BOLD = `bold 20px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  const TEXT_FONT = `400 12px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  const TEXT_FONT_SM = `600 13px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  const TITLE_Y = 38;
  const LOGO_H = 28;

  ctx.font = EMOJI_FONT;
  ctx.fillText("⚽", PADDING, TITLE_Y);
  ctx.font = TEXT_FONT_BOLD;
  ctx.fillText("Bolão Copa do Mundo", PADDING + 28, TITLE_Y);

  if (logoImg) {
    const titleTextW = ctx.measureText("Bolão Copa do Mundo").width;
    const logoW = Math.round((logoImg.width / logoImg.height) * LOGO_H);
    ctx.drawImage(logoImg, PADDING + 28 + titleTextW + 10, TITLE_Y - LOGO_H + 4, logoW, LOGO_H);
  } else {
    ctx.font = TEXT_FONT_BOLD;
    const titleTextW = ctx.measureText("Bolão Copa do Mundo").width;
    ctx.fillStyle = "#f5d060";
    ctx.fillText("2026", PADDING + 28 + titleTextW + 10, TITLE_Y);
    ctx.fillStyle = "#ffffff";
  }

  ctx.fillStyle = "#86efac";
  ctx.font = TEXT_FONT_SM;
  ctx.fillText("Classificação Parcial", PADDING, 60);
  ctx.fillStyle = "#4ade80";
  ctx.font = TEXT_FONT;
  ctx.fillText(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), PADDING, 76);

  // Leader badge (top right of header)
  const leader = DISPLAY_USERS[0];
  if (leader) {
    const bw = 120; const bh = 78;
    const bx = W - PADDING - bw; const by = 8;
    roundRect(ctx, bx, by, bw, bh, 10);
    ctx.fillStyle = "rgba(201,160,27,0.25)"; ctx.fill();
    ctx.strokeStyle = "#c9a01b"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = `13px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.fillStyle = "#f5d060";
    ctx.fillText("🏆", bx + bw / 2 - 22, by + 22);
    ctx.font = `bold 13px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
    ctx.fillText("Lider", bx + bw / 2 + 8, by + 22);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 12px system-ui, sans-serif`;
    let leaderName = leader.displayName;
    while (ctx.measureText(leaderName).width > bw - 16 && leaderName.length > 6)
      leaderName = leaderName.slice(0, -1);
    if (leaderName !== leader.displayName) leaderName += "…";
    ctx.fillText(leaderName, bx + bw / 2, by + 44);
    ctx.fillStyle = "#fde68a";
    ctx.font = `bold 18px system-ui, sans-serif`;
    ctx.fillText(`${leader.totalPoints} pts`, bx + bw / 2, by + 68);
    ctx.textAlign = "left";
  }

  // ── Divisor vertical entre colunas ──────────────────────────────────────────
  if (TWO_COL) {
    const divX = PADDING + COL_W + COL_GAP / 2;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(divX - 0.5, HEADER_H + 4, 1, ROWS_PER_COL * ROW_H - 8);
  }

  // ── Rows ────────────────────────────────────────────────────────────────────
  const ACCENT = ["#f59e0b", "#94a3b8", "#cd7c34"];
  const BADGE_GRAD_STOPS: [string, string][] = [
    ["#fde68a", "#d97706"],
    ["#e2e8f0", "#94a3b8"],
    ["#fed7aa", "#c2410c"],
  ];

  // Medidas ajustadas para duas colunas (rows menores)
  const bR = TWO_COL ? 11 : 16;               // raio do badge
  const nameFontSize = TWO_COL ? 12 : 15;
  const ptsFontSize = TWO_COL ? 13 : 17;
  const badgeX_offset = TWO_COL ? 14 : 18;    // centro do badge a partir da borda da coluna
  const nameX_offset = TWO_COL ? 30 : 48;     // início do nome a partir da borda da coluna
  const ptsAreaW = TWO_COL ? 58 : 90;         // largura reservada para pontos + exatos

  DISPLAY_USERS.forEach((u, i) => {
    // Posição na grade de colunas
    const col = TWO_COL && i >= ROWS_PER_COL ? 1 : 0;
    const row = col === 1 ? i - ROWS_PER_COL : i;
    const colX = PADDING + col * (COL_W + COL_GAP);
    const y = HEADER_H + row * ROW_H;
    const cy = y + ROW_H / 2;
    const isTop3 = i < 3;

    // Fundo alternado da linha
    if (row % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.035)";
      ctx.fillRect(colX, y, COL_W, ROW_H);
    }

    // Stripe colorida top 3 (na borda esquerda da coluna)
    if (isTop3) {
      ctx.fillStyle = ACCENT[i];
      ctx.fillRect(colX, y, 3, ROW_H);
    }

    // Badge de posição
    const bCx = colX + badgeX_offset;
    if (isTop3) {
      const bGrad = ctx.createRadialGradient(bCx - 3, cy - 3, 1, bCx, cy, bR);
      bGrad.addColorStop(0, BADGE_GRAD_STOPS[i][0]);
      bGrad.addColorStop(1, BADGE_GRAD_STOPS[i][1]);
      ctx.beginPath();
      ctx.arc(bCx, cy, bR, 0, Math.PI * 2);
      ctx.fillStyle = bGrad;
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
    } else {
      ctx.fillStyle = i < 10 ? "#6b7280" : "#4b5563";
    }
    ctx.font = `bold ${TWO_COL ? 11 : 14}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), bCx, cy + (TWO_COL ? 4 : 5));
    ctx.textAlign = "left";

    // Nome
    const nameX = colX + nameX_offset;
    const maxNameW = COL_W - nameX_offset - ptsAreaW - 4;
    ctx.fillStyle = isTop3 ? "#f8fafc" : "#d1d5db";
    ctx.font = `${isTop3 ? "bold" : "600"} ${nameFontSize}px system-ui, sans-serif`;
    let name = u.displayName;
    while (ctx.measureText(name).width > maxNameW && name.length > 6)
      name = name.slice(0, -1);
    if (name !== u.displayName) name += "…";
    ctx.fillText(name, nameX, cy + 4);

    // Pontos
    const ptsX = colX + COL_W - (TWO_COL ? 2 : 70);
    ctx.textAlign = "right";
    ctx.fillStyle = isTop3 ? "#fde68a" : "#e2e8f0";
    ctx.font = `bold ${ptsFontSize}px system-ui, sans-serif`;
    ctx.fillText(String(u.totalPoints), ptsX, cy + (TWO_COL ? 2 : 1));
    ctx.fillStyle = "#6b7280";
    ctx.font = `400 ${TWO_COL ? 9 : 10}px system-ui, sans-serif`;
    ctx.fillText("pts", ptsX + (TWO_COL ? 2 : 3), cy + (TWO_COL ? 11 : 13));
    ctx.textAlign = "left";

    // Exatos (pill pequena no modo duas colunas, pill maior no modo uma coluna)
    if (!TWO_COL) {
      if (u.exactHits > 0) {
        const pillW = 54; const pillH = 20;
        const pillX = W - PADDING - pillW;
        roundRect(ctx, pillX, cy - pillH / 2, pillW, pillH, 10);
        ctx.fillStyle = isTop3 ? "rgba(21,83,44,0.9)" : "rgba(21,83,44,0.7)";
        ctx.fill();
        ctx.fillStyle = "#4ade80";
        ctx.font = `bold 10px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(`${u.exactHits} exato${u.exactHits !== 1 ? "s" : ""}`, pillX + pillW / 2, cy + 4);
        ctx.textAlign = "left";
      } else {
        ctx.fillStyle = "#374151";
        ctx.font = `400 13px system-ui, sans-serif`;
        ctx.textAlign = "right";
        ctx.fillText("—", W - PADDING, cy + 4);
        ctx.textAlign = "left";
      }
    }

    // Separador inferior
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    ctx.fillRect(colX, y + ROW_H - 1, COL_W, 1);
  });

  // ── Footer ──────────────────────────────────────────────────────────────────
  const footY = H - FOOTER_H;
  const lineGrad2 = ctx.createLinearGradient(PADDING, 0, W - PADDING, 0);
  lineGrad2.addColorStop(0, "transparent");
  lineGrad2.addColorStop(0.2, "#c9a01b");
  lineGrad2.addColorStop(0.8, "#c9a01b");
  lineGrad2.addColorStop(1, "transparent");
  ctx.fillStyle = lineGrad2;
  ctx.fillRect(PADDING, footY + 6, W - PADDING * 2, 1);

  ctx.fillStyle = "#6b7280";
  ctx.font = `400 11px system-ui, sans-serif`;
  ctx.fillText(
    `${users.length} participante${users.length !== 1 ? "s" : ""} · Desempate por placares exatos`,
    PADDING, footY + 26
  );
  ctx.textAlign = "right";
  ctx.fillStyle = "#4b5563";
  ctx.fillText("Bolão Copa do Mundo 2026", W - PADDING, footY + 26);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/png"
    );
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ClassificacaoPage() {
  const { user } = useAuth();
  const { users, loading } = useRanking();
  const { hasLiveGames } = useLivePoll();
  const [sharingText, setSharingText] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  // Ref guard síncrono — evita dupla geração antes do re-render do disabled
  const sharingImageLock = useRef(false);

  // ── Share as text (WhatsApp) ────────────────────────────────────────────────
  async function handleShareText() {
    if (users.length === 0) return;
    setSharingText(true);
    try {
      const geradoEm = format(new Date(), "dd/MM 'às' HH:mm", { locale: ptBR });
      const divider = "─────────────────────";
      const rows = users
        .slice(0, 20)
        .map((u, i) => {
          const exact = u.exactHits > 0 ? ` (${u.exactHits} exato${u.exactHits !== 1 ? "s" : ""})` : "";
          return `${posEmoji(i)} ${u.displayName} — *${u.totalPoints} pts*${exact}`;
        })
        .join("\n");
      const suffix = users.length > 20 ? `\n_...e mais ${users.length - 20} participante(s)_` : "";
      const text = [
        "⚽ *BOLÃO COPA DO MUNDO 2026*",
        `🏆 *Classificação* — ${geradoEm}`,
        divider,
        "",
        rows,
        suffix,
        "",
        divider,
        `👥 ${users.length} participante${users.length !== 1 ? "s" : ""} · Desempate por placares exatos`,
      ]
        .join("\n")
        .trim();

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado!", { description: "Cole no WhatsApp com Ctrl+V / Cmd+V." });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("Não foi possível compartilhar.");
    } finally {
      setSharingText(false);
    }
  }

  // ── Share as image ──────────────────────────────────────────────────────────
  async function handleShareImage() {
    if (users.length === 0 || sharingImageLock.current) return;
    sharingImageLock.current = true;
    setSharingImage(true);
    try {
      const blob = await generateRankingCanvas(users);
      const file = new File([blob], "bolao-classificacao.png", { type: "image/png" });

      // Web Share API with file support (mobile)
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Bolão Copa do Mundo 2026 — Classificação",
        });
        return;
      }

      // Fallback: download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bolao-classificacao.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Imagem baixada!", {
        description: "No celular, compartilhar por imagem abre o seletor nativo.",
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Erro ao gerar imagem:", err);
      toast.error("Erro ao gerar imagem. Tente novamente.");
    } finally {
      sharingImageLock.current = false;
      setSharingImage(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Classificação</h1>
          <p className="text-muted-foreground text-sm">
            Ranking em tempo real · Todos os participantes · Desempate por placares exatos
          </p>
        </div>

        {/* Share buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Text */}
          <Button
            size="sm"
            onClick={handleShareText}
            disabled={sharingText || loading || users.length === 0}
            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white border-0 shadow-sm"
            title="Compartilhar classificação como texto"
          >
            {sharingText ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <WhatsAppIcon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline text-xs">Texto</span>
          </Button>

          {/* Image */}
          <Button
            size="sm"
            onClick={handleShareImage}
            disabled={sharingImage || loading || users.length === 0}
            variant="outline"
            className="flex items-center gap-1.5 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 shadow-sm"
            title="Compartilhar classificação como imagem"
          >
            {sharingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageDown className="h-4 w-4" />
            )}
            <span className="hidden sm:inline text-xs">Imagem</span>
          </Button>
        </div>
      </div>

      <RankingTable users={users} currentUserId={user?.uid} hasLiveGames={hasLiveGames} />
    </div>
  );
}
