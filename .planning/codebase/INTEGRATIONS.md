---
title: External Integrations
mapped_at: 2026-05-05
last_mapped_commit: 2e43aa873e6577285138ef3726bbe888cf75f029
---

# Integrations

## Vercel

The repo is linked to Vercel through `.vercel/project.json`. The app also imports:

- `@vercel/analytics/next` in `src/app/layout.tsx`
- `@vercel/speed-insights/next` in `src/app/layout.tsx`

Analytics and Speed Insights are gated by `process.env.VERCEL === '1'`, so they should activate only on Vercel-hosted builds.

## Neon Postgres

Database access is configured through:

- `src/db/index.ts`
- `src/db/client.ts`
- `drizzle.config.ts`

`src/db/client.ts` uses `@neondatabase/serverless` for non-local database URLs and `pg` with a global pool for local TCP PostgreSQL URLs. This allows production/serverless and local/CI database access to share one Drizzle schema.

Required env key:

- `DATABASE_URL`

## Auth Providers

Auth.js / NextAuth v5 is configured in `src/auth.ts`.

Providers:

- Discord
- Google

Required env keys:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_DISCORD_ID`
- `AUTH_DISCORD_SECRET`
- `AUTH_URL` is used operationally and checked by release readiness.
- `AUTH_TRUST_HOST` is documented in `.env.example` and `README.md`.

Important behavior:

- Sessions use JWT strategy.
- User records are synced into the database during sign-in.
- Discord guild role sync can set `admin`, `mod`, or `support`.
- Discord role IDs are currently hardcoded in `src/auth.ts`, which is an operational configuration concern.

## Discord Bot API

Bot-facing routes live in:

- `src/app/api/bot/health/route.ts`
- `src/app/api/bot/user/[discordId]/route.ts`

Both routes authenticate through `BOT_API_KEY`, accepting either `x-bot-api-key` or `Authorization: Bearer ...`.

Capabilities:

- Bot heartbeat read/write through `bot_heartbeat`.
- User/profile lookup by Discord ID.

Planning note:

- If `BOT_API_KEY` is absent, bot routes are effectively unusable. That is fine for optional bot operation, but production dashboards should distinguish "not configured" from "offline".

## Groq Via OpenAI SDK

`src/server/coach/groq-coach-client.ts` uses the `openai` package with Groq's OpenAI-compatible base URL.

Env keys:

- `GROQ_API_KEY`
- `GROQ_COACH_MODEL`

Behavior:

- If `GROQ_API_KEY` is absent, the app keeps deterministic coaching behavior.
- The LLM is used for structured coach output/copy, not for changing deterministic facts.

## Browser APIs

The core product depends on browser-side media and canvas capabilities:

- `src/core/video-ingestion.ts`
- `src/core/frame-extraction.ts`
- `src/workers/aimAnalyzer.worker.ts`
- `src/workers/aim-analyzer-session.ts`

Key browser primitives include video loading, frame extraction, `ImageData`, Web Workers, and visual tracking. This is why the current launch track is browser-first.

## Remote Images

`next.config.ts` allows remote images from:

- `lh3.googleusercontent.com`
- `cdn.discordapp.com`
- `liquipedia.net`

These support OAuth avatars, Discord/community images, and esports/pro data.

## Public SEO And Metadata

SEO and metadata integration points:

- `src/app/layout.tsx`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/ui/components/seo/json-ld.tsx`

Known production gap:

- `src/app/layout.tsx` references `/og-image.png` and `/safari-pinned-tab.svg`, but those files were not present under `public/` during this mapping.
- Google site verification is still a placeholder in `src/app/layout.tsx`.

## OpenSpec And Planning Docs

Existing planning/spec material lives in:

- `docs/`
- `openspec/`

There are many docs, including community, launch readiness, spray analysis, video analysis, benchmark, and captured clip materials. Future GSD ingest should filter these documents because the GSD ingest workflow has a 50-doc cap and this repo currently has more than that.
