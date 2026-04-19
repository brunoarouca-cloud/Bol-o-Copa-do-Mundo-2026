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
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { gameConverter, scoringConverter } from "@/lib/firebase/converters";
import { GameCard } from "@/components/game-card";
import { useAuth } from "@/hooks/use-auth";
import { useBets } from "@/hooks/use-bets";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, FileDown, Trash2 } from "lucide-react";
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
  "Oitavas",
  "Dezesseis",
  "Quartas",
  "Semifinal",
  "Terceiro Lugar",
  "Final",
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
  const { bets, loading: betsLoading, getBetForGame } = useBets(user?.uid ?? null);

  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<ScoringSettings | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [clearingBets, setClearingBets] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const [filterPhase, setFilterPhase] = useState<GamePhase | "Todos">("Fase de Grupos");
  const [filterGroup, setFilterGroup] = useState<string>("Todos");
  const [filterDate, setFilterDate] = useState<string>("Todos");

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

  const availableDates = useMemo(() => {
    const phaseGames = games.filter(
      (g) => filterPhase === "Todos" || g.phase === filterPhase
    );
    return Array.from(new Set(phaseGames.map(gameDateBRT))).sort();
  }, [games, filterPhase]);

  function handlePhaseChange(phase: string) {
    setFilterPhase(phase as GamePhase | "Todos");
    setFilterGroup("Todos");
    setFilterDate("Todos");
  }

  const filteredGames = useMemo(
    () =>
      games.filter((g) => {
        if (filterPhase !== "Todos" && g.phase !== filterPhase) return false;
        if (filterGroup !== "Todos" && g.group !== filterGroup) return false;
        if (filterDate !== "Todos" && gameDateBRT(g) !== filterDate) return false;
        return true;
      }),
    [games, filterPhase, filterGroup, filterDate]
  );

  const loading = gamesLoading || betsLoading;
  const showGroupFilter = filterPhase === "Fase de Grupos" || filterPhase === "Todos";

  const phaseOptions: FilterOption[] = [
    { value: "Todos", label: "Todas as fases" },
    ...PHASES.map((p) => ({ value: p, label: p })),
  ];
  const groupOptions: FilterOption[] = [
    { value: "Todos", label: "Todos os grupos" },
    ...GROUPS.map((g) => ({ value: g, label: `Grupo ${g}` })),
  ];
  const dateOptions: FilterOption[] = [
    { value: "Todos", label: "Todas as datas" },
    ...availableDates.map((d) => ({ value: d, label: formatDateLabel(d) })),
  ];

  // ─── Limpar apostas abertas ────────────────────────────────────────────────
  async function handleClearOpenBets() {
    if (!user?.uid) return;

    const openBets = bets.filter((bet) => {
      const game = games.find((g) => g.id === bet.gameId);
      return game?.status === "upcoming";
    });

    if (openBets.length === 0) {
      toast.info("Não há apostas em jogos ainda abertos.");
      return;
    }

    const confirmed = window.confirm(
      `Isso vai apagar ${openBets.length} aposta(s) em jogos ainda abertos.\n\n` +
        "Apostas em jogos travados ou encerrados NÃO serão afetadas.\n\n" +
        "Esta ação não pode ser desfeita. Deseja continuar?"
    );
    if (!confirmed) return;

    setClearingBets(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/bets/clear-open", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro desconhecido");
      }
      const data = await res.json();
      toast.success(`${data.deleted} aposta(s) removida(s) com sucesso.`);
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setClearingBets(false);
    }
  }

  // ─── Gerar PDF para download ───────────────────────────────────────────────
  async function handleSharePDF() {
    if (filteredGames.length === 0) return;
    setSharingPdf(true);

    try {
      // Dynamic import para evitar SSR
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const userName =
        userDoc?.displayName ?? user?.displayName ?? user?.email ?? "Participante";

      const filterDesc = [
        filterPhase !== "Todos" ? filterPhase : null,
        filterGroup !== "Todos" ? `Grupo ${filterGroup}` : null,
        filterDate !== "Todos" ? formatDateLabel(filterDate) : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Todos os jogos";

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Cabeçalho
      doc.setFillColor(22, 163, 74);
      doc.rect(0, 0, 210, 28, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("⚽ Bolão Copa do Mundo 2026", 14, 12);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Apostas de ${userName}  ·  ${filterDesc}`, 14, 20);

      const geradoEm = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      doc.text(`Gerado em ${geradoEm}`, 210 - 14, 20, { align: "right" });

      // Tabela
      const tableBody = filteredGames.map((g) => {
        const bet = getBetForGame(g.id);
        const dateBRT = format(toZonedTime(g.date.toDate(), BRT), "dd/MM HH:mm", {
          locale: ptBR,
        });
        const statusLabel =
          g.status === "finished"
            ? "Encerrado"
            : g.status === "locked"
            ? "Travado"
            : "Aberto";

        const resultado =
          g.status === "finished"
            ? `${g.homeScore} × ${g.awayScore}`
            : statusLabel;

        const palpite = bet ? `${bet.homeScore} × ${bet.awayScore}` : "-";

        let pts = "-";
        if (g.status === "finished" && bet?.points !== null) {
          pts = `+${bet.points}`;
        }

        return [
          `${g.homeTeam} × ${g.awayTeam}`,
          g.phase + (g.group ? ` G${g.group}` : ""),
          dateBRT,
          palpite,
          resultado,
          pts,
        ];
      });

      const totalPts = filteredGames.reduce((sum, g) => {
        const b = getBetForGame(g.id);
        return sum + (b?.points ?? 0);
      }, 0);

      autoTable(doc, {
        startY: 32,
        head: [["Jogo", "Fase", "Data (BRT)", "Palpite", "Resultado", "Pts"]],
        body: tableBody,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [22, 163, 74],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 22 },
          2: { cellWidth: 22 },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 22, halign: "center" },
          5: { cellWidth: 14, halign: "center", fontStyle: "bold" },
        },
      });

      // Rodapé com total
      const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text(`Total: ${totalPts} pts`, 210 - 14, finalY + 8, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("Bolão Copa do Mundo 2026", 14, finalY + 8);

      // Download
      const safeName = userName.replace(/[^a-zA-Z0-9]/g, "_");
      doc.save(`bolao-copa-2026-${safeName}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setSharingPdf(false);
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
            onClick={handleSharePDF}
            disabled={sharingPdf || loading || filteredGames.length === 0}
            className="flex items-center gap-1.5"
          >
            {sharingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">PDF</span>
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
        {(filterPhase !== "Fase de Grupos" ||
          filterGroup !== "Todos" ||
          filterDate !== "Todos") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilterPhase("Fase de Grupos");
              setFilterGroup("Todos");
              setFilterDate("Todos");
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
