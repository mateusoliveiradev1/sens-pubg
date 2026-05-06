---
phase: 06
slug: core-accuracy-and-pro-validation-hardening
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-06
---

# Phase 06 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 plus existing benchmark/golden scripts |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/core/spray-window-detection.test.ts src/core/crosshair-tracking.test.ts src/core/tracking-evidence.test.ts src/core/diagnostic-engine.test.ts` |
| **Full suite command** | `npm run typecheck && npx vitest run && npm run benchmark:gate && npm run benchmark:release` |
| **Estimated runtime** | ~2-5 minutes for full automated phase gates, depending on benchmark release runtime |

---

## Sampling Rate

- **After every task commit:** Run the focused automated command named in the task.
- **After every plan wave:** Run `npm run typecheck && npx vitest run`.
- **Before `$gsd-verify-work`:** Run `npm run typecheck && npx vitest run && npm run benchmark:gate && npm run benchmark:release`.
- **Max feedback latency:** 120 seconds for focused tests when practical; strict release gates run before final verification even if slower.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | PREC-01, PREC-02, PREC-04 | T06-01 | Decision ladder and blocker reason codes fail closed for invalid clips. | unit | `npx vitest run src/core/analysis-decision.test.ts src/core/measurement-truth.test.ts` | No - create | pending |
| 06-01-02 | 01 | 1 | PREC-02, PREC-04 | T06-02 | Spray validity report blocks too-short, hard-cut, flick, target-swap, camera-motion, invisible-reticle, and not-spray clips. | unit | `npx vitest run src/core/spray-window-detection.test.ts src/core/capture-quality.test.ts` | Yes - extend | pending |
| 06-02-01 | 02 | 2 | PREC-01, PREC-02, BENCH-01 | T06-03 | Tracking separates exogenous motion from player recoil and reports confidence penalties. | unit | `npx vitest run src/core/crosshair-tracking.test.ts src/core/global-motion-compensation.test.ts src/core/tracking-evidence.test.ts` | Yes - extend | pending |
| 06-02-02 | 02 | 2 | PREC-01, BENCH-01, BENCH-03 | T06-04 | Metrics and benchmarks account for disturbance, reacquisition, coverage, and camera motion. | unit + benchmark | `npx vitest run src/core/spray-metrics.test.ts && npm run benchmark:gate` | Yes - extend | pending |
| 06-03-01 | 03 | 2 | BENCH-02, BENCH-03 | T06-05 | Corpus clips cannot become reviewed/golden without consent, metadata, review state, provenance, and withdrawal handling. | schema + report | `npx vitest run src/types/captured-clip-intake.test.ts src/types/captured-clip-labels.test.ts src/core/captured-golden-promotion.test.ts src/core/captured-promotion-report.test.ts src/core/promote-captured-clips.test.ts` | Yes - extend | pending |
| 06-04-01 | 04 | 3 | PREC-01, PREC-02, PREC-03, PREC-04, COACH-01, COACH-02, COACH-03, COACH-04, COACH-05 | T06-06 | Diagnostics, sensitivity, coach, trends, history, and quota consume the decision ladder without overclaiming. | unit + action | `npx vitest run src/core/diagnostic-engine.test.ts src/core/sensitivity-engine.test.ts src/core/coach-plan-builder.test.ts src/core/precision-loop.test.ts src/actions/history.test.ts` | Yes - extend | pending |
| 06-05-01 | 05 | 4 | BENCH-01, BENCH-02, BENCH-03, COACH-01, COACH-02, COACH-04 | T06-07 | Calibration reports catch overconfidence, underconfidence, blocker error, and coach/sensitivity unsafe handoffs. | report + benchmark | `npx vitest run src/core/analysis-calibration-report.test.ts src/core/benchmark-release-report.test.ts src/ci/benchmark-workflow.test.ts && npm run benchmark:release` | No - create | pending |
| 06-06-01 | 06 | 5 | PREC-01, PREC-02, PREC-03, PREC-04, BENCH-01, BENCH-02, BENCH-03, COACH-01, COACH-02, COACH-03, COACH-04, COACH-05 | T06-08 | Final status cannot say Delivered unless all mandatory commercial gates pass or blocked gates are documented. | contract + docs | `npx vitest run src/app/copy-claims.contract.test.ts src/ci/benchmark-workflow.test.ts` | Yes - extend | pending |

*Status: pending, green, red, flaky.*

---

## Wave 0 Requirements

- [ ] `src/core/analysis-decision.test.ts` - new tests for decision levels, permission matrix, blocker codes, quota usefulness, and old action-state mapping.
- [ ] `src/core/analysis-calibration-report.test.ts` - new tests for confidence calibration, blocker accuracy, inconclusive correctness, sensitivity safety, and coach handoff safety.
- [ ] `src/core/analysis-decision.ts` or equivalent - pure decision contract so downstream modules do not duplicate ladder logic.
- [ ] Captured corpus consent/provenance fixtures under `tests/fixtures/captured-clips/` or a dedicated adjacent JSON artifact.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Specialist review of first permissioned real/pro clips | BENCH-02, BENCH-03 | Human review is required for label correctness and contributor consent review. | Record reviewer, clip IDs, consent status, label confidence, promotion decision, and whether raw/derivative redistribution is permitted. |
| Strong public claim approval | PREC-04, BENCH-03 | Commercial claim readiness includes human review of benchmark/calibration reports and public copy. | Confirm benchmark release, calibration report, copy-claims tests, and evidence matrix before changing public launch copy. |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency target documented
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
