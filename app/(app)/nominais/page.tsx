"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { nominalBetConverter } from "@/lib/firebase/converters";
import { NominalBetCard } from "@/components/nominal-bet-card";
import { useAuth } from "@/hooks/use-auth";
import { useCountdown } from "@/hooks/use-countdown";
import { Loader2, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import type { NominalBet, NominalResults, ScoringSettings, NominalCategory } from "@/types";
import { NOMINAL_DEADLINE_UTC } from "@/lib/time";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

const BRT_TZ = "America/Sao_Paulo";

const NOMINAL_CATEGORIES: {
  category: NominalCategory;
  title: string;
  icon: string;
  description: string;
}[] = [
  {
    category: "champion",
    title: "Campeão",
    icon: "🏆",
    description: "Qual seleção vai ganhar a Copa do Mundo 2026?",
  },
  {
    category: "runnerUp",
    title: "Vice-campeão",
    icon: "🥈",
    description: "Qual seleção vai perder a final?",
  },
  {
    category: "thirdPlace",
    title: "Terceiro lugar",
    icon: "🥉",
    description: "Qual seleção vai vencer a disputa de terceiro lugar?",
  },
  {
    category: "topScorer",
    title: "Artilheiro",
    icon: "⚽",
    description: "Quem vai marcar mais gols na Copa?",
  },
];

export default function NominaisPage() {
  const { user } = useAuth();
  const [bets, setBets] = useState<NominalBet[]>([]);
  const [results, setResults] = useState<NominalResults | null>(null);
  const [settings, setSettings] = useState<ScoringSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearingBets, setClearingBets] = useState(false);

  // Deadline das apostas nominais
  const deadline = settings?.nominalDeadline ?? Timestamp.fromDate(NOMINAL_DEADLINE_UTC);
  const countdown = useCountdown(deadline);
  const isLocked = countdown.isExpired;

  // Formata a data do deadline em BRT para exibição
  const deadlineDisplay = format(
    toZonedTime(deadline.toDate(), BRT_TZ),
    "dd/MM/yyyy 'às' HH:mm",
    { locale: ptBR }
  );

  // Carrega apostas nominais do usuário
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "nominalBets").withConverter(nominalBetConverter),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setBets(snap.docs.map((d) => d.data()));
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Carrega resultados nominais
  useEffect(() => {
    const resultsRef = doc(db, "nominalResults", "global");
    getDoc(resultsRef).then((snap) => {
      if (snap.exists()) setResults(snap.data() as NominalResults);
    });
  }, []);

  // Carrega configurações
  useEffect(() => {
    const settingsRef = doc(db, "settings", "scoring");
    getDoc(settingsRef).then((snap) => {
      if (snap.exists()) setSettings(snap.data() as ScoringSettings);
    });
  }, []);

  async function handleClearBets() {
    if (!user?.uid || bets.length === 0) return;
    const confirmed = window.confirm(
      `Isso vai apagar todas as suas ${bets.length} aposta(s) nominal(is).\n\nEsta ação não pode ser desfeita. Deseja continuar?`
    );
    if (!confirmed) return;

    setClearingBets(true);
    try {
      const q = query(
        collection(db, "nominalBets"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      toast.success("Apostas nominais removidas.");
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setClearingBets(false);
    }
  }

  function getBetForCategory(category: NominalCategory): NominalBet | undefined {
    return bets.find((b) => b.category === category);
  }

  function getResultForCategory(category: NominalCategory): string | null | undefined {
    if (!results) return undefined;
    return results[category];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Apostas Nominais</h1>
          <p className="text-muted-foreground text-sm">
            Cada aposta nominal correta vale {settings?.nominalBet ?? 50} pontos.
          </p>
        </div>
        {!isLocked && bets.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearBets}
            disabled={clearingBets}
            className="flex items-center gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5 shrink-0"
            title="Apagar todas as apostas nominais"
          >
            {clearingBets ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        )}
      </div>

      {/* Countdown */}
      <div
        className={`flex items-center gap-3 rounded-lg p-4 ${
          isLocked
            ? "bg-destructive/10 text-destructive"
            : "bg-status-open/10 text-status-open"
        }`}
        role="status"
        aria-live="polite"
      >
        <Info className="h-5 w-5 shrink-0" />
        {isLocked ? (
          <div>
            <p className="font-semibold">Apostas nominais encerradas</p>
            <p className="text-sm opacity-80">
              O prazo de {deadlineDisplay} (BRT) expirou.
            </p>
          </div>
        ) : (
          <div>
            <p className="font-semibold">Prazo para apostas nominais</p>
            <p className="text-sm opacity-80">
              Fecha em: <span className="font-bold">{countdown.formatted}</span>
              {" "}({deadlineDisplay} BRT)
            </p>
          </div>
        )}
      </div>

      {/* Grid de apostas nominais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {NOMINAL_CATEGORIES.map(({ category, title, icon, description }) => (
          <NominalBetCard
            key={category}
            category={category}
            title={title}
            icon={icon}
            description={description}
            userId={user?.uid ?? ""}
            bet={getBetForCategory(category)}
            isLocked={isLocked}
            result={getResultForCategory(category)}
          />
        ))}
      </div>

      {!isLocked && (
        <p className="text-center text-xs text-muted-foreground">
          Suas apostas são salvas automaticamente ao selecionar uma seleção.
        </p>
      )}
    </div>
  );
}
