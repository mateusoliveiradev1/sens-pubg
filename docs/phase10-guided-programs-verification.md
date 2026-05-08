# Phase 10 Guided Programs Verification

This document records the evidence contract for Phase 10: Guided Pro Training Programs. It does not claim perfect sensitivity, guaranteed improvement, guaranteed rank, a global player grade, or official PUBG/KRAFTON affiliation.

## Scope

Phase 10 delivers Ciclo Pro and Ciclo de Reparo as guided training programs:

- typed program cycles, lines, weeks, missions, checkpoints, transition events, and evidence summaries;
- repair, consolidation, compatible validation, no clear change, regression, fatigue, discomfort, stale context, missed days, line restart, and completed-cycle states;
- privacy-minimal persistence for owned user cycles;
- Free preview with one real next mission and Pro projection for the full 30-day map;
- dashboard cockpit, history audit, Spray Lab execution handoff, Analyze validation handoff, and coach memory handoff;
- copy safety, golden scenarios, browser evidence, and a dedicated final verifier.

Community, team workflow, leaderboards, payments, and monetization experiments beyond original program value remain out of scope. PUBG API-derived data is not treated as an exclusive paid feature.

## Evidence Hierarchy

Program evidence is intentionally bounded:

- Spray Lab execution and drills are execution evidence;
- compatible validation clips are the technical proof path;
- TDM or real-match transfer remains practical transfer only;
- progress validation requires compatible evidence;
- weak, blocked, stale, incompatible, fatigued, or discomfort evidence must route to repair, pause, reentry, or inconclusive states without inventing progress.

## Commands

Required final gates:

```bash
npm run typecheck
npx vitest run
npm run benchmark:gate
npm run verify:phase10:programs
npm run build
```

Focused Phase 10 checks:

```bash
npx vitest run src/core/training-programs.test.ts src/actions/training-programs.test.ts src/lib/training-program-projection.test.ts src/app/ciclo-pro/page.contract.test.ts src/app/ciclo-pro/ciclo-pro-view-model.test.ts src/actions/dashboard.test.ts src/app/dashboard/page.contract.test.ts src/actions/history.test.ts src/app/history/page.contract.test.ts src/app/history/[id]/page.contract.test.ts src/core/training-program-coach-handoff.test.ts src/core/coach-golden-scenarios.test.ts src/core/copy-safety.test.ts src/ci/phase10-programs-evidence.test.ts
```

Browser evidence command:

```bash
npx playwright test e2e/phase10.programs.spec.ts # PASS, 4 tests
```

Browser evidence covers desktop and mobile:

- `/ciclo-pro` no-analysis and Free locked states;
- Pro state matrix: active, repair, consolidation, validation pending, progress, no clear change, regression, fatigue, discomfort, variable changed, stale context, missed days, line restart, and completed;
- dashboard compact Ciclo Pro cockpit;
- history list and history detail audit;
- Spray Lab handoff route;
- Analyze validation handoff route.

Screenshot artifacts:

- `test-results/phase10-no-analysis-desktop.png`
- `test-results/phase10-no-analysis-mobile.png`
- `test-results/phase10-free-locked-desktop.png`
- `test-results/phase10-free-locked-mobile.png`
- `test-results/phase10-state-active-desktop.png`
- `test-results/phase10-state-active-mobile.png`
- `test-results/phase10-state-repair-desktop.png`
- `test-results/phase10-state-repair-mobile.png`
- `test-results/phase10-state-consolidation-desktop.png`
- `test-results/phase10-state-consolidation-mobile.png`
- `test-results/phase10-state-validation-pending-desktop.png`
- `test-results/phase10-state-validation-pending-mobile.png`
- `test-results/phase10-state-progress-desktop.png`
- `test-results/phase10-state-progress-mobile.png`
- `test-results/phase10-state-no-clear-change-desktop.png`
- `test-results/phase10-state-no-clear-change-mobile.png`
- `test-results/phase10-state-regression-desktop.png`
- `test-results/phase10-state-regression-mobile.png`
- `test-results/phase10-state-fatigue-desktop.png`
- `test-results/phase10-state-fatigue-mobile.png`
- `test-results/phase10-state-discomfort-desktop.png`
- `test-results/phase10-state-discomfort-mobile.png`
- `test-results/phase10-state-variable-changed-desktop.png`
- `test-results/phase10-state-variable-changed-mobile.png`
- `test-results/phase10-state-stale-context-desktop.png`
- `test-results/phase10-state-stale-context-mobile.png`
- `test-results/phase10-state-missed-days-desktop.png`
- `test-results/phase10-state-missed-days-mobile.png`
- `test-results/phase10-state-line-restarted-desktop.png`
- `test-results/phase10-state-line-restarted-mobile.png`
- `test-results/phase10-state-completed-desktop.png`
- `test-results/phase10-state-completed-mobile.png`
- `test-results/phase10-dashboard-desktop.png`
- `test-results/phase10-dashboard-mobile.png`
- `test-results/phase10-history-desktop.png`
- `test-results/phase10-history-mobile.png`
- `test-results/phase10-history-detail-desktop.png`
- `test-results/phase10-history-detail-mobile.png`
- `test-results/phase10-spray-lab-handoff-desktop.png`
- `test-results/phase10-spray-lab-handoff-mobile.png`
- `test-results/phase10-analyze-validation-desktop.png`
- `test-results/phase10-analyze-validation-mobile.png`

## Current Status

The checklist lives at `.planning/phases/10-guided-pro-training-programs/10-VERIFY-CHECKLIST.md`.

Current status is **Partially delivered** as of 2026-05-08 while final command evidence and target database re-verification are still being recorded.
