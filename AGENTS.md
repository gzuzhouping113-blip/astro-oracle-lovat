# Agent Guide

This is a Vercel-first Next.js app for "解梦 · 星轨神谕".

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- framer-motion
- lucide-react
- shadcn/ui-style local primitives
- Neon Postgres
- OpenAI-compatible Chat Completions API
- Volcengine Ark / Doubao SeedDream image generation

## Product Surface

- `/` dream entry screen
- `/parser` dream interpretation screen
- `/card` share-card generation screen
- `/archive` dream archive screen
- `/api/auth/register` username/password registration API
- `/api/auth/login` login API
- `/api/auth/logout` logout API
- `/api/auth/me` current-user API
- `/api/dream/records` database-backed dream records API
- `/api/dream/cards` database-backed share-card history API
- `/api/dream/interpret` text interpretation API
- `/api/dream/generate-card` share-card copy and image API
- `/api/dream/generate-image` image API

Dream entry session state is kept in browser `sessionStorage`. User accounts, dream archive records, and generated-card history are stored in Neon Postgres.

## Deployment

Use Vercel with:

```bash
npm install
npm run build
```

Required production environment variables:

- `DATABASE_URL`
- `CUSTOM_AI_API_KEY`
- `CUSTOM_AI_BASE_URL`
- `DOUBAO_API_KEY`
- `NEXT_PUBLIC_SITE_URL`

Optional:

- `CUSTOM_AI_MODEL`
