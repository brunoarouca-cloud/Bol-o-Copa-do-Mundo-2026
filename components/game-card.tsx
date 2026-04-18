"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGameLockCountdown } from "@/hooks/use-countdown";
import { formatGameDateShort } from "@/lib/time";
import { useBetSave } from "@/hooks/use-bets";
import { MapPin, Clock } from "lucide-react";
import type { Game, Bet } from "@/types";

interface GameCardProps {
  game: Game;
  bet?: Bet;
  userId: string;
  lockMinutesBefore?: number;
}

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Aberto",
  locked: "Travado",
  finished: "Encerrado",
};

const STATUS_VARIANTS: Record<string, "open" | "locked" | "finished"> = {
  upcoming: "open",
  locked: "locked",
  finished: "finished",
};

const HIT_COLORS: Record<number, string> = {};

function getHitClass(points: number | null, exactScore: number = 20): string {
  if (points === null) return "";
  if (points === exactScore) return "border-hit-exact bg-hit-exact/10";
  if (points > 0) return "border-hit-partial bg-hit-partial/10";
  return "border-hit-miss bg-hit-miss/10";
}

export function GameCard({
  game,
  bet,
  userId,
  lockMinutesBefore = 5,
}: GameCardProps) {
  const { save, saving } = useBetSave(userId, game.id);
  const countdown = useGameLockCountdown(
    game.status === "upcoming" ? game.date : null,
    lockMinutesBefore
  );

  const [homeInput, setHomeInput] = useState<string>(
    bet?.homeScore !== undefined ? String(bet.homeScore) : ""
  );
  const [awayInput, setAwayInput] = useState<string>(
    bet?.awayScore !== undefined ? String(bet.awayScore) : ""
  );

  // Sync com dados do servidor
  useEffect(() => {
    if (bet) {
      setHomeInput(String(bet.homeScore));
      setAwayInput(String(bet.awayScore));
    }
  }, [bet?.homeScore, bet?.awayScore]);

  const isReadOnly = game.status !== "upcoming";

  const handleSave = useCallback(async () => {
    const h = parseInt(homeInput);
    const a = parseInt(awayInput);
    if (isNaN(h) || isNaN(a)) return;
    if (h < 0 || h > 20 || a < 0 || a > 20) return;

    try {
      await save(h, a);
    } catch {
      // Reverte para valor do servidor em caso de erro
      if (bet) {
        setHomeInput(String(bet.homeScore));
        setAwayInput(String(bet.awayScore));
      }
    }
  }, [homeInput, awayInput, save, bet]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
  };

  return (
    <Card
      className={cn(
        "transition-all",
        getHitClass(bet?.points ?? null),
        saving && "opacity-70"
      )}
    >
      <CardContent className="p-4">
        {/* Header: fase + badge + data */}
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">
            {game.phase}
            {game.group ? ` · Grupo ${game.group}` : ""}
          </span>
          <Badge variant={STATUS_VARIANTS[game.status]}>
            {STATUS_LABELS[game.status]}
          </Badge>
        </div>

        {/* Times + Placar */}
        <div className="flex items-center gap-2">
          {/* Time da casa */}
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-2xl" aria-hidden="true">
              {game.homeFlag ?? "🏳️"}
            </span>
            <span className="text-center text-sm font-semibold leading-tight">
              {game.homeTeam}
            </span>
          </div>

          {/* Inputs de placar */}
          <div className="flex items-center gap-1">
            {game.status === "finished" && game.homeScore !== null ? (
              <div className="flex items-center gap-1 text-lg font-bold">
                <span>{game.homeScore}</span>
                <span className="text-muted-foreground">×</span>
                <span>{game.awayScore}</span>
              </div>
            ) : (
              <>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={homeInput}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setHomeInput(v);
                  }}
                  onBlur={handleSave}
                  onKeyDown={(e) => {
                    if (!/[\d\b]/.test(e.key) && !["ArrowLeft","ArrowRight","Tab","Delete","Backspace","Enter"].includes(e.key)) e.preventDefault();
                    if (e.key === "Enter") handleSave();
                  }}
                  disabled={isReadOnly || saving}
                  readOnly={isReadOnly}
                  aria-label={`Gols de ${game.homeTeam}`}
                  className="h-12 w-12 text-center text-lg font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-muted-foreground font-bold">×</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={awayInput}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setAwayInput(v);
                  }}
                  onBlur={handleSave}
                  onKeyDown={(e) => {
                    if (!/[\d\b]/.test(e.key) && !["ArrowLeft","ArrowRight","Tab","Delete","Backspace","Enter"].includes(e.key)) e.preventDefault();
                    if (e.key === "Enter") handleSave();
                  }}
                  disabled={isReadOnly || saving}
                  readOnly={isReadOnly}
                  aria-label={`Gols de ${game.awayTeam}`}
                  className="h-12 w-12 text-center text-lg font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </>
            )}
          </div>

          {/* Time visitante */}
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-2xl" aria-hidden="true">
              {game.awayFlag ?? "🏳️"}
            </span>
            <span className="text-center text-sm font-semibold leading-tight">
              {game.awayTeam}
            </span>
          </div>
        </div>

        {/* Aposta do usuário vs resultado */}
        {game.status === "finished" && bet && (
          <div className="mt-2 text-center text-xs">
            <span className="text-muted-foreground">Sua aposta: </span>
            <span className="font-medium">
              {bet.homeScore} × {bet.awayScore}
            </span>
            {bet.points !== null && (
              <span
                className={cn(
                  "ml-2 font-bold",
                  bet.points >= 20
                    ? "text-hit-exact"
                    : bet.points > 0
                    ? "text-green-600"
                    : "text-destructive"
                )}
              >
                +{bet.points}pts
              </span>
            )}
          </div>
        )}

        {/* Footer: local + horário */}
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{game.venue} · {game.city}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatGameDateShort(game.date)} (BRT)
            </span>
            {game.status === "upcoming" && !countdown.isExpired && (
              <span className="text-status-locked font-medium">
                Trava {countdown.formatted}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
