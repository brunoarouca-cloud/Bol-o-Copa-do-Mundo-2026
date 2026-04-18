"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { TEAM_NAMES } from "@/data/teams-2026";
import type { NominalResults, NominalCategory } from "@/types";

const CATEGORIES: { key: NominalCategory; label: string; icon: string }[] = [
  { key: "champion", label: "Campeão", icon: "🏆" },
  { key: "runnerUp", label: "Vice-campeão", icon: "🥈" },
  { key: "thirdPlace", label: "Terceiro lugar", icon: "🥉" },
  { key: "topScorer", label: "Artilheiro", icon: "⚽" },
];

export default function AdminNominaisPage() {
  const [results, setResults] = useState<Partial<NominalResults>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ref = doc(db, "nominalResults", "global");
    getDoc(ref).then((snap) => {
      if (snap.exists()) setResults(snap.data() as NominalResults);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const ref = doc(db, "nominalResults", "global");
      await setDoc(
        ref,
        {
          ...results,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      // Dispara recálculo de apostas nominais
      const token = await auth.currentUser?.getIdToken();
      await fetch("/api/recalculate-nominals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_APP_URL ?? ""}`,
          "X-User-Token": token ?? "",
        },
      });

      toast.success("Resultados nominais salvos e pontuação recalculada!");
    } catch (err) {
      toast.error("Erro ao salvar resultados nominais.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold">Resultados Nominais</h1>
        <p className="text-sm text-muted-foreground">
          Defina os resultados após o fim da Copa. Salvar recalcula os pontos automaticamente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {CATEGORIES.map(({ key, label, icon }) => (
            <div key={key} className="space-y-1">
              <Label>
                {icon} {label}
              </Label>
              <Select
                value={results[key] ?? ""}
                onValueChange={(v) => setResults((prev) => ({ ...prev, [key]: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Selecionar ${label.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_NAMES.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar e recalcular
      </Button>
    </div>
  );
}
