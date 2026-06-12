"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { gameConverter } from "@/lib/firebase/converters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { auth } from "@/lib/firebase/client";
import { toast } from "sonner";
import { formatGameDate } from "@/lib/time";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2,
  CheckCircle2,
  Trash2,
  Radio,
  Settings,
  ChevronDown,
  RefreshCw,
  Users,
  MessageCircle,
  Lock,
  ListOrdered,
} from "lucide-react";
import type { Game, GameStatus, UserDoc, Bet } from "@/types";
import { cn } from "@/lib/utils";

const BRT = "America/Sao_Paulo";
const WHATSAPP_NUMBER = "5521996169535";

const STATUS_LABELS: Record<GameStatus, string> = {
  upcoming: "Aberto",
  locked: "Travado",
  live: "Ao vivo",
  finished: "Encerrado",
};
const STATUS_VARIANTS: Record<GameStatus, "open" | "locked" | "live" | "finished"> = {
  upcoming: "open",
  locked: "locked",
  live: "live",
  finished: "finished",
};
const ALL_STATUSES: GameStatus[] = ["upcoming", "locked", "live", "finished"];

function toDatetimeLocal(date: Game["date"]): string {
  const brt = toZonedTime(date.toDate(), BRT);
  return format(brt, "yyyy-MM-dd'T'HH:mm");
}

function fromDatetimeLocal(value: string): string {
  const utc = fromZonedTime(new Date(value), BRT);
  return utc.toISOString();
}

// ── Pending Bettors Dialog ──────────────────────────────────────────────────
interface PendingDialogProps {
  game: Game | null;
  pendingUsers: UserDoc[];
  loading: boolean;
  open: boolean;
  onClose: () => void;
}

function PendingDialog({ game, pendingUsers, loading, open, onClose }: PendingDialogProps) {
  if (!game) return null;

  // Captura em const para narrowing dentro das funções internas
  const currentGame = game;

  const gameDate = currentGame.date
    ? format(toZonedTime(currentGame.date.toDate(), BRT), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : "";

  function handleShareWhatsApp() {
    if (pendingUsers.length === 0) return;

    const names = pendingUsers.map((u, i) => `${i + 1}. ${u.displayName}`).join("\n");
    const text = [
      "⚽ *BOLÃO COPA DO MUNDO 2026*",
      `🎯 *Apostas pendentes — ${currentGame.homeTeam} × ${currentGame.awayTeam}*`,
      `📅 ${gameDate}`,
      "─────────────────────",
      "",
      `Os participantes abaixo ainda não apostaram neste jogo:`,
      "",
      names,
      "",
      "─────────────────────",
      "⏰ Não esqueça de registrar seu palpite antes do início do jogo!",
    ].join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-400" />
            Apostas Pendentes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Jogo */}
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <p className="font-semibold">{game.homeTeam} × {game.awayTeam}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{gameDate} (BRT)</p>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-3 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Todos os participantes já apostaram neste jogo!
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {pendingUsers.length} participante{pendingUsers.length !== 1 ? "s" : ""} sem aposta:
              </p>
              <ul className="divide-y rounded-lg border overflow-hidden">
                {pendingUsers.map((u, i) => (
                  <li key={u.uid} className="flex items-center gap-2 px-3 py-2 text-sm bg-background">
                    <span className="w-5 text-xs text-muted-foreground text-right">{i + 1}.</span>
                    <span className="font-medium">{u.displayName}</span>
                    <span className="ml-auto text-xs text-muted-foreground truncate max-w-[120px]">{u.email}</span>
                  </li>
                ))}
              </ul>

              {/* WhatsApp share */}
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleShareWhatsApp}
              >
                <MessageCircle className="h-4 w-4" />
                Enviar cobrança via WhatsApp
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Game Bets Dialog ───────────────────────────────────────────────────────
interface BetRow {
  bet: Bet;
  userName: string;
}

interface GameBetsDialogProps {
  game: Game | null;
  open: boolean;
  onClose: () => void;
}

function GameBetsDialog({ game, open, onClose }: GameBetsDialogProps) {
  const [bets, setBets] = useState<BetRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!game || !open) return;
    setLoading(true);
    setBets([]);

    async function load() {
      const [betsSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, "bets"), where("gameId", "==", game!.id))),
        getDocs(collection(db, "users")),
      ]);
      const usersMap = new Map(usersSnap.docs.map((d) => [d.id, d.data().displayName as string]));
      const rows: BetRow[] = betsSnap.docs
        .map((d) => ({
          bet: d.data() as Bet,
          userName: usersMap.get(d.data().userId) ?? `[excluído: …${(d.data().userId as string).slice(-6)}]`,
        }))
        .sort((a, b) => a.userName.localeCompare(b.userName, "pt-BR"));
      setBets(rows);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [game, open]);

  if (!game) return null;
  const isFinished = game.status === "finished";

  function handleShareWhatsApp() {
    if (bets.length === 0) return;

    const gameDate = game.date
      ? format(toZonedTime(game.date.toDate(), BRT), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
      : "";

    const betLines = bets.map(({ bet, userName }, i) => {
      const num = String(i + 1).padStart(2, " ");
      return `${num}. ${userName} — ${bet.homeScore}×${bet.awayScore}`;
    });

    const lines = [
      `⚽ *BOLÃO COPA DO MUNDO 2026*`,
      ``,
      `🎯 *${game.homeTeam} × ${game.awayTeam}*`,
      gameDate ? `⏰ ${gameDate} (BRT)` : null,
      ``,
      `🏆 *Palpites dos participantes:*`,
      ...betLines,
      `📊 *${bets.length} palpite${bets.length !== 1 ? "s" : ""}*`,
    ].filter((l) => l !== null).join("\n");

    const url = `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-primary" />
            Apostas — {game.homeTeam} × {game.awayTeam}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
          {/* Resultado oficial */}
          {isFinished && game.homeScore !== null && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-center font-semibold">
              Resultado: {game.homeScore} × {game.awayScore}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : bets.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Nenhuma aposta registrada para este jogo.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {bets.length} aposta{bets.length !== 1 ? "s" : ""} registrada{bets.length !== 1 ? "s" : ""}
              </p>
              <ul className="divide-y rounded-lg border overflow-hidden">
                {bets.map(({ bet, userName }) => {
                  const pts = bet.points;
                  const ptColor = pts === null ? "text-muted-foreground"
                    : pts >= 20 ? "text-yellow-600 dark:text-yellow-400"
                    : pts > 0  ? "text-green-600 dark:text-green-400"
                    : "text-destructive";
                  return (
                    <li key={bet.id} className="flex items-center justify-between px-3 py-2.5 bg-background text-sm">
                      <span className="font-medium truncate flex-1">{userName}</span>
                      <span className={cn("font-bold mx-3 tabular-nums", "text-foreground")}>
                        {bet.homeScore} × {bet.awayScore}
                      </span>
                      {isFinished && (
                        <span className={cn("font-bold text-sm w-12 text-right tabular-nums shrink-0", ptColor)}>
                          {pts !== null ? `+${pts}` : "—"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Botão WhatsApp — sempre visível no rodapé */}
        {!loading && bets.length > 0 && (
          <div className="pt-3 border-t">
            <Button
              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleShareWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              Compartilhar apostas no WhatsApp
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminJogosPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [togglingLiveId, setTogglingLiveId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { home: string; away: string }>>({});
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<Record<string, GameStatus>>({});
  const [editDate, setEditDate] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);
  const [locking, setLocking] = useState(false);

  // Paid users (for pending bettors)
  const [paidUsers, setPaidUsers] = useState<UserDoc[]>([]);

  // Bet counts per gameId: gameId → Set of userIds who bet
  const [betsByGame, setBetsByGame] = useState<Record<string, Set<string>>>({});
  const [betsLoading, setBetsLoading] = useState(true);

  // Pending modal state
  const [pendingGame, setPendingGame] = useState<Game | null>(null);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);

  // Dialog apostas do jogo
  const [betsGame, setBetsGame] = useState<Game | null>(null);
  const [betsModalOpen, setBetsModalOpen] = useState(false);

  // ── Load games ────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "games").withConverter(gameConverter),
      orderBy("matchNumber", "asc")
    );
    return onSnapshot(q, (snap) => {
      setGames(snap.docs.map((d) => d.data()));
      setLoading(false);
    });
  }, []);

  // ── Load paid users ────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "users"), where("hasPaid", "==", true));
    return onSnapshot(q, (snap) => {
      setPaidUsers(snap.docs.map((d) => d.data() as UserDoc));
    });
  }, []);

  // ── Load all bets (snapshot) ───────────────────────────────────────────
  useEffect(() => {
    setBetsLoading(true);
    const unsub = onSnapshot(collection(db, "bets"), (snap) => {
      const map: Record<string, Set<string>> = {};
      snap.docs.forEach((d) => {
        const { gameId, userId } = d.data() as { gameId: string; userId: string };
        if (!map[gameId]) map[gameId] = new Set();
        map[gameId].add(userId);
      });
      setBetsByGame(map);
      setBetsLoading(false);
    });
    return unsub;
  }, []);

  // ── Pending users for selected game ───────────────────────────────────
  const pendingUsers = useMemo<UserDoc[]>(() => {
    if (!pendingGame) return [];
    const bettedUids = betsByGame[pendingGame.id] ?? new Set();
    return paidUsers.filter((u) => !bettedUids.has(u.uid));
  }, [pendingGame, betsByGame, paidUsers]);

  // ── Pending count per game ─────────────────────────────────────────────
  function pendingCount(gameId: string): number {
    const bettedUids = betsByGame[gameId] ?? new Set();
    return paidUsers.filter((u) => !bettedUids.has(u.uid)).length;
  }

  function openPendingModal(game: Game) {
    setPendingGame(game);
    setPendingModalOpen(true);
  }

  // ── Game control handlers ──────────────────────────────────────────────
  function toggleExpand(game: Game) {
    if (expandedId === game.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(game.id);
    setEditStatus((prev) => ({ ...prev, [game.id]: game.status }));
    setEditDate((prev) => ({ ...prev, [game.id]: toDatetimeLocal(game.date) }));
  }

  async function handleUpdateGame(game: Game) {
    const newStatus = editStatus[game.id];
    const newDateLocal = editDate[game.id];
    const statusChanged = newStatus && newStatus !== game.status;
    const dateChanged = newDateLocal && newDateLocal !== toDatetimeLocal(game.date);
    if (!statusChanged && !dateChanged) {
      toast.info("Nenhuma alteração para salvar.");
      return;
    }
    setUpdatingId(game.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const body: Record<string, string> = { gameId: game.id };
      if (statusChanged) body.status = newStatus;
      if (dateChanged) body.dateUTC = fromDatetimeLocal(newDateLocal);
      const response = await fetch("/api/admin/update-game", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Erro desconhecido");
      }
      toast.success(`${game.homeTeam} × ${game.awayTeam} atualizado!`);
      setExpandedId(null);
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setUpdatingId(null);
    }
  }

  function handleInputChange(gameId: string, side: "home" | "away", value: string) {
    setResults((prev) => ({
      ...prev,
      [gameId]: {
        home: prev[gameId]?.home ?? "",
        away: prev[gameId]?.away ?? "",
        [side]: value,
      },
    }));
  }

  async function handleSaveResult(game: Game) {
    const r = results[game.id];
    if (!r || r.home === "" || r.away === "") {
      toast.error("Preencha ambos os placares.");
      return;
    }
    const homeScore = parseInt(r.home);
    const awayScore = parseInt(r.away);
    if (isNaN(homeScore) || isNaN(awayScore)) {
      toast.error("Placar inválido.");
      return;
    }
    setSavingId(game.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/admin/result", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameId: game.id, homeScore, awayScore }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Erro desconhecido");
      }
      toast.success(`Resultado de ${game.homeTeam} × ${game.awayTeam} salvo!`);
      setResults((prev) => {
        const next = { ...prev };
        delete next[game.id];
        return next;
      });
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleLive(game: Game) {
    const willBeLive = game.status === "locked";
    if (
      !confirm(
        willBeLive
          ? `Marcar "${game.homeTeam} × ${game.awayTeam}" como ao vivo?`
          : `Encerrar o jogo ao vivo "${game.homeTeam} × ${game.awayTeam}"? Use o placar final abaixo e salve.`
      )
    )
      return;
    setTogglingLiveId(game.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const body = willBeLive
        ? { gameId: game.id, homeScore: 0, awayScore: 0, isLive: true }
        : { gameId: game.id, homeScore: game.homeScore ?? 0, awayScore: game.awayScore ?? 0, isLive: false };
      const response = await fetch("/api/admin/result", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Erro desconhecido");
      }
      toast.success(
        willBeLive
          ? `${game.homeTeam} × ${game.awayTeam} marcado como ao vivo!`
          : `${game.homeTeam} × ${game.awayTeam} encerrado.`
      );
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setTogglingLiveId(null);
    }
  }

  async function handleClearResult(game: Game) {
    if (!confirm(`Remover o placar de ${game.homeTeam} × ${game.awayTeam}? Os pontos deste jogo serão zerados.`)) return;
    setClearingId(game.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/admin/clear-result", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameId: game.id }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Erro desconhecido");
      }
      toast.success(`Placar de ${game.homeTeam} × ${game.awayTeam} removido.`);
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setClearingId(null);
    }
  }

  async function handleLockGames() {
    setLocking(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/check-lock", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      if (data.locked === 0) {
        toast.info("Nenhum jogo para travar no momento.");
      } else {
        toast.success(`${data.locked} jogo(s) travado(s)!`);
      }
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setLocking(false);
    }
  }

  async function handleSyncGames() {
    if (!confirm(
      "Sincronizar jogos eliminatórios com a football-data.org?\n\n" +
      "Serão atualizados: nomes dos times, escudos, sedes e IDs externos.\n" +
      "Placares e status existentes NÃO serão alterados."
    )) return;
    setSyncing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/sync-games", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      if (data.errors?.length > 0) {
        toast.warning(`Sincronizado com avisos: ${data.updated} atualizados, ${data.skipped} ignorados.`, {
          description: data.errors.slice(0, 2).join(" · "),
        });
      } else {
        toast.success(`Sincronização concluída!`, {
          description: `${data.updated} atualizados · ${data.unchanged} sem mudança · ${data.skipped} ignorados`,
        });
      }
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }

  const filteredGames = games.filter(
    (g) =>
      g.homeTeam.toLowerCase().includes(search.toLowerCase()) ||
      g.awayTeam.toLowerCase().includes(search.toLowerCase()) ||
      g.phase.toLowerCase().includes(search.toLowerCase()) ||
      (g.group && g.group.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Jogos & Resultados</h1>
          <p className="text-sm text-muted-foreground">
            Insira resultados, force status ou edite data/hora de qualquer jogo.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleLockGames}
            disabled={locking}
            className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30"
            title="Trava imediatamente todos os jogos que já deveriam estar travados (dentro da janela de lockMinutesBefore)"
          >
            {locking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Travar jogos</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncGames}
            disabled={syncing}
            className="gap-2"
            title="Atualiza times, sedes e IDs externos a partir da football-data.org. Não altera placares."
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Sincronizar com API</span>
          </Button>
        </div>
      </div>

      <Input
        placeholder="Buscar por times, fase ou grupo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGames.map((game) => {
            const r = results[game.id];
            const isSaving = savingId === game.id;
            const isClearing = clearingId === game.id;
            const isTogglingLive = togglingLiveId === game.id;
            const isUpdating = updatingId === game.id;
            const isLive = game.status === "live";
            const isExpanded = expandedId === game.id;

            // Pending bettors badge — only show for non-finished games
            const showPending = game.status !== "finished" && paidUsers.length > 0;
            const pending = showPending ? pendingCount(game.id) : 0;

            return (
              <div key={game.id} className="rounded-lg border overflow-hidden">
                {/* Linha principal */}
                <div className="p-3 space-y-2">
                  {/* Linha 1: info do jogo + botões de ação */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {game.homeTeam} × {game.awayTeam}
                        </span>
                        <Badge variant={STATUS_VARIANTS[game.status]}>
                          {STATUS_LABELS[game.status]}
                        </Badge>
                        {game.group && (
                          <span className="text-xs text-muted-foreground">Grupo {game.group}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatGameDate(game.date)} (BRT) · {game.venue}
                      </div>
                    </div>

                    {/* Botões de ação rápida (sempre visíveis) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => { setBetsGame(game); setBetsModalOpen(true); }}
                        title="Ver todas as apostas deste jogo"
                      >
                        <ListOrdered className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant={isExpanded ? "secondary" : "ghost"}
                        className="h-7 w-7 p-0"
                        onClick={() => toggleExpand(game)}
                        title="Editar status e data/hora"
                      >
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <Settings className="h-3.5 w-3.5" />
                        }
                      </Button>
                    </div>
                  </div>

                  {/* Linha 2: status badges + controles ao vivo */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge de pendentes */}
                    {showPending && !betsLoading && (
                      <button
                        onClick={() => openPendingModal(game)}
                        title={
                          pending === 0
                            ? "Todos apostaram!"
                            : `${pending} sem aposta — clique para ver`
                        }
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
                          pending === 0
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 cursor-default"
                            : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 cursor-pointer"
                        }`}
                      >
                        <Users className="h-3 w-3" />
                        {pending === 0 ? "Todos" : `${pending} pendente${pending !== 1 ? "s" : ""}`}
                      </button>
                    )}
                    {showPending && betsLoading && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}

                    {/* Resultado atual */}
                    {game.homeScore !== null && (
                      <div className="flex items-center gap-1 text-sm font-bold">
                        {isLive ? (
                          <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {game.homeScore} × {game.awayScore}
                      </div>
                    )}

                    {/* Botão ao vivo */}
                    {(game.status === "locked" || isLive) && (
                      <Button
                        size="sm"
                        variant={isLive ? "destructive" : "outline"}
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => handleToggleLive(game)}
                        disabled={isTogglingLive}
                        title={isLive ? "Encerrar jogo ao vivo" : "Marcar como ao vivo"}
                      >
                        {isTogglingLive ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Radio className="h-3 w-3" />
                        )}
                        {isLive ? "Encerrar" : "Ao vivo"}
                      </Button>
                    )}

                    {/* Remover placar */}
                    {game.homeScore !== null && game.status === "finished" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleClearResult(game)}
                        disabled={isClearing}
                        title="Remover placar"
                      >
                        {isClearing
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </Button>
                    )}
                  </div>

                  {/* Linha 3: inputs de resultado — sempre linha própria */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={r?.home ?? (game.homeScore !== null ? String(game.homeScore) : "")}
                      onChange={(e) => handleInputChange(game.id, "home", e.target.value)}
                      aria-label={`Gols de ${game.homeTeam}`}
                      className="h-8 w-14 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    <span className="text-muted-foreground font-bold">×</span>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={r?.away ?? (game.awayScore !== null ? String(game.awayScore) : "")}
                      onChange={(e) => handleInputChange(game.id, "away", e.target.value)}
                      aria-label={`Gols de ${game.awayTeam}`}
                      className="h-8 w-14 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSaveResult(game)}
                      disabled={isSaving || (!r?.home && !r?.away)}
                    >
                      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar resultado"}
                    </Button>
                  </div>
                </div>

                {/* Painel de edição avançada */}
                {isExpanded && (
                  <div className="border-t bg-muted/30 px-3 py-3 space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Forçar status
                      </label>
                      <div className="flex gap-1 flex-wrap">
                        {ALL_STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setEditStatus((prev) => ({ ...prev, [game.id]: s }))}
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                              (editStatus[game.id] ?? game.status) === s
                                ? s === "live"
                                  ? "bg-red-600 text-white border-red-600"
                                  : s === "locked"
                                  ? "bg-status-locked text-white border-status-locked"
                                  : s === "finished"
                                  ? "bg-status-finished text-white border-status-finished"
                                  : "bg-status-open text-white border-status-open"
                                : "bg-background text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Data e hora (BRT)
                      </label>
                      <input
                        type="datetime-local"
                        value={editDate[game.id] ?? toDatetimeLocal(game.date)}
                        onChange={(e) =>
                          setEditDate((prev) => ({ ...prev, [game.id]: e.target.value }))
                        }
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-9 text-xs"
                        onClick={() => setExpandedId(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-9 text-xs"
                        onClick={() => handleUpdateGame(game)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Salvar alterações"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de apostadores pendentes */}
      <PendingDialog
        game={pendingGame}
        pendingUsers={pendingUsers}
        loading={false}
        open={pendingModalOpen}
        onClose={() => setPendingModalOpen(false)}
      />

      {/* Modal de todas as apostas do jogo */}
      <GameBetsDialog
        game={betsGame}
        open={betsModalOpen}
        onClose={() => setBetsModalOpen(false)}
      />
    </div>
  );
}
