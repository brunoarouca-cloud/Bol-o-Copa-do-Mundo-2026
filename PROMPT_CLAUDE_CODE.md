# Bolão Copa 2026 — Prompt de implementação para Claude Code

> Cole este arquivo como primeira mensagem em uma sessão do Claude Code dentro de um diretório vazio. O Claude vai executar as fases em ordem, fazendo perguntas quando faltar contexto (Firebase project, chaves, etc.) em vez de inventar valores.

---

## 1. Objetivo

Construir **Bolão Copa 2026**, um web app que aguenta ≥50 usuários simultâneos, para apostas em jogos da Copa do Mundo FIFA 2026 (11/jun → 19/jul/2026, EUA + Canadá + México, 104 jogos). Funcionalidades núcleo:

- Cadastro/login individual.
- Apostas de placar por jogo, com travamento automático 5 min antes do apito inicial.
- Apostas nominais (artilheiro, campeão, vice, terceiro) travadas em 12/jun/2026 23:59 BRT.
- Pontuação automática + ranking em tempo real.
- Compartilhamento via WhatsApp.
- Painel admin protegido para inserir resultados, editar regras e gerenciar usuários.
- Notícia diária gerada por LLM.

---

## 2. Stack — fixe estas escolhas antes de codar

| Camada | Escolha | Versão mínima |
| --- | --- | --- |
| Runtime | Node.js | 20 LTS |
| Package manager | pnpm | 9.x |
| Framework | Next.js (App Router) | 14.2+ |
| Linguagem | TypeScript (`strict: true`) | 5.4+ |
| UI | Tailwind CSS + shadcn/ui | última |
| Auth + DB | Firebase Auth + Firestore | SDK v10+ |
| Validação | Zod | 3.x |
| Estado servidor | TanStack Query (React Query) | 5.x |
| Datas/fuso | `date-fns` + `date-fns-tz` | 3.x |
| Toasts | `sonner` (preferir a `react-hot-toast`) | última |
| Ícones | `lucide-react` | última |
| Notícias | OpenAI SDK (`gpt-4o-mini` por custo) | última |
| Hash senha admin | `bcryptjs` | 2.x |
| Hospedagem | Vercel | — |

**Por que estas trocas vs. o briefing original:**
- `sonner` > `react-hot-toast`: API mais simples, melhor a11y.
- `gpt-4o-mini` > `gpt-4o`: notícia diária não precisa de modelo top; corta ~95% do custo.
- TanStack Query: gerencia cache + revalidação dos `onSnapshot`/`fetch` sem boilerplate.
- Zod: valida payload de API routes e formulários (login, cadastro, regras admin).
- Custom Claims (ver §6) > senha em Firestore para admin.

---

## 3. Estrutura de pastas

```
.
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                 # navbar + AuthGate
│   │   ├── apostas/page.tsx
│   │   ├── nominais/page.tsx
│   │   ├── classificacao/page.tsx
│   │   ├── noticias/page.tsx
│   │   └── admin/
│   │       ├── layout.tsx             # AdminGate (claim check)
│   │       ├── page.tsx
│   │       ├── jogos/page.tsx
│   │       ├── usuarios/page.tsx
│   │       ├── regras/page.tsx
│   │       └── nominais/page.tsx
│   ├── api/
│   │   ├── check-lock/route.ts        # cron: trava jogos
│   │   ├── recalculate/route.ts       # POST: recalcula pontos
│   │   ├── generate-news/route.ts     # cron: gera notícia
│   │   └── admin/
│   │       ├── login/route.ts         # valida senha + seta claim
│   │       └── result/route.ts        # admin insere resultado
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── navbar.tsx
│   ├── game-card.tsx
│   ├── bet-input.tsx
│   ├── ranking-table.tsx
│   ├── nominal-bet-card.tsx
│   ├── share-button.tsx
│   ├── news-card.tsx
│   ├── admin/*
│   └── ui/*                            # shadcn
├── lib/
│   ├── firebase/
│   │   ├── client.ts                   # SDK client
│   │   ├── admin.ts                    # SDK admin (server-only)
│   │   └── converters.ts               # Firestore data converters
│   ├── scoring.ts
│   ├── share-text.ts
│   ├── time.ts                         # helpers UTC ↔ BRT
│   └── zod-schemas.ts
├── hooks/
│   ├── use-auth.ts
│   ├── use-bets.ts
│   ├── use-ranking.ts
│   └── use-countdown.ts
├── data/
│   └── games-2026.ts                   # fonte da verdade dos 104 jogos
├── scripts/
│   ├── seed-games.ts                   # popula Firestore
│   └── set-admin-claim.ts              # promove um uid a admin
├── types/index.ts
├── middleware.ts
├── vercel.json
├── firestore.rules
├── firestore.indexes.json
├── .env.local.example
├── .env.local                          # gitignored
├── README.md
└── SETUP.md
```

---

## 4. Tipos TypeScript canônicos

Crie `types/index.ts` como fonte única de verdade. Use estes tipos em todo o código (componentes, hooks, API routes, conversores Firestore):

```ts
import { Timestamp } from "firebase/firestore";

export type GamePhase =
  | "Fase de Grupos" | "Oitavas" | "Quartas"
  | "Semifinal" | "Terceiro Lugar" | "Final";

export type GameStatus = "upcoming" | "locked" | "finished";

export interface Game {
  id: string;                 // "GS01" | "R32_01" | "QF1" | ...
  matchNumber: number;        // 1..104
  phase: GamePhase;
  group: string | null;       // "A".."L" ou null
  homeTeam: string;           // "Brasil" ou placeholder "1º Grupo A"
  awayTeam: string;
  homeFlag: string | null;    // emoji ou código ISO
  awayFlag: string | null;
  date: Timestamp;            // armazenado em UTC
  venue: string;
  city: string;
  country: "EUA" | "Canadá" | "México";
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
}

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  createdAt: Timestamp;
  totalPoints: number;
  exactHits: number;          // desempate
  rank: number;               // calculado
  isAdmin: boolean;           // espelha custom claim para UI
}

export interface Bet {
  id: string;                 // `${uid}_${gameId}`
  userId: string;
  gameId: string;
  homeScore: number;
  awayScore: number;
  points: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NominalCategory =
  | "topScorer" | "champion" | "runnerUp" | "thirdPlace";

export interface NominalBet {
  id: string;                 // `${uid}_${category}`
  userId: string;
  category: NominalCategory;
  prediction: string;
  points: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NominalResults {
  topScorer: string | null;
  champion: string | null;
  runnerUp: string | null;
  thirdPlace: string | null;
  updatedAt: Timestamp | null;
}

export interface ScoringSettings {
  exactScore: number;             // 20
  correctWinnerOneScore: number;  // 15
  correctWinner: number;          // 10
  oneTeamScore: number;           // 5
  correctDraw: number;            // 13
  nominalBet: number;             // 50
  nominalDeadline: Timestamp;     // 12/06/2026 23:59 BRT em UTC
  lockMinutesBefore: number;      // 5
}

export interface NewsArticle {
  id: string;
  date: string;                   // "2026-06-14"
  title: string;
  content: string;                // markdown
  highlights: string[];
  generatedAt: Timestamp;
}
```

---

## 5. Modelo Firestore

Coleções:

- `users/{uid}` → `UserDoc`
- `games/{gameId}` → `Game`
- `bets/{uid_gameId}` → `Bet`
- `nominalBets/{uid_category}` → `NominalBet`
- `nominalResults/global` → `NominalResults` (doc único)
- `settings/scoring` → `ScoringSettings`
- `news/{yyyy-mm-dd}` → `NewsArticle`

Índices compostos em `firestore.indexes.json`:

- `bets`: `userId ASC, gameId ASC`
- `bets`: `gameId ASC` (para recálculo)
- `users`: `totalPoints DESC, exactHits DESC` (ranking + desempate)

---

## 6. Autenticação e autorização

### Usuários comuns
- Firebase Auth (Email/Senha) com persistência local.
- Após `createUserWithEmailAndPassword`, gravar `users/{uid}` (na mesma transação que `updateProfile` para `displayName`).
- Telefone com máscara BR validada por Zod (`/^\(\d{2}\) \d{4,5}-\d{4}$/`).

### Admin — **NÃO** usar senha em Firestore
Substitua o esquema de "senha hasheada na coleção settings" por **Custom Claims** do Firebase Admin SDK:

1. `scripts/set-admin-claim.ts` (rodado uma vez localmente):
   ```ts
   await admin.auth().setCustomUserClaims(uid, { admin: true });
   await admin.firestore().doc(`users/${uid}`).update({ isAdmin: true });
   ```
2. No client, após login admin, forçar `getIdToken(true)` para refresh do claim.
3. Rotas `/admin/*` checadas em **dois lugares**:
   - `middleware.ts` valida o cookie de sessão (server-side, via `firebase-admin`).
   - `firestore.rules` exige `request.auth.token.admin == true` para escritas em `games`, `settings`, `nominalResults`, `news`.

O ícone ⚙️ na navbar simplesmente abre `/admin`; quem não tem o claim recebe 403.

---

## 7. Regras Firestore (versão correta)

> A versão do briefing original tinha uma regra com `resource.data.status != 'locked'` em `bets`, mas `bets` não tem campo `status`. Use o `games.status` como fonte da verdade do travamento.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isAdmin() { return request.auth.token.admin == true; }
    function isOwner(uid) { return request.auth.uid == uid; }
    function gameUnlocked(gameId) {
      return get(/databases/$(database)/documents/games/$(gameId)).data.status == 'upcoming';
    }

    match /users/{uid} {
      allow read: if isSignedIn();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid)
        && !('totalPoints' in request.resource.data.diff(resource.data).affectedKeys())
        && !('isAdmin' in request.resource.data.diff(resource.data).affectedKeys());
      allow update, delete: if isAdmin();
    }

    match /games/{gameId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /bets/{betId} {
      allow read: if isSignedIn() && isOwner(resource.data.userId);
      allow create: if isSignedIn()
        && isOwner(request.resource.data.userId)
        && gameUnlocked(request.resource.data.gameId);
      allow update: if isSignedIn()
        && isOwner(resource.data.userId)
        && gameUnlocked(resource.data.gameId)
        && !('points' in request.resource.data.diff(resource.data).affectedKeys());
      allow delete: if false;
    }

    match /nominalBets/{betId} {
      allow read: if isSignedIn() && isOwner(resource.data.userId);
      allow create, update: if isSignedIn()
        && isOwner(request.resource.data.userId)
        && request.time < get(/databases/$(database)/documents/settings/scoring).data.nominalDeadline;
      allow delete: if false;
    }

    match /nominalResults/global { allow read: if isSignedIn(); allow write: if isAdmin(); }
    match /settings/{doc}        { allow read: if isSignedIn(); allow write: if isAdmin(); }
    match /news/{doc}            { allow read: if isSignedIn(); allow write: if isAdmin(); }
  }
}
```

---

## 8. Sistema de pontuação

`lib/scoring.ts`:

```ts
import type { ScoringSettings } from "@/types";

export function calculatePoints(
  bet: { homeScore: number; awayScore: number },
  result: { homeScore: number; awayScore: number },
  s: ScoringSettings,
): number {
  const { homeScore: bh, awayScore: ba } = bet;
  const { homeScore: rh, awayScore: ra } = result;

  if (bh === rh && ba === ra) return s.exactScore;

  const winner = (h: number, a: number) =>
    h > a ? "home" : a > h ? "away" : "draw";

  const bw = winner(bh, ba);
  const rw = winner(rh, ra);
  const oneTeamHit = bh === rh || ba === ra;

  if (bw === "draw" && rw === "draw") return s.correctDraw;
  if (bw === rw) return oneTeamHit ? s.correctWinnerOneScore : s.correctWinner;
  if (oneTeamHit) return s.oneTeamScore;
  return 0;
}
```

Exporte testes Vitest em `lib/scoring.test.ts` cobrindo:
- placar exato; vitória + 1 gol certo; vitória só; empate certo (não exato); só 1 gol certo; nada.

---

## 9. Travamento — server-side autoritativo

Cliente nunca decide travamento. Fluxo:

1. Cron `* * * * *` em `vercel.json` chama `/api/check-lock`.
2. Route lê `now = Date.now()` server-side, busca `games` com `status == "upcoming"` e `date <= now + lockMinutesBefore*60000`, e atualiza para `"locked"` em batch.
3. Cliente assina `onSnapshot` em `games`; UI atualiza sozinha.

> **Atenção Vercel Hobby:** plano Hobby permite cron diário, não por minuto. Em produção, ou (a) upgrade para Pro, ou (b) rodar a verificação dentro de uma Cloud Function `onSchedule` do Firebase (gratuito até a quota). Documente a escolha em `SETUP.md`.

`vercel.json`:
```json
{
  "crons": [
    { "path": "/api/check-lock", "schedule": "* * * * *" },
    { "path": "/api/generate-news", "schedule": "0 2 * * *" }
  ]
}
```

Proteja as rotas com header `Authorization: Bearer ${CRON_SECRET}` (verificado dentro do handler).

---

## 10. Recálculo de pontos

`POST /api/recalculate` recebe `{ gameId }`. Fluxo, executado com Admin SDK:

```
1. Carrega game + scoring settings.
2. Lê todas as bets where gameId == X em paginação (300 docs por batch).
3. Para cada bet: calcula points, conta exactHit (points == exactScore).
4. Em transação por usuário, soma deltas em users.totalPoints / exactHits.
5. Recalcula rank em uma passada final ordenando por (totalPoints desc, exactHits desc).
```

Disparado automaticamente quando `/api/admin/result` grava `homeScore`/`awayScore`. **Nunca** chamado pelo cliente.

Pontos nominais: rota separada `/api/recalculate-nominals` disparada quando `nominalResults/global` muda.

---

## 11. Páginas — comportamento

### `/login` e `/register`
- Form com Zod + react-hook-form. Mensagens de erro em PT-BR amigáveis.
- "Esqueci senha" via `sendPasswordResetEmail`.

### `/apostas`
- Filtros por fase + grupo. Listagem cronológica.
- `GameCard`: bandeiras, placar (inputs `min=0 max=20`), countdown ("Trava em 2h 30min"), badge de status.
- Salva `onBlur` ou `Enter` debounce 400 ms; toast "Salvo". Em erro, reverte input para valor servidor.
- Se `status != "upcoming"`: inputs read-only + exibe `points` se `finished`.

### `/nominais`
- 4 cards. Dropdown das 48 seleções (lista em `data/teams-2026.ts`).
- Countdown grande até o deadline. Após deadline: read-only.
- ⚠️ **Realidade em abril/2026:** nem todas as 48 vagas estão preenchidas; mantenha placeholders editáveis pelo admin para os 2 vencedores do playoff intercontinental.

### `/classificacao`
- `onSnapshot` em `users` ordenado por `totalPoints desc, exactHits desc`.
- Linha do usuário logado destacada (ring amarelo).
- Modal "Ver apostas" carrega `bets where userId == X and game.status == finished` (privacidade: só mostra apostas de jogos já travados).

### `/noticias`
- SSR a primeira página (10 itens) + ISR `revalidate: 600`.
- Markdown renderizado com `react-markdown` + `remark-gfm`.

### `/admin/*`
- Tabs: Jogos · Resultados · Nominais · Usuários · Regras · Notícias.
- Tabela de jogos com edição inline (data, estádio, times do mata-mata).
- Excluir usuário: confirmação dupla, deleta do Auth + Firestore (`bets`, `nominalBets`, `users`) numa Cloud Function `onCall`.
- Editar regras de pontuação dispara recálculo global (botão separado, "Recalcular tudo", com confirmação).

---

## 12. Compartilhamento WhatsApp

`lib/share-text.ts` gera o texto. Inclui apenas apostas de jogos com `status != "upcoming"` (não vaza palpites antes do travamento). Formato no briefing original está bom; mantenha.

```ts
const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
window.open(url, "_blank", "noopener,noreferrer");
```

---

## 13. Geração de notícia

`/api/generate-news` (cron 02:00 UTC = 23:00 BRT):

1. Idempotência: se `news/{today}` já existe, retorna 200 sem chamar OpenAI.
2. Coleta jogos com `status == finished` cuja data é hoje (BRT).
3. Top 5 do ranking, top 5 pontuadores do dia, contagem de placares exatos.
4. Chama `gpt-4o-mini` com `response_format: { type: "json_object" }` retornando `{ title, content, highlights[] }`.
5. Persiste em `news/{yyyy-mm-dd}`.
6. Botão "Regerar" no admin força execução manual com `?force=1`.

---

## 14. Variáveis de ambiente

`.env.local.example` (committe este arquivo, não o `.env.local`):

```env
# Firebase client (públicas)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-only) — JSON da service account em base64
FIREBASE_SERVICE_ACCOUNT_B64=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Cron
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=https://bolao-copa-2026.vercel.app
```

Adicione `.env.local` e `serviceAccount*.json` ao `.gitignore`.

---

## 15. Testes mínimos exigidos

- `lib/scoring.test.ts` — todos os ramos da função.
- `lib/share-text.test.ts` — não vaza apostas não-travadas.
- `app/api/recalculate/route.test.ts` — usa Firestore Emulator.
- `firestore.rules.test.ts` — usa `@firebase/rules-unit-testing`, cobre: usuário comum não escreve em `games`; usuário não atualiza próprio `totalPoints`; aposta em jogo travado falha; aposta nominal após deadline falha.

Comando: `pnpm test`. CI no GitHub Actions opcional, mas inclua o workflow se sobrar tempo.

---

## 16. Acessibilidade & i18n

- Lighthouse a11y ≥ 90 em todas as páginas.
- Inputs de placar com `aria-label="Gols de {time}"`.
- Foco visível (não remova outline). Navegação por teclado em modais (Esc fecha, Tab cicla).
- Todo texto em PT-BR; números e datas com `Intl.DateTimeFormat("pt-BR")`.

---

## 17. Design system

Tokens em `tailwind.config.ts`:

```ts
colors: {
  brand: { green: "#006400", gold: "#FFD700", navy: "#1a1a2e" },
  status: { open: "#22c55e", locked: "#f97316", finished: "#6b7280" },
  hit:   { exact: "#fbbf24", partial: "#86efac", miss: "#fca5a5" },
}
```

Mobile-first, breakpoints sm/md/lg/xl. Cards de jogo: 1 col mobile, 2 tablet, 3 desktop. Confete (`canvas-confetti`) ao abrir página após acertar placar exato (estado armazenado em `localStorage` para não disparar 2×).

---

## 18. Dados dos jogos (`data/games-2026.ts`)

Estádios: lista do briefing original está correta — use-a.

⚠️ **Não invente datas e horários.** Pergunte ao usuário se quer:
1. Você gerar um esqueleto com datas plausíveis baseadas no calendário oficial FIFA (todos os horários como `TBD` em UTC), ou
2. Você usar o calendário oficial da FIFA caso ele forneça um CSV/JSON.

Mesmo cuidado para a lista de seleções classificadas: confirme com o usuário antes de hardcodar nomes.

`scripts/seed-games.ts` lê `data/games-2026.ts` e popula o Firestore via Admin SDK. Idempotente: usa `set` com `{ merge: true }` por `id`.

---

## 19. Ordem de implementação (siga esta sequência)

Trate cada item como um commit. Pare e reporte ao usuário ao final de cada fase.

1. **Scaffold:** `pnpm create next-app`, Tailwind, shadcn init, ESLint+Prettier, `tsconfig` strict, estrutura de pastas, `.env.local.example`, `.gitignore`.
2. **Firebase:** `lib/firebase/client.ts` + `lib/firebase/admin.ts`, conversores, `firestore.rules`, `firestore.indexes.json`. Documentar em `SETUP.md` como criar projeto + service account.
3. **Auth:** `/login`, `/register`, `useAuth`, middleware, AuthGate.
4. **Tipos + scoring:** `types/index.ts`, `lib/scoring.ts` + testes passando.
5. **Dados de jogos:** `data/games-2026.ts` (após confirmação com usuário), `scripts/seed-games.ts`.
6. **Página /apostas:** card + salvar + listener. Sem travamento ainda.
7. **Travamento:** `/api/check-lock` + cron + UI reativa.
8. **Página /nominais.**
9. **Admin:** layout + claim check + inserir resultado + `/api/recalculate`.
10. **Página /classificacao:** ranking em tempo real.
11. **Compartilhamento WhatsApp.**
12. **Notícias:** `/api/generate-news` + página.
13. **Admin avançado:** editar regras, gerenciar usuários, editar jogos.
14. **Polish:** loading skeletons, confete, toasts, dark mode (opcional).
15. **Deploy:** `vercel --prod`, configurar env vars, rodar seed em prod.

---

## 20. Definition of Done

Antes de declarar pronto, verifique tudo abaixo manualmente (testes automatizados não cobrem UX):

- [ ] Cadastro+login, logout, reset de senha funcionam.
- [ ] Aposta salva → fechar navegador → reabrir → aposta lá.
- [ ] Apostas trava 5 min antes do horário (testar com jogo fake daqui a 6 min).
- [ ] Em duas abas como usuários diferentes, ranking atualiza nas duas ao admin inserir resultado.
- [ ] Pontuação calculada corretamente em ≥3 cenários distintos.
- [ ] Apostas nominais bloqueadas após `nominalDeadline` (testar adiantando o deadline).
- [ ] Texto WhatsApp não inclui apostas de jogos `upcoming`.
- [ ] Admin sem custom claim recebe 403 em `/admin` e em escrita Firestore.
- [ ] Notícia idempotente (chamar 2× não duplica).
- [ ] Lighthouse a11y ≥ 90 em /apostas.
- [ ] `pnpm build` sem warnings; `pnpm test` verde.
- [ ] `firestore.rules` testadas em `@firebase/rules-unit-testing`.

---

## 21. Perguntas a fazer ao usuário antes de começar

1. Qual a versão definitiva do calendário/seleções classificadas a usar (você fornece ou eu gero esqueleto)?
2. Qual e-mail será o admin inicial (para rodar `set-admin-claim.ts`)?
3. Plano Vercel: Hobby (sem cron por minuto, vamos para Cloud Functions) ou Pro?
4. Quer dark mode no MVP ou pode ficar para v2?
5. Tem uma conta OpenAI com cota? Caso negativo, posso fazer a página de notícias funcionar com fallback "sem notícia hoje" e adiar a integração?

---

*Versão 2.0 — otimizada para Claude Code · Abril 2026*
