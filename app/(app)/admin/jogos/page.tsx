"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { gameConverter } from "@/lib/firebase/converters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/firebase/client";
import { toast } from "sonner";
import { formatGameDate } from "@/lib/time";
import { Loader2, CheckCircle2, Trash2, Radio } from "lucide-react";
import type { Game } from "@/types";

const STATUS_LABELS = { upcoming: "Aberto", locked: "Travado", live: "Ao vivo", finished: "Encerrado" };
const STATUS_VARIANTS: Record<string, "open" | "locked" | "live" | "finished"> = {
  upcoming: "open",
  locked: "locked",
  live: "live",
  finished: "finished",
};

export default function AdminJogosPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [togglingLiveId, setTogglingLiveId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { home: string; away: string }>>({});
  const [search, setSearch] = useState("");

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
          ? `Marcar "${game.homeTeam} × ${game.awayTeam}" como ao vivo? O placar será buscado automaticamente.`
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  const filteredGames = games.filter(
    (g) =>
      g.homeTeam.toLowerCase().includes(search.toLowerCase()) ||
      g.awayTeam.toLowerCase().includes(search.toLowerCase()) ||
      g.phase.toLowerCase().includes(search.toLowerCase()) ||
      (g.group && g.group.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Jogos & Resultados</h1>
        <p className="text-sm text-muted-foreground">
          Insira resultados de jogos encerrados. O recálculo é automático.
        </p>
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
            const isLive = game.status === "live";

            return (
              <div
                key={game.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
              >
                {/* Info do jogo */}
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
                    {formatGameDate(game.date)} · {game.venue}
                  </div>
                </div>

                {/* Resultado atual + controles ao vivo */}
                <div className="flex items-center gap-2">
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

                  {/* Botão ao vivo: aparece em jogos travados ou ao vivo */}
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

                  {/* Botão limpar resultado */}
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

                {/* Inputs de resultado */}
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
                    onClick={() => handleSaveResult(game)}
                    disabled={isSaving || (!r?.home && !r?.away)}
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
