"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { nominalBetConverter } from "@/lib/firebase/converters";
import { NominalBetCard } from "@/components/nominal-bet-card";
import { useAuth } from "@/hooks/use-auth";
import { useCountdown } from "@/hooks/use-countdown";
import { Loader2, Info } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import type { NominalBet, NominalResults, ScoringSettings, NominalCategory } from "@/types";
import { NOMINAL_DEADLINE_UTC } from "@/lib/time";

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

  // Deadline das apostas nominais
  const deadline = settings?.nominalDeadline ?? Timestamp.fromDate(NOMINAL_DEADLINE_UTC);
  const countdown = useCountdown(deadline);
  const isLocked = countdown.isExpired;

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
      <div>
        <h1 className="text-2xl font-bold">Apostas Nominais</h1>
        <p className="text-muted-foreground text-sm">
          Cada aposta nominal correta vale {settings?.nominalBet ?? 50} pontos.
        </p>
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
              O prazo de 12/06/2026 às 23:59 (BRT) expirou.
            </p>
          </div>
        ) : (
          <div>
            <p className="font-semibold">Prazo para apostas nominais</p>
            <p className="text-sm opacity-80">
              Fecha em: <span className="font-bold">{countdown.formatted}</span>
              {" "}(12/06/2026 às 23:59 BRT)
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
