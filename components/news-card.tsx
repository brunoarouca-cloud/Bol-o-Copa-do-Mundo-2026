"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, Copy, Check } from "lucide-react";
import type { NewsArticle } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NewsCardProps {
  article: NewsArticle;
  defaultExpanded?: boolean;
}

/** Renderiza *negrito* do WhatsApp como <strong> e preserva quebras de linha */
function WhatsAppText({ text }: { text: string }) {
  const segments: React.ReactNode[] = [];
  const regex = /\*([^*]+)\*/g;
  let last = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Texto antes do bold
    if (match.index > last) {
      const before = text.slice(last, match.index);
      before.split("\n").forEach((line, i, arr) => {
        segments.push(<span key={key++}>{line}</span>);
        if (i < arr.length - 1) segments.push(<br key={key++} />);
      });
    }
    segments.push(<strong key={key++}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }

  // Texto restante
  if (last < text.length) {
    text.slice(last).split("\n").forEach((line, i, arr) => {
      segments.push(<span key={key++}>{line}</span>);
      if (i < arr.length - 1) segments.push(<br key={key++} />);
    });
  }

  return <>{segments}</>;
}

export function NewsCard({ article, defaultExpanded = false }: NewsCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const dateDisplay = format(
    new Date(article.date + "T12:00:00"),
    "dd/MM/yyyy",
    { locale: ptBR }
  );

  async function handleCopy() {
    const highlights = article.highlights?.length
      ? `\n📌 ${article.highlights.join(" · ")}`
      : "";

    const text = [
      `⚽ *BOLÃO COPA DO MUNDO 2026*`,
      `📰 *${article.title}*`,
      `─────────────────────`,
      ``,
      article.content,
      highlights,
    ].join("\n").trim();

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success("Copiado! Cole no WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-sm">
      {/* ── Header clicável ─────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
        aria-expanded={expanded}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <ChevronDown
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-base leading-snug">
                  {article.title}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground pt-0.5">
                  {dateDisplay}
                </span>
              </div>
              {expanded && article.highlights?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {article.highlights.map((h, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                      {h}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </button>

      {/* ── Conteúdo expansível ─────────────────────────────────────── */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-0 pb-4 pl-11">
            <p className="text-sm leading-relaxed text-foreground/90">
              <WhatsAppText text={article.content} />
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 gap-2 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-700"
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            >
              {copied
                ? <><Check className="h-3.5 w-3.5" /> Copiado!</>
                : <><Copy className="h-3.5 w-3.5" /> Copiar para WhatsApp</>
              }
            </Button>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
