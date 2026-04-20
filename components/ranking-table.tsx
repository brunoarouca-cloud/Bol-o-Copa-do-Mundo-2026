"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { betConverter, gameConverter } from "@/lib/firebase/converters";
import type { UserDoc, Bet, Game } from "@/types";
import { Loader2, Eye } from "lucide-react";

interface RankingTableProps {
  users: UserDoc[];
  currentUserId?: string;
}

export function RankingTable({ users, currentUserId }: RankingTableProps) {
  const [viewingUser, setViewingUser] = useState<UserDoc | null>(null);
  const [userBets, setUserBets] = useState<{ bet: Bet; game: Game }[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);

  async function handleViewBets(user: UserDoc) {
    setViewingUser(user);
    setLoadingBets(true);

    try {
      const betsQuery = query(
        collection(db, "bets").withConverter(betConverter),
        where("userId", "==", user.uid)
      );
      const gamesQuery = query(
        collection(db, "games").withConverter(gameConverter),
        orderBy("matchNumber", "asc")
      );

      const [betsSnap, gamesSnap] = await Promise.all([
        getDocs(betsQuery),
        getDocs(gamesQuery),
      ]);

      const betsMap = new Map(betsSnap.docs.map((d) => [d.data().gameId, d.data()]));
      const allGames = gamesSnap.docs.map((d) => d.data());

      // Mostra só jogos encerrados para não revelar palpites abertos de outros usuários
      const combined = allGames
        .filter((g) => g.status === "finished" && betsMap.has(g.id))
        .map((g) => ({ bet: betsMap.get(g.id)!, game: g }));

      setUserBets(combined);
    } catch (err) {
      console.error("Erro ao carregar apostas:", err);
    } finally {
      setLoadingBets(false);
    }
  }

  const medalIcons: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm" role="grid" aria-label="Tabela de classificação">
          <thead className="bg-muted/50">
            <tr>
              <th className="py-3 pl-4 text-left font-medium text-muted-foreground" scope="col">
                #
              </th>
              <th className="py-3 pl-2 text-left font-medium text-muted-foreground" scope="col">
                Participante
              </th>
              <th
                className="py-3 pr-4 text-right font-medium text-muted-foreground"
                scope="col"
              >
                Pts
              </th>
              <th
                className="hidden py-3 pr-4 text-right font-medium text-muted-foreground sm:table-cell"
                scope="col"
              >
                Exatos
              </th>
              <th className="py-3 pr-4" scope="col">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => {
              const isCurrentUser = user.uid === currentUserId;
              const rank = index + 1;

              return (
                <tr
                  key={user.uid}
                  className={cn(
                    "border-t transition-colors hover:bg-muted/30",
                    isCurrentUser && "ring-2 ring-brand-gold bg-brand-gold/5"
                  )}
                >
                  <td className="py-3 pl-4 font-bold">
                    {medalIcons[rank] ?? rank}
                  </td>
                  <td className="py-3 pl-2">
                    <span className={cn("font-medium", isCurrentUser && "text-brand-gold")}>
                      {user.displayName}
                    </span>
                    {isCurrentUser && (
                      <span className="ml-1 text-xs text-muted-foreground">(você)</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right font-bold">{user.totalPoints}</td>
                  <td className="hidden py-3 pr-4 text-right text-muted-foreground sm:table-cell">
                    {user.exactHits}
                  </td>
                  <td className="py-3 pr-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewBets(user)}
                        aria-label={`Ver apostas de ${user.displayName}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {isCurrentUser && (
                        <ShareButton userId={user.uid} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            Nenhum participante ainda.
          </div>
        )}
      </div>

      {/* Modal de apostas */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apostas de {viewingUser?.displayName}</DialogTitle>
          </DialogHeader>

          {loadingBets ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : userBets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma aposta registrada.
            </p>
          ) : (
            <div className="space-y-1.5">
              {userBets.map(({ bet, game }) => {
                const isFinished = game.status === "finished";
                const statusLabel = game.status === "locked" ? "Travado" : game.status === "finished" ? "Encerrado" : "Aberto";
                return (
                <div
                  key={bet.id}
                  className={cn(
                    "flex items-center justify-between rounded-md border p-2.5 text-sm",
                    isFinished ? "bg-muted/30" : ""
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-muted-foreground shrink-0">#{game.matchNumber}</span>
                      <span className="font-semibold">{game.homeTeam}</span>
                      <span className="text-muted-foreground">×</span>
                      <span className="font-semibold">{game.awayTeam}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full border",
                        isFinished ? "bg-muted text-muted-foreground" : "border-primary/30 text-primary"
                      )}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Palpite: <strong>{bet.homeScore} × {bet.awayScore}</strong>
                      {isFinished && (
                        <> · Resultado: <strong>{game.homeScore} × {game.awayScore}</strong></>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0">
                    {isFinished && bet.points !== null ? (
                      <span className={cn(
                        "font-bold text-sm",
                        bet.points >= 20 ? "text-hit-exact" : bet.points > 0 ? "text-green-600" : "text-destructive"
                      )}>
                        +{bet.points}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              )})}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
