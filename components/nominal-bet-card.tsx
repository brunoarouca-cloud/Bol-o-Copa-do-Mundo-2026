"use client";

import { useState, useEffect } from "react";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TEAM_NAMES } from "@/data/teams-2026";
import type { NominalBet, NominalCategory } from "@/types";

interface NominalBetCardProps {
  category: NominalCategory;
  title: string;
  icon: string;
  description: string;
  userId: string;
  bet?: NominalBet;
  isLocked: boolean;
  result?: string | null;
}

export function NominalBetCard({
  category,
  title,
  icon,
  description,
  userId,
  bet,
  isLocked,
  result,
}: NominalBetCardProps) {
  const [value, setValue] = useState<string>(bet?.prediction ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bet?.prediction) setValue(bet.prediction);
  }, [bet?.prediction]);

  const isCorrect = result && bet?.prediction && bet.prediction === result;
  const isWrong = result && bet?.prediction && bet.prediction !== result;

  async function handleChange(newValue: string) {
    if (isLocked) return;
    setValue(newValue);
    setSaving(true);

    try {
      const betId = `${userId}_${category}`;
      const betRef = doc(db, "nominalBets", betId);
      const now = Timestamp.now();

      await setDoc(
        betRef,
        {
          id: betId,
          userId,
          category,
          prediction: newValue,
          points: bet?.points ?? null,
          createdAt: bet?.createdAt ?? now,
          updatedAt: now,
        },
        { merge: true }
      );

      toast.success("Aposta salva!");
    } catch (err) {
      console.error("Erro ao salvar aposta nominal:", err);
      toast.error("Erro ao salvar. Tente novamente.");
      setValue(bet?.prediction ?? "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      className={cn(
        "transition-all",
        isCorrect && "border-hit-exact bg-hit-exact/10",
        isWrong && "border-hit-miss bg-hit-miss/10"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="text-2xl">{icon}</span>
            {title}
          </CardTitle>
          {bet?.points !== null && bet?.points !== undefined && (
            <Badge variant={bet.points > 0 ? "default" : "destructive"}>
              +{bet.points}pts
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {isLocked ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {bet?.prediction ?? "Sem aposta"}
              </span>
              <Badge variant="locked">Travado</Badge>
            </div>
            {result && (
              <p className="text-xs text-muted-foreground">
                Resultado: <span className="font-medium">{result}</span>
              </p>
            )}
          </div>
        ) : (
          <Select
            value={value}
            onValueChange={handleChange}
            disabled={saving}
          >
            <SelectTrigger aria-label={`Selecionar ${title}`}>
              <SelectValue placeholder="Selecione uma seleção..." />
            </SelectTrigger>
            <SelectContent>
              {TEAM_NAMES.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}
