import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NewsArticle } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NewsCardProps {
  article: NewsArticle;
}

export function NewsCard({ article }: NewsCardProps) {
  const dateDisplay = format(
    new Date(article.date + "T12:00:00"),
    "dd 'de' MMMM 'de' yyyy",
    { locale: ptBR }
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{article.title}</CardTitle>
          <span className="shrink-0 text-xs text-muted-foreground">{dateDisplay}</span>
        </div>
        {article.highlights?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {article.highlights.map((h, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
                {h}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
