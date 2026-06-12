"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { ScoringSettings } from "@/types";
import { NOMINAL_DEADLINE_UTC } from "@/lib/time";

const FIELDS = [
  { key: "exactScore", label: "Placar exato", description: "Acertou o placar completo" },
  { key: "correctWinnerOneScore", label: "Vencedor + 1 gol", description: "Acertou vencedor e um dos gols" },
  { key: "correctWinner", label: "Vencedor", description: "Acertou apenas o vencedor" },
  { key: "oneTeamScore", label: "1 gol certo", description: "Acertou apenas um dos gols" },
  { key: "correctDraw", label: "Empate certo", description: "Acertou o empate (não o placar)" },
  { key: "nominalBet", label: "Aposta nominal", description: "Cada aposta nominal correta" },
  { key: "lockMinutesBefore", label: "Minutos para travar", description: "Quantos min antes do apito trava a aposta" },
] as const;

type Field = (typeof FIELDS)[number]["key"];

const BRT = "America/Sao_Paulo";

function toBRTLocal(ts: Timestamp | undefined): string {
  if (!ts) return "";
  const { toZonedTime, format: ftz } = require("date-fns-tz");
  return ftz(toZonedTime(ts.toDate(), BRT), "yyyy-MM-dd'T'HH:mm");
}

export default function AdminRegrasPage() {
  const [settings, setSettings] = useState<Partial<ScoringSettings>>({});
  const [formValues, setFormValues] = useState<Record<string, number>>({});
  const [deadlineLocal, setDeadlineLocal] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    const settingsRef = doc(db, "settings", "scoring");
    getDoc(settingsRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as ScoringSettings;
        setSettings(data);
        const vals: Record<string, number> = {};
        FIELDS.forEach(({ key }) => {
          vals[key] = (data as unknown as Record<string, number>)[key] ?? 0;
        });
        setFormValues(vals);
        setDeadlineLocal(toBRTLocal(data.nominalDeadline));
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const settingsRef = doc(db, "settings", "scoring");
      await setDoc(
        settingsRef,
        {
          ...formValues,
          nominalDeadline:
            settings.nominalDeadline ??
            Timestamp.fromDate(NOMINAL_DEADLINE_UTC),
        },
        { merge: true }
      );
      toast.success("Regras salvas com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar regras.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDeadline() {
    if (!deadlineLocal) { toast.error("Preencha a data e hora."); return; }
    setSavingDeadline(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const { fromZonedTime } = await import("date-fns-tz");
      const utcDate = fromZonedTime(new Date(deadlineLocal), BRT);
      const res = await fetch("/api/admin/set-deadline", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deadlineISO: utcDate.toISOString() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Prazo das nominais atualizado!");
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setSavingDeadline(false);
    }
  }

  async function handleRecalculateAll() {
    if (
      !confirm(
        "Isso vai recalcular os pontos de TODOS os jogos encerrados. Pode demorar. Continuar?"
      )
    )
      return;

    setRecalculating(true);
    try {
      const token = await auth.currentUser?.getIdToken();

      // Busca todos os jogos finalizados
      const gamesResp = await fetch("/api/admin/finished-games", {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Recálculo global iniciado! Acompanhe no console.");
    } catch (err) {
      toast.error("Erro ao iniciar recálculo.");
    } finally {
      setRecalculating(false);
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
        <h1 className="text-xl font-bold">Regras de Pontuação</h1>
        <p className="text-sm text-muted-foreground">
          Ajuste os pontos por tipo de acerto. Salvar não recalcula automaticamente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pontuação por acerto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map(({ key, label, description }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key}>{label}</Label>
              <p className="text-xs text-muted-foreground">{description}</p>
              <Input
                id={key}
                type="number"
                min={0}
                max={200}
                value={formValues[key] ?? ""}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    [key]: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-24"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Prazo das apostas nominais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prazo das apostas nominais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="deadline">Data e hora limite (BRT)</Label>
            <p className="text-xs text-muted-foreground">
              Após esse prazo nenhum participante poderá fazer ou alterar apostas nominais.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="deadline"
                type="datetime-local"
                value={deadlineLocal}
                onChange={(e) => setDeadlineLocal(e.target.value)}
                className="h-9 w-full sm:w-auto rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" onClick={handleSaveDeadline} disabled={savingDeadline} className="w-full sm:w-auto">
                {savingDeadline ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar prazo"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar regras
        </Button>
        <Button
          variant="outline"
          onClick={handleRecalculateAll}
          disabled={recalculating}
        >
          {recalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Recalcular tudo
        </Button>
      </div>
    </div>
  );
}
