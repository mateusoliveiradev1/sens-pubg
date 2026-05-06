# Phase 6: Core Accuracy And Pro Validation Hardening - Context

**Gathered:** 2026-05-06T16:01:41.8903299-03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes the Sens PUBG spray analysis engine commercially trustworthy before stronger public launch claims. It hardens spray validity, tracking/recoil evidence, camera/flick/cut separation, confidence calibration, real/pro validation corpus, commercial benchmark gates, coach/sensitivity safety, and final evidence reporting.

The phase keeps the browser-first analysis path. It does not create a backend video-processing product, a generic aim trainer, team workflows, public legal/terms UI, or a new paid feature cut. It improves the truth foundation behind existing and future Pro value.

The user wants the most polished practical version possible: "perfection" means traceable evidence, rigorous validation, conservative confidence, clear blocker behavior, and no false commercial claims. It never means claiming perfect sensitivity, guaranteed recoil control, guaranteed rank, guaranteed improvement, or PUBG/KRAFTON affiliation.

</domain>

<decisions>
## Implementation Decisions

### Real/Pro Validation Corpus And Permission
- **D-01:** The initial validation corpus starts with permissioned clips from beta users, friends, real players, advanced players, and trusted contributors. Public streamer/pro videos are not product validation data unless explicit permission/trainability is verified.
- **D-02:** Every clip used for validation requires formal per-clip consent. Consent must capture purpose, validation/trainability authorization when applicable, contributor identity or safe contributor reference, date, redistribution scope, and review status.
- **D-03:** Metadata must be competitively complete before a clip can enter the validatable corpus: patch, map/mode when known, weapon, optic, attachments, stance, distance, sensitivity/DPI/FOV when available, FPS/resolution, capture source, duration, capture quality, spray type/protocol, and contributor/reviewer notes.
- **D-04:** Golden/commercial benchmark promotion uses two layers. First, technical screening verifies consent, metadata, quality, and spray protocol. Second, human/specialist review verifies labels, expected diagnosis, expected coach output, expected confidence, blocker reasons, and a promotion report.
- **D-05:** Public streamer/pro videos may be used only for qualitative reference, manual hypothesis generation, capture-pattern inspiration, and outreach discovery. Do not download, extract frames, measure features, train, validate, or promote them to benchmark without formal permission/trainability.
- **D-06:** Each corpus clip must move through an explicit review workflow: `intake_received` -> `consent_verified` -> `metadata_complete` -> `technical_screened` -> `label_review` -> `specialist_reviewed` -> `golden_candidate` -> `golden_promoted` or `rejected`/`deferred`. Critical transitions require a reason.
- **D-07:** Raw clips are private by default. Reports and benchmark artifacts may use clip IDs, metadata, labels, aggregate metrics, and promotion rationale. Thumbnails/frames or other derivatives are allowed only when that clip's consent explicitly permits it.
- **D-08:** Permission withdrawal uses prospective removal with quarantine and rebaseline. The raw clip leaves the active corpus, non-public derivatives are removed or quarantined, the clip stops counting in future validation, affected baselines/goldens must be recalculated or replaced, and only minimal non-sensitive audit records remain.

### Engine Hardening Priority
- **D-09:** Hardening is organized by commercial risk, not by loose component cleanup. The first work attacks the failures that most damage trust in analysis output.
- **D-10:** Wave 1 must harden spray window and validity: spray start/end, too-short sprays, hard cuts, flicks, target swaps, camera movement, invisible crosshair, and clips that are not a valid spray protocol.
- **D-11:** Invalid clips must not receive forced diagnosis. They receive a polished blocked/recapture state with explicit reason codes such as `too_short`, `hard_cut`, `flick`, `camera_motion`, `crosshair_not_visible`, and `not_spray_protocol`.
- **D-12:** Wave 2 must harden tracking/recoil with camera separation: crosshair/recoil tracking, reacquisition, lost frames, occlusion, external disturbance, camera shake, and global motion.
- **D-13:** Flicks, hard cuts, target swaps, camera shake, and external camera movement must not become "player recoil error." They reduce coverage/confidence, produce blocker reasons, may trim the valid window, or make the clip inconclusive.
- **D-14:** Tracking changes must recalibrate the entire downstream chain: spray metrics, diagnostics, sensitivity, coach, precision trends, confidence, goldens, and benchmark expectations.
- **D-15:** The analysis contract must be versioned. Old history remains readable under the old engine contract; new results use the new contract; benchmarks record engine version; baseline changes require a documented reason.

### Confidence Calibration And Inconclusive Behavior
- **D-16:** The product uses a premium conservative confidence posture. It speaks firmly only when valid spray, clean tracking, coverage, corpus/golden evidence, and compatible history support the decision.
- **D-17:** Insufficient confidence blocks strong decisions while preserving safe help. It blocks definitive sensitivity, aggressive changes, `apply_protocol`, progress/regression claims, and strong primary diagnosis. It may still show capture guidance, quality reading, blocker reasons, and safe recapture/control advice.
- **D-18:** Stronger tone requires a composed evidence bar: valid spray, high coverage/confidence, clean tracking, complete metadata, no critical blocker, and comparable golden/corpus evidence or compatible history when the claim depends on comparison.
- **D-19:** Inconclusive states must be framed as truth protection, not app failure. Copy should explain that evidence is insufficient for an honest decision, show what was detected, name what blocked the decision, and explain which next clip unlocks stronger analysis.
- **D-20:** A calibration report is mandatory. It must compare predicted confidence against real/reviewer correctness and report overconfidence, underconfidence, inconclusive correctness, blocker accuracy, sensitivity safety, coach/training handoff safety, and regression against baseline.
- **D-21:** The engine must expose an explicit decision ladder: `blocked_invalid_clip` -> `inconclusive_recapture` -> `partial_safe_read` -> `usable_analysis` -> `strong_analysis`.
- **D-22:** Each decision level needs a rigid permission matrix: what can display, what can save, what counts quota, what may enter trend/history, what coach/sensitivity actions are allowed, what may enter corpus/benchmark, and which claims are permitted.
- **D-23:** Only useful results count quota. `blocked_invalid_clip` and `inconclusive_recapture` do not count quota. `partial_safe_read` may be non-billable or light-use depending on the matrix. `usable_analysis` and `strong_analysis` count.

### Commercial Gates And Launch Claims
- **D-24:** Stronger public precision claims require a full commercial truth gate: release benchmark, permissioned corpus, reviewed goldens, calibration report, copy-safety check, evidence that inconclusive behavior is correct, and human review of key cases.
- **D-25:** If the commercial truth gate passes, copy may make strong but honest claims: more reliable analysis, validation on permissioned corpus, calibrated confidence, honest blockers for weak clips, and safer coach/sensitivity decisions. It still must not claim perfect sensitivity, guaranteed recoil, guaranteed rank, guaranteed improvement, definitive truth for every player, or PUBG/KRAFTON affiliation.
- **D-26:** Required commercial regression gates include `npm run typecheck`, `npx vitest run`, `npm run benchmark:gate`, `npm run benchmark:release`, tracking goldens, diagnostic goldens, coach goldens, captured corpus validation, calibration report, and copy claims tests.
- **D-27:** No False Done is rigid. If any mandatory commercial gate fails or cannot run, Phase 6 cannot be marked `Delivered`. Maximum status becomes `implemented, verification blocked`, `partially delivered`, or `not delivered`, with the missing gate and impact explicitly documented.
- **D-28:** Final evidence requires an evidence matrix. Each requirement, claim, and gate needs implementation evidence, test evidence, command, result, affected corpus/golden, calibration evidence, reviewer/manual evidence, status, and remaining gap.

### the agent's Discretion
The researcher/planner may choose exact module names, schema/table names, state enum names, threshold constants, calibration math, report file names, review artifact layout, and plan wave count. That discretion does not include weakening consent/provenance, allowing public videos as validation data without permission, hiding blockers, forcing diagnosis on invalid clips, letting camera/flick/cut become player recoil error, skipping engine versioning, making strong claims from weak evidence, counting invalid/inconclusive clips as useful quota, or marking the phase delivered without the required commercial gates.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning Source
- `.planning/PROJECT.md` - Core value, browser-first constraint, confidence honesty, commercial claims posture, and validated Phase 5 monetization context.
- `.planning/REQUIREMENTS.md` - Requirements mapped to Phase 6: PREC-01, PREC-02, PREC-03, PREC-04, BENCH-01, BENCH-02, BENCH-03, COACH-01, COACH-02, COACH-03, COACH-04, COACH-05.
- `.planning/ROADMAP.md` - Phase 6 goal, success criteria, public-video constraints, browser-first constraint, and launch-hardening sequence.
- `.planning/STATE.md` - Current project state, Phase 5 partial-delivery status, Phase 6 as current focus.

### Prior Phase Decisions
- `.planning/phases/01-measurement-truth-contract/01-CONTEXT.md` - Truth contract, weak-evidence downgrade, confidence/coverage/inconclusive behavior.
- `.planning/phases/02-benchmark-expansion/02-CONTEXT.md` - Benchmark/release gate decisions, captured clip promotion, baseline-update discipline.
- `.planning/phases/03-multi-clip-precision-loop/03-CONTEXT.md` - Strict compatibility, active evolution lines, trend blockers, coach/sensitivity handoff.
- `.planning/phases/04-adaptive-coach-loop/04-CONTEXT.md` - Outcome-aware coach memory, aggressiveness gates, conflict handling, LLM copy-only guardrails.
- `.planning/phases/05-freemium-pro-mvp/05-CONTEXT.md` - Pro quota truth, useful-result counting, No False Done, validation corpus/public-video constraints, closed-beta posture.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` - Browser-first analysis pipeline, worker/core flow, persistence model, admin/audit model.
- `.planning/codebase/STACK.md` - Next.js/TypeScript/Vitest/Playwright stack, optional LLM rewrite, benchmark scripts.
- `.planning/codebase/TESTING.md` - Unit, integration, golden, benchmark, release, and analysis-engine validation expectations.
- `.planning/codebase/CONCERNS.md` - Browser-first/backend video caveat, production readiness caveats, local secrets warning.

### Domain And Product Docs
- `docs/SDD-analise-spray.md` - Spray analysis limits, confidence framing, physical/clip constraints, anti-overclaim posture.
- `docs/SDD-inteligencia-de-sens.md` - Sensitivity intelligence, multi-clip consensus, validation limits, safety of recommendations.
- `docs/SDD-coach-extremo.md` - Coach plan behavior, protocol handoff, coach memory and evidence boundaries.
- `docs/video-benchmark-spec.md` - Video benchmark expectations and validation framing.
- `docs/benchmark-runner.md` - Benchmark runner behavior and workflow.
- `docs/captured-clips-intake-2026-04-14.md` - Existing captured clip intake context.
- `docs/captured-labeling-kit-2026-04-14.md` - Existing labeling-kit workflow for captured clips.
- `docs/captured-specialist-review-kit-2026-04-16.md` - Existing specialist review kit for captured benchmark clips.
- `docs/captured-benchmark-plan-2026-04-14.md` - Existing captured benchmark planning artifact.
- `docs/benchmark-coverage-2026-04-14.md` - Existing coverage report shape.
- `docs/benchmark-reports/latest.md` - Latest benchmark report reference.

### Existing Product Code
- `src/core/spray-window-detection.ts` - Spray window detection logic and likely Wave 1 hardening point.
- `src/core/capture-quality.ts` - Capture-quality evidence and weak-clip handling.
- `src/core/crosshair-tracking.ts` - Crosshair tracking core.
- `src/core/global-motion-compensation.ts` - Camera/global motion compensation.
- `src/workers/aim-analyzer-session.ts` - Browser worker session path that emits tracking frames, confidence, quality, and disturbances.
- `src/core/tracking-evidence.ts` - Tracking evidence summaries and confidence/coverage material.
- `src/core/spray-metrics.ts` - Spray metric calculations fed by tracking/window decisions.
- `src/core/diagnostic-engine.ts` - Diagnosis logic that must be recalibrated after tracking changes.
- `src/core/coach-plan-builder.ts` - Coach tier/action selection affected by confidence and evidence gates.
- `src/core/coach-memory.ts` - Compatible history/memory that must respect engine version and decision level.
- `src/core/analysis-result-coach-enrichment.ts` - Deterministic coach plan plus optional copy rewrite integration.
- `src/types/engine.ts` - Analysis result, tracking, mastery, sensitivity, coach, trend, and future decision-ladder contract.
- `src/types/benchmark.ts` - Benchmark dataset schema and expectations.
- `src/types/captured-clip-intake.ts` - Captured clip intake schema.
- `src/types/captured-clip-labels.ts` - Captured clip labels and validation schema.
- `src/core/captured-golden-promotion.ts` - Golden promotion logic to extend with permission/provenance rigor.
- `src/core/benchmark-coverage.ts` - Benchmark coverage model.
- `src/core/benchmark-release-report.ts` - Release benchmark report generation.
- `scripts/run-benchmark.ts` - Benchmark runner entrypoint.
- `scripts/run-benchmark-release.ts` - Release benchmark runner.
- `scripts/run-tracking-goldens.ts` - Tracking golden runner and calibration-adjacent metrics.
- `scripts/run-diagnostic-goldens.ts` - Diagnostic golden runner.
- `scripts/run-coach-goldens.ts` - Coach golden runner.
- `scripts/validate-benchmark-coverage.ts` - Benchmark coverage gate.
- `scripts/validate-captured-clip-labels.ts` - Captured label validation gate.
- `tests/goldens/tracking/` - Existing tracking golden fixtures.
- `tests/goldens/diagnostic/` - Existing diagnostic golden fixtures.
- `tests/goldens/coach/` - Existing coach golden fixtures.
- `tests/goldens/benchmark/` - Existing synthetic and captured benchmark datasets/baselines.
- `tests/fixtures/captured-clips/` - Existing captured clip intake, labels, review decisions, capture slots, and preview assets.
- `src/actions/history.ts` - Save-analysis path and quota/useful-result interaction point from Phase 5.
- `package.json` - Existing benchmark, captured corpus, and release scripts that Phase 6 must reuse/extend.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/core/spray-window-detection.ts` and `src/core/capture-quality.ts`: likely anchors for valid-spray/window/blocker behavior.
- `src/core/crosshair-tracking.ts`, `src/core/global-motion-compensation.ts`, and `src/workers/aim-analyzer-session.ts`: likely anchors for tracking/recoil, camera-motion separation, lost/reacquired frames, occlusion, and external disturbance evidence.
- `src/core/tracking-evidence.ts`, `src/core/spray-metrics.ts`, and `src/core/diagnostic-engine.ts`: downstream truth path that must be recalibrated after tracker/window changes.
- `src/core/coach-plan-builder.ts`, `src/core/coach-memory.ts`, and `src/core/analysis-result-coach-enrichment.ts`: coach/sensitivity safety path that must consume the decision ladder and calibrated confidence.
- `src/types/engine.ts`: canonical place for versioned analysis contract, decision ladder, blocker reasons, and permission-matrix payloads.
- `src/core/captured-golden-promotion.ts`, captured clip types, and captured corpus scripts: existing foundation for permissioned corpus workflow and golden promotion.
- Existing golden runners and `benchmark:release`: strong base for the commercial truth gate.

### Established Patterns
- Browser-first video analysis remains mandatory; server-side work should validate, persist, gate, and report truth rather than replace local processing.
- Deterministic code owns analysis/coach truth; optional LLM can only rewrite safe copy and cannot change technical facts.
- Weak evidence, inconclusive states, coverage, confidence, blocker reasons, and no-overclaim copy are core product contracts.
- Benchmark changes require explicit reports/baseline discipline, especially for commercial claims.
- Useful-result quota from Phase 5 must stay honest: invalid/inconclusive clips do not become paid value merely because processing occurred.

### Integration Points
- Analysis result types and storage need engine contract versioning so history and trends do not silently mix old/new truth.
- Save-analysis/quota behavior in `src/actions/history.ts` must consume the decision ladder so invalid/inconclusive results do not count as useful quota.
- Benchmark datasets, captured corpus manifests, labels, review decisions, and promotion reports need provenance/consent states before commercial validation.
- Release/copy gates need to connect benchmark reports, calibration reports, copy-claim tests, and final evidence matrix.
- Dashboard/history/analyze surfaces may need small contract-aware copy updates, but Phase 6 is not the premium UI/UX redesign.

</code_context>

<specifics>
## Specific Ideas

- The user repeatedly asked for "o mais polido possivel" and "perfeicao" for spray analysis. Interpret this as a rigorous production truth standard, not as impossible public claims.
- The first corpus should feel professional from day one: explicit consent, complete metadata, review states, private raw clips, controlled derivatives, and withdrawal/rebaseline behavior.
- The engine must know when not to analyze. A blocked or inconclusive result is a high-quality outcome when the clip does not support truth.
- Camera movement, flicks, cuts, and target swaps must never be misclassified as player recoil mistakes.
- The product may use stronger commercial language only after the commercial truth gate passes, and even then must remain honest.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within Phase 6 scope.

</deferred>

---

*Phase: 6-Core Accuracy And Pro Validation Hardening*
*Context gathered: 2026-05-06T16:01:41.8903299-03:00*
