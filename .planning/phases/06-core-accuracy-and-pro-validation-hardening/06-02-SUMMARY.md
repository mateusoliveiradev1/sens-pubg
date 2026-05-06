---
phase: 06-core-accuracy-and-pro-validation-hardening
plan: 02
status: completed
completed_at: "2026-05-06T19:58:17Z"
requirements: [PREC-01, PREC-02, PREC-04, BENCH-01, BENCH-03]
---

# 06-02 Summary: Reticle Tracking, Camera Motion, Flick, And Cut Separation

## Delivered

- Added global motion transition classification with `stable`, `camera_motion`, and `hard_cut` outcomes while preserving the existing `estimateGlobalMotion` path.
- Extended reticle observations with explicit exogenous contamination fields: `cameraMotion`, `hardCut`, `flick`, `targetSwap`, and `identityConfidence`.
- Updated the streaming tracker to mark hard cuts as lost/occluded contamination, separate camera motion from reticle movement, and cap flick/target-swap confidence below 0.5.
- Added shared contamination summaries for tracking evidence and metric quality: camera motion, hard cut, flick, target swap, identity penalty, and contaminated frame count.
- Updated spray metric confidence so camera motion reduces evidence confidence without changing recoil residuals, and identity contamination prevents strong-confidence eligibility.
- Preserved worker-to-engine compatibility by letting older worker disturbance payloads omit new fields while the mapper clamps/preserves the full new field set.
- Added benchmark schema and runner support for `expectedTracking.*Max` contamination expectations, mismatch reporting, and a synthetic flick-contaminated benchmark fixture.
- Made captured-label proxy tracking contamination-aware so large reviewed jumps become uncertain identity evidence and contaminated frames are excluded from calibration scoring.

## Key Files

- `src/core/global-motion-compensation.ts`
- `src/core/crosshair-tracking.ts`
- `src/core/tracking-contamination.ts`
- `src/core/tracking-evidence.ts`
- `src/core/spray-metrics.ts`
- `src/app/analyze/tracking-result-mapper.ts`
- `src/types/engine.ts`
- `src/types/benchmark.ts`
- `scripts/run-tracking-goldens.ts`
- `scripts/run-benchmark.ts`
- `tests/goldens/tracking/flick-contaminated-red.json`
- `tests/goldens/benchmark/synthetic-benchmark.v1.json`

## Verification

- `npx vitest run src/core/global-motion-compensation.test.ts src/core/crosshair-tracking.test.ts src/core/tracking-evidence.test.ts src/core/spray-metrics.test.ts src/app/analyze/tracking-result-mapper.test.ts src/types/benchmark.test.ts src/core/benchmark-runner.test.ts` PASS
- `npm run typecheck` PASS
- `npm run benchmark:gate` PASS

## Notes

- Calibration reports now exclude identity-contaminated tracking frames from calibration scoring; the contamination remains visible through benchmark and tracking evidence fields.
- Captured clip proxy generation now downgrades large label-to-label jumps to uncertain evidence, matching the tracker contract that flick/target swap movement is not player recoil.
