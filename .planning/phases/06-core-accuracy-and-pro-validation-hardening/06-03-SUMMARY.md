---
phase: 06-core-accuracy-and-pro-validation-hardening
plan: 03
status: completed
completed_at: "2026-05-06T20:13:51Z"
requirements: [BENCH-02, BENCH-03, PREC-04]
---

# 06-03 Summary: Permissioned Real/Pro Corpus And Golden Promotion Provenance

## Delivered

- Added a Zod-backed captured clip consent manifest with contributor reference, consent timestamp, review state, allowed purposes, trainability authorization, raw storage scope, derivative scope, redistribution flag, reviewer metadata, transition reason, and withdrawal quarantine/rebaseline fields.
- Added `tests/fixtures/captured-clips/consent.todo.v1.json` mirroring all current captured intake clip IDs as private, internal-validation-only placeholders.
- Extended captured promotion with consent summaries and hard blockers for missing consent, unverified consent state, missing commercial benchmark purpose, missing trainability authorization, redistribution scope mismatch, withdrawn clips, early review state, and qualitative-only references.
- Tightened golden promotion so approved golden clips require permissioned golden consent, replay pass, and strong review evidence before entering a benchmark dataset.
- Updated the captured promotion CLI with default consent loading plus `--consent`, while preserving existing positional invocation.
- Expanded promotion markdown reports with consent status, allowed purposes, trainability, derivative scope, redistribution, and withdrawal/quarantine/rebaseline visibility.
- Documented internal-only corpus workflow, private raw clip defaults, public streamer/pro video restrictions, and withdrawal quarantine/rebaseline rules.
- Refreshed benchmark release reports for 2026-05-06 after release gate verification.

## Key Files

- `src/types/captured-clip-consent.ts`
- `src/types/captured-clip-consent.test.ts`
- `tests/fixtures/captured-clips/consent.todo.v1.json`
- `src/core/captured-golden-promotion.ts`
- `src/core/captured-golden-promotion.test.ts`
- `src/core/captured-promotion-report.ts`
- `src/core/captured-promotion-report.test.ts`
- `scripts/promote-captured-clips.ts`
- `src/core/promote-captured-clips.test.ts`
- `docs/video-benchmark-spec.md`
- `docs/captured-clips-intake-2026-04-14.md`
- `docs/captured-specialist-review-kit-2026-04-16.md`
- `docs/benchmark-reports/2026-05-06.md`
- `docs/benchmark-reports/latest.md`

## Verification Follow-Up

- Full Vitest surfaced broader tracking expectations from 06-02 after identity/flick contamination became stricter. Updated the worker counter test and shake tracking golden thresholds so the suite treats contaminated/lost post-occlusion evidence conservatively instead of counting it as recoil truth.

## Verification

- `npx vitest run src/types/captured-clip-consent.test.ts src/types/captured-clip-intake.test.ts src/types/captured-clip-labels.test.ts src/core/captured-golden-promotion.test.ts src/core/captured-promotion-report.test.ts src/core/promote-captured-clips.test.ts` PASS
- `npm run benchmark:release` PASS
- `npm run typecheck` PASS
- `npm run benchmark:gate` PASS
- `npx vitest run src/core/tracking-golden-runner.test.ts src/workers/aim-analyzer-session.test.ts` PASS
- `npx vitest run` PASS

## Notes

- Placeholder consent fixtures are not real contributor authorization. Real/pro clips still need filled consent records before commercial benchmark or trainability use.
- Public streamer/pro videos are qualitative reference only unless formal permission/trainability is verified.
