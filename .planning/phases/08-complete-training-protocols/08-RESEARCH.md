# Phase 8: Complete Training Protocols - Research

**Phase:** 08 - Complete Training Protocols
**Researched:** 2026-05-07
**Status:** Ready for planning

## Research Goal

Answer: what do we need to know to plan this phase well?

Phase 8 should turn the existing adaptive coach next-block advice into complete, practical PUBG training protocols. This is not a copy polish pass. It needs a deterministic protocol contract, PUBG drill families, evidence-bound downgrades, Free/Pro projection, persistence/revision/audit behavior, safe preparation guidance, outcome/validation/transfer loops, LLM fact guardrails, and No False Done evidence.

## Source Context

Primary local inputs:

- `.planning/phases/08-complete-training-protocols/08-CONTEXT.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/TESTING.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/STRUCTURE.md`
- `docs/SDD-coach-extremo.md`
- `docs/SDD-analise-spray.md`
- `docs/SDD-inteligencia-de-sens.md`
- `src/types/engine.ts`
- `src/core/coach-plan-builder.ts`
- `src/core/coach-memory.ts`
- `src/core/coach-outcomes.ts`
- `src/core/analysis-decision.ts`
- `src/actions/history.ts`
- `src/lib/premium-projection.ts`
- `src/app/analyze/results-dashboard-view-model.ts`
- `package.json`

External references checked:

- PUBG 2026 Roadmap: `https://pubg.com/en/news/9855`
- PUBG UGC Alpha: `https://pubg.com/en/news/8865`
- PUBG Update 17.2 Training Mode notes: `https://pubg.com/en/news/1713`
- OSHA computer workstation overview: `https://www.osha.gov/computer-workstations`
- CDC/NIOSH ergonomics overview: `https://www.cdc.gov/niosh/ergonomics/about/index.html`
- Mayo Clinic arm pain guidance: `https://www.mayoclinic.org/symptoms/arm-pain/basics/when-to-see-doctor/sym-20050870`

## Current Product Contract

The current coach system already has a strong Phase 4/6 foundation:

- `CoachDecisionTier` is `capture_again | test_protocol | stabilize_block | apply_protocol`.
- `CoachPlan` has a session summary, one primary focus, up to two secondary focuses, one `actionProtocols` entry, a `nextBlock`, stop conditions, and `llmRewriteAllowed`.
- `buildCoachPlan` already combines current clip signals with `CoachMemorySnapshot` and downgrades strong actions for weak, conflicting, pending, invalid, or insufficient compatible evidence.
- `analysisDecision` already implements the Phase 6 ladder: `blocked_invalid_clip`, `inconclusive_recapture`, `partial_safe_read`, `usable_analysis`, `strong_analysis`.
- `saveAnalysisResult` already enriches with deterministic coach, precision trend, memory snapshot, `coachDecisionSnapshot`, and useful-result quota.
- `recordCoachProtocolOutcome` already stores outcome rows with statuses `started`, `completed`, `improved`, `unchanged`, `worse`, and `invalid_capture`, plus reason codes including `fatigue_or_pain` and `variable_changed`.
- `projectAnalysisForAccess` already summarizes Free coach output and exposes Pro lock copy for `coach.full_plan`, `training.next_block_protocol`, `coach.outcome_capture`, and `coach.validation_loop`.
- Result/dashboard/history surfaces already show next block, adaptive state, validation-needed/conflict states, evidence badges, and locks.

Planning implication: extend the existing coach contract and persistence path instead of creating a parallel training product. The new complete protocol should hang off `AnalysisResult` / `CoachPlan` as a versioned deterministic snapshot and be projected for Free/Pro.

## Codebase Findings

### 1. The current next block is too small for Phase 8

`CoachBlockPlan` contains only `title`, `durationMinutes`, `steps`, and validation checks. `CoachActionProtocol` has a single instruction/effect/risk/applyWhen shape. This supports Phase 4 but cannot express Phase 8 fields: environment, weapon, optic, distance, reps, target, preparation, stop/continue criteria, blocker repair, real-match transfer, revision audit, and validation clip instructions.

Planning implication: add a versioned `CompleteTrainingProtocol` contract with stable IDs and compose it from existing `CoachPlan` rather than replacing the coach plan abruptly. Keep legacy `nextBlock` for backwards compatibility and UI fallbacks.

### 2. The right implementation anchor is a new core module, called from the existing builder/save path

`src/core/coach-plan-builder.ts` is already the tier/focus/protocol source. It should remain the owner of coach truth, but a large Phase 8 protocol library inside that file would make it hard to maintain.

Recommended split:

- `src/core/training-protocols.ts`: public builder, tier dose, downgrade rules, evidence mapping.
- `src/core/training-protocol-drills.ts`: drill masters, stable `drillId` values, context adapters.
- `src/types/engine.ts`: exported protocol contracts.
- `src/core/coach-plan-builder.ts`: attach `completeProtocol` to `CoachPlan` or call the builder after tier/focus resolution.
- `src/actions/history.ts`: persist the versioned snapshot and revision/transfer records.

### 3. Drill library should be family-based, not one giant static matrix

Phase 8 context asks for PUBG-specific drill masters plus personalization by weapon, optic, distance, stance, attachments, tier, and history. The maintainable shape is:

- stable drill families: capture, validation, vertical control, horizontal control, timing, consistency, sensitivity, loadout;
- drill master fields: objective, environment, target, distance, reps, pauses, execution, observed error, success/fail, preparation, downgrade, validation;
- context adapters: weapon difficulty, optic/distance precision, attachment one-variable policy, limited support, evidence tier, outcome memory, fatigue/confusion.

Planning implication: start with a compact but complete core library and tests. Do not try to author a separate hand-written drill for every weapon/optic/distance combination.

### 4. Phase 6 decision ladder is the main downgrade source

`src/core/analysis-decision.ts` already maps invalid/weak clips to permissions. Phase 8 should use it directly:

- `blocked_invalid_clip` -> guided recapture.
- `inconclusive_recapture` -> guided recapture.
- `partial_safe_read` -> short safe test.
- `usable_analysis` -> controlled protocol or stabilization.
- `strong_analysis` -> apply plus controlled validation only when memory/history also allows it.

Planning implication: `apply_protocol` must have explicit blockers for weak decision level, missing critical metadata, incompatible history/outcome conflict, variable changes, limited support, and fatigue/pain.

### 5. Free/Pro projection already exists and should become protocol-aware

`src/lib/premium-projection.ts` summarizes Free coach output by truncating action protocols, next block steps, and stop conditions. Phase 8 needs richer projection:

- Free keeps focus, duration, essential steps, compact preparation, basic validation, confidence/coverage/blocker truth.
- Pro unlocks full ficha: reps, environment, target, stop/continue criteria, preparation checklist, audit details, revision, compatible validation, and real-match transfer.

Planning implication: add projection functions for the complete protocol view model rather than hiding raw truth in React components.

### 6. Persistence must snapshot protocol truth

`saveAnalysisResult` already stores `fullResult` with coach and decision snapshots. The Phase 8 protocol must be stored as a versioned snapshot so old analyses do not mutate when the drill library changes. Revisions should be explicit and auditable: original protocol, changed fields, reason, new evidence, and tier direction.

Planning implication: prefer storing protocol snapshot inside `fullResult` first for the analysis report, plus normalized tables/actions only where the user records revisions, compatible validation, or real-match transfer. Keep sensitive physical/health data out.

### 7. Existing outcome statuses need Phase 8 extension

Context requires additional meanings: `fatigue_or_pain`, `confused`, and `variable_changed` as structured outcomes, not only reason codes. The current system has these as reason codes under `worse`/`invalid_capture`. That is workable for Phase 4 but less clear for Phase 8 UX.

Planning implication: either extend `CoachProtocolOutcomeStatus` with those three statuses or add a normalized Phase 8 outcome facade that maps them to the existing table. The plan should choose the explicit status extension because it makes UI, memory, and tests clearer, while preserving old statuses.

### 8. Real-match transfer is a validation layer, not technical proof

Phase 3/4 strict compatible clips remain the technical evidence path. Real-match/TDM transfer is product value and can raise practical confidence only when it does not contradict controlled validation.

Planning implication: add a transfer card/snapshot with situation, weapon/optic, approximate distance, pressure, felt control, optional note/clip reference, and conservative result. It must never replace strict compatible clip validation for strong technical conclusions.

### 9. LLM must remain copy-only

`coach-llm-contract.ts` and `coach-llm-adapter.ts` already allow rewrites only for session summary, primary focus why-now, protocol instructions, and next-block title. Phase 8 must extend immutable facts to complete protocol fields:

- tier, drillId, protocol version, primary/secondary focus order;
- weapon, optic, distance/range, attachments, sensitivity, duration, reps, pauses;
- stop/continue criteria, blockers, downgrade reasons, validation targets;
- preparation/safety facts and real-match transfer state.

Planning implication: optional LLM can rewrite only approved display strings, not technical protocol facts.

## External Domain Findings

PUBG official references support a conservative Phase 8 boundary:

- Training Mode is an official controlled practice environment and includes training areas, Aim/Sound Lab, and custom Training Mode match support in Update 17.2.
- PUBG's 2026 roadmap says UGC is expanding, but it also notes performance/tool limitations and positions UGC as a long-term project. UGC can be represented as optional/experimental presets, not a dependency.
- PUBG UGC Alpha is a custom match creative toolkit with rulesets, devices, and objects, initially PC-only and with early limitations. Phase 8 should not require UGC for a protocol to be executable.

Ergonomics/physical guidance should remain general:

- OSHA frames computer workstation issues as largely ergonomic and difficult to diagnose from a generic workstation context.
- CDC/NIOSH frames ergonomics as fitting tasks/environments to capabilities and reducing discomfort/injury risk; it also lists repetitive motion, awkward postures, and intensity/frequency/duration as risk factors.
- Mayo Clinic guidance supports conservative escalation for severe pain, sudden injury, pain with activity/rest patterns, trouble moving, or pain that does not improve.

Planning implication: Phase 8 can include light warmup, pauses, posture/setup checklist, relaxed hand/forearm, mousepad space, and stop-for-pain copy. It must not diagnose posture, prescribe treatment, prescribe strength routines, persist sensitive health details, or count pain as aim failure.

## Recommended Architecture

### Core contract

Add Phase 8 types:

- `CompleteTrainingProtocol`
- `CompleteTrainingProtocolVersion = 'complete-protocol-v1'`
- `TrainingProtocolTier = CoachDecisionTier`
- `TrainingProtocolEnvironment`
- `TrainingProtocolDrillId`
- `TrainingProtocolDose`
- `TrainingProtocolContextSnapshot`
- `TrainingProtocolPreparation`
- `TrainingProtocolValidationPlan`
- `TrainingProtocolTransferPlan`
- `TrainingProtocolDowngrade`
- `TrainingProtocolRevision`
- `TrainingProtocolProjection`

The complete protocol should be deterministic and attach to `CoachPlan` as an optional field. Existing consumers keep working when it is absent.

### Core builder

`buildCompleteTrainingProtocol(input)` should accept:

- `analysisResult`
- `coachPlan`
- `memorySnapshot`
- `precisionTrend`
- optional previous outcomes/revisions

It should output one executable protocol owned by the primary focus. Secondary focuses become anti-mixing notes, not extra drills.

### Projection and UI

Add a protocol view model in `results-dashboard-view-model.ts` or a dedicated `complete-training-protocol-view-model.ts`:

- summary-first ficha;
- Free/Pro sections;
- evidence/audit disclosure payload;
- blocker repair CTAs;
- preparation checklist;
- validation clip checklist;
- real-match transfer prompt.

Then render in post-analysis, dashboard active loop, and history detail without building the Phase 9 session runner.

### Persistence/revisions

Persist the complete protocol snapshot in `fullResult`. Add lightweight normalized support only for:

- protocol revision records, if old/new/audit needs independent querying;
- real-match transfer outcomes;
- compatible validation prompt/result metadata if not already covered by history/outcomes.

Do not persist detailed physical profile, pain history, strength data, or body metrics.

### Benchmarks and goldens

Extend existing coach goldens/benchmark expectations:

- drill selection;
- tier/dose/reps;
- duration;
- environment;
- validation target;
- downgrade blocker/CTA;
- Free/Pro projection;
- weak-evidence matrix;
- copy safety.

## Validation Architecture

Required focused tests before broad gates:

- `src/core/training-protocols.test.ts`
- `src/core/training-protocol-drills.test.ts`
- `src/core/coach-plan-builder.test.ts`
- `src/core/coach-llm-contract.test.ts`
- `src/core/coach-llm-adapter.test.ts`
- `src/actions/history.test.ts`
- `src/lib/premium-projection.test.ts`
- `src/app/analyze/results-dashboard-view-model.test.ts`
- `src/app/analyze/results-dashboard.contract.test.ts`
- `src/app/history/[id]/coach-protocol-outcome-panel.contract.test.ts`
- `src/app/copy-claims.contract.test.ts`
- benchmark/golden tests around coach protocol truth.

Required broad gates:

- `npm run typecheck`
- `npx vitest run`
- `npm run benchmark:gate`

Add a Phase 8 verification artifact:

- `.planning/phases/08-complete-training-protocols/08-VERIFY-CHECKLIST.md`

The checklist should record contract, drills, Free/Pro, downgrade, preparation safety, outcomes, compatible validation, real-match transfer, LLM guardrails, benchmark/goldens, UI, copy safety, and command evidence.

## Planning Recommendations

Recommended plan split:

1. Core complete-protocol contract, drill catalog, composer, and downgrade rules.
2. Snapshot persistence, revisions, outcome extensions, compatible validation, and transfer actions.
3. Free/Pro projection and post-analysis premium protocol ficha.
4. Dashboard/history protocol loop, audit, revision, validation, and transfer surfaces.
5. LLM guardrails, copy safety, coach goldens, benchmark matrix, and downgrade fixtures.
6. No False Done evidence matrix and final Phase 8 gate recording.

This keeps dependencies clean: core truth first, persistence/projection next, surfaces after contracts, verification hardening after behavior exists, final evidence last.

## RESEARCH COMPLETE

Phase 8 can be planned as six executable plans across five waves without changing the browser-first analysis path or building Phase 9 Spray Lab early.
