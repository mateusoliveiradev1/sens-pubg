# Phase 6: Core Accuracy And Pro Validation Hardening - Research

**Phase:** 06 - Core Accuracy And Pro Validation Hardening
**Researched:** 2026-05-06
**Status:** Ready for planning

## Research Goal

Answer: what do we need to know to plan this phase well?

Phase 6 is not a broad refactor. It is a commercial trust hardening pass for the existing browser-first spray analysis engine. The phase should improve validity detection, tracking, recoil evidence, confidence calibration, real/pro corpus provenance, and release gates without claiming perfect sensitivity or guaranteed improvement.

## Source Context

Primary inputs:

- `.planning/phases/06-core-accuracy-and-pro-validation-hardening/06-CONTEXT.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/TESTING.md`
- `.planning/codebase/CONCERNS.md`
- `AGENTS.md`

Relevant prior work:

- Phase 1 created measurement truth contracts, action states, confidence/coverage surfaces, and weak-evidence downgrades.
- Phase 2 created `benchmark:release`, captured clip promotion, release reports, captured baselines, and internal maintainer docs.
- Phase 3 created strict compatible trends and active evolution lines.
- Phase 4 created adaptive coach memory, outcome evidence, and LLM fact preservation.
- Phase 5 created useful-result quota semantics and No False Done delivery evidence.

## Codebase Findings

### Browser-first pipeline

The browser path is the product strength and must stay central:

1. `src/app/analyze/analysis-client.tsx` extracts frames around user markers.
2. `src/core/spray-window-detection.ts` tries to trim to the spray window.
3. `src/workers/aim-analyzer-session.ts` streams frames through the tracker.
4. `src/core/crosshair-tracking.ts` tracks reticle positions with centroid detection, template fallback, normalization, global motion compensation, and disturbance evidence.
5. `src/core/spray-metrics.ts` builds trajectory, residuals, metric quality, and spray metrics.
6. `src/core/diagnostic-engine.ts`, `src/core/sensitivity-engine.ts`, `src/core/coach-plan-builder.ts`, and `src/core/measurement-truth.ts` convert evidence into product decisions.
7. `src/actions/history.ts` saves results, applies history/trend/coach enrichment, and enforces useful-result quota.

Planning implication: Phase 6 should not bypass the worker pipeline or move video compute server-side. Hardening should add stricter contracts and better detectors around the current path.

### Spray window and validity are the first trust bottleneck

`src/core/spray-window-detection.ts` currently detects shot-like events from visible reticle displacement. It returns `null` when events are insufficient, but it does not yet distinguish invalid spray causes like `too_short`, `hard_cut`, `flick`, `target_swap`, `camera_motion`, `crosshair_not_visible`, or `not_spray_protocol`.

`src/app/analyze/analysis-client.tsx` falls back to the full extracted clip when no spray window is detected. That is useful for leniency, but risky for commercial truth because invalid clips can still flow into diagnosis and coach output.

Planning implication: Wave 1 should introduce an explicit validity report and decision ladder before improving downstream analysis. Invalid clips should become blocked or recapture states, not forced diagnoses.

### Tracking already has foundations to extend

`src/core/crosshair-tracking.ts` already includes:

- color and neutral reticle detection;
- ROI scoping around previous reticle position;
- template fallback during short occlusion;
- reticle reacquisition tracking;
- `ReticleExogenousDisturbance` with muzzle flash, blur, shake, and occlusion;
- optional global motion compensation through `src/core/global-motion-compensation.ts`.

Tests already cover centroid behavior, normalization, global shake compensation, muzzle flash, camera shake, decoy drift, and reacquisition. This is a good base for Phase 6.

Planning implication: do not replace the tracker wholesale. Add stronger hard-cut/flick/target-swap/camera-motion separation, trim or block bad windows, and expose evidence to metrics and benchmarks.

### Downstream decisions consume evidence but need one decision ladder

Existing contracts:

- `SprayActionState = capture_again | inconclusive | testable | ready`
- sensitivity tiers: `capture_again | test_profiles | apply_ready`
- coach tiers: `capture_again | test_protocol | stabilize_block | apply_protocol`
- precision evidence levels and compatibility blockers
- useful-result quota in Phase 5

These overlap but do not yet form the Phase 6 decision ladder:

`blocked_invalid_clip -> inconclusive_recapture -> partial_safe_read -> usable_analysis -> strong_analysis`

Planning implication: create a versioned analysis decision contract and map all downstream surfaces to it. The new contract should preserve old history readability and avoid breaking stored results.

### Corpus workflow exists but lacks formal consent/provenance rigor

Existing captured clip assets:

- `src/types/captured-clip-intake.ts`
- `src/types/captured-clip-labels.ts`
- `src/types/captured-benchmark-review-decisions.ts`
- `src/core/captured-golden-promotion.ts`
- `src/core/captured-promotion-report.ts`
- `scripts/promote-captured-clips.ts`
- `tests/fixtures/captured-clips/*`
- `tests/goldens/benchmark/captured-benchmark-draft.json`

Phase 2 already requires metadata, labels, replay, promotion reason, reviewed/golden separation, and reports. Phase 6 must add formal consent, permission withdrawal, trainability authorization, raw/private derivative rules, and review states.

Planning implication: extend current JSON schemas and promotion/report commands rather than inventing a database-backed corpus product in this phase.

### Benchmark and release gates are ready to extend

Existing gates:

- `npm run benchmark:gate`
- `npm run benchmark:release`
- `npm run validate:benchmark-coverage`
- `scripts/run-tracking-goldens.ts`
- `scripts/run-diagnostic-goldens.ts`
- `scripts/run-coach-goldens.ts`
- copy claim tests

`benchmark:release` currently composes synthetic and captured benchmark reports, coverage, and markdown report generation. Phase 6 should extend it with calibration evidence and commercial truth status instead of creating a parallel release command.

Planning implication: add calibration report generation and include it in the strict commercial gate, while keeping `benchmark:gate` as the faster daily gate.

## Implementation Research

### Recommended architecture

Create a small set of explicit contracts before changing behavior:

- `AnalysisEngineContractVersion` such as `spray-truth-v2`.
- `AnalysisDecisionLevel` with the five Phase 6 levels.
- `AnalysisBlockerReasonCode` including `too_short`, `hard_cut`, `flick`, `target_swap`, `camera_motion`, `crosshair_not_visible`, `not_spray_protocol`, `low_coverage`, and `low_confidence`.
- `AnalysisDecisionPermissionMatrix` to state display/save/quota/trend/coach/sensitivity/corpus/claim permissions by level.
- `SprayValidityReport` or equivalent to hold window, invalid reasons, trim reasons, frame counts, confidence, and recapture guidance.

Keep the old Phase 1 `SprayActionState` for compatibility, but derive it from the new ladder when present.

### Spray validity plan shape

Wave 1 should:

- extend `VideoQualityBlockingReason` and/or add separate validity reason codes;
- make spray window detection return a report, not only `SprayWindowDetection | null`;
- distinguish "no spray detected" from "invalid because cut/flick/camera/target swap";
- stop `analysis-client` from silently full-clip analyzing invalid windows;
- build a blocked/recapture result payload that can be displayed and saved as non-billable audit evidence when appropriate.

Tests should use synthetic `ImageData` frames, continuing the existing pattern from `spray-window-detection.test.ts`, `capture-quality.test.ts`, and `crosshair-tracking.test.ts`.

### Tracking/recoil hardening plan shape

Wave 2 should:

- refine `GlobalMotionEstimate` and tracking observations to classify camera movement separately from player recoil;
- add frame/window disturbance summaries;
- prevent camera shake, hard cuts, target swaps, and flicks from becoming player recoil residuals;
- expose tracking penalties through `MetricEvidenceQuality`;
- keep tracking changes benchmark-visible.

This can build on existing `ReticleExogenousDisturbance`, `TrackingFrameObservation`, `MetricEvidenceQuality`, and `TrackingEvidence`.

### Downstream recalibration plan shape

After Wave 1 and Wave 2:

- `spray-metrics.ts` should consume validity/tracking penalties when building metric quality.
- `diagnostic-engine.ts` should return blocked/inconclusive instead of a strong dominant diagnosis when decision level is below usable.
- `sensitivity-engine.ts` should block `apply_ready` unless decision level is `strong_analysis`.
- `coach-plan-builder.ts` should block `apply_protocol` unless decision level is `strong_analysis` and history supports it.
- `precision-loop.ts` should include engine version and decision level in compatibility/evidence checks.
- `history.ts` should persist the contract version and keep invalid/inconclusive results non-billable under the Phase 5 useful-result rule.

### Corpus/provenance plan shape

Extend captured corpus artifacts with:

- consent schema: contributor reference, consent date, allowed purposes, trainability authorization, redistribution/derivative scope, withdrawal status, review status;
- review workflow states from context D-06;
- permission withdrawal handling that removes active clip usage, quarantines non-public derivatives, and requires rebaseline;
- docs that explicitly ban scraping/downloading/extracting public YouTube/Twitch video features without formal permission.

Use docs and JSON fixtures first. This phase should not require building a public upload/legal portal.

### Calibration/commercial gate plan shape

Add a calibration report that compares predicted confidence and decision levels against reviewed/captured/golden expectations:

- overconfidence;
- underconfidence;
- inconclusive correctness;
- blocker accuracy;
- sensitivity safety;
- coach/training handoff safety;
- regression vs baseline.

Integrate this into `benchmark:release` or a new `npm run benchmark:commercial` wrapper only if `benchmark:release` remains the canonical strict gate. The current roadmap says commercial gates include both benchmark release and goldens; the least surprising path is to extend `benchmark:release` and add focused scripts only where needed.

## Validation Architecture

Phase 6 needs validation at four layers:

1. Focused unit tests for contracts, validity, tracking, metrics, diagnostics, sensitivity, coach, corpus schemas, promotion, calibration, and reports.
2. Golden/benchmark tests for tracking, diagnostic, coach, synthetic benchmark, captured benchmark, and commercial release behavior.
3. Copy-safety contract tests to prevent perfect sensitivity, guaranteed recoil, rank gain, guaranteed improvement, or PUBG/KRAFTON affiliation claims.
4. A final evidence matrix with command results and blocked/manual status if any commercial gate cannot run.

Recommended command ladder:

- Fast focused commands per plan:
  - `npx vitest run src/core/spray-window-detection.test.ts src/core/capture-quality.test.ts`
  - `npx vitest run src/core/crosshair-tracking.test.ts src/core/global-motion-compensation.test.ts src/core/tracking-evidence.test.ts src/core/spray-metrics.test.ts`
  - `npx vitest run src/types/captured-clip-intake.test.ts src/types/captured-clip-labels.test.ts src/core/captured-golden-promotion.test.ts src/core/captured-promotion-report.test.ts src/core/promote-captured-clips.test.ts`
  - `npx vitest run src/core/diagnostic-engine.test.ts src/core/sensitivity-engine.test.ts src/core/coach-plan-builder.test.ts src/core/measurement-truth.test.ts src/actions/history.test.ts`
  - `npx vitest run src/core/benchmark-release-report.test.ts src/ci/benchmark-workflow.test.ts src/app/copy-claims.contract.test.ts`
- Mandatory phase gates:
  - `npm run typecheck`
  - `npx vitest run`
  - `npm run benchmark:gate`
  - `npm run benchmark:release`
  - tracking, diagnostic, and coach golden commands if still exposed as standalone scripts

Nyquist implications:

- No three consecutive tasks should lack an automated verify command.
- Plans should include specific focused test files and final full gate commands.
- Any unrun commercial gate caps final status below Delivered.

## Plan Recommendation

Create six plans:

1. `06-01` - Versioned Decision Ladder And Spray Validity Contract.
2. `06-02` - Reticle Tracking, Camera Motion, Flick, And Cut Separation.
3. `06-03` - Permissioned Real/Pro Corpus And Golden Promotion Provenance.
4. `06-04` - Downstream Confidence, Coach, Sensitivity, Trend, And Quota Recalibration.
5. `06-05` - Calibration Reports And Commercial Benchmark Gate.
6. `06-06` - No False Done Evidence Matrix And Commercial Claim Safety.

Dependency shape:

- Wave 1: `06-01`
- Wave 2: `06-02` and `06-03`, both after `06-01`
- Wave 3: `06-04`, after `06-01` and `06-02`
- Wave 4: `06-05`, after `06-02`, `06-03`, and `06-04`
- Wave 5: `06-06`, after all prior plans

## Key Risks

- Engine contract changes can break stored history if not versioned.
- Invalid clip handling can become too strict and frustrate users if recapture guidance is not clear.
- Camera/flick separation can improve honesty while lowering apparent scores; baseline updates must be documented as more honest behavior.
- Corpus consent work can become legal/product scope creep; keep it as internal validation artifacts and docs.
- Commercial gates can be slow. Keep fast daily gates separate from strict commercial/release gates.

## RESEARCH COMPLETE

Research is complete and ready for planning.
