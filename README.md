# ⚽ Bolão Copa do Mundo 2026

Web app de apostas para a **Copa do Mundo FIFA 2026** (EUA · Canadá · México · 11/jun → 19/jul/2026).

## Funcionalidades

- **Cadastro e login** — Firebase Auth (email/senha)
- **104 jogos** — Fase de grupos até a final, com apostas de placar
- **Travamento automático** — 5 minutos antes de cada apito (Firebase Cloud Function)
- **Apostas nominais** — Artilheiro, Campeão, Vice e Terceiro lugar (deadline 12/jun)
- **Pontuação automática** — Calculada ao admin inserir resultado
- **Ranking em tempo real** — onSnapshot Firestore
- **Compartilhamento WhatsApp** — Sem vazar apostas futuras
- **Painel Admin** — Resultados, regras, usuários, notícias
- **Notícias diárias** — Geradas com OpenAI gpt-4o-mini (opcional)
- **Dark mode** — Toggle na navbar
- **Mobile-first** — Responsivo em todos os breakpoints

## Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript strict |
| UI | Tailwind CSS + shadcn/ui |
| Auth + DB | Firebase Auth + Firestore |
| Validação | Zod |
| Estado servidor | TanStack Query |
| Datas | date-fns + date-fns-tz |
| Toasts | sonner |
| Testes | Vitest |
| Deploy | Vercel |

## Configuração

Veja [SETUP.md](./SETUP.md) para instruções completas de instalação e deploy.

## Desenvolvimento rápido

```bash
pnpm install
cp .env.local.example .env.local
# Configure as variáveis em .env.local
pnpm dev
```

## Testes

```bash
pnpm test
```

## Estrutura do projeto

```
app/
  (auth)/         — login, register
  (app)/          — área logada (navbar + AuthGate)
    apostas/      — página de apostas
    nominais/     — apostas nominais
    classificacao/— ranking
    noticias/     — notícias diárias
    admin/        — painel admin (AdminGate)
  api/            — rotas de API
components/       — componentes React
hooks/            — hooks customizados
lib/              — utilitários, firebase, scoring
data/             — jogos e times
scripts/          — seed e set-admin
types/            — tipos TypeScript
```

## Pontuação padrão

| Tipo de acerto | Pontos |
|---------------|--------|
| Placar exato | 20 |
| Vencedor + 1 gol | 15 |
| Empate certo | 13 |
| Vencedor certo | 10 |
| 1 gol certo | 5 |
| Aposta nominal | 50 |

---

*Desenvolvido com ❤️ para o Bolão Copa 2026*
