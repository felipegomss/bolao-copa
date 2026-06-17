# Bolão da Copa 2026

Bolão da Copa do Mundo 2026 para um grupo fechado de amigos. Cada um loga, vê
os jogos do dia, palpita em alguns mercados (que fecham no início de cada jogo)
e disputa um ranking. Mobile-first; no desktop a tela de jogos mostra a tabela
numa coluna lateral.

A pontuação começa a valer **a partir da 2ª rodada da fase de grupos** — jogos
anteriores aparecem no histórico marcados como "não valeu".

## Stack

- Next.js 16 (App Router) + TypeScript + Turbopack
- Tailwind CSS v4 + shadcn/ui (Radix) com tema neobrutalist (travado em claro)
- Prisma 7 + PostgreSQL (Neon) via driver adapter Neon
- Auth.js v5 (NextAuth) — provider Credentials, sessão JWT
- Deploy na Vercel

## Rodando local

```bash
npm install
cp .env.example .env   # preencha os valores
npx prisma migrate dev # aplica o schema no banco
npm run db:seed        # cadastra os jogadores
npm run db:seed-jogos  # importa os jogos da Copa (football-data.org)
npm run dev
```

Abra http://localhost:3000.

## Variáveis de ambiente

| Var | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Postgres Neon **pooled** (runtime) |
| `DATABASE_URL_UNPOOLED` | sim | Postgres Neon **direto** (migrations) |
| `AUTH_SECRET` | sim | segredo do Auth.js (`npx auth secret`) |
| `SENHA_BOLAO` | sim | senha única compartilhada do grupo |
| `FOOTBALL_DATA_TOKEN` | sim | token gratuito do football-data.org |
| `CRON_SECRET` | sim | protege o endpoint de apuração |
| `PONTUACAO_INICIA_EM` | não | corte em ISO UTC; vazio = deriva da 2ª rodada |
| `OCULTAR_JOGOS_SEM_PONTOS` | não | `true` esconde no histórico os jogos pré-corte |

## Scripts

| Script | Faz |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `start` | build/start de produção |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | seed dos jogadores |
| `npm run db:seed-jogos` | importa/atualiza os jogos da Copa |
| `npm run db:studio` | Prisma Studio |

## Apuração (cálculo de pontos)

- **On-access**: ao abrir qualquer tela, se há jogo rolando e passou de 90s da
  última checagem, o app busca os resultados e recalcula os pontos em background
  (não bloqueia a página). Não depende de cron.
- **Cron diário** (`vercel.json`, 09:00 UTC) como rede de segurança.
- **Manual**: `GET /api/cron/apurar?secret=$CRON_SECRET` força a apuração de
  todos os finalizados, ou `&externalId=<id>` força um jogo específico.

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Configure as variáveis de ambiente acima em **Production** (e Preview, se quiser).
3. O cron diário já está em `vercel.json`. O plano **Hobby** só permite cron 1×/dia
   — a apuração on-access cobre o tempo real durante os jogos.
4. O banco (Neon) já contém o schema e os dados (seeds rodados localmente);
   se for um banco novo, rode as migrations e os seeds apontando pra ele.
