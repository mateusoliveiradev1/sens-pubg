# Phase 9 Spray Lab Verification

This document records the evidence contract for Phase 9: PUBG Spray Lab Session Runner And Benchmark. It does not claim perfect sensitivity, guaranteed improvement, guaranteed rank, a global skill score, or official PUBG/KRAFTON affiliation.

## Scope

Phase 9 delivers the Spray Lab runner and its measurement truth contract:

- lane/session contracts for guided drills;
- fidelity scoring and contextual index snapshots;
- persisted sessions, events, validation links, and benchmark snapshots;
- Free basic runner and Pro audit/benchmark projection;
- Analyze validation preload and repair-aware blocked states;
- dashboard/history/coach handoff continuity;
- benchmark truth, goldens, copy safety, and a dedicated verifier.

Phase 10 remains out of scope. This phase does not add community/team workflow, public leaderboards, broader monetization experiments, or claims based on PUBG API-derived data as an exclusive paid feature.

## Evidence Hierarchy

Spray Lab evidence is intentionally bounded:

- session execution and fidelity are execution evidence;
- compatible validation clips are the technical proof path;
- TDM/real-match records are practical transfer only;
- practice-only, blocked, inconclusive, or incompatible evidence must remain visible as repair or partial evidence;
- validated context scores require compatible validation plus benchmark-eligible fidelity.

The benchmark runner now supports optional `expectedTruth.sprayLab` fixtures with lane, fidelity, evidence level, index state, validation status, benchmark snapshot status, repair state, and entitlement projection. Fixtures without `sprayLab` remain valid. Fixtures that mark provisional Lab evidence as validated fail by truth mismatch.

## Commands

Required final gates:

```bash
npm run typecheck                         # PASS
npx vitest run                            # PASS
npm run benchmark:gate                    # PASS
npm run verify:phase9:spray-lab           # PASS
npm run build                             # PASS
```

Focused Phase 9 checks:

```bash
npx vitest run src/core/spray-lab-coach-handoff.test.ts src/core/coach-golden-scenarios.test.ts src/core/copy-safety.test.ts src/core/benchmark-runner.test.ts src/ci/phase9-spray-lab-evidence.test.ts
```

Browser evidence target:

- desktop and mobile `/spray-lab` runner;
- desktop and mobile dashboard active Spray Lab command;
- desktop and mobile history list and history detail Spray Lab audit;
- desktop and mobile Analyze validation mode with Lab context;
- desktop and mobile repair/blocked state.

Browser evidence command:

```bash
npx playwright test e2e/phase9.spray-lab.spec.ts # PASS, 2 tests
```

Screenshot artifacts:

- `test-results/phase9-spray-lab-runner-desktop.png`
- `test-results/phase9-spray-lab-runner-mobile.png`
- `test-results/phase9-analyze-validation-desktop.png`
- `test-results/phase9-analyze-validation-mobile.png`
- `test-results/phase9-dashboard-desktop.png`
- `test-results/phase9-dashboard-mobile.png`
- `test-results/phase9-history-desktop.png`
- `test-results/phase9-history-mobile.png`
- `test-results/phase9-history-detail-desktop.png`
- `test-results/phase9-history-detail-mobile.png`
- `test-results/phase9-repair-desktop.png`
- `test-results/phase9-repair-mobile.png`

## Current Status

The checklist lives at `.planning/phases/09-pubg-spray-lab-session-runner-and-benchmark/09-VERIFY-CHECKLIST.md`.

Current status is **Delivered** as of 2026-05-08. All checklist rows are PASS, the final typecheck/Vitest/benchmark/build/verifier gates pass, and desktop/mobile Playwright evidence covers runner, validation, dashboard, history, history detail, and repair states.
