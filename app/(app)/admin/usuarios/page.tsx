"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { userConverter, betConverter, gameConverter } from "@/lib/firebase/converters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Trash2, Eye, CheckCircle, Clock } from "lucide-react";
import type { UserDoc, Bet, Game } from "@/types";
import { formatDate } from "@/lib/time";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export default function AdminUsuariosPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Bets dialog state
  const [viewingUser, setViewingUser] = useState<UserDoc | null>(null);
  const [userBets, setUserBets] = useState<{ bet: Bet; game: Game }[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "users").withConverter(userConverter),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => d.data()));
      setLoading(false);
    });
  }, []);

  async function handleDelete(u: UserDoc) {
    const confirm1 = window.confirm(
      `Excluir "${u.displayName}"? Esta ação é irreversível.`
    );
    if (!confirm1) return;
    const confirm2 = window.confirm(
      `CONFIRMAR: excluir definitivamente "${u.displayName}" (${u.email}) e todas as apostas?`
    );
    if (!confirm2) return;

    setDeletingId(u.uid);
    try {
      await deleteDoc(doc(db, "users", u.uid));
      toast.success(`${u.displayName} removido.`);
    } catch {
      toast.error("Erro ao excluir usuário.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTogglePayment(u: UserDoc) {
    setTogglingId(u.uid);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/toggle-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: u.uid, hasPaid: !u.hasPaid }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar.");
      toast.success(
        !u.hasPaid
          ? `${u.displayName} marcado como pago ✓`
          : `${u.displayName} marcado como pendente`
      );
    } catch {
      toast.error("Erro ao atualizar status de pagamento.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleViewBets(u: UserDoc) {
    setViewingUser(u);
    setLoadingBets(true);
    setUserBets([]);
    try {
      const [betsSnap, gamesSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "bets").withConverter(betConverter),
            where("userId", "==", u.uid)
          )
        ),
        getDocs(
          query(
            collection(db, "games").withConverter(gameConverter),
            orderBy("matchNumber", "asc")
          )
        ),
      ]);

      const betsMap = new Map(betsSnap.docs.map((d) => [d.data().gameId, d.data()]));
      const allGames = gamesSnap.docs.map((d) => d.data());

      const combined = allGames
        .filter((g) => betsMap.has(g.id))
        .map((g) => ({ bet: betsMap.get(g.id)!, game: g }));

      setUserBets(combined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao carregar apostas: ${msg}`);
    } finally {
      setLoadingBets(false);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const paidCount = users.filter((u) => !u.isAdmin && u.hasPaid).length;
  const pendingCount = users.filter((u) => !u.isAdmin && !u.hasPaid).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          {users.length} participante(s) cadastrado(s) ·{" "}
          <span className="text-green-600 font-medium">{paidCount} pago(s)</span> ·{" "}
          <span className="text-yellow-600 font-medium">{pendingCount} pendente(s)</span>
        </p>
      </div>

      <Input
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="py-3 pl-4 text-left font-medium text-muted-foreground">
                  Participante
                </th>
                <th className="hidden py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  E-mail
                </th>
                <th className="py-3 text-right font-medium text-muted-foreground pr-2">
                  Pontos
                </th>
                <th className="py-3 text-center font-medium text-muted-foreground">
                  Pagamento
                </th>
                <th className="py-3 pr-4 text-right font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.uid} className="border-t hover:bg-muted/30">
                  <td className="py-3 pl-4">
                    <div className="font-medium">{u.displayName}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{u.email}</div>
                    {u.isAdmin && (
                      <Badge className="mt-0.5 text-xs" variant="default">
                        Admin
                      </Badge>
                    )}
                  </td>
                  <td className="hidden py-3 text-muted-foreground sm:table-cell">
                    {u.email}
                  </td>
                  <td className="py-3 pr-2 text-right font-bold">{u.totalPoints}</td>
                  <td className="py-3 text-center">
                    {u.isAdmin ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <button
                        onClick={() => handleTogglePayment(u)}
                        disabled={togglingId === u.uid}
                        title={u.hasPaid ? "Marcar como pendente" : "Marcar como pago"}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors border",
                          u.hasPaid
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                        )}
                      >
                        {togglingId === u.uid ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : u.hasPaid ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {u.hasPaid ? "Pago" : "Pendente"}
                      </button>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewBets(u)}
                        aria-label={`Ver apostas de ${u.displayName}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!u.isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(u)}
                          disabled={deletingId === u.uid}
                          aria-label={`Excluir ${u.displayName}`}
                          className="text-destructive hover:text-destructive"
                        >
                          {deletingId === u.uid ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum usuário encontrado.
            </div>
          )}
        </div>
      )}

      {/* Dialog: apostas do usuário */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Apostas de {viewingUser?.displayName}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({userBets.length} aposta{userBets.length !== 1 ? "s" : ""})
              </span>
            </DialogTitle>
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
                return (
                  <div
                    key={bet.id}
                    className={cn(
                      "flex items-center justify-between rounded-md border p-2.5 text-sm",
                      isFinished ? "bg-muted/30" : ""
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-xs text-muted-foreground shrink-0">
                          #{game.matchNumber}
                        </span>
                        <span className="font-semibold">{game.homeTeam}</span>
                        <span className="text-muted-foreground">×</span>
                        <span className="font-semibold">{game.awayTeam}</span>
                        {!isFinished && (
                          <Badge variant="outline" className="text-xs py-0">
                            {game.status === "locked" ? "Travado" : "Aberto"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          Palpite:{" "}
                          <strong>
                            {bet.homeScore} × {bet.awayScore}
                          </strong>
                        </span>
                        {isFinished && (
                          <span className="text-xs text-muted-foreground">
                            · Resultado:{" "}
                            <strong>
                              {game.homeScore} × {game.awayScore}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-3 shrink-0">
                      {isFinished && bet.points !== null ? (
                        <span
                          className={cn(
                            "font-bold text-sm",
                            bet.points >= 20
                              ? "text-yellow-600"
                              : bet.points > 0
                              ? "text-green-600"
                              : "text-destructive"
                          )}
                        >
                          +{bet.points}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
