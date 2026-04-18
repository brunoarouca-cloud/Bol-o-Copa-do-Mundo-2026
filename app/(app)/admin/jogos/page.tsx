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
import { Loader2, CheckCircle2 } from "lucide-react";
import type { Game } from "@/types";

const STATUS_LABELS = { upcoming: "Aberto", locked: "Travado", finished: "Encerrado" };
const STATUS_VARIANTS: Record<string, "open" | "locked" | "finished"> = {
  upcoming: "open",
  locked: "locked",
  finished: "finished",
};

export default function AdminJogosPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
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

                {/* Resultado atual */}
                {game.homeScore !== null && (
                  <div className="flex items-center gap-1 text-sm font-bold">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {game.homeScore} × {game.awayScore}
                  </div>
                )}

                {/* Inputs de resultado */}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={r?.home ?? (game.homeScore !== null ? String(game.homeScore) : "")}
                    onChange={(e) => handleInputChange(game.id, "home", e.target.value)}
                    aria-label={`Gols de ${game.homeTeam}`}
                    className="h-8 w-14 text-center text-sm"
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
                    className="h-8 w-14 text-center text-sm"
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
