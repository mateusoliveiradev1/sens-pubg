---
title: Codebase Stack
mapped_at: 2026-05-05
last_mapped_commit: 2e43aa873e6577285138ef3726bbe888cf75f029
---

# Stack

## Product Shape

`sens-pubg` is a production-deployed PUBG aim analysis web app. The current product combines browser-first video analysis, user setup/profile storage, analysis history, community publishing, admin/moderation tools, and an optional LLM rewrite layer for coaching copy.

Primary product evidence:

- `README.md` describes the app as "PUBG Aim Analyzer" with local browser spray analysis.
- `src/app/analyze/page.tsx` gates analysis on a complete player profile.
- `src/workers/aimAnalyzer.worker.ts` and `src/workers/aim-analyzer-session.ts` keep the tracking loop in a Web Worker.
- `src/core/index.ts` re-exports the analysis pipeline.

## Runtime And Frameworks

- Node.js 20+ is expected by `README.md` and `.github/workflows/ci.yml`.
- Next.js App Router is the web framework (`next` 15.2.9 in `package.json`).
- React 19.2.3 powers client and server components.
- TypeScript is strict, with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, and `noFallthroughCasesInSwitch` enabled in `tsconfig.json`.
- The repo is ESM (`"type": "module"` in `package.json`).

## Frontend Stack

- App Router pages live under `src/app`.
- Shared UI components live under `src/ui/components`.
- CSS is a mix of global design tokens in `src/app/globals.css`, CSS modules next to pages/components, and Tailwind utility support.
- Tailwind is configured through `tailwind.config.ts` and `@tailwindcss/postcss` in `postcss.config.mjs`.
- Fonts are loaded through `next/font/google` in `src/app/layout.tsx`.

## Backend Stack

- Server actions live under `src/actions`.
- API routes are limited and live under `src/app/api`.
- Auth is handled by Auth.js / NextAuth v5 in `src/auth.ts`.
- `next-safe-action` is used for typed/action-safe flows in `src/lib/safe-action.ts`.
- Rate limiting is implemented locally in `src/lib/rate-limit.ts`.

## Data Stack

- PostgreSQL is the persistent database.
- Drizzle ORM is used for schema, relations, queries, and migrations.
- `src/db/schema.ts` is the canonical schema definition.
- `drizzle.config.ts` points Drizzle Kit at `src/db/schema.ts` and `.env.local`.
- `src/db/client.ts` chooses Neon HTTP for remote URLs and `node-postgres` for local TCP URLs.
- SQL migrations live in `drizzle/0000_freezing_switch.sql` through `drizzle/0007_community_gamification_core.sql`.

## AI And Analysis

- Core deterministic analysis is in `src/core`.
- PUBG game math and static catalogs are in `src/game/pubg`.
- Browser frame extraction, quality checks, spray window detection, tracking, diagnostics, sensitivity, and coaching are exported from `src/core/index.ts`.
- Optional LLM copy rewriting uses the OpenAI SDK against Groq's OpenAI-compatible endpoint in `src/server/coach/groq-coach-client.ts`.
- The LLM is optional and returns `undefined` when `GROQ_API_KEY` is not configured.

## Observability And Hosting

- Vercel is the hosting target; `.vercel/project.json` exists, so the local repo is linked to a Vercel project.
- `src/app/layout.tsx` enables Vercel Analytics and Speed Insights only when `process.env.VERCEL === '1'`.
- `next.config.ts` disables the powered-by header and adds security headers.

## Important Scripts

- `npm run dev`: local Next dev server.
- `npm run build`: production build.
- `npm run typecheck`: TypeScript validation.
- `npm run lint`: ESLint.
- `npm run verify:release`: typecheck, Vitest, benchmark gate, build, Playwright smoke.
- `npm run readiness:local`, `npm run readiness:deploy`, `npm run readiness:backend`: operational readiness gates.
- `npm run benchmark:gate`: deterministic benchmark and coverage gate.
- `npm run verify:community`: focused community verification suite.

## Key Dependencies

- `next`, `react`, `react-dom`
- `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, `pg`
- `next-auth`, `@auth/drizzle-adapter`
- `zod`, `drizzle-zod`, `@t3-oss/env-nextjs`
- `next-safe-action`
- `openai`
- `@vercel/analytics`, `@vercel/speed-insights`
- `vitest`, `@playwright/test`

## Notes For Planning

- The browser-first product is much further along than production monetization.
- Community entitlements already exist as inactive scaffolding, so monetization should build on `src/lib/community-entitlements.ts` and `src/lib/community-access.ts`.
- Production readiness should respect the existing readiness scripts instead of inventing a parallel checklist.
