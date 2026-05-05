---
title: Testing
mapped_at: 2026-05-05
last_mapped_commit: 2e43aa873e6577285138ef3726bbe888cf75f029
---

# Testing

## Test Stack

- Vitest is configured in `vitest.config.ts`.
- Playwright is configured in `playwright.config.ts`.
- TypeScript validation uses `npm run typecheck`.
- ESLint uses the Next.js flat config in `eslint.config.mjs`.
- CI is defined in `.github/workflows/ci.yml`.

## Unit And Integration Tests

Vitest includes:

- `src/**/*.test.ts`
- `src/**/*.test.tsx`

At mapping time, `rg` found 117 source test files under `src`.

High-coverage areas:

- `src/core`: analysis, diagnostics, tracking, coach, community view models.
- `src/game/pubg`: math/catalog behavior.
- `src/lib`: access/entitlement/rate-limit policies.
- `src/actions`: community/profile/history/admin action behavior.
- `src/app`: page contract tests for dashboard, analyze, history, community, and copy claims.

## E2E Tests

Playwright tests live in `e2e`.

At mapping time, `rg` found 10 `*.spec.ts` files under `e2e`.

Covered flows include:

- Auth: `e2e/auth.spec.ts`
- Accessibility: `e2e/a11y.spec.ts`
- Pages/responsive checks: `e2e/pages.spec.ts`, `e2e/responsive.spec.ts`
- Community publish/feed/comments/admin/visual flows.

The Playwright config can start the dev server automatically depending on `src/ci/playwright-runtime.ts`.

## Golden And Benchmark Testing

Golden/benchmark fixtures live under:

- `tests/goldens/benchmark`
- `tests/goldens/coach`
- `tests/goldens/diagnostic`
- `tests/goldens/tracking`
- `tests/fixtures/captured-clips`

Important scripts:

- `npm run benchmark`
- `npm run benchmark:captured`
- `npm run benchmark:all`
- `npm run benchmark:gate`
- `npm run validate:benchmark-coverage`
- `npm run validate:sdd-coverage`

These protect the core product claim: analysis and coaching must stay evidence-backed.

## Release Verification

Main release command:

- `npm run verify:release`

This runs:

- `npm run typecheck`
- `npx vitest run`
- `npm run benchmark:gate`
- `npm run build`
- `npm run smoke:local`

Community-focused command:

- `npm run verify:community`

This runs typecheck, community unit tests, build, community E2E, and community visual tests.

## Readiness Checks

Operational readiness is implemented in:

- `src/core/release-readiness.ts`
- `scripts/check-release-readiness.ts`

Commands:

- `npm run readiness:local`
- `npm run readiness:deploy`
- `npm run readiness:backend`

The readiness model checks runtime env, public app URL, auth URL, Vercel link, and ffmpeg availability.

## CI Pipeline

`.github/workflows/ci.yml` has three jobs:

- `quality`: install, typecheck, Vitest, benchmark gate.
- `build`: production build with placeholder CI env.
- `e2e`: Postgres service, Drizzle push, seed, Playwright smoke.

Node version is pinned through workflow env as Node 20.

## Test Data And Seeds

- `src/db/seed.ts` prepares DB seed data.
- `src/db/weapon-profile-seed.ts` handles weapon profiles.
- E2E cleanup helper: `e2e/community-seed-cleanup.ts`.
- Captured clip fixtures and labels live under `tests/fixtures/captured-clips`.

## Testing Guidance For GSD Phases

- Production readiness phases should run `npm run verify:release` when feasible.
- Deployment phases should run `npm run readiness:deploy` and a smoke against the published URL.
- Monetization phases should add focused tests around `src/lib/community-entitlements.ts`, `src/lib/community-access.ts`, billing webhook handling, and premium enforcement states.
- Analysis engine changes should include golden/benchmark checks, not just unit tests.
