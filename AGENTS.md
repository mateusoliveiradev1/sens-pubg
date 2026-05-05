# AGENTS.md

## Project

Sens PUBG is a live Next.js product for PUBG spray analysis, coaching, history, community, and monetization preparation.

## Current GSD Focus

The active roadmap is in `.planning/ROADMAP.md`.

Current phase: Phase 1 - Measurement Truth Contract.

Read before planning or implementation:

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/TESTING.md`
- `.planning/codebase/CONCERNS.md`

## Engineering Rules

- Preserve the browser-first analysis path unless a phase explicitly changes that.
- Do not claim perfect sensitivity or guaranteed improvement.
- Any analysis/coach change must keep confidence, coverage, and inconclusive behavior honest.
- Functional changes to analysis, sensitivity, tracking, diagnostics, or coach need targeted tests and relevant golden/benchmark checks.
- Monetization must sell original clip analysis, coach workflow, history, programs, and team workflow value; do not make PUBG API-derived data an exclusive paid feature.

## Validation Defaults

For analysis/coach work:

- `npm run typecheck`
- `npx vitest run`
- `npm run benchmark:gate`

For release/payment/community work, add the focused scripts from `package.json` and the relevant Playwright checks.
