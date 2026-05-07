# Commercial Accuracy Readiness

This document is the maintainer-facing claim gate for Phase 6 accuracy work. It summarizes the same No False Done evidence recorded in `.planning/phases/06-core-accuracy-and-pro-validation-hardening/06-VERIFY-CHECKLIST.md`.

Current status: **Partially delivered**. The engine hardening, automated checks, benchmark release, and calibration report exist, but the current captured consent fixture is internal-validation only and provides 0 reviewed permissioned commercial benchmark clips. Strong public accuracy claims stay blocked until that corpus gap is closed and reviewed.

## Gate Prerequisites

Strong public claims about precision, coaching, paid analysis value, or commercial readiness require every row below to be accounted for:

| Gate | Command or evidence | Required result |
|---|---|---|
| TypeScript contract | `npm run typecheck` | PASS |
| Full unit and contract tests | `npx vitest run` | PASS |
| Fast benchmark gate | `npm run benchmark:gate` | PASS |
| Strict commercial truth gate | `npm run benchmark:release` | PASS, not PARTIAL |
| Tracking goldens | `tsx scripts/run-tracking-goldens.ts` | PASS |
| Diagnostic goldens | `tsx scripts/run-diagnostic-goldens.ts` | PASS |
| Coach goldens | `tsx scripts/run-coach-goldens.ts` | PASS |
| Captured corpus validation | captured benchmark plus consent/provenance review | reviewed permissioned commercial clips present |
| Calibration report | `docs/benchmark-reports/latest.md` | PASS with commercial eligible records |
| Copy claims test | `npx vitest run src/app/copy-claims.contract.test.ts` | PASS |
| Specialist/human review | review notes for strong public claims that depend on real/pro clips | recorded and linked |

If any mandatory gate fails, cannot run, or reports PARTIAL because evidence is missing, final launch status cannot be Delivered.

## Allowed Claims After Gate Pass

Allowed claims must stay evidence-bound. Examples:

- validated on permissioned clips
- calibrated confidence
- honest blockers for weak clips
- safer coach and sensitivity decisions
- release-tested against synthetic, captured, reviewed, and golden evidence buckets
- stronger public claims are supported only for the measured corpus and current gate results

These claims still need context: the product gives test protocols and confidence-aware guidance, not universal truth for every clip or player.

## Disallowed Claims

Do not use any of these phrases as product or launch claims:

- perfect sensitivity
- sensibilidade perfeita
- guaranteed recoil
- recoil garantido
- guaranteed improvement
- melhora garantida
- guaranteed rank
- rank garantido
- official PUBG
- oficial PUBG
- KRAFTON partner
- parceiro KRAFTON
- definitive sensitivity
- sensibilidade definitiva

Also avoid equivalent wording that promises final player skill, guaranteed recoil control, guaranteed rank gain, guaranteed improvement, definitive sensitivity, or official PUBG/KRAFTON affiliation.

## Corpus And Consent Evidence

The validation corpus must be permissioned before it can support commercial accuracy claims. Every captured or real/pro clip needs:

- contributor reference and consent date;
- allowed purposes including commercial benchmark when used for launch claims;
- trainability authorization when the clip supports training or model/evaluation claims;
- review state at `golden_candidate` or `golden_promoted` for commercial benchmark evidence;
- reviewer identity, label rationale, expected decision, expected blocker reasons, and expected coach/sensitivity behavior;
- withdrawal and quarantine fields when permission changes.

Public streamer/pro videos are qualitative reference only unless permission/trainability is verified. Do not download, frame-extract, train on, validate against, or promote public YouTube/Twitch/pro footage as benchmark evidence without explicit permission and the required commercial benchmark purpose.

## Calibration Evidence

The strict release report must include calibration evidence for:

- overconfidence;
- underconfidence;
- inconclusive correctness;
- blocker accuracy;
- sensitivity safety;
- coach handoff safety;
- reviewed/golden corpus coverage;
- regression against baseline when available.

The current `docs/benchmark-reports/latest.md` report is PARTIAL because it has 5 reviewed permissioned records but 0 reviewed permissioned commercial benchmark records. That is correct truth protection, not a release pass for strong public precision claims.

## Remaining Launch Blockers

| Blocker | Impact | Required closure |
|---|---|---|
| Commercial eligible corpus is empty | Strong public accuracy claims remain blocked | Record real permissioned commercial benchmark consent and promote reviewed/golden clips |
| Specialist/human review evidence is not complete for real/pro commercial claims | Real/pro validation cannot be marketed as complete | Link reviewer notes, expected labels, expected blockers, and promotion decisions |
| `benchmark:release` is PARTIAL | Commercial truth gate is not passed | Re-run after corpus consent and calibration evidence produce PASS |
| Final Phase 6 evidence matrix must stay current | Maintainers need an auditable No False Done record | Update `06-VERIFY-CHECKLIST.md` whenever a gate is rerun or a blocker changes |
