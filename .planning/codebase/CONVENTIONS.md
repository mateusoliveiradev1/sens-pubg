---
title: Conventions
mapped_at: 2026-05-05
last_mapped_commit: 2e43aa873e6577285138ef3726bbe888cf75f029
---

# Conventions

## TypeScript

- Strict TypeScript is expected.
- `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, and `noFallthroughCasesInSwitch` are enabled.
- Domain values are often expressed through narrow string unions and exported types.
- Shared cross-layer contracts live in `src/types`.
- Prefer existing path aliases over long relative imports.

## React And Next.js

- Server Components are the default for pages.
- Client Components use `'use client'` explicitly, for example `src/app/analyze/analysis-client.tsx`.
- Server actions use `'use server'` at the file level.
- Page-level metadata is exported from route files where needed.
- `dynamic = 'force-dynamic'` is used when pages need fresh DB/session state.

## Server Actions

- Authenticated actions usually call `auth()` directly or use `authActionClient`.
- Community actions return explicit success/error objects rather than throwing for expected user errors.
- Actions commonly call `revalidatePath` after mutations.
- Rate limiting for community actions goes through `checkCommunityActionRateLimit` in `src/lib/rate-limit.ts`.

## Database

- Schema changes should start in `src/db/schema.ts` and have a matching migration in `drizzle/`.
- Contract tests in `src/db/schema.test.ts` are used to lock schema expectations.
- Drizzle query style is used throughout server actions and core data access.
- Local/CI Postgres and remote Neon are both supported through `src/db/client.ts`.

## Analysis Pipeline

- Deterministic logic belongs in `src/core`.
- PUBG-specific constants and math belong in `src/game/pubg`.
- Browser/worker orchestration belongs in `src/workers` and page-local analysis files.
- LLM behavior is optional and should not alter deterministic facts, thresholds, tiers, or evidence.

## Testing Style

- Tests are colocated near source modules.
- The project has strong unit test density in `src/core`, `src/game`, `src/lib`, `src/actions`, and page contracts.
- E2E tests live in `e2e`.
- Benchmark/golden tests are part of the product safety net, not optional extras.
- Docs say functional changes should follow RED, GREEN, refactor for planned work.

## Styling

- Global design tokens live in `src/app/globals.css`.
- CSS modules are used for page/component-specific layouts.
- Tailwind is available but not the only styling mechanism.
- The current visual language is dark, PUBG-inspired, orange/cyan accented, glass-card heavy.
- Shared shell/navigation lives in `src/ui/components/header.tsx`, `mobile-nav.tsx`, `user-dropdown.tsx`, and `footer.tsx`.

## Copy And Locale

- Default language is `pt-BR`.
- Translation files exist in `src/i18n`, but many pages still contain inline Portuguese copy.
- The locale helper in `src/i18n/i18n.ts` is mutable module state; use carefully in server contexts.

## Security And Auth

- Route protection is split between `src/middleware.ts`, layouts, and action-level checks.
- Admin area is protected in `src/app/admin/layout.tsx`.
- Profile/history routes are protected in `src/middleware.ts`.
- Community moderation actions require admin session checks.
- Bot API routes require `BOT_API_KEY`.

## Operational Conventions

- Readiness checks are code-backed in `src/core/release-readiness.ts`.
- Release scripts are in `scripts/check-release-readiness.ts` and `package.json`.
- CI runs typecheck, Vitest, benchmark gate, build, and Playwright smoke.
- Pre-commit runs lint-staged and TypeScript.

## Planning Guidance

- Reuse existing docs in `docs/` and `openspec/` before adding new concepts.
- Use `docs/launch-readiness-2026-04-17.md` for production readiness phases.
- Use `docs/SDD-comunidade.md` and `docs/COMMUNITY-EXECUTION-PLAN.md` when touching monetization/community entitlements.
- Keep monetization activation separate from the already-existing inactive entitlement scaffold unless the phase explicitly unlocks billing.
