# Phase 1: Measurement Truth Contract - Research

**Phase:** 01 - Measurement Truth Contract
**Researched:** 2026-05-05
**Status:** Ready for planning

<objective>
Answer: what do we need to know to plan Phase 1 well?

This phase should turn existing analysis, sensitivity, coach, and UI signals into one honest product truth contract. The contract must define practical spray mastery, evidence gates, user-facing action states, mechanical levels, and the first report/dashboard surfaces that consume those states without promising perfect sensitivity or guaranteed improvement.
</objective>

<scope_inputs>

## Requirements

- `PREC-01`: User can see a practical "spray mastery" score based on measured control, consistency, confidence, and clip quality.
- `PREC-02`: User can see confidence, coverage, visible frames, lost frames, and inconclusive states for every analysis result.
- `PREC-04`: System can block or downgrade recommendations when clip evidence is too weak.

## Locked Phase Decisions

The phase context defines 42 trackable decisions. The most implementation-shaping decisions are:

- D-01 through D-08: spray mastery means reliable action, exposes four pillars, caps actionable score with weak evidence, and uses `Capturar de novo`, `Incerto`, `Testavel`, `Pronto` plus mechanical levels `Inicial`, `Intermediario`, `Avancado`, `Elite`.
- D-09 through D-12: weak evidence blocks strong decisions; 60% confidence/coverage is the baseline for leaving capture-again and reaching testable behavior; `Pronto` needs strong evidence plus compatible repetition.
- D-13 through D-17 and D-34 through D-38: recommendations are test protocols with executable training blocks, future program shape, and no weak progress claims.
- D-18 through D-27: analysis result should become a premium clip report with verdict and next block first, visualization as proof, and technical evidence second.
- D-28 through D-33: dashboard should prioritize next training action and combine progress with evidence.
- D-39 through D-42: final state taxonomy and friendly diagnosis names must be centralized.

</scope_inputs>

<code_findings>

## Existing Strengths To Reuse

- `src/types/engine.ts` already carries most raw inputs needed for the truth contract:
  - `SprayMetrics.sprayScore`, `stabilityScore`, `consistencyScore`, `verticalControlIndex`, `horizontalNoiseIndex`.
  - `MetricEvidenceQuality` and per-metric `metricQuality` with `coverage`, `confidence`, `sampleSize`, `framesTracked`, `framesLost`, `framesProcessed`.
  - `SprayPhaseQuality` for burst/sustained/fatigue evidence.
  - `SensitivityRecommendation.tier`, `evidenceTier`, `confidenceScore`.
  - `CoachPlan.tier`, `primaryFocus`, `secondaryFocuses`, `nextBlock`, `stopConditions`.
- `src/core/spray-metrics.ts` already computes `metricQuality` from visible/lost frames, disturbance penalty, reacquisition penalty, and fallback summary confidence. It also emits phase-specific evidence for burst/sustained/fatigue.
- `src/core/diagnostic-engine.ts` already returns an `inconclusive` diagnosis when `sprayScore` or `verticalControlIndex` evidence falls below coverage/confidence thresholds, and evidence-adjusts severity.
- `src/core/sensitivity-engine.ts` already uses a 0.6 minimum actionable evidence threshold and prevents `apply_ready` unless evidence is strong and repeated across clips.
- `src/core/coach-plan-builder.ts` already maps weak capture to `capture_again`, partial evidence to `test_protocol`, inconsistent evidence to `stabilize_block`, and repeated strong evidence to `apply_protocol`.
- `src/app/analyze/tracking-summary.ts` already summarizes confidence, coverage, visible/lost frames, status counts, effective spray window, and reacquisition details for single or aggregated sessions.
- `src/app/analyze/results-dashboard.tsx` already renders video quality, tracking transparency, metrics, visualization, sensitivity, and coach plan, but the current hierarchy starts with badges/subsessions/evidence rather than the verdict + next block first.
- `src/actions/history.ts` persists `fullResult`, adds coach plans server-side, and applies sensitivity history convergence before storage. History hydration already normalizes legacy sensitivity/coach plan metadata.
- `src/app/dashboard/page.tsx` already has an executive/dashboard direction with next action, trends, arsenal, and `WeaponIcon`, but its scores are still raw `sprayScore`/`stabilityScore` averages without the Phase 1 truth contract or evidence gating.

## Important Existing Tests

- `src/core/spray-metrics.test.ts` covers metric quality propagation, phase quality, disturbance/reacquisition penalties, and shot residuals.
- `src/core/sensitivity-engine.test.ts` verifies `capture_again` for weak evidence, `test_profiles` for strong single clips, `apply_ready` only after repeated strong evidence, and reasoning contains objective evidence variables.
- `src/core/coach-plan-builder.test.ts` verifies coach tiers, blockers, next blocks, PT-BR copy, stop conditions, and memory effects.
- `src/app/analyze/tracking-summary.test.ts` verifies tracking coverage/confidence, aggregate summaries, effective windows, and reacquisition.
- `src/app/analyze/results-dashboard.contract.test.ts` and `src/app/analyze/results-dashboard-view-model.test.ts` verify current UI contracts around visualization, sensitivity summaries, coach details, video quality, tracking timeline, and metric cards.
- `src/app/dashboard/page.contract.test.ts` verifies dashboard executive sections and weapon icons.
- `src/app/copy-claims.contract.test.ts` protects product copy against perfect/guaranteed claims and requires confidence/coverage/limits in user-facing help.
- `tests/goldens/*` plus `npm run benchmark:gate` protect tracking, diagnostics, coach, and captured benchmark coverage.

## Main Gaps

1. There is no shared `SprayMastery` or `MeasurementTruth` contract in `src/types/engine.ts`.
2. `sprayScore` is currently a mechanical composite in `src/core/spray-metrics.ts` with fixed weights: stability 40%, normalized vertical control 40%, consistency 20%. It does not expose control/consistency/confidence/clip-quality pillars and does not cap actionable score under weak evidence.
3. Sensitivity and coach tiers are close to the required action states, but naming is not centralized and `apply_protocol`/`apply_ready` need product-safe mapping to `Pronto` without claiming final proof from one clip.
4. Friendly diagnosis names are duplicated or absent across UI surfaces. `results-dashboard.tsx` still contains uppercase technical labels such as `UNDERPULL`, `OVERPULL`, `JITTER`, and `H. DRIFT`.
5. `AnalysisClient` aggregates multi-spray `finalMetrics` by spreading the first sub-session metrics and overriding numeric fields, which can leave `metricQuality`, `phaseQuality`, and `shotResiduals` from the first sub-session attached to aggregate metrics. The truth contract should either compute aggregate evidence explicitly or treat aggregate evidence from `summarizeAnalysisTracking`.
6. Dashboard currently derives improvement from raw score averages and deltas. It does not know whether evidence was strong enough to claim improvement, and `getDashboardStats` does not expose the full-result evidence fields needed for Phase 1 gating.
7. Existing analysis UI has useful evidence but too much of it leads the experience. Phase 1 should add a report header/hero that states action, mastery, mechanical level, next block, and evidence confidence before the audit details.

</code_findings>

<recommended_architecture>

## Shared Truth Contract

Create a small deterministic core module, likely `src/core/measurement-truth.ts`, and export it from `src/core/index.ts`.

Recommended types in `src/types/engine.ts`:

- `SprayActionState = 'capture_again' | 'inconclusive' | 'testable' | 'ready'`
- `SprayActionLabel = 'Capturar de novo' | 'Incerto' | 'Testavel' | 'Pronto'`
- `SprayMechanicalLevel = 'initial' | 'intermediate' | 'advanced' | 'elite'`
- `SprayMechanicalLevelLabel = 'Inicial' | 'Intermediario' | 'Avancado' | 'Elite'`
- `SprayMasteryPillars` with `control`, `consistency`, `confidence`, `clipQuality`
- `SprayMasteryEvidence` with `coverage`, `confidence`, `visibleFrames`, `lostFrames`, `framesProcessed`, `qualityScore`, `usableForAnalysis`, `sampleSize`
- `SprayMastery` with `actionState`, `actionLabel`, `mechanicalLevel`, `mechanicalLevelLabel`, `actionableScore`, `mechanicalScore`, `pillars`, `evidence`, `reasons`, `blockedRecommendations`
- Optional `AnalysisResult.mastery?: SprayMastery`

This keeps the truth state attached to each analysis result and available to results UI, history, community snapshots, dashboard, and later monetization gates.

## Scoring Rules

Use the current `sprayScore` as a mechanical input, but make a clear separation:

- `mechanicalScore`: observed mechanics before evidence capping.
- `actionableScore`: what the product can safely act on after evidence gates.
- Pillar `control`: based on normalized vertical control, horizontal noise/linear error severity, and/or current sprayScore control signal.
- Pillar `consistency`: based on `consistencyScore` and phase stability.
- Pillar `confidence`: based on metric quality confidence, tracking overview confidence, diagnosis/sensitivity confidence.
- Pillar `clipQuality`: based on `VideoQualityReport.overallScore` plus usable/blocking reasons.

Baseline gates should follow context and current engine conventions:

- If `usableForAnalysis === false`, sensitivity tier is `capture_again`, or coverage/confidence is below 0.6: `actionState = capture_again` or `inconclusive`, block aggressive recommendations, and cap actionable score below the testable range.
- If coverage/confidence are at least 0.6 but not strong: `testable`.
- `ready` should require strong evidence and compatible repetition. In this phase, use existing `SensitivityRecommendation.tier === 'apply_ready'` and/or coach tier `apply_protocol` plus strong evidence. Avoid presenting ready as final proof.

## State Mapping

Recommended mapping to user labels:

- `capture_again` -> `Capturar de novo`: capture/video/tracking blocks action.
- `inconclusive` -> `Incerto`: enough signal to explain, not enough for a strong decision.
- `testable` -> `Testavel`: user can run a protocol and validate on next clip.
- `ready` -> `Pronto`: evidence supports applying a protocol, still with validation language.

Recommended mechanical level thresholds should be conservative and evidence-aware:

- `Inicial`: mechanicalScore < 40.
- `Intermediario`: 40-64.
- `Avancado`: 65-84.
- `Elite`: >= 85, but only display as `Elite` when evidence is strong enough; otherwise show the potential/mechanical score with a reason that evidence limits the action state.

## UI Consumption

Analysis report:

- First fold should be a verdict report: action state, actionable score, mechanical level, next block, and evidence badges.
- Put four pillars immediately below: control, consistency, confidence, clip quality.
- Put spray visualization next as proof.
- Keep diagnosis, sensitivity, coach, tracking, video quality, and timelines as layered audit detail below.
- Replace technical diagnosis labels with centralized friendly PT-BR labels in visible UI.

Dashboard:

- Keep the executive direction, but derive "next action" from latest result mastery/coach plan when available.
- Treat progress deltas as evidence-gated. If recent sessions have weak evidence, say the trend needs validation rather than "improved".
- Extend `getDashboardStats` to read recent `fullResult` fields needed for latest mastery/action and evidence summary, without introducing server video processing.

</recommended_architecture>

<planning_recommendation>

## Recommended Plan Split

Plan 01 - Core Measurement Truth Contract

- Add shared types and deterministic resolver.
- Attach mastery to `AnalysisResult` during analysis and server persistence/hydration.
- Cover score pillars, evidence caps, state mapping, diagnosis labels, and recommendation blocking with focused tests.

Plan 02 - Premium Analysis Report Surface

- Refactor `ResultsDashboard` around the new mastery verdict and next block first.
- Keep existing visualization/evidence sections but move them into the narrative order.
- Update view-model/contract tests and protect against technical labels in primary UI.

Plan 03 - Dashboard Truth Cockpit

- Extend dashboard stats with latest truth/coach evidence and evidence-gated trend language.
- Update dashboard next action/progress copy to respect weak evidence and inconclusive states.
- Add focused dashboard/action tests.

All three plans need the default validation stack:

- `npm run typecheck`
- focused Vitest tests for touched files
- `npx vitest run`
- `npm run benchmark:gate`

</planning_recommendation>

<risks>

- Avoid formula churn that breaks benchmark expectations without a deliberate baseline update. Prefer adding a new mastery contract while preserving existing raw `sprayScore` semantics.
- Avoid broad UI rewrites that lose existing evidence details; this phase changes hierarchy and truth labels, not the whole analysis pipeline.
- Avoid storing derived truth only in UI. It must be a core/domain contract so history, dashboard, coach, and monetization can reuse it.
- Avoid treating `Pronto` as guaranteed or final. Copy must keep validation language.
- Watch aggregate sessions: do not attach first sub-session evidence to aggregate mastery without explicit aggregation.
</risks>

<verification_guidance>

Focused checks for execution:

- `npx vitest run src/core/spray-metrics.test.ts src/core/sensitivity-engine.test.ts src/core/coach-plan-builder.test.ts`
- `npx vitest run src/app/analyze/tracking-summary.test.ts src/app/analyze/results-dashboard-view-model.test.ts src/app/analyze/results-dashboard.contract.test.ts`
- `npx vitest run src/app/dashboard/page.contract.test.ts src/app/copy-claims.contract.test.ts`
- `npm run typecheck`
- `npx vitest run`
- `npm run benchmark:gate`

</verification_guidance>

## RESEARCH COMPLETE
