---
phase: 06-core-accuracy-and-pro-validation-hardening
plan: 04
status: completed
completed_at: "2026-05-06T20:29:50Z"
requirements: [PREC-01, PREC-02, PREC-03, PREC-04, COACH-01, COACH-02, COACH-03, COACH-04, COACH-05]
---

# 06-04 Summary: Downstream Confidence, Coach, Sensitivity, Trend, And Quota Recalibration

## Delivered

- Added optional `analysisDecision` to `AnalysisResult` and wired the browser-first analysis path to resolve and preserve `spray-truth-v2` decisions from spray validity, metric evidence, and video quality.
- Augmented saved video quality reports with spray validity, validity blockers, and recapture guidance so audit payloads retain why a clip was blocked or limited.
- Made measurement truth decision-aware: invalid/recapture decisions map to `capture_again`, partial reads map to `inconclusive`, usable reads cannot become `ready`, and blocker reasons are surfaced in `blockedRecommendations`.
- Made diagnostics return only `inconclusive` for `blocked_invalid_clip`, `inconclusive_recapture`, and `partial_safe_read`, while preserving existing behavior for usable and strong analyses.
- Gated sensitivity tiers by decision permissions: below usable returns `capture_again` with weak evidence and `decisionLevel=...`; usable permits `test_profiles` but not `apply_ready`; strong analysis remains necessary for apply-ready behavior.
- Added `analysis_decision.<level>` coach signals and made coach tier selection block `apply_protocol` unless the analysis is `strong_analysis` plus existing compatible validation.
- Added precision blockers for `engine_version_mismatch` and `decision_level_insufficient`, blocking Phase 6 trend math below usable and preventing silent mixing of legacy and new truth contracts.
- Preserved legacy history hydration without `analysisDecision`, while validating and retaining decision payloads when present.
- Updated quota save behavior so decisions that do not count as useful analysis are saved as audit evidence without consuming useful-result quota.
- Exposed decision-level blocker copy through the existing result verdict model without adding a new visual surface.

## Key Files

- `src/types/engine.ts`
- `src/app/analyze/analysis-client.tsx`
- `src/core/measurement-truth.ts`
- `src/core/diagnostic-engine.ts`
- `src/core/sensitivity-engine.ts`
- `src/core/coach-signal-extractor.ts`
- `src/core/coach-plan-builder.ts`
- `src/core/precision-loop.ts`
- `src/actions/history.ts`
- `src/app/history/analysis-result-hydration.ts`
- `src/app/analyze/results-dashboard-view-model.ts`
- `src/app/analyze/analysis-client.contract.test.ts`

## Verification

- `npx vitest run src/core/analysis-decision.test.ts src/core/measurement-truth.test.ts src/core/diagnostic-engine.test.ts src/core/sensitivity-engine.test.ts src/core/coach-signal-extractor.test.ts src/core/coach-plan-builder.test.ts src/core/precision-loop.test.ts src/actions/history.test.ts src/app/history/analysis-result-hydration.test.ts src/app/analyze/results-dashboard-view-model.test.ts` PASS
- `npm run typecheck` PASS
- `npx vitest run` PASS
- `npm run benchmark:gate` PASS

## Notes

- Old saved analyses remain readable as legacy results when they do not contain `analysisDecision`.
- `usable_analysis` remains a test/protocol state, not an apply state. Strong apply actions still require `strong_analysis` plus existing evidence and compatible-history gates.
