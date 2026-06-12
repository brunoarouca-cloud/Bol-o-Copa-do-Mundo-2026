"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Game, Bet, UserDoc, ScoringSettings } from "@/types";

interface BetRow {
  userId: string;
  displayName: string;
  homeScore: number;
  awayScore: number;
  points: number | null;
}

interface GameBetsDialogProps {
  game: Game;
  currentUserId: string;
  settings?: ScoringSettings | null;
}

function getPointsColor(points: number | null, exactScore: number): string {
  if (points === null) return "text-muted-foreground";
  if (points === exactScore) return "text-amber-500 dark:text-amber-400";
  if (points > 0) return "text-green-600 dark:text-green-400";
  return "text-red-500 dark:text-red-400";
}

function getRowBg(points: number | null, exactScore: number, isMe: boolean): string {
  const base = isMe ? "bg-primary/8 " : "";
  if (points === null) return base;
  if (points === exactScore) return base + "bg-amber-50/50 dark:bg-amber-950/20";
  if (points > 0) return base + "bg-green-50/50 dark:bg-green-950/20";
  return base + "bg-red-50/30 dark:bg-red-950/10";
}

export function GameBetsDialog({
  game,
  currentUserId,
  settings,
}: GameBetsDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BetRow[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const exactScore = settings?.exactScore ?? 20;
  const isLive = game.status === "live";

  // Busca usuários (nomes) uma vez ao abrir
  useEffect(() => {
    if (!open) return;
    setLoading(true);

    getDocs(collection(db, "users")).then((snap) => {
      const map = new Map<string, string>();
      snap.docs.forEach((d) => {
        const data = d.data() as UserDoc;
        map.set(d.id, data.displayName || data.email || "Participante");
      });
      setUsersMap(map);
    });
  }, [open]);

  // Listener em tempo real das apostas do jogo
  useEffect(() => {
    if (!open || usersMap.size === 0) return;

    const q = query(
      collection(db, "bets"),
      where("gameId", "==", game.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const betsMap = new Map<string, Bet>();
      snap.docs.forEach((d) => {
        const b = d.data() as Bet;
        betsMap.set(b.userId, b);
      });

      // Monta lista com todos os usuários do bolão
      const result: BetRow[] = [];
      usersMap.forEach((name, uid) => {
        const bet = betsMap.get(uid);
        if (!bet) return; // Só mostra quem apostou
        result.push({
          userId: uid,
          displayName: name,
          homeScore: bet.homeScore,
          awayScore: bet.awayScore,
          points: bet.points,
        });
      });

      // Ordena: pontos desc, depois nome
      result.sort((a, b) => {
        const pa = a.points ?? -1;
        const pb = b.points ?? -1;
        if (pb !== pa) return pb - pa;
        return a.displayName.localeCompare(b.displayName, "pt-BR");
      });

      setRows(result);
      setLoading(false);
    });

    return () => unsub();
  }, [open, game.id, usersMap]);

  const hasResult =
    game.status === "finished" || (isLive && game.homeScore !== null);

  const totalBettors = rows.length;
  const exactCount = rows.filter((r) => r.points === exactScore).length;
  const hitCount = rows.filter(
    (r) => r.points !== null && r.points > 0 && r.points !== exactScore
  ).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "w-full mt-2 h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground",
            isLive && "text-red-500 hover:text-red-600 dark:text-red-400"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Ver apostas do grupo
          {isLive && <Radio className="h-3 w-3 animate-pulse" />}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0">
        {/* ── Header ─────────────────────────────────────── */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="text-base">
            <div className="flex items-center justify-center gap-2 text-center">
              <span>{game.homeFlag ?? "🏳️"}</span>
              <span className="font-bold">{game.homeTeam}</span>

              {hasResult ? (
                <span
                  className={cn(
                    "text-lg font-black px-2",
                    isLive && "text-red-600 dark:text-red-400"
                  )}
                >
                  {game.homeScore} × {game.awayScore}
                </span>
              ) : (
                <span className="text-muted-foreground font-normal text-sm px-1">
                  ×
                </span>
              )}

              <span className="font-bold">{game.awayTeam}</span>
              <span>{game.awayFlag ?? "🏳️"}</span>
            </div>

            {/* Status badges */}
            <div className="flex items-center justify-center gap-2 mt-1.5">
              {isLive && (
                <Badge variant="live" className="text-xs gap-1">
                  <Radio className="h-2.5 w-2.5 animate-pulse" />
                  Ao vivo — placar em tempo real
                </Badge>
              )}
              {game.status === "finished" && (
                <Badge variant="finished" className="text-xs">
                  Encerrado
                </Badge>
              )}
              {game.status === "locked" && (
                <Badge variant="locked" className="text-xs">
                  Apostas encerradas
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* ── Stats resumo ────────────────────────────────── */}
        {!loading && rows.length > 0 && hasResult && (
          <div className="flex items-center justify-around px-4 py-2 bg-muted/30 text-xs border-b shrink-0">
            <div className="text-center">
              <div className="font-bold text-base">{totalBettors}</div>
              <div className="text-muted-foreground">apostas</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-base text-amber-500">{exactCount}</div>
              <div className="text-muted-foreground">exato ({exactScore}pts)</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-base text-green-600">{hitCount}</div>
              <div className="text-muted-foreground">parcial</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-base text-red-500">
                {totalBettors - exactCount - hitCount}
              </div>
              <div className="text-muted-foreground">errou</div>
            </div>
          </div>
        )}

        {/* ── Lista ───────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Nenhuma aposta registrada para este jogo.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20 text-xs text-muted-foreground">
                  <th className="py-2 pl-4 pr-2 text-left w-8">#</th>
                  <th className="py-2 pr-2 text-left">Participante</th>
                  <th className="py-2 pr-2 text-center w-16">Palpite</th>
                  {hasResult && (
                    <th className="py-2 pr-4 text-right w-16">Pts</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isMe = row.userId === currentUserId;
                  const rowBg = getRowBg(row.points, exactScore, isMe);
                  const ptsColor = getPointsColor(row.points, exactScore);

                  // Posição: empate visual se mesmos pontos
                  const samePointsAsPrev =
                    i > 0 && rows[i - 1].points === row.points;
                  const posLabel = samePointsAsPrev ? "" : `${i + 1}`;

                  return (
                    <tr
                      key={row.userId}
                      className={cn(
                        "border-b last:border-0 transition-colors",
                        rowBg,
                        isMe && "font-semibold"
                      )}
                    >
                      {/* Posição */}
                      <td className="py-2.5 pl-4 pr-2 text-xs text-muted-foreground tabular-nums">
                        {posLabel}
                      </td>

                      {/* Nome */}
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate max-w-[140px]",
                              isMe && "text-primary"
                            )}
                          >
                            {row.displayName}
                          </span>
                          {isMe && (
                            <span className="text-[10px] text-primary/60 font-normal shrink-0">
                              (você)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Palpite */}
                      <td className="py-2.5 pr-2 text-center tabular-nums">
                        <span className="font-mono font-semibold">
                          {row.homeScore} × {row.awayScore}
                        </span>
                      </td>

                      {/* Pontos */}
                      {hasResult && (
                        <td
                          className={cn(
                            "py-2.5 pr-4 text-right tabular-nums font-bold",
                            ptsColor
                          )}
                        >
                          {row.points !== null ? (
                            <>
                              {isLive && (
                                <span className="text-xs font-normal mr-0.5">~</span>
                              )}
                              {row.points}
                              <span className="text-xs font-normal ml-0.5">pts</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground font-normal">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        {isLive && (
          <div className="px-4 py-2 border-t bg-red-50/50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400 text-center shrink-0 flex items-center justify-center gap-1">
            <Radio className="h-3 w-3 animate-pulse" />
            Pontuações atualizadas em tempo real
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
