"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { gameConverter } from "@/lib/firebase/converters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, FlaskConical, ShieldAlert } from "lucide-react";
import { formatGameDate } from "@/lib/time";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import type { Game } from "@/types";

const BRT_TZ = "America/Sao_Paulo";

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Aberto",
  locked:   "Travado",
  live:     "Ao vivo",
  finished: "Encerrado",
};

const STATUS_VARIANTS: Record<string, "open" | "locked" | "live" | "finished"> = {
  upcoming: "open",
  locked:   "locked",
  live:     "live",
  finished: "finished",
};

// Hora local BRT formatada para datetime-local input
function nowBRTLocal(): string {
  return format(toZonedTime(new Date(), BRT_TZ), "yyyy-MM-dd'T'HH:mm");
}

export default function AdminConfigPage() {
  const [homeTeam, setHomeTeam]     = useState("Brasil");
  const [awayTeam, setAwayTeam]     = useState("Egito");
  const [dateLocal, setDateLocal]   = useState(nowBRTLocal);
  const [venue, setVenue]           = useState("");
  const [creating, setCreating]     = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const [testGames, setTestGames]   = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [cleaningOrphans, setCleaningOrphans] = useState(false);

  // Escuta jogos de teste em tempo real
  useEffect(() => {
    const q = query(
      collection(db, "games").withConverter(gameConverter),
      where("phase", "==", "Amistoso")
    );
    return onSnapshot(q, (snap) => {
      setTestGames(snap.docs.map((d) => d.data()).sort((a, b) => a.matchNumber - b.matchNumber));
      setLoadingGames(false);
    });
  }, []);

  async function handleCreate() {
    if (!homeTeam.trim() || !awayTeam.trim() || !dateLocal) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setCreating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/create-test-game", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          homeTeam: homeTeam.trim(),
          awayTeam: awayTeam.trim(),
          dateLocalBRT: dateLocal,
          venue: venue.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      toast.success(`Jogo de teste criado! ID: ${data.gameId}`);
      setHomeTeam("");
      setAwayTeam("");
      setDateLocal(nowBRTLocal());
      setVenue("");
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteAll() {
    if (!confirm("Remover TODOS os jogos de teste (Amistoso)?\n\nAs apostas feitas nesses jogos também serão perdidas.")) return;
    setDeleting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/create-test-game", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.deleted} jogo(s) de teste removido(s).`);
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteOne(game: Game) {
    try {
      await deleteDoc(doc(db, "games", game.id));
      toast.success(`${game.homeTeam} × ${game.awayTeam} removido.`);
    } catch {
      toast.error("Erro ao remover jogo.");
    }
  }

  async function handleCleanupOrphanBets() {
    if (!confirm(
      "Remover todas as apostas de usuários excluídos?\n\n" +
      "Esta ação é irreversível mas segura — só apaga apostas de contas que não existem mais no sistema."
    )) return;

    setCleaningOrphans(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/cleanup-orphan-bets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      toast.success(
        `Limpeza concluída: ${data.deletedBets} aposta(s) de jogo e ${data.deletedNominalBets} aposta(s) nominal(is) removidas.`
      );
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setCleaningOrphans(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Ferramentas de teste e configuração do bolão.
        </p>
      </div>

      {/* ── Criar jogo de teste ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-5 w-5 text-primary" />
            Criar jogo de teste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cria um jogo funcional com fase <strong>Amistoso</strong> para testar apostas,
            travamento automático, placares ao vivo e pontuação — sem interferir nos jogos reais da Copa.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="home">Time da casa *</Label>
              <Input
                id="home"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder="Ex: Brasil"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="away">Time visitante *</Label>
              <Input
                id="away"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder="Ex: Egito"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Data e hora (BRT) *</Label>
              <input
                id="date"
                type="datetime-local"
                value={dateLocal}
                onChange={(e) => setDateLocal(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="venue">Estádio (opcional)</Label>
              <Input
                id="venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Ex: Maracanã"
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 border px-3 py-2.5 text-xs text-muted-foreground space-y-1">
            <p>✅ O jogo vai aparecer na aba <strong>Apostas</strong> para todos apostarem</p>
            <p>✅ Será travado automaticamente {5} minutos antes do horário definido</p>
            <p>✅ O check-lock vai marcar como "Ao vivo" no horário definido</p>
            <p>✅ O live-scores vai buscar o placar real na football-data.org (se o time existir)</p>
            <p>✅ Você pode inserir o placar manualmente em <strong>Admin → Jogos</strong></p>
          </div>

          <Button onClick={handleCreate} disabled={creating} className="w-full gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar jogo de teste
          </Button>
        </CardContent>
      </Card>

      {/* ── Jogos de teste existentes ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Jogos de teste
              {!loadingGames && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({testGames.length})
                </span>
              )}
            </CardTitle>
            {testGames.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDeleteAll}
                disabled={deleting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Remover todos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingGames ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : testGames.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nenhum jogo de teste criado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {testGames.map((game) => (
                <div key={game.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {game.homeTeam} × {game.awayTeam}
                      </span>
                      <Badge variant={STATUS_VARIANTS[game.status]}>
                        {STATUS_LABELS[game.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{game.id}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatGameDate(game.date)} (BRT)
                      {game.homeScore !== null && (
                        <span className="ml-2 font-semibold text-foreground">
                          {game.homeScore} × {game.awayScore}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteOne(game)}
                    className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                    title="Remover jogo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Manutenção ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Manutenção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Limpar apostas de usuários excluídos</p>
            <p className="text-xs text-muted-foreground">
              Remove apostas cujo usuário não existe mais no sistema. Use após excluir participantes
              pelo painel de Usuários para garantir que as apostas órfãs desapareçam dos resumos de jogo.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleCleanupOrphanBets}
            disabled={cleaningOrphans}
            className="w-full gap-2 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            {cleaningOrphans
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Trash2 className="h-4 w-4" />
            }
            {cleaningOrphans ? "Limpando..." : "Limpar apostas órfãs"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
