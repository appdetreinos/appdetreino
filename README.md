# Viva FIT APP

Plataforma SaaS multi-tenant pra personal trainers brasileiros.

Stack: Next.js 16 (App Router + `proxy.ts`) · React 19 · Tailwind 4 · shadcn 4 (base-ui) · Supabase · Evolution API (WhatsApp) · **Mercado Pago Bricks (somente pra cobrança da assinatura SaaS)**.

## Modelo de cobrança

| Quem paga | Pra quem | Como |
|---|---|---|
| Aluno → Personal trainer | Trainer | **Pix direto** — trainer cadastra a chave Pix dele e o app dispara mensagem automática no WhatsApp com chave + valor. **Sem gateway, sem taxa.** |
| Trainer → Plataforma | Plataforma (você) | **Mercado Pago** — webhook real, assinatura Start R$ 59,90 / Pro R$ 119,00 / Top R$ 159,90 com trial de 3 dias. |

A plataforma **não** intermedia pagamento entre trainer e aluno. Não somos um PSP. Somos um SaaS de gestão com automação de cobrança via WhatsApp.

---

## Setup local

### 1. Pré-requisitos

- Node.js 20+
- `pnpm` ou `npm`
- Uma conta Supabase com projeto criado (https://supabase.com/dashboard)

### 2. Clonar e instalar

```bash
cd painel-fit
npm install
cp .env.example .env.local
```

### 3. Popular `.env.local`

Edite `.env.local` e coloque **pelo menos as 3 vars do Supabase** (pega em `Settings → API` no painel do projeto):

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

Opcional mas recomendado pra assinatura SaaS:
```
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=
```

> ⚠️ Rodar `npm run build` sem as vars Supabase populadas vai quebrar. Em dev (`npm run dev`) funciona até a primeira chamada.

### 4. Aplicar as migrations no Supabase

No painel do Supabase → **SQL Editor** → `New query`, cole e rode cada arquivo em `supabase/migrations/` em ordem:

1. `0001_init.sql` — schema base (25+ tabelas + RLS + trigger `handle_new_user`)
2. `0002_features_avancadas.sql` — agenda, hábitos, WOD, compras, anamnese
3. `0003_student_invites.sql` — sistema de convites de aluno
4. `0004_pix_direto.sql` — chave Pix + mensagens automáticas (sem Asaas/MP no fluxo trainer→aluno)

Ou via CLI:
```bash
supabase db push
```

### 5. Configurar autenticação

Em `Authentication → Providers`:
- Mantenha **Email** habilitado
- **Recomendado:** desative `Enable email confirmations` durante dev. Ative em produção.

### 6. Subir dev server

```bash
npm run dev
```

Abre em http://localhost:3000.

---

## Fluxo de teste manual

### A) Cadastro de trainer (grátis, trial 3 dias)

1. `/register` → preenche form → cai em `/app/questionario?step=1`
2. Dashboard "Bom dia, [nome]" + cards "Quem tá esperando você hoje?" + atalhos

### B) Adicionar aluno + cobrar

1. **+ Novo aluno** → preenche → gera código `A1B2C3` + link `http://localhost:3000/invite/A1B2C3`
2. Em outro browser (anônimo): abre `/invite/A1B2C3` → clica "Aceitar e entrar" → `/register?role=student&invite=...` → signup
3. Trigger cria `profiles` + RPC `accept_invite` vincula ao trainer → aluno cai em `/aluno`
4. No painel do trainer, em **Financeiro** → clica "Chave Pix" → cadastra a chave dele
5. Cria cobrança: aluno + valor + vencimento → status `pending`
6. **"Cobrar"**: abre `wa.me/55...` com mensagem pronta (Pix direto, valor, chave)
7. Quando o aluno pagar direto no Pix do trainer, trainer volta na lista e marca como `paid` (manual — botão "Marcar como pago")

### C) Assinatura SaaS do trainer (Mercado Pago)

Pra fechar essa parte:
- Configurar `MERCADOPAGO_ACCESS_TOKEN` no `.env.local`
- Registrar webhook `/api/mercadopago/webhook` no painel MP
- Criar conta `trainer_subscriptions` no Supabase (status, external_id, period_end)
- Botão "Fazer upgrade pro Pro" no painel dispara checkout Bricks

A parte de assinatura SaaS fica pra próxima sprint — nesta sessão a UI de cobrança trainer→aluno já funciona, e o webhook MP já está cabeado pra quando você plugar credenciais reais.

### D) Logout

- **Trainer:** botão "Sair" no fim da sidebar
- **Aluno:** botão logout no header

### E) RLS multi-tenant

Login com 2 contas trainer em 2 browsers → cada uma só vê os próprios alunos.

---

## Estrutura

```
painel-fit/
├── app/
│   ├── (marketing)/            # LP + auth
│   ├── (app)/app/              # Painel TRAINER (protegido)
│   ├── (student)/aluno/        # Painel ALUNO (protegido)
│   └── api/
│       └── mercadopago/webhook/  # webhook da assinatura SaaS
├── lib/
│   ├── supabase/
│   ├── evolution/              # WhatsApp (a integrar)
│   ├── mercadopago/            # assinatura SaaS
│   ├── types/billing.ts        # planos Start / Pro / Top
│   └── utils/
├── supabase/migrations/        # 0001..0004
└── proxy.ts                    # auth gate
```

---

## Roadmap

Feito nesta fase:
- [x] Auth (login/register/logout) com Supabase + RLS
- [x] `proxy.ts` validando sessão por role
- [x] Dashboard trainer com dados reais
- [x] Lista de alunos + criar convite + link WhatsApp
- [x] `/invite/[code]` + `accept_invite` RPC
- [x] Home aluno server component
- [x] Financeiro com cobranças reais + mensagem Pix direto
- [x] Webhook Mercado Pago cabeado (pronto pra ativar)

Próximas:
- [ ] Ativar assinatura SaaS via MP (criar `trainer_subscriptions` + checkout)
- [ ] Evolution API real (QR + envio automático das mensagens de cobrança)
- [ ] Editor de treino drag-and-drop
- [ ] Editor de dieta com macros
- [ ] PDF treino/dieta
- [ ] Comunidade + ranking
- [ ] LGPD export/delete + PWA
- [ ] Painel admin

---

## Troubleshooting

**"Invalid API key"** → confira `NEXT_PUBLIC_SUPABASE_ANON_KEY` em `.env.local`.

**Redirect loop** → confira `proxy.ts` tá usando `createProxyClient(request, response)`.

**`accept_invite` "Convite não encontrado"** → user já tinha conta com outro `auth.uid`. Pede pra aceitar o convite com o link exato.

**Build quebra com "env not defined"** → `.env.local` precisa estar populado antes do `npm run build`.

