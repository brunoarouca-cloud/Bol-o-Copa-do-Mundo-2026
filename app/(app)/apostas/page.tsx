"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { gameConverter, scoringConverter } from "@/lib/firebase/converters";
import { GameCard } from "@/components/game-card";
import { useAuth } from "@/hooks/use-auth";
import { useBets } from "@/hooks/use-bets";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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

export default function ApostasPage() {
  const { user } = useAuth();
  const { bets, loading: betsLoading, getBetForGame } = useBets(user?.uid ?? null);

  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<ScoringSettings | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);

  const [filterPhase, setFilterPhase] = useState<GamePhase | "Todos">("Fase de Grupos");
  const [filterGroup, setFilterGroup] = useState<string | "Todos">("Todos");
  const [filterDate, setFilterDate] = useState<string | "Todos">("Todos");

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

  // Filtra jogos
  const filteredGames = games.filter((g) => {
    if (filterPhase !== "Todos" && g.phase !== filterPhase) return false;
    if (filterGroup !== "Todos" && g.group !== filterGroup) return false;
    if (filterDate !== "Todos" && gameDateBRT(g) !== filterDate) return false;
    return true;
  });

  const loading = gamesLoading || betsLoading;

  // Grupos disponíveis para a fase selecionada
  const availableGroups =
    filterPhase === "Fase de Grupos" || filterPhase === "Todos"
      ? GROUPS
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Apostas</h1>
        <p className="text-muted-foreground text-sm">
          Faça seu palpite para cada jogo. Apostas travam 5 minutos antes do apito.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {/* Filtro por fase */}
        <div className="flex flex-wrap gap-1">
          {PHASES.map((phase) => (
            <Button
              key={phase}
              size="sm"
              variant={filterPhase === phase ? "default" : "outline"}
              onClick={() => {
                setFilterPhase(phase);
                setFilterGroup("Todos");
                setFilterDate("Todos");
              }}
              className="text-xs"
            >
              {phase}
            </Button>
          ))}
        </div>

        {/* Filtro por grupo (só na fase de grupos) */}
        {availableGroups.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={filterGroup === "Todos" ? "default" : "outline"}
              onClick={() => setFilterGroup("Todos")}
              className="text-xs"
            >
              Todos grupos
            </Button>
            {availableGroups.map((g) => (
              <Button
                key={g}
                size="sm"
                variant={filterGroup === g ? "default" : "outline"}
                onClick={() => setFilterGroup(g)}
                className="text-xs"
              >
                Grupo {g}
              </Button>
            ))}
          </div>
        )}

        {/* Filtro por data */}
        {availableDates.length > 1 && (
          <div className="flex flex-wrap gap-1 border-t pt-2 w-full">
            <Button
              size="sm"
              variant={filterDate === "Todos" ? "default" : "outline"}
              onClick={() => setFilterDate("Todos")}
              className="text-xs"
            >
              Todas as datas
            </Button>
            {availableDates.map((d) => (
              <Button
                key={d}
                size="sm"
                variant={filterDate === d ? "default" : "outline"}
                onClick={() => setFilterDate(d)}
                className="text-xs"
              >
                {formatDateLabel(d)}
              </Button>
            ))}
          </div>
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
