import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { format, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const BRT_TZ = "America/Sao_Paulo";

/**
 * GET /api/generate-news
 * Gera notícia diária com IA (OpenAI gpt-4o-mini).
 * Chamado às 08:00 BRT (11:00 UTC) via cron.
 * Reporta os jogos do DIA ANTERIOR e o estado atual do bolão.
 * ?force=1 → regenera mesmo que já exista notícia do dia.
 * ?key=SECRET → alternativa ao header Authorization (para cron-job.org).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const isForced = request.nextUrl.searchParams.get("force") === "1";
  const bearerToken = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
  const queryKey = request.nextUrl.searchParams.get("key");

  let authorized = false;
  if (!cronSecret) {
    authorized = true;
  } else if (queryKey === cronSecret || bearerToken === cronSecret) {
    authorized = true;
  } else if (bearerToken) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(bearerToken);
      if (decoded.admin === true) authorized = true;
    } catch { /* token inválido */ }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();
    const nowBRT  = toZonedTime(new Date(), BRT_TZ);
    const today   = format(nowBRT, "yyyy-MM-dd");
    const yesterday = format(subDays(nowBRT, 1), "yyyy-MM-dd");

    // Idempotência
    if (!isForced) {
      const existing = await db.collection("news").doc(today).get();
      if (existing.exists) {
        return NextResponse.json({ message: "Notícia já gerada para hoje", date: today });
      }
    }

    // ── 1. Jogos encerrados ontem (BRT) ──────────────────────────────────────
    const finishedSnap = await db.collection("games").where("status", "==", "finished").get();
    const yesterdayGames = finishedSnap.docs
      .map((d) => d.data())
      .filter((g) => {
        if (!g.date) return false;
        return format(toZonedTime(g.date.toDate(), BRT_TZ), "yyyy-MM-dd") === yesterday;
      })
      .sort((a, b) => a.matchNumber - b.matchNumber);

    // ── 2. Todos os jogos encerrados até agora (para contexto geral) ──────────
    const allFinished = finishedSnap.docs
      .map((d) => d.data())
      .sort((a, b) => a.matchNumber - b.matchNumber);

    // ── 3. Jogos previstos para hoje ──────────────────────────────────────────
    const todayGamesSnap = await db.collection("games")
      .where("status", "in", ["upcoming", "locked"])
      .get();
    const todayScheduled = todayGamesSnap.docs
      .map((d) => d.data())
      .filter((g) => {
        if (!g.date) return false;
        return format(toZonedTime(g.date.toDate(), BRT_TZ), "yyyy-MM-dd") === today;
      })
      .sort((a, b) => a.date.toMillis() - b.date.toMillis());

    // ── 4. Ranking completo (top 10) ──────────────────────────────────────────
    const usersSnap = await db.collection("users")
      .orderBy("totalPoints", "desc")
      .limit(10)
      .get();
    const ranking = usersSnap.docs.map((d, i) => ({
      rank: i + 1,
      name: d.data().displayName,
      points: d.data().totalPoints ?? 0,
      exactHits: d.data().exactHits ?? 0,
    }));

    // ── 5. Estatísticas do bolão para os jogos de ontem ──────────────────────
    // Para cada jogo de ontem, conta quantas apostas acertaram o placar exato
    const yesterdayStats: Record<string, { exact: number; partial: number; total: number }> = {};
    if (yesterdayGames.length > 0) {
      const gameIds = yesterdayGames.map((g) => g.id);
      // Busca em lotes de 10 (limite do Firestore para "in")
      for (let i = 0; i < gameIds.length; i += 10) {
        const chunk = gameIds.slice(i, i + 10);
        const betsSnap = await db.collection("bets")
          .where("gameId", "in", chunk)
          .get();
        betsSnap.docs.forEach((d) => {
          const bet = d.data();
          if (!yesterdayStats[bet.gameId]) {
            yesterdayStats[bet.gameId] = { exact: 0, partial: 0, total: 0 };
          }
          yesterdayStats[bet.gameId].total++;
          if (bet.points >= 20) yesterdayStats[bet.gameId].exact++;
          else if (bet.points > 0) yesterdayStats[bet.gameId].partial++;
        });
      }
    }

    // ── 6. Monta contexto rico para a IA ─────────────────────────────────────
    const copaStart = new Date("2026-06-11T00:00:00-03:00");
    const copaEnd   = new Date("2026-07-19T23:59:59-03:00");
    const todayDate = new Date();
    const isPreTournament  = todayDate < copaStart;
    const isDuringTournament = todayDate >= copaStart && todayDate <= copaEnd;
    const isPostTournament = todayDate > copaEnd;

    const daysIntoCopa = isDuringTournament
      ? Math.floor((todayDate.getTime() - copaStart.getTime()) / 86400000)
      : 0;

    const COPA_CONTEXT = `
Copa do Mundo FIFA 2026:
- Período: 11 jun – 19 jul de 2026 | Sedes: EUA, Canadá, México
- 48 seleções, 12 grupos, 104 jogos | Final: MetLife Stadium, Nova York
- Grupos: A(México,ÁfricadoSul,CoreiadoSul,Rep.Tcheca) B(Canadá,Suíça,Catar,Bósnia) C(Brasil,Marrocos,Haiti,Escócia) D(EUA,Paraguai,Austrália,Turquia) E(Alemanha,Curaçao,CostadoMarfim,Equador) F(PaísesBaixos,Japão,Tunísia,Suécia) G(Bélgica,Egito,Irã,NovaZelândia) H(Espanha,CaboVerde,ArábiaSaudita,Uruguai) I(França,Senegal,Noruega,Iraque) J(Argentina,Argélia,Áustria,Jordânia) K(Portugal,Rep.Dem.doCongo,Uzbequistão,Colômbia) L(Inglaterra,Croácia,Gana,Panamá)
- Favoritos: Brasil, Argentina, França, Espanha, Inglaterra, Portugal, Alemanha
`.trim();

    const openaiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    let title: string;
    let content: string;
    let highlights: string[];

    if (openaiKey) {
      // Formata jogos de ontem com estatísticas do bolão
      const yesterdayGamesText = yesterdayGames.length > 0
        ? yesterdayGames.map((g) => {
            const stats = yesterdayStats[g.id];
            const statsText = stats
              ? ` [bolão: ${stats.total} palpites, ${stats.exact} placar exato, ${stats.partial} parcial]`
              : "";
            return `• ${g.phase}${g.group ? ` Grupo ${g.group}` : ""}: **${g.homeTeam} ${g.homeScore} × ${g.awayScore} ${g.awayTeam}**${statsText}`;
          }).join("\n")
        : "Nenhum jogo encerrado ontem";

      // Jogos de hoje
      const todayScheduledText = todayScheduled.length > 0
        ? todayScheduled.map((g) => {
            const hora = format(toZonedTime(g.date.toDate(), BRT_TZ), "HH:mm");
            return `• ${hora} BRT: ${g.homeTeam} × ${g.awayTeam} (${g.phase}${g.group ? ` Grupo ${g.group}` : ""})`;
          }).join("\n")
        : "Nenhum jogo hoje";

      // Ranking
      const rankingText = ranking.length > 0
        ? ranking.map((u) => `${u.rank}º ${u.name} — ${u.points}pts (${u.exactHits} exatos)`).join("\n")
        : "Bolão ainda sem pontuação";

      // Panorama geral da Copa
      const panoramaText = allFinished.length > 0
        ? `Total de jogos encerrados: ${allFinished.length} de 104. Dia ${daysIntoCopa} de Copa.`
        : "Copa ainda não iniciou.";

      // Fases especiais
      const contextoPeriodo = isPreTournament
        ? `PRÉ-COPA: O torneio começa em ${Math.ceil((copaStart.getTime() - todayDate.getTime()) / 86400000)} dia(s). Escreva uma notícia de aquecimento envolvente: pode abordar expectativas, análise de grupos, rivalidades históricas, curiosidades sobre as sedes (Estadio Azteca, MetLife Stadium, AT&T Stadium etc), estrelas a observar, zebras potenciais, ou prévia dos primeiros jogos.`
        : isDuringTournament
        ? `COPA EM ANDAMENTO (Dia ${daysIntoCopa}): Foque nos resultados de ONTEM com análise tática e narrativa envolvente, destaque surpresas/zebras/momentos épicos, analise o impacto no ranking de classificação dos grupos, e mostre como o bolão reagiu (quem acertou, quem errou, movimentação no ranking).`
        : `PÓS-COPA: Faça um balanço emocionante do torneio, destaque os maiores momentos, o campeão e como o bolão ficou no final.`;

      const prompt = `
Você é o narrador oficial do Bolão Copa do Mundo 2026 — um cronista esportivo apaixonado que escreve para um grupo de amigos brasileiros que estão competindo no bolão.

${COPA_CONTEXT}

Data de hoje: ${today} (${format(nowBRT, "EEEE", { locale: undefined })})
Ontem: ${yesterday}

${contextoPeriodo}

═══ JOGOS DE ONTEM ═══
${yesterdayGamesText}

═══ AGENDA DE HOJE ═══
${todayScheduledText}

═══ RANKING DO BOLÃO (Top 10) ═══
${rankingText}

═══ PANORAMA ═══
${panoramaText}

═══ DIRETRIZES ═══
FORMATO: O texto será compartilhado via WhatsApp. Escreva de forma CURTA, DIRETA e com emojis.
- Use *negrito* com asteriscos (formato WhatsApp, não markdown ##)
- Máximo 2 parágrafos curtos (4-6 linhas cada)
- Tom: amigo que manda mensagem no grupo, não jornalista formal
- Use emojis relevantes (⚽🏆🔥😱🎯✅❌) para deixar visual
- Durante a Copa: resultados de ontem + destaque do bolão + prévia de hoje
- Pré-Copa: curiosidade ou análise curta e animada sobre o torneio
- Mencione o líder do bolão pelo nome de forma natural
- NADA de subtítulos, listas, ou formatação complexa — só texto corrido com emojis

Responda APENAS em JSON válido com estas chaves:
{
  "title": "manchete curta e impactante, máximo 60 caracteres, pode ter emoji",
  "content": "2 parágrafos curtos em texto simples (sem ##, sem listas). Use *palavra* para negrito WhatsApp. Total: máximo 150 palavras.",
  "highlights": ["3 destaques curtíssimos, máximo 40 caracteres cada, com emoji"]
}
`.trim();

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "Você escreve resumos curtos de futebol para grupos de WhatsApp. Sempre em PT-BR, com emojis, máximo 150 palavras. Responda APENAS com JSON válido.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          max_tokens: 700,
          temperature: 0.9,
        }),
      });

      const aiData = await response.json();

      // Verifica erros da API OpenAI (key inválida, rate limit, etc.)
      if (!response.ok || !aiData.choices?.[0]?.message?.content) {
        const errMsg = aiData.error?.message ?? `HTTP ${response.status}`;
        throw new Error(`OpenAI API: ${errMsg}`);
      }

      const parsed = JSON.parse(aiData.choices[0].message.content);

      title = parsed.title;
      content = parsed.content;
      highlights = parsed.highlights;

    } else {
      // ── Fallback sem OpenAI ──────────────────────────────────────────────────
      if (isPreTournament) {
        const daysLeft = Math.ceil((copaStart.getTime() - todayDate.getTime()) / 86400000);
        title = `Copa 2026 começa em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}! 🏆`;
        content = `## Contagem Regressiva\n\nFaltam **${daysLeft} dia${daysLeft !== 1 ? "s" : ""}** para a Copa do Mundo FIFA 2026! O torneio inédito com **48 seleções** acontece nos EUA, Canadá e México de 11/jun a 19/jul.\n\n## Não Perca\n\nFaça suas **apostas nominais** antes do início — campeão, vice, artilheiro e terceiro lugar valem pontos extras!`;
        highlights = [`${daysLeft} dias para a Copa 2026`, "48 seleções, 104 jogos", "Final: 19/jul — MetLife Stadium", "Apostas nominais abertas!"];
      } else if (isDuringTournament && yesterdayGames.length > 0) {
        title = `Copa 2026 — Resumo de ${format(subDays(nowBRT, 1), "dd/MM")}`;
        const resultados = yesterdayGames.map((g) => `**${g.homeTeam}** ${g.homeScore} × ${g.awayScore} **${g.awayTeam}**`).join("\n\n");
        const lider = ranking[0];
        content = `## Resultados de Ontem\n\n${resultados}\n\n## Bolão\n\n${lider ? `**${lider.name}** lidera com **${lider.points} pontos**.` : ""}`;
        highlights = yesterdayGames.map((g) => `${g.homeTeam} ${g.homeScore}×${g.awayScore} ${g.awayTeam}`).slice(0, 5);
      } else {
        title = "Copa 2026 — Acompanhe o bolão!";
        content = "Fique de olho no bolão! A Copa do Mundo 2026 está acontecendo — não perca nenhuma atualização.";
        highlights = ranking[0] ? [`Líder: ${ranking[0].name} com ${ranking[0].points}pts`] : ["Bolão em andamento!"];
      }
    }

    // Persiste
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
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[generate-news] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
