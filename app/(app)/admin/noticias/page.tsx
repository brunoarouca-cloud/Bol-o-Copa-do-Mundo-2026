"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { newsConverter } from "@/lib/firebase/converters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, RefreshCw, Newspaper, Trash2, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { NewsArticle } from "@/types";

export default function AdminNoticiasPage() {
  const [generating, setGenerating] = useState(false);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayDisplay = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

  // Carrega notícias em tempo real
  useEffect(() => {
    const q = query(
      collection(db, "news").withConverter(newsConverter),
      orderBy("date", "desc")
    );
    return onSnapshot(q, (snap) => {
      setArticles(snap.docs.map((d) => d.data()));
      setLoadingArticles(false);
    });
  }, []);

  async function handleGenerate(force = false) {
    setGenerating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const url = `/api/generate-news${force ? "?force=1" : ""}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Erro desconhecido");
      if (data.message?.includes("já gerada")) {
        toast.info("Notícia já existe para hoje. Use 'Forçar regeneração' para recriar.");
      } else {
        toast.success(`Notícia gerada: "${data.title}"`);
      }
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }

  async function shareOnWhatsApp(article: NewsArticle) {
    const dateDisplay = format(
      new Date(article.date + "T12:00:00"),
      "dd/MM/yyyy",
      { locale: ptBR }
    );

    // Converte markdown para texto WhatsApp
    const toWhatsApp = (md: string) =>
      md
        .replace(/^#{1,3}\s+(.+)$/gm, "*$1*")
        .replace(/\*\*(.+?)\*\*/g, "*$1*")
        .replace(/\*(?!\*)(.+?)(?<!\*)\*/g, "_$1_")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^\s*[-*]\s+/gm, "• ")
        .trim();

    const highlights = article.highlights?.length
      ? "\n\n📌 *Destaques:*\n" + article.highlights.map((h) => `• ${h}`).join("\n")
      : "";

    const divider = "─────────────────────";

    const text = [
      "⚽ *BOLÃO COPA DO MUNDO 2026*",
      `📰 *Notícias do Dia* — ${dateDisplay}`,
      divider,
      "",
      `🏆 *${article.title}*`,
      "",
      toWhatsApp(article.content),
      highlights,
      "",
      divider,
      "🎯 Acesse o bolão e faça suas apostas!",
    ]
      .join("\n")
      .trim();

    // Web Share API (nativa do celular — sem encoding de URL)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // usuário cancelou ou erro — cai no fallback
      }
    }

    // Fallback: copia para a área de transferência
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado! Cole no WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar. Tente em um dispositivo móvel.");
    }
  }

  async function handleDelete(article: NewsArticle) {
    const confirmed = window.confirm(
      `Excluir a notícia "${article.title}"?\n\nEsta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setDeletingId(article.id);
    try {
      await deleteDoc(doc(db, "news", article.id));
      toast.success("Notícia excluída.");
    } catch (err) {
      toast.error("Erro ao excluir notícia.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Notícias Diárias</h1>
        <p className="text-sm text-muted-foreground">
          Geração automática às 08:00 BRT (11:00 UTC) via cron.
        </p>
      </div>

      {/* Gerar notícia */}
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
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => handleGenerate(false)} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Newspaper className="mr-2 h-4 w-4" />
              )}
              Gerar notícia de hoje
            </Button>
            <Button variant="outline" onClick={() => handleGenerate(true)} disabled={generating}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Forçar regeneração
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de notícias */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Notícias publicadas{" "}
            {!loadingArticles && (
              <span className="text-sm font-normal text-muted-foreground">
                ({articles.length})
              </span>
            )}
          </h2>
        </div>

        {loadingArticles ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma notícia publicada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {articles.map((article) => {
              const isToday = article.date === today;
              return (
                <div
                  key={article.id}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground">
                        {format(new Date(article.date + "T12:00:00"), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                      {isToday && (
                        <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 font-medium">
                          Hoje
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold mt-0.5 leading-tight line-clamp-2">
                      {article.title}
                    </p>
                    {article.highlights?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {article.highlights.join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => shareOnWhatsApp(article)}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                      title="Compartilhar no WhatsApp"
                      aria-label={`Compartilhar "${article.title}" no WhatsApp`}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(article)}
                      disabled={deletingId === article.id}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Excluir "${article.title}"`}
                    >
                      {deletingId === article.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
