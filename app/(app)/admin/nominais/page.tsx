"use client";

import { useState, useEffect, useMemo } from "react";
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Users, MessageCircle, CheckCircle2, Share2, Download, Image as ImageIcon, BarChart2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TEAM_NAMES } from "@/data/teams-2026";
import { TOP_SCORER_CANDIDATES } from "@/data/top-scorers-2026";
import type { NominalResults, NominalCategory, UserDoc, NominalBet } from "@/types";

const WHATSAPP_NUMBER = "5521996169535";

const CATEGORIES: { key: NominalCategory; label: string; icon: string }[] = [
  { key: "champion",  label: "Campeão",       icon: "🏆" },
  { key: "runnerUp",  label: "Vice-campeão",   icon: "🥈" },
  { key: "thirdPlace",label: "Terceiro lugar", icon: "🥉" },
  { key: "topScorer", label: "Artilheiro",     icon: "⚽" },
];

interface PendingUser {
  user: UserDoc;
  missingCategories: string[];
}

export default function AdminNominaisPage() {
  const [results, setResults] = useState<Partial<NominalResults>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pendentes
  const [paidUsers, setPaidUsers] = useState<UserDoc[]>([]);
  const [nominalBets, setNominalBets] = useState<NominalBet[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [showPending, setShowPending] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    const ref = doc(db, "nominalResults", "global");
    getDoc(ref).then((snap) => {
      if (snap.exists()) setResults(snap.data() as NominalResults);
      setLoading(false);
    });
  }, []);

  // Carrega usuários pagos
  useEffect(() => {
    const q = query(collection(db, "users"), where("hasPaid", "==", true));
    return onSnapshot(q, (snap) => {
      setPaidUsers(snap.docs.map((d) => d.data() as UserDoc));
    });
  }, []);

  // Carrega todas as apostas nominais
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "nominalBets"), (snap) => {
      setNominalBets(snap.docs.map((d) => d.data() as NominalBet));
      setPendingLoading(false);
    });
    return unsub;
  }, []);

  // Calcula pendentes por usuário
  const pendingUsers: PendingUser[] = paidUsers
    .map((user) => {
      const userBets = nominalBets.filter((b) => b.userId === user.uid);
      const bettedCategories = new Set(userBets.map((b) => b.category));
      const missingCategories = CATEGORIES
        .filter((c) => !bettedCategories.has(c.key))
        .map((c) => `${c.icon} ${c.label}`);
      return { user, missingCategories };
    })
    .filter((u) => u.missingCategories.length > 0);

  const totalPaid = paidUsers.length;
  const totalComplete = totalPaid - pendingUsers.length;

  // ── Estatísticas de apostas nominais ────────────────────────────────────────
  type StatRow = { prediction: string; count: number; pct: number };
  type CategoryStatsMap = Record<NominalCategory, StatRow[]>;

  const nominalStats = useMemo<CategoryStatsMap>(() => {
    const buildStats = (category: NominalCategory): StatRow[] => {
      const betsForCat = nominalBets.filter((b) => b.category === category);
      const total = betsForCat.length;
      if (total === 0) return [];

      const counts = new Map<string, number>();
      betsForCat.forEach((b) => {
        counts.set(b.prediction, (counts.get(b.prediction) ?? 0) + 1);
      });

      return Array.from(counts.entries())
        .map(([prediction, count]) => ({
          prediction,
          count,
          pct: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count || a.prediction.localeCompare(b.prediction, "pt-BR"));
    };

    return {
      champion:   buildStats("champion"),
      runnerUp:   buildStats("runnerUp"),
      thirdPlace: buildStats("thirdPlace"),
      topScorer:  buildStats("topScorer"),
    };
  }, [nominalBets]);

  function handleShareWhatsApp() {
    if (pendingUsers.length === 0) return;

    const lines = pendingUsers.map((p, i) =>
      `${i + 1}. ${p.user.displayName} — faltam: ${p.missingCategories.join(", ")}`
    );

    const text = [
      "⚽ *BOLÃO COPA DO MUNDO 2026*",
      "⭐ *Apostas Nominais Pendentes*",
      "─────────────────────",
      "",
      `${pendingUsers.length} participante(s) ainda não completaram as apostas nominais:`,
      "",
      ...lines,
      "",
      "─────────────────────",
      "⏰ Faça suas apostas nominais antes do início da Copa!",
    ].join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  function handleShareAllBets() {
    const usersWithBets = paidUsers
      .map((user) => {
        const userBets = nominalBets.filter((b) => b.userId === user.uid);
        if (userBets.length === 0) return null;
        const betMap: Record<string, string> = {};
        userBets.forEach((b) => { betMap[b.category] = b.prediction; });
        return { user, betMap };
      })
      .filter(Boolean) as { user: UserDoc; betMap: Record<string, string> }[];

    if (usersWithBets.length === 0) {
      toast.error("Nenhuma aposta nominal registrada ainda.");
      return;
    }

    usersWithBets.sort((a, b) =>
      a.user.displayName.localeCompare(b.user.displayName, "pt-BR")
    );

    const lines: string[] = [];
    usersWithBets.forEach((entry, i) => {
      const { user, betMap } = entry;
      lines.push(`*${i + 1}. ${user.displayName}*`);
      CATEGORIES.forEach(({ key, icon, label }) => {
        const val = betMap[key];
        lines.push(`   ${icon} ${label}: ${val ?? "—"}`);
      });
      lines.push("");
    });

    const completeCount = paidUsers.filter((u) => {
      const userBets = nominalBets.filter((b) => b.userId === u.uid);
      return CATEGORIES.every((c) => userBets.some((b) => b.category === c.key));
    }).length;

    const text = [
      String.fromCodePoint(0x26BD) + " *BOLÃO COPA DO MUNDO 2026*",
      String.fromCodePoint(0x1F3C6) + " *Apostas Nominais — Palpites do Grupo*",
      "─────────────────────",
      "",
      ...lines,
      "─────────────────────",
      `${String.fromCodePoint(0x2705)} ${completeCount} de ${paidUsers.length} participantes com apostas completas`,
    ].join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  async function handleGenerateImage() {
    const usersWithBets = paidUsers
      .map((user) => {
        const userBets = nominalBets.filter((b) => b.userId === user.uid);
        if (userBets.length === 0) return null;
        const betMap: Record<string, string> = {};
        userBets.forEach((b) => { betMap[b.category] = b.prediction; });
        return { user, betMap };
      })
      .filter(Boolean) as { user: UserDoc; betMap: Record<string, string> }[];

    if (usersWithBets.length === 0) {
      toast.error("Nenhuma aposta nominal registrada ainda.");
      return;
    }

    usersWithBets.sort((a, b) =>
      a.user.displayName.localeCompare(b.user.displayName, "pt-BR")
    );

    setGeneratingImage(true);

    // ── Dimensões ────────────────────────────────────────────────────────────
    const SCALE   = 2;        // retina
    const W       = 880;
    const PAD     = 24;
    const HDR_H   = 96;
    const SUBHDR_H= 42;
    const ROW_H   = 44;
    const FOOT_H  = 40;
    const TOTAL_H = HDR_H + SUBHDR_H + usersWithBets.length * ROW_H + FOOT_H;

    const canvas  = document.createElement("canvas");
    canvas.width  = W * SCALE;
    canvas.height = TOTAL_H * SCALE;
    const ctx     = canvas.getContext("2d")!;
    ctx.scale(SCALE, SCALE);

    const trunc = (s: string, n: number) =>
      s && s.length > n ? s.slice(0, n - 1) + "…" : (s ?? "—");

    // ── Background ───────────────────────────────────────────────────────────
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, TOTAL_H);

    // ── Cabeçalho (gradiente verde → azul escuro) ────────────────────────────
    const grad = ctx.createLinearGradient(0, 0, W, HDR_H);
    grad.addColorStop(0, "#14532d");
    grad.addColorStop(1, "#1e3a5f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, HDR_H);

    // linha separadora sutil
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, HDR_H - 1, W, 1);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${20}px system-ui, -apple-system, sans-serif`;
    ctx.fillText("⚽  BOLÃO COPA DO MUNDO 2026", PAD, 36);

    ctx.font = `${15}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#86efac";
    ctx.fillText("🏆  Apostas Nominais — Palpites do Grupo", PAD, 62);

    const completeCount = paidUsers.filter((u) => {
      const ub = nominalBets.filter((b) => b.userId === u.uid);
      return CATEGORIES.every((c) => ub.some((b) => b.category === c.key));
    }).length;

    ctx.font = `${13}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(
      `${completeCount} de ${paidUsers.length} participantes com apostas completas`,
      PAD,
      83,
    );

    // ── Cabeçalho das colunas ────────────────────────────────────────────────
    const COLS = [
      { x: PAD,      w: 168, label: "Participante" },
      { x: 208,      w: 162, label: "🏆 Campeão"   },
      { x: 380,      w: 162, label: "🥈 Vice"       },
      { x: 552,      w: 152, label: "🥉 3º Lugar"  },
      { x: 714,      w: W - 714 - PAD, label: "⚽ Artilheiro" },
    ];

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, HDR_H, W, SUBHDR_H);

    ctx.fillStyle = "#64748b";
    ctx.font = `bold 12px system-ui, -apple-system, sans-serif`;
    COLS.forEach((col) => {
      ctx.fillText(col.label, col.x, HDR_H + 27);
    });

    // linha divisória
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, HDR_H + SUBHDR_H - 1, W, 1);

    // ── Linhas de usuários ───────────────────────────────────────────────────
    usersWithBets.forEach((entry, i) => {
      const y = HDR_H + SUBHDR_H + i * ROW_H;

      // fundo alternado
      ctx.fillStyle = i % 2 === 0 ? "#0f172a" : "#111827";
      ctx.fillRect(0, y, W, ROW_H);

      // linha divisória leve
      if (i > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(0, y, W, 1);
      }

      // número
      ctx.fillStyle = "#475569";
      ctx.font = `11px system-ui, -apple-system, sans-serif`;
      ctx.fillText(`${i + 1}`, PAD - 6, y + ROW_H / 2 + 4);

      // nome
      const hasAll = CATEGORIES.every((c) => entry.betMap[c.key]);
      ctx.fillStyle = hasAll ? "#f1f5f9" : "#94a3b8";
      ctx.font = `bold 13px system-ui, -apple-system, sans-serif`;
      ctx.fillText(trunc(entry.user.displayName, 20), COLS[0].x, y + ROW_H / 2 + 4);

      // apostas
      const vals = [
        entry.betMap["champion"],
        entry.betMap["runnerUp"],
        entry.betMap["thirdPlace"],
        entry.betMap["topScorer"],
      ];
      ctx.font = `13px system-ui, -apple-system, sans-serif`;
      vals.forEach((val, j) => {
        ctx.fillStyle = val ? "#cbd5e1" : "#334155";
        ctx.fillText(trunc(val ?? "—", j === 3 ? 22 : 18), COLS[j + 1].x, y + ROW_H / 2 + 4);
      });
    });

    // ── Rodapé ───────────────────────────────────────────────────────────────
    const footY = HDR_H + SUBHDR_H + usersWithBets.length * ROW_H;
    ctx.fillStyle = "#0c1222";
    ctx.fillRect(0, footY, W, FOOT_H);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, footY, W, 1);

    ctx.fillStyle = "#475569";
    ctx.font = `12px system-ui, -apple-system, sans-serif`;
    const now = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    ctx.fillText(`Gerado em ${now} (BRT) · bolao-copa-2026`, PAD, footY + FOOT_H / 2 + 4);

    const dataUrl = canvas.toDataURL("image/png");

    // ── Tenta Web Share API (mobile/WhatsApp nativo) ──────────────────────────
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "apostas-nominais-copa-2026.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Apostas Nominais — Copa 2026" });
        setGeneratingImage(false);
        return;
      }
    } catch {
      // share cancelado ou não suportado — cai no modal de preview
    }

    // ── Fallback: modal com preview + download ────────────────────────────────
    setImageDataUrl(dataUrl);
    setGeneratingImage(false);
  }

  function handleDownloadImage() {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = "apostas-nominais-copa-2026.png";
    a.click();
  }

  async function handleSave() {
    setSaving(true);
    try {
      const ref = doc(db, "nominalResults", "global");
      await setDoc(ref, { ...results, updatedAt: Timestamp.now() }, { merge: true });

      const token = await auth.currentUser?.getIdToken();
      const recalcRes = await fetch("/api/recalculate-nominals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
      });
      if (!recalcRes.ok) {
        const err = await recalcRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao recalcular nominais");
      }
      toast.success("Resultados nominais salvos e pontuação recalculada!");
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Apostas Nominais</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe os pendentes e defina os resultados após a Copa.
        </p>
      </div>

      {/* ── Painel de pendentes ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Pendentes
            </span>
            {!pendingLoading && (
              <span className={`text-sm font-normal ${pendingUsers.length === 0 ? "text-green-600" : "text-orange-500"}`}>
                {totalComplete}/{totalPaid} completos
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-3 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Todos os participantes completaram as apostas nominais!
            </div>
          ) : (
            <>
              {/* Resumo clicável */}
              <button
                onClick={() => setShowPending((v) => !v)}
                className="w-full flex items-center justify-between rounded-lg bg-orange-500/10 border border-orange-500/30 px-3 py-2.5 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors"
              >
                <span className="font-semibold">
                  {pendingUsers.length} participante{pendingUsers.length !== 1 ? "s" : ""} com apostas incompletas
                </span>
                <span className="text-xs">{showPending ? "▲ ocultar" : "▼ ver lista"}</span>
              </button>

              {/* Lista expandida */}
              {showPending && (
                <ul className="divide-y rounded-lg border overflow-hidden">
                  {pendingUsers.map((p) => (
                    <li key={p.user.uid} className="px-3 py-2 text-sm bg-background">
                      <p className="font-medium">{p.user.displayName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Faltam: {p.missingCategories.join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {/* Botão WhatsApp */}
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleShareWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                Enviar cobrança via WhatsApp
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Compartilhar apostas nominais ──────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-primary" />
            Compartilhar palpites com o grupo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Envia para o grupo uma mensagem com os palpites nominais de todos os participantes —
            campeão, vice, terceiro e artilheiro.
          </p>
          {pendingLoading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground flex gap-3">
                <span>📋 {nominalBets.length} apostas registradas</span>
                <span>👥 {totalComplete}/{totalPaid} completos</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleShareAllBets}
                  disabled={nominalBets.length === 0}
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar como texto
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleGenerateImage}
                  disabled={nominalBets.length === 0 || generatingImage}
                >
                  {generatingImage
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <ImageIcon className="h-4 w-4" />
                  }
                  Gerar imagem
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Estatísticas de apostas nominais ───────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4 text-primary" />
            Estatísticas das apostas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {pendingLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : nominalBets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhuma aposta nominal registrada ainda.
            </p>
          ) : (
            CATEGORIES.map(({ key, label, icon }) => {
              const rows = nominalStats[key];
              const totalVotes = nominalBets.filter((b) => b.category === key).length;

              return (
                <div key={key}>
                  {/* Cabeçalho da categoria */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold flex items-center gap-1.5">
                      {icon} {label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {totalVotes} voto{totalVotes !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {rows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem apostas nesta categoria.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {rows.map((row, i) => (
                        <div key={row.prediction} className="group">
                          <div className="flex items-center gap-2 text-xs mb-0.5">
                            {/* Posição */}
                            <span className="w-4 shrink-0 text-muted-foreground text-right">
                              {i + 1}.
                            </span>
                            {/* Nome */}
                            <span
                              className={
                                i === 0
                                  ? "font-semibold text-foreground flex-1 truncate"
                                  : "text-muted-foreground flex-1 truncate"
                              }
                            >
                              {row.prediction}
                            </span>
                            {/* Contagem + percentual */}
                            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                              {row.count}×
                            </span>
                            <span className="shrink-0 w-8 text-right font-mono tabular-nums text-muted-foreground">
                              {row.pct}%
                            </span>
                          </div>
                          {/* Barra de progresso */}
                          <div className="flex items-center gap-2">
                            <div className="w-4 shrink-0" /> {/* espaçamento para alinhar com o texto */}
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={
                                  i === 0
                                    ? "h-full rounded-full bg-primary"
                                    : "h-full rounded-full bg-muted-foreground/40"
                                }
                                style={{ width: `${row.pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Divisor entre categorias (exceto no último) */}
                  {key !== "topScorer" && (
                    <div className="mt-4 border-t" />
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── Resultados nominais (pós-Copa) ─────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados (pós-Copa)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {CATEGORIES.map(({ key, label, icon }) => (
            <div key={key} className="space-y-1">
              <Label>{icon} {label}</Label>
              <Select
                value={results[key] ?? ""}
                onValueChange={(v) => setResults((prev) => ({ ...prev, [key]: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Selecionar ${label.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {(key === "topScorer" ? TOP_SCORER_CANDIDATES : TEAM_NAMES).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar e recalcular pontuação
      </Button>

      {/* ── Modal de preview da imagem ──────────────────────────────── */}
      <Dialog open={!!imageDataUrl} onOpenChange={(open) => { if (!open) setImageDataUrl(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4 text-primary" />
              Apostas Nominais — Imagem
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {imageDataUrl && (
              <div className="overflow-auto rounded-lg border max-h-[60vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageDataUrl}
                  alt="Apostas nominais"
                  className="w-full"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleDownloadImage}
              >
                <Download className="h-4 w-4" />
                Baixar imagem
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setImageDataUrl(null)}
              >
                Fechar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Baixe e envie no grupo do WhatsApp
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
