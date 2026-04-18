import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const BRT_TZ = "America/Sao_Paulo";

/**
 * GET /api/generate-news
 * Gera notícia diária com IA (OpenAI gpt-4o-mini).
 * Chamado via cron às 02:00 UTC (23:00 BRT).
 *
 * Se OPENAI_API_KEY não estiver configurado, cria um placeholder.
 * ?force=1 força regeneração mesmo se já existir notícia do dia.
 */
export async function GET(request: NextRequest) {
  // Verifica autorização
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isForced = request.nextUrl.searchParams.get("force") === "1";

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isForced) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();
    const today = format(toZonedTime(new Date(), BRT_TZ), "yyyy-MM-dd");

    // Idempotência: não regera se já existe (a menos que force=1)
    if (!isForced) {
      const existing = await db.collection("news").doc(today).get();
      if (existing.exists) {
        return NextResponse.json({
          message: "Notícia já gerada para hoje",
          date: today,
        });
      }
    }

    // Coleta dados para o prompt
    const gamesSnap = await db
      .collection("games")
      .where("status", "==", "finished")
      .get();

    const todayGames = gamesSnap.docs
      .map((d) => d.data())
      .filter((g) => {
        if (!g.date) return false;
        const gameDate = format(
          toZonedTime(g.date.toDate(), BRT_TZ),
          "yyyy-MM-dd"
        );
        return gameDate === today;
      });

    // Top 5 do ranking
    const usersSnap = await db
      .collection("users")
      .orderBy("totalPoints", "desc")
      .limit(5)
      .get();

    const top5 = usersSnap.docs.map((d, i) => ({
      rank: i + 1,
      name: d.data().displayName,
      points: d.data().totalPoints,
    }));

    // Tenta gerar com OpenAI se disponível
    const openaiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    let title: string;
    let content: string;
    let highlights: string[];

    if (openaiKey && todayGames.length > 0) {
      const gamesText = todayGames
        .map((g) => `${g.homeTeam} ${g.homeScore} × ${g.awayScore} ${g.awayTeam}`)
        .join(", ");

      const top5Text = top5.map((u) => `${u.rank}º ${u.name} (${u.points}pts)`).join(", ");

      const prompt = `
Você é o narrador do Bolão Copa do Mundo 2026. Gere uma notícia esportiva diária em PT-BR sobre os jogos de hoje.

Jogos de hoje: ${gamesText}
Top 5 do bolão: ${top5Text}
Data: ${today}

Responda em JSON com:
- title: string (manchete curta e chamativa)
- content: string (2-3 parágrafos em markdown, mencionando resultados e curiosidades)
- highlights: string[] (3-5 destaques curtos)
`.trim();

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 1000,
        }),
      });

      const aiData = await response.json();
      const parsed = JSON.parse(aiData.choices[0].message.content);

      title = parsed.title;
      content = parsed.content;
      highlights = parsed.highlights;
    } else {
      // Fallback quando OpenAI não está configurado ou não há jogos
      title =
        todayGames.length > 0
          ? `Copa 2026: Resumo do dia ${today}`
          : `Copa 2026: Acompanhe o bolão!`;

      content =
        todayGames.length > 0
          ? `## Resultados do dia\n\n${todayGames
              .map((g) => `**${g.homeTeam}** ${g.homeScore} × ${g.awayScore} **${g.awayTeam}**`)
              .join("\n\n")}\n\n*Notícia gerada automaticamente. Configure OPENAI_API_KEY para notícias detalhadas.*`
          : `*Sem jogos hoje. Configure OPENAI_API_KEY para notícias detalhadas.*`;

      highlights =
        todayGames.length > 0
          ? todayGames.map(
              (g) => `${g.homeTeam} ${g.homeScore}×${g.awayScore} ${g.awayTeam}`
            )
          : ["Sem jogos hoje"];
    }

    // Persiste a notícia
    await db.collection("news").doc(today).set({
      id: today,
      date: today,
      title,
      content,
      highlights,
      generatedAt: Timestamp.now(),
    });

    return NextResponse.json({ message: "Notícia gerada com sucesso", date: today, title });
  } catch (error) {
    console.error("[generate-news] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
