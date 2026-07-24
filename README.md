# i9 Wise Content

> Plataforma de criação automatizada de conteúdo para blogs com agentes de IA

## Stack

- **Framework**: Next.js 16 (App Router)
- **Linguagem**: TypeScript (strict mode)
- **Estilização**: Tailwind CSS 4 + shadcn/ui
- **Banco de Dados**: Supabase (PostgreSQL)
- **IA**: Vercel AI SDK 7 (Gemini, Claude, Groq, OpenRouter)
- **Estado**: TanStack Query + Zustand
- **Deploy**: Vercel

## Pré-requisitos

- Node.js 20+
- npm 10+
- Conta Supabase (projeto criado)
- Pelo menos 1 API key de IA (recomendado: Gemini — gratuita)

## Setup Local

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/i9-wise-content.git
cd i9-wise-content

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env.local
# Preencha as variáveis no .env.local

# 4. Execute o servidor de desenvolvimento
npm run dev

# 5. Acesse http://localhost:3000
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | Verificar código com ESLint |
| `npm run lint:fix` | Corrigir erros de lint |
| `npm run format` | Formatar código com Prettier |
| `npm run format:check` | Verificar formatação |
| `npm run type-check` | Verificar tipos TypeScript |
| `npm run test` | Rodar testes unitários |

## Estrutura do Projeto

```
src/
├── app/                    # Rotas e páginas (App Router)
│   ├── (auth)/            # Rotas de autenticação
│   ├── (dashboard)/       # Rotas do dashboard
│   └── api/               # Route Handlers (API)
├── components/
│   ├── ui/                # Componentes shadcn/ui
│   ├── layout/            # Layout (sidebar, header)
│   └── shared/            # Componentes compartilhados
├── lib/
│   ├── ai/                # Providers, prompts, geração
│   ├── supabase/          # Clients do Supabase
│   ├── services/          # Lógica de negócio
│   ├── validations/       # Schemas Zod
│   └── utils/             # Utilitários
├── hooks/                 # Custom hooks React
├── types/                 # Tipos TypeScript
└── config/                # Configurações do app
```

## Variáveis de Ambiente

Veja `.env.example` para a lista completa. Variáveis obrigatórias:

- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Chave anon do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Chave service role (server-only)
- Pelo menos 1 provider de IA configurado

## Rotas de Teste

Após configurar as API keys, teste cada provider:

- `GET /api/ai/test-gemini` — Testar Google Gemini
- `GET /api/ai/test-claude` — Testar Anthropic Claude
- `GET /api/ai/test-groq` — Testar Groq
- `GET /api/ai/test-openrouter` — Testar OpenRouter
- `GET /api/ai/test-fallback` — Testar sistema de fallback

## Licença

Privado — i9 Style MKT © 2025
