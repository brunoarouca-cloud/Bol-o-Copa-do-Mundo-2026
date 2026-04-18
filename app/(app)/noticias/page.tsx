import { getAdminFirestore } from "@/lib/firebase/admin";
import { NewsCard } from "@/components/news-card";
import { Newspaper } from "lucide-react";
import type { NewsArticle } from "@/types";
import { Timestamp } from "firebase-admin/firestore";

export const revalidate = 600; // ISR: revalida a cada 10 minutos

async function getNews(): Promise<NewsArticle[]> {
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection("news")
      .orderBy("date", "desc")
      .limit(10)
      .get();

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        generatedAt: data.generatedAt as Timestamp,
      } as unknown as NewsArticle;
    });
  } catch {
    return [];
  }
}

export default async function NoticiasPage() {
  const articles = await getNews();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notícias</h1>
        <p className="text-muted-foreground text-sm">
          Resumo diário gerado automaticamente sobre os jogos e o bolão
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Newspaper className="h-12 w-12 opacity-30" />
          <p>Nenhuma notícia disponível ainda.</p>
          <p className="text-xs">As notícias são geradas automaticamente todo dia às 23:00 BRT.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
