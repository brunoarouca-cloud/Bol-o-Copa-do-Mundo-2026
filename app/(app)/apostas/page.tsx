"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { gameConverter, scoringConverter } from "@/lib/firebase/converters";
import { GameCard } from "@/components/game-card";
import { useAuth } from "@/hooks/use-auth";
import { useBets } from "@/hooks/use-bets";
import { useLivePoll } from "@/hooks/use-live-poll";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, Trash2, ImageIcon } from "lucide-react";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { toast } from "sonner";
import type { Game, GamePhase, ScoringSettings } from "@/types";

const BRT = "America/Sao_Paulo";

function gameDateBRT(game: Game): string {
  return format(toZonedTime(game.date.toDate(), BRT), "yyyy-MM-dd");
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return format(new Date(y, m - 1, d), "dd/MM (EEE)", { locale: ptBR });
}

const PHASES: GamePhase[] = [
  "Fase de Grupos",
  "16 avos",
  "Oitavas",
  "Quartas",
  "Semis",
  "Terceiro Lugar",
  "Final",
];

// Filtro combinado para Final + 3º Lugar na UI
const PHASE_FILTER_OPTIONS = [
  { value: "Todos", label: "Todas as fases" },
  { value: "Fase de Grupos", label: "Fase de Grupos" },
  { value: "16 avos", label: "16 avos" },
  { value: "Oitavas", label: "Oitavas" },
  { value: "Quartas", label: "Quartas" },
  { value: "Semis", label: "Semis" },
  { value: "Final / 3º Lugar", label: "Final / 3º Lugar" },
  { value: "Amistoso", label: "🧪 Amistoso / Teste" },
];

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

// ─── FilterPill ────────────────────────────────────────────────────────────────
interface FilterOption {
  value: string;
  label: string;
}

interface FilterPillProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

function FilterPill({ label, value, options, onChange, disabled }: FilterPillProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;
  if (disabled) return null;

  return (
    <div ref={ref} className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs h-8 pr-2"
      >
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-semibold max-w-[120px] truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </Button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-background border rounded-lg shadow-lg py-1 min-w-[180px]">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                opt.value === value ? "font-semibold text-primary bg-accent/50" : ""
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ApostasPage() {
  const { user, userDoc } = useAuth();
  const { bets, loading: betsLoading, getBetForGame, removeBetsOptimistically } = useBets(user?.uid ?? null);
  useLivePoll(); // Aciona polling de placar ao vivo enquanto houver jogos "live"

  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<ScoringSettings | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [clearingBets, setClearingBets] = useState(false);
  const [sharingText, setSharingText] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const sharingImageLock = useRef(false);

  const [filterPhase, setFilterPhase] = useState<GamePhase | "Todos" | "Final / 3º Lugar">("Fase de Grupos");
  const [filterGroup, setFilterGroup] = useState<string>("Todos");
  const [filterDate, setFilterDate] = useState<string>("Todos");
  const [filterTeam, setFilterTeam] = useState<string>("Todos");

  useEffect(() => {
    const q = query(
      collection(db, "games").withConverter(gameConverter),
      orderBy("matchNumber", "asc")
    );
    return onSnapshot(q, (snap) => {
      setGames(snap.docs.map((d) => d.data()));
      setGamesLoading(false);
    });
  }, []);

  useEffect(() => {
    const settingsRef = doc(db, "settings", "scoring").withConverter(scoringConverter);
    getDoc(settingsRef).then((snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
  }, []);

  // Jogos que passam nos filtros de fase/grupo/data (sem considerar time ainda)
  const preTeamFilteredGames = useMemo(
    () =>
      games.filter((g) => {
        if (filterPhase === "Final / 3º Lugar") {
          if (g.phase !== "Final" && g.phase !== "Terceiro Lugar") return false;
        } else if (filterPhase !== "Todos" && g.phase !== filterPhase) return false;
        if (filterGroup !== "Todos" && g.group !== filterGroup) return false;
        if (filterDate !== "Todos" && gameDateBRT(g) !== filterDate) return false;
        return true;
      }),
    [games, filterPhase, filterGroup, filterDate]
  );

  const availableDates = useMemo(() => {
    const phaseGames = games.filter((g) => {
      if (filterPhase === "Final / 3º Lugar") {
        return g.phase === "Final" || g.phase === "Terceiro Lugar";
      }
      return filterPhase === "Todos" || g.phase === filterPhase;
    });
    return Array.from(new Set(phaseGames.map(gameDateBRT))).sort();
  }, [games, filterPhase]);

  // Times disponíveis com base nos jogos já filtrados por fase/grupo/data
  // Exclui placeholders de jogos cujo confronto ainda não foi definido
  const PLACEHOLDER_RE = /^(\d+[ºª°]\s|vencedor|perdedor|melhor|winner|loser)/i;
  const availableTeams = useMemo(() => {
    const teams = new Set<string>();
    preTeamFilteredGames.forEach((g) => {
      if (g.homeTeam && !PLACEHOLDER_RE.test(g.homeTeam)) teams.add(g.homeTeam);
      if (g.awayTeam && !PLACEHOLDER_RE.test(g.awayTeam)) teams.add(g.awayTeam);
    });
    return Array.from(teams).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [preTeamFilteredGames]);

  function handlePhaseChange(phase: string) {
    setFilterPhase(phase as GamePhase | "Todos" | "Final / 3º Lugar");
    setFilterGroup("Todos");
    setFilterDate("Todos");
    setFilterTeam("Todos");
  }

  const filteredGames = useMemo(
    () =>
      preTeamFilteredGames.filter((g) => {
        if (filterTeam !== "Todos" && g.homeTeam !== filterTeam && g.awayTeam !== filterTeam)
          return false;
        return true;
      }),
    [preTeamFilteredGames, filterTeam]
  );

  const loading = gamesLoading || betsLoading;
  const showGroupFilter = filterPhase === "Fase de Grupos" || filterPhase === "Todos";


  const phaseOptions: FilterOption[] = PHASE_FILTER_OPTIONS;
  const groupOptions: FilterOption[] = [
    { value: "Todos", label: "Todos os grupos" },
    ...GROUPS.map((g) => ({ value: g, label: `Grupo ${g}` })),
  ];
  const dateOptions: FilterOption[] = [
    { value: "Todos", label: "Todas as datas" },
    ...availableDates.map((d) => ({ value: d, label: formatDateLabel(d) })),
  ];
  const teamOptions: FilterOption[] = [
    { value: "Todos", label: "Todas as seleções" },
    ...availableTeams.map((t) => ({ value: t, label: t })),
  ];

  // ─── Limpar apostas filtradas abertas ─────────────────────────────────────
  async function handleClearOpenBets() {
    if (!user?.uid) return;

    // Apenas apostas dos jogos visíveis no filtro atual que ainda estão "upcoming"
    const betsToDelete = filteredGames
      .filter((g) => g.status === "upcoming")
      .map((g) => getBetForGame(g.id))
      .filter((bet): bet is NonNullable<typeof bet> => bet !== undefined);

    if (betsToDelete.length === 0) {
      toast.info("Não há apostas abertas nos jogos selecionados.");
      return;
    }

    const confirmed = window.confirm(
      `Isso vai apagar ${betsToDelete.length} aposta(s) nos jogos visíveis que ainda estão abertos.\n\n` +
        "Apostas em jogos travados ou encerrados NÃO serão afetadas.\n\n" +
        "Esta ação não pode ser desfeita. Deseja continuar?"
    );
    if (!confirmed) return;

    setClearingBets(true);
    try {
      // Deleção direta pelo cliente Firestore em batch.
      // As rules agora permitem: isOwner && gameUnlocked → o SDK atualiza o
      // cache local imediatamente, e o onSnapshot reflete na hora sem precisar
      // trocar de aba.
      const batch = writeBatch(db);
      betsToDelete.forEach((bet) => {
        batch.delete(doc(db, "bets", bet.id));
      });
      await batch.commit();
      toast.success(`${betsToDelete.length} aposta(s) removida(s) com sucesso.`);
    } catch (err) {
      toast.error(`Erro ao remover apostas: ${(err as Error).message}`);
    } finally {
      setClearingBets(false);
    }
  }

  // ─── Compartilhar via texto (WhatsApp) ────────────────────────────────────
  async function handleShareText() {
    if (filteredGames.length === 0) return;
    setSharingText(true);
    try {
      const userName =
        userDoc?.displayName ?? user?.displayName ?? user?.email ?? "Participante";

      const filterDesc = [
        filterPhase !== "Todos" ? filterPhase : null,
        filterGroup !== "Todos" ? `Grupo ${filterGroup}` : null,
        filterDate !== "Todos" ? formatDateLabel(filterDate) : null,
        filterTeam !== "Todos" ? filterTeam : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Todos os jogos";

      // Agrupa por data
      const byDate = new Map<string, Game[]>();
      for (const g of filteredGames) {
        const d = gameDateBRT(g);
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d)!.push(g);
      }

      const lines: string[] = [];
      lines.push(`⚽ *Bolão Copa do Mundo 2026*`);
      lines.push(`👤 ${userName}  ·  ${filterDesc}`);

      for (const [, dayGames] of byDate) {
        const dayLabel = formatDateLabel(gameDateBRT(dayGames[0]));
        lines.push(`\n📅 *${dayLabel}*`);

        for (const g of dayGames) {
          const bet = getBetForGame(g.id);
          const timeBRT = format(toZonedTime(g.date.toDate(), BRT), "HH:mm");
          const matchLabel = `${timeBRT}  ${g.homeTeam} × ${g.awayTeam}`;

          if (!bet) {
            lines.push(`• ${matchLabel}`);
            lines.push(`  _Sem aposta_`);
          } else {
            const betStr = `${bet.homeScore}×${bet.awayScore}`;
            if (g.status === "finished") {
              const res = `${g.homeScore}×${g.awayScore}`;
              const pts = bet.points != null ? ` › *+${bet.points}pts*` : "";
              lines.push(`• ${matchLabel}`);
              lines.push(`  🎯 ${betStr}  |  Resultado: ${res}${pts}`);
            } else {
              const statusEmoji =
                g.status === "live" ? "🔴" : g.status === "locked" ? "🔒" : "⏳";
              lines.push(`• ${matchLabel}  ${statusEmoji}`);
              lines.push(`  🎯 Palpite: ${betStr}`);
            }
          }
        }
      }

      const totalPts = filteredGames.reduce((sum, g) => {
        const b = getBetForGame(g.id);
        return sum + (b?.points ?? 0);
      }, 0);
      lines.push(`\n🏆 *Total apurado: ${totalPts} pts*`);

      const text = lines.join("\n");

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ text });
          return;
        } catch {}
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
      toast.error("Erro ao compartilhar. Tente novamente.");
    } finally {
      setSharingText(false);
    }
  }

  // ─── Compartilhar via imagem ────────────────────────────────────────────────
  async function handleShareImage() {
    if (filteredGames.length === 0 || sharingImageLock.current) return;
    sharingImageLock.current = true;
    setSharingImage(true);

    try {
      const DPR = 2;
      const W = 640;
      const PAD = 16;
      const HEADER_H = 86;
      const COL_H = 26;
      const ROW_H = 42;
      const FOOTER_H = 50;
      const H = HEADER_H + COL_H + filteredGames.length * ROW_H + FOOTER_H;

      const canvas = document.createElement("canvas");
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(DPR, DPR);

      // ── Fundo ────────────────────────────────────────────────
      ctx.fillStyle = "#0d1b0d";
      ctx.fillRect(0, 0, W, H);

      // ── Header ───────────────────────────────────────────────
      const hGrad = ctx.createLinearGradient(0, 0, W, 0);
      hGrad.addColorStop(0, "#0f7637");
      hGrad.addColorStop(1, "#0a5a2a");
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, 0, W, HEADER_H);

      // Barra dourada
      ctx.fillStyle = "#ca9b1e";
      ctx.fillRect(0, HEADER_H - 3, W, 3);

      const userName =
        userDoc?.displayName ?? user?.displayName ?? user?.email ?? "Participante";
      const filterDesc = [
        filterPhase !== "Todos" ? filterPhase : null,
        filterGroup !== "Todos" ? `Grupo ${filterGroup}` : null,
        filterDate !== "Todos" ? formatDateLabel(filterDate) : null,
        filterTeam !== "Todos" ? filterTeam : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Todos os jogos";

      // Emoji bola
      ctx.font = `22px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;
      ctx.fillText("⚽", PAD, 32);

      // Título
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 18px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
      ctx.fillText("Bolão Copa do Mundo 2026", PAD + 30, 32);

      // Nome + filtro
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = `13px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
      ctx.fillText(`${userName}  ·  ${filterDesc}`, PAD, 54);

      // Pontuação total — canto direito
      const totalPts = filteredGames.reduce((sum, g) => {
        const b = getBetForGame(g.id);
        return sum + (b?.points ?? 0);
      }, 0);
      ctx.fillStyle = "#ca9b1e";
      const ptsBoxW = 72;
      const ptsBoxX = W - PAD - ptsBoxW;
      ctx.beginPath();
      ctx.roundRect(ptsBoxX, 10, ptsBoxW, 36, 6);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 15px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${totalPts} pts`, ptsBoxX + ptsBoxW / 2, 30);
      ctx.font = `10px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
      ctx.fillText("TOTAL", ptsBoxX + ptsBoxW / 2, 42);
      ctx.textAlign = "left";

      // ── Cabeçalho colunas ────────────────────────────────────
      const colY = HEADER_H;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(0, colY, W, COL_H);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `10px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;

      // Posições X das colunas
      const C_NUM  = PAD;           // #
      const C_GAME = PAD + 36;      // Times
      const C_DATE = PAD + 310;     // Data/hora
      const C_BET  = PAD + 408;     // Palpite
      const C_RES  = PAD + 484;     // Resultado
      const C_PTS  = W - PAD - 30;  // Pts (alinhado à direita)

      ctx.fillText("JOGO", C_GAME, colY + 17);
      ctx.fillText("DATA", C_DATE, colY + 17);
      ctx.fillText("PALPITE", C_BET, colY + 17);
      ctx.fillText("RESULT.", C_RES, colY + 17);
      ctx.textAlign = "right";
      ctx.fillText("PTS", C_PTS + 30, colY + 17);
      ctx.textAlign = "left";

      // ── Linhas dos jogos ─────────────────────────────────────
      const rowsY = HEADER_H + COL_H;

      for (let i = 0; i < filteredGames.length; i++) {
        const g = filteredGames[i];
        const bet = getBetForGame(g.id);
        const ry = rowsY + i * ROW_H;
        const mid = ry + ROW_H / 2;

        // Fundo alternado
        ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.1)";
        ctx.fillRect(0, ry, W, ROW_H);

        // Faixa lateral por status
        const accentColor =
          g.status === "finished" ? "#22c55e" :
          g.status === "live"     ? "#ef4444" :
          g.status === "locked"   ? "#f59e0b" : "#3b82f6";
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, ry + 4, 3, ROW_H - 8);

        // Nº do jogo
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = `10px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
        ctx.fillText(`#${g.matchNumber}`, C_NUM, mid + 4);

        // Times — trunca se muito longo
        const gameStr = `${g.homeTeam} × ${g.awayTeam}`;
        ctx.fillStyle = "#ffffff";
        ctx.font = `13px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
        const maxGameW = C_DATE - C_GAME - 8;
        let truncGame = gameStr;
        while (ctx.measureText(truncGame).width > maxGameW && truncGame.length > 10) {
          truncGame = truncGame.slice(0, -2) + "…";
        }
        ctx.fillText(truncGame, C_GAME, mid + 5);

        // Data / hora
        const dateBRT = format(toZonedTime(g.date.toDate(), BRT), "dd/MM HH:mm", { locale: ptBR });
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = `11px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
        ctx.fillText(dateBRT, C_DATE, mid + 5);

        // Palpite
        if (bet) {
          ctx.fillStyle = "#fbbf24";
          ctx.font = `bold 12px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
          ctx.fillText(`${bet.homeScore}×${bet.awayScore}`, C_BET, mid + 5);
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.font = `11px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
          ctx.fillText("—", C_BET, mid + 5);
        }

        // Resultado
        if (g.status === "finished") {
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.font = `12px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
          ctx.fillText(`${g.homeScore}×${g.awayScore}`, C_RES, mid + 5);
        } else {
          const statusLabel =
            g.status === "live"   ? "Ao vivo" :
            g.status === "locked" ? "Travado" : "Aberto";
          ctx.fillStyle = accentColor;
          ctx.font = `10px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
          ctx.fillText(statusLabel, C_RES, mid + 5);
        }

        // Pontos
        ctx.textAlign = "right";
        if (g.status === "finished" && bet?.points != null) {
          ctx.fillStyle = bet.points > 0 ? "#4ade80" : "rgba(255,255,255,0.4)";
          ctx.font = `bold 13px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
          ctx.fillText(`+${bet.points}`, C_PTS + 30, mid + 5);
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.font = `11px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
          ctx.fillText("—", C_PTS + 30, mid + 5);
        }
        ctx.textAlign = "left";

        // Linha divisória
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, ry + ROW_H);
        ctx.lineTo(W, ry + ROW_H);
        ctx.stroke();
      }

      // ── Rodapé ────────────────────────────────────────────────
      const footerY = rowsY + filteredGames.length * ROW_H;
      ctx.fillStyle = "rgba(202,155,30,0.15)";
      ctx.fillRect(0, footerY, W, FOOTER_H);
      ctx.fillStyle = "#ca9b1e";
      ctx.fillRect(0, footerY, W, 2);

      ctx.fillStyle = "#ca9b1e";
      ctx.font = `bold 16px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
      ctx.fillText(`Total: ${totalPts} pts`, PAD, footerY + 32);

      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = `11px -apple-system,BlinkMacSystemFont,Arial,sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText("Bolão Copa do Mundo 2026", W - PAD, footerY + 32);
      ctx.textAlign = "left";

      // ── Export ────────────────────────────────────────────────
      canvas.toBlob(async (blob) => {
        if (!blob) { toast.error("Erro ao gerar imagem."); return; }

        const file = new File([blob], "apostas-copa2026.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "Minhas Apostas — Bolão Copa 2026" });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "apostas-copa2026.png";
          a.click();
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      toast.error("Erro ao gerar imagem. Tente novamente.");
    } finally {
      sharingImageLock.current = false;
      setSharingImage(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Apostas</h1>
          <p className="text-muted-foreground text-sm">
            Faça seu palpite para cada jogo. Apostas travam{" "}
            {settings?.lockMinutesBefore ?? 5} minutos antes do apito.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearOpenBets}
            disabled={clearingBets || loading}
            className="flex items-center gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            title="Apagar todas as apostas em jogos ainda abertos"
          >
            {clearingBets ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Limpar</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleShareText}
            disabled={sharingText || loading || filteredGames.length === 0}
            className="flex items-center gap-1.5 text-[#25d366] border-[#25d366]/40 hover:bg-[#25d366]/10 hover:text-[#25d366]"
            title="Compartilhar apostas via WhatsApp"
          >
            {sharingText ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <WhatsAppIcon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleShareImage}
            disabled={sharingImage || loading || filteredGames.length === 0}
            className="flex items-center gap-1.5"
            title="Compartilhar apostas como imagem"
          >
            {sharingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Imagem</span>
          </Button>
        </div>
      </div>

      {/* Filtros compactos */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill
          label="Fase"
          value={filterPhase}
          options={phaseOptions}
          onChange={handlePhaseChange}
        />
        <FilterPill
          label="Grupo"
          value={filterGroup}
          options={groupOptions}
          onChange={setFilterGroup}
          disabled={!showGroupFilter}
        />
        <FilterPill
          label="Data"
          value={filterDate}
          options={dateOptions}
          onChange={setFilterDate}
          disabled={availableDates.length <= 1}
        />
        <FilterPill
          label="Seleção"
          value={filterTeam}
          options={teamOptions}
          onChange={setFilterTeam}
          disabled={availableTeams.length <= 1}
        />
        {(filterPhase !== "Fase de Grupos" ||
          filterGroup !== "Todos" ||
          filterDate !== "Todos" ||
          filterTeam !== "Todos") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilterPhase("Fase de Grupos");
              setFilterGroup("Todos");
              setFilterDate("Todos");
              setFilterTeam("Todos");
            }}
            className="text-xs text-muted-foreground h-8"
          >
            Limpar filtros
          </Button>
        )}
        {!loading && (
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredGames.length} jogo{filteredGames.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Grid de jogos */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          Nenhum jogo encontrado para este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              bet={getBetForGame(game.id)}
              userId={user?.uid ?? ""}
              lockMinutesBefore={settings?.lockMinutesBefore ?? 5}
              settings={settings}
            />
          ))}
        </div>
      )}
    </div>
  );
}
