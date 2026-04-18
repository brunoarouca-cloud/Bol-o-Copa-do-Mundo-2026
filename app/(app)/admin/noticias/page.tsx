"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, RefreshCw, Newspaper } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminNoticiasPage() {
  const [generating, setGenerating] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayDisplay = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

  async function handleGenerate(force = false) {
    setGenerating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const url = `/api/generate-news${force ? "?force=1" : ""}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erro desconhecido");
      }

      if (data.message?.includes("já gerada")) {
        toast.info("Notícia já existe para hoje. Use 'Forçar geração' para recriar.");
      } else {
        toast.success(`Notícia gerada: "${data.title}"`);
      }
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold">Notícias Diárias</h1>
        <p className="text-sm text-muted-foreground">
          Geração automática às 23:00 BRT (02:00 UTC) via cron.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Newspaper className="h-5 w-5 text-primary" />
            Notícia de hoje — {todayDisplay}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            A notícia é gerada automaticamente com base nos jogos do dia e no ranking do bolão.
            {!process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.startsWith("AIza") ? "" : " Configure OPENAI_API_KEY para notícias geradas por IA."}
          </p>

          <div className="flex gap-3">
            <Button onClick={() => handleGenerate(false)} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Newspaper className="mr-2 h-4 w-4" />
              )}
              Gerar notícia de hoje
            </Button>
            <Button
              variant="outline"
              onClick={() => handleGenerate(true)}
              disabled={generating}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Forçar regeneração
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
