# Phase 6: Pattern Map

**Phase:** 06 - Core Accuracy And Pro Validation Hardening
**Mapped:** 2026-05-06

## Purpose

Map planned Phase 6 files to existing codebase analogs so execute-phase can reuse local patterns.

## Engine Decision And Validity

| Planned file | Role | Closest analog | Pattern to reuse |
|--------------|------|----------------|------------------|
| `src/core/analysis-decision.ts` | Pure decision ladder and permission matrix | `src/core/measurement-truth.ts` | Pure resolver functions, no React/server dependencies, explicit exported types in `src/types/engine.ts`. |
| `src/core/analysis-decision.test.ts` | Decision contract tests | `src/core/measurement-truth.test.ts` | Fixture-based Vitest cases for action states and blockers. |
| `src/types/engine.ts` | Shared version/blocker/decision types | Existing Measurement Truth and Precision Loop sections | Add narrow exported union types near related analysis contracts. Preserve old stored result compatibility. |
| `src/core/spray-window-detection.ts` | Spray window and validity report | Current `detectSprayWindow` | Keep synthetic `ImageData` frame tests and small pure helpers. |
| `src/core/capture-quality.ts` | Clip quality/blocker integration | Current report + diagnostic functions | Preserve `VideoQualityReport` shape while adding explicit validity/blocker detail. |

## Tracking And Metrics

| Planned file | Role | Closest analog | Pattern to reuse |
|--------------|------|----------------|------------------|
| `src/core/crosshair-tracking.ts` | Reticle tracking, disturbance, reacquisition | Current streaming tracker | Extend `ReticleExogenousDisturbance` and frame observations without replacing tracker architecture. |
| `src/core/global-motion-compensation.ts` | Camera/global motion estimate | Current `estimateGlobalMotion` | Keep pure image-diff search with deterministic `ImageData` tests. |
| `src/core/tracking-evidence.ts` | Evidence and calibration summaries | Current `createTrackingEvidence` | Extend summary fields and bins while preserving existing callers. |
| `src/core/spray-metrics.ts` | Metric quality and residual filtering | Current `buildEvidenceQualityFromFrames` | Use disturbance/reacquisition penalties instead of hard-coded hidden thresholds. |
| `src/workers/aim-analyzer-session.ts` | Browser worker session output | Current worker session | Emit extra observation fields through existing worker result mapping path. |
| `src/app/analyze/tracking-result-mapper.ts` | Worker-to-engine type mapping | Current mapper | Keep conversion isolated so worker types do not leak everywhere. |

## Downstream Decision Consumers

| Planned file | Role | Closest analog | Pattern to reuse |
|--------------|------|----------------|------------------|
| `src/core/diagnostic-engine.ts` | Inconclusive/blocker diagnosis | Existing `diagnoseInconclusive` | Return conservative diagnosis early when evidence is below ladder permissions. |
| `src/core/sensitivity-engine.ts` | Recommendation tier safety | Existing residual objective and tier resolver | Fail closed to `capture_again` or `test_profiles` when decision level is weak. |
| `src/core/coach-plan-builder.ts` | Coach tier safety | Existing `resolveCoachDecisionTier` | Put decision-ladder checks before `apply_protocol`. |
| `src/core/precision-loop.ts` | Trend compatibility | Existing compatibility blockers | Add engine version/decision level as explicit blockers instead of fuzzy evidence checks. |
| `src/actions/history.ts` | Save, quota, history enrichment | Existing useful-result quota and precision persistence | Preserve non-billable weak capture behavior and attach versioned decision payloads. |

## Corpus And Benchmark

| Planned file | Role | Closest analog | Pattern to reuse |
|--------------|------|----------------|------------------|
| `src/types/captured-clip-intake.ts` | Consent/provenance schema | Existing Zod intake schema | Add fields with `superRefine` blockers and clear missing paths. |
| `src/types/captured-clip-labels.ts` | Competitive metadata and expected truth | Existing label schema | Preserve expected coach/truth requirements for diagnosed clips. |
| `src/core/captured-golden-promotion.ts` | Promotion blockers | Existing strict promotion builder | Add consent, review state, withdrawal, and trainability blockers. |
| `src/core/captured-promotion-report.ts` | Promotion markdown | Existing markdown report builder | Extend metadata/provenance table and next-gaps reporting. |
| `scripts/promote-captured-clips.ts` | Maintainer CLI | Current flag and legacy positional CLI | Keep dry-run/report default and existing package scripts working. |
| `src/core/analysis-calibration-report.ts` | Calibration report | `src/core/benchmark-release-report.ts` | Pure report builder returning pass/fail, console lines, markdown, and gap rows. |
| `scripts/run-benchmark-release.ts` | Strict commercial gate | Current release command | Extend canonical `benchmark:release` rather than adding a competing gate. |

## Verification And Copy Safety

| Planned file | Role | Closest analog | Pattern to reuse |
|--------------|------|----------------|------------------|
| `src/ci/benchmark-workflow.test.ts` | Script and workflow contracts | Existing benchmark workflow tests | Assert `benchmark:gate` remains fast and `benchmark:release` owns strict commercial evidence. |
| `src/app/copy-claims.contract.test.ts` | Claim safety | Existing copy claim tests | Block perfect sensitivity, guaranteed recoil/rank/improvement, official affiliation, and unsupported public validation claims. |
| `.planning/phases/06-core-accuracy-and-pro-validation-hardening/06-VERIFY-CHECKLIST.md` | Final evidence matrix | `05-VERIFY-CHECKLIST.md` | Requirement-by-requirement evidence, automated/manual gates, final status cap. |

## Notes

- No schema push is expected unless execution chooses to persist new corpus state in database tables. Current plan direction should keep corpus artifacts in JSON/docs for this phase.
- UI edits should be minimal contract/copy updates inside existing analysis/history surfaces. Phase 7 owns the premium visual redesign.
- Every plan should include benchmark or golden checks when touching analysis, tracking, diagnostics, sensitivity, or coach behavior.
