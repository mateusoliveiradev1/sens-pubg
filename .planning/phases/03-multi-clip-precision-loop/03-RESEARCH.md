# Phase 3: Multi-Clip Precision Loop - Research

**Researched:** 2026-05-05
**Status:** Ready for planning

## RESEARCH COMPLETE

Phase 3 should turn the current single-analysis truth contract into a strict, auditable multi-clip precision loop. The repo already has the right foundation: `AnalysisResult.mastery`, evidence-gated coach plans, history persistence through `analysisSessions.fullResult`, dashboard truth copy, sensitivity history convergence, and benchmark gates. The missing layer is a deterministic compatibility and trend contract that refuses loose comparisons, creates active evolution lines per strict context, records checkpoints, and exposes only evidence-backed progress/regression language.

## Current State

- Phase 1 added `AnalysisResult.mastery` and `src/core/measurement-truth.ts`, separating mechanical score from evidence-gated actionable score.
- Phase 1 dashboard work already prevents weak positive deltas from being called progress.
- Phase 2 added truth-aware benchmark expectations, `benchmark:release`, and stricter captured clip promotion.
- `src/actions/history.ts` already fetches prior sessions, normalizes patch version, filters by weapon/scope/patch, applies sensitivity history convergence, builds coach memory, builds `coachPlan`, recomputes mastery, and saves `fullResult`.
- `src/core/coach-memory.ts` already builds compatible memory signals, but its compatibility is looser than Phase 3 requires.
- `src/core/sensitivity-history-convergence.ts` already downgrades conflicting history and upgrades aligned history when repeated evidence exists.
- `src/actions/dashboard.ts` hydrates recent `fullResult` records and exposes latest mastery, coach next block, and recent trend evidence.
- `src/app/analyze/results-dashboard.tsx`, `src/app/history/page.tsx`, `src/app/history/[id]/page.tsx`, and dashboard view models are already good integration surfaces for a lean loop.

## Key Code Findings

### Strict Compatibility

Existing compatibility is useful but not strict enough for Phase 3:

- `saveAnalysisResult` filters prior sessions by patch, weapon, and scope before history enrichment.
- `enrichResultWithSensitivityHistory` additionally checks stance, muzzle, grip, stock, and a broad distance tolerance.
- `buildCoachMemorySnapshot` checks patch, loadout, and distance, but returns compatible if distance is missing.
- Current distance tolerance is intentionally permissive: 10m up to 35m, 15m up to 80m, 25m above 80m.

Phase 3 needs a stricter standalone compatibility module so comparisons can block on missing patch, weapon, optic/scope, stance, attachments, distance, capture quality, spray type/window, duration, cadence, and strong sensitivity changes. Loose history can still exist for non-trend context, but precise trend math must not reuse it.

### Trend Semantics

The correct primary metric is already available:

- `mastery.actionableScore` carries evidence gating.
- `mastery.pillars` provides control, consistency, confidence, and clip quality.
- `mastery.evidence` provides coverage, confidence, visible/lost frames, sample size, and usable state.
- Diagnoses and `coachPlan.primaryFocus` can explain deltas without replacing the score.

The trend resolver should compare baseline, latest clip, and a recent compatible window, then emit conservative labels:

- `baseline`
- `initial_signal`
- `in_validation`
- `validated_progress`
- `validated_regression`
- `oscillation`
- `not_comparable`
- `consolidated`

User-facing Portuguese labels can be mapped in UI view models. Internal contract should stay enum-backed.

### Active Evolution Lines

There is no active line or checkpoint persistence yet. The cleanest lean foundation is to add small normalized tables plus a JSON payload:

- `precision_evolution_lines`
- `precision_checkpoints`

This supports active line state, baseline/current session IDs, compatibility key, variable in test, next validation, valid/blocked clip summaries, and an auditable checkpoint timeline. It also avoids recomputing every line from scratch on history/dashboard reads and gives Phase 4 a stable coach handoff.

If execution finds migration risk too high, a fallback is storing derived `precisionLoop` in `analysisSessions.fullResult`, but that is weaker for active line state and blocked clip audit.

### History And Coach Handoff

The coach memory path is the right handoff point:

- Phase 3 should produce a `precisionTrend` or `precisionLoop` summary on `AnalysisResult`.
- `buildCoachMemorySnapshot` should consume strict trend evidence or at least receive strict compatible sessions from the new module.
- Coach handoff should not change Phase 4 behavior deeply yet; it should provide structured evidence and visible reasons for lowering aggressiveness when trend evidence is baseline-only, weak, conflicting, regressing, or non-comparable.

### UI Surfaces

The context assigns clear surface roles:

- Post-analysis is the main "loop felt" moment. It should show clip verdict first, then a compact trend block, then technical details.
- History is the audit surface. It should show strict compatible groups, baselines, windows, blocked clips, reasons, and checkpoint timelines.
- Dashboard is the executive surface. It should show the current principal trend, next action, and context without becoming the audit page.

Existing files fit this split:

- `src/app/analyze/results-dashboard-view-model.ts`
- `src/app/analyze/results-dashboard.tsx`
- `src/actions/dashboard.ts`
- `src/app/dashboard/dashboard-truth-view-model.ts`
- `src/actions/history.ts`
- `src/app/history/page.tsx`
- `src/app/history/[id]/page.tsx`

## Planning Implications

Phase 3 should be additive and deterministic:

1. Add strict compatibility, trend labels, dead zones, pillar deltas, blocked reasons, and active-line contracts in `src/core`.
2. Add persistence/update behavior during `saveAnalysisResult`, with hydration for stored summaries.
3. Add compact post-analysis trend UI after the verdict.
4. Add history/dashboard surfaces for compatible groups, checkpoint timeline, blocked reasons, and the current principal trend.

The plans must keep browser-first analysis intact. No server video processing is required; all multi-clip work uses stored session evidence.

## Recommended Plan Shape

### Plan 03-01: Strict Precision Trend Contract

Foundation plan. Add enum-backed contracts and a pure resolver for:

- compatibility key and blockers;
- compatible vs blocked history sessions;
- baseline / initial signal / validated progress / validated regression / oscillation / not comparable labels;
- actionable mastery deltas;
- pillar deltas and blockers;
- conservative dead zone;
- active-line and checkpoint payload types.

### Plan 03-02: Active Evolution Line Persistence And Coach Handoff

Persistence plan. Add schema/migration and server integration:

- `precision_evolution_lines` and `precision_checkpoints`;
- `saveAnalysisResult` updates strict lines after mastery/coach plan is built;
- saved `fullResult` includes compact precision trend summary;
- history hydration validates/backfills trend summary;
- coach memory consumes strict compatible evidence and trend blockers.

### Plan 03-03: Post-Analysis Trend Experience

Immediate user moment. Update analysis result view models and UI:

- compact trend block after clip verdict;
- essential deltas and blocker reasons;
- CTA `Gravar validacao compativel`;
- no giant audit report in analysis surface;
- contract/copy tests to prevent overclaiming.

### Plan 03-04: History And Dashboard Precision Surfaces

Audit and executive surfaces:

- history compatible groups and checkpoint timeline;
- blocked clips with reasons;
- dashboard current principal trend and next validation;
- dashboard copies only claim progress/regression when trend resolver allows it;
- history exposes evidence that Phase 4 coach can cite.

## Risks

- Loose compatibility would create false improvement claims. Keep strict precise-trend math separate from softer coach context.
- A one-clip comparison should never become progress. One compatible clip is baseline only; two is initial signal; three or more can validate only when evidence gates pass.
- Missing metadata must block precise trend comparison, even if older history pages can still render the clip.
- UI must present blocked trend as precision control, not product failure.
- Adding persistence tables should stay small and JSON-backed enough to avoid schema churn during this lean foundation.
- Dashboard should not reuse raw `lastSessionDelta` as progress once precision trend exists.

## Verification Recommendations

Targeted checks for execution:

- `npx vitest run src/core/precision-loop.test.ts`
- `npx vitest run src/actions/history.test.ts src/core/coach-memory.test.ts`
- `npx vitest run src/app/history/analysis-result-hydration.test.ts`
- `npx vitest run src/app/analyze/results-dashboard-view-model.test.ts src/app/analyze/results-dashboard.contract.test.ts`
- `npx vitest run src/app/dashboard/dashboard-truth-view-model.test.ts src/app/dashboard/page.contract.test.ts src/app/history/page.contract.test.ts`
- `npm run typecheck`
- `npx vitest run`
- `npm run benchmark:gate`

## Canonical Implementation References

- `.planning/phases/03-multi-clip-precision-loop/03-CONTEXT.md`
- `.planning/phases/01-measurement-truth-contract/01-CONTEXT.md`
- `.planning/phases/01-measurement-truth-contract/01-01-SUMMARY.md`
- `.planning/phases/01-measurement-truth-contract/01-03-SUMMARY.md`
- `.planning/phases/02-benchmark-expansion/02-01-SUMMARY.md`
- `src/types/engine.ts`
- `src/core/measurement-truth.ts`
- `src/actions/history.ts`
- `src/core/coach-memory.ts`
- `src/core/sensitivity-history-convergence.ts`
- `src/actions/dashboard.ts`
- `src/app/dashboard/dashboard-truth-view-model.ts`
- `src/app/analyze/results-dashboard.tsx`
- `src/app/analyze/results-dashboard-view-model.ts`
- `src/app/history/page.tsx`
- `src/app/history/[id]/page.tsx`
- `src/app/history/analysis-result-hydration.ts`
- `src/db/schema.ts`
- `docs/SDD-analise-spray.md`
- `docs/SDD-inteligencia-de-sens.md`
- `docs/SDD-coach-extremo.md`

