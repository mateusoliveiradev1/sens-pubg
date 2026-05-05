---
title: Structure
mapped_at: 2026-05-05
last_mapped_commit: 2e43aa873e6577285138ef3726bbe888cf75f029
---

# Structure

## Root Layout

- `package.json`: scripts, dependencies, lint-staged.
- `package-lock.json`: npm lockfile.
- `next.config.ts`: Next config, image remotes, headers, dev dist dir.
- `tsconfig.json`: strict TypeScript and path aliases.
- `vitest.config.ts`: unit/integration test config.
- `playwright.config.ts`: E2E config and local dev server behavior.
- `drizzle.config.ts`: Drizzle Kit configuration.
- `.github/workflows/ci.yml`: CI pipeline.
- `.husky/pre-commit`: lint-staged and TypeScript pre-commit checks.
- `.env.example`: documented runtime env keys.

## Source Directories

- `src/actions`: server actions for auth/profile/history/dashboard/community/admin/settings/setup.
- `src/app`: App Router pages, layouts, API routes, CSS modules, page-local client components.
- `src/ci`: runtime helpers and CI-specific tests.
- `src/core`: deterministic product algorithms and view-model builders.
- `src/db`: schema, DB client, seed, audit logging.
- `src/game`: PUBG domain data and math.
- `src/i18n`: translation system and locale files.
- `src/lib`: shared policy/helpers for safe actions, rate limits, community access, entitlements, progression recording.
- `src/server`: server-only provider clients, currently coach/Groq.
- `src/types`: cross-layer TypeScript contracts.
- `src/ui`: shared UI components.
- `src/workers`: Web Worker entry and session logic.

## Main Routes

Pages found under `src/app`:

- `/`: `src/app/page.tsx`
- `/analyze`: `src/app/analyze/page.tsx`
- `/dashboard`: `src/app/dashboard/page.tsx`
- `/history`: `src/app/history/page.tsx`
- `/history/[id]`: `src/app/history/[id]/page.tsx`
- `/profile`: `src/app/profile/page.tsx`
- `/profile/settings`: `src/app/profile/settings/page.tsx`
- `/setup`: `src/app/setup/page.tsx`
- `/community`: `src/app/community/page.tsx`
- `/community/[slug]`: `src/app/community/[slug]/page.tsx`
- `/community/users/[slug]`: `src/app/community/users/[slug]/page.tsx`
- `/pros`: `src/app/pros/page.tsx`
- `/pros/[id]`: `src/app/pros/[id]/page.tsx`
- `/admin` and admin subsections under `src/app/admin`.
- `/login`, `/privacy`, `/terms`.

API routes:

- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/bot/health/route.ts`
- `src/app/api/bot/user/[discordId]/route.ts`

## Server Actions

Action files:

- `src/actions/admin.ts`
- `src/actions/auth.ts`
- `src/actions/community-admin.ts`
- `src/actions/community-comments.ts`
- `src/actions/community-copy.ts`
- `src/actions/community-follows.ts`
- `src/actions/community-likes.ts`
- `src/actions/community-posts.ts`
- `src/actions/community-profiles.ts`
- `src/actions/community-reports.ts`
- `src/actions/community-rewards.ts`
- `src/actions/community-saves.ts`
- `src/actions/community-squads.ts`
- `src/actions/dashboard.ts`
- `src/actions/history.ts`
- `src/actions/profile.ts`
- `src/actions/settings.ts`
- `src/actions/setup.ts`

Most action files have adjacent `.test.ts` coverage.

## Database And Migrations

- `src/db/schema.ts` is large and includes all schema/table declarations.
- `src/db/schema.test.ts` validates schema contracts.
- `src/db/seed.ts` and `src/db/weapon-profile-seed.ts` seed local/CI data.
- `drizzle/*.sql` contains versioned migrations.
- `drizzle/meta/*.json` and `_journal.json` track Drizzle migration metadata.

## Core Product Modules

Spray/video analysis:

- `src/core/video-ingestion.ts`
- `src/core/frame-extraction.ts`
- `src/core/spray-window-detection.ts`
- `src/core/crosshair-tracking.ts`
- `src/core/global-motion-compensation.ts`
- `src/core/optic-state-detection.ts`
- `src/core/tracking-evidence.ts`
- `src/core/spray-metrics.ts`
- `src/core/diagnostic-engine.ts`
- `src/core/sensitivity-engine.ts`
- `src/core/coach-engine.ts`

Community/domain:

- `src/core/community-discovery-view-model.ts`
- `src/core/community-public-profile-view-model.ts`
- `src/core/community-progression.ts`
- `src/core/community-rewards.ts`
- `src/core/community-squads.ts`
- `src/core/community-trust-signals.ts`
- `src/core/community-moderation.ts`

## Tests And Fixtures

- Unit/integration tests are colocated under `src/**/*.test.ts` and `src/**/*.test.tsx`.
- E2E tests live under `e2e/*.spec.ts`.
- Golden datasets live under `tests/goldens`.
- Captured clip fixtures live under `tests/fixtures/captured-clips`.

## Existing Docs

Planning/spec material exists in:

- `README.md`
- `docs/`
- `openspec/`

Important production docs include:

- `docs/launch-readiness-2026-04-17.md`
- `docs/SDD-comunidade.md`
- `docs/COMMUNITY-EXECUTION-PLAN.md`
- `docs/SDD-analise-spray.md`
- `docs/SDD-analise-de-video.md`
- `docs/SDD-coach-extremo.md`

## Naming Patterns

- App route folders follow Next App Router conventions.
- CSS modules are named by route/component domain, for example `community-hub.module.css` and `profile-dashboard.module.css`.
- Tests generally mirror implementation names, for example `community-posts.ts` and `community-posts.test.ts`.
- Path aliases from `tsconfig.json` include `@/*`, `@core/*`, `@game/*`, `@ui/*`, `@i18n/*`, `@lib/*`, and `@types/*`.
