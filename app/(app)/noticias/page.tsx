"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { NewsCard } from "@/components/news-card";
import { Loader2, Newspaper } from "lucide-react";
import type { NewsArticle } from "@/types";

export default function NoticiasPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "news"),
      orderBy("date", "desc"),
      limit(10)
    );

    const unsub = onSnapshot(q, (snap) => {
      setArticles(
        snap.docs.map((d) => ({ ...d.data(), id: d.id } as NewsArticle))
      );
      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notícias</h1>
        <p className="text-muted-foreground text-sm">
          Resumo diário gerado automaticamente sobre os jogos e o bolão
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Newspaper className="h-12 w-12 opacity-30" />
          <p>Nenhuma notícia disponível ainda.</p>
          <p className="text-xs">As notícias são geradas automaticamente todo dia às 08:00 BRT.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article, i) => (
            <NewsCard key={article.id} article={article} defaultExpanded={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
