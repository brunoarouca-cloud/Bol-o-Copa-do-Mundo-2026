"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { gameConverter, scoringConverter } from "@/lib/firebase/converters";
import { GameCard } from "@/components/game-card";
import { useAuth } from "@/hooks/use-auth";
import { useBets } from "@/hooks/use-bets";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import type { Game, GamePhase, ScoringSettings } from "@/types";

const BRT = "America/Sao_Paulo";

function gameDateBRT(game: Game): string {
  return format(toZonedTime(game.date.toDate(), BRT), "yyyy-MM-dd");
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return format(dt, "dd/MM (EEE)", { locale: ptBR });
}

function formatDateFull(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return format(dt, "EEEE, dd 'de' MMMM", { locale: ptBR });
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
          className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
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

// ─── PDF Share ─────────────────────────────────────────────────────────────────
function generatePDFHTML(
  games: Game[],
  getBet: (gameId: string) => { homeScore: number; awayScore: number; points: number | null } | undefined,
  userName: string,
  filterPhase: string,
  filterGroup: string,
  filterDate: string
): string {
  const rows = games.map((g) => {
    const bet = getBet(g.id);
    const hasBet = bet !== undefined;
    const dateBRT = format(
      toZonedTime(g.date.toDate(), BRT),
      "dd/MM HH:mm",
      { locale: ptBR }
    );
    const statusLabel =
      g.status === "finished" ? "Encerrado" : g.status === "locked" ? "Travado" : "Aberto";
    const pointsHtml =
      g.status === "finished" && bet?.points !== null
        ? `<span class="pts ${(bet?.points ?? 0) >= 20 ? "exact" : (bet?.points ?? 0) > 0 ? "hit" : "miss"}">+${bet?.points}pts</span>`
        : `<span class="pts pending">-</span>`;

    return `
      <tr>
        <td class="game-cell">
          <span class="home">${g.homeFlag ?? ""} ${g.homeTeam}</span>
          <span class="vs">×</span>
          <span class="away">${g.awayTeam} ${g.awayFlag ?? ""}</span>
          <div class="sub">${g.phase}${g.group ? ` · Grupo ${g.group}` : ""} · ${dateBRT} (BRT)</div>
        </td>
        <td class="bet-cell">
          ${
            hasBet
              ? `<span class="score">${bet!.homeScore} × ${bet!.awayScore}</span>`
              : `<span class="no-bet">Sem aposta</span>`
          }
        </td>
        <td class="result-cell">
          ${
            g.status === "finished"
              ? `<span class="score">${g.homeScore} × ${g.awayScore}</span>`
              : `<span class="pending-label">${statusLabel}</span>`
          }
        </td>
        <td class="pts-cell">${pointsHtml}</td>
      </tr>
    `;
  }).join("");

  const filterDesc = [
    filterPhase !== "Todos" ? `Fase: ${filterPhase}` : null,
    filterGroup !== "Todos" ? `Grupo: ${filterGroup}` : null,
    filterDate !== "Todos" ? `Data: ${formatDateFull(filterDate)}` : null,
  ].filter(Boolean).join(" · ") || "Todos os jogos";

  const totalPts = games.reduce((sum, g) => {
    const b = getBet(g.id);
    return sum + (b?.points ?? 0);
  }, 0);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Bolão Copa 2026 – Apostas de ${userName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8fafc;
      color: #1e293b;
      padding: 24px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 3px solid #16a34a;
    }
    .title-block h1 {
      font-size: 22px;
      font-weight: 800;
      color: #16a34a;
    }
    .title-block p {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .trophy { font-size: 40px; }
    .meta {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .chip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 12px;
      color: #475569;
    }
    .chip strong { color: #1e293b; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    thead tr { background: #16a34a; color: white; }
    thead th {
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: left;
    }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    td { padding: 10px 12px; vertical-align: middle; }
    .game-cell { max-width: 280px; }
    .home, .away { font-weight: 600; font-size: 13px; }
    .vs { color: #94a3b8; margin: 0 4px; }
    .sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
    .bet-cell, .result-cell { text-align: center; }
    .score {
      display: inline-block;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 2px 10px;
      font-size: 13px;
      font-weight: 700;
      color: #166534;
    }
    .no-bet {
      font-size: 11px;
      color: #cbd5e1;
      font-style: italic;
    }
    .pending-label {
      font-size: 11px;
      color: #94a3b8;
    }
    .pts-cell { text-align: center; }
    .pts {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }
    .pts.exact { background: #fef9c3; color: #713f12; border: 1px solid #fde68a; }
    .pts.hit { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .pts.miss { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .pts.pending { color: #cbd5e1; }
    .footer {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
    }
    .total-pts {
      font-size: 16px;
      font-weight: 800;
      color: #16a34a;
    }
    @media print {
      body { background: white; padding: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-block">
      <h1>⚽ Bolão Copa do Mundo 2026</h1>
      <p>Apostas de <strong>${userName}</strong> · ${filterDesc}</p>
    </div>
    <span class="trophy">🏆</span>
  </div>

  <div class="meta">
    <span class="chip">Participante: <strong>${userName}</strong></span>
    <span class="chip">Filtro: <strong>${filterDesc}</strong></span>
    <span class="chip">Total de jogos: <strong>${games.length}</strong></span>
    <span class="chip">Pontos neste filtro: <strong>${totalPts}pts</strong></span>
  </div>

  <table>
    <thead>
      <tr>
        <th>Jogo</th>
        <th style="text-align:center">Meu Palpite</th>
        <th style="text-align:center">Resultado</th>
        <th style="text-align:center">Pts</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    <span>Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
    <span class="total-pts">Total: ${totalPts} pts</span>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ApostasPage() {
  const { user, userDoc } = useAuth();
  const { bets, loading: betsLoading, getBetForGame } = useBets(user?.uid ?? null);

  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<ScoringSettings | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);

  const [filterPhase, setFilterPhase] = useState<GamePhase | "Todos">("Fase de Grupos");
  const [filterGroup, setFilterGroup] = useState<string>("Todos");
  const [filterDate, setFilterDate] = useState<string>("Todos");

  // Carrega jogos em tempo real
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

  // Carrega configurações de pontuação
  useEffect(() => {
    const settingsRef = doc(db, "settings", "scoring").withConverter(scoringConverter);
    getDoc(settingsRef).then((snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
  }, []);

  // Datas únicas dos jogos da fase selecionada (em BRT)
  const availableDates = useMemo(() => {
    const phaseGames = games.filter((g) =>
      filterPhase === "Todos" || g.phase === filterPhase
    );
    const dates = Array.from(new Set(phaseGames.map(gameDateBRT))).sort();
    return dates;
  }, [games, filterPhase]);

  // Quando muda a fase, reseta grupo e data
  function handlePhaseChange(phase: string) {
    setFilterPhase(phase as GamePhase | "Todos");
    setFilterGroup("Todos");
    setFilterDate("Todos");
  }

  // Filtra jogos
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

  const showGroupFilter =
    filterPhase === "Fase de Grupos" || filterPhase === "Todos";

  // Opções para os filtros
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

  // PDF share
  function handleSharePDF() {
    const userName =
      userDoc?.displayName ?? user?.displayName ?? user?.email ?? "Participante";

    const html = generatePDFHTML(
      filteredGames,
      (gameId) => {
        const b = getBetForGame(gameId);
        return b ? { homeScore: b.homeScore, awayScore: b.awayScore, points: b.points } : undefined;
      },
      userName,
      filterPhase,
      filterGroup,
      filterDate
    );

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Apostas</h1>
          <p className="text-muted-foreground text-sm">
            Faça seu palpite para cada jogo. Apostas travam {settings?.lockMinutesBefore ?? 5} minutos antes do apito.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSharePDF}
          disabled={loading || filteredGames.length === 0}
          className="flex items-center gap-1.5 shrink-0"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Compartilhar</span>
        </Button>
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
