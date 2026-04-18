# SETUP — Bolão Copa do Mundo 2026

Guia completo para configurar e fazer o deploy da aplicação.

---

## Pré-requisitos

- Node.js 20 LTS
- pnpm 9.x (`npm install -g pnpm`)
- Conta Firebase (gratuita)
- Conta Vercel (gratuita — plano Hobby)
- (Opcional) Conta OpenAI para notícias geradas por IA

---

## 1. Clonar e instalar

```bash
git clone <seu-repo>
cd bolao-copa-2026
pnpm install
```

---

## 2. Criar projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um novo projeto (ex: `bolao-copa-2026`)
3. Ative **Authentication → Email/Senha**
4. Crie um banco **Firestore** (modo produção)
5. Em **Configurações do projeto → Geral**, copie as credenciais do app web

---

## 3. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com seus valores:

```env
# Credenciais do app web Firebase (do console)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bolao-copa-2026.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=bolao-copa-2026
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bolao-copa-2026.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc

# Service Account (para scripts e API routes server-side)
# 1. Firebase Console → Configurações → Contas de serviço → Gerar nova chave privada
# 2. Salve o JSON baixado temporariamente
# 3. Execute: base64 -i serviceAccount.json | tr -d '\n'
# 4. Cole o resultado aqui:
FIREBASE_SERVICE_ACCOUNT_B64=eyJhb...

# Segredo para proteger rotas de cron
# Gere com: openssl rand -hex 32
CRON_SECRET=sua-string-aleatoria-aqui

# OpenAI (opcional)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# URL do app em produção
NEXT_PUBLIC_APP_URL=https://bolao-copa-2026.vercel.app
```

---

## 4. Implantar regras e índices Firestore

```bash
# Instale o Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Selecione o projeto
firebase use bolao-copa-2026

# Implante regras e índices
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 5. Popular banco de dados com jogos e configurações

```bash
pnpm seed
```

Este comando:
- Insere os 104 jogos da Copa 2026 (idempotente)
- Configura as pontuações padrão em `settings/scoring`
- Inicializa o documento `nominalResults/global`

---

## 6. Criar conta admin

1. Abra a aplicação e **crie uma conta normal** com o e-mail `brunoarouca@gmail.com`
2. Execute o script de promoção:

```bash
pnpm set-admin
# ou com e-mail diferente:
ADMIN_EMAIL=outro@email.com pnpm set-admin
```

3. O usuário deve fazer **logout e login novamente** para o claim ser carregado

---

## 7. Travamento de apostas — Firebase Cloud Function (Vercel Hobby)

Como o plano Hobby da Vercel não suporta cron por minuto, use uma **Firebase Cloud Function** para verificar travamentos a cada minuto:

### Instalar Firebase CLI para Functions

```bash
cd functions  # crie esta pasta
npm init -y
npm install firebase-admin firebase-functions
npm install -D typescript @types/node
```

### Criar `functions/src/index.ts`

```typescript
import * as functions from "firebase-functions";
import fetch from "node-fetch";

export const checkLock = functions.pubsub
  .schedule("* * * * *")
  .onRun(async () => {
    const appUrl = process.env.APP_URL ?? "https://bolao-copa-2026.vercel.app";
    const cronSecret = process.env.CRON_SECRET ?? "";

    await fetch(`${appUrl}/api/check-lock`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
  });
```

### Configurar e implantar

```bash
firebase functions:config:set app.url="https://bolao-copa-2026.vercel.app" app.cron_secret="SEU_CRON_SECRET"
firebase deploy --only functions
```

**Cuota gratuita Firebase Functions:** 2 milhões de invocações/mês — mais do que suficiente (43.200/mês para cron por minuto).

---

## 8. Deploy na Vercel

```bash
# Instale o Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Configure as variáveis de ambiente no painel da Vercel em **Settings → Environment Variables**. As variáveis sem prefixo `NEXT_PUBLIC_` devem ser marcadas como **Production only**.

---

## 9. Verificação pós-deploy

- [ ] Login e cadastro funcionam
- [ ] `/apostas` carrega os 104 jogos
- [ ] Apostas salvam e persistem após reload
- [ ] `/admin` redireciona para 403 para não-admins
- [ ] Admin consegue inserir resultados
- [ ] Pontuação é calculada após inserir resultado
- [ ] Ranking atualiza em tempo real em duas abas
- [ ] `/nominais` bloqueia após deadline
- [ ] WhatsApp não vaza apostas de jogos upcoming
- [ ] Cron de notícias funciona (teste manual: `/api/generate-news`)

---

## Scripts disponíveis

```bash
pnpm dev          # Servidor de desenvolvimento
pnpm build        # Build de produção
pnpm start        # Servidor de produção local
pnpm test         # Roda testes Vitest
pnpm seed         # Popula Firestore com jogos e configurações
pnpm set-admin    # Promove usuário a admin (edite ADMIN_EMAIL)
```
