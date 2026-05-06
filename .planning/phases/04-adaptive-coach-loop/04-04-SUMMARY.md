---
phase: 04-adaptive-coach-loop
plan: 04
subsystem: ai-coach
tags: [coach, llm, benchmark, guardrails, adaptive-memory]

requires:
  - phase: 04-adaptive-coach-loop
    provides: 04-02 adaptive coach memory and aggressiveness
  - phase: 04-adaptive-coach-loop
    provides: 04-03 coach-loop UI surfaces
provides:
  - Copy-only LLM contract with immutable outcome and memory facts
  - Exact protocol-order LLM adapter fallback for fact drift
  - Adaptive coach benchmark expectations in the release gate
  - Copy-claim coverage for adaptive coach loop surfaces
affects: [adaptive-coach-loop, benchmark-gate, coach-llm, copy-claims]

tech-stack:
  added: []
  patterns:
    - Immutable coach facts are passed to LLM clients as context, never as writable output fields.
    - Benchmark clips can opt into adaptive coach assertions without affecting fixtures that omit them.

key-files:
  created:
    - .planning/phases/04-adaptive-coach-loop/04-04-SUMMARY.md
  modified:
    - src/core/coach-llm-contract.ts
    - src/core/coach-llm-adapter.ts
    - src/core/coach-llm-adapter.test.ts
    - src/core/analysis-result-coach-enrichment.ts
    - src/core/analysis-result-coach-enrichment.test.ts
    - src/types/benchmark.ts
    - scripts/run-benchmark.ts
    - tests/goldens/benchmark/synthetic-benchmark.v1.json
    - src/app/copy-claims.contract.test.ts
    - src/server/coach/groq-coach-client.ts

key-decisions:
  - "LLM rewrite receives immutableFacts for tier, protocol order, blockers, thresholds, outcome status, memory counts, conflicts, and precision trend, but output remains limited to copy fields."
  - "Protocol rewrites must include every protocol id in deterministic order; missing, duplicate, unknown, or reordered ids trigger deterministic fallback."
  - "Adaptive benchmark expectations live behind optional labels.expectedAdaptiveCoach so older fixtures continue to parse unchanged."

patterns-established:
  - "LLM fact preservation: schema rejects unknown output keys and adapter performs semantic id/order checks before applying copy."
  - "Benchmark adaptive assertions: expectedAdaptiveCoach compares tier, focus, protocol id, memory state, validation need, and apply blocking."

requirements-completed: [COACH-01, COACH-02, COACH-03, COACH-04, COACH-05]

duration: 18 min
completed: 2026-05-06
---

# Phase 04 Plan 04: LLM and Benchmark Hardening Summary

**Copy-only coach LLM guardrails with immutable adaptive facts and benchmark coverage for memory/conflict behavior**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-06T02:28:00Z
- **Completed:** 2026-05-06T02:46:13Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Extended the LLM input with immutable adaptive coach facts: tier, focus/protocol order, blockers, thresholds, outcome status/reasons, conflicts, memory counts, validation target, and precision trend.
- Hardened LLM application so any forbidden output field, overclaim copy, missing protocol, duplicate protocol, or reordered protocol falls back to the deterministic coach result.
- Added optional `expectedAdaptiveCoach` benchmark assertions and exercised them in the synthetic release gate, including conflict memory blocking aggressive action.
- Expanded copy-claim tests over adaptive coach surfaces to block perfect sensitivity, guaranteed improvement, rank promises, and final-verdict wording.

## Task Commits

1. **Task 1-3: LLM contract, benchmark expectations, and copy gates** - `7e7fb6b` (`feat(04-04): harden adaptive coach llm and benchmark gates`)

**Plan metadata:** pending in this summary commit.

## Files Created/Modified

- `src/core/coach-llm-contract.ts` - Adds immutable adaptive facts to LLM input and documents copy-only constraints.
- `src/core/coach-llm-adapter.ts` - Enforces exact protocol order and overclaim/English copy fallback.
- `src/core/analysis-result-coach-enrichment.ts` - Sends result-derived immutable facts into optional LLM adaptation.
- `src/types/benchmark.ts` - Adds adaptive coach context and expectation schemas.
- `scripts/run-benchmark.ts` - Compares adaptive coach expectations when present.
- `tests/goldens/benchmark/synthetic-benchmark.v1.json` - Adds adaptive coach expectations, including conflict-memory behavior.
- `src/app/copy-claims.contract.test.ts` - Expands product copy safety coverage.

## Decisions Made

LLM output stayed deliberately tiny instead of adding new writable fields. The technical facts now travel in `immutableFacts`, and any attempt to echo them back as mutations is rejected by exact-key parsing.

Benchmark adaptive checks are optional per fixture. This preserves older captured fixtures while making the synthetic gate catch regressions in tier, focus, protocol id, conflict memory, validation requirements, and apply blocking.

## Deviations from Plan

None - plan executed within the requested files and scope.

## Issues Encountered

- The local GSD config key `workflow._auto_chain_active` is not available in this install; execution continued from the filesystem plan index with no code impact.
- The first overclaim marker was too broad for negated copy containing "sem assumir como definitivo"; it was narrowed to block actual final-verdict claims while preserving honest validation-first copy.

## Verification

- `npx vitest run src/core/coach-llm-adapter.test.ts src/core/analysis-result-coach-enrichment.test.ts src/app/copy-claims.contract.test.ts` - PASS, 24 tests
- `npm run typecheck` - PASS
- `npx vitest run` - PASS, 125 files / 684 tests
- `npm run benchmark:gate` - PASS

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 4 now has durable outcome persistence, adaptive memory/aggressiveness, UI surfaces, LLM fact preservation, copy guardrails, and release benchmark coverage. Ready for phase verification and roadmap completion.

---
*Phase: 04-adaptive-coach-loop*
*Completed: 2026-05-06*
